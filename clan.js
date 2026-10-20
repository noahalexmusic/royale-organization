// GET /api/clan?tag=GRU222VR -> trimmed clan data from the official Clash Royale API (via RoyaleAPI proxy)
const BASE = "https://proxy.royaleapi.dev/v1";
const ALLOWED = ["GRU222VR", "J82QJ2QY", "JY298RRC"]; // our three partner clans only

const json = (body, status = 200, ttl = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": ttl ? `public, max-age=${ttl}` : "no-store" },
  });

export async function onRequestGet({ request, env, waitUntil }) {
  const tag = (new URL(request.url).searchParams.get("tag") || "").replace("#", "").toUpperCase();
  if (!ALLOWED.includes(tag)) return json({ error: "Unknown clan" }, 404);
  if (!env.CR_TOKEN) return json({ error: "Server is missing CR_TOKEN" }, 500);

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + "/api/clan?tag=" + tag);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let r;
  try {
    r = await fetch(`${BASE}/clans/%23${tag}`, { headers: { Authorization: `Bearer ${env.CR_TOKEN}` } });
  } catch (e) {
    return json({ error: "Could not reach Clash Royale" }, 502);
  }
  if (!r.ok) return json({ error: "Clash Royale API error", status: r.status }, 502);

  const d = await r.json();
  const out = json({
    name: d.name,
    tag: d.tag,
    members: d.members,
    clanScore: d.clanScore,
    clanWarTrophies: d.clanWarTrophies,
    memberList: (d.memberList || []).map((m) => ({ name: m.name, tag: m.tag, role: m.role, trophies: m.trophies })),
  }, 200, 120);
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}