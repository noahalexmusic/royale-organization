import {
  json, randomToken, sha256, validEmail,
  validPassword, hashPassword, sendMemberEmail
} from "../../../lib/member-security.js";

export async function onRequestPost({ request, env }) {
  if (!env.TRO_MEMBERS_DB || !env.RESEND_API_KEY || !env.REGISTRATION_SECURITY) {
    return json("Member registration is temporarily unavailable.", 503);
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

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return json("Invalid request.", 400);
  }

  const email = typeof data.email === "string"
    ? data.email.trim().toLowerCase()
    : "";

  const displayName = typeof data.displayName === "string"
    ? data.displayName.trim()
    : "";

  const password = data.password;

  const playerTag = typeof data.playerTag === "string"
    ? data.playerTag.trim().toUpperCase()
    : null;

  if (!validEmail(email) || displayName.length < 2 || displayName.length > 40 ||
      !validPassword(password) ||
      (playerTag && !/^#?[0289PYLQGRJCUV]{3,15}$/.test(playerTag))) {
    return json("Please check your registration details.", 400);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return json("Unable to verify request.", 503);

  try {
    const rateKey = "member-registration:" + await sha256(ip);

    if (await env.REGISTRATION_SECURITY.get(rateKey)) {
      return json("Please wait before trying again.", 429);
    }

    await env.REGISTRATION_SECURITY.put(rateKey, "1", {
      expirationTtl: 180
    });

    const existing = await env.TRO_MEMBERS_DB.prepare(
      "SELECT id FROM members WHERE email = ?"
    ).bind(email).first();

    const genericMessage =
      "If registration can proceed, check your inbox for a verification email.";

    if (existing) return json(genericMessage);

    const id = crypto.randomUUID();
    const passwordData = await hashPassword(password);
    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await env.TRO_MEMBERS_DB.batch([
      env.TRO_MEMBERS_DB.prepare(
        `INSERT INTO members
         (id, email, display_name, password_hash, password_salt, clash_royale_tag)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        id, email, displayName,
        passwordData.hash, passwordData.salt, playerTag
      ),

      env.TRO_MEMBERS_DB.prepare(
        `INSERT INTO member_email_verifications
         (token_hash, member_id, expires_at)
         VALUES (?, ?, ?)`
      ).bind(tokenHash, id, expiresAt),

      env.TRO_MEMBERS_DB.prepare(
        `INSERT INTO member_notification_preferences (member_id)
         VALUES (?)`
      ).bind(id)
    ]);

    const verificationUrl =
      "https://theroyaleorganization.com/api/members/verify?token=" +
      encodeURIComponent(token);

    await sendMemberEmail(
      env,
      email,
      "Verify your TRO member account",
      "Welcome to The Royale Organization!\n\n" +
      "Verify your email address within 24 hours:\n" +
      verificationUrl +
      "\n\nIf you did not create this account, ignore this email."
    );

    return json(genericMessage, 202);
  } catch (error) {
    console.error("Member registration failed:", error);
    return json("Unable to complete registration right now.", 503);
  }
}

export async function onRequestGet() {
  return json("Use POST to register.", 405);
}
