const SOURCE = "https://royaleapi.com/blog/tags/balance?lang=en";
function clean(s){return String(s||"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/\\s+/g," ").trim();}
export async function onRequestGet(){
 try{
  const res=await fetch(SOURCE,{headers:{"Accept":"text/html","User-Agent":"Mozilla/5.0 (compatible; TROBalanceMonitor/1.0)"}});
  if(!res.ok) throw Error("Source unavailable");
  const html=await res.text();
  const items=[]; const seen=new Set();
  const anchors=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=anchors.exec(html))!==null){
   const title=clean(m[2]);
   if(!/balance changes/i.test(title)||/merge tactics/i.test(title)) continue;
   const url=new URL(m[1],SOURCE);
   if(url.hostname!=="royaleapi.com"||!url.pathname.startsWith("/blog/")||seen.has(url.pathname)) continue;
   const status=/work.in.progress|\bWIP\b/i.test(title)?"WIP":/final|mid.season/i.test(title)?"FINAL":"UPDATE";
   seen.add(url.pathname);
   items.push({title,url:url.href,status});
   if(items.length>=12)break;
  }
  if(!items.length)throw Error("No announcements found");
  return new Response(JSON.stringify({source:"RoyaleAPI",items,checkedAt:new Date().toISOString()}),{headers:{"Content-Type":"application/json","Cache-Control":"public, max-age=21600"}});
 }catch(e){return new Response(JSON.stringify({error:"Balance feed temporarily unavailable",items:[]}),{status:503,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});}
}
