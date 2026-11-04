// Verified recent 1v1 deck usage for known creator accounts.
// The official API only exposes a limited recent battle log, not full-season history.
const BASE = "https://proxy.royaleapi.dev/v1";
const TAGS = {
  "Mohamed Light": "G9YV9GR8R",
  "Ian77": "Y9R22RQ2",
  "Ryley": "C0V0UQ9UY",
  "Hunter": "J8R89YC"
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate" }
});
export async function onRequestGet({ request, env }) {
  const creator = new URL(request.url).searchParams.get("creator") || "";
  const tag = TAGS[creator];
  if (!tag) return json({ error: "Verified player tag not yet configured" }, 404);
  if (!env.CR_TOKEN) return json({ error: "API token unavailable" }, 503);
  try {
    const response = await fetch(BASE + "/players/%23" + tag + "/battlelog", {
      headers: { Authorization: "Bearer " + env.CR_TOKEN, Accept: "application/json" }
    });
    if (!response.ok) return json({ error: "Player battle log unavailable" }, 502);
    const battles = await response.json();
    const now = new Date();
    // Battle-log history is a rolling sample, not a calendar-month archive.
    const groups = new Map();
    const diagnostics = { noTeam: 0, noEightCards: 0, invalidCardIds: 0 };
    for (const battle of Array.isArray(battles) ? battles : []) {
      if (!battle || !Array.isArray(battle.team) || !battle.team.length) { diagnostics.noTeam++; continue; }
      const time = Date.parse(String(battle.battleTime || "").replace(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6Z"));
      // A valid deck is useful even when a battle timestamp uses an unexpected format.
      const player = battle.team.find(p => String(p.tag || "").replace("#", "").toUpperCase() === tag) || battle.team[0];
      const cards = player.cards || player.deck;
      if (!Array.isArray(cards) || cards.length !== 8) { diagnostics.noEightCards++; continue; }
      const ids = cards.map(card => Number(card.id));
      if (ids.some(id => !Number.isFinite(id))) { diagnostics.invalidCardIds++; continue; }
      const key = ids.slice().sort((a,b) => a-b).join(";");
      if (!groups.has(key)) groups.set(key, { cards: cards.map(card => card.name),
        ids, games: 0, lastPlayed: battle.battleTime });
      groups.get(key).games++;
    }
    const sorted = [...groups.values()].sort((a,b) => b.games-a.games);
    const totalBattleLogEntries = Array.isArray(battles) ? battles.length : 0;
    return json({ creator, tag: "#" + tag, source: "Official Clash Royale API",
      scope: "Recent 1v1 battles in the available rolling API sample (not season-wide)",
      season: now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      sampledBattles: sorted.reduce((sum,d) => sum+d.games, 0),
      totalBattleLogEntries, diagnostics,
      fetchedAt: now.toISOString(), decks: sorted.slice(0, 3) });
  } catch (error) {
    return json({ error: "Unable to load recent player battles" }, 502);
  }
}
