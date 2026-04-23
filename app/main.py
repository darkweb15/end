"""FastAPI application for the Restaurant Leads Scraper."""

import io
import logging
import os
import zipfile
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import (
    FileResponse,
    HTMLResponse,
    JSONResponse,
    StreamingResponse,
)
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from app.models import LeadResult, ScrapeRequest
from app.scraper.orchestrator import get_all_jobs, get_job, run_scrape_job
from app.scraper.reenrich import get_reenrich_job, start_reenrich_job
from app.exporter import export_to_csv, export_to_json
from app import database as db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(title="LeadScraper Pro", version="3.0.0")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DIST_DIR = STATIC_DIR / "dist"

# /static serves legacy assets (logos, etc.); the Vite build output lives at
# /static/dist and is served by the /assets route plus the SPA catch-all below.
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# React build serves its hashed bundles from /assets; mount if build exists.
if (DIST_DIR / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(DIST_DIR / "assets")),
        name="spa-assets",
    )

# Fallback Jinja templates (useful in dev if React build is missing).
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


# ─── Request models ─────────────────────────────────────────────────


class BulkIds(BaseModel):
    job_ids: list[str]


class ReenrichRange(BaseModel):
    start_index: int
    end_index: int


# ─── Scraping Endpoints ─────────────────────────────────────────────


@app.post("/api/scrape")
async def start_scrape(request: ScrapeRequest):
    """Start a new scraping job."""
    if not request.search_terms or not request.zip_codes:
        return JSONResponse(
            status_code=400,
            content={"error": "Please provide at least one search term and one zip code."},
        )

    request.search_terms = [s.strip() for s in request.search_terms if s.strip()]
    request.zip_codes = [z.strip() for z in request.zip_codes if z.strip()]

    job_id = await run_scrape_job(request)
    return {"job_id": job_id, "message": "Scraping job started!"}


@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a scraping job (real-time from memory)."""
    job = get_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})

    return {
        "job_id": job.job_id,
        "status": job.status,
        "total": job.total,
        "completed": job.completed,
        "results_count": len(job.results),
        "discovered": job.discovered,
        "skipped_duplicates": job.skipped_duplicates,
        "errors": job.errors,
        "results": [r.model_dump() for r in job.results],
    }


@app.get("/api/jobs")
async def list_jobs():
    """List all scraping jobs (from memory, current session)."""
    jobs = get_all_jobs()
    return [
        {
            "job_id": j.job_id,
            "status": j.status,
            "total": j.total,
            "completed": j.completed,
            "results_count": len(j.results),
            "discovered": j.discovered,
            "skipped_duplicates": j.skipped_duplicates,
        }
        for j in jobs
    ]


# ─── Database Task History Endpoints ────────────────────────────────


@app.get("/api/tasks")
async def list_tasks():
    """Get all task history from database (persisted across restarts)."""
    tasks = await db.get_all_tasks()
    return {"tasks": tasks}


@app.delete("/api/tasks/{job_id}")
async def delete_task(job_id: str):
    """Delete a task and all its associated leads (CASCADE)."""
    ok = await db.delete_task(job_id)
    if ok:
        return {"message": f"Task {job_id} and all its data deleted."}
    return JSONResponse(status_code=500, content={"error": "Failed to delete task."})


@app.post("/api/tasks/bulk-delete")
async def bulk_delete_tasks(body: BulkIds):
    """Delete many tasks at once (and their leads via CASCADE)."""
    deleted = 0
    for job_id in body.job_ids:
        if await db.delete_task(job_id):
            deleted += 1
    return {"deleted": deleted, "requested": len(body.job_ids)}


@app.get("/api/tasks/{job_id}/results")
async def get_task_results(job_id: str):
    """Get all results for a specific task from database."""
    results = await db.get_task_results(job_id)
    return {"results": results, "count": len(results)}


def _rows_to_leads(rows: list[dict]) -> list[LeadResult]:
    out: list[LeadResult] = []
    empty = LeadResult()
    for row in rows:
        lead = LeadResult()
        for field in empty.model_fields:
            if field in row and row[field] is not None:
                setattr(lead, field, str(row[field]))
        out.append(lead)
    return out


@app.get("/api/tasks/{job_id}/export/{fmt}")
async def export_single_task(job_id: str, fmt: str):
    """Download a single task's leads as CSV or JSON (from Supabase)."""
    rows = await db.get_task_results(job_id)
    if not rows:
        return JSONResponse(status_code=404, content={"error": "No data for this task."})

    leads = _rows_to_leads(rows)
    if fmt == "csv":
        content = export_to_csv(leads)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="task_{job_id}.csv"'},
        )
    if fmt == "json":
        content = export_to_json(leads)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="task_{job_id}.json"'},
        )
    return JSONResponse(status_code=400, content={"error": "Use 'csv' or 'json'."})


@app.post("/api/tasks/bulk-export")
async def bulk_export_tasks(body: BulkIds):
    """Download many tasks as a single zip of CSV files."""
    if not body.job_ids:
        return JSONResponse(status_code=400, content={"error": "No job_ids provided."})

    buf = io.BytesIO()
    included = 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for job_id in body.job_ids:
            rows = await db.get_task_results(job_id)
            if not rows:
                continue
            leads = _rows_to_leads(rows)
            csv_bytes = export_to_csv(leads).encode("utf-8")
            zf.writestr(f"task_{job_id}.csv", csv_bytes)
            included += 1

    if included == 0:
        return JSONResponse(status_code=404, content={"error": "No data found for given tasks."})

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="tasks_bulk_{included}.zip"'
        },
    )


