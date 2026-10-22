// GET /api/cards -> full card list from the official Clash Royale API (via RoyaleAPI proxy)
const BASE = "https://proxy.royaleapi.dev/v1";

const json = (body, status = 200, ttl = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": ttl ? `public, max-age=${ttl}` : "no-store" },
  });

export async function onRequestGet({ request, env, waitUntil }) {
  if (!env.CR_TOKEN) return json({ error: "Server is missing CR_TOKEN" }, 500);

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + "/api/cards");
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let r;
  try {
    r = await fetch(`${BASE}/cards`, { headers: { Authorization: `Bearer ${env.CR_TOKEN}` } });
  } catch (e) {
    return json({ error: "Could not reach Clash Royale" }, 502);
  }
  if (!r.ok) return json({ error: "Clash Royale API error", status: r.status }, 502);

  const d = await r.json();
  const list = (d.items || [])
    .filter((c) => /^2[678]/.test(String(c.id)) && c.elixirCost != null)
    .map((c) => ({
      id: c.id,
      n: c.name,
      e: c.elixirCost,
      t: ["Furnace", "Spirit Empress", "Heal Spirit"].includes(c.name)
  ? "T"
  : String(c.id).startsWith("27")
    ? "B"
    : String(c.id).startsWith("28")
      ? "S"
      : "T",
      i: c.iconUrls && c.iconUrls.medium,
    }));
  const out = json(list, 200, 21600);
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
