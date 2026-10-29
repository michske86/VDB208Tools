const ORIGIN='https://www.vandenborre.be';
const decode=s=>s.replace(/&(?:amp|quot|apos|lt|gt|nbsp|euro);|&#(?:x[0-9a-f]+|\d+);/gi,x=>{const m={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' ','&euro;':'€'};return m[x.toLowerCase()]??String.fromCodePoint(x[2].toLowerCase()==='x'?parseInt(x.slice(3),16):parseInt(x.slice(2),10))});
const text=s=>decode((s||'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const attr=(s,k)=>decode(s.match(new RegExp('\\b'+k+'=(["\\\'])([\\s\\S]*?)\\1','i'))?.[2]||'');
const dateISO=s=>{let [d,m,y]=s.split(/[./]/);return `${y.length===2?'20'+y:y}-${m}-${d}`};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function choiceGift(title){if(!/cashback/i.test(title)||!/\bof\b/i.test(title))return null;let parts=title.split(/\s+of\s+/i),gift=parts.find(p=>!/cashback/i.test(p));if(!gift)return null;gift=gift.replace(/^ontvang\s+/i,'').replace(/^(?:een|het|de)\s+/i,'').trim();if(!gift)return null;return /cadeau|geschenk/i.test(gift)?gift:gift+' cadeau';}
function actionType(title,description=''){return choiceGift(title)?'choice':/cashback|terugbetaa/i.test(title+' '+description)?'cashback':'gift';}

function promotionDetails(title,description=''){
 const percent=Number(title.match(/(\d+(?:[.,]\d+)?)\s*%\s*cashback/i)?.[1]?.replace(',','.'))||null;
 const extra=title.match(/cashback\s*\+\s*(.+)$/i)?.[1]?.trim();
 if(extra)return {type:'extra',extraBenefit:extra,percent,complete:extra.length<=90&&!/\b(?:of|mits|indien)\b/i.test(extra)};
 const clauses=[...description.matchAll(/\bKoop\s+(.+?)\s+en\s+ontvang\s+(?:€\s*)?([\d.,]+)\s*(?:euro\s*)?cashback/gi)];
 if(clauses.length===2){let base=clauses.find(m=>!/samen met/i.test(m[1])),bundle=clauses.find(m=>/samen met een ander/i.test(m[1]));if(base&&bundle){let product=base[1].replace(/^(?:een|één|&eacute;&eacute;n)\s+/i,'').trim(),target=bundle[1].match(/samen met een ander\s+(.+?),?\s+dat deel uitmaakt van deze actie/i)?.[1]?.replace(/,$/,'').trim(),bundleProduct=bundle[1].split(/\s+samen met/i)[0].replace(/^(?:een|één|&eacute;&eacute;n)\s+/i,'').trim();if(target&&product.toLowerCase()===bundleProduct.toLowerCase()){let amount=Number(base[2].replace(',','.')),bundleAmount=Number(bundle[2].replace(',','.'));if(amount>0&&bundleAmount>amount)return {type:'tiered',amount,bundleAmount,baseCondition:'bij aankoop van dit toestel',bundleCondition:'samen met een ander deelnemend '+target,complete:true};}}}
 if(/\bsamen met\b/i.test(title+' '+description))return {type:'tiered',complete:false};
 return {type:actionType(title,description),percent,complete:true,requiresConditions:/\btot\s+(?:€\s*)?\d+[.,]?\d*\s*(?:euro|€)?\s*cashback/i.test(title+' '+description)};
}
function parseCatalog(html){
 const result=[];let rx=/<input\b[^>]*class="[^"]*js-accordion[^"\n]*"[^>]*>/g,match;
 while((match=rx.exec(html))){let input=match[0],id=attr(input,'id'),parts=id.split('_');if(parts.length<4)continue;let next=html.indexOf('<input',rx.lastIndex),section=html.slice(rx.lastIndex,next<0?html.length:next);let dates=section.match(/(\d{2}\.\d{2}\.\d{2,4})\s*t\.e\.m\.\s*(\d{2}\.\d{2}\.\d{2,4})/);if(!dates||/Actie afgelopen/i.test(section))continue;let start=dateISO(dates[1]),end=dateISO(dates[2]);if(end<today())continue;let title=text(section.match(/class="sticker[^"\n]*"[^>]*>([\s\S]*?)<\/span>/)?.[1]);let desc=text(section.match(/class="[^"]*cashback-info[^"]*"[^>]*>[\s\S]*?<\/span>\s*<div[^>]*>([\s\S]*?)<\/div>/)?.[1]);let brand=text(section.match(/<strong>([\s\S]*?)<\/strong>/)?.[1]);let call=attr(input,'data-call');let u=new URL(call,ORIGIN);if(u.hostname!=='www.vandenborre.be'||u.pathname!=='/WEBV3/NL/Page278/LIB.WebRequest.cls')throw Error('Onverwachte actie-link in de bron');result.push({id:parts.slice(1).join('_'),promoId:parts[2],sourceId:id,brand,title,description:desc,category:attr(input,'data-univers'),start,end,call:u.href,type:actionType(title,desc),giftChoice:choiceGift(title)});
 }
 if(!result.length)throw Error('Geen lopende acties herkend. De bron is mogelijk gewijzigd.');let ids=result.map(a=>a.id);if(new Set(ids).size!==ids.length)throw Error('Dubbele actie-identiteit in de bron.');return result;
}
function parseProducts(html,action){let chunks=html.split(/<div\b[^>]*class="cashback-product[^"\n]*"[^>]*>/).slice(1);if(!chunks.length)throw Error('De toestellenlijst is leeg of niet volledig geladen.');return chunks.map(c=>{let img=c.match(/<img\b[^>]*>/)?.[0]||'',code=attr(img,'alt');let name=text(c.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1]),path=attr(img,'src'),link=attr(c.match(/<a\b[^>]*>/)?.[0]||'','href');let reduction=text(c.match(/class="reduction"[^>]*>([\s\S]*?)<\/span>/)?.[1]);let m=reduction.match(/€\s*([\d.,]+)/);let amount=m?Number(m[1].replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.')):null;if(!/^\d{5,10}$/.test(code)||!name||!link)throw Error('Een toestel mist een geldige VDB-code of productlink.');let u=new URL(link,ORIGIN);if(u.hostname!=='www.vandenborre.be')throw Error('Onverwachte productlink');return {key:action.promoId+':'+code,action:action.promoId,code,name,amount,benefit:action.type==='cashback'&&amount!==null?'€'+amount+' CASHBACK':action.title,title:action.title,description:action.description,type:action.type,giftChoice:action.giftChoice||null,brand:action.brand,category:action.category,start:action.start,end:action.end,url:u.href,imagePath:path.startsWith('/WEB/images/products/')?path:null,source:'live',checkedAt:new Date().toISOString(),reduction};});}
function divSection(html,marker){let at=html.indexOf(marker);if(at<0)return '';let start=html.lastIndexOf('<div',at),rx=/<\/?div\b[^>]*>/g;rx.lastIndex=start;let depth=0,m;while((m=rx.exec(html))){depth+=m[0].startsWith('</')?-1:1;if(depth===0)return html.slice(start,rx.lastIndex)}return '';}
function explicitChoiceAmount(value){
 if(/\b(?:tot|maximaal|vanaf|tot maximaal)\b/i.test(value))return null;
 let matches=[...value.matchAll(/\bcashback\s+(?:van\s+)?(?:€\s*([\d.,]+)|([\d.,]+)\s*(?:euro|€))|(?:€\s*([\d.,]+)|([\d.,]+)\s*euro)\s+cashback\b/gi)];
 let amounts=[...new Set(matches.map(m=>Number((m[1]||m[2]||m[3]||m[4]).replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'))))];
 return amounts.length===1&&amounts[0]>0?amounts[0]:null;
}
function parseProductCashback(html,code,modalHTML=''){
 html=html.replace(/<!--[\s\S]*?-->/g,'');
 const spec=text(html).match(/Vanden Borre-code\s+(\d{5,10})/i);
 if(!spec||spec[1]!==code)throw Error('De VDB-code op de productpagina komt niet overeen.');
 const main=divSection(html,'js-gtm-main-product-container');if(!main)throw Error('Het hoofdtoestel is niet herkenbaar op de productpagina.');
 const offers=[];for(let m of main.matchAll(/<span\b[^>]*class="[^"\n]*help-tooltip[^"\n]*"[^>]*>([\s\S]*?)<\/span>/g)){let line=text(m[1]),n=line.match(/^([^:]*cashback[^:]*):\s*€\s*([\d.,]+)/i);if(n){let amount=Number(n[2].replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));if(Number.isFinite(amount)&&amount>=0&&!offers.some(o=>o.title===n[1]&&o.amount===amount))offers.push({title:n[1],amount});}}
 const actionArea=divSection(html,'id="action"'),actions=[];for(let block of actionArea.split(/<div class="action-item">/).slice(1)){let title=text(block.match(/class="sticker[^"\n]*"[^>]*>([\s\S]*?)<\/div>/)?.[1]),id=block.match(/special-action-(\d+)/)?.[1];if(id&&/cashback/i.test(title)&&!actions.some(a=>a.id===id))actions.push({id,title,block});}
 const normalize=t=>t.toLowerCase().replace(/[^a-z0-9]/g,'');const amounts={},choices={},details={};
 for(let a of actions){let matching=offers.filter(o=>normalize(o.title)===normalize(a.title));let sameTitle=actions.filter(b=>normalize(b.title)===normalize(a.title));if(matching.length===1&&sameTitle.length===1)amounts[a.id]=matching[0].amount;else if(actions.length===1&&offers.length===1)amounts[a.id]=offers[0].amount;let modal=divSection(modalHTML,'id="special-action-'+a.id+'"'),description=text(modal||a.block),detail=promotionDetails(a.title,description);details[a.id]=detail;if(detail.type==='tiered'){if(detail.complete)amounts[a.id]=detail.amount;else delete amounts[a.id]}let gift=choiceGift(a.title);if(gift){choices[a.id]={giftChoice:gift,title:a.title};let explicit=explicitChoiceAmount(a.title+' '+description);if(explicit!==null){if(amounts[a.id]!==undefined&&amounts[a.id]!==explicit){delete amounts[a.id];details[a.id].complete=false}else amounts[a.id]=explicit}}}
 return {amounts,choices,details,reason:Object.keys(amounts).length?'':'Geen eenduidig cashbackbedrag voor deze actie op de productpagina.'};
}
const cashbackMemory=new Map();
async function productCashback(code,url){let cached=cashbackMemory.get(code);if(cached&&Date.now()-cached.time<600000)return cached.result;let page=await upstream(url),parsed=parseProductCashback(page.html,code);let modalHTML='';
 const area=divSection(page.html,'id="action"'),requests=new Set();
 for(let button of area.matchAll(/<button\b[^>]*>/g)){try{let data=JSON.parse(attr(button[0],'data-modal-new')),id=data.anchor?.match(/^special-action-(\d+)$/)?.[1];if(!id||!(parsed.details[id]?.type==='tiered'||(parsed.details[id]?.type==='choice'||parsed.details[id]?.requiresConditions)&&parsed.amounts[id]===undefined))continue;let u=new URL(data.src,ORIGIN);if(u.origin===ORIGIN&&u.pathname==='/WEBV3/NL/Page289/LIB.WebRequest.cls')requests.add(u.href)}catch{}}
 for(let link of [...requests].slice(0,4)){try{modalHTML+=(await upstream(link,{cookie:cookieHeader(page.headers),ajax:true})).html}catch{/* Onbevestigde voorwaarden blijven ter controle. */}}
 if(modalHTML)parsed=parseProductCashback(page.html,code,modalHTML);
 let result={code,...parsed,checkedAt:new Date().toISOString()};if(Object.keys(parsed.amounts).length){cashbackMemory.set(code,{time:Date.now(),result});if(cashbackMemory.size>2000)cashbackMemory.delete(cashbackMemory.keys().next().value)}return result;}

function parseExhibition(html,shop='208'){
 const rows=html.split(/<div\b[^>]*class="[^"\n]*\bjs-store-line\b[^"\n]*"[^>]*>/).slice(1);
 if(!rows.length)throw Error('Geen winkelregels herkend in het bronantwoord.');
 const row=rows.find(r=>Number(attr(r.match(/<[^>]*\bdata-shopid=[^>]+>/)?.[0]||'','data-shopid'))===Number(shop));
 if(!row)return {exhibited:null,reason:'Winkel niet teruggevonden in de winkellijst.'};
 const desktop=row.match(/class="[^"\n]*\bcol-exposed\b[^"\n]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
 const mobile=row.match(/class="[^"\n]*\bavailability_mobile\b[^"\n]*"[^>]*>([\s\S]*?)<\/span>/)?.[1];
 if([desktop,mobile].some(x=>x&&/class="[^"\n]*\bicon-check\b/.test(x)))return {exhibited:true};
 if([desktop,mobile].some(x=>x&&(/\bicon-(?:cross|close|times|minus)\b/.test(x)||/niet tentoongesteld/i.test(text(x)))))return {exhibited:false};
 if(desktop!==undefined&&text(desktop)===''&&!/<i\b/i.test(desktop))return {exhibited:false};
 return {exhibited:null,reason:'De tentoonstellingsstatus is niet eenduidig.'};
}
function cookieHeader(headers){const set=headers.getSetCookie?.()||headers.getAll?.('Set-Cookie')||[headers.get('set-cookie')].filter(Boolean);return set.map(s=>s.split(';')[0]).join('; ')}
const exhibitionMemory=new Map();
async function exhibition(code,url,shop='208'){
 const cacheKey=shop+':'+code;
 let saved=exhibitionMemory.get(cacheKey);if(saved&&Date.now()-saved.time<600000)return saved.result;
 let session=await catalog();if(!session.storeCall)throw Error('De winkelbron ontbreekt op de actiepagina.');
 let endpoint=new URL(session.storeCall,ORIGIN);if(endpoint.origin!==ORIGIN||endpoint.pathname!=='/WEBV3/NL/Page389/LIB.WebRequest.cls')throw Error('Onverwachte winkelbron.');
 endpoint.searchParams.set('scope','2');endpoint.searchParams.set('productID',code);endpoint.searchParams.set('postcode','3290 Diest');
 let shops=await upstream(endpoint.href,{cookie:session.cookie,ajax:true}),parsed=parseExhibition(shops.html,shop);
 let result={code,shop,...parsed,checkedAt:new Date().toISOString()};
 if(parsed.exhibited!==null){exhibitionMemory.set(cacheKey,{time:Date.now(),result});if(exhibitionMemory.size>2000)exhibitionMemory.delete(exhibitionMemory.keys().next().value)}
 return result;
}
let catalogMemory=null;
async function upstream(url,{cookie='',ajax=false}={}){const headers={'Accept':'text/html','Referer':ORIGIN+'/actievoorwaarden'};if(cookie)headers.Cookie=cookie;if(ajax)headers['X-Requested-With']='XMLHttpRequest';let r=await fetch(url,{headers,signal:AbortSignal.timeout(25000),redirect:'follow'});if(!r.ok)throw Error('Vanden Borre geeft HTTP '+r.status);let bytes=await r.arrayBuffer();if(bytes.byteLength>3000000)throw Error('Bronantwoord onverwacht groot');let charset=r.headers.get('content-type')||'';let html=new TextDecoder(/iso-8859|windows-1252/i.test(charset)?'windows-1252':'utf-8').decode(bytes);if(/verify you are human|checking your browser|access denied|captcha/i.test(text(html).slice(0,700)))throw Error('De bron vraagt een browsercontrole; live uitlezen is nu niet mogelijk.');return {html,headers:r.headers}}
async function fetchCatalog(){let r=await upstream(ORIGIN+'/actievoorwaarden');let set=r.headers.getSetCookie?.()||r.headers.getAll?.('Set-Cookie')||[r.headers.get('set-cookie')].filter(Boolean);let cookie=set.map(s=>s.split(';')[0]).join('; ');let actions=parseCatalog(r.html);let storeCall=decode(r.html.match(/var AJAX_STORELOCATOR_GET_MODAL\s*=\s*"([^"]+)"/)?.[1]||'');catalogMemory={actions,cookie,storeCall,time:Date.now()};return catalogMemory;}
let catalogPending=null;async function catalog(fresh=false){if(catalogPending)return catalogPending;if(!fresh&&catalogMemory&&Date.now()-catalogMemory.time<900000)return catalogMemory;catalogPending=fetchCatalog();try{return await catalogPending}finally{catalogPending=null}}

const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export {parseCatalog,parseProducts,parseExhibition,parseProductCashback,actionType,choiceGift};
async function api(request){let u=new URL(request.url);try{
 if(u.pathname==='/api/shops')return json({shops:await getShops()});
 if(u.pathname==='/api/catalog'){let c=await catalog(true);return json({actions:c.actions.map(({call,...a})=>a),fetchedAt:new Date().toISOString(),source:ORIGIN+'/actievoorwaarden'});}
 if(u.pathname==='/api/action'){let id=u.searchParams.get('id');if(!/^\d+_\d+_[A-Z0-9]+$/.test(id||''))return json({error:'Ongeldige actiecode'},400);let c=await catalog(),a=c.actions.find(a=>a.id===id);if(!a)return json({error:'Actie niet meer teruggevonden. Start opnieuw met uitlezen.'},404);let url=new URL(a.call);url.searchParams.set('SEARCHSTRING','');let r=await upstream(url.href,{cookie:c.cookie,ajax:true});let products=parseProducts(r.html,a);if(new Set(products.map(p=>p.key)).size!==products.length)throw Error('Dubbele toestellen in actielijst');return json({action:a.id,products});}
 if(u.pathname==='/api/exhibition'||u.pathname==='/api/cashback'){let code=u.searchParams.get('code')||'',productURL=u.searchParams.get('url')||'';let product;try{product=new URL(productURL)}catch{return json({error:'Ongeldige productlink'},400)}if(!/^\d{5,10}$/.test(code)||product.origin!==ORIGIN||product.username||product.password||product.search||product.hash||!/^\/[a-z0-9-]+\/[a-z0-9._~%+-]+\/?$/i.test(product.pathname))return json({error:'Ongeldige productcode of productlink'},400);return json(u.pathname==='/api/cashback'?await productCashback(code,product.href):await exhibition(code,product.href, /^\d{1,5}$/.test(u.searchParams.get('shop')||'208')?u.searchParams.get('shop')||'208':'208'));}
 if(u.pathname==='/api/image'){let p=u.searchParams.get('path')||'';if(!/^\/WEB\/images\/products\/(?:50|100|300|zoom)\/[a-zA-Z0-9_.+%() -]+\.(jpg|png|webp)$/i.test(p))return new Response('Ongeldig pad',{status:400});let r=await fetch('https://image.vandenborre.be'+p,{signal:AbortSignal.timeout(15000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))return new Response('Afbeelding niet bereikbaar',{status:502});return new Response(r.body,{headers:{'content-type':r.headers.get('content-type'),'cache-control':'public, max-age=86400'}});}
 return json({error:'Niet gevonden'},404);
 }catch(e){return json({error:e.message||'Uitlezen mislukt. Vorige gegevens blijven behouden.'},502)}}

function parseShops(html){let result=new Map();for(let row of html.split(/<div\b[^>]*class="[^"\n]*\bjs-store-line\b[^"\n]*"[^>]*>/).slice(1)){let id=row.match(/data-shopid=["'](\d+)["']/)?.[1],name=text(row.match(/class="h3-title[^"\n]*"[^>]*>([\s\S]*?)<\/div>/)?.[1]);if(id&&name)result.set(id,{id,name})}return [...result.values()].sort((a,b)=>a.name.localeCompare(b.name,'nl'));}
let shopsMemory=null;async function getShops(){if(shopsMemory&&Date.now()-shopsMemory.time<86400000)return shopsMemory.shops;let c=await catalog(),url=new URL(c.storeCall,ORIGIN);if(url.origin!==ORIGIN||url.pathname!=='/WEBV3/NL/Page389/LIB.WebRequest.cls')throw Error('Winkelbron niet beschikbaar');url.searchParams.set('scope','2');url.searchParams.set('postcode','3290 Diest');url.searchParams.set('productID','7880324');let r=await upstream(url.href,{cookie:c.cookie,ajax:true}),shops=parseShops(r.html);if(!shops.length)throw Error('Winkellijst niet herkenbaar');shopsMemory={shops,time:Date.now()};return shops;}
export {parseShops};

export {promotionDetails};
