import { json, sha256 } from "../../../lib/member-security.js";

export async function onRequestPost({ request, env }) {
  if (!env.TRO_MEMBERS_DB) {
    return json("Member logout is temporarily unavailable.", 503);
  }

  const authorization = request.headers.get("Authorization") || "";
  const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization);

  if (!match) {
    return json("Authentication required.", 401);
  }

  try {
    const tokenHash = await sha256(match[1]);

    await env.TRO_MEMBERS_DB.prepare(
      `UPDATE member_sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE token_hash = ?
         AND revoked_at IS NULL`
    ).bind(tokenHash).run();

    return json("Logged out successfully.");
  } catch (error) {
    console.error("Member logout failed:", error);
    return json("Unable to log out right now.", 503);
  }
}

export async function onRequestGet() {
  return json("Use POST to log out.", 405);
}
