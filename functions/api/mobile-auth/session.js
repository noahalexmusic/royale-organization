const ALLOWED = new Set([
  "contact@theroyaleorganization.com",
  "rgstudiosoffical@gmail.com",
  "charlottepasternak8@gmail.com"
]);

function decode64(s) {
  return Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/")),
    c => c.charCodeAt(0)
  );
}

async function verifyAccess(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");

  if (
    !token ||
    !env.CF_ACCESS_TEAM_DOMAIN ||
    !env.CF_ACCESS_MOBILE_AUD
  ) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const header = JSON.parse(
    new TextDecoder().decode(decode64(parts[0]))
  );

  if (header.alg !== "RS256") return null;

  const base = "https://" +
    env.CF_ACCESS_TEAM_DOMAIN
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

  const response = await fetch(
    base + "/cdn-cgi/access/certs"
  );

  if (!response.ok) return null;

  const jwks = await response.json();
  const key = jwks.keys.find(k => k.kid === header.kid);

  if (!key) return null;

  const imported = await crypto.subtle.importKey(
    "jwk",
    key,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    imported,
    decode64(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );

  if (!valid) return null;

  const payload = JSON.parse(
    new TextDecoder().decode(decode64(parts[1]))
  );

  const now = Math.floor(Date.now() / 1000);

  const audienceValid = Array.isArray(payload.aud)
    ? payload.aud.includes(env.CF_ACCESS_MOBILE_AUD)
    : payload.aud === env.CF_ACCESS_MOBILE_AUD;

  if (
    typeof payload.exp !== "number" ||
    payload.exp <= now ||
    payload.nbf > now ||
    payload.iss !== base ||
    !audienceValid
  ) return null;

  const email = String(payload.email || "").toLowerCase();

  return ALLOWED.has(email) ? email : null;
}

export async function onRequestGet({ request, env }) {
  const headers = {
    "Cache-Control": "no-store"
  };

  try {
    const email = await verifyAccess(request, env);

    if (!email) {
      return Response.json(
        {
          authenticated: false,
          error: "Not authorized"
        },
        { status: 403, headers }
      );
    }

    return Response.json(
      {
        authenticated: true,
        email,
        role: "administrator",
        organization: "The Royale Organization"
      },
      { headers }
    );

  } catch (error) {
    return Response.json(
      {
        authenticated: false,
        error: "Authentication unavailable"
      },
      { status: 401, headers }
    );
  }
}
