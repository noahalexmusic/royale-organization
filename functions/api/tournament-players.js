const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
export async function onRequestGet({ env }) {
  if (!env.DB) return new Response(JSON.stringify({error:"Unavailable"}),{status:503,headers:HEADERS});
  try {
    const { results } = await env.DB.prepare(
      "SELECT player_name, player_tag, clan, country, tiktok_username FROM event_registrations WHERE event_id = ? AND status = 'approved' ORDER BY id ASC LIMIT 200"
    ).bind("2v2-world-wide-2026-11-13").all();
    return new Response(JSON.stringify({players:results || []}),{headers:HEADERS});
  } catch(e) {
    console.error("Public tournament players error",e);
    return new Response(JSON.stringify({error:"Unavailable"}),{status:503,headers:HEADERS});
  }
}
