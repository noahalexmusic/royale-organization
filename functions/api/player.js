// GET /api/player?tag=200RLYQPPP
// Public player data from the official Clash Royale API via RoyaleAPI's proxy.
// Only returns a small set of public fields; never exposes the API token.
const BASE = "https://proxy.royaleapi.dev/v1";
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});
export async function onRequestGet({ request, env }) {
  const tag = (new URL(request.url).searchParams.get("tag") || "").replace(/^#/, "").trim().toUpperCase();
  if (!/^[0289CGJLPQRUVY]{3,15}$/.test(tag)) return json({ error: "Invalid player tag" }, 400);
  if (!env.CR_TOKEN) return json({ error: "Player API not configured" }, 503);
  let response;
  try {
    response = await fetch(BASE + "/players/%23" + encodeURIComponent(tag), {
      headers: { Authorization: "Bearer " + env.CR_TOKEN, Accept: "application/json" }
    });
  } catch (error) {
    return json({ error: "Unable to reach Clash Royale API" }, 502);
  }
  if (!response.ok) {
    return json({ error: response.status === 404 ? "Player not found" : "Clash Royale API error" }, response.status === 404 ? 404 : 502);
  }
  let player;
  try { player = await response.json(); }
  catch (error) { return json({ error: "Invalid upstream response" }, 502); }
  const path = player.currentPathOfLegendSeasonResult || null;
  const lastPath = player.lastPathOfLegendSeasonResult || null;
  return json({
    name: player.name || null,
    tag: player.tag || ("#" + tag),
    trophies: typeof player.trophies === "number" ? player.trophies : null,
    bestTrophies: typeof player.bestTrophies === "number" ? player.bestTrophies : null,
    currentPathOfLegendSeasonResult: path,
    lastPathOfLegendSeasonResult: lastPath,
    currentRankedTrophies: path && typeof path.trophies === "number" ? path.trophies : null,
    rankedDataAvailable: !!(path && typeof path.trophies === "number")
  });
}
