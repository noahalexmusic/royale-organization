import { hash, now, json, bearer } from "../../../lib/mobile-session.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = env.TRO_MOBILE_DB;
    if (!db) return json({ error: "Database unavailable" }, 503);

    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }

    const refreshToken = body?.refresh_token;
    const accessToken = bearer(request);

    if (
      refreshToken !== undefined &&
      (typeof refreshToken !== "string" ||
        !/^[a-f0-9]{64}$/.test(refreshToken))
    ) {
      return json({ error: "Invalid refresh token" }, 400);
    }

    if (!refreshToken && !accessToken) {
      return json({ error: "Unauthorized" }, 401);
    }

    const t = now();

    if (refreshToken) {
      const refreshHash = await hash(refreshToken);

      const refresh = await db.prepare(
        `SELECT email, family_id
         FROM mobile_refresh_sessions
         WHERE token_hash=?
           AND revoked_at IS NULL
           AND expires_at>?`
      ).bind(refreshHash, t).first();

      if (!refresh?.family_id) {
        return json({ error: "Invalid refresh session" }, 401);
      }

      if (accessToken) {
        const accessHash = await hash(accessToken);

        const access = await db.prepare(
          `SELECT email, family_id
           FROM mobile_sessions
           WHERE token_hash=?
             AND revoked_at IS NULL`
        ).bind(accessHash).first();

        if (
          !access ||
          access.email !== refresh.email ||
          access.family_id !== refresh.family_id
        ) {
          return json({ error: "Session credentials mismatch" }, 401);
        }
      }

      await db.batch([
        db.prepare(
          `UPDATE mobile_refresh_sessions
           SET revoked_at=?
           WHERE family_id=? AND revoked_at IS NULL`
        ).bind(t, refresh.family_id),

        db.prepare(
          `UPDATE mobile_sessions
           SET revoked_at=?
           WHERE family_id=? AND revoked_at IS NULL`
        ).bind(t, refresh.family_id)
      ]);

      return json({ ok: true });
    }

    const accessHash = await hash(accessToken);

    const access = await db.prepare(
      `SELECT family_id, expires_at
       FROM mobile_sessions
       WHERE token_hash=?
         AND revoked_at IS NULL`
    ).bind(accessHash).first();

    if (!access || access.expires_at <= t) {
      return json({ error: "Invalid or expired session" }, 401);
    }

    if (access.family_id) {
      return json({ error: "Refresh token required" }, 400);
    }

    await db.prepare(
      `UPDATE mobile_sessions
       SET revoked_at=?
       WHERE token_hash=? AND revoked_at IS NULL`
    ).bind(t, accessHash).run();

    return json({ ok: true });

  } catch {
    return json({ error: "Logout unavailable" }, 503);
  }
}
