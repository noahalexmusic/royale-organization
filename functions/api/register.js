
/*
 * THE ROYALE ORGANIZATION
 * OFFICIAL EVENT REGISTRATION API
 *
 * Endpoint: POST /api/register
 *
 * Cloudflare bindings:
 * DB                       - D1 Database
 * TURNSTILE_SECRET_KEY     - Turnstile Secret
 * REGISTRATION_SECURITY    - Workers KV
 *
 * Registration status: Pending approval
 */

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

const ALLOWED_CLANS = new Set([
  "Crownbound",
  "Mojo's Dojo",
  "MK Best Win Con",
  "pist.lia.chio",
  "Other Clan",
  "No Clan"
]);

const COOLDOWN_SECONDS = 60;

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
    .toUpperCase()
    .replace(/O/g, "0");
}

function validDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(value + "T00:00:00Z");

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/*
 * CLOUDFLARE TURNSTILE VERIFICATION
 */

async function verifyTurnstile(env, request, token) {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error("Turnstile secret missing");
    return {
      ok: false,
      status: 503,
      message: "Registration is temporarily unavailable."
    };
  }

  if (
    typeof token !== "string" ||
    !token ||
    token.length > 2048
  ) {
    return {
      ok: false,
      status: 400,
      message: "Please complete the security verification."
    };
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: request.headers.get("CF-Connecting-IP")
        })
      }
    );

    if (!response.ok) {
      throw new Error("Turnstile service unavailable");
    }

    const result = await response.json();

    if (
      result.success !== true ||
      result.hostname !== "theroyaleorganization.com"
    ) {
      return {
        ok: false,
        status: 403,
        message: "Security verification failed. Please try again."
      };
    }

    return { ok: true };

  } catch (error) {
    console.error("Turnstile error:", error);

    return {
      ok: false,
      status: 503,
      message: "Security verification is temporarily unavailable."
    };
  }
}

/*
 * REGISTRATION COOLDOWN
 *
 * Best-effort protection using Cloudflare KV.
 * This is not a guaranteed atomic rate limiter.
 */

async function checkRegistrationLimit(env, request) {
  if (!env.REGISTRATION_SECURITY) {
    console.error("Registration KV binding missing");
    return {
      allowed: false,
      unavailable: true
    };
  }

  const ip = request.headers.get("CF-Connecting-IP");

  if (!ip) {
    return {
      allowed: false,
      unavailable: true
    };
  }

  try {
    const bytes = new TextEncoder().encode(ip);

    const digest = await crypto.subtle.digest(
      "SHA-256",
      bytes
    );

    const hash = Array.from(new Uint8Array(digest))
      .map(function (byte) {
        return byte.toString(16).padStart(2, "0");
      })
      .join("");

    const key = "registration-attempt:" + hash;

    const existing = await env.REGISTRATION_SECURITY.get(key);

    if (existing) {
      return {
        allowed: false,
        unavailable: false
      };
    }

    await env.REGISTRATION_SECURITY.put(key, "1", {
      expirationTtl: COOLDOWN_SECONDS
    });

    return {
      allowed: true,
      unavailable: false
    };

  } catch (error) {
    console.error("Registration cooldown error:", error);

    return {
      allowed: false,
      unavailable: true
    };
  }
}

/*
 * LOAD OFFICIAL EVENT DATABASE
 */

async function loadOfficialEvents(env, request) {
  if (!env.ASSETS) {
    throw new Error("Cloudflare asset binding missing");
  }

  const url = new URL("/events.json", request.url);

  const response = await env.ASSETS.fetch(
    new Request(url.toString())
  );

  if (!response.ok) {
    throw new Error("Events database unavailable");
  }

  const data = await response.json();

  if (!data || !Array.isArray(data.events)) {
    throw new Error("Invalid events database");
  }

  return data.events;
}

/*
 * REGISTRATION ENDPOINT
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    console.error("D1 database binding missing");

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

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return reply({
      success: false,
      message: "Invalid registration data."
    }, 400);
  }

  /*
   * HONEYPOT SPAM CHECK
   */

  if (data.website) {
    return reply({
      success: false,
      message: "Registration could not be processed."
    }, 400);
  }

  /*
   * VALIDATE PLAYER INFORMATION
   */

  const eventId = clean(data.eventId, 100);
  const playerName = clean(data.playerName, 50);
  const playerTag = normalizeTag(
    clean(data.playerTag, 15)
  );
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

  /*
   * VERIFY OFFICIAL EVENT
   *
   * Check event availability before consuming
   * the Turnstile token or starting cooldown.
   */

  let officialEvents;

  try {
    officialEvents = await loadOfficialEvents(
      env,
      request
    );
  } catch (error) {
    console.error("Event loading error:", error);

    return reply({
      success: false,
      message: "Event registration is temporarily unavailable."
    }, 503);
  }

  const selectedEvent = officialEvents.find(function (event) {
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

  /*
   * VERIFY CLOUDFLARE TURNSTILE
   */

  const verification = await verifyTurnstile(
    env,
    request,
    data.turnstileToken
  );

  if (!verification.ok) {
    return reply({
      success: false,
      message: verification.message
    }, verification.status);
  }

  /*
   * APPLY BEST-EFFORT COOLDOWN
   *
   * Runs only after validating the event
   * and successfully verifying Turnstile.
   */

  const cooldown = await checkRegistrationLimit(
    env,
    request
  );

  if (!cooldown.allowed) {
    if (cooldown.unavailable) {
      return reply({
        success: false,
        message: "Registration security is temporarily unavailable."
      }, 503);
    }

    return reply({
      success: false,
      message: "Please wait at least 60 seconds before trying another registration."
    }, 429);
  }

  /*
   * SAVE REGISTRATION TO CLOUDFLARE D1
   */

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

    console.error("Registration database error:", error);

    return reply({
      success: false,
      message: "We couldn't save your registration. Please try again later."
    }, 500);
  }
}

/*
 * GET REQUESTS ARE NOT REGISTRATIONS
 */

export function onRequestGet() {
  return reply({
    success: false,
    message: "Use the official TRO registration form."
  }, 405);
}

