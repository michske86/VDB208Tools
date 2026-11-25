(() => {
  'use strict';

  const tau = Math.PI * 2;
  const cycle = (time, period) => (time % period) / period;
  const clamp = value => Math.max(0, Math.min(1, value));

  function ink(ctx, color, width, draw) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    draw(ctx);
    ctx.stroke();
  }

  function haze(ctx, x, y, size, color, opacity) {
    ctx.globalAlpha = opacity;
    const wash = ctx.createRadialGradient(x, y, 0, x, y, size);
    wash.addColorStop(0, color);
    wash.addColorStop(1, 'transparent');
    ctx.fillStyle = wash;
    ctx.fillRect(x-size, y-size, 2*size, 2*size);
    ctx.globalAlpha = 1;
  }

  function sparks(ctx, time, x, y, color, count, velocity) {
    for (let i=0; i<count; i++) {
      const p = cycle(time+i*.079, 1.48);
      const angle = i * 2.399;
      const speed = velocity*(.44 + (i % 7)/10);
      const dx = Math.cos(angle)*speed;
      const dy = -Math.abs(Math.sin(angle)*speed);
      const px = x+dx*p, py = y+dy*p+14*p*p;
      ctx.globalAlpha = (1-p) * clamp(p*16);
      ink(ctx, color, i%4===0 ? .8 : .34, path=>{
        path.moveTo(px,py);
        path.lineTo(px-dx*.09,py-dy*.09);
      });
    }
    ctx.globalAlpha = 1;
  }

  function curls(ctx, time, x, y, color, height) {
    for (let i=0; i<5; i++) {
      const p = cycle(time+i*1.137,5.8);
      const px = x + Math.sin(p*5.5+i*1.4)*(4+13*p);
      const py = y-height*p;
      const opacity = Math.sin(p*Math.PI);
      haze(ctx,px,py,5+p*11,color,opacity*.24);
      ctx.globalAlpha = opacity*.47;
      ink(ctx,color,.5+p*.8,path=>{
        path.moveTo(px-5,py+10);
        path.bezierCurveTo(px-18,py+3,px+19,py-4,px+1,py-14);
      });
    }
    ctx.globalAlpha = 1;
  }

  function life(ctx, time) {
    const hit = Math.pow(Math.max(0,Math.sin(time*3.2)),8);
    haze(ctx,55,78,32,'#ad6bff',hit*.55);
    const nodes = [[29,62],[38,69],[51,76],[49,85],[64,84],[60,90],[74,95]];
    ctx.globalAlpha = hit;
    for (const [color,width] of [['#a365fa',1.6],['#fff1ff',.53]]) {
      ink(ctx,color,width,path=>{
        path.moveTo(...nodes[0]);
        nodes.slice(1).forEach(([x,y],i)=>path.lineTo(x+Math.sin(time*19+i)*3,y+Math.cos(time*23+i)*3));
      });
    }
    ctx.globalAlpha = 1;
    if (hit>.25) sparks(ctx,time*1.8,58,83,'#f3d8ff',16,22);
  }

  function insurance(ctx, time) {
    curls(ctx,time,56,146,'#a7cf56',114);
    curls(ctx,time+1.3,69,89,'#b5d384',69);
    const flutter = Math.sin(time*4);
    ctx.globalAlpha = .52;
    ink(ctx,'#e5d3a0',1.1,path=>{
      path.moveTo(60,92);
      path.bezierCurveTo(55-flutter*3,102,72+flutter*3,111,67+flutter*2,125);
    });
    ctx.globalAlpha = 1;
    haze(ctx,84,27,12,'#d9f093',.22+.08*Math.sin(time*5));
  }

  function abo(ctx, time) {
    ctx.globalAlpha = .63;
    for (let i=0; i<3; i++) {
      const wave = Math.sin(time*2.9+i*1.7)*8;
      ink(ctx,'#140d13',1.55,path=>{
        path.moveTo(58+i*4,115);
        path.bezierCurveTo(101,138-i*10,96+wave,81+i*7,84+wave,67+i*10);
      });
      ink(ctx,'#a7794a',.47,path=>{
        path.moveTo(57+i*4,114);
        path.bezierCurveTo(102,136-i*10,96+wave,80+i*7,84+wave,66+i*10);
      });
    }
    for (let i=0; i<3; i++) {
      const p=cycle(time+i*1.8,5.2);
      ctx.save();
      ctx.translate(87-72*p,120-88*p+Math.sin(p*10+i)*9);
      ctx.rotate(p*3+i*.6);
      ctx.globalAlpha = .77*Math.sin(p*Math.PI);
      ctx.fillStyle='#d7b77c';
      ctx.fillRect(-4,-2.7,8,5.4);
      ink(ctx,'#604132',.36,path=>{
        path.moveTo(-4,-2.7); path.lineTo(0,.7); path.lineTo(4,-2.7);
      });
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    haze(ctx,55,112,21,'#aebc59',.15+.09*Math.sin(time*6));
  }

  function dsp(ctx, time) {
    curls(ctx,time,38,145,'#e3a67c',48);
    sparks(ctx,time,36,140,'#ffca84',24,31);
    haze(ctx,38,142,30,'#ff641c',.20+.12*Math.sin(time*7)*Math.cos(time*4));
    const glint = Math.pow(Math.max(0,Math.sin(time*1.8)),12);
    ctx.globalAlpha = glint*.8;
    ink(ctx,'#ffd8a5',1.15,path=>{path.moveTo(27,55);path.lineTo(48,43);});
    ctx.globalAlpha=1;
  }

  function spg(ctx, time) {
    const flicker = .26+.12*Math.sin(time*7);
    haze(ctx,55,91,34,'#46bfff',flicker);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(33,82);ctx.lineTo(77,75);ctx.lineTo(78,109);ctx.lineTo(40,115);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = .43;
    const scan=74+cycle(time,1.24)*44;
    ink(ctx,'#c2f7ff',1.2,path=>{path.moveTo(24,scan+6);path.lineTo(84,scan-3);});
    ctx.restore();

    const p=cycle(time,4.5);
    const alpha=Math.pow(Math.sin(p*Math.PI),1.6);
    ctx.save();
    ctx.translate(57-p*39+Math.sin(p*10)*5,91-p*58);
    ctx.rotate(-.27+Math.sin(p*8)*.16);
    ctx.globalAlpha=alpha*.72;
    ctx.fillStyle='#8dd8ed';
    ctx.shadowColor='#78dfff';
    ctx.shadowBlur=10;
    ctx.beginPath();
    ctx.moveTo(-5,5);
    ctx.bezierCurveTo(-13,-9,3,-16,7,-9);
    ctx.bezierCurveTo(13,-2,4,6,11,15);
    ctx.quadraticCurveTo(2,11,0,18);
    ctx.quadraticCurveTo(0,10,-5,5);
    ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#263b56';
    ctx.fillRect(-3,-7,1.5,3);
    ctx.fillRect(1,-7,1.5,3);
    ctx.restore();
  }

  function srp(ctx, time) {
    const cut = .4+.6*Math.pow(Math.max(0,Math.sin(time*4)),3);
    haze(ctx,55,98,28,'#ff7a2c',cut*.42);
    ctx.save();
    ctx.translate(83,116);
    ctx.scale(1,.57);
    ctx.rotate(time*14);
    ctx.globalAlpha=.65;
    ink(ctx,'#f6c386',.9,path=>{
      for (let i=0; i<6; i++) {
        const a=i*tau/6;
        path.arc(0,0,12.5,a,a+.39);
        path.moveTo(Math.cos(a+.5)*12.5,Math.sin(a+.5)*12.5);
      }
    });
    ctx.restore();
    sparks(ctx,time*1.7,56,99,'#ffca7e',27,31);
  }

  const effects = {life,insurance,abo,dsp,spg,srp};

  function start(gate, key) {
    if (!effects[key] || document.body.hasAttribute('data-tv-export') ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = gate.querySelector('.dec-gate-motion');
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(canvas.width/100,0,0,canvas.height/200,0,0);
    ctx.lineCap='round';
    ctx.lineJoin='round';
    const first = performance.now()+1250;
    let frame, last = first-34;
    function draw(now) {
      if (now-last>=32 && now>=first) {
        last=now;
        ctx.clearRect(0,0,100,200);
        effects[key](ctx,(now-first)/1000);
      }
      frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
    return ()=>{
      cancelAnimationFrame(frame);
      ctx.clearRect(0,0,100,200);
    };
  }

  window.DIESTROYERS_DECEMBER_GATE_MOTION = {start};
})();
