import {
  json, sha256, validEmail, validPassword,
  verifyPassword, randomToken
} from "../../../lib/member-security.js";

export async function onRequestPost({ request, env }) {
  if (!env.TRO_MEMBERS_DB || !env.REGISTRATION_SECURITY) {
    return json("Member login is temporarily unavailable.", 503);
  }

  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json("Expected JSON.", 415);
  }

  let data;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json("Request too large.", 413);
    data = JSON.parse(raw);
  } catch {
    return json("Invalid request.", 400);
  }

  const email = typeof data?.email === "string"
    ? data.email.trim().toLowerCase()
    : "";

  const password = data?.password;

  if (!validEmail(email) || !validPassword(password)) {
    return json("Invalid email or password.", 401);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return json("Unable to verify request.", 503);

  try {
    const rateKey = "member-login:" + await sha256(ip);

    if (await env.REGISTRATION_SECURITY.get(rateKey)) {
      return json("Please wait before trying again.", 429);
    }

    await env.REGISTRATION_SECURITY.put(rateKey, "1", {
      expirationTtl: 5
    });

    const accountKey = "member-login-account:" + await sha256(email);

    if (await env.REGISTRATION_SECURITY.get(accountKey)) {
      return json("Please wait before trying again.", 429);
    }

    await env.REGISTRATION_SECURITY.put(accountKey, "1", {
      expirationTtl: 5
    });

    const emailHash = await sha256(email);
    const now = new Date().toISOString();

    const attempt = await env.TRO_MEMBERS_DB.prepare(
      `SELECT failed_attempts, locked_until
       FROM member_login_attempts WHERE email_hash = ?`
    ).bind(emailHash).first();

    if (attempt?.locked_until && attempt.locked_until > now) {
      return json("Too many login attempts. Please try again later.", 429);
    }

    const recordFailure = async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await env.TRO_MEMBERS_DB.prepare(
        `INSERT INTO member_login_attempts
         (email_hash, failed_attempts, locked_until)
         VALUES (?, 1, NULL)
         ON CONFLICT(email_hash) DO UPDATE SET
           failed_attempts = CASE
             WHEN locked_until IS NOT NULL AND locked_until <= ?
             THEN 1
             ELSE failed_attempts + 1
           END,
           locked_until = CASE
             WHEN locked_until IS NOT NULL AND locked_until <= ?
             THEN NULL
             WHEN failed_attempts + 1 >= 5
             THEN ?
             ELSE locked_until
           END,
           updated_at = CURRENT_TIMESTAMP`
      ).bind(emailHash, now, now, lockedUntil).run();
    };

    const member = await env.TRO_MEMBERS_DB.prepare(
      `SELECT id, email, display_name, password_hash,
              password_salt, email_verified_at
       FROM members WHERE email = ?`
    ).bind(email).first();

    if (!member) {
      await recordFailure();
      return json("Invalid email or password.", 401);
    }

    const passwordCorrect = await verifyPassword(
      password,
      member.password_hash,
      member.password_salt
    );

    if (!passwordCorrect) {
      await recordFailure();
      return json("Invalid email or password.", 401);
    }

    if (!member.email_verified_at) {
      return json("Please verify your email before logging in.", 403);
    }

    await env.TRO_MEMBERS_DB.prepare(
      "DELETE FROM member_login_attempts WHERE email_hash = ?"
    ).bind(emailHash).run();

    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    await env.TRO_MEMBERS_DB.prepare(
      `INSERT INTO member_sessions
       (token_hash, member_id, expires_at)
       VALUES (?, ?, ?)`
    ).bind(tokenHash, member.id, expiresAt).run();

    return new Response(JSON.stringify({
      message: "Login successful.",
      token,
      expiresAt,
      member: {
        id: member.id,
        email: member.email,
        displayName: member.display_name
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Member login failed:", error);
    return json("Unable to log in right now.", 503);
  }
}

export async function onRequestGet() {
  return json("Use POST to log in.", 405);
}
