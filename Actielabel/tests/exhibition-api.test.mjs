import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import app from '../worker/index.js';
const realFetch=globalThis.fetch,html=await readFile(new URL('./fixtures/exhibition.html',import.meta.url),'utf8');
let calls=[];
globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),options});if(calls.length===1)return new Response('<input class="js-accordion" id="accordion_9_8005_ORALB" data-call="//www.vandenborre.be/WEBV3/NL/Page278/LIB.WebRequest.cls?Detail=test"><label><strong>Oral-b</strong><span class="sticker">Cashback Oral-B</span>01.07.26 t.e.m. 30.06.27</label><script>var AJAX_STORELOCATOR_GET_MODAL = "//www.vandenborre.be/WEBV3/NL/Page389/LIB.WebRequest.cls?Id=5791";</script>',{headers:{'content-type':'text/html','set-cookie':'fixture-session=fixture-value; Path=/'}});return new Response(html,{headers:{'content-type':'text/html'}})};
try{
 let url='https://example.test/api/exhibition?'+new URLSearchParams({code:'7679793',url:'https://www.vandenborre.be/powerline-adapter/magic-1-wifi-mini-mesh-multiroom'});
 let r=await app.fetch(new Request(url));assert.equal(r.status,200);let data=await r.json();assert.equal(data.exhibited,true);assert.equal(data.shop,'208');assert.equal(data.code,'7679793');assert.equal(calls.length,2);
 assert.equal(calls[0].url,'https://www.vandenborre.be/actievoorwaarden','Winkelcontrole hergebruikt actiepagina, geen productpagina nodig');const modal=new URL(calls[1].url);assert.equal(modal.searchParams.get('productID'),'7679793');assert.equal(modal.searchParams.get('scope'),'2');assert.equal(modal.searchParams.get('postcode'),'3290 Diest');assert.match(calls[1].options.headers.Cookie,/fixture-session=fixture-value/);
 await app.fetch(new Request(url));assert.equal(calls.length,2,'Dezelfde code deelt de controle via de cache');
 r=await app.fetch(new Request(url+'&shop=210'));data=await r.json();assert.equal(data.shop,'210');assert.equal(data.exhibited,false);assert.equal(calls.length,3,'Ander filiaal krijgt een eigen controle');
 await app.fetch(new Request(url+'&shop=210'));assert.equal(calls.length,3,'Cache per filiaal');
 let shops=await (await app.fetch(new Request('https://example.test/api/shops'))).json();assert.deepEqual(shops.shops.map(s=>s.id),['208','210']);
 const count=calls.length;
 r=await app.fetch(new Request('https://example.test/api/exhibition?'+new URLSearchParams({code:'7679793',url:'https://example.org/private'})));assert.equal(r.status,400);assert.equal(calls.length,count,'Geen uitgaande aanvraag naar andere hosts');
 console.log('Winkel-API: productcode, filiaal, sessie, gedeelde cache en URL-validatie gecontroleerd.');
}finally{globalThis.fetch=realFetch}
