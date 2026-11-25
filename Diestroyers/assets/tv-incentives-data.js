/* Shared configuration and monthly counting for TV incentives. */
(function(w){
  'use strict';

  const text=value=>String(value??'').trim();
  const norm=value=>text(value).toLowerCase();
  const monthNumber=period=>Number(period.slice(0,4))*12+Number(period.slice(5,7))-1;
  const monthFormat=new Intl.DateTimeFormat('nl-BE',{month:'long',year:'numeric',timeZone:'UTC'});
  const dateFormat=new Intl.DateTimeFormat('nl-BE',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});

  function validDate(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date=new Date(value+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }

  function dateError({startDate,endDate}){
    if(!validDate(startDate)||!validDate(endDate)) return 'Vul een geldige start- en einddatum in.';
    if(startDate>endDate) return 'De einddatum moet op of na de startdatum liggen.';
    const monthEnd=new Date(endDate+'T00:00:00Z');
    monthEnd.setUTCDate(monthEnd.getUTCDate()+1);
    if(!startDate.endsWith('-01')||monthEnd.getUTCDate()!==1) return 'Kies volledige kalendermaanden. De export bevat maandtotalen voor Life en Insurance.';
    return '';
  }

  function validGoal(goal){
    return Number.isSafeInteger(goal)&&goal>0&&goal<=500;
  }

  function valid(incentive){
    return incentive&&text(incentive.name)&&validGoal(incentive.goal)&&!dateError(incentive);
  }

  function periodLabel({startDate,endDate}){
    const start=new Date(startDate+'T00:00:00Z'),end=new Date(endDate+'T00:00:00Z');
    if(startDate.slice(0,7)===endDate.slice(0,7)) return monthFormat.format(start);
    return dateFormat.format(start)+' t/m '+dateFormat.format(end);
  }

  function count(value){
    if(text(value)==='') return null;
    const number=Number(text(value).replace(',','.'));
    return Number.isSafeInteger(number)&&number>=0?number:null;
  }

  function monthlyCounts(results,history,shop){
    const number=text(shop?.shopNr||'208'), name=norm(shop?.naam||'Diest');
    const months=new Map();
    function own(row){
      return norm(row.EntiteitType??row.entiteitType)==='winkel'
        && (text(row.ShopNr??row.shopNr)===number||norm(row.Naam??row.naam)===name);
    }
    function set(period,kind,value){
      if(value===null||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return;
      if(!months.has(period)) months.set(period,{life:null,insurance:null});
      months.get(period)[kind]=value;
    }
    for(const row of history){
      if(!own(row)) continue;
      const period=text(row.Periode), kpi=norm(row.KPI), sub=norm(row.SubKPI);
      if(kpi==='life'&&(sub===''||sub==='totaal')) set(period,'life',count(row.Stuks??row.Waarde));
      if(kpi==='insurance'&&sub==='totaal') set(period,'insurance',count(row.Stuks));
    }
    for(const row of results){
      if(!own(row)) continue;
      const period=text(row.Periode??row.periode);
      set(period,'life',count(row.Life??row.life));
      set(period,'insurance',count(row.InsuranceStuks??row.insuranceStuks));
    }
    return months;
  }

  function progress(incentive,months,reportPeriod){
    const start=incentive.startDate.slice(0,7),end=incentive.endDate.slice(0,7);
    const through=reportPeriod&&reportPeriod<end?reportPeriod:end;
    const expected=through>=start?monthNumber(through)-monthNumber(start)+1:0;
    let life=0,insurance=0,available=0;
    for(const [period,totals] of months){
      if(period<start||period>through||totals.life===null||totals.insurance===null) continue;
      life+=totals.life;
      insurance+=totals.insurance;
      available++;
    }
    return {life,insurance,available,missing:expected-available};
  }

  w.DIESTROYERS_TV_INCENTIVES={dateError,validGoal,valid,periodLabel,monthlyCounts,progress};
})(window);
