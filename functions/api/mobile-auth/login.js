import {onRequestGet as verify} from "./session.js";
import {random,hash,now,json} from "../../../lib/mobile-session.js";
export async function onRequestGet({request,env}) {
 try {
  const url=new URL(request.url), challenge=url.searchParams.get("code_challenge"), state=url.searchParams.get("state");
  if(!/^[A-Za-z0-9_-]{43}$/.test(challenge||"")||!/^[A-Za-z0-9_-]{32,128}$/.test(state||""))return json({error:"Invalid login request"},400);
  const result=await verify({request,env});
  if(!result.ok)return result;
  const {email}=await result.json();
  const code=random(), t=now();
  await env.TRO_MOBILE_DB.prepare("INSERT INTO mobile_auth_codes (code_hash,email,code_challenge,created_at,expires_at) VALUES (?,?,?,?,?)").bind(await hash(code),email,challenge,t,t+120).run();
  const target="theroyaleorganizationapp://more/admin?code="+code+"&state="+encodeURIComponent(state);
  return new Response(null,{status:302,headers:{Location:target,"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }catch{return json({error:"Login unavailable"},503);}
}
