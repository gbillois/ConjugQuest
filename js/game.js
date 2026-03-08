'use strict';
const VERSION = 'v2.0';

// ── Canvas ────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const W = 480, H = 640;
canvas.width = W; canvas.height = H;

// ── Constants ─────────────────────────────────────────────────────
const GRAV = 1500, PSPEED = 195, JUMP_V = -560, MAX_FALL = 900;
const GY = 570; // ground y

// ── Save / Settings ───────────────────────────────────────────────
let SAVE = JSON.parse(localStorage.getItem('cqSave') || '{"totalStars":0,"skin":"knight","owned":["knight"]}');
function saveSave(){ localStorage.setItem('cqSave', JSON.stringify(SAVE)); }

const SETTINGS = { groups:['groupe1','groupe2','groupe3','verbesBase'], tenses:['pr','im','fu'] };
let errorDB = JSON.parse(localStorage.getItem('cqErrors') || '{}');

// ── Game state ────────────────────────────────────────────────────
const GS = { screen:'start', paused:false, level:0, lives:3, score:0, total:0, stars:0, maxStars:0 };

// ── Helpers ───────────────────────────────────────────────────────
function rand(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=rand(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}

// ── Level definitions ─────────────────────────────────────────────
const LEVEL_DEFS = [
  { // 1: Forest
    worldWidth:2800, sky1:'#0d1a0d', sky2:'#1a3a1a',
    groundColor:'#2d6b22', platColor:'#5c7a32', accentColor:'#1a4a10',
    enemyType:'goblin', bgTrees:true,
    platforms:[
      {x:0,   y:GY,w:300,h:60,type:'ground'},{x:380, y:GY,w:320,h:60,type:'ground'},
      {x:800, y:GY,w:380,h:60,type:'ground'},{x:1290,y:GY,w:350,h:60,type:'ground'},
      {x:1750,y:GY,w:400,h:60,type:'ground'},{x:2250,y:GY,w:550,h:60,type:'ground'},
      {x:310, y:GY-70, w:90, h:18,type:'platform'},{x:720, y:GY-65, w:80, h:18,type:'platform'},
      {x:1190,y:GY-75, w:100,h:18,type:'platform'},{x:1655,y:GY-65, w:90, h:18,type:'platform'},
      {x:2180,y:GY-70, w:80, h:18,type:'platform'},{x:500, y:GY-120,w:100,h:18,type:'platform'},
      {x:950, y:GY-110,w:110,h:18,type:'platform'},{x:1400,y:GY-115,w:100,h:18,type:'platform'},
      {x:1850,y:GY-120,w:110,h:18,type:'platform'},
    ],
    enemies:[{platIdx:1,offX:80,type:'goblin'},{platIdx:3,offX:100,type:'goblin'}],
    stars:[
      {x:510,y:GY-155},{x:540,y:GY-155},{x:570,y:GY-155},
      {x:960,y:GY-145},{x:990,y:GY-145},{x:1410,y:GY-150},
      {x:1860,y:GY-155},{x:1890,y:GY-155},
    ],
    gateX:2500, spawnX:80,
  },
  { // 2: Desert
    worldWidth:3000, sky1:'#9a6010', sky2:'#c07820',
    groundColor:'#c8a040', platColor:'#e0b850', accentColor:'#806020',
    enemyType:'mummy', bgPyramids:true,
    platforms:[
      {x:0,   y:GY,w:320,h:60,type:'ground'},{x:420, y:GY,w:300,h:60,type:'ground'},
      {x:840, y:GY,w:360,h:60,type:'ground'},{x:1310,y:GY,w:380,h:60,type:'ground'},
      {x:1820,y:GY,w:340,h:60,type:'ground'},{x:2300,y:GY,w:700,h:60,type:'ground'},
      {x:340, y:GY-65,w:80, h:18,type:'platform'},{x:760, y:GY-70,w:80, h:18,type:'platform'},
      {x:1220,y:GY-65,w:90, h:18,type:'platform'},{x:1730,y:GY-70,w:90, h:18,type:'platform'},
      {x:2215,y:GY-65,w:85, h:18,type:'platform'},{x:560, y:GY-115,w:110,h:18,type:'platform'},
      {x:1040,y:GY-110,w:100,h:18,type:'platform'},{x:1500,y:GY-120,w:110,h:18,type:'platform'},
      {x:2000,y:GY-115,w:100,h:18,type:'platform'},
    ],
    enemies:[{platIdx:2,offX:100,type:'mummy'},{platIdx:4,offX:80,type:'mummy'}],
    stars:[
      {x:570,y:GY-150},{x:600,y:GY-150},{x:630,y:GY-150},
      {x:1050,y:GY-145},{x:1080,y:GY-145},{x:1510,y:GY-155},
      {x:2010,y:GY-150},{x:2040,y:GY-150},
    ],
    gateX:2750, spawnX:80,
  },
  { // 3: Snow / Mountains
    worldWidth:3200, sky1:'#0a1020', sky2:'#1a3060',
    groundColor:'#3a5a8a', platColor:'#6a8aaa', accentColor:'#c8e0f8',
    enemyType:'yeti', bgMountains:true,
    platforms:[
      {x:0,   y:GY,w:320,h:60,type:'ground'},{x:420, y:GY,w:340,h:60,type:'ground'},
      {x:870, y:GY,w:380,h:60,type:'ground'},{x:1360,y:GY,w:360,h:60,type:'ground'},
      {x:1850,y:GY,w:380,h:60,type:'ground'},{x:2380,y:GY,w:820,h:60,type:'ground'},
      {x:340, y:GY-70,w:80, h:18,type:'platform'},{x:790, y:GY-65,w:80, h:18,type:'platform'},
      {x:1270,y:GY-70,w:90, h:18,type:'platform'},{x:1760,y:GY-65,w:90, h:18,type:'platform'},
      {x:2290,y:GY-70,w:85, h:18,type:'platform'},{x:540, y:GY-120,w:110,h:18,type:'platform'},
      {x:1060,y:GY-115,w:110,h:18,type:'platform'},{x:1540,y:GY-120,w:110,h:18,type:'platform'},
      {x:2050,y:GY-115,w:110,h:18,type:'platform'},
    ],
    enemies:[{platIdx:2,offX:120,type:'yeti'},{platIdx:4,offX:100,type:'yeti'}],
    stars:[
      {x:550,y:GY-155},{x:580,y:GY-155},{x:610,y:GY-155},
      {x:1070,y:GY-150},{x:1100,y:GY-150},{x:1550,y:GY-155},
      {x:2060,y:GY-150},{x:2090,y:GY-150},
    ],
    gateX:2950, spawnX:80,
  },
  { // 4: Cave / Mountain
    worldWidth:3400, sky1:'#080810', sky2:'#181830',
    groundColor:'#303050', platColor:'#505078', accentColor:'#8888cc',
    enemyType:'dwarf', bgCave:true,
    platforms:[
      {x:0,   y:GY,w:320,h:60,type:'ground'},{x:440, y:GY,w:350,h:60,type:'ground'},
      {x:910, y:GY,w:380,h:60,type:'ground'},{x:1410,y:GY,w:360,h:60,type:'ground'},
      {x:1910,y:GY,w:380,h:60,type:'ground'},{x:2440,y:GY,w:960,h:60,type:'ground'},
      {x:360, y:GY-70,w:80, h:18,type:'platform'},{x:830, y:GY-65,w:80, h:18,type:'platform'},
      {x:1320,y:GY-70,w:90, h:18,type:'platform'},{x:1820,y:GY-65,w:85, h:18,type:'platform'},
      {x:2350,y:GY-70,w:90, h:18,type:'platform'},{x:580, y:GY-120,w:110,h:18,type:'platform'},
      {x:1100,y:GY-115,w:110,h:18,type:'platform'},{x:1590,y:GY-120,w:110,h:18,type:'platform'},
      {x:2100,y:GY-115,w:110,h:18,type:'platform'},
    ],
    enemies:[{platIdx:2,offX:130,type:'dwarf'},{platIdx:4,offX:110,type:'dwarf'}],
    stars:[
      {x:590,y:GY-155},{x:620,y:GY-155},{x:650,y:GY-155},
      {x:1110,y:GY-150},{x:1140,y:GY-150},{x:1600,y:GY-155},
      {x:2110,y:GY-150},{x:2140,y:GY-150},
    ],
    gateX:3150, spawnX:80,
  },
  { // 5: Desolation
    worldWidth:3600, sky1:'#080808', sky2:'#100808',
    groundColor:'#202020', platColor:'#383838', accentColor:'#6a1a6a',
    enemyType:'wraith', bgDesolation:true,
    platforms:[
      {x:0,   y:GY,w:320,h:60,type:'ground'},{x:460, y:GY,w:360,h:60,type:'ground'},
      {x:960, y:GY,w:400,h:60,type:'ground'},{x:1490,y:GY,w:380,h:60,type:'ground'},
      {x:2010,y:GY,w:400,h:60,type:'ground'},{x:2570,y:GY,w:1030,h:60,type:'ground'},
      {x:380, y:GY-70,w:80, h:18,type:'platform'},{x:880, y:GY-65,w:80, h:18,type:'platform'},
      {x:1400,y:GY-70,w:90, h:18,type:'platform'},{x:1920,y:GY-65,w:90, h:18,type:'platform'},
      {x:2480,y:GY-70,w:90, h:18,type:'platform'},{x:620, y:GY-120,w:110,h:18,type:'platform'},
      {x:1160,y:GY-115,w:110,h:18,type:'platform'},{x:1680,y:GY-120,w:110,h:18,type:'platform'},
      {x:2200,y:GY-115,w:110,h:18,type:'platform'},
    ],
    enemies:[{platIdx:2,offX:150,type:'wraith'},{platIdx:4,offX:120,type:'wraith'}],
    stars:[
      {x:630,y:GY-155},{x:660,y:GY-155},{x:690,y:GY-155},
      {x:1170,y:GY-150},{x:1200,y:GY-150},{x:1690,y:GY-155},
      {x:2210,y:GY-150},{x:2240,y:GY-150},
    ],
    gateX:3350, spawnX:80,
  },
];

// ── Game objects ──────────────────────────────────────────────────
let platforms=[], enemies=[], stars_list=[], particles=[];
let gate=null, camX=0, worldW=0;
const player = { x:80,y:400,w:28,h:48, vx:0,vy:0, onGround:false, facing:1, alive:true, invTimer:0, walkT:0 };

// ── Input ─────────────────────────────────────────────────────────
const keys = {left:false, right:false};
let jumpRequest = false;

document.addEventListener('keydown', e => {
  if(QS.active){ if(handleQuestionKeyboard(e)) return; }
  if(e.code==='ArrowLeft'  || e.code==='KeyA') keys.left  = true;
  if(e.code==='ArrowRight' || e.code==='KeyD') keys.right = true;
  if((e.code==='ArrowUp'||e.code==='Space'||e.code==='KeyW') && !e.repeat) jumpRequest=true;
});
document.addEventListener('keyup', e => {
  if(QS.active) return;
  if(e.code==='ArrowLeft'  || e.code==='KeyA') keys.left  = false;
  if(e.code==='ArrowRight' || e.code==='KeyD') keys.right = false;
});

function setupTouchBtn(id,lk,rk,isJump){
  const el=document.getElementById(id);
  const on =()=>{ if(lk)keys[lk]=true; if(rk)keys[rk]=true; if(isJump)jumpRequest=true; el.classList.add('pressed'); };
  const off=()=>{ if(lk)keys[lk]=false;if(rk)keys[rk]=false; el.classList.remove('pressed'); };
  el.addEventListener('touchstart', e=>{e.preventDefault();on();},{passive:false});
  el.addEventListener('touchend',   e=>{e.preventDefault();off();},{passive:false});
  el.addEventListener('touchcancel',e=>{e.preventDefault();off();},{passive:false});
  el.addEventListener('mousedown',()=>on());
  el.addEventListener('mouseup',  ()=>off());
  el.addEventListener('mouseleave',()=>off());
}
setupTouchBtn('leftBtn','left',null,false);
setupTouchBtn('rightBtn',null,'right',false);
setupTouchBtn('jumpBtn',null,null,true);

// ── Load level ────────────────────────────────────────────────────
function loadLevel(idx){
  const def = LEVEL_DEFS[idx];
  platforms   = def.platforms.map(p=>({...p}));
  stars_list  = def.stars.map(s=>({...s, w:16,h:16, collected:false, phase:Math.random()*Math.PI*2}));
  particles   = [];
  enemies     = [];
  camX        = 0;
  worldW      = def.worldWidth;
  GS.stars    = 0;
  GS.maxStars = def.stars.length;

  const verbDatas = generateLevelVerbDatas(def.enemies.length);
  def.enemies.forEach((edef, i) => {
    const plat = platforms[edef.platIdx];
    const ex   = plat.x + edef.offX;
    const ey   = plat.y - 48;
    enemies.push({
      x:ex, y:ey, w:32, h:48,
      vx:pick([-50,50]),
      platX:plat.x, platW:plat.w,
      alive:true, battling:false,
      type:edef.type, facing:1, walkT:0,
      verbData:verbDatas[i],
    });
  });

  gate = { x:def.gateX, y:GY-90, w:60, h:90, open:false };

  player.x       = def.spawnX;
  player.y       = GY - player.h - 2;
  player.vx=0; player.vy=0;
  player.onGround=true; player.alive=true; player.invTimer=0;
}

// ── Error tracking ────────────────────────────────────────────────
function recordError(q){
  const key=`${q.gKey}|${q.vKey}|${q.tense}|${q.pronIdx}`;
  errorDB[key]=(errorDB[key]||0)+1;
  localStorage.setItem('cqErrors',JSON.stringify(errorDB));
}
function resetErrors(){
  errorDB={};
  localStorage.removeItem('cqErrors');
  renderErrorList();
}
function getTopErrors(n=5){
  const ag=SETTINGS.groups.length?SETTINGS.groups:['groupe1'];
  const at=SETTINGS.tenses.length?SETTINGS.tenses:['pr'];
  return Object.entries(errorDB)
    .filter(([k])=>{const[g,,t]=k.split('|');return ag.includes(g)&&at.includes(t);})
    .sort(([,a],[,b])=>b-a).slice(0,n);
}
function renderErrorList(){
  const el=document.getElementById('errorList'); if(!el) return;
  const tenseMap={pr:'Présent',im:'Imparfait',fu:'Futur simple'};
  const top=getTopErrors();
  if(!top.length){ el.innerHTML='<div style="color:#94a3b8;font-size:12px;padding:6px 0">Aucune erreur enregistrée 🎉</div>'; return; }
  el.innerHTML=top.map(([key,cnt])=>{
    const[gKey,vKey,tense,pi]=key.split('|');
    const correct=VERBS[gKey]?.list[vKey]?.[tense]?.[+pi]??'?';
    return `<div class="errorItem"><span class="errorVerb">${PRONOUN_LABEL[+pi]} <b>${vKey}</b></span><span class="errorTense">${tenseMap[tense]||tense}</span><span class="errorAnswer">${correct}</span><span class="errorCount">${cnt}×</span></div>`;
  }).join('');
}

// ── Shop ──────────────────────────────────────────────────────────
const SKINS=[
  {id:'knight',name:'Chevalier',emoji:'⚔️', cost:0,  desc:'Armure classique',     img:'assets/heroes/paladin/rotations/south.png'},
  {id:'mage',  name:'Mage',     emoji:'🔮', cost:30, desc:'Robe et bâton magique', img:'assets/heroes/mage/rotations/south.png'},
  {id:'ninja', name:'Ninja',    emoji:'🥷', cost:60, desc:'Tenue sombre & kunai',  img:'assets/heroes/ninja/rotations/south.png'},
  {id:'pirate',name:'Pirate',   emoji:'☠️', cost:100,desc:'Tricorne & sabre',       img:'assets/heroes/pirate/rotations/south.png'},
];
function renderShop(){
  document.getElementById('shopStarsDisplay').textContent=`🪙 ${SAVE.totalStars} pièce${SAVE.totalStars>1?'s':''}`;
  const mEl=document.getElementById('menuStars'); if(mEl) mEl.textContent=`🪙${SAVE.totalStars}`;
  document.getElementById('shopItems').innerHTML=SKINS.map(s=>{
    const owned=SAVE.owned.includes(s.id), equipped=SAVE.skin===s.id, canBuy=!owned&&SAVE.totalStars>=s.cost;
    let btnClass='sBtn shopBuyBtn',btnLabel,btnDisabled='';
    if(equipped){btnClass+=' equipped';btnLabel='✓ Équipé';btnDisabled='disabled';}
    else if(owned){btnLabel='Équiper';}
    else if(canBuy){btnLabel='Acheter';}
    else{btnClass+=' owned';btnLabel=`🪙 ${s.cost}`;btnDisabled='disabled';}
    const inner=s.img?`<img src="${s.img}" alt="${s.name}">`:`<span class="shopEmoji">${s.emoji}</span>`;
    return `<div class="shopCard${equipped?' active':''}"><div class="shopThumb">${inner}</div><div class="shopInfo"><b>${s.name}</b><br><small>${s.desc}${s.cost>0&&!owned?' · 🪙'+s.cost:''}</small></div><button class="${btnClass}" ${btnDisabled} onclick="shopAction('${s.id}')">${btnLabel}</button></div>`;
  }).join('');
}
function shopAction(id){
  const skin=SKINS.find(s=>s.id===id); if(!skin) return;
  if(!SAVE.owned.includes(id)){ if(SAVE.totalStars<skin.cost) return; SAVE.totalStars-=skin.cost; SAVE.owned.push(id); }
  SAVE.skin=id; saveSave(); renderShop();
}

// ── Star gain popups ──────────────────────────────────────────────
const starGains=[];
function showStarGain(x,y,text){ starGains.push({x,y,t:1.2,text}); }
function updateStarGains(dt){ for(let i=starGains.length-1;i>=0;i--){ starGains[i].t-=dt; if(starGains[i].t<=0)starGains.splice(i,1); } }
function drawStarGains(){
  ctx.save(); ctx.textAlign='center';
  for(const g of starGains){
    const p=1.2-g.t, rise=p*48, alpha=Math.min(1,g.t*2.5);
    ctx.globalAlpha=alpha; ctx.font='bold 18px Arial';
    ctx.shadowColor='#000'; ctx.shadowBlur=6;
    ctx.fillStyle='#f59e0b';
    ctx.fillText(g.text, g.x-camX, g.y-rise);
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1; ctx.restore();
}

// ── Verb pool ─────────────────────────────────────────────────────
function buildVerbPool(ag){
  const seen=new Set(),pool=[];
  for(const gKey of ag) for(const vKey of Object.keys(VERBS[gKey].list)) if(!seen.has(vKey)){seen.add(vKey);pool.push({gKey,vKey});}
  return pool;
}
function randomVerbData(){
  const ag=SETTINGS.groups.length?SETTINGS.groups:['groupe1'];
  const at=SETTINGS.tenses.length?SETTINGS.tenses:['pr'];
  if(Math.random()<0.5){
    const rel=Object.entries(errorDB).filter(([k])=>{const[g,,t]=k.split('|');return ag.includes(g)&&at.includes(t);});
    if(rel.length>0){
      const total=rel.reduce((s,[,c])=>s+c,0); let r=Math.random()*total;
      for(const[key,cnt]of rel){ r-=cnt; if(r<=0){const[gKey,vKey,tense,pi]=key.split('|');if(VERBS[gKey]?.list[vKey])return{gKey,vKey,tense,pronIdx:+pi};}}
    }
  }
  const pool=buildVerbPool(ag);
  const{gKey,vKey}=pick(pool);
  return{gKey,vKey,tense:pick(at),pronIdx:rand(0,5)};
}
function generateLevelVerbDatas(n){
  const used=new Set(),result=[];
  let tries=0;
  while(result.length<n&&tries<n*20){
    tries++;
    const vd=randomVerbData(),key=`${vd.vKey}|${vd.pronIdx}`;
    if(!used.has(key)){used.add(key);result.push(vd);}
  }
  while(result.length<n) result.push(randomVerbData());
  return result;
}

// ── Quiz system ───────────────────────────────────────────────────
const QS={active:false,enemy:null,q:null};
const QK={selectedBtn:null};

function clearMoveKeys(){ keys.left=false; keys.right=false; jumpRequest=false; }
function getQuestionButtons(){ return Array.from(document.querySelectorAll('#qAnswers .qBtn')); }
function getEnabledQuestionButtons(){ return getQuestionButtons().filter(b=>!b.disabled); }
function syncQuestionKeyboardSelection(){
  const en=getEnabledQuestionButtons();
  if(!en.length||!en.includes(QK.selectedBtn)) QK.selectedBtn=null;
  getQuestionButtons().forEach(b=>b.classList.toggle('kbSel',b===QK.selectedBtn));
}
function moveQuestionSelection(d){
  const en=getEnabledQuestionButtons(); if(!en.length) return;
  if(!QK.selectedBtn||!en.includes(QK.selectedBtn)){QK.selectedBtn=en[0];syncQuestionKeyboardSelection();return;}
  let i=en.indexOf(QK.selectedBtn);
  i=(i+d+en.length)%en.length; QK.selectedBtn=en[i]; syncQuestionKeyboardSelection();
}
function selectQuestionByIndex(i){
  const en=getEnabledQuestionButtons(); if(i<0||i>=en.length) return;
  QK.selectedBtn=en[i]; syncQuestionKeyboardSelection(); QK.selectedBtn.click();
}
function validateQuestionSelection(){
  const en=getEnabledQuestionButtons(); if(!en.length) return;
  if(!QK.selectedBtn||!en.includes(QK.selectedBtn)) QK.selectedBtn=en[0];
  QK.selectedBtn.click();
}
function handleQuestionKeyboard(e){
  if(!QS.active) return false;
  const c=e.code;
  if(c==='ArrowLeft'||c==='ArrowUp'||c==='KeyA'||c==='KeyW'){e.preventDefault();moveQuestionSelection(-1);return true;}
  if(c==='ArrowRight'||c==='ArrowDown'||c==='KeyD'||c==='KeyS'){e.preventDefault();moveQuestionSelection(1);return true;}
  if(c==='Enter'||c==='Space'){e.preventDefault();validateQuestionSelection();return true;}
  if(c==='Digit1'||c==='Digit2'||c==='Digit3'||c==='Digit4'){e.preventDefault();selectQuestionByIndex(Number(c.slice(-1))-1);return true;}
  return true;
}

function openQuestion(enemy){
  if(QS.active) return;
  clearMoveKeys(); QS.active=true; QS.enemy=enemy; enemy.battling=true;
  buildQuestion(enemy);
  document.getElementById('qModal').classList.add('show');
  GS.screen='question';
}

function buildQuestion(enemy){
  const q=makeQuestion(enemy.verbData); QS.q=q;
  document.getElementById('qEnemy').textContent=enemyEmoji(enemy.type);
  document.getElementById('qGroup').textContent=VERBS[q.gKey].label;
  document.getElementById('qTense').textContent=q.tenseLabel;
  document.getElementById('qText').innerHTML=
    `Conjugue le verbe <span class="vb">${q.vKey}</span> au <span class="vb">${q.tenseLabel}</span> :<br>
     <span class="pro">${PRONOUN_LABEL[q.pronIdx]}</span> <span class="blank">???</span>`;
  const container=document.getElementById('qAnswers'); container.innerHTML='';
  q.options.forEach(opt=>{
    const btn=document.createElement('button'); btn.className='qBtn'; btn.textContent=opt;
    const handler=()=>answerClick(opt);
    btn.addEventListener('click',handler);
    btn.addEventListener('touchend',e=>{e.preventDefault();handler();},{passive:false});
    container.appendChild(btn);
  });
  QK.selectedBtn=null; syncQuestionKeyboardSelection();
  document.getElementById('qHP').innerHTML='';
}

function frenchSound(w){
  let s=w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const rules=[[/aient$/,'§E'],[/ais$/,'§E'],[/ait$/,'§E'],[/ions$/,'§ION'],[/iez$/,'§IE'],
    [/rons$/,'§RON'],[/ront$/,'§RON'],[/rez$/,'§RE'],[/rai$/,'§RE'],[/ras$/,'§RA'],[/ra$/,'§RA'],
    [/ons$/,'§ON'],[/ez$/,'§EZ']];
  for(const[re,rep]of rules){ if(re.test(s)) return s.replace(re,rep); }
  if(s.length>4&&s.endsWith('ent')) s=s.slice(0,-3);
  if(s.length>3) s=s.replace(/es$/,'');
  if(s.length>2) s=s.replace(/e$/,'');
  s=s.replace(/[stxd]$/,'');
  return s;
}

function makeQuestion(vd){
  const{gKey,vKey,tense,pronIdx}=vd;
  const verb=VERBS[gKey].list[vKey];
  const tenseMap={pr:'Présent',im:'Imparfait',fu:'Futur simple'};
  const correct=verb[tense][pronIdx], correctSound=frenchSound(correct);
  const seen=new Set([correct]), homophones=[], diffSounds=[];
  for(const t of['pr','im','fu']){
    if(!verb[t]) continue;
    for(let i=0;i<6;i++){
      const form=verb[t][i]; if(!form||seen.has(form)) continue; seen.add(form);
      if(frenchSound(form)===correctSound) homophones.push({form,t,i});
      else diffSounds.push({form,t,i});
    }
  }
  shuffle(homophones);
  const diffOther=shuffle(diffSounds.filter(f=>f.t!==tense));
  const diffSame=shuffle(diffSounds.filter(f=>f.t===tense));
  const distractors=[];
  if(homophones.length>0) distractors.push(homophones[0].form);
  const usedSounds=new Set();
  for(const f of[...diffOther,...diffSame]){
    if(distractors.length>=3) break;
    const snd=frenchSound(f.form);
    if(!usedSounds.has(snd)){usedSounds.add(snd);distractors.push(f.form);}
  }
  for(const f of[...diffOther,...diffSame]){ if(distractors.length>=3) break; if(!distractors.includes(f.form)) distractors.push(f.form); }
  for(const f of homophones.slice(1)){ if(distractors.length>=3) break; if(!distractors.includes(f.form)) distractors.push(f.form); }
  if(distractors.length<3&&verb.pp&&verb.pp!==correct&&!distractors.includes(verb.pp)) distractors.push(verb.pp);
  const options=shuffle([correct,...distractors.slice(0,3)]);
  return{gKey,vKey,tense,tenseLabel:tenseMap[tense],pronIdx,correct,options};
}

function answerClick(answer){
  if(!QS.active) return;
  const btns=document.querySelectorAll('.qBtn');
  btns.forEach(b=>b.disabled=true); QK.selectedBtn=null; syncQuestionKeyboardSelection();
  btns.forEach(b=>{ if(b.textContent===QS.q.correct)b.classList.add('ok'); if(b.textContent===answer&&answer!==QS.q.correct)b.classList.add('bad'); });
  if(answer===QS.q.correct){
    setTimeout(()=>{ closeQuestion(); defeatEnemy(QS.enemy); },700);
  } else {
    recordError(QS.q);
    if(navigator.vibrate) navigator.vibrate(200);
    setTimeout(()=>{ closeQuestion(); hitPlayer(); if(QS.enemy)QS.enemy.battling=false; },2500);
  }
}
function closeQuestion(){
  QS.active=false; QK.selectedBtn=null; syncQuestionKeyboardSelection();
  document.getElementById('qModal').classList.remove('show');
  GS.screen='game';
}
function defeatEnemy(e){
  if(!e) return;
  e.alive=false; e.battling=false;
  GS.score+=100; SAVE.totalStars+=10; saveSave();
  spawnBurst(e.x+e.w/2,e.y+e.h/2,'#a78bfa',14);
  showStarGain(e.x+e.w/2,e.y,'+10🪙');
}
function hitPlayer(){
  if(player.invTimer>0) return;
  GS.lives--; player.invTimer=110;
  spawnBurst(player.x+player.w/2,player.y+player.h/2,'#ef4444',10);
  if(GS.lives<=0) triggerGameOver();
}

// ── Particles ─────────────────────────────────────────────────────
function spawnBurst(x,y,color,n){
  for(let i=0;i<n;i++){
    const a=(Math.PI*2/n)*i+Math.random()*.4, s=80+Math.random()*130;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-50,life:1,color,sz:3+Math.random()*4});
  }
}

