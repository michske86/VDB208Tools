/* Source-dated revenue is independent of the services snapshot. */
(function(root){
  'use strict';
  function revenueView(payload, importStatus, reportDate, today){
    const p=payload||{}, end=String(p.omzetTot||''), previous=String(p.omzetVorigeTot||'');
    const iso=/^\d{4}-\d{2}-\d{2}$/;
    const validDate=t=>iso.test(t)&&!Number.isNaN(Date.parse(t+'T12:00:00Z'))&&new Date(t+'T12:00:00Z').toISOString().slice(0,10)===t;
    let reason=p.reason||'Betrouwbare omzetvergelijking ontbreekt; voer Dagstart uit.';
    let available=p.version===1&&p.available===true&&validDate(end)&&validDate(previous)&&previous<end&&end<today;
    if(importStatus?.omzetTot&&end!==String(importStatus.omzetTot)){
      available=false;reason='Omzetverschil hoort niet bij de laatste omzetbron; voer Dagstart uit.';
    }
    if(end&&reportDate&&end<reportDate){available=false;reason='Omzetbron loopt achter op de getoonde services.';}
    const sellers=new Map((Array.isArray(p.sellers)?p.sellers:[]).map(x=>[String(x.id),x]));
    let label='Omzet';
    if(available){
      const next=new Date(previous+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
      const start=next.toISOString().slice(0,10);
      label=start===end?'Omzet '+end:'Omzet '+start+' t/m '+end;
      reason=label+' · verschil tussen bronstanden t/m '+previous+' en '+end;
    }
    return {available,label,reason,value(id){
      const x=sellers.get(String(id));
      return available&&x?.available===true&&typeof x.omzet==='number'&&Number.isFinite(x.omzet)?x.omzet:null;
    }};
  }
  root.DIESTROYERS_REVENUE_VIEW=revenueView;
  if(typeof module!=='undefined'&&module.exports)module.exports=revenueView;
})(typeof window!=='undefined'?window:globalThis);
