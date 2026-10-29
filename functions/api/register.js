
/*
 * THE ROYALE ORGANIZATION
 * Official Event Registration API
 *
 * POST /api/register
 * Database binding: DB
 */

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function clean(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength + 1);
}

function normalizeTag(value) {
  return value
    .replace(/^#/, "")
    .replace(/\s/g, "")
    .toUpperCase();
}

function validDate(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(value + "T00:00:00Z");

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

const ALLOWED_CLANS = new Set([
  "Crownbound",
  "Mojo's Dojo",
  "MK Best Win Con",
  "pist.lia.chio",
  "Other Clan",
  "No Clan"
]);

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    console.error("Missing D1 database binding");
    return reply({
      success: false,
      message: "Registration is temporarily unavailable."
    }, 503);
  }

  const contentType = request.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return reply({
      success: false,
      message: "Invalid request format."
    }, 415);
  }

  const contentLength = Number(
    request.headers.get("content-length") || 0
  );

  if (contentLength > 4096) {
    return reply({
      success: false,
      message: "Registration data is too large."
    }, 413);
  }

  let data;

  try {
    const raw = await request.text();

    if (raw.length > 4096) {
      return reply({
        success: false,
        message: "Registration data is too large."
      }, 413);
    }

    data = JSON.parse(raw);
  } catch {
    return reply({
      success: false,
      message: "Invalid registration data."
    }, 400);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return reply({
      success: false,
      message: "Invalid registration data."
    }, 400);
  }

  // Honeypot field: ordinary visitors must leave it empty.
  if (data.website) {
    return reply({
      success: false,
      message: "Registration could not be processed."
    }, 400);
  }

  // Verify Cloudflare Turnstile before processing registrations.
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error("Turnstile secret is not configured");

    return reply({
      success: false,
      message: "Registration is temporarily unavailable."
    }, 503);
  }

  const turnstileToken = data.turnstileToken;

  if (
    typeof turnstileToken !== "string" ||
    !turnstileToken ||
    turnstileToken.length > 2048
  ) {
    return reply({
      success: false,
      message: "Please complete the security verification."
    }, 400);
  }

  let verification;

  try {
    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: request.headers.get("CF-Connecting-IP")
        })
      }
    );

    if (!verificationResponse.ok) {
      throw new Error("Turnstile verification service error");
    }

    verification = await verificationResponse.json();
  } catch (error) {
    console.error("Turnstile verification failed", error);

    return reply({
      success: false,
      message: "Security verification is temporarily unavailable."
    }, 503);
  }

  if (
    verification.success !== true ||
    verification.hostname !== "theroyaleorganization.com"
  ) {
    return reply({
      success: false,
      message: "Security verification failed. Please try again."
    }, 403);
  }

  const eventId = clean(data.eventId, 100);
  const playerName = clean(data.playerName, 50);
  const playerTag = normalizeTag(clean(data.playerTag, 15));
  const discordName = clean(data.discordName, 50);
  const clan = clean(data.clan, 50);

  if (
    !eventId ||
    eventId.length > 100 ||
    !/^[a-zA-Z0-9_-]+$/.test(eventId)
  ) {
    return reply({
      success: false,
      message: "Please select a valid event."
    }, 400);
  }

  if (
    playerName.length < 2 ||
    playerName.length > 50 ||
    /[\u0000-\u001F\u007F]/.test(playerName)
  ) {
    return reply({
      success: false,
      message: "Please enter a valid player name."
    }, 400);
  }

  if (!/^[0289PYLQGRJCUV]{3,14}$/.test(playerTag)) {
    return reply({
      success: false,
      message: "Please enter a valid Clash Royale player tag."
    }, 400);
  }

  if (
    discordName.length < 2 ||
    discordName.length > 50 ||
    !/^[a-zA-Z0-9._]+$/.test(discordName)
  ) {
    return reply({
      success: false,
      message: "Please enter a valid Discord username."
    }, 400);
  }

  if (!ALLOWED_CLANS.has(clan)) {
    return reply({
      success: false,
      message: "Please select a valid clan."
    }, 400);
  }

  if (
    data.rulesAgreement !== true ||
    data.accuracyAgreement !== true
  ) {
    return reply({
      success: false,
      message: "You must accept both registration agreements."
    }, 400);
  }

  // Load the official events database from this deployment.
  let eventData;

  try {
    const url = new URL("/events.json", request.url);

    const assetResponse = await env.ASSETS.fetch(
      new Request(url.toString())
    );

    if (!assetResponse.ok) {
      throw new Error("Events file unavailable");
    }

    eventData = await assetResponse.json();
  } catch (error) {
    console.error("Could not load official events", error);

    return reply({
      success: false,
      message: "Event registration is temporarily unavailable."
    }, 503);
  }

  if (!eventData || !Array.isArray(eventData.events)) {
    return reply({
      success: false,
      message: "Event registration is temporarily unavailable."
    }, 503);
  }

  const selectedEvent = eventData.events.find(function (event) {
    return event && event.id === eventId;
  });

  if (
    !selectedEvent ||
    selectedEvent.registrationOpen !== true ||
    !validDate(selectedEvent.date) ||
    selectedEvent.date < todayUTC()
  ) {
    return reply({
      success: false,
      message: "This event is not accepting registrations."
    }, 400);
  }

  try {
    const result = await env.DB.prepare(`
      INSERT INTO event_registrations (
        event_id,
        player_name,
        player_tag,
        discord_username,
        clan,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).bind(
      eventId,
      playerName,
      playerTag,
      discordName,
      clan
    ).run();

    if (!result.success) {
      throw new Error("Database insert unsuccessful");
    }

    return reply({
      success: true,
      message: "Registration received successfully! Your application is pending review.",
      registrationId: result.meta?.last_row_id ?? null
    }, 201);

  } catch (error) {
    const message = String(error?.message || "");

    if (
      message.includes("UNIQUE constraint failed") ||
      message.includes("SQLITE_CONSTRAINT_UNIQUE")
    ) {
      return reply({
        success: false,
        message: "This player tag is already registered for this event."
      }, 409);
    }

    console.error("Registration database error", error);

    return reply({
      success: false,
      message: "We couldn't save your registration. Please try again later."
    }, 500);
  }
}

export function onRequestGet() {
  return reply({
    success: false,
    message: "Use the official TRO registration form."
  }, 405);
}
