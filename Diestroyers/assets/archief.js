/* Maandsnapshots en hun projectie naar de bestaande website- en TV-data. */
(() => {
  "use strict";
  const w=typeof window==="undefined"?globalThis:window;
  const buckets={
    resultaten:"DIESTROYERS_RESULTATEN",
    historiek:"DIESTROYERS_HISTORIEK_MAAND",
    details:"DIESTROYERS_KPI_DETAIL"
  };
  const month=/^\d{4}-(0[1-9]|1[0-2])$/;
  const revision=/^[a-f0-9]{64}$/;
  const norm=value=>String(value??"").trim().toLowerCase();
  const alias=key=>key[0].toLowerCase()+key.slice(1);
  const text=value=>String(value??"").trim();
  const periodOf=row=>row?.Periode || row?.periode;
  const typeOf=row=>norm(row?.EntiteitType || row?.entiteitType);
  const shopOf=row=>text(row?.ShopNr || row?.shopNr);
  const idOf=row=>text(row?.PersoneelsNr || row?.personeelsNr);
  const nameOf=row=>text(row?.Naam || row?.naam);
  const amount=(key)=>({key,value:key});
  const ratio=(key)=>({key,count:key+"Stuks",chances:key+"Kansen",ratio:true});
  const metrics=[
    amount("Omzet"),{...amount("Life"),count:"Life"},ratio("Insurance"),ratio("Abo"),
    ratio("DSP"),ratio("SPG"),ratio("SRP"),amount("Accessoires"),
    {key:"Link",percentage:"LinkPct"},amount("Monster"),ratio("BuyWay"),ratio("Leaders"),
    {key:"S",value:"SEuro",percentage:"SRatio",count:"SStuks"}
  ];
  const keysFor=metric=>[metric.value,metric.percentage,metric.count,metric.chances].filter(Boolean);
  function currentMonth(date=new Date()) {
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit"}).formatToParts(date);
    return parts.find(part=>part.type==="year").value+"-"+parts.find(part=>part.type==="month").value;
  }
  function read(source=w) {
    return Object.fromEntries(Object.entries(buckets).map(([name,key])=>[name,Array.isArray(source[key])?source[key]:[]]));
  }
  function valid(snapshot,period,limit=currentMonth()) {
    return snapshot?.format===1 && month.test(period) && period<limit && snapshot.periode===period &&
      revision.test(snapshot.bronRevisie) && typeof snapshot.afgeslotenOp==="string" &&
      Array.isArray(snapshot.wijzigingen) && Array.isArray(snapshot.targetsBijAfsluiting) &&
      Object.keys(buckets).every(key=>Array.isArray(snapshot[key]) && snapshot[key].every(row=>row && periodOf(row)===period)) &&
      snapshot.resultaten.some(row=>typeOf(row)==="winkel");
  }
  function periods(source=w) {
    return [...new Set(read(source).resultaten.filter(row=>typeOf(row)==="winkel").map(periodOf))].filter(period=>month.test(period)).sort();
  }
  function capture(source,period,targets,date=new Date()) {
    const snapshot={
      format:1,periode:period,afgeslotenOp:date.toISOString(),bronRevisie:source.DIESTROYERS_DATA_REVISION,
      targetsBijAfsluiting:(targets||[]).filter(row=>periodOf(row)===period),wijzigingen:[]
    };
    for (const [name,rows] of Object.entries(read(source))) snapshot[name]=rows.filter(row=>periodOf(row)===period);
    if (!valid(snapshot,period,currentMonth(date))) throw new Error("Deze maand heeft geen geldige afgesloten resultaatstand.");
    return JSON.parse(JSON.stringify(snapshot));
  }
  function compatible(rows,archive,bucket) {
    const output=[];
    const positions=new Map();
    for (const row of rows) {
      const period=periodOf(row);
      const snapshot=archive[period];
      if (!snapshot) output.push(row);
      else {
        const index=positions.get(period)||0;
        if (index<snapshot[bucket].length) output.push(snapshot[bucket][index]);
        positions.set(period,index+1);
      }
    }
    for (const period of Object.keys(archive).sort()) {
      output.push(...archive[period][bucket].slice(positions.get(period)||0));
    }
    return output;
  }
  function apply(source=w) {
    const published=source.DIESTROYERS_ARCHIEF;
    const expected=source.DIESTROYERS_CONFIG_DATA?.archiefVersie;
    const entries=Object.entries(published?.maanden || {});
    if (published?.format!==1 || !expected || published.versie!==expected ||
      !entries.every(([period,snapshot])=>valid(snapshot,period))) return false;
    const archive=Object.fromEntries(entries);
    const data=read(source);
    for (const [bucket,key] of Object.entries(buckets)) source[key]=compatible(data[bucket],archive,bucket);
    return true;
  }
  function matching(row,entity,shop) {
    if (typeOf(row)!==norm(entity.type)) return false;
    return entity.type==="Winkel" ? (shopOf(row)||shop)===entity.id
      : idOf(row) ? idOf(row)===entity.id : norm(nameOf(row))===norm(entity.naam);
  }
  function put(row,key,value) {
    row[key]=value;
    if (Object.hasOwn(row,alias(key))) row[alias(key)]=value;
  }
  const number=(row,key)=>{
    if (!key) return null;
    const value=row[key]??row[alias(key)];
    return typeof value==="number" && Number.isFinite(value)?value:null;
  };
  function update(snapshot,correction,editor,shop,date=new Date()) {
    if (!valid(snapshot,correction.periode,currentMonth(date)) ||
      !/^[0-9]+$/.test(correction.id) || (correction.type==="Winkel" && correction.id!==shop) ||
      !correction.naam) throw new Error("Ongeldige archiefcorrectie.");
    const values=Object.entries(correction.waarden||{});
    if (!values.length || values.some(([key,value])=>!metrics.some(metric=>keysFor(metric).includes(key)) ||
      !editor.valid(correction.type,key,value))) throw new Error("Ongeldige waarde voor het archief.");
    const own=row=>matching(row,correction,shop);
    const rows=snapshot.resultaten.filter(own);
    if (rows.length>1) throw new Error("Er staan meerdere resultaatrijen voor "+correction.naam+" in deze archiefmaand.");
    const identity={Periode:snapshot.periode,EntiteitType:correction.type,Naam:correction.naam,
      ShopNr:correction.type==="Winkel"?shop:correction.shopNr||shop,PersoneelsNr:correction.type==="Verkoper"?correction.id:""};
    const row=rows[0] || {...identity};
    if (!rows.length) snapshot.resultaten.push(row);
    const stamp=date.toISOString();
    for (const [key,value] of values) {
      const previous=number(row,key);
      if (previous!==value) snapshot.wijzigingen.push({op:stamp,type:correction.type,id:correction.id,kpiVeld:key,van:previous,naar:value});
      put(row,key,value);
    }
    for (const metric of metrics.filter(item=>keysFor(item).some(key=>Object.hasOwn(correction.waarden,key)))) {
      const subtotal=["Insurance","Link"].includes(metric.key)?"Totaal":"";
      const compatibleDetail=item=>own(item) && norm(item.KPI)===norm(metric.key) && ["",norm(subtotal)].includes(norm(item.SubKPI));
      const count=number(row,metric.count), chances=number(row,metric.chances);
      const percentage=metric.ratio?(count!==null && chances>0?count/chances*100:null):number(row,metric.percentage);
      if (metric.ratio && (Object.hasOwn(row,metric.key+"Pct") || ["BuyWay","Leaders"].includes(metric.key))) put(row,metric.key+"Pct",percentage);
      const historical=snapshot.historiek.filter(compatibleDetail);
      if (!historical.length) {
        const item={...identity,KPI:metric.key,SubKPI:subtotal};
        snapshot.historiek.push(item);
        historical.push(item);
      }
      for (const item of [...historical,...snapshot.details.filter(compatibleDetail)]) {
        if (metric.value) item.Waarde=number(row,metric.value);
        if (metric.ratio || metric.percentage) item.WaardePct=percentage;
        if (metric.count) item.Stuks=count;
        if (metric.chances) item.Kansen=chances;
        const percent=metric.ratio || metric.percentage;
        const value=percent?percentage:number(row,metric.value);
        const targetField=metric.key+(percent?"TargetPct":"Target");
        const target=number(item,percent?"TargetPct":"Target")??number(row,targetField);
        if (target!==null) item[percent?"TargetPct":"Target"]=target;
        const ratio=target>0 && value!==null?value/target:null;
        item.Status=ratio===null?"":ratio>=1?"Groen":ratio>=.9?"Geel":"Rood";
        item.Punten=ratio===null?0:ratio>=1?3:ratio>=.9?1:0;
        item.Bron="Admin";
        item.LaatsteUpdate=stamp;
      }
    }
  }
  function project(archive) {
    return "window.DIESTROYERS_ARCHIEF = "+JSON.stringify(archive)+";\nwindow.ScorebladArchief.apply(window);\n";
  }
  const api={buckets,currentMonth,read,periods,valid,capture,apply,update,project};
  if (typeof module!=="undefined") module.exports=api;
  else {
    w.ScorebladArchief=api;
    const version=w.DIESTROYERS_CONFIG_DATA?.archiefVersie;
    if (w.document?.currentScript?.hasAttribute("data-load-archive") && /^[a-zA-Z0-9_.:-]{1,64}$/.test(version||"")) {
      w.document.write('<script src="assets/archief-data.js?rev='+encodeURIComponent(version)+'"><\/script>');
    }
  }
})();
