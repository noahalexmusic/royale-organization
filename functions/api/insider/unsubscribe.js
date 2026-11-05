const origin="https://theroyaleorganization.com";
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
async function signature(env,email){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.RESEND_API_KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode("unsubscribe:"+email)))}
export async function onRequestGet({request,env}){
 if(!env.database||!env.RESEND_API_KEY)return Response.redirect(origin+"/updates.html?result=unavailable",303);
 const url=new URL(request.url),email=(url.searchParams.get("email")||"").toLowerCase(),sig=url.searchParams.get("sig")||"";
 if(!email||!/^[a-f0-9]{64}$/.test(sig)||sig!==await signature(env,email))return Response.redirect(origin+"/updates.html?result=invalid",303);
 try{await env.database.prepare("UPDATE subscribers SET status='unsubscribed',unsubscribed_at=CURRENT_TIMESTAMP,verification_token_hash=NULL,verification_expires_at=NULL WHERE email=?").bind(email).run();return Response.redirect(origin+"/updates.html?result=unsubscribed",303)}
 catch(e){console.error("unsubscribe failed",e);return Response.redirect(origin+"/updates.html?result=unavailable",303)}
}
