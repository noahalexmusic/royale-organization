import {
  json, sha256, randomToken, validEmail, sendMemberEmail
} from "../../../lib/member-security.js";

export async function onRequestPost({ request, env }) {
  if (!env.TRO_MEMBERS_DB || !env.RESEND_API_KEY || !env.REGISTRATION_SECURITY) {
    return json("Verification is temporarily unavailable.", 503);
  }

  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json("Expected JSON.", 415);
  }

  let data;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return json("Request too large.", 413);
    data = JSON.parse(raw);
  } catch {
    return json("Invalid request.", 400);
  }

  const email = typeof data?.email === "string"
    ? data.email.trim().toLowerCase()
    : "";

  if (!validEmail(email)) {
    return json("Enter a valid email address.", 400);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return json("Unable to verify request.", 503);

  const message =
    "If your account needs verification, we'll send you a new link.";

  try {
    const rateKey = "member-resend:" + await sha256(email);

    if (await env.REGISTRATION_SECURITY.get(rateKey)) {
      return json(message);
    }

    await env.REGISTRATION_SECURITY.put(rateKey, "1", {
      expirationTtl: 300
    });

    const member = await env.TRO_MEMBERS_DB.prepare(
      `SELECT id, email_verified_at
       FROM members WHERE email = ?`
    ).bind(email).first();

    if (!member || member.email_verified_at) {
      return json(message);
    }

    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    await env.TRO_MEMBERS_DB.batch([
      env.TRO_MEMBERS_DB.prepare(
        `DELETE FROM member_email_verifications
         WHERE member_id = ?`
      ).bind(member.id),

      env.TRO_MEMBERS_DB.prepare(
        `INSERT INTO member_email_verifications
         (token_hash, member_id, expires_at)
         VALUES (?, ?, ?)`
      ).bind(tokenHash, member.id, expiresAt)
    ]);

    const verificationUrl =
      "https://theroyaleorganization.com/api/members/verify?token=" +
      encodeURIComponent(token);

    await sendMemberEmail(
      env,
      email,
      "Verify your TRO member account",
      "You requested a new verification link for The Royale Organization.\n\n" +
      "Verify your email within 24 hours:\n" +
      verificationUrl +
      "\n\nIf you didn't request this, you can ignore this email."
    );

    return json(message);
  } catch (error) {
    console.error("Member verification resend failed:", error);
    return json("Unable to process your request right now.", 503);
  }
}

export async function onRequestGet() {
  return json("Use POST to request verification.", 405);
}
