export async function onRequestGet({env}) {
 const headers={"Cache-Control":"no-store"};
 try {
 const rows=await env.TRO_CLAN_DB.prepare("SELECT id,clan_tag,name,leader,description,theme_color,profile_url FROM partnered_clans WHERE status='active' ORDER BY name").all();
 const clans=rows.results || [];
 if(!clans.some(c=>c.clan_tag==="RPRCL8YG")){
 clans.push({id:"solar-power",clan_tag:"RPRCL8YG",name:"Solar Power",leader:"",description:"Solar Power is an official partnered clan of The Royale Organization.",theme_color:"#F59E0B",profile_url:"/solar-power.html"});
 }
 if(!clans.some(c=>c.clan_tag==="8LJQLL")){
 clans.push({id:"le-carre-fr",clan_tag:"8LJQLL",name:"LE CARRÉ.fr",leader:"",description:"LE CARRÉ.fr is a partnered Clash Royale clan in The Royale Organization.",theme_color:"#38BDF8",profile_url:"/le-carre-fr.html"});
 }
 return Response.json({clans},{headers});
 } catch {
 return Response.json({error:"Directory temporarily unavailable"},{status:503,headers});
 }
}
