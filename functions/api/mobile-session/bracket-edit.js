import {allowed,hash,now,json,bearer} from "../../../lib/mobile-session.js";
export async function onRequestPost({request,env}) {
 if(!env.TRO_DB||!env.TRO_MOBILE_DB)return json({error:"Database not configured"},503);
 try {
  const token=bearer(request);
  if(!token)return json({error:"Not authorized"},401);
  const session=await env.TRO_MOBILE_DB.prepare("SELECT email,role FROM mobile_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?").bind(await hash(token),now()).first();
  if(!session||!allowed(session.email)||session.role!=="administrator")return json({error:"Not authorized"},401);
  let body;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
  const data=body?.data;
  if(!data||!Array.isArray(data.teams)||data.teams.length!==16||!Array.isArray(data.main)||data.main.length!==15||!Array.isArray(data.loser)||data.loser.length!==7||!Array.isArray(data.loserSeeds)||data.loserSeeds.length!==8||!Number.isSafeInteger(body.version)||body.version<1)return json({error:"Invalid bracket data or version"},400);
  const serialized=JSON.stringify(data);
  if(serialized.length>30000)return json({error:"Data too large"},413);
  const id="osama-2v2-2026-11-13";
  const result=await env.TRO_DB.prepare("UPDATE brackets SET data=?,version=version+1,updated_by=?,updated_at=datetime('now') WHERE id=? AND version=?").bind(serialized,session.email,id,body.version).run();
  if(!result.meta.changes)return json({error:"Bracket missing or another editor updated it. Reload before saving."},409);
  return json({ok:true,version:body.version+1,editor:session.email});
 }catch{return json({error:"Database unavailable"},503)}
}
