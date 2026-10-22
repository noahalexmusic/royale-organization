
const BASE = "https://proxy.royaleapi.dev/v1";

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

const TYPE_OVERRIDES = {
  27000010: "T", // Furnace
  28000025: "T", // Spirit Empress
  28000016: "T"  // Heal Spirit
};

const CHAMPION_NAMES = new Set([
  "Skeleton King",
  "Archer Queen",
  "Golden Knight",
  "Mighty Miner",
  "Monk",
  "Little Prince",
  "Goblinstein",
  "Boss Bandit"
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

function artwork(value) {
  return typeof value === "string" ? value : "";
}

function normalizeCard(card) {
  const icons = card.iconUrls || {};
  const rarity = String(card.rarity || "").toLowerCase();

  const evoImage = artwork(
    icons.evolutionMedium ||
    icons.evoMedium ||
    card.evolutionImage ||
    card.evoImage
  );

  const heroImage = artwork(
    icons.heroMedium ||
    card.heroImage
  );

  const isChampion =
    CHAMPION_NAMES.has(card.name) ||
    rarity === "champion";

  return {
    id: card.id,
    n: card.name,
    e: card.elixirCost,
    t: cardType(card),

    i: artwork(icons.medium),

    r: rarity || (isChampion ? "champion" : ""),
    rarity: rarity || (isChampion ? "champion" : ""),

    champion: isChampion,

    evo: Boolean(
      evoImage ||
      Number(card.maxEvolutionLevel) > 0
    ),

    hero: Boolean(
      heroImage ||
      card.hero === true ||
      card.isHero === true
    ),

    evoImage: evoImage,
    heroImage: heroImage
  };
}

export async function onRequestGet({
  request,
  env,
  waitUntil
}) {
  if (!env.CR_TOKEN) {
    // Cloudflare preview deployments may not receive production-only secrets.
    // Use the production endpoint so PR previews can still verify the Deck Builder.
    try {
      const production = await fetch(
        "https://royale-organization.pages.dev/api/cards?v=2",
        { headers: { Accept: "application/json" } }
      );

      if (production.ok) {
        const previewCards = await production.json();
        return json(previewCards, 200, 300);
      }
    } catch (error) {
      // Fall through to the explicit configuration error below.
    }

    return json({
      error: "Server is missing CR_TOKEN and production fallback failed"
    }, 500);
  }

  const cache = caches.default;

  // New cache key so the old card list is not reused.
  const cacheKey = new Request(
    new URL(request.url).origin + "/api/cards-data-v2"
  );

  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached;
  }

  let response;

  try {
    response = await fetch(`${BASE}/cards`, {
      headers: {
        Authorization: `Bearer ${env.CR_TOKEN}`
      }
    });
  } catch (error) {
    return json({
      error: "Could not reach Clash Royale"
    }, 502);
  }

  if (!response.ok) {
    return json({
      error: "Clash Royale API error",
      status: response.status
    }, 502);
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    return json({
      error: "Invalid card data"
    }, 502);
  }

  const cards = (
    Array.isArray(data.items) ? data.items : []
  )
    .filter(card =>
      /^2[678]/.test(String(card.id)) &&
      card.elixirCost != null
    )
    .map(normalizeCard);

  const result = json(cards, 200, 21600);

  if (waitUntil) {
    waitUntil(cache.put(cacheKey, result.clone()));
  }

  return result;
}
