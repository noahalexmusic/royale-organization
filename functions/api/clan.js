// GET /api/clan?tag=GRU222VR -> trimmed clan data from the official Clash Royale API (via RoyaleAPI proxy)
const BASE = "https://proxy.royaleapi.dev/v1";

const json = (body, status = 200, ttl = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": ttl ? `public, max-age=${ttl}` : "no-store" },
  });

export async function onRequestGet({ request, env, waitUntil }) {
  const tag = (new URL(request.url).searchParams.get("tag") || "").replace("#", "").toUpperCase();
  if (!/^[0289PYLQGRJCUV]{3,20}$/.test(tag)) return json({error:"Unknown clan"},404);
  if (env.TRO_CLAN_DB) {
    try {
      const row = await env.TRO_CLAN_DB.prepare("SELECT status FROM partnered_clans WHERE clan_tag=?").bind(tag).first();
      const additionalPartners = new Set(["RPRCL8YG", "8LJQLL"]);
      if ((!row || row.status !== "active") && !additionalPartners.has(tag)) return json({error:"Unknown clan"},404);
    } catch {
      return json({error:"Clan directory temporarily unavailable"},503);
    }
  } else if (new URL(request.url).hostname !== "theroyaleorganization.com") {
    const response = await fetch("https://theroyaleorganization.com/api/clan?tag="+encodeURIComponent(tag));
    return response;
  } else {
    return json({error:"Clan directory not configured"},503);
  }

  if (!env.CR_TOKEN) {
    const current = new URL(request.url);
    if (current.hostname !== "theroyaleorganization.com") {
      try {
        const production = await fetch(
          "https://theroyaleorganization.com/api/clan?tag=" + encodeURIComponent(tag),
          { headers: { Accept: "application/json" } }
        );
        if (production.ok) {
          const previewClan = await production.json();
          return json(previewClan, 200, 120);
        }
      } catch (error) {}
    }
    return json({ error: "Server is missing CR_TOKEN and production fallback failed" }, 500);
  }

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
    requiredTrophies: d.requiredTrophies,
    type: d.type,
    description: d.description,
    location: d.location ? d.location.name : "",
    memberList: (d.memberList || []).map((m) => ({ name: m.name, tag: m.tag, role: m.role, trophies: m.trophies })),
  }, 200, 120);
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