function enemyEmoji(type){ return{goblin:'👺',mummy:'🏺',yeti:'❄️',dwarf:'⛏️',wraith:'👻'}[type]||'👾'; }

// ── Physics ───────────────────────────────────────────────────────
function resolveAABB(a,b){
  if(!rectsTouch(a,b)) return;
  if(b.type==='platform'){
    if(a.vy>=0&&a.y+a.h-a.vy*0.05<=b.y+4){a.y=b.y-a.h;a.vy=0;a.onGround=true;}
    return;
  }
  const ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
  const oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  if(oy<ox){ if(a.y<b.y){a.y=b.y-a.h;a.vy=0;a.onGround=true;}else{a.y=b.y+b.h;a.vy=Math.max(0,a.vy);} }
  else{ if(a.x<b.x)a.x=b.x-a.w;else a.x=b.x+b.w; }
}
function rectsTouch(a,b){ return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }

function updatePhysics(dt){
  // Player movement
  player.vx=0;
  if(keys.left){player.vx=-PSPEED;player.facing=-1;}
  if(keys.right){player.vx=PSPEED;player.facing=1;}
  if(jumpRequest&&player.onGround){player.vy=JUMP_V;player.onGround=false;}
  jumpRequest=false;

  player.vy=Math.min(player.vy+GRAV*dt,MAX_FALL);
  player.x+=player.vx*dt; player.y+=player.vy*dt;
  player.x=Math.max(0,Math.min(worldW-player.w,player.x));

  player.onGround=false;
  for(const p of platforms) resolveAABB(player,p);

  // Fall out of world → respawn
  if(player.y>H+80){
    hitPlayer();
    player.x=Math.max(60,camX+60); player.y=H-200; player.vy=0;
  }

  // Walk animation
  if(player.vx!==0&&player.onGround) player.walkT=(player.walkT+dt*8)%1000;
  else if(player.onGround) player.walkT=0;

  if(player.invTimer>0) player.invTimer--;

  // Camera
  const targetCamX=player.x-W*0.35;
  camX=Math.max(0,Math.min(worldW-W,targetCamX));

  // Enemies
  for(const e of enemies){
    if(!e.alive||e.battling) continue;
    e.x+=e.vx*dt;
    if(e.x<e.platX||e.x+e.w>e.platX+e.platW){
      e.vx*=-1;
      e.x=Math.max(e.platX,Math.min(e.platX+e.platW-e.w,e.x));
    }
    e.facing=e.vx>0?1:-1;
    e.walkT=((e.walkT||0)+dt*6)%1000;
    const dx=(player.x+player.w/2)-(e.x+e.w/2);
    const dy=(player.y+player.h/2)-(e.y+e.h/2);
    e.alert=Math.abs(dx)<90&&Math.abs(dy)<70;
    if(!QS.active&&player.invTimer===0&&rectsTouch(player,e)) openQuestion(e);
  }

  // Stars
  for(const s of stars_list){
    if(s.collected) continue;
    s.phase+=dt*2.5;
    if(rectsTouch(player,{x:s.x,y:s.y+Math.sin(s.phase)*4,w:s.w,h:s.h})){
      s.collected=true; GS.stars++; SAVE.totalStars++; saveSave(); GS.score+=10;
      spawnBurst(s.x+s.w/2,s.y+s.h/2,'#ffd700',7);
    }
  }

  // Particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=GRAV*0.35*dt;p.life-=dt*1.8;
    if(p.life<=0)particles.splice(i,1);
  }

  updateStarGains(dt);

  // Gate — open when all enemies defeated, trigger level complete on touch
  if(gate){
    gate.open = enemies.length===0 || enemies.every(e=>!e.alive);
    if(gate.open && rectsTouch(player,gate)) triggerLevelComplete();
  }
}

