"""FastAPI application for the Restaurant Leads Scraper."""

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.models import ScrapeRequest
from app.scraper.orchestrator import run_scrape_job, get_job, get_all_jobs
from app.exporter import export_to_csv, export_to_json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(title="Restaurant Leads Scraper", version="1.0.0")

# Static files and templates
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Render the main dashboard."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/scrape")
async def start_scrape(request: ScrapeRequest):
    """Start a new scraping job."""
    if not request.search_terms or not request.zip_codes:
        return JSONResponse(
            status_code=400,
            content={"error": "Please provide at least one search term and one zip code."},
        )

    # Filter out empty lines
    request.search_terms = [s.strip() for s in request.search_terms if s.strip()]
    request.zip_codes = [z.strip() for z in request.zip_codes if z.strip()]

    job_id = await run_scrape_job(request)
    return {"job_id": job_id, "message": "Scraping job started!"}


@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a scraping job."""
    job = get_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})

    return {
        "job_id": job.job_id,
        "status": job.status,
        "total": job.total,
        "completed": job.completed,
        "results_count": len(job.results),
        "errors": job.errors,
        "results": [r.model_dump() for r in job.results],
    }


@app.get("/api/jobs")
async def list_jobs():
    """List all scraping jobs."""
    jobs = get_all_jobs()
    return [
        {
            "job_id": j.job_id,
            "status": j.status,
            "total": j.total,
            "completed": j.completed,
            "results_count": len(j.results),
        }
        for j in jobs
    ]


@app.get("/api/export/{job_id}/{fmt}")
async def export_results(job_id: str, fmt: str):
    """Export job results as CSV or JSON."""
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
    elif fmt == "json":
        content = export_to_json(job.results)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=leads_{job_id}.json"},
        )
    else:
        return JSONResponse(status_code=400, content={"error": "Invalid format. Use 'csv' or 'json'."})
