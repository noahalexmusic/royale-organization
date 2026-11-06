const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
async function authorized(request,env){
 const secret=env.TRO_ADMIN_KEY;
 const token=request.headers.get("Authorization")||"";
 if(!secret||secret.length<24||!token.startsWith("Bearer "))return false;
 const enc=new TextEncoder();
 const [a,b]=await Promise.all([crypto.subtle.digest("SHA-256",enc.encode(secret)),crypto.subtle.digest("SHA-256",enc.encode(token.slice(7)))]);
 const x=new Uint8Array(a),y=new Uint8Array(b);let mismatch=0;for(let i=0;i<x.length;i++)mismatch|=x[i]^y[i];return mismatch===0;
}
export async function onRequestGet({request,env}){
 if(!await authorized(request,env))return json({message:"Unauthorized. Configure TRO_ADMIN_KEY in Cloudflare and enter your leadership key."},401);
 if(!env.DB)return json({message:"Database unavailable."},503);
 try{const result=await env.DB.prepare("SELECT id,submitted_at,leader,contact,clan,player,player_tag,reason,status FROM player_week_nominations ORDER BY submitted_at DESC LIMIT 200").all();return json({nominations:result.results||[]});}
 catch(e){console.error(e);return json({message:"Unable to load nominations."},503);}
}
export async function onRequestPatch({request,env}){
 if(!await authorized(request,env))return json({message:"Unauthorized."},401);
 if(!env.DB)return json({message:"Database unavailable."},503);
 let data;try{data=await request.json()}catch{return json({message:"Invalid request."},400)}
 const id=data&&data.id,status=data&&data.status;
 if(!Number.isSafeInteger(id)||id<1||!["pending_verification","verified","rejected","test"].includes(status))return json({message:"Invalid nomination or status."},400);
 try{const result=await env.DB.prepare("UPDATE player_week_nominations SET status = ? WHERE id = ?").bind(status,id).run();if(!result.meta||result.meta.changes!==1)return json({message:"Nomination not found."},404);return json({success:true});}
 catch(e){console.error(e);return json({message:"Unable to update nomination."},503);}
}