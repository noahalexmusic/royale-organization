(async function(){
"use strict";
const grid=document.querySelector(".clan-showcase-grid");
const status=document.getElementById("clans-live-status");
if(!grid||!status)return;
const originals=new Map(Array.from(grid.querySelectorAll("[data-clan]")).map(el=>[el.dataset.clan,el]));
const template=originals.get("crownbound")?.cloneNode(true);
try{
 const response=await fetch("/api/partnered-clans",{cache:"no-store"});
 if(!response.ok)throw Error("Directory unavailable");
 const {clans}=await response.json();
 if(!Array.isArray(clans))throw Error("Invalid directory");
 const order=[...originals.keys()];
 clans.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):999)-(order.includes(b.id)?order.indexOf(b.id):999));
 const cards=[];
 for(const c of clans){
  const existing=originals.get(c.id);
  const card=existing||template.cloneNode(true);
  card.dataset.clan=c.id;
  if(!existing){card.className="clan-showcase";card.removeAttribute("style");card.querySelector(".label").textContent="Partner clan";}
  card.querySelector("h3").textContent=c.name;
  card.querySelector(".clan-tag").textContent="#"+c.clan_tag;
  card.querySelector(":scope > p").textContent=c.description||"Part of The Royale Organization.";
  if(/^#[0-9a-f]{6}$/i.test(c.theme_color)){card.style.setProperty("--clan-accent",c.theme_color);card.style.borderColor=c.theme_color;}
  const leader=card.querySelector(".clan-leader-line strong");leader.textContent=c.leader||"Loading...";leader.dataset.clanField="leader";
  const links=card.querySelectorAll(".clan-showcase-actions a");
  const profile=c.profile_url||"";
  if(/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(profile)||/^https:\/\//i.test(profile)){links[0].href=profile;links[0].hidden=false;}else{links[0].hidden=true;links[0].style.display="none";}
  links[1].href="https://link.clashroyale.com/en?action=OpenClanProfile&tag="+encodeURIComponent("#"+c.clan_tag);
  cards.push({card,c});
 }
 grid.replaceChildren(...cards.map(x=>x.card));
 const eyebrow=document.querySelector(".clans-hero .eyebrow");if(eyebrow)eyebrow.textContent=clans.length+" clans • one organization";
 if(!cards.length){status.textContent="No active partner clans.";return;}
 const results=await Promise.all(cards.map(async ({card,c})=>{
 try{
 const r=await fetch("/api/clan?tag="+encodeURIComponent(c.clan_tag));if(!r.ok)return false;
 const d=await r.json();const fmt=n=>typeof n==="number"?n.toLocaleString("en-US"):"—";
 const values={members:fmt(d.members),score:fmt(d.clanScore),war:fmt(d.clanWarTrophies),required:fmt(d.requiredTrophies),type:({open:"Open",inviteOnly:"Invite only",closed:"Closed"})[d.type]||"—",leader:d.memberList?.find(m=>m.role==="leader")?.name||c.leader||"—"};
 for(const [k,v] of Object.entries(values)){const e=card.querySelector('[data-clan-field="'+k+'"]');if(e)e.textContent=v;}
 return true;
 }catch{return false;}
 }));
 status.textContent=results.every(Boolean)?"Live Clash Royale statistics loaded successfully.":"Some clan statistics are temporarily unavailable.";
}catch{grid.replaceChildren();status.textContent="Clan directory temporarily unavailable. Please refresh shortly.";}
})();