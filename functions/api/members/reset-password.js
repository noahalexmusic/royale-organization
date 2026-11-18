import {
  json, sha256, validPassword, hashPassword
} from "../../../lib/member-security.js";

export async function onRequestPost({ request, env }) {
  if (!env.TRO_MEMBERS_DB || !env.REGISTRATION_SECURITY) {
    return json("Password reset is temporarily unavailable.", 503);
  }

  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return json("Expected JSON.", 415);
  }

  let data;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json("Request too large.", 413);
    data = JSON.parse(raw);
  } catch {
    return json("Invalid request.", 400);
  }

  const token = data?.token;
  const password = data?.password;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token) ||
    !validPassword(password)
  ) {
    return json("Invalid reset link or password.", 400);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return json("Unable to verify request.", 503);

  try {
    const rateKey = "member-reset-confirm:" + await sha256(ip);

    if (await env.REGISTRATION_SECURITY.get(rateKey)) {
      return json("Please wait before trying again.", 429);
    }

    await env.REGISTRATION_SECURITY.put(rateKey, "1", {
      expirationTtl: 5
    });

    const tokenHash = await sha256(token);

    const reset = await env.TRO_MEMBERS_DB.prepare(
      `SELECT member_id
       FROM member_password_resets
       WHERE token_hash = ?
         AND expires_at > ?`
    ).bind(tokenHash, new Date().toISOString()).first();

    if (!reset) {
      return json("Reset link is invalid or expired.", 400);
    }

    const passwordData = await hashPassword(password);

    const resetTime = new Date().toISOString();

    const results = await env.TRO_MEMBERS_DB.batch([
      env.TRO_MEMBERS_DB.prepare(
        `DELETE FROM member_password_resets
         WHERE token_hash = ?
           AND member_id = ?
           AND expires_at > ?`
      ).bind(tokenHash, reset.member_id, resetTime),

      env.TRO_MEMBERS_DB.prepare(
        `UPDATE members
         SET password_hash = ?,
             password_salt = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND changes() = 1`
      ).bind(
        passwordData.hash,
        passwordData.salt,
        reset.member_id
      ),

      env.TRO_MEMBERS_DB.prepare(
        `INSERT INTO members
         (id, email, display_name, password_hash, password_salt)
         SELECT id, email, display_name, password_hash, password_salt
         FROM members
         WHERE id = ?
           AND changes() != 1`
      ).bind(reset.member_id),

      env.TRO_MEMBERS_DB.prepare(
        `UPDATE member_sessions
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE member_id = ?
           AND revoked_at IS NULL`
      ).bind(reset.member_id)
    ]);

    if (
      results[0].meta.changes !== 1 ||
      results[1].meta.changes !== 1
    ) {
      return json("Reset link is invalid or expired.", 400);
    }

    return json("Password reset request processed.");
  } catch (error) {
    console.error("Member password reset failed:", error);
    return json("Unable to reset password right now.", 503);
  }
}

export async function onRequestGet() {
  return json("Use POST to reset your password.", 405);
}
