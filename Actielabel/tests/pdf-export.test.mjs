import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
const source=await readFile('web/pdf.js','utf8');
const ctx=vm.createContext({TextEncoder,Blob,Response,CompressionStream,Uint8Array});
vm.runInContext(source+';globalThis.makePDF=createLabelPDF;',ctx);
function canvas(){return {width:2,height:1,getContext:()=>({getImageData:()=>({data:new Uint8Array([255,0,0,255,0,0,255,255])})})}}
async function* pages(){yield canvas();yield canvas()}
const bytes=Buffer.from(await (await ctx.makePDF(pages(),2)).arrayBuffer()),pdf=bytes.toString('latin1');
assert.match(pdf,/\/Count 2/);assert.equal((pdf.match(/\/MediaBox \[0 0 595.275591 841.889764\]/g)||[]).length,2);
const xref=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(xref,xref+4),'xref');
for(const match of pdf.matchAll(/(\d{10}) 00000 n/g)){const offset=Number(match[1]);assert.match(pdf.slice(offset),/^\d+ 0 obj/)}
const stream=pdf.indexOf('stream\n')+7,end=pdf.indexOf('\nendstream',stream);assert.deepEqual([...inflateSync(bytes.subarray(stream,end))],[255,0,0,0,0,255]);
console.log('PDF: twee exacte A4-pagina’s, geldige xref en verliesvrije beelddata gecontroleerd.');
