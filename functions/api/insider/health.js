export async function onRequestGet({env}) {
  const checks = {
    database: !!(env.database && typeof env.database.prepare === "function"),
    resend: !!env.RESEND_API_KEY,
    security: !!(env.REGISTRATION_SECURITY && typeof env.REGISTRATION_SECURITY.get === "function")
  };
  return new Response(JSON.stringify({ready:Object.values(checks).every(Boolean),checks}),{
    headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
  });
}
