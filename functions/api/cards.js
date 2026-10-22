// GET /api/cards
// The Royale Organization — Clash Royale Card API

const BASE = "https://proxy.royaleapi.dev/v1";

// Increase whenever the card data structure changes.
const CACHE_VERSION = 3;

// Cache card information for 6 hours.
const CACHE_DURATION = 21600;

// Cards whose current type differs from their original API ID.
const TROOP_OVERRIDES = new Set([
  "Furnace",
  "Spirit Empress",
  "Heal Spirit",
]);

// Create a JSON response.
function json(body, status = 200, ttl = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": ttl
        ? `public, max-age=${ttl}`
        : "no-store",
    },
  });
}

// Determine card type.
// T = Troop
// B = Building
// S = Spell
function getCardType(card) {
  if (TROOP_OVERRIDES.has(card.name)) {
    return "T";
  }

  const id = String(card.id);

  if (id.startsWith("27")) {
    return "B";
  }

  if (id.startsWith("28")) {
    return "S";
  }

  return "T";
}

// Normalize card rarity.
function getRarity(card) {
  return String(card.rarity || "")
    .trim()
    .toLowerCase();
}

// Check whether a card supports Evolution.
function hasEvolution(card) {
  return Number(card.maxEvolutionLevel || 0) > 0;
}

// Check whether a card supports a Hero upgrade.
// Only mark cards when the API supplies this information.
function hasHero(card) {
  return Number(card.maxHeroLevel || 0) > 0;
}

// Convert Clash Royale API data into
// The Royale Organization's card format.
function formatCard(card) {
  const rarity = getRarity(card);

  return {
    // Existing properties
    id: card.id,
    n: card.name,
    e: card.elixirCost,
    t: getCardType(card),
    i: card.iconUrls?.medium || "",

    // New properties
    r: rarity,

    // Champion rarity
    champion: rarity === "champion",

    // Evolution availability
    evolution: hasEvolution(card),

    // Hero availability
    hero: hasHero(card),

    // Evolution artwork, if supplied
    evolutionImage:
      card.iconUrls?.evolutionMedium || "",

    // API level information
    maxEvolutionLevel:
      card.maxEvolutionLevel || 0,

    maxHeroLevel:
      card.maxHeroLevel || 0,
  };
}

// Handle GET /api/cards
export async function onRequestGet({
  request,
  env,
  waitUntil,
}) {
  // Verify API token.
  if (!env.CR_TOKEN) {
    return json(
      { error: "Server is missing CR_TOKEN" },
      500
    );
  }

  const cache = caches.default;

  // Versioned cache prevents outdated data.
  const cacheKey = new Request(
    `${new URL(request.url).origin}/api/cards?v=${CACHE_VERSION}`
  );

  // Return cached data if available.
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  // Request current card information.
  let response;

  try {
    response = await fetch(`${BASE}/cards`, {
      headers: {
        Authorization: `Bearer ${env.CR_TOKEN}`,
      },
    });
  } catch (error) {
    return json(
      { error: "Could not reach Clash Royale" },
      502
    );
  }

  // Handle API errors.
  if (!response.ok) {
    return json(
      {
        error: "Clash Royale API error",
        status: response.status,
      },
      502
    );
  }

  // Read API response.
  let data;

  try {
    data = await response.json();
  } catch (error) {
    return json(
      { error: "Invalid Clash Royale API response" },
      502
    );
  }

  // Keep valid troops, buildings, and spells.
  const cards = (data.items || [])
    .filter((card) => {
      const id = String(card.id);

      return (
        /^2[678]/.test(id) &&
        card.elixirCost != null
      );
    })
    .map(formatCard);

  //
