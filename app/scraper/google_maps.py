"""Google Maps scraper using Playwright for fast parallel scraping."""

import asyncio
import re
import logging
from datetime import datetime
from urllib.parse import quote_plus

from playwright.async_api import async_playwright, Page, BrowserContext

from app.config import SCROLL_PAUSE_TIME, MAX_SCROLLS
from app.models import LeadResult

logger = logging.getLogger(__name__)


async def _extract_place_data(page: Page, search_query: str, zipcode: str,
                               city: str, state: str, country: str) -> LeadResult:
    """Extract data from a Google Maps place detail page."""
    lead = LeadResult(
        date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        search_query=search_query,
        zipcode=zipcode,
        city=city,
        state=state,
        country=country,
    )

    try:
        # Wait for the place details panel
        await page.wait_for_selector('[role="main"]', timeout=8000)
        await asyncio.sleep(1)

        # Name
        try:
            name_el = await page.query_selector('h1')
            if name_el:
                lead.name = (await name_el.inner_text()).strip()
        except Exception:
            pass

        # Rating
        try:
            rating_el = await page.query_selector('div.F7nice span[aria-hidden="true"]')
            if rating_el:
                lead.rating = (await rating_el.inner_text()).strip()
        except Exception:
            pass

        # Reviews count
        try:
            reviews_el = await page.query_selector('div.F7nice span[aria-label*="review"]')
            if reviews_el:
                label = await reviews_el.get_attribute("aria-label")
                if label:
                    nums = re.findall(r'[\d,]+', label)
                    if nums:
                        lead.reviews_count = nums[0].replace(",", "")
        except Exception:
            pass

        # Category / Cuisine
        try:
            cat_el = await page.query_selector('button[jsaction*="category"]')
            if cat_el:
                lead.cuisine_types = (await cat_el.inner_text()).strip()
                lead.category = lead.cuisine_types
        except Exception:
            pass

        # Price range
        try:
            price_el = await page.query_selector('span[aria-label*="Price"]')
            if price_el:
                lead.price_range = (await price_el.inner_text()).strip()
        except Exception:
            pass

        # Extract info from the details section
        info_items = await page.query_selector_all('[data-item-id]')
        for item in info_items:
            try:
                item_id = await item.get_attribute("data-item-id") or ""
                text = (await item.inner_text()).strip()

                if "address" in item_id or item_id == "address":
                    lead.address = text
                elif "phone" in item_id or item_id.startswith("phone"):
                    lead.phone = text
                elif "authority" in item_id or item_id == "authority":
                    lead.website = text
            except Exception:
                continue

        # Maps URL and Place ID
        current_url = page.url
        lead.maps_url = current_url
        place_match = re.search(r'place/([^/]+)', current_url)
        if place_match:
            lead.place_id = place_match.group(1)

        # Also try to get place_id from data attribute
        try:
            place_id_match = re.search(r'0x[0-9a-f]+:0x[0-9a-f]+', current_url)
            if place_id_match:
                lead.place_id = place_id_match.group(0)
        except Exception:
            pass

        # Opening hours
        try:
            hours_btn = await page.query_selector('[data-item-id="oh"]')
            if hours_btn:
                hours_text = await hours_btn.inner_text()
                lead.opening_hours = hours_text.replace("\n", " | ").strip()
        except Exception:
            pass

        # Closure status
        try:
            status_elements = await page.query_selector_all('span')
            for el in status_elements:
                text = (await el.inner_text()).strip().lower()
                if "permanently closed" in text:
                    lead.closure_status = "Permanently Closed"
                    lead.status = "Closed"
                    break
                elif "temporarily closed" in text:
                    lead.closure_status = "Temporarily Closed"
                    lead.status = "Temporarily Closed"
                    break
            if not lead.status:
                lead.status = "Open"
                lead.closure_status = "Open"
        except Exception:
            lead.status = "Unknown"

        # Try to extract email from Google Maps listing itself
        try:
            page_content = await page.content()
            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            emails_found = re.findall(email_pattern, page_content)
            # Filter out Google/Maps related emails
            filtered = [
                e for e in emails_found
                if not any(
                    x in e.lower()
                    for x in ["google", "gstatic", "gmail", "youtube", "android"]
                )
            ]
            if filtered:
                lead.google_maps_email = filtered[0]
        except Exception:
            pass

    except Exception as e:
        logger.error(f"Error extracting place data: {e}")

    return lead


async def _scroll_results(page: Page) -> list:
    """Scroll through Google Maps search results to load more."""
    results_selector = '[role="feed"]'
    try:
        await page.wait_for_selector(results_selector, timeout=10000)
    except Exception:
        # Try alternative selector
        results_selector = 'div[role="main"]'
        try:
            await page.wait_for_selector(results_selector, timeout=5000)
        except Exception:
            return []

    links = set()
    for _ in range(MAX_SCROLLS):
        # Get all result links
        elements = await page.query_selector_all('a[href*="/maps/place/"]')
        for el in elements:
            href = await el.get_attribute("href")
            if href:
                links.add(href)

        # Scroll down in the results panel
        try:
            feed = await page.query_selector(results_selector)
            if feed:
                await feed.evaluate('el => el.scrollTop = el.scrollHeight')
        except Exception:
            break

        await asyncio.sleep(SCROLL_PAUSE_TIME)

        # Check if we reached the end
        try:
            end_el = await page.query_selector('span.HlvSq')
            if end_el:
                end_text = await end_el.inner_text()
                if "end of list" in end_text.lower() or "You've reached the end" in end_text:
                    break
        except Exception:
            pass

    return list(links)


async def scrape_google_maps(
    search_term: str,
    location: str,
    zipcode: str = "",
    city: str = "",
    state: str = "",
    country: str = "",
    max_results: int = 20,
    progress_callback=None,
) -> list[LeadResult]:
    """
    Scrape Google Maps for businesses matching the search term and location.

    Args:
        search_term: What to search for (e.g., "liquor stores")
        location: Full location string (e.g., "10001 New York NY USA")
        zipcode: Zip code
        city: City name
        state: State name
        country: Country name
        max_results: Maximum number of results to scrape
        progress_callback: Async callback for progress updates

    Returns:
        List of LeadResult objects
    """
    results = []
    query = f"{search_term} in {location}"
    encoded_query = quote_plus(query)
    search_url = f"https://www.google.com/maps/search/{encoded_query}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        try:
            logger.info(f"Searching: {query}")
            await page.goto(search_url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)

            # Accept cookies if prompted
            try:
                accept_btn = await page.query_selector(
                    'button[aria-label*="Accept"]'
                )
                if accept_btn:
                    await accept_btn.click()
                    await asyncio.sleep(1)
            except Exception:
                pass

            # Scroll to load all results
            place_links = await _scroll_results(page)
            place_links = place_links[:max_results]
            total = len(place_links)
            logger.info(f"Found {total} places for '{query}'")

            # Visit each place and extract data
            for i, link in enumerate(place_links):
                try:
                    await page.goto(link, wait_until="networkidle", timeout=20000)
                    await asyncio.sleep(1)

                    lead = await _extract_place_data(
                        page, search_term, zipcode, city, state, country
                    )
                    results.append(lead)

                    if progress_callback:
                        await progress_callback(i + 1, total)

                except Exception as e:
                    logger.error(f"Error scraping place {link}: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error during Google Maps scraping: {e}")
        finally:
            await browser.close()

    return results