// ── Drawing — background ──────────────────────────────────────────
function drawBackground(def){
  const t=Date.now()/1000;
  // Sky gradient
  const grd=ctx.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,def.sky1); grd.addColorStop(1,def.sky2);
  ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);

  if(def.bgTrees){
    // Parallax far trees
    const px=(-camX*0.15)%W;
    ctx.fillStyle='#0a2a0a';
    for(let x=px-W;x<W*2;x+=90){
      ctx.beginPath(); ctx.moveTo(x,GY); ctx.lineTo(x+45,GY-180); ctx.lineTo(x+90,GY);
      ctx.fill();
      ctx.fillStyle='#0d350d';
      ctx.beginPath(); ctx.moveTo(x+10,GY-80); ctx.lineTo(x+45,GY-230); ctx.lineTo(x+80,GY-80);
      ctx.fill(); ctx.fillStyle='#0a2a0a';
    }
    // Near trees
    const px2=(-camX*0.3)%W;
    ctx.fillStyle='#122a12';
    for(let x=px2-W;x<W*2;x+=60){
      ctx.beginPath(); ctx.moveTo(x,GY); ctx.lineTo(x+30,GY-130); ctx.lineTo(x+60,GY);
      ctx.fill();
    }
  }

  if(def.bgPyramids){
    const px=(-camX*0.1)%W;
    ctx.fillStyle='#7a5808';
    for(let x=px-W;x<W*2;x+=220){
      ctx.beginPath(); ctx.moveTo(x,GY); ctx.lineTo(x+110,GY-260); ctx.lineTo(x+220,GY);
      ctx.fill();
    }
    ctx.fillStyle='#9a7010';
    for(let x=px-W+60;x<W*2;x+=220){
      ctx.beginPath(); ctx.moveTo(x,GY); ctx.lineTo(x+70,GY-160); ctx.lineTo(x+140,GY);
      ctx.fill();
    }
  }

  if(def.bgMountains){
    const px=(-camX*0.08)%W;
    ctx.fillStyle='#1a2a4a';
    for(let x=px-W;x<W*2;x+=180){
      ctx.beginPath(); ctx.moveTo(x,GY); ctx.lineTo(x+90,GY-280); ctx.lineTo(x+180,GY);
      ctx.fill();
    }
    ctx.fillStyle='#e8f0f8';
    for(let x=px-W;x<W*2;x+=180){
      ctx.beginPath(); ctx.moveTo(x+60,GY-200); ctx.lineTo(x+90,GY-280); ctx.lineTo(x+120,GY-200);
      ctx.fill();
    }
  }

  if(def.bgCave){
    // Stalactites
    ctx.fillStyle='#282840';
    const px=(-camX*0.05)%W;
    for(let x=px-W;x<W*2;x+=55){
      const h=30+Math.sin(x*0.2)*15;
      ctx.fillRect(x,0,18,h);
    }
    // Glowing crystals
    for(let x=px-W;x<W*2;x+=80){
      const glow=ctx.createRadialGradient(x+9,50,2,x+9,50,16);
      glow.addColorStop(0,'rgba(100,100,255,0.6)');
      glow.addColorStop(1,'rgba(100,100,255,0)');
      ctx.fillStyle=glow;
      ctx.fillRect(x-7,34,32,32);
    }
  }

  if(def.bgDesolation){
    // Large red moon
    const mx=W*0.7+Math.sin(t*0.1)*8;
    const moonGrd=ctx.createRadialGradient(mx,100,20,mx,100,70);
    moonGrd.addColorStop(0,'#cc2020');
    moonGrd.addColorStop(0.6,'#881010');
    moonGrd.addColorStop(1,'rgba(80,0,0,0)');
    ctx.fillStyle=moonGrd;
    ctx.beginPath(); ctx.arc(mx,100,70,0,Math.PI*2); ctx.fill();
    // Void cracks
    ctx.strokeStyle='rgba(100,0,100,0.4)'; ctx.lineWidth=1;
    for(let i=0;i<6;i++){
      ctx.beginPath();
      ctx.moveTo(W/2+Math.cos(i)*80,H/2+Math.sin(i)*80);
      ctx.lineTo(W/2+Math.cos(i)*W,H/2+Math.sin(i)*W);
      ctx.stroke();
    }
  }
}

