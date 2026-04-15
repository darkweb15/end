"""Deep email extraction from websites, Facebook, Instagram, and LinkedIn."""

import asyncio
import re
import logging
from urllib.parse import urljoin, urlparse

import aiohttp
from bs4 import BeautifulSoup

from app.config import REQUEST_TIMEOUT, MAX_CONCURRENT_REQUESTS

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(
    r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
)

# Domains to exclude from email results
EXCLUDED_EMAIL_DOMAINS = {
    "example.com", "sentry.io", "wixpress.com", "googleapis.com",
    "google.com", "gstatic.com", "youtube.com", "android.com",
    "apple.com", "microsoft.com", "w3.org", "schema.org",
    "facebook.com", "fb.com", "instagram.com", "twitter.com",
    "cloudflare.com", "jquery.com", "wordpress.org", "gravatar.com",
}

# Contact page keywords to look for
CONTACT_PAGE_KEYWORDS = [
    "contact", "about", "about-us", "contact-us", "get-in-touch",
    "reach-us", "info", "support", "help",
]


def _filter_emails(emails: list[str]) -> list[str]:
    """Filter out junk emails and deduplicate."""
    filtered = []
    seen = set()
    for email in emails:
        email = email.lower().strip()
        if email in seen:
            continue
        domain = email.split("@")[-1]
        if domain in EXCLUDED_EMAIL_DOMAINS:
            continue
        if any(x in email for x in [".png", ".jpg", ".gif", ".svg", ".css", ".js"]):
            continue
        if len(email) > 100:
            continue
        seen.add(email)
        filtered.append(email)
    return filtered


async def _fetch_page(session: aiohttp.ClientSession, url: str) -> str:
    """Fetch a web page and return its HTML content."""
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        async with session.get(
            url, headers=headers, timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
            ssl=False, allow_redirects=True
        ) as response:
            if response.status == 200:
                return await response.text(errors="replace")
    except Exception as e:
        logger.debug(f"Failed to fetch {url}: {e}")
    return ""


def _extract_emails_from_html(html: str) -> list[str]:
    """Extract email addresses from HTML content."""
    if not html:
        return []

    # Find emails in raw HTML
    emails = EMAIL_REGEX.findall(html)

    # Also check mailto links
    soup = BeautifulSoup(html, "lxml")
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if "mailto:" in href:
            email = href.replace("mailto:", "").split("?")[0].strip()
            if EMAIL_REGEX.match(email):
                emails.append(email)

    return _filter_emails(emails)


def _extract_social_links(html: str, base_url: str) -> dict[str, str]:
    """Extract social media links from HTML."""
    social = {
        "facebook": "",
        "instagram": "",
        "twitter": "",
        "linkedin": "",
    }

    if not html:
        return social

    soup = BeautifulSoup(html, "lxml")
    for link in soup.find_all("a", href=True):
        href = link["href"].lower().strip()
        if "facebook.com/" in href and not social["facebook"]:
            social["facebook"] = link["href"].strip()
        elif "instagram.com/" in href and not social["instagram"]:
            social["instagram"] = link["href"].strip()
        elif ("twitter.com/" in href or "x.com/" in href) and not social["twitter"]:
            social["twitter"] = link["href"].strip()
        elif "linkedin.com/" in href and not social["linkedin"]:
            social["linkedin"] = link["href"].strip()

    return social


def _find_contact_pages(html: str, base_url: str) -> list[str]:
    """Find links to contact/about pages on the website."""
    pages = []
    if not html:
        return pages

    soup = BeautifulSoup(html, "lxml")
    for link in soup.find_all("a", href=True):
        href = link["href"].strip()
        text = link.get_text().strip().lower()
        href_lower = href.lower()

        is_contact_page = any(kw in href_lower for kw in CONTACT_PAGE_KEYWORDS) or \
                          any(kw in text for kw in CONTACT_PAGE_KEYWORDS)

        if is_contact_page:
            full_url = urljoin(base_url, href)
            parsed = urlparse(full_url)
            base_parsed = urlparse(base_url)
            # Only follow links on the same domain
            if parsed.netloc == base_parsed.netloc or not parsed.netloc:
                pages.append(full_url)

    return list(set(pages))[:5]  # Max 5 contact pages


