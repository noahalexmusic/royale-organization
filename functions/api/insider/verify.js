const origin="https://theroyaleorganization.com";
const redirect=(msg)=>Response.redirect(origin+"/updates.html?result="+encodeURIComponent(msg),303);
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
const hash=async s=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
async function signature(env,email){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.RESEND_API_KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode("unsubscribe:"+email)))}
export async function onRequestGet({request,env}){
 if(!env.database||!env.RESEND_API_KEY)return redirect("unavailable");
 const token=new URL(request.url).searchParams.get("token")||"";
 if(!/^[a-f0-9]{64}$/.test(token))return redirect("invalid");
 try{
 const tokenHash=await hash(token);
 const row=await env.database.prepare("SELECT email,verification_expires_at FROM subscribers WHERE status='pending' AND verification_token_hash=?").bind(tokenHash).first();
 if(!row||!row.verification_expires_at||Date.parse(row.verification_expires_at)<Date.now())return redirect("invalid");
 const result=await env.database.prepare("UPDATE subscribers SET status='active',verified_at=CURRENT_TIMESTAMP,verification_token_hash=NULL,verification_expires_at=NULL WHERE email=? AND status='pending' AND verification_token_hash=?").bind(row.email,tokenHash).run();
 if(!result.meta?.changes)return redirect("invalid");
 const sig=await signature(env,row.email);
 const link=origin+"/api/insider/unsubscribe?email="+encodeURIComponent(row.email)+"&sig="+sig;
 const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"The Royale Insider <updates@theroyaleorganization.com>",to:[row.email],subject:"You're subscribed to The Royale Insider",text:"You're now subscribed to TRO news and announcements.\\n\\nYou can unsubscribe any time here:\\n"+link})});
 if(!r.ok)console.error("insider welcome email failed",r.status);
 return redirect("verified");
 }catch(e){console.error("insider verification failed",e);return redirect("unavailable")}
}