// ── Drawing — platforms ────────────────────────────────────────────
function drawPlatform(p, def){
  if(p.type==='ground'){
    // Ground: solid block with top stripe
    ctx.fillStyle=def.groundColor;
    ctx.fillRect(p.x,p.y,p.w,p.h);
    // Darker horizontal stripe
    ctx.fillStyle='rgba(0,0,0,0.25)';
    ctx.fillRect(p.x,p.y+8,p.w,p.h-8);
    // Top highlight
    ctx.fillStyle=def.accentColor||'rgba(255,255,255,0.15)';
    ctx.fillRect(p.x,p.y,p.w,4);
    // Brick lines on ground
    ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1;
    for(let bx=p.x;bx<p.x+p.w;bx+=40){ ctx.beginPath();ctx.moveTo(bx,p.y);ctx.lineTo(bx,p.y+p.h);ctx.stroke(); }
    ctx.beginPath();ctx.moveTo(p.x,p.y+20);ctx.lineTo(p.x+p.w,p.y+20);ctx.stroke();
  } else {
    // Floating platform: plank style
    ctx.fillStyle=def.platColor;
    ctx.fillRect(p.x,p.y,p.w,p.h);
    // Top highlight
    ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.fillRect(p.x,p.y,p.w,3);
    // Bottom shadow
    ctx.fillStyle='rgba(0,0,0,0.4)';
    ctx.fillRect(p.x,p.y+p.h-3,p.w,3);
    // Wood grain
    ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1;
    for(let bx=p.x+15;bx<p.x+p.w;bx+=20){ ctx.beginPath();ctx.moveTo(bx,p.y);ctx.lineTo(bx,p.y+p.h);ctx.stroke(); }
  }
}

