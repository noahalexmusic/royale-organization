const ARCHIVE =
  "https://supercell.com/en/games/clashroyale/blog/";

const SOURCE = "https://supercell.com";

const CACHE_SECONDS = 3600;

function json(body, status = 200, ttl = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": ttl
        ? `public, max-age=${ttl}`
        : "no-store"
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
    const url = new URL(href, SOURCE);
    if (url.origin !== SOURCE) return "";
    return url.href;
  } catch {
    return "";
  }
}

function latestBalanceLink(html) {
  const anchors =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchors.exec(html))) {
    const href = decode(match[1]);
    const title = textOnly(match[2]);
    if (!/balance changes/i.test(title)) continue;
    if (/merge tactics/i.test(title)) continue;
    if (
      !/\/games\/clashroyale\/blog\/(?:news|release-notes)\//i
        .test(href)
    ) continue;
    const url = absoluteUrl(href);
    if (url) return { title, url };
  }
  return null;
}

function readPageData(html) {
  const match = html.match(
    /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match) {
    throw new Error("Structured article data not found");
  }
  const data = JSON.parse(match[1]);
  return data?.props?.pageProps || {};
}

function nodeText(node) {
  if (!node) return "";
  if (node.nodeType === "text") {
    return String(node.value || "");
  }
  return (node.content || [])
    .map(nodeText)
    .join("");
}

function documentText(document) {
  return (document?.content || [])
    .map(nodeText)
    .filter(Boolean)
    .join("\n");
}

function categoryFromHeading(heading) {
  const value = heading.toUpperCase();
  if (/^NERFS?\b/.test(value)) return "nerf";
  if (/^BUFFS?\b/.test(value)) return "buff";
  if (/^REWORKS?\b/.test(value)) return "rework";
  if (/^BUG FIX(?:ES)?\b/.test(value)) return "bugfix";
  return null;
}

function cardVariant(name) {
  if (/\b(?:hero)\b/i.test(name)) return "hero";
  if (/\b(?:evolution|evolved|evo)\b/i.test(name)) return "evolution";
  return "normal";
}

function parseChanges(document) {
  const lines = documentText(document)
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  return lines.map(line => {
    const arrow = line.indexOf("→");
    if (arrow === -1) {
      return {
        label: line,
        before: null,
        after: null,
        percentage: null,
        text: line
      };
    }
    const percentageMatch = line.match(
      /\(([+\-−]?\d+(?:\.\d+)?)%\)\s*$/
    );
    const percentage = percentageMatch
      ? percentageMatch[1].replace("−", "-") + "%"
      : null;
    const left = line.slice(0, arrow).trim();
    const right = line
      .slice(arrow + 1)
      .replace(/\s*\([+\-−]?\d+(?:\.\d+)?%\)\s*$/, "")
      .trim();
    let label = "";
    let before = left;
    const colon = left.indexOf(":");
    if (colon !== -1) {
      label = left.slice(0, colon).trim();
      before = left.slice(colon + 1).trim();
    } else {
      const numericStart = left.search(/\s\d/);
      if (numericStart !== -1) {
        label = left.slice(0, numericStart).trim();
        before = left.slice(numericStart).trim();
      }
    }
    return {
      label: label || "Stat Change",
      before,
      after: right,
      percentage,
      text: line
    };
  });
}

function safeImage(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function createUpdate(label) {
  return {
    label,
    changes: [],
    counts: {
      nerf: 0,
      buff: 0,
      rework: 0,
      bugfix: 0
    }
  };
}

function parseUpdates(page) {
  const blocks = page.bodyCollection;
  if (!Array.isArray(blocks)) return [];
  const updates = [];
  let currentUpdate = null;
  let currentCategory = null;
  function ensureUpdate() {
    if (!currentUpdate) {
      currentUpdate = createUpdate(page.title || "Balance Changes");
      updates.push(currentUpdate);
    }
    return currentUpdate;
  }
  for (const block of blocks) {
    if (block.__typename === "TextBlock") {
      const nodes = block.text?.json?.content || [];
      for (const node of nodes) {
        if (!/^heading-/.test(node.nodeType || "")) continue;
        const text = nodeText(node).trim();
        const dateHeading = text.match(/^Balance Update\s*[–—-]\s*(.+)$/i);
        if (dateHeading) {
          currentUpdate = createUpdate(dateHeading[1].trim());
          updates.push(currentUpdate);
          currentCategory = null;
          continue;
        }
        currentCategory = categoryFromHeading(text);
      }
      continue;
    }
    if (
      block.__typename !== "FeatureBlock" ||
      !currentCategory ||
      !block.title
    ) continue;
    const name = String(block.title).trim();
    const stats = parseChanges(block.featureText?.json);
    if (!stats.length) continue;
    const update = ensureUpdate();
    update.changes.push({
      name,
      category: currentCategory,
      variant: cardVariant(name),
      image: safeImage(block.featureThumbnail?.url),
      stats
    });
    update.counts[currentCategory]++;
  }
  return updates
    .filter(update => update.changes.length > 0)
    .map(update => ({
      ...update,
      total: update.changes.length
    }));
}

async function fetchHTML(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "RoyaleOrganization/2.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Supercell returned HTTP ${response.status}`);
  }
  return response.text();
}

export async function onRequestGet({ request, waitUntil }) {
  const cache = caches.default;
  const cacheKey = new Request(
    new URL(request.url).origin + "/api/balance-changes-data-v2"
  );
  try {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    const archiveHtml = await fetchHTML(ARCHIVE);
    const latest = latestBalanceLink(archiveHtml);
    if (!latest) {
      return json({ error: "No official balance article found" }, 502);
    }
    const articleHtml = await fetchHTML(latest.url);
    const page = readPageData(articleHtml);
    const updates = parseUpdates(page);
    const payload = {
      source: "Supercell",
      version: 2,
      title: page.title || latest.title,
      url: latest.url,
      publishedDate: page.publishDate || "",
      latestUpdateLabel: updates[0]?.label || "",
      checkedAt: new Date().toISOString(),
      structuredDataAvailable: updates.length > 0,
      updateCount: updates.length,
      totalChanges: updates.reduce((total, update) => total + update.total, 0),
      updates
    };
    const ttl = updates.length ? CACHE_SECONDS : 0;
    const response = json(payload, 200, ttl);
    if (ttl && waitUntil) {
      waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  } catch (error) {
    return json({
      error: "Could not retrieve official balance changes",
      source: "Supercell",
      structuredDataAvailable: false
    }, 502);
  }
}
