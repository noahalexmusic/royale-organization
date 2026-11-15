export async function onRequestGet({env}) {
 const headers={"Cache-Control":"no-store"};
 try {
 const rows=await env.TRO_CLAN_DB.prepare("SELECT id,clan_tag,name,leader,description,theme_color,profile_url FROM partnered_clans WHERE status='active' ORDER BY name").all();
 return Response.json({clans:rows.results},{headers});
 } catch {
 return Response.json({error:"Directory temporarily unavailable"},{status:503,headers});
 }
}
