"""Google Maps scraper using Playwright for fast parallel scraping."""

import asyncio
import re
import logging
from datetime import datetime
from urllib.parse import quote_plus

from playwright.async_api import async_playwright, Page

from app.config import SCROLL_PAUSE_TIME, MAX_SCROLLS
from app.models import LeadResult

logger = logging.getLogger(__name__)

# JavaScript to extract all place data from the side panel in one shot
EXTRACT_JS = """() => {
    const result = {};

    // Name
    const h1 = document.querySelector('h1.DUwDvf');
    if (h1) result.name = h1.textContent.trim();
    else {
        const qb = document.querySelector('.qBF1Pd');
        if (qb) result.name = qb.textContent.trim();
    }

    // Rating
    const rating = document.querySelector('div.F7nice span[aria-hidden="true"]');
    if (rating) result.rating = rating.textContent.trim();

    // Reviews
    const reviews = document.querySelector('div.F7nice span[aria-label*="review"]');
    if (reviews) {
        const label = reviews.getAttribute('aria-label') || '';
        const nums = label.match(/[\\d,]+/);
        if (nums) result.reviews_count = nums[0].replace(/,/g, '');
    }

    // Category
    const cat = document.querySelector('button[jsaction*="category"]');
    if (cat) result.category = cat.textContent.trim();

    // Price range
    const price = document.querySelector('span[aria-label*="Price"]');
    if (price) result.price_range = price.textContent.trim();

    // Data items (address, phone, website, hours, etc.)
    const items = document.querySelectorAll('[data-item-id]');
    items.forEach(item => {
        const id = item.getAttribute('data-item-id') || '';
        // Remove icon unicode chars, get clean text
        const rawText = item.textContent.replace(/[\\ue000-\\uf8ff]/g, '').trim();

        if (id === 'address') {
            result.address = rawText;
        } else if (id.startsWith('phone')) {
            result.phone = rawText;
        } else if (id === 'authority') {
            // Get website URL - prefer href from link
            const link = item.querySelector('a');
            if (link && link.href && link.href.startsWith('http')) {
                result.website = link.href;
            } else {
                result.website = rawText;
            }
        } else if (id === 'oh') {
            result.opening_hours = rawText;
        }
    });

    // Fallback website from aria-label
    if (!result.website) {
        const webBtn = document.querySelector('a[aria-label*="Website:"]');
        if (webBtn) {
            if (webBtn.href && webBtn.href.startsWith('http')) {
                result.website = webBtn.href;
            } else {
                const label = webBtn.getAttribute('aria-label') || '';
                const parts = label.split('Website:');
                if (parts.length > 1) result.website = parts[1].trim();
            }
        }
    }

    // Closure status
    result.status = 'Open';
    result.closure_status = 'Open';
    const spans = document.querySelectorAll('span');
    for (const span of spans) {
        const t = span.textContent.trim().toLowerCase();
        if (t.includes('permanently closed')) {
            result.status = 'Closed';
            result.closure_status = 'Permanently Closed';
            break;
        } else if (t.includes('temporarily closed')) {
            result.status = 'Temporarily Closed';
            result.closure_status = 'Temporarily Closed';
            break;
        }
    }

    // Extract emails from page content
    const bodyText = document.body.innerHTML;
    const emailRegex = /[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/g;
    const emails = (bodyText.match(emailRegex) || []).filter(
        e => !['google','gstatic','gmail','youtube','android'].some(x => e.toLowerCase().includes(x))
    );
    if (emails.length > 0) result.google_maps_email = emails[0];

    return result;
}"""


