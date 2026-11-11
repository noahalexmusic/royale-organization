export async function onRequestGet({env}) {
  if (!env.TRO_DB) return Response.json({error:"Database not configured"},{status:503});
  try {
    const row=await env.TRO_DB.prepare("SELECT data,version FROM brackets WHERE id = ?").bind("osama-2v2-2026-11-13").first();
    return Response.json(row?{data:JSON.parse(row.data),version:row.version}:{data:null,version:0},{headers:{"Cache-Control":"no-store"}});
  } catch(e){return Response.json({error:"Database table not initialized"},{status:503})}
}