// ── Drawing — hero ────────────────────────────────────────────────
function drawHero(p){
  const x=p.x, y=p.y, w=p.w, h=p.h;
  const inv=p.invTimer>0&&Math.floor(Date.now()/80)%2===0;
  if(inv){ ctx.globalAlpha=0.4; }

  // Walk leg animation
  const legSwing=Math.sin(p.walkT*Math.PI*2)*8;
  const isWalking=Math.abs(p.vx)>1&&p.onGround;
  const fl=p.facing<0;

  // Cape (behind body)
  ctx.fillStyle='#7c3aed';
  ctx.beginPath();
  ctx.moveTo(fl?x+4:x+w-4, y+10);
  ctx.lineTo(fl?x-8:x+w+8, y+16);
  ctx.lineTo(fl?x-6:x+w+6, y+h*0.7);
  ctx.lineTo(fl?x+4:x+w-4, y+h*0.6);
  ctx.closePath(); ctx.fill();

  // Legs
  ctx.fillStyle='#1e3a5f';
  if(isWalking){
    // Front leg
    ctx.fillRect(fl?x+4:x+8, y+h*0.62+legSwing, 10, h*0.38-legSwing);
    // Back leg
    ctx.fillRect(fl?x+w-14:x+w-18, y+h*0.62-legSwing, 10, h*0.38+legSwing);
  } else {
    ctx.fillRect(x+4, y+h*0.62, 10, h*0.38);
    ctx.fillRect(x+w-14, y+h*0.62, 10, h*0.38);
  }
  // Boots
  ctx.fillStyle='#0f1f3f';
  if(isWalking){
    ctx.fillRect(fl?x+2:x+6, y+h-8+legSwing, 14, 8);
    ctx.fillRect(fl?x+w-16:x+w-20, y+h-8-legSwing, 14, 8);
  } else {
    ctx.fillRect(x+2, y+h-8, 14, 8);
    ctx.fillRect(x+w-16, y+h-8, 14, 8);
  }

  // Body / armor
  ctx.fillStyle='#4a90d9';
  ctx.fillRect(x+3, y+h*0.3, w-6, h*0.35);
  // Chest plate
  ctx.fillStyle='#6ab0f9';
  ctx.fillRect(x+5, y+h*0.3+2, w-10, h*0.18);
  // Armor lines
  ctx.strokeStyle='#2a5a99'; ctx.lineWidth=1;
  ctx.strokeRect(x+3, y+h*0.3, w-6, h*0.35);

  // Sword arm
  ctx.fillStyle='#8a8a8a';
  if(fl){
    ctx.fillRect(x-8, y+h*0.35, 14, 5);
    ctx.fillStyle='#e0e0e0';
    ctx.fillRect(x-18, y+h*0.33, 12, 9);
  } else {
    ctx.fillRect(x+w-6, y+h*0.35, 14, 5);
    ctx.fillStyle='#e0e0e0';
    ctx.fillRect(x+w+6, y+h*0.33, 12, 9);
  }

  // Helmet
  ctx.fillStyle='#3a7ac9';
  ctx.beginPath();
  ctx.arc(x+w/2, y+h*0.22, w/2-1, Math.PI, 0);
  ctx.fillRect(x+2, y+h*0.18, w-4, h*0.16);
  ctx.fill();
  ctx.fillStyle='#5a9ae9';
  ctx.fillRect(x+4, y+h*0.18, w-8, 5);

  // Visor glow
  ctx.fillStyle='#22ffaa';
  ctx.globalAlpha=(inv?0.2:0.85);
  if(fl){
    ctx.fillRect(x+3, y+h*0.16, w*0.45, 6);
  } else {
    ctx.fillRect(x+w*0.5, y+h*0.16, w*0.45, 6);
  }
  ctx.globalAlpha=inv?0.4:1;

  // Alert indicator
  if(p.alert){ ctx.fillStyle='#fbbf24'; ctx.font='14px Arial'; ctx.textAlign='center'; ctx.fillText('!',x+w/2,y-6); }
  ctx.globalAlpha=1;
}

