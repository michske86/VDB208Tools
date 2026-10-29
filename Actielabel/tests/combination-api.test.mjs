import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import app from '../worker/index.js';
const modal=await readFile(new URL('./fixtures/logitech-combination.html',import.meta.url),'utf8');
const product='<div class="js-gtm-main-product-container"><h1>Logitech MX MASTER 4 GRAPHITE</h1></div><p>Vanden Borre-code 7642865</p><div id="action"><div class="action-item"><div class="sticker sticker-action">Cashback Logitech</div><div>Ontvang tot 40 euro cashback bij aankoop van Logitech MX-toestellen</div><button data-modal-new=\'{"anchor":"special-action-8136","src":"//www.vandenborre.be/WEBV3/NL/Page289/LIB.WebRequest.cls?Detail=test"}\'></button></div></div>';
const realFetch=globalThis.fetch;let calls=[];
globalThis.fetch=async(url,options)=>{calls.push(String(url));return new Response(calls.length===1?product:modal,{headers:{'content-type':'text/html'}})};
try{let r=await app.fetch(new Request('https://example.test/api/cashback?'+new URLSearchParams({code:'7642865',url:'https://www.vandenborre.be/muis/mx-master-4-graphite'})));assert.equal(r.status,200);let data=await r.json();assert.equal(data.amounts['8136'],15);assert.equal(data.details['8136'].bundleAmount,40);assert.equal(calls.length,2);assert.equal(new URL(calls[1]).pathname,'/WEBV3/NL/Page289/LIB.WebRequest.cls');console.log('Combinatie-API haalt actievoorwaarden op en koppelt beide bedragen aan dezelfde actie.')}finally{globalThis.fetch=realFetch}