# ─── Database Business Data Endpoints ───────────────────────────────


@app.get("/api/data")
async def get_business_data(industry: str = "", limit: int = 5000):
    """Get all business data, optionally filtered by industry."""
    data = await db.get_all_business_data(industry=industry, limit=limit)
    return {"data": data, "count": len(data)}


@app.get("/api/industries")
async def get_industries():
    """Get list of unique industries/search queries in database."""
    industries = await db.get_industries()
    return {"industries": industries}


@app.get("/api/stats")
async def get_stats():
    """Get overall database statistics."""
    return await db.get_stats()


@app.get("/api/db-status")
async def db_status():
    """Return whether Supabase is configured + reachable."""
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not url or not key:
        return {
            "connected": False,
            "reason": "SUPABASE_URL or SUPABASE_KEY not configured on the server",
        }
    client = db.get_client()
    if not client:
        return {"connected": False, "reason": "Failed to create Supabase client"}
    try:
        client.table("scraping_tasks").select("id").limit(1).execute()
        return {"connected": True}
    except Exception as e:  # pragma: no cover
        return {"connected": False, "reason": str(e)[:200]}


@app.delete("/api/data")
async def delete_all_data():
    """Delete ALL business data and tasks. Use with caution."""
    ok = await db.delete_all_data()
    if ok:
        return {"message": "All data deleted successfully."}
    return JSONResponse(status_code=500, content={"error": "Failed to delete data."})


# ─── Export Endpoints ───────────────────────────────────────────────


@app.get("/api/export/{job_id}/{fmt}")
async def export_results(job_id: str, fmt: str):
    """Export job results as CSV or JSON (from memory)."""
    job = get_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})

    if not job.results:
        return JSONResponse(status_code=400, content={"error": "No results to export"})

    if fmt == "csv":
        content = export_to_csv(job.results)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=leads_{job_id}.csv"},
        )
    if fmt == "json":
        content = export_to_json(job.results)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=leads_{job_id}.json"},
        )
    return JSONResponse(status_code=400, content={"error": "Invalid format. Use 'csv' or 'json'."})


@app.get("/api/export-db/{fmt}")
async def export_db_data(fmt: str, industry: str = ""):
    """Export database data as CSV or JSON, optionally filtered by industry."""
    data = await db.get_all_business_data(industry=industry)
    if not data:
        return JSONResponse(status_code=400, content={"error": "No data to export"})

    leads = _rows_to_leads(data)
    suffix = f"_{industry}" if industry else "_all"

    if fmt == "csv":
        content = export_to_csv(leads)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=leads{suffix}.csv"},
        )
    if fmt == "json":
        content = export_to_json(leads)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=leads{suffix}.json"},
        )
    return JSONResponse(status_code=400, content={"error": "Invalid format. Use 'csv' or 'json'."})


# ─── Email Re-enrichment Endpoints ──────────────────────────────────


@app.get("/api/leads/missing-emails/count")
async def missing_emails_count():
    """How many leads (with a website) currently have no final_email."""
    count = await db.count_leads_missing_emails()
    return {"count": count}


@app.get("/api/leads/missing-emails")
async def missing_emails_preview(start: int = 1, end: int = 50):
    """
    Preview a slice of the missing-email leads, ordered by `id` ASC so the
    1-based index shown in the UI matches what the re-enrich endpoint will
    operate on.
    """
    if end < start:
        return {"leads": [], "start": start, "end": end}
    rows = await db.get_leads_missing_emails(start, end)
    # Attach the 1-based index so the UI can render it without re-computing.
    out = []
    for i, row in enumerate(rows, start=start):
        out.append(
            {
                "index": i,
                "id": row.get("id"),
                "name": row.get("name"),
                "website": row.get("website"),
            }
        )
    return {"leads": out, "start": start, "end": end}


@app.post("/api/leads/re-enrich-emails")
async def reenrich_emails(payload: ReenrichRange):
    """Kick off a background email-only re-enrichment for the given range."""
    if payload.start_index < 1 or payload.end_index < payload.start_index:
        return JSONResponse(
            status_code=400,
            content={
                "error": "start_index must be >= 1 and end_index must be >= start_index."
            },
        )
    if payload.end_index - payload.start_index > 999:
        return JSONResponse(
            status_code=400,
            content={"error": "Range too large. Max 1000 leads per run."},
        )

    job = await start_reenrich_job(payload.start_index, payload.end_index)
    return {
        "job_id": job.job_id,
        "start_index": job.start_index,
        "end_index": job.end_index,
    }


@app.get("/api/leads/re-enrich/{job_id}")
async def reenrich_status(job_id: str):
    job = get_reenrich_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    return job.to_dict()


# ─── SPA Serving (React build) ──────────────────────────────────────


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Serve the React app if built; fall back to legacy Jinja UI otherwise."""
    spa_index = DIST_DIR / "index.html"
    if spa_index.exists():
        return FileResponse(str(spa_index))
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def spa_catch_all(full_path: str, request: Request):
    """Client-side routes (e.g. /scraper, /history) fall back to the SPA shell."""
    # Don't swallow API requests accidentally
    if full_path.startswith("api/"):
        return JSONResponse(status_code=404, content={"error": "Not found"})
    spa_index = DIST_DIR / "index.html"
    if spa_index.exists():
        return FileResponse(str(spa_index))
    return templates.TemplateResponse("index.html", {"request": request})
