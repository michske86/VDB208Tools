/* Scoreblad-configuratiebeheer. Publiceert het bestaande config-data.js-formaat. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? "").trim().toLowerCase();
  const escape = value => String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const base = window.DIESTROYERS_CONFIG_DATA;
  const state = JSON.parse(JSON.stringify(base || {}));
  const monthly = window.DIESTROYERS_TV_INCENTIVES;
  const december = window.DIESTROYERS_DECEMBER;
  const resultEdits = window.ScorebladResultEdits;
  const archive = window.ScorebladArchief;
  const archiveReady = !base?.archiefVersie || archive.apply(window);
  let storedArchive = archiveReady && window.DIESTROYERS_ARCHIEF || {format:1,versie:"",maanden:{}};
  const configEndpoint = "https://api.github.com/repos/michske86/VDB208Tools/contents/Diestroyers/assets/config-data.js";
  const tokenKey = "diestroyers.admin.github-token";
  const adminCookie = "diestroyers_admin_open";
  const adminDigest = "cfc296e3e9d28185380f4a1ecbb6531be86f830f3f224785e6f23f7653fdfd91";
  const months = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
  const periodFormat = /^\d{4}-(0[1-9]|1[0-2])$/;
  const formatNumber = new Intl.NumberFormat("nl-BE",{maximumFractionDigits:2});
  const kpis = [
    ["OmzetTarget","Omzet","€"],["LifeTarget","Life","stuks"],["InsuranceTargetPct","Insurance","%"],
    ["AboTargetPct","Abonnementen","%"],["DSPTargetPct","DSP","%"],["SPGTargetPct","SPG","%"],
    ["SRPTargetPct","SRP","%"],["AccessoiresTargetPct","Accessoires","% van omzet"],["LinkTargetPct","Link","%"],
    ["MonsterTarget","Monster","€"],["NPSTarget","NPS","score"]
  ];
  const inactive = new Set(["nee","no","0","false","n","inactief"]);
  const active = row => !inactive.has(norm(row.Actief ?? row.actief ?? "ja"));
  const period = (year,index) => `${year}-${String(index+1).padStart(2,"0")}`;
  const alias = field => field[0].toLowerCase()+field.slice(1);
  const targetIdentity = new Set(["Periode","periode","EntiteitType","entiteitType","Naam","naam","ShopNr","shopNr"]);
  const sellerDrafts = new WeakSet();
  let published = JSON.stringify(base);
  let publishedCorrections = base?.resultaatCorrecties || [];
  let remembered = readToken();
  const chosenEntities = new Map();
  let chosenKpi = "life";
  let qualityGroup=null;

  function showEntry() {
    const app = $("adminApp"), dialog = $("adminEntry");
    const unlock = () => { app.inert = false; if (dialog.open) dialog.close(); $("adminSection").focus(); };
    if (document.cookie.split(";").some(item=>item.trim()===adminCookie+"=1")) {
      unlock();
      return;
    }
    const form = $("adminEntryForm"), input = $("adminPassword"), message = $("adminEntryMessage");
    const submit = form.querySelector("button");
    dialog.addEventListener("cancel",event=>event.preventDefault());
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        const bytes = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input.value));
        const hash = Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
        if (hash !== adminDigest) {
          message.textContent = "Dat wachtwoord klopt niet.";
          input.select();
          return;
        }
        const path = location.pathname.slice(0,location.pathname.lastIndexOf("/")+1);
        document.cookie = adminCookie+"=1; Path="+path+"; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");
        input.value = "";
        unlock();
      } catch {
        message.textContent = "Het wachtwoord kon niet worden gecontroleerd.";
      } finally {
        submit.disabled = false;
      }
    });
    dialog.showModal();
  }

  function updateShop() {
    const name = $("shopName").value.trim(), number = $("shopNr").value.trim();
    if (name && number) {
      for (const target of state.targets) if (norm(target.EntiteitType || target.entiteitType) === "winkel") {
        target.Naam = name;
        target.ShopNr = number;
      }
    }
    state.shop = {...state.shop,naam:name,shopNr:number};
    $("adminShop").textContent = [name,number].filter(Boolean).join(" · ");
  }

  const listDefinitions = {
    verkopers: {id:"sellerTable", name:"Naam", key:"PersoneelsNr", type:"verkoper", labels:[
      ["Naam","Naam"],["PersoneelsNr","Personeelsnummer"],["ShopNr","Winkelnummer"],["Avatar","Avatarbestand"],["ImportAlias","Importalias"],["Actief","Status"]
    ]},
    district: {id:"districtTable", name:"Winkel", key:"ShopNr", type:"districtwinkel", labels:[
      ["Winkel","Winkelnaam"],["ShopNr","Winkelnummer"],["Regio","Regio"],["Actief","Status"]
    ]}
  };
  function renderSellerArchive() {
    const sellerId = row => norm(row.PersoneelsNr || row.personeelsNr);
    const sellerName = row => row.Naam || row.naam;
    const candidates = [
      ...(window.DIESTROYERS_VERKOPERS || []),
      ...(window.DIESTROYERS_RESULTATEN || []).filter(row => norm(row.EntiteitType || row.entiteitType)==="verkoper")
    ];
    const archived = new Map();
    for (const row of candidates) {
      const name = sellerName(row), id = sellerId(row);
      if (!name || state.verkopers.some(seller => (id && sellerId(seller))
        ? sellerId(seller)===id : norm(sellerName(seller))===norm(name))) continue;
      const key = id || norm(name);
      if (!archived.has(key)) archived.set(key,{id,name});
    }
    const visible=[...archived.values()].filter(resultEdits.hasSellerHistory).map(person=>person.name);
    $("sellerArchive").hidden=!visible.length;
    $("archivedSellerTable").innerHTML=visible.sort((a,b)=>a.localeCompare(b,"nl-BE"))
      .map(name=>`<li class="score-row name-only"><span class="score-name">${escape(name)}</span></li>`).join("");
  }
  function renderRecords(kind, selected = -1) {
    const list = state[kind], definition = listDefinitions[kind];
    const sections = kind==="verkopers"
      ? [[$(definition.id),true,"Geen actieve verkopers."],[$("inactiveSellerTable"),false,"Geen gedeactiveerde verkopers in de configuratie."]]
      : [[$(definition.id),null,"Geen winkels."]];
    const renderRow = (entry,index) => {
      const fields = definition.labels.map(([key,label])=>key==="Actief"
        ? `<label class="score-field">${label}<select data-key="${key}"><option value="Ja"${active(entry)?" selected":""}>Actief</option><option value="Nee"${active(entry)?"":" selected"}>Inactief</option></select></label>`
        : `<label class="score-field">${label}<input data-key="${key}" value="${escape(entry[key] ?? entry[alias(key)])}"></label>`).join("");
      const action = kind==="district" ? "Winkel verwijderen" : active(entry) ? "Deactiveren" : "";
      const discard = sellerDrafts.has(entry) ? '<button type="button" class="score-button" data-discard>Nieuwe verkoper verwijderen</button>' : "";
      return `<details class="admin-record" data-record-index="${index}"${index===selected?" open":""}><summary>${escape(entry[definition.name] || entry[alias(definition.name)] || "Nieuw")}${active(entry)?"":"<small>Inactief</small>"}</summary>
        <div class="admin-editor"><div class="admin-grid">${fields}</div>${action?`<button type="button" class="score-button" data-remove>${action}</button>`:""}${discard}</div></details>`;
    };
    for (const [container,enabled,emptyMessage] of sections) {
      container.innerHTML=list.map((entry,index)=>enabled===null || active(entry)===enabled ? renderRow(entry,index) : "").join("")
        || `<p class="score-empty">${emptyMessage}</p>`;
    }
    sections.flatMap(([container])=>[...container.querySelectorAll("details")]).forEach(panel=>{
      const index = Number(panel.dataset.recordIndex);
      const entry = list[index];
      const summary = panel.querySelector("summary");
      const relocate = () => {
        renderRecords(kind);
        for (const [container] of sections) container.querySelector(`[data-record-index="${index}"] summary`)?.focus();
      };
      const updateSummary = () => {
        summary.textContent = entry[definition.name] || entry[alias(definition.name)] || "Nieuw";
        if (!active(entry)) {
          const status = document.createElement("small");
          status.textContent = "Inactief";
          summary.append(status);
        }
      };
      for (const field of panel.querySelectorAll("[data-key]")) field.onchange = () => {
        const key = field.dataset.key;
        const previous = entry[key] ?? entry[alias(key)];
        const value = field.value.trim();
        if (key===definition.name && value && list.some(other=>other!==entry && norm(other[key] ?? other[alias(key)])===norm(value))) {
          field.value=previous ?? "";
          status($("saveStatus"),["Deze naam komt al voor. Kies een unieke naam."]);
          return;
        }
        entry[key] = value;
        if (Object.hasOwn(entry,alias(key))) entry[alias(key)] = value;
        if (kind==="verkopers" && key==="Actief") {relocate();return;}
        if (key===definition.name && value && previous) for (const target of state.targets) {
          if (norm(target.EntiteitType || target.entiteitType)===definition.type && norm(target.Naam || target.naam)===norm(previous)) target.Naam=value;
        }
        if (key==="ShopNr" && value && previous) for (const target of state.targets) {
          if (norm(target.EntiteitType || target.entiteitType)===definition.type &&
            norm(target.Naam || target.naam)===norm(entry[definition.name] || entry[alias(definition.name)])) target.ShopNr=value;
        }
        updateSummary();
        if (kind==="verkopers" && (key==="Naam" || key==="PersoneelsNr")) renderSellerArchive();
      };
      const remove = panel.querySelector("[data-remove]");
      if (remove) remove.onclick = () => {
        if (kind==="verkopers") {
          entry.Actief="Nee";
          if (Object.hasOwn(entry,"actief")) entry.actief="Nee";
          relocate();
          return;
        } else if (!confirm("Deze winkel uit de districtconfiguratie verwijderen?")) return;
        else list.splice(index,1);
        renderRecords(kind);
      };
      const discard = panel.querySelector("[data-discard]");
      if (discard) discard.onclick = () => {
        list.splice(index,1);
        if (entry.Naam) state.targets = state.targets.filter(target => norm(target.EntiteitType || target.entiteitType)!=="verkoper" ||
          norm(target.Naam || target.naam)!==norm(entry.Naam));
        renderRecords(kind);
      };
    });
    if (kind==="verkopers") renderSellerArchive();
    if (selected>=0) for (const [container] of sections) container.querySelector("details[open] input")?.focus();
  }

  function entities(mode = $("targetMode").value) {
    if (mode==="winkel") return [{type:"Winkel", name:state.shop.naam, shopNr:state.shop.shopNr,id:String(state.shop.shopNr)}];
    if (mode==="district") return state.district.filter(active).map(row=>({type:"DistrictWinkel",name:row.Winkel||row.winkel,shopNr:String(row.ShopNr || row.shopNr || ""),id:String(row.ShopNr || row.shopNr || "")}));
    return state.verkopers.filter(active).map(row=>({type:"Verkoper",name:row.Naam||row.naam,shopNr:String(row.ShopNr || row.shopNr || state.shop.shopNr),id:String(row.PersoneelsNr || row.personeelsNr || "")}));
  }
  function linkedStoreTargets(entity) {
    const shopNr = norm(state.shop.shopNr);
    if (!shopNr || norm(entity.shopNr)!==shopNr || !["Winkel","DistrictWinkel"].includes(entity.type)) return null;
    const district = state.district.find(row=>norm(row.ShopNr || row.shopNr)===shopNr);
    if (!district) return null;
    return [{type:"Winkel",name:state.shop.naam,shopNr:state.shop.shopNr},
      {type:"DistrictWinkel",name:district.Winkel || district.Naam,shopNr:district.ShopNr || district.shopNr}];
  }
  function targetRows(entity,per,matchNumber = false) {
    return state.targets.filter(row=>{
      if ((row.Periode || row.periode)!==per || norm(row.EntiteitType || row.entiteitType)!==norm(entity.type)) return false;
      const number = norm(row.ShopNr || row.shopNr);
      if (matchNumber && number) return number===norm(entity.shopNr);
      return norm(row.Naam || row.naam)===norm(entity.name) && (!number || number===norm(entity.shopNr));
    });
  }
  function valueFor(row,field) {
    return row?.[field] ?? row?.[alias(field)];
  }
  function readTarget(entity,per,field) {
    const shared = linkedStoreTargets(entity);
    for (const item of shared || [entity]) {
      const rows = targetRows(item,per,Boolean(shared));
      for (const row of shared ? rows : rows.slice(0,1)) {
        const value = valueFor(row,field);
        if (value!==undefined && value!==null && value!=="") return value;
      }
    }
  }
  function setTarget(entity,per,field,value) {
    const shared = linkedStoreTargets(entity);
    for (const item of shared || [entity]) {
      let rows = targetRows(item,per,Boolean(shared));
      if (!shared) rows = rows.slice(0,1);
      if (!rows.length) {
        rows = [{Periode:per, EntiteitType:item.type, Naam:item.name, ShopNr:item.shopNr}];
        state.targets.push(...rows);
      }
      for (const row of rows) {
        row[field] = value;
        if (Object.hasOwn(row,alias(field))) row[alias(field)] = value;
      }
    }
  }
  function synchronizeStoreTargets() {
    const own = {type:"Winkel",name:state.shop.naam,shopNr:state.shop.shopNr};
    if (!linkedStoreTargets(own)) return;
    const periods = new Set(state.targets.map(row=>row.Periode || row.periode).filter(Boolean));
    for (const per of periods) {
      for (const [field] of kpis) {
        const value = readTarget(own,per,field);
        if (value!==undefined) setTarget(own,per,field,value);
      }
    }
  }
  function removeTarget(entity,per,field) {
    const shared=linkedStoreTargets(entity);
    for (const item of shared || [entity]) {
      const rows=targetRows(item,per,Boolean(shared));
      for (const row of shared ? rows : rows.slice(0,1)) {
        delete row[field];
        delete row[alias(field)];
        if (Object.keys(row).every(key=>targetIdentity.has(key))) state.targets.splice(state.targets.indexOf(row),1);
      }
    }
  }

  function corrections() {
    return Array.isArray(state.resultaatCorrecties) ? state.resultaatCorrecties : [];
  }
  function removeCorrection(entity,per,field) {
    const rows=corrections(), row=resultEdits.lookup(rows,entity,per);
    if (!row) return;
    delete row.waarden[field];
    if (row.verwacht) delete row.verwacht[field];
    if (!Object.keys(row.waarden).length) rows.splice(rows.indexOf(row),1);
    if (!rows.length) delete state.resultaatCorrecties;
  }
  function setCorrection(entity,per,field,value) {
    if (value===resultEdits.imported(entity,per,field)) { removeCorrection(entity,per,field);return; }
    const rows=corrections();
    let row=resultEdits.lookup(rows,entity,per);
    if (!row) {
      row={...resultEdits.canonical(entity),periode:per,naam:entity.name,shopNr:entity.shopNr,waarden:{},verwacht:{}};
      rows.push(row);
      state.resultaatCorrecties=rows;
    }
    row.waarden[field]=value;
    (row.verwacht ||= {})[field]=resultEdits.imported(entity,per,field);
  }

  function isArchived(period) {
    return Object.hasOwn(storedArchive.maanden,period);
  }

  function archivedDrafts() {
    return corrections().filter(row=>isArchived(row.periode));
  }

  function isResults() { return $("adminSection").value==="resultaten"; }
  function catalog() {
    return isResults() ? resultEdits.kpis : resultEdits.kpis.filter(kpi=>kpi.target);
  }
  function selectedEntities(items) {
    if ($("editorLayout").value==="kpi" || !$("targetEntity").value) return items;
    return items.filter(entity=>entity.id===$("targetEntity").value);
  }
  function targetField(kpi) {
    const entry=kpis.find(([key])=>key===kpi.target);
    return entry ? {key:kpi.target,label:"Target · "+entry[2],step:"any",min:0} : null;
  }
  function importedTarget(entity,per,field) {
    const row=resultEdits.importedRow(entity,per);
    const value=Number(row?.[field] ?? row?.[alias(field)]);
    if (value>0) return {value,source:"Excel"};
    if (entity.type==="DistrictWinkel" && String(entity.shopNr)===String(state.shop.shopNr)) {
      const own={type:"Winkel",name:state.shop.naam,shopNr:state.shop.shopNr};
      const fallback=Number(readTarget(own,per,field));
      if (fallback>0) return {value:fallback,source:"Winkeltarget"};
    }
    return {value:null,source:""};
  }
  function cellData(entity,kpi,per,showResults=isResults()) {
    const target=targetField(kpi);
    const set=target ? readTarget(entity,per,target.key) : undefined;
    const fallback=target ? importedTarget(entity,per,target.key) : {value:null,source:""};
    const targetValue=set ?? fallback.value;
    const correction=resultEdits.lookup(corrections(),entity,per);
    const resultFields=kpi.fields.map(field=>{
      const imported=resultEdits.imported(entity,per,field.key);
      const manual=correction?.waarden?.[field.key], expected=correction?.verwacht?.[field.key];
      return {...field,original:imported,value:manual ?? imported,overridden:manual!==undefined,archived:isArchived(per),
        conflict:manual!==undefined && imported!==manual && expected!==imported};
    });
    const chances=resultFields.find(field=>field.key.endsWith("Kansen"));
    const npsResponses=resultFields.find(field=>field.key==="NPSResponses");
    const noChances=chances?.value===0;
    const noSurveys=npsResponses?.value===0;
    const missingFields=resultFields.filter(field=>field.value===null && !(field.key==="NPS" && noSurveys));
    const measuredZero=resultFields[0]?.value===0 && (!chances || chances.value>0) && (!npsResponses || npsResponses.value>0);
    const missingTarget=Boolean(target && !(Number(targetValue)>0));
    return {
      entity,kpi,missingTarget,missingResult:missingFields.length>0,noChances,noSurveys,measuredZero,missingFields,
      fields:showResults ? resultFields : [{
        ...target,original:fallback.value,source:fallback.source,value:targetValue,overridden:set!==undefined
      }]
    };
  }
  function statusText(cell) {
    return [
      cell.missingTarget?"Ontbrekend target":null,
      cell.missingResult?"Ontbrekend cijfer":null,cell.noChances?"Geen geregistreerde kansen":null,
      cell.noSurveys?"Geen enquêtes":null,cell.measuredZero?"Gemeten nul":null
    ].filter(Boolean).join(" · ");
  }
  function editorEntities(mode=$("targetMode").value,withHistory=isResults()) {
    const items=entities(mode).filter(item=>item.name && item.id);
    if (!withHistory || mode!=="verkopers") return items;
    const known=new Set(items.map(item=>item.id));
    const configured=new Set(state.verkopers.map(row=>String(row.PersoneelsNr || row.personeelsNr || "").trim()));
    for (const row of [...state.verkopers,...(window.DIESTROYERS_RESULTATEN || []).filter(item=>norm(item.EntiteitType)==="verkoper")]) {
      const id=String(row.PersoneelsNr || row.personeelsNr || "").trim(), name=row.Naam || row.naam;
      if (!id || !name || known.has(id)) continue;
      known.add(id);
      if (!configured.has(id) && !resultEdits.hasSellerHistory({id,name})) continue;
      items.push({type:"Verkoper",id,name,displayName:name+" · historiek",shopNr:String(row.ShopNr || row.shopNr || state.shop.shopNr)});
    }
    return items;
  }
  function editorSelection() {
    const items=editorEntities();
    const definitions=catalog();
    const selected=definitions.find(item=>item.id===$("targetKpi").value) || definitions[0];
    return {
      entities:selectedEntities(items),
      definitions:$("editorLayout").value==="kpi" ? [selected].filter(Boolean) : definitions
    };
  }
  function editorCount(cells) {
    const results=cells.filter(item=>item.missingResult).length;
    const targets=cells.filter(item=>item.missingTarget).length;
    const withoutVolume=cells.filter(item=>item.noChances || item.noSurveys).length;
    const zero=cells.filter(item=>item.measuredZero).length;
    const total=cells.length;
    $("editorCount").textContent=total ? `${total} KPI’s · ${targets} zonder target · ${results} met ontbrekend cijfer · ${withoutVolume} zonder kansen of enquêtes · ${zero} gemeten nul` : "";
  }
  function visibleInFilter(item) {
    const filter=$("editorFilter").value;
    return filter==="all" || (filter==="targets" && item.missingTarget) || (filter==="results" && item.missingResult)
      || (filter==="no-volume" && (item.noChances || item.noSurveys)) || (filter==="zero" && item.measuredZero);
  }
  function renderTargets() {
    const items=editorEntities();
    const scope=$("targetMode").value, picker=$("targetEntity"), byKpi=$("editorLayout").value==="kpi";
    const mode=isResults(), definitions=catalog(), per=$("editorPeriod").value, editor=$("targetEditor");
    const saved=chosenEntities.get(scope);
    picker.innerHTML=(items.length>1?'<option value="">Alles in deze groep</option>':"")+
      items.map(item=>`<option value="${escape(item.id)}">${escape(item.displayName || item.name)}</option>`).join("");
    if (saved!==undefined && [...picker.options].some(option=>option.value===saved)) picker.value=saved;
    else if (items.length) picker.value=items[0].id;
    $("targetKpi").innerHTML=definitions.map(item=>`<option value="${item.id}">${item.label}</option>`).join("");
    if (definitions.some(item=>item.id===chosenKpi)) $("targetKpi").value=chosenKpi;
    $("editorKpiField").hidden=!byKpi;
    $("editorEntityField").hidden=byKpi || items.length<2;
    $("editorTitle").textContent=mode?"Resultaten aanpassen":"Targets";
    $("targetCopy").hidden=mode;
    const active=per>=resultEdits.closedMonth();
    const locked=mode && (active || Boolean(base?.archiefVersie && !isArchived(per)));
    const regional=mode && scope==="district";
    $("saveData").hidden=locked || regional;
    $("editorSource").textContent=mode
      ? regional ? "Districtsresultaten komen uit de actieve maand."
        : active ? "Resultaten voor de lopende en toekomstige maanden komen via Dagstart en zijn alleen-lezen."
        : !archiveReady ? "Het maandarchief kon niet worden geladen. Vernieuw Admin om resultaten te bewerken."
        : isArchived(per) ? "Correcties komen rechtstreeks in het maandarchief. NPS blijft gebaseerd op de enquêtes."
        : locked ? "Sluit deze maand eerst af in Archief om resultaten te bewerken."
        : "Opgeslagen correcties gaan bij de volgende Dagstart of website-update naar Excel."
      : "Vul meerdere targets achter elkaar in. Eigen winkel en dezelfde winkel in Districtswinkels delen één target.";
    $("editorPrev").disabled=$("editorNext").disabled=!periodFormat.test(per);
    if (!periodFormat.test(per) || !items.length) {
      editor.innerHTML='<p class="score-empty">Kies een geldige maand en een verkoper of winkel.</p>';
      editorCount([]);
      return;
    }
    const selection=editorSelection();
    const cells=selection.entities.flatMap(entity=>selection.definitions.map(kpi=>cellData(entity,kpi,per)));
    const cellIndexes=new Map(cells.map((cell,index)=>[cell,index]));
    editorCount(cells);
    const visible=cells.filter(visibleInFilter);
    if (!visible.length) {
      editor.innerHTML='<p class="score-empty">Geen resultaten voor deze filter.</p>';
      return;
    }
    const showPerson=byKpi || selection.entities.length>1;
    editor.innerHTML=visible.map((cell,index)=>{
      const {entity,kpi,fields}=cell;
      const status=statusText(cell);
      const readOnly=locked || regional || mode && kpi.id==="nps";
      const fieldsHtml=fields.map(field=>{
        const origin=fieldOrigin(field,mode);
        const canReset=!readOnly && field.overridden && (!mode || field.value!==field.original);
        return `<div class="admin-edit-field">
          <label class="score-field">${escape(field.label)}
            <input class="admin-edit-value" data-key="${field.key}" type="number" step="${field.step}"${field.min===undefined?"":` min="${field.min}"`}${field.max===undefined?"":` max="${field.max}"`}
              inputmode="${field.step==="1"?"numeric":"decimal"}" enterkeyhint="next" value="${escape(field.value??"")}" placeholder="–"${readOnly?" readonly":""}></label>
          <span class="score-muted" data-origin>${escape(origin)}</span>
          <button class="score-button admin-edit-reset" type="button" data-reset="${field.key}"${canReset?"":" hidden"}>${mode?"Intrekken":"Wis"}</button>
        </div>`;
      }).join("");
      return `<section class="admin-edit-row${mode?" results":""}" data-cell="${index}" data-admin-kpi="${escape(kpi.id)}">
        <div><h3>${escape(byKpi ? entity.name : kpi.label)}</h3>
          ${showPerson&&!byKpi?`<span class="score-muted">${escape(entity.name)}</span>`:""}
          <small class="score-muted"${status?"":" hidden"} data-result-status>${escape(status)}</small>
        </div>
        <div class="admin-edit-values">${fieldsHtml}</div>
      </section>`;
    }).join("");
    const inputs=[...editor.querySelectorAll(".admin-edit-value:not([readonly])")];
    for (const input of inputs) {
      const row=input.closest("[data-cell]");
      const previous=visible[Number(row.dataset.cell)];
      const {entity,kpi}=previous;
      const cellIndex=cellIndexes.get(previous);
      const key=input.dataset.key, reset=input.closest(".admin-edit-field").querySelector("[data-reset]");
      const origin=input.closest(".admin-edit-field").querySelector("[data-origin]");
      function updateField() {
        const cell=cellData(entity,kpi,per,mode);
        const data=cell.fields.find(field=>field.key===key);
        origin.textContent=fieldOrigin(data,mode);
        reset.hidden=!data.overridden || mode && data.value===data.original;
        const observed=row.querySelector("[data-result-status]");
        observed.textContent=statusText(cell);
        observed.hidden=!observed.textContent;
        cells[cellIndex]=cell;
        editorCount(cells);
        return data.value ?? "";
      }
      input.oninput=()=>{
        if (input.value==="" || !input.checkValidity()) return;
        if (mode) {
          if (!resultEdits.valid(entity.type,key,input.valueAsNumber)) return;
          setCorrection(entity,per,key,input.valueAsNumber);
        } else setTarget(entity,per,key,input.valueAsNumber);
        updateField();
      };
      input.onblur=()=>{
        if (input.value==="" || !input.checkValidity()) input.value=updateField();
      };
      input.onkeydown=event=>{
        if (event.key!=="Enter") return;
        event.preventDefault();
        const next=inputs[inputs.indexOf(input)+1];
        if (next) { next.focus();next.select(); }
      };
      reset.onclick=()=>{
        if (mode) removeCorrection(entity,per,key);
        else removeTarget(entity,per,key);
        input.value=updateField();
        input.focus();
      };
    }
  }
  function fieldOrigin(field, mode) {
    if (!field.overridden) return field.value===null ? "Ontbreekt" : (field.source || (mode && field.archived?"Archief":"Excel"));
    if (mode && field.archived) return "Nog op te slaan in Archief";
    if (mode && field.conflict) return "Bron gewijzigd · "+(field.original===null?"leeg":formatNumber.format(field.original));
    if (mode) return field.value===field.original ? "Verwerkt in Excel"
      : field.original===null ? "Wacht op Excel" : "Wacht op Excel · bron "+formatNumber.format(field.original);
    return field.original===null ? "Eigen target" : "Eigen target · bron "+formatNumber.format(field.original);
  }
  function stepPeriod(offset) {
    const input=$("editorPeriod");
    if (!periodFormat.test(input.value)) return;
    const [year,month]=input.value.split("-").map(Number);
    const next=new Date(Date.UTC(year,month-1+offset,1));
    input.value=period(next.getUTCFullYear(),next.getUTCMonth());
    renderTargets();
  }
  function copyTargets(previousYear) {
    const per=$("editorPeriod").value;
    if (!periodFormat.test(per)) return;
    const year=Number(per.slice(0,4));
    if (!confirm(previousYear?"Targets voor deze verkopers of winkels en KPI’s van vorig jaar kopiëren?":"Targets uit januari voor deze verkopers of winkels en KPI’s naar alle maanden kopiëren?")) return;
    const selection=editorSelection();
    for (const entity of selection.entities) months.forEach((_,index)=>{
      if (!previousYear && index===0) return;
      const source=period(year-(previousYear?1:0),previousYear?index:0);
      for (const kpi of selection.definitions) {
        const value=readTarget(entity,source,kpi.target);
        if (value!==undefined) setTarget(entity,period(year,index),kpi.target,value);
      }
    });
    renderTargets();
  }

  function showIncentives(selected = -1) {
    const container = $("tvIncentiveTable");
    const totals = monthly.monthlyCounts(window.DIESTROYERS_RESULTATEN || [],window.DIESTROYERS_HISTORIEK_MAAND || [],state.shop);
    const report = [...totals.keys()].sort().at(-1);
    container.innerHTML = state.tvIncentives.map((entry,index)=>`<details class="admin-record"${index===selected?" open":""}>
      <summary>${escape(entry.name || "Nieuwe incentive")}</summary>
      <div class="admin-editor">
        <label class="admin-checkbox"><input data-field="active" type="checkbox"${entry.active?" checked":""}> Actief op TV</label>
        <div class="admin-grid">
          <label class="score-field">Naam<input data-field="name" maxlength="55" value="${escape(entry.name)}"></label>
          <label class="score-field">Startdatum<input data-field="startDate" type="date" value="${escape(entry.startDate)}"></label>
          <label class="score-field">Einddatum<input data-field="endDate" type="date" value="${escape(entry.endDate)}"></label>
          <label class="score-field">Doel in stuks<input data-field="goal" type="number" min="1" max="500" step="1" value="${escape(entry.goal)}"></label>
        </div>
        <p class="score-muted" data-progress></p>
        <button class="score-button" data-remove type="button">Incentive verwijderen</button>
      </div></details>`).join("") || '<p class="score-empty">Geen incentives ingesteld.</p>';
    [...container.querySelectorAll("details")].forEach((panel,index)=>{
      const entry = state.tvIncentives[index], progress = panel.querySelector("[data-progress]");
      function update() {
        if (!monthly.valid(entry)) { progress.textContent="Controleer de instellingen."; return; }
        const counts = monthly.progress(entry,totals,report);
        progress.textContent = counts.available ? `Winkelstand: ${counts.life+counts.insurance} / ${entry.goal}${counts.missing?" · onvolledig":""}` : "Nog geen resultaten.";
      }
      for (const input of panel.querySelectorAll("[data-field]")) input.oninput=()=>{
        entry[input.dataset.field]=input.type==="checkbox"?input.checked:input.type==="number"?input.valueAsNumber:input.value;
        panel.querySelector("summary").textContent=entry.name || "Nieuwe incentive";
        update();
      };
      panel.querySelector("[data-remove]").onclick=()=>{
        if (!confirm("Deze incentive verwijderen?")) return;
        state.tvIncentives.splice(index,1);
        showIncentives();
      };
      update();
    });
    if (selected>=0) container.querySelector("details[open] input[data-field=name]")?.focus();
  }
  function addIncentive() {
    const date = new Date(), year = date.getFullYear(), month = date.getMonth();
    const start = period(year,month);
    state.tvIncentives.push({name:"Incentive "+months[month],active:false,startDate:start+"-01",endDate:start+"-"+new Date(year,month+1,0).getDate(),goal:110});
    showIncentives(state.tvIncentives.length-1);
  }

  function bindDecember() {
    const fields = {decemberActive:"active",decemberStart:"startDate",decemberEnd:"endDate"};
    const button = $("decemberOpenAll");
    let rule = state.decemberIncentive || december.defaults(), staged;
    const update = () => {
      const issues = december.issues(rule);
      const result = issues.length ? null : december.snapshot(rule,[],null);
      button.disabled = !(rule.active && result?.pending);
      $("decemberStatus").textContent = issues.join(" ") ||
        (staged && result?.today?.date===staged ? "Sla de wijzigingen op om het deurtje op alle schermen te openen." :
          result?.today ? "Het deurtje van vandaag is geopend in deze configuratie." : "");
    };
    button.onclick = () => {
      const pending = december.snapshot(rule,[],null).pending;
      if (!rule.active || !pending) return;
      staged = pending.date;
      state.decemberIncentive = rule;
      rule.openedDates = [...(Array.isArray(rule.openedDates)?rule.openedDates:[]),staged];
      update();
    };
    for (const [id,key] of Object.entries(fields)) {
      const input = $(id);
      if (input.type==="checkbox") input.checked=rule[key]===true;
      else input.value=rule[key] ?? "";
      input.oninput=()=>{
        state.decemberIncentive=rule;
        rule[key]=input.type==="checkbox"?input.checked:input.value;
        update();
      };
    }
    update();
  }

  function issues() {
    updateShop();
    const errors = [];
    if (!base) errors.push("De bestaande configuratie is niet geladen.");
    if (!archiveReady) errors.push("Het maandarchief kon niet worden ingelezen. Vernieuw Admin.");
    if (!state.shop.shopNr || !state.shop.naam) errors.push("Vul de winkelnaam en het winkelnummer in.");
    for (const [kind,definition] of Object.entries(listDefinitions)) {
      const keys = new Set(), names = new Set();
      for (const entry of state[kind]) {
        const name = norm(entry[definition.name] ?? entry[alias(definition.name)]);
        const key = norm(entry[definition.key] ?? entry[alias(definition.key)]);
        const label = entry[definition.name] || entry[definition.key] || kind;
        if (!name || !key) errors.push(label+": vul naam en nummer in.");
        if (key && keys.has(key)) errors.push(label+": dit nummer komt meermaals voor.");
        if (name && names.has(name)) errors.push(label+": deze naam komt meermaals voor.");
        if (key) keys.add(key);
        if (name) names.add(name);
      }
    }
    for (const [index,entry] of state.tvIncentives.entries()) {
      const label = entry.name?.trim() || "Incentive "+(index+1);
      const dateIssue = monthly.dateError(entry);
      if (!entry.name?.trim()) errors.push(label+": naam ontbreekt.");
      if (!monthly.validGoal(entry.goal)) errors.push(label+": vul een geheel doel tussen 1 en 500 in.");
      if (dateIssue) errors.push(label+": "+dateIssue);
    }
    for (const row of corrections()) {
      if (!periodFormat.test(row.periode) || row.periode>=resultEdits.closedMonth() || !row.id ||
        Object.entries(row.waarden || {}).some(([key,value])=>!resultEdits.valid(row.type,key,value))) {
        errors.push("Een resultaatcorrectie bevat een ongeldige waarde of periode. Controleer Resultaten aanpassen.");
        break;
      }
    }
    if (state.decemberIncentive) errors.push(...december.issues(state.decemberIncentive));
    return errors;
  }
  function status(element,messages,ok=false) {
    element.innerHTML = `<div class="${ok?"admin-ok":"admin-warning"}">${messages.map(escape).join("<br>")}</div>`;
  }
  function validate() {
    const errors = issues();
    status($("validationOutput"),errors.length?errors:["Geen blokkerende fouten gevonden."],!errors.length);
    return errors;
  }

  function readToken() { try { return sessionStorage.getItem(tokenKey)||""; } catch { return ""; } }
  function rememberToken(value) {
    remembered=value;
    try {
      if (value) sessionStorage.setItem(tokenKey,value);
      else sessionStorage.removeItem(tokenKey);
    } catch { /* Opslaan blijft mogelijk zonder browseropslag. */ }
  }
  function requestToken() {
    const dialog = $("githubSaveDialog"), field = $("githubSaveToken");
    dialog.querySelector("form").reset();
    dialog.returnValue="";
    return new Promise(resolve=>{
      dialog.addEventListener("close",()=>{
        const token=dialog.returnValue==="publish"?field.value.trim():"";
        field.value="";
        resolve(token);
      },{once:true});
      dialog.showModal();
    });
  }
  function parseConfig(file) {
    if (file.encoding!=="base64" || !file.sha) throw new Error("GitHub gaf geen leesbare configuratie terug.");
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g,"")),char=>char.charCodeAt(0));
    const source = new TextDecoder().decode(bytes);
    const match = source.match(/^\s*window\.DIESTROYERS_CONFIG_DATA\s*=\s*([\s\S]+);\s*$/);
    if (!match) throw new Error("De configuratie op GitHub heeft een ongeldige indeling.");
    return JSON.stringify(JSON.parse(match[1]));
  }
  function base64(text) {
    let bytes="";
    for (const byte of new TextEncoder().encode(text)) bytes+=String.fromCharCode(byte);
    return btoa(bytes);
  }
  function checkResponse(response) {
    if (response.ok) return;
    if ([401,403,404].includes(response.status)) {
      rememberToken("");
      throw new Error("GitHub weigert toegang. Controleer de schrijfrechten van je token voor Contents.");
    }
    if ([409,422].includes(response.status)) throw new Error("GitHub accepteerde de wijziging niet. Download je versie en herlaad Admin.");
    throw new Error("GitHub kon de configuratie niet opslaan (HTTP "+response.status+").");
  }
  function snapshot() {
    synchronizeStoreTargets();
    return {...state,version:new Date().toISOString(),source:"admin"};
  }
  function serialize(data) {
    return "window.DIESTROYERS_CONFIG_DATA = "+JSON.stringify(data,null,2)+";\n";
  }
  async function publishArchive(headers,saved,changes) {
    const repo="https://api.github.com/repos/michske86/VDB208Tools";
    const request=async url=>{
      const response=await fetch(url,{headers,cache:"no-store"});
      checkResponse(response);
      return response.json();
    };
    const head=(await request(repo+"/git/ref/heads/main")).object?.sha;
    if (!/^[a-f0-9]{40}$/.test(head||"")) throw new Error("De GitHub-versie kon niet worden gecontroleerd.");
    const pinned=await request(configEndpoint+"?ref="+head);
    if (parseConfig(pinned)!==published) throw new Error("De configuratie is intussen gewijzigd. Vernieuw Admin.");
    const stamp=new Date();
    const next=structuredClone(storedArchive);
    next.versie=stamp.toISOString();
    for (const draft of changes) archive.update(next.maanden[draft.periode],draft,resultEdits,String(state.shop.shopNr),stamp);
    saved.archiefVersie=next.versie;
    const periods=new Set(changes.map(row=>row.periode));
    const files=[
      ["assets/config-data.js",serialize(saved)],["assets/archief-data.js",archive.project(next)],
      ...[...periods].map(period=>["archief/"+period+".json",JSON.stringify(next.maanden[period],null,2)+"\n"])
    ];
    const response=await fetch("https://api.github.com/graphql",{method:"POST",headers:{...headers,"Content-Type":"application/json"},
      body:JSON.stringify({
        query:"mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid}}}",
        variables:{input:{branch:{repositoryNameWithOwner:"michske86/VDB208Tools",branchName:"main"},expectedHeadOid:head,
          message:{headline:"Corrigeer Diestroyers-maandarchief"},
          fileChanges:{additions:files.map(([path,content])=>({path:"Diestroyers/"+path,contents:base64(content)}))}}}
      })});
    checkResponse(response);
    const result=await response.json();
    if (!result.data?.createCommitOnBranch?.commit?.oid) throw new Error("GitHub kon het archief niet opslaan. Vernieuw Admin als er intussen nieuwe cijfers zijn.");
    storedArchive=next;
    window.DIESTROYERS_ARCHIEF=next;
    window.DIESTROYERS_CONFIG_DATA=saved;
    archive.apply(window);
    state.archiefVersie=next.versie;
  }
  async function save(event) {
    const buttons=[$("saveConfig"),$("saveData")];
    if (buttons.some(button=>button.disabled)) return;
    const output=event?.currentTarget?.id==="saveData"?$("editorSaveStatus"):$("saveStatus"), errors=validate();
    if (errors.length) { status(output,errors); return; }
    buttons.forEach(button=>{button.disabled=true;});
    $("targetEditor").inert=true;
    try {
      const token = remembered || await requestToken();
      if (!token) return;
      output.textContent="Configuratie wordt opgeslagen op GitHub…";
      const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json"};
      const pendingErrors = validate();
      if (pendingErrors.length) { status(output,pendingErrors); return; }
      const saved=structuredClone(snapshot());
      const submittedDrafts=state.verkopers.filter(person=>sellerDrafts.has(person));
      const items=archivedDrafts();
      if (items.length) {
        const keep=corrections().filter(row=>!items.includes(row));
        if (keep.length) saved.resultaatCorrecties=keep;
        else delete saved.resultaatCorrecties;
        await publishArchive(headers,saved,items);
        if (keep.length) state.resultaatCorrecties=keep;
        else delete state.resultaatCorrecties;
      } else {
        const current=await fetch(configEndpoint+"?ref=main",{headers,cache:"no-store"});
        checkResponse(current);
        const file=await current.json();
        if (parseConfig(file)!==published) throw new Error("De configuratie is intussen gewijzigd. Download je versie en herlaad Admin.");
        const response=await fetch(configEndpoint,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},
          body:JSON.stringify({branch:"main",sha:file.sha,message:"Update Diestroyers configuration from Admin",content:base64(serialize(saved))})});
        checkResponse(response);
      }
      const sent=JSON.stringify(saved);
      published=sent;
      publishedCorrections=JSON.parse(sent).resultaatCorrecties || [];
      submittedDrafts.forEach(person=>sellerDrafts.delete(person));
      renderRecords("verkopers");
      if (["targets","resultaten"].includes($("adminSection").value)) renderTargets();
      if ($("adminSection").value==="archief") renderArchive();
      rememberToken(token);
      status(output,[items.length?"Opgeslagen in het maandarchief. De website en TV lezen dit na de publicatie van GitHub Pages."
        : "Opgeslagen op GitHub. De wijziging wordt zichtbaar nadat GitHub Pages de configuratie heeft gepubliceerd."],true);
    } catch (error) {
      status(output,[error.message || "Opslaan op GitHub is mislukt."]);
    } finally {
      $("targetEditor").inert=false;
      buttons.forEach(button=>{button.disabled=false;});
    }
  }
  function download() {
    if (archivedDrafts().length) {
      status($("saveStatus"),["Sla de archiefcorrecties op en download de maand daarna via Archief."]);
      return;
    }
    const errors = validate();
    if (errors.length) { status($("saveStatus"),errors); return; }
    const link = document.createElement("a");
    link.href=URL.createObjectURL(new Blob([serialize(snapshot())],{type:"text/javascript;charset=utf-8"}));
    link.download="config-data.js";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  function awaitingExcel(period) {
    return publishedCorrections.some(row=>row.periode===period && Object.entries(row.waarden || {}).some(([key,value])=>
      resultEdits.imported({id:row.id,type:row.type,name:row.naam},period,key)!==value));
  }

  function renderArchive() {
    const container=$("archiveMonths");
    if (!archiveReady) {
      container.innerHTML='<p class="admin-warning">Het archief kon niet worden ingelezen. Vernieuw Admin.</p>';
      return;
    }
    const label=new Intl.DateTimeFormat("nl-BE",{month:"long",year:"numeric",timeZone:"UTC"});
    const current=archive.currentMonth();
    const periods=[...new Set([...archive.periods(),...Object.keys(storedArchive.maanden)])].sort().reverse();
    const publishedTo=window.DIESTROYERS_IMPORT_STATUS?.winkelTot;
    container.innerHTML=(publishedTo?`<p class="score-muted">Laatste gepubliceerde winkelstand t.e.m. ${escape(publishedTo)}.</p>`:"")+
      (periods.length?'<div class="admin-records">'+periods.map(period=>{
        const item=storedArchive.maanden[period];
        const name=label.format(new Date(period+"-01T00:00:00Z"));
        const waiting=awaitingExcel(period);
        const descriptor=item?`Afgesloten · ${item.resultaten.length} resultaatrijen · ${item.wijzigingen.length} correcties`
          : period>=current?"Lopende maand · via Dagstart":waiting?"Wacht op oudere Excel-correctie":"Wacht op afsluiting via Dagstart";
        const recent=item?.wijzigingen.slice(-10).reverse()||[];
        const history=recent.length?`<div class="admin-editor"><strong>Laatste correcties</strong><ul>${recent.map(change=>{
          const member=item.resultaten.find(row=>change.type==="Winkel"
            ? norm(row.EntiteitType)==="winkel"
            : String(row.PersoneelsNr||row.personeelsNr)===change.id);
          const previous=change.van===null?"leeg":formatNumber.format(change.van);
          return `<li>${escape((member?.Naam||change.id)+" · "+change.kpiVeld+" · "+previous+" → "+formatNumber.format(change.naar)+" · "+change.op.slice(0,10))}</li>`;
        }).join("")}</ul></div>`:"";
        return `<details class="admin-record"><summary>${escape(name)} <small>${escape(descriptor)}</small></summary>
          <div class="admin-editor admin-actions">
          <a class="score-button" href="home.html#resultaten?periode=${period}">Bekijk resultaten</a>
          ${item?`<button type="button" class="score-button primary" data-edit-month="${period}">Bewerk resultaten</button>
            <button type="button" class="score-button" data-download-month="${period}">Download JSON</button>
            <small class="score-muted">Afgesloten op ${escape(item.afgeslotenOp.slice(0,10))}.</small>`:""}
          </div>${history}</details>`;
      }).join("")+"</div>":'<p class="score-empty">Er zijn nog geen resultaten.</p>');
    for (const button of container.querySelectorAll("[data-edit-month]")) button.onclick=()=>{
      $("adminSection").value="resultaten";
      $("editorPeriod").value=button.dataset.editMonth;
      $("targetMode").value="winkel";
      $("editorFilter").value="all";
      showSection();
    };
    for (const button of container.querySelectorAll("[data-download-month]")) button.onclick=()=>{
      const period=button.dataset.downloadMonth;
      const link=document.createElement("a");
      link.href=URL.createObjectURL(new Blob([JSON.stringify(storedArchive.maanden[period],null,2)+"\n"],{type:"application/json"}));
      link.download="Diestroyers-"+period+".json";
      link.click();
      setTimeout(()=>URL.revokeObjectURL(link.href),1000);
    };
  }

  function renderQuality() {
    const per=$("qualityPeriod").value, scope=$("qualityScope").value;
    const published=window.DIESTROYERS_IMPORT_STATUS || {};
    const districtPeriod=(window.DIESTROYERS_DISTRICT || []).map(row=>row.Periode).sort().at(-1);
    const closed=per<resultEdits.closedMonth();
    const sources=[
      ["Omzetgegevens t.e.m.",published.omzetTot],
      ["Winkelgegevens t.e.m.",published.winkelTot],
      ["Resultatencontrole uitgevoerd",published.checkedAt,published.valid===false?"Controle meldde een probleem":null],
      ["Regionale resultaten · periode",districtPeriod],
      ["NPS-export opgebouwd",window.DIESTROYERS_NPS?.generatedAt],
      ["Akte Van Vertrouwen-export opgebouwd",window.DIESTROYERS_AVV?.generatedAt],
      ["Portfolio-export opgebouwd",window.DIESTROYERS_PORTFOLIO_STATUS?.generatedAt,
        window.DIESTROYERS_PORTFOLIO_STATUS?.available===false?"Portfolio niet beschikbaar":null]
    ];
    const shortDate=new Intl.DateTimeFormat("nl-BE",{day:"numeric",month:"short",timeZone:"UTC"});
    const shortMonth=new Intl.DateTimeFormat("nl-BE",{month:"short",year:"numeric",timeZone:"UTC"});
    $("qualitySources").innerHTML='<h3>Gepubliceerde bronstanden</h3><dl class="score-source-list">'+sources.map(([label,value,note])=>{
      const date=String(value||"");
      const day=date.slice(0,10);
      const monthOnly=periodFormat.test(date);
      const at=new Date((monthOnly?date+"-01":day)+"T00:00:00Z");
      const formatted=isNaN(at)?"Onbekend":(monthOnly?shortMonth:shortDate).format(at);
      return `<div><dt>${escape(label)}${note?`<small class="admin-source-warning">${escape(note)}</small>`:""}</dt>
        <dd>${value?`<time datetime="${escape(date.replace(" ","T"))}" title="${escape(date.replace("T"," "))}">${escape(formatted)}</time>`:formatted}</dd></div>`;
    }).join("")+'</dl>';
    if (!periodFormat.test(per)) {
      $("qualityResults").innerHTML='<p class="score-empty">Kies een geldige maand.</p>';
      return;
    }
    const targetPeople=entities(scope).filter(entity=>entity.id && entity.name);
    const targetIds=new Set(targetPeople.map(entity=>entity.id));
    const resultsAvailable=scope!=="district" || per===districtPeriod;
    const people=(resultsAvailable?editorEntities(scope,true):targetPeople).filter(entity=>
      targetIds.has(entity.id) || resultEdits.lookup(corrections(),entity,per) || (closed && resultEdits.kpis.some(kpi=>kpi.fields.some(field=>
        resultEdits.imported(entity,per,field.key)!==null))));
    const missingTargets=[], missingResults=[], knownStates=[], statuses=[];
    for (const entity of people) {
      for (const kpi of resultEdits.kpis) {
        const checks=cellData(entity,kpi,per,true);
        if (targetIds.has(entity.id) && checks.missingTarget) missingTargets.push({entity,kpi,mode:"targets",label:"Geen target"});
        if (!resultsAvailable) continue;
        const absent=checks.missingFields;
        if (absent.length) missingResults.push({entity,kpi,mode:"resultaten",
          label:absent.map(field=>field.label).join(", "),field:absent[0].key});
        if (checks.noChances || checks.noSurveys || checks.measuredZero) knownStates.push({entity,kpi,mode:"resultaten",
          label:[checks.noChances?"Geen geregistreerde kansen":null,checks.noSurveys?"Geen enquêtes":null,
            checks.measuredZero?"Gemeten nul":null].filter(Boolean).join(" · ")});
        const saved=resultEdits.lookup(publishedCorrections,entity,per);
        for (const field of checks.fields.filter(field=>field.overridden)) {
          const progress=saved?.waarden?.[field.key]===field.value?fieldOrigin(field,true):"Nog op te slaan in Admin";
          statuses.push({entity,kpi,mode:"resultaten",label:field.label+" · "+progress,field:field.key});
        }
      }
    }
    const groups=[
      {key:"targets",label:"Ontbrekende targets",items:missingTargets},
      {key:"resultaten",label:"Ontbrekende resultaten",items:resultsAvailable?missingResults:null},
      {key:"status",label:"Nul of geen kansen",items:resultsAvailable?knownStates:null},
      {key:"correcties",label:isArchived(per)?"Correcties in het archief":"Correcties in Excel",items:statuses}
    ];
    if (!groups.some(group=>group.key===qualityGroup && group.items)) {
      qualityGroup=(groups.find(group=>group.items?.length) || groups[0]).key;
    }
    const qualityList=({key,label,items})=>`<section class="score-quality-panel" id="quality-${key}" data-quality-panel="${key}"${key!==qualityGroup?" hidden":""}>
      <h3>${escape(label)}</h3>
      ${items?.length?'<ul class="score-list">'+items.map(({entity,kpi,mode,label,field})=>
        `<li><button type="button" class="score-row name-only" data-quality-mode="${mode}" data-quality-id="${escape(entity.id)}"
          data-quality-kpi="${escape(kpi.id)}" data-quality-key="${escape(field||"")}"><span class="score-name">
          <span>${escape(entity.name+" · "+kpi.label)}<small class="score-meta">${escape(label)}</small></span></span></button></li>`).join("")+'</ul>':
        '<p class="score-empty">Geen meldingen.</p>'}</section>`;
    $("qualityResults").innerHTML=`<div class="score-quality-list">
      <div class="score-quality-counts" role="group" aria-label="Datakwaliteit filteren">${groups.map(({key,label,items})=>
        `<button type="button" data-quality-group="${key}" aria-controls="quality-${key}" aria-pressed="${key===qualityGroup}"${items?"":" disabled"}>
          <strong>${items?.length??"—"}</strong><span>${escape(label)}</span></button>`).join("")}</div>
      ${resultsAvailable?"":'<p class="score-muted">Districtsresultaten zijn beschikbaar voor de laatst gepubliceerde maand.</p>'}
      ${groups.map(qualityList).join("")}</div>`;
  }

  function openQualityItem(event) {
    const group=event.target.closest("[data-quality-group]");
    if (group && !group.disabled) {
      qualityGroup=group.dataset.qualityGroup;
      for (const control of $("qualityResults").querySelectorAll("[data-quality-group]")) {
        control.setAttribute("aria-pressed",String(control===group));
      }
      for (const panel of $("qualityResults").querySelectorAll("[data-quality-panel]")) {
        panel.hidden=panel.dataset.qualityPanel!==qualityGroup;
      }
      return;
    }
    const item=event.target.closest("[data-quality-mode]");
    if (!item) return;
    const {qualityMode,qualityId,qualityKpi,qualityKey}=item.dataset;
    const scope=$("qualityScope").value;
    $("adminSection").value=qualityMode;
    $("targetMode").value=scope;
    $("editorPeriod").value=$("qualityPeriod").value;
    $("editorFilter").value="all";
    $("editorLayout").value="entity";
    chosenEntities.set(scope,qualityId);
    showSection();
    const row=$("targetEditor").querySelector(`[data-admin-kpi="${CSS.escape(qualityKpi)}"]`);
    const field=qualityKey?row?.querySelector(`[data-key="${CSS.escape(qualityKey)}"]`):row?.querySelector("input");
    if (field) {
      field.scrollIntoView({block:"center"});
      field.focus({preventScroll:true});
    }
  }

  function showSection() {
    const current = $("adminSection").value;
    const editor=current==="targets" || current==="resultaten";
    for (const panel of document.querySelectorAll(".admin-section")) panel.hidden=panel.id!==(editor?"targets":current);
    $("saveConfig").hidden=editor || ["datakwaliteit","archief"].includes(current);
    if (editor) { updateShop(); renderTargets(); }
    if (current==="datakwaliteit") renderQuality();
    if (current==="archief") renderArchive();
    if (current==="tv-incentives") { updateShop(); showIncentives(); }
    if (current==="validatie") validate();
  }
  function init() {
    state.shop ??= {shopNr:"208",naam:"Diest"};
    for (const key of ["district","verkopers","targets","tvIncentives"]) if (!Array.isArray(state[key])) state[key]=[];
    $("shopNr").value=state.shop.shopNr || "";
    $("shopName").value=state.shop.naam || "";
    $("adminShop").textContent=[state.shop.naam,state.shop.shopNr].filter(Boolean).join(" · ");
    $("shopNr").onchange=updateShop;
    $("shopName").onchange=updateShop;
    $("adminSection").onchange=showSection;
    $("addSeller").onclick=()=>{
      const person={Naam:"",PersoneelsNr:"",ShopNr:state.shop.shopNr,Avatar:"",Actief:"Ja",ImportAlias:""};
      sellerDrafts.add(person);
      state.verkopers.push(person);
      renderRecords("verkopers",state.verkopers.length-1);
    };
    $("addDistrict").onclick=()=>{
      state.district.push({ShopNr:"",Winkel:"",Regio:"Regio",Actief:"Ja"});
      renderRecords("district",state.district.length-1);
    };
    $("addTvIncentive").onclick=addIncentive;
    const date=new Date();
    const latest=(window.DIESTROYERS_RESULTATEN || [])
      .filter(row=>norm(row.EntiteitType || row.entiteitType)==="winkel" && periodFormat.test(row.Periode))
      .map(row=>row.Periode).sort().at(-1);
    $("editorPeriod").value=latest || period(date.getFullYear(),date.getMonth());
    $("qualityPeriod").value=$("editorPeriod").value;
    $("qualityPeriod").onchange=$("qualityScope").onchange=renderQuality;
    $("qualityResults").onclick=openQualityItem;
    for (const key of ["editorPeriod","targetMode","editorLayout","editorFilter"]) $(key).onchange=renderTargets;
    $("targetEntity").onchange=()=>{
      chosenEntities.set($("targetMode").value,$("targetEntity").value);
      renderTargets();
    };
    $("targetKpi").onchange=()=>{
      chosenKpi=$("targetKpi").value;
      renderTargets();
    };
    $("editorPrev").onclick=()=>stepPeriod(-1);
    $("editorNext").onclick=()=>stepPeriod(1);
    $("saveData").onclick=save;
    $("copyPreviousYear").onclick=()=>copyTargets(true);
    $("copyJanuaryTargets").onclick=()=>copyTargets(false);
    $("saveConfig").onclick=save;
    $("downloadConfig").onclick=download;
    $("validateConfig").onclick=()=>{ $("adminSection").value="validatie"; showSection(); };
    renderRecords("verkopers");
    renderRecords("district");
    bindDecember();
    if (new URLSearchParams(location.search).get("sectie")==="archief") $("adminSection").value="archief";
    showSection();
    showEntry();
  }
  document.addEventListener("DOMContentLoaded",init,{once:true});
})();
