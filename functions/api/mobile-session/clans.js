import {allowed,hash,now,json,bearer} from "../../../lib/mobile-session.js";
async function authenticate(request,env){
 const token=bearer(request);if(!token)return null;
 const row=await env.TRO_MOBILE_DB.prepare("SELECT email,role FROM mobile_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?").bind(await hash(token),now()).first();
 return row&&allowed(row.email)&&row.role==="administrator"?row.email:null;
}
async function handle({request,env}){
 if(!env.TRO_CLAN_DB||!env.TRO_MOBILE_DB)return json({error:"Database not configured"},503);
 try{
 const editor=await authenticate(request,env);
 if(!editor)return json({error:"Not authorized"},401);
 const db=env.TRO_CLAN_DB;
 if(request.method==="GET"){
 const rows=await db.prepare("SELECT * FROM partnered_clans ORDER BY name").all();
 return json({clans:rows.results});
 }
 let b;try{b=await request.json()}catch{return json({error:"Invalid JSON"},400)}
 if(!b||typeof b!=="object")return json({error:"Invalid data"},400);
 const id=typeof b.id==="string"?b.id.trim().toLowerCase():"";
 const tag=typeof b.clan_tag==="string"?b.clan_tag.trim().replace(/^#/,"").toUpperCase():"";
 const name=typeof b.name==="string"?b.name.trim():"";
 const status=b.status;
 if(!/^[a-z0-9-]{1,80}$/.test(id)||!/^[0289PYLQGRJCUV]{3,20}$/.test(tag)||!name||name.length>100||!["active","trial","suspended","inactive"].includes(status))return json({error:"Invalid clan fields"},400);
 const v=(key,max)=>typeof b[key]==="string"?b[key].trim().slice(0,max):"";
 const color=v("theme_color",7)||"#D4AF37";
 if(!/^#[0-9a-f]{6}$/i.test(color))return json({error:"Invalid theme color"},400);
 const profile=v("profile_url",500);
 if(profile&&!/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(profile)&&!/^https:\/\//i.test(profile))return json({error:"Invalid profile URL"},400);
 const fields=[tag,name,v("leader",100),v("description",2000),status,color,profile,v("partnership_date",10)||null,v("admin_notes",4000),editor];
 if(b.action==="create"){
 const r=await db.prepare("INSERT OR IGNORE INTO partnered_clans (clan_tag,name,leader,description,status,theme_color,profile_url,partnership_date,admin_notes,updated_by,id) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(...fields,id).run();
 if(!r.meta.changes)return json({error:"Clan ID or tag already exists"},409);
 return json({ok:true,version:1},201);
 }
 if(b.action!=="update"||!Number.isSafeInteger(b.version)||b.version<1)return json({error:"Invalid action or version"},400);
 const duplicate=await db.prepare("SELECT id FROM partnered_clans WHERE clan_tag=? AND id<>?").bind(tag,id).first();
 if(duplicate)return json({error:"Clan tag already exists"},409);
 const r=await db.prepare("UPDATE partnered_clans SET clan_tag=?,name=?,leader=?,description=?,status=?,theme_color=?,profile_url=?,partnership_date=?,admin_notes=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(...fields,id,b.version).run();
 if(!r.meta.changes)return json({error:"Clan missing or changed by another administrator. Refresh first."},409);
 return json({ok:true,version:b.version+1});
 }catch{return json({error:"Clan database unavailable"},503)}
}
export const onRequestGet=handle;
export const onRequestPost=handle;
