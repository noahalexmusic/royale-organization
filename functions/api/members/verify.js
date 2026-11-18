import { json, sha256 } from "../../../lib/member-security.js";

export async function onRequestGet({ request, env }) {
  if (!env.TRO_MEMBERS_DB) {
    return json("Email verification is temporarily unavailable.", 503);
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return json("Invalid verification link.", 400);
  }

  try {
    const tokenHash = await sha256(token);

    const verification = await env.TRO_MEMBERS_DB.prepare(
      `SELECT member_id
       FROM member_email_verifications
       WHERE token_hash = ?
       AND expires_at > ?`
    ).bind(tokenHash, new Date().toISOString()).first();

    if (!verification) {
      return json("This verification link is invalid or expired.", 400);
    }

    await env.TRO_MEMBERS_DB.batch([
      env.TRO_MEMBERS_DB.prepare(
        `UPDATE members
         SET email_verified_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND email_verified_at IS NULL`
      ).bind(verification.member_id),

      env.TRO_MEMBERS_DB.prepare(
        `DELETE FROM member_email_verifications
         WHERE member_id = ?`
      ).bind(verification.member_id)
    ]);

    return json("Your TRO account email has been verified!");
  } catch (error) {
    console.error("Member verification failed:", error);
    return json("Unable to verify your email right now.", 503);
  }
}
