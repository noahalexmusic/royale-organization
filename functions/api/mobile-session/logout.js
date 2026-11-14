import {hash,now,json,bearer} from "../../../lib/mobile-session.js";
export async function onRequestPost({request,env}) {
 try{
  const token=bearer(request);if(!token)return json({error:"Unauthorized"},401);
  await env.TRO_MOBILE_DB.prepare("UPDATE mobile_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").bind(now(),await hash(token)).run();
  return json({ok:true});
 }catch{return json({error:"Logout unavailable"},503);}
}
