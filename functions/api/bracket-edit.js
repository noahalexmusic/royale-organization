const ALLOWED=new Set(["contact@theroyaleorganization.com","rgstudiosoffical@gmail.com","osamakbeer2020@gmail.com"]);
function decode64(s){return Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0))}
async function verifyAccess(request,env){
 const token=request.headers.get("Cf-Access-Jwt-Assertion");
 if(!token||!env.CF_ACCESS_TEAM_DOMAIN||!env.CF_ACCESS_AUD)return null;
 const parts=token.split(".");if(parts.length!==3)return null;
 const header=JSON.parse(new TextDecoder().decode(decode64(parts[0])));
 if(header.alg!=="RS256")return null;
 const base=env.CF_ACCESS_TEAM_DOMAIN.replace(/\/$/,"");
 const jwks=await fetch(base+"/cdn-cgi/access/certs").then(r=>r.json());
 const key=jwks.keys.find(k=>k.kid===header.kid);if(!key)return null;
 const imported=await crypto.subtle.importKey("jwk",key,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",imported,decode64(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
 if(!valid)return null;
 const payload=JSON.parse(new TextDecoder().decode(decode64(parts[1])));
 const now=Math.floor(Date.now()/1000);
 if(payload.exp<=now||payload.nbf>now||payload.iss!==base||!(Array.isArray(payload.aud)?payload.aud.includes(env.CF_ACCESS_AUD):payload.aud===env.CF_ACCESS_AUD))return null;
 const email=String(payload.email||"").toLowerCase();
 return ALLOWED.has(email)?email:null;
}
export async function onRequestPost({request,env}){
 if(!env.TRO_DB)return Response.json({error:"Database not configured"},{status:503});
 let editor;try{editor=await verifyAccess(request,env)}catch(e){return Response.json({error:"Authentication unavailable"},{status:401})}
 if(!editor)return Response.json({error:"Not authorized"},{status:403});
 let body;try{body=await request.json()}catch(e){return Response.json({error:"Invalid JSON"},{status:400})}
 const data=body.data;
 if(!data||!Array.isArray(data.teams)||data.teams.length!==16||!Array.isArray(data.main)||data.main.length!==15||!Array.isArray(data.loser)||data.loser.length!==7||!Array.isArray(data.loserSeeds)||data.loserSeeds.length!==8)return Response.json({error:"Invalid bracket data"},{status:400});
 const serialized=JSON.stringify(data);if(serialized.length>30000)return Response.json({error:"Data too large"},{status:413});
 const id="osama-2v2-2026-11-13";
 try{
  const existing=await env.TRO_DB.prepare("SELECT version FROM brackets WHERE id=?").bind(id).first();
  const version=existing?.version||0;
  if(body.version!==version)return Response.json({error:"Another editor updated the bracket. Reload before saving.",version},{status:409});
  const result=await env.TRO_DB.prepare("INSERT INTO brackets (id,data,version,updated_by,updated_at) VALUES (?,?,1,?,datetime('now')) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=brackets.version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE brackets.version=?").bind(id,serialized,editor,version).run();
  if(!result.meta.changes)return Response.json({error:"Edit conflict. Reload and try again."},{status:409});
  return Response.json({ok:true,version:version+1,editor});
 }catch(e){return Response.json({error:"Database unavailable"},{status:503})}
}
