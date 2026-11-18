import { json, sha256 } from "../../../lib/member-security.js";

export async function onRequestGet({ request, env }) {
  if (!env.TRO_MEMBERS_DB) {
    return json("Member sessions are temporarily unavailable.", 503);
  }

  const authorization = request.headers.get("Authorization") || "";
  const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization);

  if (!match) {
    return json("Authentication required.", 401);
  }

  try {
    const tokenHash = await sha256(match[1]);

    const member = await env.TRO_MEMBERS_DB.prepare(
      `SELECT m.id, m.email, m.display_name,
              m.clash_royale_tag, m.email_verified_at,
              s.expires_at
       FROM member_sessions s
       JOIN members m ON m.id = s.member_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND s.expires_at > ?
         AND m.email_verified_at IS NOT NULL`
    ).bind(tokenHash, new Date().toISOString()).first();

    if (!member) {
      return json("Session expired or invalid.", 401);
    }

    return new Response(JSON.stringify({
      authenticated: true,
      member: {
        id: member.id,
        email: member.email,
        displayName: member.display_name,
        playerTag: member.clash_royale_tag
      },
      expiresAt: member.expires_at
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Member session verification failed:", error);
    return json("Unable to verify session.", 503);
  }
}
