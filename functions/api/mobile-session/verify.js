import {allowed,hash,now,json,bearer} from "../../../lib/mobile-session.js";
export async function onRequestGet({request,env}) {
 try{
  const token=bearer(request);if(!token)return json({authenticated:false},401);
  const row=await env.TRO_MOBILE_DB.prepare("SELECT email,role,expires_at FROM mobile_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?").bind(await hash(token),now()).first();
  if(!row||!allowed(row.email)||row.role!=="administrator")return json({authenticated:false},401);
  return json({authenticated:true,...row});
 }catch{return json({error:"Verification unavailable"},503);}
}
