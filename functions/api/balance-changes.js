const ARCHIVE = "https://supercell.com/en/games/clashroyale/blog/";

function json(body, status = 200, ttl = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": ttl ? `public, max-age=${ttl}` : "no-store"
    }
  });
}

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/&nbsp;/g, " ");
}

function textOnly(html) {
  return decode(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  ).trim();
}

function absoluteUrl(href) {
  try {
    return new URL(href, "https://supercell.com").href;
  } catch (error) {
    return "";
  }
}

function latestBalanceLink(html) {
  const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchor.exec(html))) {
    const href = decode(match[1]);
    const title = textOnly(match[2]);

    if (!/balance changes/i.test(title)) continue;
    if (/merge tactics/i.test(title)) continue;
    if (!/\/games\/clashroyale\/blog\/(?:news|release-notes)\//i.test(href)) continue;

    return {
      title,
      url: absoluteUrl(href)
    };
  }

  return null;
}

function articleMeta(html) {
  const text = textOnly(html);
  const update = text.match(/Balance Update\s*[–—-]\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?)/i);
  const published =
    html.match(/"datePublished"\s*:\s*"([^"]+)"/i) ||
    html.match(/<time[^>]*datetime=["']([^"']+)["']/i);

  return {
    latestUpdateLabel: update ? update[1] : "",
    publishedDate: published ? published[1] : ""
  };
}

export async function onRequestGet({ request, waitUntil }) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + "/api/balance-changes-data-v1");
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const archiveResponse = await fetch(ARCHIVE, {
      headers: {
        Accept: "text/html",
        "User-Agent": "RoyaleOrganization/1.0"
      }
    });

    if (!archiveResponse.ok) {
      return json({ error: "Could not read Supercell news archive" }, 502);
    }

    const archiveHtml = await archiveResponse.text();
    const latest = latestBalanceLink(archiveHtml);

    if (!latest || !latest.url) {
      return json({ error: "No official balance article found" }, 502);
    }

    let meta = { latestUpdateLabel: "", publishedDate: "" };

    try {
      const articleResponse = await fetch(latest.url, {
        headers: {
          Accept: "text/html",
          "User-Agent": "RoyaleOrganization/1.0"
        }
      });

      if (articleResponse.ok) {
        meta = articleMeta(await articleResponse.text());
      }
    } catch (error) {}

    const payload = {
      source: "Supercell",
      title: latest.title,
      url: latest.url,
      publishedDate: meta.publishedDate,
      latestUpdateLabel: meta.latestUpdateLabel,
      checkedAt: new Date().toISOString()
    };

    const response = json(payload, 200, 3600);
    if (waitUntil) waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return json({ error: "Could not check official balance changes" }, 502);
  }
}