async def extract_website_emails(website_url: str) -> dict:
    """
    Deep email extraction from a business website.
    Checks homepage + contact/about pages.

    Returns dict with:
        - emails: list of all emails found
        - social_links: dict of social media links
    """
    if not website_url:
        return {"emails": [], "social_links": {}}

    # Ensure URL has scheme
    if not website_url.startswith("http"):
        website_url = "https://" + website_url

    all_emails = []
    social_links = {}

    connector = aiohttp.TCPConnector(limit=MAX_CONCURRENT_REQUESTS, ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        # Fetch homepage
        homepage_html = await _fetch_page(session, website_url)
        if homepage_html:
            all_emails.extend(_extract_emails_from_html(homepage_html))
            social_links = _extract_social_links(homepage_html, website_url)

            # Find and scrape contact pages
            contact_pages = _find_contact_pages(homepage_html, website_url)
            if contact_pages:
                tasks = [_fetch_page(session, url) for url in contact_pages]
                pages = await asyncio.gather(*tasks, return_exceptions=True)
                for page_html in pages:
                    if isinstance(page_html, str) and page_html:
                        all_emails.extend(_extract_emails_from_html(page_html))
                        # Also check contact pages for social links
                        page_social = _extract_social_links(page_html, website_url)
                        for key, val in page_social.items():
                            if val and not social_links.get(key):
                                social_links[key] = val

    return {
        "emails": _filter_emails(all_emails),
        "social_links": social_links,
    }


async def extract_facebook_email(facebook_url: str) -> list[str]:
    """
    Extract email from a Facebook business page.
    Scrapes the About/Info section for contact emails.
    """
    if not facebook_url:
        return []

    emails = []
    # Try common Facebook about page patterns
    fb_urls = []
    base = facebook_url.rstrip("/")
    fb_urls.append(base + "/about")
    fb_urls.append(base + "/about_contact_and_basic_info")
    fb_urls.append(base)

    connector = aiohttp.TCPConnector(limit=5, ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        for url in fb_urls:
            html = await _fetch_page(session, url)
            if html:
                found = _extract_emails_from_html(html)
                emails.extend(found)
                if found:
                    break

    return _filter_emails(emails)


async def extract_instagram_email(instagram_url: str) -> list[str]:
    """
    Extract email from an Instagram profile bio.
    Note: Instagram heavily blocks scraping, so this does best-effort.
    """
    if not instagram_url:
        return []

    emails = []
    connector = aiohttp.TCPConnector(limit=5, ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        html = await _fetch_page(session, instagram_url)
        if html:
            emails = _extract_emails_from_html(html)

    return _filter_emails(emails)


async def extract_all_emails(
    website_url: str = "",
    facebook_url: str = "",
    instagram_url: str = "",
    google_maps_email: str = "",
) -> dict:
    """
    Extract emails from all available sources and consolidate.

    Returns dict with all email fields and the final consolidated email.
    """
    # Run all extractions in parallel for speed
    tasks = [
        extract_website_emails(website_url),
        extract_facebook_email(facebook_url),
        extract_instagram_email(instagram_url),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    website_result = results[0] if not isinstance(results[0], Exception) else {"emails": [], "social_links": {}}
    fb_emails = results[1] if not isinstance(results[1], Exception) else []
    ig_emails = results[2] if not isinstance(results[2], Exception) else []

    website_emails = website_result.get("emails", [])
    social_links = website_result.get("social_links", {})

    # Collect all unique emails
    all_emails = set()
    if google_maps_email:
        all_emails.add(google_maps_email.lower())
    for e in website_emails:
        all_emails.add(e.lower())
    for e in fb_emails:
        all_emails.add(e.lower())
    for e in ig_emails:
        all_emails.add(e.lower())

    all_emails_list = list(all_emails)

    # Determine final email (priority: website > google maps > facebook > instagram)
    final_email = ""
    source = ""
    if website_emails:
        final_email = website_emails[0]
        source = "Website"
    elif google_maps_email:
        final_email = google_maps_email
        source = "Google Maps"
    elif fb_emails:
        final_email = fb_emails[0]
        source = "Facebook"
    elif ig_emails:
        final_email = ig_emails[0]
        source = "Instagram"

    return {
        "website_email": ", ".join(website_emails) if website_emails else "",
        "all_website_emails": ", ".join(website_emails) if website_emails else "",
        "facebook_email": ", ".join(fb_emails) if fb_emails else "",
        "instagram_email": ", ".join(ig_emails) if ig_emails else "",
        "final_email": final_email,
        "comparing_emails": ", ".join(all_emails_list),
        "email_source": source,
        "social_links": social_links,
    }
