"""Email-only re-enrichment for leads that were saved without a final_email.

Flow:
  1. Caller provides a 1-based `[start_index, end_index]` range.
  2. We pull leads that match WHERE final_email IS NULL/''  AND website != ''
     ordered by `id` ASC, so the numbering is stable between calls.
  3. For each lead we run website/facebook/instagram email extraction only
     (no Google Maps scrape, no POS detection).
  4. If we find a non-empty `final_email`, we UPDATE the existing row in place.
     Other leads stay untouched. No INSERTs, no duplicates.

A `ReenrichJob` is tracked in-memory (same pattern as ScrapeJob) so the
frontend can poll `/api/leads/re-enrich/{job_id}` for progress.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime

from app import database as db
from app.scraper.email_extractor import extract_all_emails

logger = logging.getLogger(__name__)


@dataclass
class ReenrichJob:
    job_id: str
    start_index: int
    end_index: int
    status: str = "pending"  # pending | running | completed | failed
    total: int = 0
    processed: int = 0
    updated: int = 0  # leads whose final_email changed from empty -> something
    no_email_found: int = 0
    errors: list[str] = field(default_factory=list)
    started_at: str = ""
    finished_at: str = ""
    sample_updates: list[dict] = field(default_factory=list)  # small preview for UI

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "start_index": self.start_index,
            "end_index": self.end_index,
            "status": self.status,
            "total": self.total,
            "processed": self.processed,
            "updated": self.updated,
            "no_email_found": self.no_email_found,
            "errors": self.errors[-5:],
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "sample_updates": self.sample_updates[-10:],
        }


_jobs: dict[str, ReenrichJob] = {}


def get_reenrich_job(job_id: str) -> ReenrichJob | None:
    return _jobs.get(job_id)


async def start_reenrich_job(start_index: int, end_index: int) -> ReenrichJob:
    """Create + launch a background email-only re-enrichment job."""
    job_id = str(uuid.uuid4())[:8]
    job = ReenrichJob(
        job_id=job_id,
        start_index=start_index,
        end_index=end_index,
        started_at=datetime.utcnow().isoformat(),
    )
    _jobs[job_id] = job
    asyncio.create_task(_run(job))
    return job


async def _run(job: ReenrichJob) -> None:
    job.status = "running"
    try:
        leads = await db.get_leads_missing_emails(job.start_index, job.end_index)
        job.total = len(leads)
        if job.total == 0:
            job.status = "completed"
            job.finished_at = datetime.utcnow().isoformat()
            logger.info(
                f"Re-enrich {job.job_id}: no leads in range "
                f"[{job.start_index}..{job.end_index}]"
            )
            return

        logger.info(
            f"Re-enrich {job.job_id}: processing {job.total} leads "
            f"[{job.start_index}..{job.end_index}]"
        )

        # Run enrichments in parallel with a small fan-out so we don't overload
        # the target sites or the backend; same concurrency shape as a scrape.
        sem = asyncio.Semaphore(5)

        async def _process(lead: dict):
            async with sem:
                await _process_one(lead, job)

        await asyncio.gather(
            *[_process(lead) for lead in leads], return_exceptions=True
        )

        job.status = "completed"
    except Exception as e:
        job.status = "failed"
        job.errors.append(str(e))
        logger.exception(f"Re-enrich {job.job_id} failed: {e}")
    finally:
        job.finished_at = datetime.utcnow().isoformat()
        logger.info(
            f"Re-enrich {job.job_id} done: "
            f"processed={job.processed}, updated={job.updated}, "
            f"no_email={job.no_email_found}, status={job.status}"
        )


async def _process_one(lead: dict, job: ReenrichJob) -> None:
    lead_id = lead.get("id")
    name = lead.get("name") or f"#{lead_id}"
    website = (lead.get("website") or "").strip()

    try:
        result = await extract_all_emails(
            website_url=website,
            facebook_url=lead.get("facebook_link") or "",
            instagram_url=lead.get("instagram_link") or "",
            google_maps_email=lead.get("google_maps_email") or "",
        )
        final_email = (result.get("final_email") or "").strip()

        if final_email:
            ok = await db.update_lead_emails(
                lead_id,
                {
                    "final_email": final_email,
                    "website_email": result.get("website_email", ""),
                    "all_website_emails": result.get("all_website_emails", ""),
                    "facebook_email": result.get("facebook_email", ""),
                    "instagram_email": result.get("instagram_email", ""),
                    "comparing_emails": result.get("comparing_emails", ""),
                    "email_source": result.get("email_source", ""),
                },
            )
            if ok:
                job.updated += 1
                job.sample_updates.append(
                    {"id": lead_id, "name": name, "email": final_email}
                )
                logger.info(
                    f"  [{job.job_id}] {name}: found {final_email} "
                    f"(src={result.get('email_source','')})"
                )
            else:
                job.errors.append(f"update failed: {name}")
        else:
            job.no_email_found += 1
            logger.info(f"  [{job.job_id}] {name}: no email found")
    except Exception as e:
        job.errors.append(f"{name}: {e}")
        logger.warning(f"  [{job.job_id}] error on {name}: {e}")
    finally:
        job.processed += 1
