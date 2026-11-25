import {
  allowed,
  random,
  hash,
  challenge,
  now,
  json
} from "../../../lib/mobile-session.js";

const LONG_TERM_ADMINS = new Set([
  "contact@theroyaleorganization.com",
  "chartro0616@gmail.com"
]);

export async function onRequestPost({ request, env }) {
  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request" }, 400);
    }

    const { code, code_verifier } = body || {};

    if (
      typeof code !== "string" ||
      typeof code_verifier !== "string" ||
      !/^[a-f0-9]{64}$/.test(code) ||
      !/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier)
    ) {
      return json({ error: "Invalid request" }, 400);
    }

    const db = env.TRO_MOBILE_DB;
    if (!db) {
      return json({ error: "Database unavailable" }, 503);
    }

    const t = now();
    const codeHash = await hash(code);
    const codeChallenge = await challenge(code_verifier);

    const row = await db.prepare(
      `UPDATE mobile_auth_codes
       SET used_at=?
       WHERE code_hash=?
         AND code_challenge=?
         AND used_at IS NULL
         AND expires_at>?
       RETURNING email`
    ).bind(t, codeHash, codeChallenge, t).first();

    if (!row || !allowed(row.email)) {
      return json({ error: "Invalid or expired code" }, 401);
    }

    const renewable = LONG_TERM_ADMINS.has(row.email);
    const family_id = renewable ? random() : null;

    const token = random();
    const expires_at = t + 86400;

    let refresh_token;
    let refresh_expires_at;

    const statements = [
      db.prepare(
        `INSERT INTO mobile_sessions
         (token_hash,email,role,created_at,expires_at,family_id)
         VALUES (?,?,?,?,?,?)`
      ).bind(
        await hash(token),
        row.email,
        "administrator",
        t,
        expires_at,
        family_id
      )
    ];

    if (renewable) {
      refresh_token = random();
      refresh_expires_at = t + 30 * 86400;

      statements.push(
        db.prepare(
          `INSERT INTO mobile_refresh_sessions
           (token_hash,email,created_at,expires_at,family_id)
           VALUES (?,?,?,?,?)`
        ).bind(
          await hash(refresh_token),
          row.email,
          t,
          refresh_expires_at,
          family_id
        )
      );
    }

    await db.batch(statements);

    return json({
      token,
      expires_at,
      email: row.email,
      role: "administrator",
      ...(renewable
        ? { refresh_token, refresh_expires_at }
        : {})
    });

  } catch {
    return json({ error: "Exchange unavailable" }, 503);
  }
}
