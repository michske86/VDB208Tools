/* The Diestroyers TV - Whiteboardroute incentive. */
(function(w){
  'use strict';

  const assets='assets/incentives/whiteboard/';
  const palms={bert:[.847,.594],myron:[.837,.694],jonathan:[.834,.725],foeke:[.853,.684],freek:[.850,.663],rodrick:[.828,.660]};
  const colors={light:'#ff5876',soft:'#ff406d'};
  const center=[310,540];
  const number=new Intl.NumberFormat('nl-BE',{maximumFractionDigits:0});
  let context,positions=[],agents=[],request=0;

    function curve(points){
   const sampled=[];
   for(let i=0;i<points.length-1;i++){
     const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(i+2,points.length-1)];
     for(let step=0;step<30;step++){
       const t=step/30, t2=t*t,t3=t2*t;
       sampled.push(p1.map((value,j)=>.5*(2*value+(-p0[j]+p2[j])*t+
        (2*p0[j]-5*value+4*p2[j]-p3[j])*t2+(-p0[j]+3*value-3*p2[j]+p3[j])*t3)));
     }
   }
   sampled.push(points.at(-1));return sampled;
  }
  function evenly(path,count){
   const distances=[0];
   for(let i=1;i<path.length;i++)distances.push(distances[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
   let index=1;
   const spacing=distances.at(-1)/Math.max(1,count-1);
   const width=Math.min(28,spacing*.84);
   return Array.from({length:count},(_,step)=>{
     const target=step===count-1?distances.at(-1):step*spacing;
     while(distances[index]<target)index++;
     const [x,y]=path[index-1], [endX,endY]=path[index],u=(target-distances[index-1])/(distances[index]-distances[index-1]);
     return {x:x+(endX-x)*u,y:y+(endY-y)*u,angle:Math.atan2(endY-y,endX-x),w:width,h:Math.min(24,width*1.12)};
   });
  }
  function routePositions(goal){
   return evenly(curve([[342,512],[402,430],[590,368],[920,360],[1240,360],[1413,405],[1432,498],[1341,553],[1078,550],[774,531],[566,575],[462,665],[515,749],[730,780],[1021,782],[1325,758],[1462,706],[1557,635]]),goal);
  }

    function line(points,color,width,alpha=1,blur=0){
   context.save();context.globalAlpha=alpha;context.strokeStyle=color;context.lineWidth=width;context.lineJoin='round';context.lineCap='round';context.shadowColor=color;context.shadowBlur=blur;
   context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x,y):context.moveTo(x,y));context.stroke();context.restore();
  }
  function halo(x,y,radius,color,alpha){
   context.save();context.globalAlpha=alpha;const fade=context.createRadialGradient(x,y,0,x,y,radius);fade.addColorStop(0,color);fade.addColorStop(1,'transparent');
   context.fillStyle=fade;context.fillRect(x-radius,y-radius,2*radius,2*radius);context.restore();
  }
  function particles(source,time,color,quantity,extent){
   for(let i=0;i<quantity;i++){
    const angle=i*2.3999, phase=(time*.00062+i*.137)%1;
    const d=extent*phase,alpha=(1-phase)*(.19+i%3*.11);
    const x=source[0]+Math.cos(angle)*d,y=source[1]+Math.sin(angle)*d*.68;
    line([[x,y],[x-Math.cos(angle)*(5+i%7),y-Math.sin(angle)*5]],color,1+i%2,alpha,5);
   }
  }
  function routeSparks(filled,time,colors){
   // Every spark is anchored to an already illuminated cell.
   const size=Math.min(36,filled*2);
   for(let i=0;i<size;i++){
    const phase=(time*.00115+i*.183)%1;
    const index=Math.min(filled-1,Math.floor(((i*.618034+Math.floor(time/680)*.087)%1)*filled));
    const p=positions[index],side=i%2?1:-1;
    const nx=-Math.sin(p.angle),ny=Math.cos(p.angle);
    const tx=Math.cos(p.angle),ty=Math.sin(p.angle);
    const lateral=side*(12+phase*(17+i%8)),forward=phase*(6+i%14);
    const x=p.x+nx*lateral+tx*forward,y=p.y+ny*lateral+ty*forward;
    const fade=(1-phase)*(.35+(i%3)*.22);
    line([[x-nx*side*6-tx*4,y-ny*side*6-ty*4],[x,y]],i%4?'#ff7962':'#fff0ce',i%7?1.5:2.5,fade,6);
    if(i%5===0) halo(x,y,12,colors.light,fade*.7);
   }
   if(filled>2){
    const progress=Math.floor((time*.024)%(filled+8))-5;
    const streak=positions.slice(Math.max(0,progress-3),Math.max(0,Math.min(progress+2,filled))).map(p=>[p.x,p.y]);
    if(streak.length>1) line(streak,'#fff0d4',3,.64,15);
   }
  }


  function draw(time,filled,goal){
    if(!context) return;
    context.clearRect(0,0,1920,1080);
    const pulse=.75+.25*Math.sin(time*.005);
    const route=positions.map(p=>[p.x,p.y]);
    line(route,'#4b1c29',64,.55,11);
    line(route,colors.soft,43,.25,20);
    line(route,colors.light,1,.45);
    if(filled>1) line(route.slice(0,filled),colors.soft,39,.34,19);
    if(filled>0) routeSparks(filled,time,colors);
    for(const [i,agent] of agents.entries()){
      const {x,y}=agent,bend=(i-2.5)*8;
      const beam=[[x,y],[(x+center[0])/2,y+(center[1]-y)*.42+bend],center];
      halo(x,y,25,colors.light,.62*pulse);
      line(beam,colors.soft,5,.75,14);
      line(beam,'#fff6e6',1.5,.6*pulse);
      const phase=(time*.0015+i*.19)%1;
      halo(x+(center[0]-x)*phase,y+(center[1]-y)*phase,17,colors.light,.72);
    }
    line([center,route[0]],colors.soft,5,.74,12);
    halo(center[0],center[1],65,colors.soft,.61);
    halo(center[0],center[1],16,'#fff4d9',.94);
    particles(center,time,colors.light,18,105);
    if(filled){
      const front=route[filled-1];
      halo(front[0],front[1],78,colors.soft,.7*pulse);
      particles(front,time,colors.light,31,128);
    }
    if(filled===goal){
      const target=[1670,530];
      line([route.at(-1),target],colors.light,6,.91,17);
      halo(target[0],target[1],255,colors.soft,.64*pulse);
      particles(target,time,colors.light,56,235);
    }
  }

  function stop(){
    cancelAnimationFrame(request);
    request=0;
  }

  function render(root,incentive,progress,shopName){
    stop();
    const {goal}=incentive,total=progress.life+progress.insurance;
    const limit=Math.min(goal,total),available=progress.available>0;
    const totalLabel=available?number.format(total):'—';
    const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.remove('won');


    root.innerHTML=`
      <div class="backdrop"></div><figure class="art"><img src="${assets}monster.webp" alt=""></figure>
      <canvas width="1920" height="1080" aria-hidden="true"></canvas>
      <div class="slots" role="meter" aria-label="Gevulde laservakjes" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${limit}"></div>
      <header class="hud"><div class="headline"><span class="context"></span><h1></h1></div>
        <div class="counter"><p class="score"><strong>${totalLabel}</strong> / ${number.format(goal)}</p><p class="state"></p></div></header>
      <p class="team-label"></p><p class="monster-label">Black Friday Monster</p>
      <div class="teams"></div><div class="flash"></div><p class="win-message" hidden>Monster verslagen</p>
      <footer class="footer"><div><span class="kind">Life</span><strong>${available?number.format(progress.life):'—'}</strong></div>
      <div><span class="kind">Insurance</span><strong>${available?number.format(progress.insurance):'—'}</strong></div>
      <div class="rule"><span>1 Life of Insurance = 1 laservakje</span><small></small></div></footer>`;


    const select=selector=>root.querySelector(selector),meter=select('.slots'),state=select('.state');
    select('h1').textContent=incentive.name;
    select('.context').textContent=w.DIESTROYERS_TV_INCENTIVES.periodLabel(incentive);
    select('.team-label').textContent='Diestroyers · '+shopName;
    select('.footer small').textContent=progress.missing>0?'Onvolledige historiek':'Winkelresultaat · resultaatperiode';
    state.textContent=!available?'Nog geen resultaten':limit===goal?'Doel gehaald':number.format(goal-limit)+' stuks te gaan';
    select('.win-message').hidden=true;
    context=select('canvas').getContext('2d');
    positions=routePositions(goal);
    const team=select('.teams');
    agents=Object.keys(palms).map((name,index)=>{
      const centerY=247+index*117;
      const agent={x:257,y:centerY+17};
      const card=document.createElement('div');
      card.className='agent';
      card.style.setProperty('--y',centerY+'px');
      const label=document.createElement('strong');
      label.textContent=name;
      const image=new Image();
      image.alt='';
      image.addEventListener('load',()=>{
        const scale=Math.min(240/image.naturalWidth,120/image.naturalHeight);
        const [u,v]=palms[name];
        agent.x=282-image.naturalWidth*scale*(1-u);
        agent.y=centerY+image.naturalHeight*scale*(v-.5);
        if(!motion&&root.contains(card)) draw(3600,limit,goal);
      },{once:true});
      image.src=assets+name+'.webp';
      card.append(label,image);
      team.append(card);
      return agent;
    });
    const slots=positions.map(({x,y,angle,w,h})=>{
      const slot=document.createElement('span');
      slot.className='slot';
      slot.setAttribute('aria-hidden','true');
      slot.style.cssText='--x:'+x+'px;--y:'+y+'px;--angle:'+angle+'rad;--w:'+w+'px;--h:'+h+'px';
      meter.append(slot);
      return slot;
    });
    let lit=-1;
    function paint(count,time){
      if(count!==lit){
        for(let i=0;i<slots.length;i++){
          slots[i].classList.toggle('lit',i<count);
          slots[i].classList.toggle('front',i+1===count);
        }
        root.classList.toggle('won',count===goal);
        select('.win-message').hidden=count!==goal;
        lit=count;
      }
      draw(time,count,goal);
    }
    if(!motion){paint(limit,3600);return;}
    const started=performance.now();
    let previous=-Infinity;
    function tick(now){
      if(now-previous>=32){
        const elapsed=now-started;
        const fill=Math.min(1,elapsed/2500);
        paint(Math.round(limit*(1-(1-fill)**1.55)),elapsed);
        previous=now;
      }
      request=requestAnimationFrame(tick);
    }
    request=requestAnimationFrame(tick);
  }

  w.DIESTROYERS_TV_INCENTIVE_SLIDE={render,stop};
})(window);
