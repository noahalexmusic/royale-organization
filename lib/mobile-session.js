const ALLOWED = new Set(["contact@theroyaleorganization.com","rgstudiosoffical@gmail.com","charlottepasternak8@gmail.com"]);
export const allowed = email => ALLOWED.has(email);
export const now = () => Math.floor(Date.now()/1000);
export const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b=>b.toString(16).padStart(2,"0")).join("");
export async function hash(s) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,"0")).join(""); }
export async function challenge(s) { return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
export const json = (data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
export const bearer = request => /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("Authorization")||"")?.[1];
