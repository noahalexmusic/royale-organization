"""Monitor official Clash Royale balance announcements without inventing card stats."""
import datetime as dt
import html
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

ROOT = "https://supercell.com"
ARCHIVE = ROOT + "/en/games/clashroyale/blog/"
OUT = Path("data/balance-latest.json")
def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "TRO-balance-monitor/1.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace")
def main():
    page = fetch(ARCHIVE)
    links = re.findall(r'href=["\']([^"\']*?/en/games/clashroyale/blog/release-notes/[^"\']+)["\']', page, re.I)
    candidates = []
    for link in links:
        url = link if link.startswith("http") else ROOT + link
        if "balance" in url.lower() and "merge-tactics" not in url.lower():
            if url not in candidates: candidates.append(url)
    if not candidates:
        raise RuntimeError("Could not verify any official balance article; leaving existing data intact")
    url = candidates[0]
    article = fetch(url)
    title_match = re.search(r'<title[^>]*>(.*?)</title>', article, re.I | re.S)
    title = html.unescape(re.sub(r'<[^>]+>', '', title_match.group(1))).strip() if title_match else "Official balance changes"
    previous = json.loads(OUT.read_text()) if OUT.exists() else {}
    payload = {"url": url, "title": title, "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "status": "official-source-verified", "note": "Detailed buffs, nerfs and numerical changes require verification before publication."}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    if previous.get("url") and previous["url"] != url and os.environ.get("GH_TOKEN"):
        body = "A new official Clash Royale balance article was detected: " + url + "\n\nVerify and enter the exact buffs, nerfs, and reworks before updating the detailed stat cards."
        subprocess.run(["gh", "issue", "create", "--title", "Review new Clash Royale balance changes", "--body", body], check=True)
if __name__ == "__main__":
    main()
