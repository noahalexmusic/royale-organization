import {
  allowed,
  random,
  hash,
  now,
  json,
  bearer
} from "../../../lib/mobile-session.js";

const LONG_TERM_ADMINS = new Set([
  "contact@theroyaleorganization.com",
  "chartro0616@gmail.com"
]);

export async function onRequestPost({ request, env }) {
  try {
    const refreshToken = bearer(request);

    if (!refreshToken) {
      return json({ error: "Unauthorized" }, 401);
    }

    const db = env.TRO_MOBILE_DB;

    if (!db) {
      return json({ error: "Database unavailable" }, 503);
    }

    const t = now();
    const oldHash = await hash(refreshToken);

    const row = await db.prepare(
      `SELECT email, expires_at, family_id, revoked_at
       FROM mobile_refresh_sessions
       WHERE token_hash=?`
    ).bind(oldHash).first();

    if (
      !row ||
      !allowed(row.email) ||
      !LONG_TERM_ADMINS.has(row.email) ||
      !row.family_id
    ) {
      return json({ error: "Invalid refresh token" }, 401);
    }

    if (row.revoked_at !== null) {
      return json({ error: "Refresh token already used" }, 401);
    }

    if (row.expires_at <= t) {
      return json({ error: "Refresh session expired" }, 401);
    }

    const rotationId = random();
    const newAccessToken = random();
    const newRefreshToken = random();

    const accessExpires = t + 86400;

    const newAccessHash = await hash(newAccessToken);
    const newRefreshHash = await hash(newRefreshToken);

    await db.batch([
      db.prepare(
        `UPDATE mobile_refresh_sessions
         SET revoked_at=?, last_used_at=?, rotation_id=?
         WHERE token_hash=?
           AND revoked_at IS NULL
           AND expires_at>?`
      ).bind(t, t, rotationId, oldHash, t),

      db.prepare(
        `INSERT INTO mobile_refresh_sessions
         (token_hash,email,created_at,expires_at,family_id)
         VALUES (
           ?,
           (SELECT email
            FROM mobile_refresh_sessions
            WHERE token_hash=? AND rotation_id=?),
           ?,
           (SELECT expires_at
            FROM mobile_refresh_sessions
            WHERE token_hash=? AND rotation_id=?),
           (SELECT family_id
            FROM mobile_refresh_sessions
            WHERE token_hash=? AND rotation_id=?)
         )`
      ).bind(
        newRefreshHash,
        oldHash, rotationId,
        t,
        oldHash, rotationId,
        oldHash, rotationId
      ),

      db.prepare(
        `INSERT INTO mobile_sessions
         (token_hash,email,role,created_at,expires_at,family_id)
         VALUES (
           ?,
           (SELECT email
            FROM mobile_refresh_sessions
            WHERE token_hash=? AND rotation_id=?),
           'administrator',
           ?,
           ?,
           (SELECT family_id
            FROM mobile_refresh_sessions
            WHERE token_hash=? AND rotation_id=?)
         )`
      ).bind(
        newAccessHash,
        oldHash, rotationId,
        t,
        accessExpires,
        oldHash, rotationId
      )
    ]);

    return json({
      token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: accessExpires,
      refresh_expires_at: row.expires_at,
      email: row.email,
      role: "administrator"
    });

  } catch {
    return json({ error: "Session renewal unavailable" }, 503);
  }
}