// ── Drawing — goblin ──────────────────────────────────────────────
function drawGoblin(e){
  const x=e.x, y=e.y, w=e.w, h=e.h;
  const leg=Math.sin(e.walkT*Math.PI*2)*7;
  const fl=e.facing<0;

  // Body
  ctx.fillStyle='#2d7a2d';
  ctx.fillRect(x+4, y+h*0.35, w-8, h*0.42);

  // Legs
  ctx.fillStyle='#1a5a1a';
  ctx.fillRect(x+4, y+h*0.72+leg, 9, h*0.28-leg);
  ctx.fillRect(x+w-13, y+h*0.72-leg, 9, h*0.28+leg);

  // Arms
  ctx.fillStyle='#3a8a3a';
  if(fl){
    ctx.fillRect(x-5, y+h*0.38, 12, 6);
    ctx.fillRect(x+w-7, y+h*0.38, 12, 6);
  } else {
    ctx.fillRect(x-5, y+h*0.38, 12, 6);
    ctx.fillRect(x+w-7, y+h*0.38, 12, 6);
  }

  // Head
  ctx.fillStyle='#3a9a3a';
  ctx.beginPath(); ctx.arc(x+w/2, y+h*0.22, w/2, 0, Math.PI*2); ctx.fill();

  // Pointy ears
  ctx.fillStyle='#2d7a2d';
  ctx.beginPath(); ctx.moveTo(x+2, y+h*0.14); ctx.lineTo(x-6, y+h*0.02); ctx.lineTo(x+8, y+h*0.16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x+w-2, y+h*0.14); ctx.lineTo(x+w+6, y+h*0.02); ctx.lineTo(x+w-8, y+h*0.16); ctx.fill();

  // Eyes
  ctx.fillStyle='#cc0000';
  ctx.beginPath(); ctx.arc(x+w/2-5, y+h*0.18, 4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+5, y+h*0.18, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff4444';
  ctx.beginPath(); ctx.arc(x+w/2-4, y+h*0.17, 1.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+6, y+h*0.17, 1.5, 0, Math.PI*2); ctx.fill();

  // Fangs
  ctx.fillStyle='#fffff0';
  ctx.fillRect(x+w/2-4, y+h*0.28, 3, 5);
  ctx.fillRect(x+w/2+1, y+h*0.28, 3, 5);

  // Alert
  if(e.alert){ ctx.fillStyle='#ff4444'; ctx.font='14px Arial'; ctx.textAlign='center'; ctx.fillText('!',x+w/2,y-6); }
}

// ── Drawing — mummy ───────────────────────────────────────────────
function drawMummy(e){
  const x=e.x, y=e.y, w=e.w, h=e.h;
  const leg=Math.sin(e.walkT*Math.PI*2)*6;

  // Body bandages
  ctx.fillStyle='#d4c4a0';
  ctx.fillRect(x+4, y+h*0.32, w-8, h*0.45);
  // Bandage wraps
  ctx.strokeStyle='#b09878'; ctx.lineWidth=2;
  for(let i=0;i<3;i++){
    ctx.beginPath(); ctx.moveTo(x+4, y+h*(0.37+i*0.12)); ctx.lineTo(x+w-4, y+h*(0.37+i*0.12)); ctx.stroke();
  }

  // Legs
  ctx.fillStyle='#c4b490';
  ctx.fillRect(x+5, y+h*0.73+leg, 8, h*0.27-leg);
  ctx.fillRect(x+w-13, y+h*0.73-leg, 8, h*0.27+leg);
  ctx.strokeStyle='#a09070'; ctx.lineWidth=1;
  ctx.strokeRect(x+5, y+h*0.73, 8, h*0.27);
  ctx.strokeRect(x+w-13, y+h*0.73, 8, h*0.27);

  // Arms
  ctx.fillStyle='#c4b490';
  ctx.fillRect(x-4, y+h*0.36, 11, 7);
  ctx.fillRect(x+w-7, y+h*0.36, 11, 7);

  // Head
  ctx.fillStyle='#d4c4a0';
  ctx.beginPath(); ctx.arc(x+w/2, y+h*0.2, w/2-1, 0, Math.PI*2); ctx.fill();
  // Head wrap
  ctx.strokeStyle='#b09878'; ctx.lineWidth=2;
  for(let i=0;i<2;i++){
    ctx.beginPath(); ctx.arc(x+w/2, y+h*0.2, w/2-2-i*4, -Math.PI*0.7, Math.PI*0.7); ctx.stroke();
  }

  // Glowing golden eyes
  const glow=Math.sin(Date.now()/400)*0.3+0.7;
  ctx.fillStyle=`rgba(255,220,0,${glow})`;
  ctx.beginPath(); ctx.arc(x+w/2-5, y+h*0.17, 4.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+5, y+h*0.17, 4.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#aa8800';
  ctx.beginPath(); ctx.arc(x+w/2-5, y+h*0.17, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+5, y+h*0.17, 2, 0, Math.PI*2); ctx.fill();

  if(e.alert){ ctx.fillStyle='#ffd700'; ctx.font='14px Arial'; ctx.textAlign='center'; ctx.fillText('!',x+w/2,y-6); }
}

// ── Drawing — yeti ────────────────────────────────────────────────
function drawYeti(e){
  const x=e.x, y=e.y, w=e.w, h=e.h;
  const leg=Math.sin(e.walkT*Math.PI*2)*7;
  const bob=Math.sin(Date.now()/500)*2;

  // Body — big round fluffy
  ctx.fillStyle='#b8d4e8';
  ctx.beginPath(); ctx.arc(x+w/2, y+h*0.48+bob, w*0.55, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#d0e8f8';
  ctx.beginPath(); ctx.arc(x+w/2-3, y+h*0.44+bob, w*0.4, 0, Math.PI*2); ctx.fill();

  // Legs
  ctx.fillStyle='#98bcd8';
  ctx.fillRect(x+4, y+h*0.72+leg+bob, 11, h*0.28-leg);
  ctx.fillRect(x+w-15, y+h*0.72-leg+bob, 11, h*0.28+leg);
  ctx.fillStyle='#78a0c0';
  ctx.fillRect(x+2, y+h-10+bob, 15, 10);
  ctx.fillRect(x+w-17, y+h-10+bob, 15, 10);

  // Big arms
  ctx.fillStyle='#b8d4e8';
  ctx.beginPath(); ctx.arc(x, y+h*0.45+bob, 10, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w, y+h*0.45+bob, 10, 0, Math.PI*2); ctx.fill();

  // Head
  ctx.fillStyle='#c8e0f4';
  ctx.beginPath(); ctx.arc(x+w/2, y+h*0.2+bob, w/2, 0, Math.PI*2); ctx.fill();
  // Inner ears
  ctx.fillStyle='#e8c0c0';
  ctx.beginPath(); ctx.arc(x+4, y+h*0.08+bob, 6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w-4, y+h*0.08+bob, 6, 0, Math.PI*2); ctx.fill();

  // Eyes
  ctx.fillStyle='#1a3a5a';
  ctx.beginPath(); ctx.arc(x+w/2-6, y+h*0.18+bob, 5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+6, y+h*0.18+bob, 5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#4488cc';
  ctx.beginPath(); ctx.arc(x+w/2-5, y+h*0.17+bob, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+7, y+h*0.17+bob, 2, 0, Math.PI*2); ctx.fill();

  // Fangs
  ctx.fillStyle='#fff';
  ctx.fillRect(x+w/2-5, y+h*0.27+bob, 4, 6);
  ctx.fillRect(x+w/2+1, y+h*0.27+bob, 4, 6);

  if(e.alert){ ctx.fillStyle='#88ccff'; ctx.font='14px Arial'; ctx.textAlign='center'; ctx.fillText('!',x+w/2,y-6+bob); }
}

// ── Drawing — dwarf ───────────────────────────────────────────────
function drawDwarf(e){
  const x=e.x, y=e.y, w=e.w, h=e.h;
  const leg=Math.sin(e.walkT*Math.PI*2)*6;
  const fl=e.facing<0;

  // Stocky body — stone armor
  ctx.fillStyle='#5a5a7a';
  ctx.fillRect(x+2, y+h*0.3, w-4, h*0.48);
  // Armor highlights
  ctx.fillStyle='#6a6a8a';
  ctx.fillRect(x+2, y+h*0.3, w-4, 6);
  ctx.fillRect(x+2, y+h*0.3+6, 6, h*0.42-6);
  ctx.fillRect(x+w-8, y+h*0.3+6, 6, h*0.42-6);
  ctx.strokeStyle='#3a3a5a'; ctx.lineWidth=1; ctx.strokeRect(x+2, y+h*0.3, w-4, h*0.48);

  // Short stocky legs
  ctx.fillStyle='#4a4a6a';
  ctx.fillRect(x+4, y+h*0.74+leg, 10, h*0.26-leg);
  ctx.fillRect(x+w-14, y+h*0.74-leg, 10, h*0.26+leg);
  ctx.fillStyle='#3a3a5a';
  ctx.fillRect(x+3, y+h-8, 12, 8);
  ctx.fillRect(x+w-15, y+h-8, 12, 8);

  // Axe
  ctx.fillStyle='#888';
  if(fl){
    ctx.fillRect(x-12, y+h*0.3, 5, 24);
    ctx.fillStyle='#aaa';
    ctx.beginPath(); ctx.moveTo(x-12, y+h*0.3); ctx.lineTo(x-22, y+h*0.3-8); ctx.lineTo(x-22, y+h*0.3+16); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillRect(x+w+7, y+h*0.3, 5, 24);
    ctx.fillStyle='#aaa';
    ctx.beginPath(); ctx.moveTo(x+w+12, y+h*0.3); ctx.lineTo(x+w+22, y+h*0.3-8); ctx.lineTo(x+w+22, y+h*0.3+16); ctx.closePath(); ctx.fill();
  }

  // Head with horned helmet
  ctx.fillStyle='#5a5a7a';
  ctx.fillRect(x+2, y+h*0.14, w-4, h*0.2);
  ctx.fillRect(x+1, y+h*0.1, w-2, h*0.1);
  // Horns
  ctx.fillStyle='#8a7050';
  ctx.beginPath(); ctx.moveTo(x+2, y+h*0.1); ctx.lineTo(x-6, y-4); ctx.lineTo(x+8, y+h*0.1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x+w-2, y+h*0.1); ctx.lineTo(x+w+6, y-4); ctx.lineTo(x+w-8, y+h*0.1); ctx.fill();
  // Face
  ctx.fillStyle='#c09060';
  ctx.fillRect(x+4, y+h*0.17, w-8, h*0.14);
  // Eyes
  ctx.fillStyle='#e0b040';
  ctx.beginPath(); ctx.arc(x+w/2-4, y+h*0.2, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+4, y+h*0.2, 3.5, 0, Math.PI*2); ctx.fill();
  // Beard
  ctx.fillStyle='#8a6a30';
  ctx.fillRect(x+4, y+h*0.28, w-8, 8);
  ctx.beginPath(); ctx.moveTo(x+4, y+h*0.36); ctx.lineTo(x+w/2, y+h*0.46); ctx.lineTo(x+w-4, y+h*0.36); ctx.fill();

  if(e.alert){ ctx.fillStyle='#e0b040'; ctx.font='14px Arial'; ctx.textAlign='center'; ctx.fillText('!',x+w/2,y-10); }
}

// ── Drawing — wraith ──────────────────────────────────────────────
function drawWraith(e){
  const x=e.x, y=e.y, w=e.w, h=e.h;
  const t=Date.now()/600;
  const sway=Math.sin(t)*5;
  const pulse=Math.sin(t*1.7)*0.15+0.65;

  // Aura
  const aura=ctx.createRadialGradient(x+w/2+sway, y+h/2, 4, x+w/2+sway, y+h/2, w);
  aura.addColorStop(0,'rgba(160,0,200,0.25)');
  aura.addColorStop(1,'rgba(160,0,200,0)');
  ctx.fillStyle=aura;
  ctx.beginPath(); ctx.arc(x+w/2+sway, y+h/2, w, 0, Math.PI*2); ctx.fill();

  // Ghostly body
  ctx.globalAlpha=pulse;
  ctx.fillStyle='#3a0a4a';
  ctx.beginPath();
  ctx.moveTo(x+w/2+sway, y+4);
  ctx.bezierCurveTo(x+w+sway, y+h*0.2, x+w+4+sway, y+h*0.6, x+w/2+sway, y+h*0.9);
  ctx.bezierCurveTo(x-4+sway, y+h*0.6, x+sway, y+h*0.2, x+w/2+sway, y+4);
  ctx.fill();
  ctx.fillStyle='#5a1a7a';
  ctx.beginPath();
  ctx.moveTo(x+w/2+sway, y+6);
  ctx.bezierCurveTo(x+w-4+sway, y+h*0.2, x+w+sway, y+h*0.55, x+w/2+sway, y+h*0.85);
  ctx.bezierCurveTo(x+sway, y+h*0.55, x+4+sway, y+h*0.2, x+w/2+sway, y+6);
  ctx.fill();

  // Tentacle arms
  ctx.strokeStyle='rgba(90,26,122,0.8)'; ctx.lineWidth=4;
  for(let i=-1;i<=1;i+=2){
    ctx.beginPath();
    ctx.moveTo(x+w/2+sway+i*8, y+h*0.5);
    ctx.bezierCurveTo(x+w/2+sway+i*30, y+h*0.45, x+w/2+sway+i*24, y+h*0.72, x+w/2+sway+i*36, y+h*0.78);
    ctx.stroke();
  }

  // Eyes
  ctx.globalAlpha=pulse+0.2;
  ctx.fillStyle='#cc00ff';
  ctx.beginPath(); ctx.arc(x+w/2-7+sway, y+h*0.26, 6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+7+sway, y+h*0.26, 6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#ffffff';
  ctx.beginPath(); ctx.arc(x+w/2-6+sway, y+h*0.25, 2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+w/2+8+sway, y+h*0.25, 2, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  if(e.alert){ ctx.fillStyle='#cc00ff'; ctx.font='14px Arial'; ctx.textAlign='center'; ctx.fillText('!',x+w/2+sway,y-8); }
}

// ── Drawing — star ────────────────────────────────────────────────
function drawStar(s){
  const t=Date.now()/400;
  const bob=Math.sin(s.phase+t)*4;
  const cx=s.x+s.w/2, cy=s.y+s.h/2+bob;
  const r=s.w/2, ri=r*0.42;
  const pts=5;
  // Glow
  const glow=ctx.createRadialGradient(cx,cy,1,cx,cy,r*1.6);
  glow.addColorStop(0,'rgba(255,220,0,0.5)');
  glow.addColorStop(1,'rgba(255,220,0,0)');
  ctx.fillStyle=glow;
  ctx.beginPath(); ctx.arc(cx,cy,r*1.6,0,Math.PI*2); ctx.fill();
  // Star shape
  ctx.fillStyle='#ffd700';
  ctx.beginPath();
  for(let i=0;i<pts*2;i++){
    const angle=i*Math.PI/pts - Math.PI/2;
    const rr=i%2===0?r:ri;
    i===0?ctx.moveTo(cx+Math.cos(angle)*rr, cy+Math.sin(angle)*rr)
         :ctx.lineTo(cx+Math.cos(angle)*rr, cy+Math.sin(angle)*rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#f59e0b'; ctx.lineWidth=1;
  ctx.stroke();
}

// ── Drawing — gate ────────────────────────────────────────────────
function drawGate(g){
  const{x,y,w,h,open}=g;
  if(!open){
    // Stone arch
    ctx.fillStyle='#5a5a6a';
    ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#3a3a4a';
    ctx.fillRect(x+2,y+2,w-4,h-2);
    // Bars
    ctx.fillStyle='#888';
    for(let i=0;i<4;i++) ctx.fillRect(x+8+i*11,y+6,5,h-10);
    // Horizontal bars
    ctx.fillRect(x+4,y+h*0.35,w-8,5);
    ctx.fillRect(x+4,y+h*0.6,w-8,5);
    // Padlock
    ctx.fillStyle='#ffd700';
    ctx.fillRect(x+w/2-6,y+h*0.42,12,10);
    ctx.strokeStyle='#b8900a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x+w/2, y+h*0.42, 5, Math.PI, 0); ctx.stroke();
    // Arch top
    ctx.fillStyle='#5a5a6a';
    ctx.beginPath(); ctx.arc(x+w/2, y, w/2, Math.PI, 0); ctx.fill();
  } else {
    // Open portal — pulsing green
    const t=Date.now()/500;
    const grd=ctx.createRadialGradient(x+w/2,y+h/2,4,x+w/2,y+h/2,w*0.8);
    const pulse=Math.sin(t)*0.15+0.7;
    grd.addColorStop(0,`rgba(0,255,120,${pulse})`);
    grd.addColorStop(0.5,`rgba(0,180,80,${pulse*0.6})`);
    grd.addColorStop(1,'rgba(0,80,40,0)');
    ctx.fillStyle=grd;
    ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w*0.8,0,Math.PI*2); ctx.fill();
    // Portal ring
    ctx.strokeStyle=`rgba(0,255,120,${pulse})`;
    ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w/2-2,0,Math.PI*2); ctx.stroke();
    ctx.lineWidth=2;
    ctx.strokeStyle='rgba(120,255,180,0.8)';
    ctx.beginPath(); ctx.arc(x+w/2,y+h/2,w/2+4,0,Math.PI*2); ctx.stroke();
    // Text
    ctx.fillStyle='#00ff88'; ctx.font='bold 10px Courier New'; ctx.textAlign='center';
    ctx.fillText('SORTIE',x+w/2,y+h+14);
  }
}

// ── Drawing — dispatch ────────────────────────────────────────────
function drawEnemy(e){
  ctx.save();
  // flip canvas for left-facing enemies that aren't wraith/mummy (symmetric)
  switch(e.type){
    case 'goblin': drawGoblin(e); break;
    case 'mummy':  drawMummy(e);  break;
    case 'yeti':   drawYeti(e);   break;
    case 'dwarf':  drawDwarf(e);  break;
    case 'wraith': drawWraith(e); break;
    default:       drawGoblin(e); break;
  }
  ctx.restore();
}

// ── HUD ───────────────────────────────────────────────────────────
function drawHUD(){
  const lvl=LEVELS[GS.level];
  ctx.fillStyle='rgba(0,0,0,0.65)';
  ctx.fillRect(0,0,W,46);

  // Lives
  ctx.font='21px Arial'; ctx.textAlign='left';
  for(let i=0;i<3;i++) ctx.fillText(i<GS.lives?'❤️':'🖤',8+i*30,33);

  // Score
  ctx.fillStyle='#e2e8f0'; ctx.font='bold 15px Courier New'; ctx.textAlign='right';
  ctx.fillText(`${GS.score} pts`,W-8,31);

  // Stars
  ctx.fillStyle='#ffd700'; ctx.textAlign='center'; ctx.font='13px Courier New';
  ctx.fillText(`⭐ ${GS.stars}/${GS.maxStars}`,W/2,31);

  // Level name
  ctx.fillStyle='#a78bfa'; ctx.font='10px Courier New';
  ctx.fillText(`Niv.${GS.level+1} · ${lvl.name}`,W/2,12);

  // Coins
  ctx.fillStyle='#fbbf24'; ctx.textAlign='left'; ctx.font='bold 11px Courier New';
  ctx.fillText(`🪙${SAVE.totalStars}`,100,12);

  // Enemies
  const alive=enemies.filter(e=>e.alive).length;
  ctx.fillStyle=alive>0?'#fca5a5':'#86efac';
  ctx.textAlign='right'; ctx.font='10px Courier New';
  ctx.fillText(`👾 ${alive} restant${alive>1?'s':''}`,W-8,12);

  // Version
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.textAlign='left'; ctx.font='9px Courier New';
  ctx.fillText(VERSION,6,12);
}

// ── Main render ───────────────────────────────────────────────────
function render(){
  ctx.imageSmoothingEnabled=false;
  const def=LEVEL_DEFS[GS.level];

  drawBackground(def);

  ctx.save();
  ctx.translate(-camX,0);

  // Ground platforms
  for(const p of platforms) if(p.type==='ground') drawPlatform(p,def);
  // Floating platforms
  for(const p of platforms) if(p.type==='platform') drawPlatform(p,def);

  // Stars
  for(const s of stars_list) if(!s.collected) drawStar(s);

  // Gate
  if(gate) drawGate(gate);

  // Enemies
  for(const e of enemies) if(e.alive) drawEnemy(e);

  // Particles
  for(const p of particles){
    ctx.globalAlpha=Math.max(0,p.life);
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
  }
  ctx.globalAlpha=1;

  // Hero
  drawHero(player);

  ctx.restore();

  // Star gain popups (screen-space)
  drawStarGains();

  // HUD
  drawHUD();
}

// ── Pause overlay ─────────────────────────────────────────────────
function drawPauseOverlay(){
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.font='bold 36px Courier New'; ctx.textAlign='center';
  ctx.fillText('⏸ PAUSE',W/2,H/2);
  ctx.font='14px Courier New'; ctx.fillStyle='#94a3b8';
  ctx.fillText('Appuie sur ⏸ pour reprendre',W/2,H/2+36);
}

// ── Screen management ─────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  const el=document.getElementById(id); if(el) el.classList.remove('hidden');
  document.getElementById('gameHUDBtns').style.display='none';
  document.body.classList.add('screen-mode');
}
function hideScreens(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  document.getElementById('gameHUDBtns').style.display='flex';
  document.body.classList.remove('screen-mode');
}

function startLevel(idx){
  GS.level=idx; GS.score=0; GS.lives=3; GS.stars=0;
  if(idx===0) GS.total=0;
  loadLevel(LEVEL_DEFS[idx] ? idx : 0);
  GS.screen='game'; hideScreens();
  document.getElementById('ctrl').style.display='flex';
}

function triggerLevelComplete(){
  if(GS.screen==='levelComplete') return;
  GS.screen='levelComplete';
  const totalEn=enemies.length, killed=enemies.filter(e=>!e.alive).length;
  const starCount=Math.min(3,1+Math.floor(GS.stars/Math.max(1,GS.maxStars)*2)+(killed===totalEn?1:0));
  GS.total+=GS.score;
  const starsHtml='⭐'.repeat(starCount)+'☆'.repeat(3-starCount);
  document.getElementById('lcEmoji').textContent=LEVELS[GS.level].emoji;
  document.getElementById('lcTitle').textContent=`NIVEAU ${GS.level+1} TERMINÉ !`;
  document.getElementById('lcMsg').innerHTML=
    `<div style="font-size:34px;margin-bottom:10px">${starsHtml}</div>
     Score : <b style="color:#ffd700">${GS.score}</b><br>
     Étoiles : ${GS.stars}/${GS.maxStars}<br>
     <span style="color:#a78bfa">Ennemis : ${killed}/${totalEn}</span>`;
  document.getElementById('nextLevelBtn').textContent=
    GS.level>=LEVELS.length-1?'🏆 RÉSULTAT FINAL':'▶ NIVEAU SUIVANT';
  showScreen('levelCompleteScreen');
}

function triggerGameOver(){
  GS.screen='gameOver';
  document.getElementById('gameOverMsg').innerHTML=
    `Niveau ${GS.level+1} &middot; Score : <b style="color:#ffd700">${GS.score}</b>`;
  showScreen('gameOverScreen');
}

// ── Theme ─────────────────────────────────────────────────────────
let currentTheme=localStorage.getItem('cqTheme')||'sombre';
function applyTheme(t){
  currentTheme=t;
  localStorage.setItem('cqTheme',t);
  document.body.classList.toggle('theme-funny',t==='funny');
  document.querySelectorAll('.themeTog').forEach(b=>b.classList.toggle('on',b.dataset.theme===t));
}

// ── Button listeners ──────────────────────────────────────────────
document.getElementById('playBtn').addEventListener('click',()=>startLevel(0));
document.getElementById('settingsBtn').addEventListener('click',()=>{ showScreen('settingsScreen'); renderErrorList(); });
document.getElementById('shopBtn').addEventListener('click',()=>{ showScreen('shopScreen'); renderShop(); });
document.getElementById('shopBackBtn').addEventListener('click',()=>{
  if(GS._shopFromGame){ GS._shopFromGame=false; GS.paused=false; document.getElementById('inGamePauseBtn').classList.remove('active'); hideScreens(); GS.screen='game'; document.getElementById('ctrl').style.display='flex'; }
  else showScreen('startScreen');
  renderShop();
});

document.getElementById('inGamePauseBtn').addEventListener('click',()=>{
  GS.paused=!GS.paused;
  document.getElementById('inGamePauseBtn').classList.toggle('active',GS.paused);
});
document.getElementById('inGameShopBtn').addEventListener('click',()=>{
  GS.paused=true; GS._shopFromGame=true;
  document.getElementById('ctrl').style.display='none';
  showScreen('shopScreen'); renderShop();
});
document.getElementById('inGameMenuBtn').addEventListener('click',()=>{
  GS.paused=false; GS.screen='start';
  document.getElementById('ctrl').style.display='none';
  showScreen('startScreen'); renderShop();
});

document.getElementById('resetErrorsBtn').addEventListener('click',resetErrors);
document.getElementById('settingsBackBtn').addEventListener('click',()=>showScreen('startScreen'));
document.getElementById('howtoBtn').addEventListener('click',()=>showScreen('howtoScreen'));
document.getElementById('howtoBackBtn').addEventListener('click',()=>showScreen('startScreen'));

document.querySelectorAll('.themeTog').forEach(btn=>{
  btn.addEventListener('click',()=>applyTheme(btn.dataset.theme));
});

// Settings toggles
document.querySelectorAll('.tog:not(.themeTog):not(.sprTog)').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const type=btn.dataset.type, val=btn.dataset.val;
    const arr=type==='group'?SETTINGS.groups:SETTINGS.tenses;
    const idx=arr.indexOf(val);
    if(idx>=0){
      if(arr.length>1){ arr.splice(idx,1); btn.classList.remove('on'); document.getElementById('setWarn').textContent=''; }
      else document.getElementById('setWarn').textContent=`⚠️ Garde au moins un ${type==='group'?'groupe':'temps'} actif.`;
    } else { arr.push(val); btn.classList.add('on'); document.getElementById('setWarn').textContent=''; }
  });
});

// Sprite toggle — no-op (no sprites used)
document.querySelectorAll('.sprTog').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.sprTog').forEach(b=>b.classList.toggle('on',b===btn));
  });
});

