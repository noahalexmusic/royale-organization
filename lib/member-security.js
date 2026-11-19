export const json = (message, status = 200) =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

export const hex = (bytes) =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const randomToken = () =>
  hex(crypto.getRandomValues(new Uint8Array(32)));

export const sha256 = async (value) =>
  hex(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  ));

export const validEmail = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const validPassword = (value) =>
  typeof value === "string" &&
  value.length >= 12 &&
  value.length <= 128;

export async function hashPassword(password, salt = randomToken()) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return { hash: hex(bits), salt };
}

export async function sendMemberEmail(env, to, subject, body) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.RESEND_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "The Royale Organization <updates@theroyaleorganization.com>",
      to: [to],
      subject,
      text: body
    })
  });

  if (!response.ok) {
    throw new Error("Member email delivery failed: " + response.status);
  }
}

export async function verifyPassword(password, storedHash, salt) {
  const result = await hashPassword(password, salt);

  const expected = Uint8Array.from(
    storedHash.match(/.{2}/g).map((byte) => parseInt(byte, 16))
  );

  const actual = Uint8Array.from(
    result.hash.match(/.{2}/g).map((byte) => parseInt(byte, 16))
  );

  if (expected.length !== actual.length) return false;

  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected[i] ^ actual[i];
  }

  return difference === 0;
}
