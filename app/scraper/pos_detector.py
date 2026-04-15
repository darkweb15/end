"""POS (Point of Sale) system detection from business websites."""

import re
import logging

import aiohttp
from bs4 import BeautifulSoup

from app.config import POS_SYSTEMS, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


async def detect_pos_system(website_url: str) -> dict:
    """
    Detect if a business uses a POS system by scanning their website.

    Checks for:
    - POS system mentions in page content
    - POS-related scripts and integrations
    - Online ordering system indicators

    Returns dict with:
        - has_pos: bool
        - pos_system: str (name of detected POS)
        - pos_details: str (additional details)
    """
    result = {
        "has_pos": False,
        "pos_system": "",
        "pos_details": "",
    }

    if not website_url:
        return result

    if not website_url.startswith("http"):
        website_url = "https://" + website_url

    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        }
        connector = aiohttp.TCPConnector(ssl=False)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(
                website_url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
                allow_redirects=True,
            ) as response:
                if response.status != 200:
                    return result
                html = await response.text(errors="replace")
    except Exception as e:
        logger.debug(f"Failed to fetch {website_url} for POS detection: {e}")
        return result

    if not html:
        return result

    html_lower = html.lower()
    soup = BeautifulSoup(html, "lxml")
    page_text = soup.get_text().lower()

    detected_systems = []

    # Check page content for POS system mentions
    for pos in POS_SYSTEMS:
        pos_lower = pos.lower()
        # Check in visible text
        if pos_lower in page_text:
            detected_systems.append(pos)
            continue
        # Check in script sources
        for script in soup.find_all("script", src=True):
            if pos_lower.replace(" ", "") in script["src"].lower():
                detected_systems.append(pos)
                break
        # Check in meta tags
        for meta in soup.find_all("meta"):
            content = (meta.get("content") or "").lower()
            if pos_lower in content:
                detected_systems.append(pos)
                break

    # Check for common POS integration patterns
    pos_indicators = {
        "square": [
            "squareup.com", "square.site", "squarespace",
            "js.squareup.com", "square-marketplace",
        ],
        "toast": [
            "toasttab.com", "toast-restaurant", "toastpos",
        ],
        "clover": [
            "clover.com", "cloverfoodlab",
        ],
        "shopify pos": [
            "cdn.shopify.com", "myshopify.com",
        ],
        "lightspeed": [
            "lightspeedhq.com", "lightspeed-pos",
        ],
        "touchbistro": [
            "touchbistro.com",
        ],
    }

    for pos_name, indicators in pos_indicators.items():
        for indicator in indicators:
            if indicator in html_lower:
                if pos_name not in [s.lower() for s in detected_systems]:
                    detected_systems.append(pos_name.title())
                break

    # Check for online ordering platforms (often tied to POS)
    ordering_platforms = {
        "ChowNow": "chownow.com",
        "DoorDash Storefront": "storefront.doordash",
        "GrubHub": "grubhub.com",
        "Uber Eats": "ubereats.com",
        "MenuDrive": "menudrive.com",
        "BentoBox": "getbento.com",
        "Olo": "olo.com",
    }

    ordering_detected = []
    for platform, indicator in ordering_platforms.items():
        if indicator in html_lower:
            ordering_detected.append(platform)

    if detected_systems:
        result["has_pos"] = True
        result["pos_system"] = ", ".join(detected_systems)
        details = f"Detected POS: {', '.join(detected_systems)}"
        if ordering_detected:
            details += f" | Online Ordering: {', '.join(ordering_detected)}"
        result["pos_details"] = details
    elif ordering_detected:
        result["has_pos"] = True
        result["pos_system"] = "Unknown (has online ordering)"
        result["pos_details"] = f"Online Ordering: {', '.join(ordering_detected)}"

    return result