document.getElementById('retryBtn').addEventListener('click',()=>startLevel(GS.level));
document.getElementById('menuBtn').addEventListener('click',()=>showScreen('startScreen'));
document.getElementById('menuBtn2').addEventListener('click',()=>showScreen('startScreen'));
document.getElementById('menuBtn3').addEventListener('click',()=>showScreen('startScreen'));
document.getElementById('playAgainBtn').addEventListener('click',()=>startLevel(0));

document.getElementById('nextLevelBtn').addEventListener('click',()=>{
  if(GS.level>=LEVELS.length-1){
    document.getElementById('finalScore').innerHTML=
      `Score total : <b style="color:#ffd700">${GS.total}</b><br><br>
       Tu maîtrises maintenant :<br>
       🟣 Groupe 1 · Présent & Imparfait<br>
       🔵 Groupe 2 · Présent & Imparfait<br>
       🔴 Groupe 3 · Présent & Futur simple`;
    showScreen('winScreen');
  } else { startLevel(GS.level+1); }
});

// ── Game loop ─────────────────────────────────────────────────────
let lastT=0;
function loop(t){
  const dt=Math.min((t-lastT)/1000,.05);
  lastT=t;
  if(GS.screen==='game'&&!GS.paused) updatePhysics(dt);
  if(GS.screen==='game'||GS.screen==='question'){
    render();
    if(GS.paused) drawPauseOverlay();
  }
  requestAnimationFrame(loop);
}

// ── Init ──────────────────────────────────────────────────────────
document.getElementById('ctrl').style.display='none';
applyTheme(currentTheme);
showScreen('startScreen');
document.getElementById('menuStars').textContent=`🪙${SAVE.totalStars}`;
requestAnimationFrame(loop);

