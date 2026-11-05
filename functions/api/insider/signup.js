const json=(message,status=200)=>new Response(JSON.stringify({message}),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
const hash=async s=>hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
const emailValid=s=>typeof s==="string"&&s.length<=254&&/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);
const origin="https://theroyaleorganization.com";
async function send(env,to,subject,body){const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"The Royale Insider <updates@theroyaleorganization.com>",to:[to],subject,text:body})});if(!r.ok)throw Error("email provider failed "+r.status)}
async function signature(env,email){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.RESEND_API_KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode("unsubscribe:"+email)))}
export async function onRequestPost({request,env}) {
 if(!env.database||!env.RESEND_API_KEY||!env.REGISTRATION_SECURITY)return json("Subscriptions are temporarily unavailable.",503);
 if(!(request.headers.get("content-type")||"").includes("application/json"))return json("Invalid request.",415);
 let data;try{const raw=await request.text();if(raw.length>1500)return json("Invalid request.",413);data=JSON.parse(raw)}catch{return json("Invalid request.",400)}
 if(data.website)return json("Unable to process request.",400);
 const email=typeof data.email==="string"?data.email.trim().toLowerCase():"";
 if(!emailValid(email)||data.consent!==true)return json("Enter a valid email and agree to receive updates.",400);
 const ip=request.headers.get("CF-Connecting-IP");if(!ip)return json("Unable to verify request.",503);
 try{
 const key="insider-ip:"+await hash(ip);
 if(await env.REGISTRATION_SECURITY.get(key))return json("Please wait a few minutes before trying again.",429);
 await env.REGISTRATION_SECURITY.put(key,"1",{expirationTtl:180});
 const existing=await env.database.prepare("SELECT status FROM subscribers WHERE email = ?").bind(email).first();
 if(existing?.status==="active")return json("If this address is eligible, you'll receive an email shortly.");
 const token=hex(crypto.getRandomValues(new Uint8Array(32))),tokenHash=await hash(token);
 const expiry=new Date(Date.now()+24*3600000).toISOString();
 await env.database.prepare("INSERT INTO subscribers(email,status,verification_token_hash,verification_expires_at,verified_at,unsubscribed_at) VALUES(?,'pending',?,?,NULL,NULL) ON CONFLICT(email) DO UPDATE SET status='pending',verification_token_hash=excluded.verification_token_hash,verification_expires_at=excluded.verification_expires_at,verified_at=NULL,unsubscribed_at=NULL").bind(email,tokenHash,expiry).run();
 const url=origin+"/api/insider/verify?token="+token;
 await send(env,email,"Confirm your Royale Insider subscription","Thanks for signing up for The Royale Insider!\\n\\nConfirm your email within 24 hours:\\n"+url+"\\n\\nIf you didn't request this, ignore this message. No updates will be sent unless you confirm.");
 return json("Check your inbox for a verification link. It expires in 24 hours.");
 }catch(e){console.error("insider signup failed",e);return json("We couldn't complete signup right now. Please try again later.",503)}
}
export async function onRequestGet(){return json("Use the subscription form.",405)}
