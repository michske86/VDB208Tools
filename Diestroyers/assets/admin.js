/* The Diestroyers Admin - Robuuste Targetplanner */
(function(){
  "use strict";

  const base = window.DIESTROYERS_CONFIG_DATA || {
    version:new Date().toISOString(),
    source:"admin",
    shop:{shopNr:"208",naam:"Diest"},
    big7:["life","dsp","insurance","spg","srp","abonnementen","link"],
    district:[],
    verkopers:[],
    targets:[]
  };

  let state = JSON.parse(JSON.stringify(base));
  let targetMode = "verkopers";
  let selectedKpi = "LifeTarget";

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const norm = v => String(v ?? "").trim().toLowerCase();
  const months = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
  const kpis = [
    {field:"OmzetTarget",label:"Omzet",unit:"€"},
    {field:"LifeTarget",label:"Life",unit:"stuks"},
    {field:"InsuranceTargetPct",label:"Insurance",unit:"%"},
    {field:"AboTargetPct",label:"Abo",unit:"%"},
    {field:"DSPTargetPct",label:"DSP",unit:"%"},
    {field:"SPGTargetPct",label:"SPG",unit:"%"},
    {field:"SRPTargetPct",label:"SRP",unit:"%"},
    {field:"AccessoiresTargetPct",label:"Accessoires",unit:"%"},
    {field:"LinkTargetPct",label:"Link",unit:"%"},
    {field:"MonsterTarget",label:"Monster",unit:"€"},
    {field:"NPSTarget",label:"NPS",unit:"score"}
  ];

  function numberValue(v){
    if(v === null || v === undefined || v === "") return 0;
    if(typeof v === "number") return Number.isFinite(v) ? v : 0;
    let s=String(v).trim().replace(/\s/g,"").replace("%","");
    if(s.includes(",") && s.includes(".")) s=s.replace(/\./g,"").replace(",",".");
    else s=s.replace(",",".");
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  }

  function active(v){
    return !["nee","no","0","false","n","inactief"].includes(norm(v?.Actief ?? v?.actief ?? "ja"));
  }
  function activeSellers(){return state.verkopers.filter(v=>active(v)&&norm(v.Naam));}
  function activeDistrict(){return state.district.filter(v=>active(v)&&(norm(v.Winkel)||norm(v.ShopNr)));}
  function getYear(){return Number($("targetYear")?.value||new Date().getFullYear());}
  function period(year,monthIndex){return `${year}-${String(monthIndex+1).padStart(2,"0")}`;}

  function init(){
    normalize();
    migrateTargets();

    bindTabs();
    $("shopNr").value=state.shop.shopNr||"208";
    $("shopName").value=state.shop.naam||"Diest";

    const knownYears=[...new Set(state.targets.map(t=>Number(String(t.Periode||"").slice(0,4))).filter(Boolean))];
    $("targetYear").value=knownYears.includes(new Date().getFullYear())?new Date().getFullYear():(knownYears.at(-1)||new Date().getFullYear());

    renderDistrict();
    renderSellers();
    renderIncentives();
    ensureYear(getYear());
    renderTargetPlanner();
    validate();

    $("addDistrict").onclick=()=>{state.district.push({ShopNr:"",Winkel:"",Regio:"Regio",Actief:"JA"});renderDistrict();};
    $("addSeller").onclick=()=>{state.verkopers.push({Naam:"",PersoneelsNr:"",Avatar:"",Actief:"Ja",ShopNr:state.shop.shopNr||"208",ImportAlias:""});renderSellers();};
    $("addTvIncentive").onclick=addIncentive;
    $("saveConfig").onclick=saveConfig;
    $("downloadConfig").onclick=downloadConfig;
    $("validateConfig").onclick=validate;
    $("targetYear").onchange=()=>{ensureYear(getYear());renderTargetPlanner();};
    $("copyPreviousYear").onclick=copyPreviousYear;
    $("copyJanuaryTargets").onclick=copyJanuary;

    document.querySelectorAll(".target-subtab").forEach(btn=>btn.onclick=()=>{
      document.querySelectorAll(".target-subtab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      targetMode=btn.dataset.targetMode;
      renderTargetPlanner();
    });
  }

  function normalize(){
    state.shop=state.shop||{shopNr:"208",naam:"Diest"};
    state.district=Array.isArray(state.district)?state.district:[];
    state.verkopers=Array.isArray(state.verkopers)?state.verkopers:[];
    state.targets=Array.isArray(state.targets)?state.targets:[];
    state.tvIncentives=Array.isArray(state.tvIncentives)?state.tvIncentives:[];
  }

  function bindTabs(){
    document.querySelectorAll(".admin-tab").forEach(btn=>btn.onclick=()=>{
      document.querySelectorAll(".admin-tab").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach(s=>s.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
      if(btn.dataset.tab==="targets"){ensureYear(getYear());renderTargetPlanner();}
      if(btn.dataset.tab==="tv-incentives"){updateSetup();renderIncentives();}
      if(btn.dataset.tab==="validatie") validate();
    });
  }

  function sellerCanonical(name,shopNr){
    const v=state.verkopers.find(x=>norm(x.Naam)===norm(name));
    return {name:v?.Naam||name,shopNr:String(v?.ShopNr||shopNr||state.shop.shopNr||"208")};
  }
  function districtCanonical(name,shopNr){
    const d=state.district.find(x=>norm(x.ShopNr)===norm(shopNr) || norm(x.Winkel)===norm(name));
    return {name:d?.Winkel||name||d?.ShopNr,shopNr:String(d?.ShopNr||shopNr||"")};
  }
  function canonicalTarget(t){
    const out={...t};
    out.Periode=String(out.Periode||out.periode||"").slice(0,7);
    out.EntiteitType=String(out.EntiteitType||out.entiteitType||"");
    out.Naam=String(out.Naam||out.naam||"");
    out.ShopNr=String(out.ShopNr||out.shopNr||"");

    if(norm(out.EntiteitType)==="verkoper"){
      const c=sellerCanonical(out.Naam,out.ShopNr);
      out.Naam=c.name; out.ShopNr=c.shopNr;
    }else if(norm(out.EntiteitType)==="districtwinkel"){
      const c=districtCanonical(out.Naam,out.ShopNr);
      out.Naam=c.name; out.ShopNr=c.shopNr;
    }else if(norm(out.EntiteitType)==="winkel"){
      out.Naam=state.shop.naam||"Diest";
      out.ShopNr=String(state.shop.shopNr||out.ShopNr||"208");
    }

    kpis.forEach(k=>out[k.field]=numberValue(out[k.field]));
    return out;
  }

  function logicalKey(t){
    return [String(t.Periode||""),norm(t.EntiteitType),norm(t.Naam)].join("|");
  }
  function exactKey(t){
    return [String(t.Periode||""),norm(t.EntiteitType),norm(t.Naam),norm(t.ShopNr)].join("|");
  }
  function nonZeroScore(t){return kpis.reduce((s,k)=>s+(numberValue(t[k.field])!==0?1:0),0);}

  function mergeTargetRows(a,b){
    const preferred=nonZeroScore(b)>nonZeroScore(a)?{...b}:{...a};
    const other=preferred===b?a:b;
    kpis.forEach(k=>{
      if(numberValue(preferred[k.field])===0 && numberValue(other[k.field])!==0) preferred[k.field]=numberValue(other[k.field]);
    });
    if(!preferred.ShopNr) preferred.ShopNr=other.ShopNr||"";
    return preferred;
  }

  function migrateTargets(){
    const activeNames=new Set(activeSellers().map(v=>norm(v.Naam)));
    const merged=new Map();

    state.targets.map(canonicalTarget).forEach(t=>{
      if(!t.Periode || !t.EntiteitType || !t.Naam) return;
      if(norm(t.EntiteitType)==="verkoper" && !activeNames.has(norm(t.Naam))) return;
      const key=logicalKey(t);
      merged.set(key,merged.has(key)?mergeTargetRows(merged.get(key),t):t);
    });

    state.targets=[...merged.values()];
    state.targets.forEach(t=>{if(numberValue(t.NPSTarget)===0)t.NPSTarget=70;});

    // Districttargets die nog volledig nul zijn krijgen de eigen winkeltargets als veilige startwaarde.
    state.targets.forEach(t=>{
      if(norm(t.EntiteitType)!=="districtwinkel" || nonZeroScore(t)>0) return;
      const own=state.targets.find(x=>x.Periode===t.Periode && norm(x.EntiteitType)==="winkel");
      if(own) kpis.forEach(k=>t[k.field]=numberValue(own[k.field]));
    });
  }

  function entityList(){
    if(targetMode==="district") return activeDistrict().map(d=>({type:"DistrictWinkel",name:d.Winkel||d.Naam||d.ShopNr,shopNr:String(d.ShopNr||"")}));
    if(targetMode==="winkel") return [{type:"Winkel",name:state.shop.naam||"Diest",shopNr:String(state.shop.shopNr||"208")}];
    return activeSellers().map(v=>({type:"Verkoper",name:v.Naam,shopNr:String(v.ShopNr||state.shop.shopNr||"208")}));
  }

  function findTarget(per,type,name,shopNr){
    const candidates=state.targets.filter(t=>
      String(t.Periode)===String(per) &&
      norm(t.EntiteitType)===norm(type) &&
      norm(t.Naam)===norm(name)
    );
    return candidates.sort((a,b)=>{
      const ae=norm(a.ShopNr)===norm(shopNr)?1:0;
      const be=norm(b.ShopNr)===norm(shopNr)?1:0;
      return be-ae || nonZeroScore(b)-nonZeroScore(a);
    })[0]||null;
  }

  function getTarget(per,type,name,shopNr){
    let row=findTarget(per,type,name,shopNr);
    if(!row){
      row={Periode:per,EntiteitType:type,Naam:name,ShopNr:shopNr||""};
      kpis.forEach(k=>row[k.field]=(k.field==="NPSTarget"?70:0));

      if(norm(type)==="districtwinkel"){
        const own=findTarget(per,"Winkel",state.shop.naam||"Diest",state.shop.shopNr||"208");
        if(own) kpis.forEach(k=>row[k.field]=numberValue(own[k.field]));
      }
      state.targets.push(row);
    }else{
      row.Periode=per; row.EntiteitType=type; row.Naam=name;
      row.ShopNr=shopNr||row.ShopNr||"";
    }
    return row;
  }

  function ensureYear(year){
    const all=[
      {type:"Winkel",name:state.shop.naam||"Diest",shopNr:String(state.shop.shopNr||"208")},
      ...activeSellers().map(v=>({type:"Verkoper",name:v.Naam,shopNr:String(v.ShopNr||state.shop.shopNr||"208")})),
      ...activeDistrict().map(d=>({type:"DistrictWinkel",name:d.Winkel||d.Naam||d.ShopNr,shopNr:String(d.ShopNr||"")}))
    ];
    all.forEach(e=>months.forEach((_,i)=>getTarget(period(year,i),e.type,e.name,e.shopNr)));
  }

  function renderTargetPlanner(){
    const year=getYear();
    ensureYear(year);

    $("targetKpiTabs").innerHTML=kpis.map(k=>`<button class="target-kpi-tab ${k.field===selectedKpi?"active":""}" data-kpi="${k.field}">${esc(k.label)}</button>`).join("");
    document.querySelectorAll(".target-kpi-tab").forEach(btn=>btn.onclick=()=>{selectedKpi=btn.dataset.kpi;renderTargetPlanner();});

    const kpi=kpis.find(k=>k.field===selectedKpi)||kpis[0];
    const entities=entityList();

    $("targetNote").textContent=targetMode==="verkopers"
      ?"Alle actieve verkopers staan automatisch in de rijen. Bestaande targets zijn vooraf ingevuld."
      :targetMode==="district"
        ?"Alle actieve districtwinkels staan automatisch in de rijen. Bestaande targets zijn vooraf ingevuld en kunnen per winkel verschillen."
        :"De eigen winkel staat automatisch klaar met alle gekende maandtargets.";

    $("targetSheetTitle").textContent=`${kpi.label} · ${targetMode==="verkopers"?"Verkopers":targetMode==="district"?"District winkels":"Eigen winkel"}`;
    $("targetSheetSub").textContent=`${year} · eenheid: ${kpi.unit}`;

    if(!entities.length){
      $("targetMatrix").innerHTML=`<tbody><tr><td class="target-empty">Geen actieve ${targetMode==="verkopers"?"verkopers":"districtwinkels"} gevonden.</td></tr></tbody>`;
      return;
    }

    const head=`<thead><tr><th>${targetMode==="verkopers"?"Verkoper":"Winkel"}</th>${months.map(m=>`<th>${m}</th>`).join("")}</tr></thead>`;
    const body=entities.map(e=>{
      const cells=months.map((_,i)=>{
        const per=period(year,i);
        const row=getTarget(per,e.type,e.name,e.shopNr);
        return `<td><input type="number" step="0.1" data-per="${per}" data-type="${esc(e.type)}" data-name="${esc(e.name)}" data-shop="${esc(e.shopNr)}" data-field="${kpi.field}" value="${esc(numberValue(row[kpi.field]))}"></td>`;
      }).join("");
      return `<tr><td>${esc(e.name)}${e.shopNr?` <small>(${esc(e.shopNr)})</small>`:""}</td>${cells}</tr>`;
    }).join("");

    $("targetMatrix").innerHTML=head+`<tbody>${body}</tbody>`;
    document.querySelectorAll("#targetMatrix input").forEach(inp=>inp.oninput=()=>{
      const row=getTarget(inp.dataset.per,inp.dataset.type,inp.dataset.name,inp.dataset.shop);
      row[inp.dataset.field]=inp.value;
    });
  }

  function renderDistrict(){
    const cols=["ShopNr","Winkel","Regio","Actief"];
    $("districtTable").innerHTML=`<thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}<th></th></tr></thead><tbody>${state.district.map((r,i)=>`<tr>${cols.map(c=>`<td><input data-kind="district" data-row="${i}" data-col="${c}" value="${esc(r[c]??"")}"></td>`).join("")}<td><button class="admin-btn secondary" data-del-district="${i}">X</button></td></tr>`).join("")}</tbody>`;
    bindTable("district");
    document.querySelectorAll("[data-del-district]").forEach(b=>b.onclick=()=>{state.district.splice(+b.dataset.delDistrict,1);migrateTargets();renderDistrict();renderTargetPlanner();});
  }

  function renderSellers(){
    const cols=["Naam","PersoneelsNr","Avatar","Actief","ShopNr","ImportAlias"];
    $("sellerTable").innerHTML=`<thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}<th></th></tr></thead><tbody>${state.verkopers.map((r,i)=>`<tr>${cols.map(c=>`<td><input data-kind="verkopers" data-row="${i}" data-col="${c}" value="${esc(r[c]??"")}"></td>`).join("")}<td><button class="admin-btn secondary" data-del-seller="${i}">X</button></td></tr>`).join("")}</tbody>`;
    bindTable("verkopers");
    document.querySelectorAll("[data-del-seller]").forEach(b=>b.onclick=()=>{state.verkopers.splice(+b.dataset.delSeller,1);migrateTargets();renderSellers();renderTargetPlanner();});
  }

  function bindTable(kind){
    document.querySelectorAll(`[data-kind="${kind}"]`).forEach(inp=>inp.onchange=()=>{
      state[kind][+inp.dataset.row][inp.dataset.col]=inp.value;
      migrateTargets();
      renderTargetPlanner();
    });
  }

  function copyJanuary(){
    const year=getYear();
    entityList().forEach(e=>{
      const jan=getTarget(period(year,0),e.type,e.name,e.shopNr);
      for(let i=1;i<12;i++) getTarget(period(year,i),e.type,e.name,e.shopNr)[selectedKpi]=numberValue(jan[selectedKpi]);
    });
    renderTargetPlanner();
  }

  function copyPreviousYear(){
    const year=getYear();
    entityList().forEach(e=>{
      for(let i=0;i<12;i++){
        const src=getTarget(period(year-1,i),e.type,e.name,e.shopNr);
        const dst=getTarget(period(year,i),e.type,e.name,e.shopNr);
        kpis.forEach(k=>dst[k.field]=numberValue(src[k.field]));
      }
    });
    renderTargetPlanner();
  }


  function incentiveIssues(){
    const tools=window.DIESTROYERS_TV_INCENTIVES;
    const monthlyIssues=state.tvIncentives.flatMap((entry,index)=>{
      const label=entry.name?.trim()||`Incentive ${index+1}`;
      const dateIssue=tools.dateError(entry);
      return [
        !entry.name?.trim()&&`${label}: naam ontbreekt.`,
        !tools.validGoal(entry.goal)&&`${label}: vul een geheel doel tussen 1 en 500 in.`,
        dateIssue&&`${label}: ${dateIssue}`
      ].filter(Boolean);
    });
    return [...monthlyIssues,...window.DIESTROYERS_DECEMBER.issues(state.decemberIncentive)];
  }

  function renderIncentives(){
    renderDecemberIncentive();
    const tools=window.DIESTROYERS_TV_INCENTIVES;
    const months=tools.monthlyCounts(window.DIESTROYERS_RESULTATEN||[],window.DIESTROYERS_HISTORIEK_MAAND||[],state.shop);
    const report=[...months.keys()].sort().at(-1),table=$("tvIncentiveTable");
    table.innerHTML='<thead><tr><th scope="col">Actief op TV</th><th scope="col">Naam</th><th scope="col">Startdatum</th><th scope="col">Einddatum</th><th scope="col">Doel</th><th scope="col">Winkelstand</th><th scope="col"></th></tr></thead><tbody>'+
      state.tvIncentives.map((entry,index)=>`<tr>
        <td><input data-field="active" type="checkbox" aria-label="Actief op TV, incentive ${index+1}" ${entry.active?'checked':''}></td>
        <td><input data-field="name" type="text" maxlength="55" aria-label="Naam, incentive ${index+1}" value="${esc(entry.name)}"></td>
        <td><input data-field="startDate" type="date" aria-label="Startdatum, incentive ${index+1}" value="${esc(entry.startDate)}"></td>
        <td><input data-field="endDate" type="date" aria-label="Einddatum, incentive ${index+1}" value="${esc(entry.endDate)}"></td>
        <td><input data-field="goal" type="number" min="1" max="500" step="1" aria-label="Doel in stuks, incentive ${index+1}" value="${esc(entry.goal||'')}"></td>
        <td data-progress></td><td><button class="admin-btn secondary" type="button" data-remove>Verwijder</button></td>
      </tr>`).join('')+'</tbody>';
    Array.from(table.tBodies[0].rows).forEach((row,index)=>{
      const entry=state.tvIncentives[index];
      const update=()=>{
        const output=row.querySelector('[data-progress]');
        if(!tools.valid(entry)){output.textContent='Controleer de instellingen';return;}
        const totals=tools.progress(entry,months,report);
        output.textContent=totals.available
          ? `${totals.life+totals.insurance} / ${entry.goal}${totals.missing?' · onvolledig':''}`
          : 'Nog geen resultaten';
      };
      row.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',()=>{
        entry[input.dataset.field]=input.type==='checkbox'?input.checked:input.type==='number'?input.valueAsNumber:input.value;
        update();
      }));
      row.querySelector('[data-remove]').onclick=()=>{state.tvIncentives.splice(index,1);renderIncentives();};
      update();
    });
  }

  function renderDecemberIncentive(){
    const tools=window.DIESTROYERS_DECEMBER;
    const rule=state.decemberIncentive ||= tools.defaults();
    delete rule.revealTime;
    const fields={decemberActive:'active',decemberStart:'startDate',decemberEnd:'endDate',decemberWall:'wallTarget'};
    const button=$('decemberOpenAll');
    let stagedDate;
    const update=()=>{
      const issues=tools.issues(rule);
      const result=issues.length?null:tools.snapshot(rule,[],null);
      button.disabled=!(rule.active && result?.pending);
      $('decemberStatus').textContent=issues.join(' ') ||
        (stagedDate && result?.today?.date===stagedDate ? 'Klik op Wijzigingen opslaan om het deurtje op alle schermen te openen.' :
         result?.today ? 'Het deurtje van vandaag is geopend in deze configuratie.' : '');
    };
    button.onclick=()=>{
      const day=tools.snapshot(rule,[],null).pending;
      if(!rule.active || !day) return;
      stagedDate=day.date;
      rule.openedDates=[...(Array.isArray(rule.openedDates)?rule.openedDates:[]),stagedDate];
      update();
    };
    Object.entries(fields).forEach(([id,key])=>{
      const input=$(id);
      if(input.type==='checkbox') input.checked=rule[key]===true;
      else input.value=rule[key]??'';
      input.oninput=()=>{
        rule[key]=input.type==='checkbox'?input.checked:input.type==='number'?input.valueAsNumber:input.value;
        update();
      };
    });
    update();
  }

  function addIncentive(){
    const today=new Date(),year=today.getFullYear(),month=today.getMonth()+1;
    const prefix=`${year}-${String(month).padStart(2,'0')}`;
    const last=new Date(year,month,0).getDate();
    state.tvIncentives.push({name:'Incentive '+months[month-1],active:false,startDate:prefix+'-01',endDate:prefix+'-'+last,goal:110});
    renderIncentives();
  }

  function updateSetup(){state.shop={shopNr:$("shopNr").value.trim(),naam:$("shopName").value.trim()};}

  function clean(){
    updateSetup();
    migrateTargets();
    ensureYear(getYear());
    migrateTargets();
    state.targets=state.targets.map(canonicalTarget).sort((a,b)=>
      String(a.Periode).localeCompare(String(b.Periode)) ||
      String(a.EntiteitType).localeCompare(String(b.EntiteitType)) ||
      String(a.Naam).localeCompare(String(b.Naam))
    );
    state.version=new Date().toISOString();
    state.source="admin";
    return state;
  }

  function validate(){
    updateSetup();
    const issues=incentiveIssues();
    if(!state.shop.shopNr) issues.push("Winkelnummer ontbreekt.");
    if(!state.shop.naam) issues.push("Winkelnaam ontbreekt.");

    const shopIds=new Set();
    state.district.forEach((d,i)=>{
      if(!d.ShopNr) issues.push(`District rij ${i+1}: winkelnummer ontbreekt.`);
      if(!d.Winkel) issues.push(`District rij ${i+1}: winkelnaam ontbreekt.`);
      if(d.ShopNr&&shopIds.has(norm(d.ShopNr))) issues.push(`Dubbel districtwinkelnummer: ${d.ShopNr}`);
      if(d.ShopNr) shopIds.add(norm(d.ShopNr));
    });

    const people=new Set();
    state.verkopers.forEach((v,i)=>{
      if(!v.Naam) issues.push(`Verkoper rij ${i+1}: naam ontbreekt.`);
      if(!v.PersoneelsNr) issues.push(`Verkoper ${v.Naam||i+1}: personeelsnummer ontbreekt.`);
      if(v.PersoneelsNr&&people.has(norm(v.PersoneelsNr))) issues.push(`Dubbel personeelsnummer: ${v.PersoneelsNr}`);
      if(v.PersoneelsNr) people.add(norm(v.PersoneelsNr));
    });

    const keys=new Set();
    cleanPreview().forEach(t=>{
      const key=exactKey(t);
      if(keys.has(key)) issues.push(`Dubbele targetrij: ${t.Periode} · ${t.EntiteitType} · ${t.Naam}`);
      keys.add(key);
    });

    $("validationOutput").innerHTML=issues.length
      ?`<div class="admin-warning">${issues.map(esc).join("<br>")}</div>`
      :`<div class="admin-ok">Geen blokkerende fouten gevonden.</div>`;
    return !issues.length;
  }

  function cleanPreview(){
    const saved=state.targets;
    migrateTargets();
    const result=state.targets.map(canonicalTarget);
    state.targets=saved;
    return result;
  }

  function content(){return "window.DIESTROYERS_CONFIG_DATA = "+JSON.stringify(clean(),null,2)+";\n";}


  const configEndpoint = "https://api.github.com/repos/michske86/VDB208Tools/contents/Diestroyers/assets/config-data.js";
  const tokenKey = "diestroyers.admin.github-token";
  let savedConfig = JSON.stringify(base);
  let githubToken = readGithubToken();

  function readGithubToken(){
    try{return sessionStorage.getItem(tokenKey)||"";}catch{return "";}
  }

  function rememberGithubToken(token){
    githubToken=token;
    try{
      if(token) sessionStorage.setItem(tokenKey,token);
      else sessionStorage.removeItem(tokenKey);
    }catch{/* Saving still works when browser storage is unavailable. */}
  }

  function requestGithubToken(){
    const dialog=$("githubSaveDialog"),form=dialog.querySelector("form"),field=$("githubSaveToken");
    return new Promise(resolve=>{
      form.reset();
      dialog.returnValue="";
      dialog.showModal();
      dialog.addEventListener("close",()=>{
        const token=dialog.returnValue==="publish"?field.value.trim():"";
        field.value="";
        resolve(token);
      },{once:true});
    });
  }

  function parsePublishedConfig(file){
    if(file.encoding!=="base64"||!file.sha) throw new Error("GitHub gaf geen leesbare configuratie terug.");
    const bytes=Uint8Array.from(atob(file.content.replace(/\s/g,"")),char=>char.charCodeAt(0));
    const source=new TextDecoder().decode(bytes);
    const match=source.match(/^\s*window\.DIESTROYERS_CONFIG_DATA\s*=\s*([\s\S]+);\s*$/);
    if(!match) throw new Error("De configuratie op GitHub heeft een ongeldige indeling.");
    return JSON.stringify(JSON.parse(match[1]));
  }

  function base64(text){
    const bytes=new TextEncoder().encode(text);
    let binary="";
    for(const byte of bytes) binary+=String.fromCharCode(byte);
    return btoa(binary);
  }

  function checkGithubResponse(response){
    if(response.ok) return;
    if([401,403,404].includes(response.status)){
      rememberGithubToken("");
      throw new Error("GitHub weigert toegang. Controleer of je token schrijfrechten heeft voor Contents in VDB208Tools.");
    }
    if(response.status===409||response.status===422) throw new Error("GitHub accepteerde de wijziging niet. Download je wijzigingen als reservekopie en herlaad Admin voordat je opnieuw opslaat.");
    throw new Error("GitHub kon de configuratie niet opslaan (HTTP "+response.status+").");
  }

  async function saveConfig(){
    validate();
    if(incentiveIssues().length){showIncentiveError();return;}
    const button=$("saveConfig"),status=$("saveStatus");
    if(button.disabled) return;
    button.disabled=true;
    try{
      const token=githubToken||await requestGithubToken();
      if(!token) return;
      status.textContent="Configuratie wordt opgeslagen op GitHub…";
      const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json"};
      const current=await fetch(configEndpoint+"?ref=main",{headers,cache:"no-store"});
      checkGithubResponse(current);
      const file=await current.json();
      if(parsePublishedConfig(file)!==savedConfig){
        throw new Error("De configuratie op GitHub is intussen gewijzigd. Download je wijzigingen als reservekopie en herlaad Admin.");
      }

      const text=content(),snapshot=JSON.stringify(state);
      const response=await fetch(configEndpoint,{
        method:"PUT",
        headers:{...headers,"Content-Type":"application/json"},
        body:JSON.stringify({branch:"main",sha:file.sha,message:"Update Diestroyers configuration from Admin",content:base64(text)})
      });
      checkGithubResponse(response);
      savedConfig=snapshot;
      rememberGithubToken(token);
      status.innerHTML='<div class="admin-ok">Opgeslagen op GitHub. De TV neemt de wijziging over zodra GitHub Pages de nieuwe configuratie heeft gepubliceerd.</div>';
    }catch(error){
      status.innerHTML='<div class="admin-warning">'+esc(error.message||"Opslaan op GitHub is mislukt.")+'</div>';
    }finally{
      button.disabled=false;
    }
  }

  function showIncentiveError(){
    $("saveStatus").innerHTML=`<div class="admin-warning">${incentiveIssues().map(esc).join("<br>")}</div>`;
  }

  function downloadConfig(){
    if(incentiveIssues().length){showIncentiveError();return;}
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([content()],{type:"text/javascript;charset=utf-8"}));
    a.download="config-data.js";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  document.addEventListener("DOMContentLoaded",init);
})();