async def _extract_place_data(page: Page, search_query: str, zipcode: str,
                               city: str, state: str, country: str) -> LeadResult:
    """Extract data from the Google Maps side panel using JavaScript evaluation."""
    lead = LeadResult(
        date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        search_query=search_query,
        zipcode=zipcode,
        city=city,
        state=state,
        country=country,
    )

    try:
        # Wait for data elements to load
        try:
            await page.wait_for_selector('[data-item-id]', timeout=6000)
        except Exception:
            pass
        await asyncio.sleep(2)

        # Extract all data in one JavaScript call (fast and reliable)
        data = await page.evaluate(EXTRACT_JS)
        logger.info(f"Extracted: {data.get('name', '?')} | website={data.get('website', '')}")

        lead.name = data.get("name", "")
        lead.address = data.get("address", "")
        lead.phone = data.get("phone", "")
        lead.website = data.get("website", "")
        lead.rating = data.get("rating", "")
        lead.reviews_count = data.get("reviews_count", "")
        lead.category = data.get("category", "")
        lead.cuisine_types = data.get("category", "")
        lead.price_range = data.get("price_range", "")
        lead.opening_hours = data.get("opening_hours", "")
        lead.status = data.get("status", "Open")
        lead.closure_status = data.get("closure_status", "Open")
        lead.google_maps_email = data.get("google_maps_email", "")

        # Maps URL and Place ID
        current_url = page.url
        lead.maps_url = current_url
        place_match = re.search(r'place/([^/]+)', current_url)
        if place_match:
            lead.place_id = place_match.group(1)
        try:
            place_id_match = re.search(r'0x[0-9a-f]+:0x[0-9a-f]+', current_url)
            if place_id_match:
                lead.place_id = place_id_match.group(0)
        except Exception:
            pass

    except Exception as e:
        logger.error(f"Error extracting place data: {e}")

    return lead


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
    Uses click-based navigation with JS evaluation for reliable data extraction.
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
            await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)

            # Accept cookies if prompted
            try:
                accept_btn = await page.query_selector('button[aria-label*="Accept"]')
                if accept_btn:
                    await accept_btn.click()
                    await asyncio.sleep(1)
            except Exception:
                pass

            # Wait for search results feed
            feed_selector = '[role="feed"]'
            try:
                await page.wait_for_selector(feed_selector, timeout=10000)
            except Exception:
                feed_selector = 'div[role="main"]'
                try:
                    await page.wait_for_selector(feed_selector, timeout=5000)
                except Exception:
                    logger.error(f"No results feed found for '{query}'")
                    await browser.close()
                    return results

            # Scroll to load enough results
            max_scrolls = min(MAX_SCROLLS, 5)
            for _ in range(max_scrolls):
                try:
                    feed = await page.query_selector(feed_selector)
                    if feed:
                        await feed.evaluate('el => el.scrollTop = el.scrollHeight')
                except Exception:
                    break
                await asyncio.sleep(SCROLL_PAUSE_TIME)

            # Collect all unique place hrefs first (before clicking anything)
            result_elements = await page.query_selector_all('a[href*="/maps/place/"]')
            place_hrefs = []
            seen = set()
            for el in result_elements:
                href = await el.get_attribute("href")
                if href and href not in seen:
                    seen.add(href)
                    place_hrefs.append(href)

            total = min(len(place_hrefs), max_results)
            logger.info(f"Found {len(place_hrefs)} places for '{query}', scraping {total}")

            # Track already-scraped places to avoid duplicates
            scraped_names = set()

            # Click each result by matching href and extract data
            for i in range(total):
                try:
                    target_href = place_hrefs[i]

                    # Re-fetch and find the element with matching href
                    result_elements = await page.query_selector_all('a[href*="/maps/place/"]')
                    target_el = None
                    for el in result_elements:
                        href = await el.get_attribute("href")
                        if href == target_href:
                            target_el = el
                            break

                    if not target_el:
                        logger.warning(f"Could not find element for place {i}")
                        continue

                    # Get name from aria-label (backup)
                    aria_name = await target_el.get_attribute("aria-label") or ""

                    # Skip if already scraped (dedup by name)
                    if aria_name and aria_name in scraped_names:
                        continue

                    # Click the result
                    await target_el.click()
                    await asyncio.sleep(3)

                    # Extract data using JavaScript
                    lead = await _extract_place_data(
                        page, search_term, zipcode, city, state, country
                    )

                    # Use aria-label name as fallback
                    if not lead.name or lead.name == "Results":
                        lead.name = aria_name

                    if lead.name and lead.name not in scraped_names:
                        scraped_names.add(lead.name)
                        results.append(lead)
                        logger.info(
                            f"  [{len(results)}/{total}] {lead.name} | "
                            f"web={lead.website} | phone={lead.phone}"
                        )

                    if progress_callback:
                        await progress_callback(i + 1, total)

                    # Go back to search results
                    back_btn = await page.query_selector('button[aria-label="Back"]')
                    if back_btn:
                        await back_btn.click()
                        await asyncio.sleep(2)
                    else:
                        await page.go_back()
                        await asyncio.sleep(2)

                    # Wait for feed to re-appear
                    try:
                        await page.wait_for_selector(feed_selector, timeout=5000)
                    except Exception:
                        pass
                    await asyncio.sleep(1)

                except Exception as e:
                    logger.error(f"Error scraping place {i}: {e}")
                    try:
                        await page.goto(search_url, wait_until="domcontentloaded", timeout=15000)
                        await asyncio.sleep(3)
                    except Exception:
                        break

        except Exception as e:
            logger.error(f"Error during Google Maps scraping: {e}")
        finally:
            await browser.close()

    return results
