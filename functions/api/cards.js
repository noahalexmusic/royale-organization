// Cloudflare Pages Function: GET /api/cards
// Fetches current Clash Royale cards through the RoyaleAPI proxy.
const BASE = "https://proxy.royaleapi.dev/v1";

const json = (body, status = 200, ttl = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": ttl ? `public, max-age=${ttl}` : "no-store",
    },
  });

// Correct known card-type exceptions.
const TYPE_OVERRIDES = {
  27000010: "T", // Furnace (reworked troop)
  28000025: "T", // Spirit Empress
};

const CHAMPION_NAMES = new Set([
  "Skeleton King",
  "Archer Queen",
  "Golden Knight",
  "Mighty Miner",
  "Monk",
  "Little Prince",
  "Goblinstein",
  "Boss Bandit",
]);

function cardType(card) {
  if (TYPE_OVERRIDES[card.id]) {
    return TYPE_OVERRIDES[card.id];
  }

  const id = String(card.id);

  if (id.startsWith("27")) return "B";
  if (id.startsWith("28")) return "S";

  return "T";
}

export async function onRequestGet({ request, env, waitUntil }) {
  if (!env.CR_TOKEN) {
    return json({ error: "Server is missing CR_TOKEN" }, 500);
  }

  const cache = caches.default;
  const cacheKey = new Request(
    new URL(request.url).origin + "/api/cards"
  );

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let response;

  try {
    response = await fetch(`${BASE}/cards`, {
      headers: {
        Authorization: `Bearer ${env.CR_TOKEN}`,
      },
    });
  } catch (error) {
    return json({ error: "Could not reach Clash Royale" }, 502);
  }

  if (!response.ok) {
    return json({
      error: "Clash Royale API error",
      status: response.status,
    }, 502);
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    return json({
      error: "Invalid response from Clash Royale",
    }, 502);
  }

  const cards = (
    Array.isArray(data.items) ? data.items : []
  )
    .filter((card) =>
      /^2[678]/.test(String(card.id)) &&
      card.elixirCost != null
    )
    .map((card) => ({
      id: card.id,
      n: card.name,
      e: card.elixirCost,
      t: cardType(card),
      i: card.iconUrls?.medium || "",
      rarity:
        typeof card.rarity === "string"
          ? card.rarity.toLowerCase()
          : null,
      champion:
        CHAMPION_NAMES.has(card.name) ||
        String(card.rarity).toLowerCase() === "champion",

      // Evo and Hero artwork will be added separately.
      evo: false,
      hero: false,
    }));

  const result = json(cards, 200, 21600);

  if (waitUntil) {
    waitUntil(cache.put(cacheKey, result.clone()));
  }

  return result;
}
