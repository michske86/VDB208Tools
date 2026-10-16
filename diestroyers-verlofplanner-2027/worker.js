const ADMIN_NUMBERS = new Set(['13313','17812']);
const HOLIDAYS = [ ['2027-01-01','Nieuwjaar'],['2027-03-29','Paasmaandag'],['2027-05-01','Dag van de Arbeid'],['2027-05-06','O.L.H. Hemelvaart'],['2027-05-17','Pinkstermaandag'],['2027-07-21','Nationale feestdag'],['2027-08-15','O.L.V. Hemelvaart'],['2027-11-01','Allerheiligen'],['2027-11-11','Wapenstilstand'],['2027-12-25','Kerstmis'] ];
function validDate(s){if(typeof s!=='string'||!/^2027-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s}
function charged(date,dayOff){if(!validDate(date))return false;const weekday=new Date(date+'T12:00:00Z').getUTCDay();return weekday!==0 && weekday!==dayOff && !HOLIDAYS.some(h=>h[0]===date)}
const enc = new TextEncoder();
function hex(a){return [...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function signature(secret,message){const key=await crypto.subtle.importKey('raw',enc.encode(secret),'HMAC',false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(message)))}
function constantEq(a,b){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin')||'',allowed=(env.ALLOWED_ORIGIN||'').split(',').map(x=>x.trim());
 const cors={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
 if(request.method==='OPTIONS')return new Response(null,{headers:cors});
 if(origin && !allowed.includes(origin))return reply({error:'Origin niet toegestaan'},403);
 const body=async()=>{try{return await request.json()}catch{return {}}};
 const admin=async()=>{const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');if(!token||!env.ADMIN_SESSION_SECRET)return false;const [number,expiry,sig,...extra]=token.split('.');if(extra.length||!ADMIN_NUMBERS.has(number)||!/^\d+$/.test(expiry)||Number(expiry)<Date.now())return false;return constantEq(sig||'',await signature(env.ADMIN_SESSION_SECRET,number+'.'+expiry))};
 try{
 const path=url.pathname;
 if(path==='/api/state'&&request.method==='GET'){
  const employees=(await env.DB.prepare('SELECT id,name,number,allowance,day_off FROM employees ORDER BY name').all()).results;
  const requests=(await env.DB.prepare('SELECT r.id,r.date,r.employee_id,e.name FROM requests r JOIN employees e ON e.id=r.employee_id ORDER BY r.date').all()).results;
  const periods=(await env.DB.prepare('SELECT * FROM periods ORDER BY start_date,title').all()).results;
  return reply({employees:employees.map(e=>({...e,charged:requests.filter(r=>r.employee_id===e.id&&charged(r.date,e.day_off)).length})),requests,periods,holidays:HOLIDAYS.map(([date,title])=>({date,title}))});
 }
 if(path==='/api/admin/login'&&request.method==='POST'){
  const {number,pin}=await body();const n=String(number||'').trim();
  if(!ADMIN_NUMBERS.has(n)||!env.ADMIN_PIN||!constantEq(String(pin||''),env.ADMIN_PIN))return reply({error:'Ongeldig beheerdersnummer of pincode'},401);
  if(!env.ADMIN_SESSION_SECRET)return reply({error:'Beheersessie niet geconfigureerd'},503);
  const expiry=String(Date.now()+2*60*60*1000),sig=await signature(env.ADMIN_SESSION_SECRET,n+'.'+expiry);
  return reply({token:n+'.'+expiry+'.'+sig});
 }
 if(path==='/api/request/bulk'&&request.method==='POST'){
  const {number,start_date,end_date}=await body();
  if(!validDate(start_date)||!validDate(end_date)||end_date<start_date)return reply({error:'Ongeldige aanvraagperiode'},400);
  const employee=await env.DB.prepare('SELECT id FROM employees WHERE number=?').bind(String(number||'').trim()).first();
  if(!employee)return reply({error:'Personeelsnummer niet gevonden'},404);
  const dates=[];for(let t=Date.parse(start_date+'T12:00:00Z'),last=Date.parse(end_date+'T12:00:00Z');t<=last;t+=86400000){dates.push(new Date(t).toISOString().slice(0,10));if(dates.length>366)return reply({error:'Periode te lang'},400)}
  const statements=dates.map(d=>env.DB.prepare('INSERT OR IGNORE INTO requests(employee_id,date) VALUES(?,?)').bind(employee.id,d));
  await env.DB.batch(statements);return reply({ok:true,days:dates.length});
 }
 if(path==='/api/request'&&request.method==='POST'){
  const {number,date}=await body();if(!validDate(date))return reply({error:'Ongeldige datum'},400);
  const e=await env.DB.prepare('SELECT id FROM employees WHERE number=?').bind(String(number||'').trim()).first();if(!e)return reply({error:'Personeelsnummer niet gevonden'},404);
  await env.DB.prepare('INSERT OR IGNORE INTO requests(employee_id,date) VALUES (?,?)').bind(e.id,date).run();return reply({ok:true});
 }
 if(path==='/api/my-requests'&&request.method==='POST'){
  const {number}=await body(),e=await env.DB.prepare('SELECT id,name,allowance,day_off FROM employees WHERE number=?').bind(String(number||'').trim()).first();if(!e)return reply({error:'Personeelsnummer niet gevonden'},404);
  const mine=(await env.DB.prepare('SELECT id,date FROM requests WHERE employee_id=? ORDER BY date').bind(e.id).all()).results;
  return reply({employee:e,requests:mine,charged:mine.filter(r=>charged(r.date,e.day_off)).length});
 }
 if(path==='/api/request/cancel'&&request.method==='POST'){
  const {number,date}=await body();if(!validDate(date))return reply({error:'Ongeldige datum'},400);
  const e=await env.DB.prepare('SELECT id FROM employees WHERE number=?').bind(String(number||'').trim()).first();if(!e)return reply({error:'Personeelsnummer niet gevonden'},404);
  await env.DB.prepare('DELETE FROM requests WHERE employee_id=? AND date=?').bind(e.id,date).run();return reply({ok:true});
 }
 if(path.startsWith('/api/admin/')){
  if(!await admin())return reply({error:'Beheerderssessie verlopen of geen toegang'},403);
  if(path==='/api/admin/employee/delete'&&request.method==='POST'){
   const {number}=await body();const n=String(number||'').trim();
   if(ADMIN_NUMBERS.has(n))return reply({error:'Beheerders kunnen niet via deze functie worden verwijderd'},400);
   const e=await env.DB.prepare('SELECT id FROM employees WHERE number=?').bind(n).first();if(!e)return reply({error:'Medewerker niet gevonden'},404);
   await env.DB.batch([env.DB.prepare('DELETE FROM requests WHERE employee_id=?').bind(e.id),env.DB.prepare('DELETE FROM employees WHERE id=?').bind(e.id)]);return reply({ok:true});
  }
  if(path==='/api/admin/employee'&&request.method==='POST'){
   const {name,number,allowance,day_off,original_number}=await body();const n=String(number||'').trim(),nm=String(name||'').trim();
   if(!nm||!/^\d{1,15}$/.test(n)||!Number.isInteger(allowance)||allowance<0||allowance>365||!Number.isInteger(day_off)||day_off< -1||day_off>6)return reply({error:'Ongeldige medewerkergegevens'},400);
   if(original_number && String(original_number)!==n){
    const old=await env.DB.prepare('SELECT id FROM employees WHERE number=?').bind(String(original_number)).first();if(!old)return reply({error:'Oorspronkelijke medewerker niet gevonden'},404);
    await env.DB.prepare('UPDATE employees SET name=?,number=?,allowance=?,day_off=? WHERE id=?').bind(nm,n,allowance,day_off,old.id).run();
   }else await env.DB.prepare('INSERT INTO employees(name,number,allowance,day_off) VALUES(?,?,?,?) ON CONFLICT(number) DO UPDATE SET name=excluded.name,allowance=excluded.allowance,day_off=excluded.day_off').bind(nm,n,allowance,day_off).run();return reply({ok:true});
  }
  if(path==='/api/admin/period'&&request.method==='POST'){
   const {id,title,start_date,end_date,kind}=await body();if(!String(title||'').trim()||!validDate(start_date)||!validDate(end_date)||end_date<start_date||!['Schoolvakantie','Solden','Zondagsopening','Overig'].includes(kind))return reply({error:'Ongeldige periode'},400);
   if(id){await env.DB.prepare('UPDATE periods SET title=?,start_date=?,end_date=?,kind=? WHERE id=?').bind(title.trim(),start_date,end_date,kind,Number(id)).run()}
   else{await env.DB.prepare('INSERT INTO periods(title,start_date,end_date,kind) VALUES(?,?,?,?)').bind(title.trim(),start_date,end_date,kind).run()}
   return reply({ok:true});
  }
  if(path.startsWith('/api/admin/period/')&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM periods WHERE id=?').bind(Number(path.split('/').pop())).run();return reply({ok:true})}
  if(path.startsWith('/api/admin/request/')&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM requests WHERE id=?').bind(Number(path.split('/').pop())).run();return reply({ok:true})}
 }
 return reply({error:'Niet gevonden'},404);
 }catch(e){return reply({error:'Serverfout. Controleer database/migratie.'},500)}
}};
