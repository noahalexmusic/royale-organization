// Clan leader Player of the Week nominations.
// Submissions are private, pending leadership verification and review.
// A submitted leader name is NOT proof of authorization.
const CLANS = new Set(["Crownbound","Mojo's Dojo","MK Best Win Con","Jordan First"]);
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const clean=(v,max)=>typeof v==="string"?v.trim().slice(0,max+1):"";
export async function onRequestPost({request,env}){
 if(!env.DB)return reply({success:false,message:"Nominations are not configured yet."},503);
 if(!(request.headers.get("content-type")||"").includes("application/json"))return reply({success:false,message:"Invalid request."},415);
 let d;try{const raw=await request.text();if(raw.length>5000)return reply({success:false,message:"Submission too long."},413);d=JSON.parse(raw);}catch{return reply({success:false,message:"Invalid submission."},400);}
 if(!d||typeof d!=="object"||Array.isArray(d)||d.website)return reply({success:false,message:"Invalid submission."},400);
 const leader=clean(d.leader,80),contact=clean(d.contact,100),clan=clean(d.clan,50),player=clean(d.player,80),tag=clean(d.tag,20).replace(/^#/,"").toUpperCase().replace(/O/g,"0"),reason=clean(d.reason,1500);
 if(leader.length<2||leader.length>80||contact.length<3||contact.length>100||!CLANS.has(clan)||player.length<2||player.length>80||!(/^[0289CGJLPQRUVY]{3,15}$/.test(tag))||reason.length<30||reason.length>1500)return reply({success:false,message:"Please complete all fields with valid information (reason: at least 30 characters)."},400);
 try{
 await env.DB.prepare("CREATE TABLE IF NOT EXISTS player_week_nominations (id INTEGER PRIMARY KEY AUTOINCREMENT, submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, leader TEXT NOT NULL, contact TEXT NOT NULL, clan TEXT NOT NULL, player TEXT NOT NULL, player_tag TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending_verification')").run();
 await env.DB.prepare("INSERT INTO player_week_nominations (leader,contact,clan,player,player_tag,reason) VALUES (?,?,?,?,?,?)").bind(leader,contact,clan,player,"#"+tag,reason).run();
 return reply({success:true,message:"Nomination received. TRO leadership will verify the nominator and review the submission."});
 }catch(e){console.error("Nomination storage failed",e);return reply({success:false,message:"Could not save the nomination. Please try again later."},503);}
}
