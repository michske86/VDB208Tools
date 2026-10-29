import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import app from '../worker/index.js';
const html=await readFile(new URL('./fixtures/exhibition.html',import.meta.url),'utf8');const catalog='<input class="js-accordion" id="accordion_9_8005_ORALB" data-call="//www.vandenborre.be/WEBV3/NL/Page278/LIB.WebRequest.cls?Detail=test"><label><strong>Oral-b</strong><span class="sticker">Cashback Oral-B</span>01.07.26 t.e.m. 30.06.27</label><script>var AJAX_STORELOCATOR_GET_MODAL = "//www.vandenborre.be/WEBV3/NL/Page389/LIB.WebRequest.cls?Id=5791";</script>';
let realFetch=globalThis.fetch,sourceCalls=0;globalThis.fetch=async url=>{if(String(url).endsWith('/actievoorwaarden')){sourceCalls++;await Promise.resolve();return new Response(catalog)}return new Response(html)};
try{let req=code=>new Request('https://example.test/api/exhibition?'+new URLSearchParams({code,url:'https://www.vandenborre.be/muis/model'}));let replies=await Promise.all([app.fetch(req('1234567')),app.fetch(req('1234568'))]);assert.equal(replies[0].status,200);assert.equal(sourceCalls,1,'Parallelle controles delen één bron-sessie');}finally{globalThis.fetch=realFetch}
console.log('Parallelle winkelcontroles delen één actiesessie.');
