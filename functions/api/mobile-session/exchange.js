import {allowed,random,hash,challenge,now,json} from "../../../lib/mobile-session.js";
export async function onRequestPost({request,env}) {
 try {
  let body;try{body=await request.json()}catch{return json({error:"Invalid request"},400)}
  const {code,code_verifier}=body||{};
  if(typeof code!=="string"||typeof code_verifier!=="string"||!/^[a-f0-9]{64}$/.test(code)||!/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier))return json({error:"Invalid request"},400);
  const db=env.TRO_MOBILE_DB,t=now(), h=await hash(code), c=await challenge(code_verifier);
  const row=await db.prepare("UPDATE mobile_auth_codes SET used_at=? WHERE code_hash=? AND code_challenge=? AND used_at IS NULL AND expires_at>? RETURNING email").bind(t,h,c,t).first();
  if(!row||!allowed(row.email))return json({error:"Invalid or expired code"},401);
  const token=random(), expires_at=t+86400;
  await db.prepare("INSERT INTO mobile_sessions (token_hash,email,role,created_at,expires_at) VALUES (?,?,?,?,?)").bind(await hash(token),row.email,"administrator",t,expires_at).run();
  return json({token,expires_at,email:row.email,role:"administrator"});
 }catch{return json({error:"Exchange unavailable"},503);}
}
