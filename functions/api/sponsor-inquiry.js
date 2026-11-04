const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const respond=(message,status=200)=>new Response(JSON.stringify({success:status===200,message}),{status,headers});
const trim=(v,max)=>typeof v==="string"?v.trim().slice(0,max+1):"";
const packages=new Set(["Bronze — $25/month","Silver — $75/month","Gold — $150/month","Custom / Event Sponsorship","Not sure yet"]);
export async function onRequestPost({request,env}){
 if(!env.RESEND_API_KEY||!env.TURNSTILE_SECRET_KEY||!env.REGISTRATION_SECURITY)return respond("Applications are temporarily unavailable. Please try again later.",503);
 if(!(request.headers.get("content-type")||"").includes("application/json"))return respond("Invalid request format.",415);
 let data;try{const raw=await request.text();if(raw.length>7000)return respond("Application is too large.",413);data=JSON.parse(raw)}catch{return respond("Invalid application.",400)}
 if(!data||typeof data!=="object"||Array.isArray(data))return respond("Invalid application.",400);
 if(data.faxNumber)return respond("Application could not be processed.",400);
 const business=trim(data.business,120),contact=trim(data.contact,100),email=trim(data.email,254),website=trim(data.website,250),tier=trim(data.package,100),description=trim(data.description,1000),goals=trim(data.goals,1000);
 if(business.length<2||business.length>120||contact.length<2||contact.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||website.length>250||!packages.has(tier)||description.length<5||description.length>1000||goals.length>1000)return respond("Please check the required fields.",400);
 const token=trim(data.turnstileToken,2048);if(!token)return respond("Please complete the security check.",400);
 let verified;try{const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get("CF-Connecting-IP")})});verified=await r.json();if(!r.ok)throw Error("verification unavailable")}catch{return respond("Security verification is temporarily unavailable.",503)}
 if(!verified.success||verified.hostname!=="theroyaleorganization.com")return respond("Security check failed. Please try again.",403);
 const ip=request.headers.get("CF-Connecting-IP");if(!ip)return respond("Security check unavailable.",503);
 let key;try{const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip));key="sponsor-attempt:"+Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");if(await env.REGISTRATION_SECURITY.get(key))return respond("Please wait a few minutes before submitting another application.",429);await env.REGISTRATION_SECURITY.put(key,"1",{expirationTtl:300})}catch{return respond("Application security is temporarily unavailable.",503)}
 const body=["New TRO sponsorship inquiry","Business: "+business,"Contact: "+contact,"Contact email: "+email,"Website/social: "+(website||"Not provided"),"Package: "+tier,"About the business: "+description,"Goals: "+(goals||"Not provided")].join("\n\n");
 try{const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"TRO Sponsorships <sponsorships@theroyaleorganization.com>",to:["contact@theroyaleorganization.com"],subject:"New TRO sponsorship inquiry — "+business.slice(0,60).replace(/[\r\n]/g," "),text:body,reply_to:email})});if(!r.ok){console.error("Resend returned",r.status);return respond("We couldn't deliver your inquiry. Please try again later.",502)}return respond("Your sponsorship inquiry was sent successfully! TRO leadership will review it.")}catch(e){console.error("Sponsorship delivery error",e);return respond("We couldn't deliver your inquiry. Please try again later.",502)}
}
export function onRequestGet(){return respond("Please use the sponsorship inquiry form.",405)}
