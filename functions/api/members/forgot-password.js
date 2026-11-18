import {
  json, sha256, randomToken, validEmail, sendMemberEmail
} from "../../../lib/member-security.js";

export async function onRequestPost({ request, env }) {
  if (!env.TRO_MEMBERS_DB || !env.RESEND_API_KEY || !env.REGISTRATION_SECURITY) {
    return json("Password recovery is temporarily unavailable.", 503);
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

  const message =
    "If an account exists for this email, you'll receive password reset instructions.";

  try {
    const rateKey = "member-password-reset:" + await sha256(email);

    if (await env.REGISTRATION_SECURITY.get(rateKey)) {
      return json(message);
    }

    await env.REGISTRATION_SECURITY.put(rateKey, "1", {
      expirationTtl: 300
    });

    const member = await env.TRO_MEMBERS_DB.prepare(
      "SELECT id FROM members WHERE email = ?"
    ).bind(email).first();

    if (!member) return json(message);

    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await env.TRO_MEMBERS_DB.batch([
      env.TRO_MEMBERS_DB.prepare(
        "DELETE FROM member_password_resets WHERE member_id = ?"
      ).bind(member.id),

      env.TRO_MEMBERS_DB.prepare(
        `INSERT INTO member_password_resets
         (token_hash, member_id, expires_at)
         VALUES (?, ?, ?)`
      ).bind(tokenHash, member.id, expiresAt)
    ]);

    const resetUrl =
      "https://theroyaleorganization.com/reset-password.html?token=" +
      encodeURIComponent(token);

    await sendMemberEmail(
      env,
      email,
      "Reset your TRO account password",
      "A password reset was requested for your TRO account.\n\n" +
      "Use this link within 30 minutes:\n" +
      resetUrl +
      "\n\nIf you didn't request this, ignore this email."
    );

    return json(message);
  } catch (error) {
    console.error("Member password reset request failed:", error);
    return json("Unable to process your request right now.", 503);
  }
}

export async function onRequestGet() {
  return json("Use POST to request a password reset.", 405);
}
