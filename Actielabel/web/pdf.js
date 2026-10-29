/* PDF export: rasterize the existing label layout at 300 dpi, without a print dialog. */
async function pdfImageBytes(canvas){
 const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 const rgb=new Uint8Array(canvas.width*canvas.height*3);
 for(let i=0,j=0;i<rgba.length;i+=4){const a=rgba[i+3]/255;for(let c=0;c<3;c++)rgb[j++]=Math.round(rgba[i+c]*a+255*(1-a));}
 const stream=new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function createLabelPDF(canvases,pageCount){
 const enc=new TextEncoder(),chunks=[],offsets=[0];let position=0;
 const put=value=>{const bytes=typeof value==='string'?enc.encode(value):value;chunks.push(bytes);position+=bytes.length};
 const object=(id,content)=>{offsets[id]=position;put(id+' 0 obj\n');put(content);put('\nendobj\n')};
 const streamObject=(id,dict,bytes)=>{offsets[id]=position;put(id+' 0 obj\n<< '+dict+' /Length '+bytes.length+' >>\nstream\n');put(bytes);put('\nendstream\nendobj\n')};
 put('%PDF-1.4\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 const pages=Array.from({length:pageCount},(_,i)=>3+i*3);object(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map(id=>id+' 0 R').join(' ')+'] >>');
 let i=0;for await(const canvas of canvases){
  const id=pages[i++],data=await pdfImageBytes(canvas);
  object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.275591 841.889764] /Resources << /XObject << /Sheet '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
  streamObject(id+1,'/Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode',data);
  streamObject(id+2,'',enc.encode('q\n595.275591 0 0 841.889764 0 0 cm\n/Sheet Do\nQ'));
  canvas.width=1;canvas.height=1;
 }
 const start=position,count=3+pages.length*3;put('xref\n0 '+count+'\n0000000000 65535 f \n');
 for(let i=1;i<count;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 put('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');return new Blob(chunks,{type:'application/pdf'});
}
async function pdfInlineImages(sheet){
 for(const img of sheet.querySelectorAll('img')){
  img.removeAttribute('onerror');img.onerror=null;img.removeAttribute('loading');
  if(!img.src.startsWith('data:')){
   const url=new URL(img.src,location.href);let sources=[url.href];
   if(['www.vandenborre.be','image.vandenborre.be'].includes(url.hostname)&&url.pathname.startsWith('/WEB/images/products/')){
    sources=['/api/image?'+new URLSearchParams({path:url.pathname})];
    if(img.dataset.fallback)sources.push('/api/image?'+new URLSearchParams({path:new URL(img.dataset.fallback).pathname}));
   }
   let blob;for(const src of sources){try{const r=await fetch(src,{signal:AbortSignal.timeout(20000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error();blob=await r.blob();break}catch{}}
   if(!blob)throw Error('Een productafbeelding kon niet worden opgehaald. Probeer opnieuw.');
   img.src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
  }
  await img.decode();
 }
}
async function exportLabelsPDF(){
 const button=document.querySelector('#printNow');if(button.disabled)return;const sheets=[...document.querySelectorAll('#previewSheets .sheet')];if(!sheets.length)return;
 document.querySelector('#pdfError')?.remove();button.disabled=true;const original=button.textContent;let holder;
 try{
  if(!window.htmlToImage||!window.CompressionStream)throw Error('PDF-export vereist een recente versie van Chrome of Edge.');
  await document.fonts.ready;
  async function* renderPages(){for(let i=0;i<sheets.length;i++){
   button.textContent='PDF maken… '+(i+1)+' / '+sheets.length;
   holder=document.createElement('div');holder.style.cssText='position:fixed;left:-20000px;top:0;pointer-events:none;background:white;';
   const sheet=sheets[i].cloneNode(true);sheet.style.margin='0';sheet.style.transform='none';holder.append(sheet);document.body.append(holder);
   await pdfInlineImages(sheet);
   // ForeignObject preserves the actual CSS curve, wrapping and all promotion variants.
   const canvas=await htmlToImage.toCanvas(sheet,{pixelRatio:300/96,backgroundColor:'#ffffff',skipFonts:true,cacheBust:false});
   holder.remove();holder=null;yield canvas;
  }}
  const blob=await createLabelPDF(renderPages(),sheets.length),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Actielabels-'+new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Brussels'})+'.pdf';const previous=document.querySelector('#pdfDownload');if(previous){URL.revokeObjectURL(previous.href);previous.remove()}link.id='pdfDownload';link.textContent='Download PDF';link.style.marginLeft='12px';button.parentElement.append(link);link.click();
 }catch(e){const error=document.createElement('p');error.id='pdfError';error.setAttribute('role','alert');error.textContent=e.message||'PDF maken mislukt. Probeer opnieuw.';button.parentElement.append(error)}finally{holder?.remove();button.disabled=false;button.textContent=original}
}
