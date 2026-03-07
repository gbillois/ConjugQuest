'use strict';

const VERSION = 'v1.8';

// ── Background image ──────────────────────────────────────────
const bgImage = new Image();
bgImage.src = 'assets/ChatGPT Image Mar 6, 2026, 04_18_59 PM.png';
let bgImageReady = false;
bgImage.onload = () => { bgImageReady = true; };

// ── Platform sprites ──────────────────────────────────────────
const platGroundImg = new Image();
platGroundImg.src = 'assets/ground platform.png';
let platGroundReady = false;
platGroundImg.onload = () => { platGroundReady = true; };

const platFloatImg = new Image();
platFloatImg.src = 'assets/floating platform.png';
let platFloatReady = false;
platFloatImg.onload = () => { platFloatReady = true; };

const pillarImg = new Image();
pillarImg.src = 'assets/pillar.png';
let pillarReady = false;
pillarImg.onload = () => { pillarReady = true; };

// ════════════════════════════════════════════════════════════════
//  PALADIN SPRITE LOADER
// ════════════════════════════════════════════════════════════════

const PALADIN_BASE = 'assets/brave_paladin/';
const PALADIN_SPRITES = { idle:{}, run:{}, jump:{} };
let paladinSpritesReady = false;

(function loadPaladinSprites(){
  const toLoad = [];
  function img(src){
    const i = new Image();
    const p = new Promise(r => { i.onload = r; i.onerror = r; });
    i.src = PALADIN_BASE + src;
    toLoad.push(p);
    return i;
  }
  // Idle (static rotations)
  PALADIN_SPRITES.idle.right = img('rotations/east.png');
  PALADIN_SPRITES.idle.left  = img('rotations/west.png');
  // Run — 6 frames per direction
  PALADIN_SPRITES.run.right = [];
  PALADIN_SPRITES.run.left  = [];
  for(let i=0;i<6;i++){
    const pad = String(i).padStart(3,'0');
    PALADIN_SPRITES.run.right.push(img('animations/running-6-frames/south-east/frame_'+pad+'.png'));
    PALADIN_SPRITES.run.left.push(img('animations/running-6-frames/south-west/frame_'+pad+'.png'));
  }
  // Jump — 8 frames per direction
  PALADIN_SPRITES.jump.right = [];
  PALADIN_SPRITES.jump.left  = [];
  for(let i=0;i<8;i++){
    const pad = String(i).padStart(3,'0');
    PALADIN_SPRITES.jump.right.push(img('animations/jumping-2/south-east/frame_'+pad+'.png'));
    PALADIN_SPRITES.jump.left.push(img('animations/jumping-2/south-west/frame_'+pad+'.png'));
  }
  Promise.all(toLoad).then(()=>{ paladinSpritesReady = true; });
})();

// ════════════════════════════════════════════════════════════════
//  CANVAS
// ════════════════════════════════════════════════════════════════

const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const W = 480, H = 640;
canvas.width  = W;
canvas.height = H;

// ════════════════════════════════════════════════════════════════
//  ÉTAT DU JEU
// ════════════════════════════════════════════════════════════════

const GS = {
  screen : 'start', // 'game' | 'question' | 'levelComplete' | 'gameOver' | 'win'
  paused : false,
  level  : 0,
  lives  : 3,
  score  : 0,
  total  : 0,
  stars  : 0,
  maxStars: 0,
};

// ════════════════════════════════════════════════════════════════
//  PHYSIQUE — CONSTANTES
// ════════════════════════════════════════════════════════════════

const GRAV        = 1500;  // px/s²
const PSPEED      = 195;   // px/s déplacement horizontal
const JUMP_V      = -560;  // px/s vitesse initiale saut
const MAX_FALL    = 900;   // vitesse chute max

// ════════════════════════════════════════════════════════════════
//  OBJETS DE JEU
// ════════════════════════════════════════════════════════════════

let platforms = [], enemies = [], stars_list = [], particles = [];
let bricks = [], bonuses = [], pillars = [];
let flag = null;
let castle = null, castleChestState = 'closed', castleRewardCoins = 0;
let castlePlayerSavedX = 80;
let chestExplodeT = 0;
let camX = 0, worldW = 0;

const player = {
  x:80, y:400, w:28, h:44,
  vx:0, vy:0,
  onGround:false,
  facing:1,
  alive:true,
  invTimer:0,  // frames d'invincibilité
  walkT:0,
};

// ════════════════════════════════════════════════════════════════
//  INPUT
// ════════════════════════════════════════════════════════════════

const keys = {left:false, right:false};
let jumpRequest = false;

// Clavier
document.addEventListener('keydown', e => {
  if(e.code==='ArrowLeft'  || e.code==='KeyA') keys.left  = true;
  if(e.code==='ArrowRight' || e.code==='KeyD') keys.right = true;
  if((e.code==='ArrowUp' || e.code==='Space' || e.code==='KeyW') && !e.repeat) jumpRequest = true;
});
document.addEventListener('keyup', e => {
  if(e.code==='ArrowLeft'  || e.code==='KeyA') keys.left  = false;
  if(e.code==='ArrowRight' || e.code==='KeyD') keys.right = false;
});

function setupTouchBtn(id, leftKey, rightKey, isJump) {
  const el = document.getElementById(id);
  const on  = () => { if(leftKey) keys[leftKey]=true;  if(rightKey) keys[rightKey]=true;  if(isJump) jumpRequest=true; el.classList.add('pressed'); };
  const off = () => { if(leftKey) keys[leftKey]=false; if(rightKey) keys[rightKey]=false; el.classList.remove('pressed'); };
  el.addEventListener('touchstart', e=>{ e.preventDefault(); on(); },  {passive:false});
  el.addEventListener('touchend',   e=>{ e.preventDefault(); off(); }, {passive:false});
  el.addEventListener('touchcancel',e=>{ e.preventDefault(); off(); }, {passive:false});
  el.addEventListener('mousedown',  ()=>on());
  el.addEventListener('mouseup',    ()=>off());
  el.addEventListener('mouseleave', ()=>off());
}
setupTouchBtn('leftBtn',  'left',  null,  false);
setupTouchBtn('rightBtn', null,    'right',false);
setupTouchBtn('jumpBtn',  null,    null,  true);

// ════════════════════════════════════════════════════════════════
//  GÉNÉRATION DU NIVEAU
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  RÉGLAGES PÉDAGOGIQUES
// ════════════════════════════════════════════════════════════════

const SETTINGS = {
  groups: ['groupe1','groupe2','groupe3','verbesBase'],
  tenses: ['pr','im','fu'],
};

function rand(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rand(0,i); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function generateLevel(lvl) {
  platforms=[]; enemies=[]; stars_list=[]; particles=[];
  bricks=[]; bonuses=[]; pillars=[];
  camX=0;

  const gY   = H - 55;    // y sol
  const segW = 380;        // largeur par segment (plus long)
  worldW = segW * (lvl.numEnemies + 4) + 300;

  // Sol (tuiles)
  for(let x=0; x<worldW; x+=200)
    platforms.push({x, y:gY, w:200, h:60, type:'ground'});

  // Plateformes flottantes
  const floatPlats = [];
  let cx = 240;
  for(let i=0; i<lvl.numEnemies+5; i++){
    const pw = rand(90,170);
    if(cx + pw >= worldW - 280) break; // ne pas empiéter sur la zone du drapeau
    const ph = gY - rand(60,90);
    floatPlats.push({x:cx, y:ph, w:pw, h:20, type:'platform'});
    cx += segW - 60 + rand(0,80);
  }
  platforms.push(...floatPlats);

  // Ennemis sur les plateformes (1 par plateforme)
  const enemyPlats  = floatPlats.slice(1, lvl.numEnemies+1); // skip first plat (start area)
  const enemyCount  = Math.min(lvl.numEnemies, enemyPlats.length);
  const levelVerbDatas = generateLevelVerbDatas(enemyCount);
  for(let i=0; i<enemyCount; i++){
    const p  = enemyPlats[i];
    const vd = levelVerbDatas[i];
    enemies.push({
      x: p.x + p.w/2 - 16,
      y: p.y - 44,
      w: 32, h: 44,
      vx: pick([-45,45]),
      platX: p.x, platW: p.w,
      alive: true,
      type:  lvl.enemyType,
      facing:1,
      walkT: 0,
      alert: false,
      verbData: vd,
    });
  }

  // Étoiles sur les plateformes sans ennemi
  for(let i=0; i<floatPlats.length; i++){
    const p = floatPlats[i];
    const hasEnemy = enemies.some(e => e.platX === p.x);
    if(!hasEnemy){
      const n = rand(1,3);
      for(let j=0;j<n;j++){
        stars_list.push({ x:p.x+10+j*28, y:p.y-22, w:18, h:18,
                          collected:false, phase:Math.random()*Math.PI*2 });
      }
    }
  }
  GS.maxStars = stars_list.length;
  GS.stars    = 0;

  // ── Blocs à frapper (❓) ──────────────────────────────────────
  // Placés à gY-155 à gY-170 (accessibles en sautant depuis le sol)
  const brickTypes = ['life','life','coin','coin','coin'];
  const brickSpacing = Math.floor(worldW / 7);
  for(let bx=brickSpacing; bx<worldW-200; bx+=brickSpacing+rand(-40,40)){
    bricks.push({
      x: bx, y: gY - rand(155,170),
      w: 34, h: 34,
      type: pick(brickTypes),
      hit: false,
      jiggT: 0, offsetY: 0,
    });
  }

  // ── Plateformes au sol (petites surélévations) ──────────────
  const groundPlatCount = rand(1, 3);
  const gpSpacing = Math.floor(worldW / (groundPlatCount + 2));
  for(let i=0; i<groundPlatCount; i++){
    const gpx = gpSpacing * (i+1) + rand(-60, 60);
    const gpw = rand(90, 160);
    if(gpx > 200 && gpx + gpw < worldW - 200){
      platforms.push({x:gpx, y:gY - rand(25, 45), w:gpw, h:20, type:'platform'});
    }
  }

  // ── Colonnes (décoratives + plateforme one-way au sommet) ────
  const pillarSpacing = 320;
  for(let px=pillarSpacing; px<worldW-100; px+=pillarSpacing+rand(-50,50)){
    const ph2 = rand(70, 160);
    const pw  = 28;
    pillars.push({ x:px, y:gY-ph2, w:pw, h:ph2+60 });
    // Plateforme one-way au sommet du pilier (largeur visuelle du sprite)
    const topW = Math.round((ph2+60) * 0.56);  // ratio pillar.png ≈ 0.56:1
    const topX = px + pw/2 - topW/2;
    platforms.push({ x:topX, y:gY-ph2, w:topW, h:14, type:'platform' });
  }

  // Drapeau
  flag = { x: worldW-140, y: gY-100, w:30, h:100 };

  // Château (placé aléatoirement entre 1/3 et 2/3 du niveau, au sol)
  const caX = Math.floor(worldW * (0.33 + Math.random() * 0.34));
  castle = { x: caX, y: gY - 210, w: 170, h: 210 };
  castleChestState = 'closed';
  castleRewardCoins = 0;

  // Player spawn
  player.x = 80;
  player.y = gY - player.h - 2;
  player.vx = 0; player.vy = 0;
  player.onGround = true;
  player.alive    = true;
  player.invTimer = 0;
}

// ── Base d'erreurs ────────────────────────────────────────────
let errorDB = JSON.parse(localStorage.getItem('cqErrors') || '{}');

// ── Sauvegarde persistante (étoiles + skin) ───────────────────
let SAVE = JSON.parse(localStorage.getItem('cqSave') || '{"totalStars":0,"skin":"knight","owned":["knight"]}');
function saveSave(){ localStorage.setItem('cqSave', JSON.stringify(SAVE)); }

const SKINS = [
  { id:'knight', name:'Chevalier', emoji:'⚔️',  cost:0,   desc:'Armure classique' },
  { id:'mage',   name:'Mage',      emoji:'🔮',  cost:30,  desc:'Robe et bâton magique' },
  { id:'ninja',  name:'Ninja',     emoji:'🥷',  cost:60,  desc:'Tenue sombre & kunai' },
  { id:'pirate', name:'Pirate',    emoji:'☠️',  cost:100, desc:'Tricorne & sabre' },
];

function recordError(q){
  const key = `${q.gKey}|${q.vKey}|${q.tense}|${q.pronIdx}`;
  errorDB[key] = (errorDB[key] || 0) + 1;
  localStorage.setItem('cqErrors', JSON.stringify(errorDB));
}

function resetErrors(){
  errorDB = {};
  localStorage.removeItem('cqErrors');
  renderErrorList();
}

function getTopErrors(n=5){
  const activeGroups = SETTINGS.groups.length ? SETTINGS.groups : ['groupe1'];
  const activeTenses = SETTINGS.tenses.length ? SETTINGS.tenses : ['pr'];
  return Object.entries(errorDB)
    .filter(([k])=>{ const [g,,t]=k.split('|'); return activeGroups.includes(g)&&activeTenses.includes(t); })
    .sort(([,a],[,b])=>b-a)
    .slice(0,n);
}

function renderErrorList(){
  const el = document.getElementById('errorList');
  if(!el) return;
  const tenseMap = { pr:'Présent', im:'Imparfait', fu:'Futur simple' };
  const top = getTopErrors();
  if(top.length === 0){
    el.innerHTML = '<div style="color:#94a3b8;font-size:12px;padding:6px 0">Aucune erreur enregistrée 🎉</div>';
    return;
  }
  el.innerHTML = top.map(([key,cnt])=>{
    const [gKey,vKey,tense,pi] = key.split('|');
    const correct = VERBS[gKey]?.list[vKey]?.[tense]?.[+pi] ?? '?';
    return `<div class="errorItem">
      <span class="errorVerb">${PRONOUN_LABEL[+pi]} <b>${vKey}</b></span>
      <span class="errorTense">${tenseMap[tense]||tense}</span>
      <span class="errorAnswer">${correct}</span>
      <span class="errorCount">${cnt}×</span>
    </div>`;
  }).join('');
}

// ── Boutique ──────────────────────────────────────────────────
function renderShop(){
  document.getElementById('shopStarsDisplay').textContent = `🪙 ${SAVE.totalStars} pièce${SAVE.totalStars>1?'s':''}`;
  const menuStarsEl = document.getElementById('menuStars');
  if(menuStarsEl) menuStarsEl.textContent = `🪙${SAVE.totalStars}`;
  document.getElementById('shopItems').innerHTML = SKINS.map(s => {
    const owned    = SAVE.owned.includes(s.id);
    const equipped = SAVE.skin === s.id;
    const canBuy   = !owned && SAVE.totalStars >= s.cost;
    let btnClass = 'sBtn shopBuyBtn';
    let btnLabel, btnDisabled='';
    if(equipped){ btnClass+=' equipped'; btnLabel='✓ Équipé'; btnDisabled='disabled'; }
    else if(owned){ btnLabel='Équiper'; }
    else if(canBuy){ btnLabel=`Acheter`; }
    else{ btnClass+=' owned'; btnLabel=`🪙 ${s.cost}`; btnDisabled='disabled'; }
    return `<div class="shopCard${equipped?' active':''}">
      <span class="shopEmoji">${s.emoji}</span>
      <div class="shopInfo"><b>${s.name}</b><br><small>${s.desc}${s.cost>0&&!owned?' · 🪙'+s.cost:''}</small></div>
      <button class="${btnClass}" ${btnDisabled} onclick="shopAction('${s.id}')">${btnLabel}</button>
    </div>`;
  }).join('');
}

function shopAction(id){
  const skin = SKINS.find(s=>s.id===id);
  if(!skin) return;
  if(!SAVE.owned.includes(id)){
    if(SAVE.totalStars < skin.cost) return;
    SAVE.totalStars -= skin.cost;
    SAVE.owned.push(id);
  }
  SAVE.skin = id;
  saveSave();
  renderShop();
}

// ── Popup étoiles gagnées ─────────────────────────────────────
const starGains = [];
function showStarGain(x, y, text){
  starGains.push({ x, y, t:1.2, text });
}
function updateStarGains(dt){
  for(let i=starGains.length-1;i>=0;i--){
    starGains[i].t -= dt;
    if(starGains[i].t<=0) starGains.splice(i,1);
  }
}
function drawStarGains(){
  ctx.save();
  ctx.textAlign='center';
  for(const g of starGains){
    const progress = 1.2 - g.t;          // 0→1.2
    const rise     = progress * 48;       // monte de 48px
    const alpha    = Math.min(1, g.t*2.5);
    const sx       = g.x - camX;
    const sy       = g.y - rise;
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px Arial';
    ctx.shadowColor = '#000';
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = '#f59e0b';
    ctx.fillText(g.text, sx, sy);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Pool dédupliqué : chaque verbe n'apparaît qu'une fois même s'il est dans
// plusieurs groupes (ex. verbesBase + groupe3 partagent être, avoir, etc.)
function buildVerbPool(activeGroups){
  const seen = new Set();
  const pool = [];
  for(const gKey of activeGroups){
    for(const vKey of Object.keys(VERBS[gKey].list)){
      if(!seen.has(vKey)){ seen.add(vKey); pool.push({gKey, vKey}); }
    }
  }
  return pool;
}

function randomVerbData(exclude){
  const activeGroups = SETTINGS.groups.length ? SETTINGS.groups : ['groupe1'];
  const activeTenses = SETTINGS.tenses.length ? SETTINGS.tenses : ['pr'];

  // 50 % de chance de piocher dans les erreurs fréquentes (pondéré par count)
  if(Math.random() < 0.5){
    const relevant = Object.entries(errorDB).filter(([k])=>{
      const [g,,t]=k.split('|');
      return activeGroups.includes(g) && activeTenses.includes(t);
    });
    if(relevant.length > 0){
      const total = relevant.reduce((s,[,c])=>s+c, 0);
      let r = Math.random() * total;
      for(const [key,cnt] of relevant){
        r -= cnt;
        if(r <= 0){
          const [gKey,vKey,tense,pi] = key.split('|');
          if(VERBS[gKey]?.list[vKey]) return {gKey, vKey, tense, pronIdx:+pi};
        }
      }
    }
  }

  // Sélection aléatoire sur pool dédupliqué (pas de double-comptage inter-groupes)
  const pool    = buildVerbPool(activeGroups);
  const {gKey, vKey} = pick(pool);
  const tense   = pick(activeTenses);
  const pronIdx = rand(0,5);
  return { gKey, vKey, tense, pronIdx };
}

// Génère n verbDatas distincts (pas de même verbe+pronom dans le même niveau)
function generateLevelVerbDatas(n){
  const used   = new Set();
  const result = [];
  let tries = 0;
  while(result.length < n && tries < n * 20){
    tries++;
    const vd  = randomVerbData();
    const key = `${vd.vKey}|${vd.pronIdx}`;
    if(!used.has(key)){ used.add(key); result.push(vd); }
  }
  // Fallback si pas assez de combinaisons distinctes disponibles
  while(result.length < n) result.push(randomVerbData());
  return result;
}

// ════════════════════════════════════════════════════════════════
//  SYSTÈME DE QUESTION
// ════════════════════════════════════════════════════════════════

const QS = {
  active: false,
  enemy:  null,
  q:      null,
};

function openQuestion(enemy){
  if(QS.active) return;
  QS.active    = true;
  QS.enemy     = enemy;
  enemy.battling = true;

  buildQuestion(enemy);
  document.getElementById('qModal').classList.add('show');
  GS.screen = 'question';
}

function buildQuestion(enemy){
  const q = makeQuestion(enemy.verbData);
  QS.q = q;

  document.getElementById('qEnemy').textContent = enemyEmoji(enemy.type);
  document.getElementById('qGroup').textContent = VERBS[q.gKey].label;
  document.getElementById('qTense').textContent = q.tenseLabel;
  document.getElementById('qText').innerHTML =
    `Conjugue le verbe <span class="vb">${q.vKey}</span> au <span class="vb">${q.tenseLabel}</span> :<br>
     <span class="pro">${PRONOUN_LABEL[q.pronIdx]}</span> <span class="blank">???</span>`;

  const container = document.getElementById('qAnswers');
  container.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className   = 'qBtn';
    btn.textContent = opt;
    const handler = () => answerClick(opt);
    btn.addEventListener('click',    handler);
    btn.addEventListener('touchend', e => { e.preventDefault(); handler(); }, {passive:false});
    container.appendChild(btn);
  });

  renderBattleHP();
}

// ── Phonétique simplifiée du français ──────────────────────────
// Renvoie une clé phonétique approximative pour détecter les homophones
// entre formes conjuguées (ex: mange/manges/mangent → même son)
function frenchSound(w){
  let s = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  // Terminaisons connues (plus longues d'abord)
  const rules = [
    [/aient$/, '§E'],   // parlaient = parlais = parlait
    [/ais$/,   '§E'],
    [/ait$/,   '§E'],
    [/ions$/,  '§ION'], // parlions
    [/iez$/,   '§IE'],  // parliez
    [/rons$/,  '§RON'], // parlerons = parleront
    [/ront$/,  '§RON'],
    [/rez$/,   '§RE'],  // parlerez ≈ parlerai
    [/rai$/,   '§RE'],
    [/ras$/,   '§RA'],  // parleras = parlera
    [/ra$/,    '§RA'],
    [/ons$/,   '§ON'],  // parlons
    [/ez$/,    '§EZ'],  // parlez
  ];
  for(const [re, rep] of rules){
    if(re.test(s)) return s.replace(re, rep);
  }
  // -ent final muet (3e pers. pluriel) : parlent → parl
  if(s.length > 4 && s.endsWith('ent')) s = s.slice(0,-3);
  // Finales muettes : -es, -e, -s, -t, -x, -d
  if(s.length > 3) s = s.replace(/es$/, '');
  if(s.length > 2) s = s.replace(/e$/, '');
  s = s.replace(/[stxd]$/, '');
  return s;
}

function makeQuestion(vd){
  const { gKey, vKey, tense, pronIdx } = vd;
  const verb = VERBS[gKey].list[vKey];

  const tenseMap = { pr:'Présent', im:'Imparfait', fu:'Futur simple' };
  const correct = verb[tense][pronIdx];
  const correctSound = frenchSound(correct);

  // ── Collecter toutes les formes distinctes (orthographe ≠ correct) ──
  const seen = new Set([correct]);
  const homophones = [];   // même son, orthographe différente
  const diffSounds = [];   // son clairement différent

  for(const t of ['pr','im','fu']){
    if(!verb[t]) continue;
    for(let i=0; i<6; i++){
      const form = verb[t][i];
      if(!form || seen.has(form)) continue;
      seen.add(form);
      if(frenchSound(form) === correctSound){
        homophones.push({ form, t, i });
      } else {
        diffSounds.push({ form, t, i });
      }
    }
  }

  shuffle(homophones);
  // Préférer les formes d'AUTRES temps (plus éducatif)
  const diffOther = shuffle(diffSounds.filter(f => f.t !== tense));
  const diffSame  = shuffle(diffSounds.filter(f => f.t === tense));

  const distractors = [];

  // ── 1. Piège homophone (même son, orthographe différente) ───────────
  // Ex : "mange" (je) → piège "mangent" (ils) — même prononciation
  if(homophones.length > 0) distractors.push(homophones[0].form);

  // ── 2. Deux formes qui sonnent différemment (autres temps prioritaires)
  // Ex : "mangerons" (futur nous), "mangerai" (futur je)
  // On évite aussi que les 2 sonnent pareil entre elles
  const usedSounds = new Set();
  for(const f of [...diffOther, ...diffSame]){
    if(distractors.length >= 3) break;
    const snd = frenchSound(f.form);
    if(!usedSounds.has(snd)){
      usedSounds.add(snd);
      distractors.push(f.form);
    }
  }
  // Compléter si pas assez de sons distincts
  for(const f of [...diffOther, ...diffSame]){
    if(distractors.length >= 3) break;
    if(!distractors.includes(f.form)) distractors.push(f.form);
  }

  // ── 3. Compléter avec homophones restants / participe passé ─────────
  for(const f of homophones.slice(1)){
    if(distractors.length >= 3) break;
    if(!distractors.includes(f.form)) distractors.push(f.form);
  }
  if(distractors.length < 3 && verb.pp && verb.pp !== correct && !distractors.includes(verb.pp)){
    distractors.push(verb.pp);
  }

  const options = shuffle([correct, ...distractors.slice(0, 3)]);
  return { gKey, vKey, tense, tenseLabel: tenseMap[tense], pronIdx, correct, options };
}

function renderBattleHP(){ document.getElementById('qHP').innerHTML = ''; }

function answerClick(answer){
  if(!QS.active) return;
  const btns = document.querySelectorAll('.qBtn');
  btns.forEach(b => b.disabled = true);
  btns.forEach(b => {
    if(b.textContent === QS.q.correct) b.classList.add('ok');
    if(b.textContent === answer && answer!==QS.q.correct) b.classList.add('bad');
  });

  if(answer === QS.q.correct){
    // Bonne réponse → victoire rapide
    setTimeout(() => {
      closeQuestion();
      defeatEnemy(QS.enemy);
    }, 700);
  } else {
    // Mauvaise réponse : enregistrer l'erreur, vibration + perd 1 vie
    recordError(QS.q);
    if(navigator.vibrate) navigator.vibrate(200);
    // La bonne réponse reste affichée 2,5 s pour mémorisation
    setTimeout(() => {
      closeQuestion();
      hitPlayer();
      // L'ennemi reste vivant avec le MÊME verbe (pour réessayer)
      if(QS.enemy) QS.enemy.battling = false;
    }, 2500);
  }
}

function closeQuestion(){
  QS.active = false;
  document.getElementById('qModal').classList.remove('show');
  if(CQ.active){ CQ.active=false; GS.screen='castle'; }
  else GS.screen='game';
}

function defeatEnemy(e){
  if(!e) return;
  e.alive    = false;
  e.battling = false;
  GS.score  += 100;
  SAVE.totalStars += 10;
  saveSave();
  spawnBurst(e.x+e.w/2, e.y+e.h/2, '#a78bfa', 14);
  showStarGain(e.x+e.w/2, e.y, '+10🪙');
}

function hitPlayer(){
  if(player.invTimer>0) return;
  GS.lives--;
  player.invTimer = 110;
  spawnBurst(player.x+player.w/2, player.y+player.h/2, '#ef4444', 10);
  if(GS.lives<=0) triggerGameOver();
}

// ════════════════════════════════════════════════════════════════
//  PARTICULES
// ════════════════════════════════════════════════════════════════

function spawnBurst(x,y,color,n){
  for(let i=0;i<n;i++){
    const a = (Math.PI*2/n)*i + Math.random()*.4;
    const s = 80+Math.random()*130;
    particles.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-50,
                     life:1, color, sz:3+Math.random()*4 });
  }
}

// ════════════════════════════════════════════════════════════════
//  PHYSIQUE
// ════════════════════════════════════════════════════════════════

function updatePhysics(dt){
  // Entrée château : ⬆ près de la porte
  if(castle && !QS.active && jumpRequest && player.onGround){
    const dist = Math.abs((player.x+player.w/2)-(castle.x+castle.w/2));
    if(dist < 95){
      jumpRequest = false;
      castlePlayerSavedX = player.x;
      castlePlayer.x = 50; castlePlayer.y = H-55-castlePlayer.h;
      castlePlayer.vx=0; castlePlayer.vy=0;
      castlePlayer.onGround=true; castlePlayer.facing=1; castlePlayer.walkT=0;
      CQ.active=false; CQ.streak=0;
      GS.screen='castle';
      return;
    }
  }

  // Mouvement joueur
  player.vx = 0;
  if(keys.left)  { player.vx=-PSPEED; player.facing=-1; }
  if(keys.right) { player.vx= PSPEED; player.facing= 1; }

  if(jumpRequest && player.onGround){
    player.vy = JUMP_V;
    player.onGround = false;
  }
  jumpRequest = false;

  // Gravité
  player.vy = Math.min(player.vy + GRAV*dt, MAX_FALL);

  // Déplacement
  player.x += player.vx*dt;
  player.y += player.vy*dt;
  player.x  = Math.max(0, Math.min(worldW-player.w, player.x));

  // Collisions plateformes
  player.onGround = false;
  for(const p of platforms) resolveAABB(player, p);

  // Chute hors écran → respawn
  if(player.y > H+80){
    hitPlayer();
    player.x = Math.max(60, camX+60);
    player.y = H-200;
    player.vy=0;
  }

  // Animation marche
  if(player.vx!==0 && player.onGround) player.walkT=(player.walkT+dt*8)%1000;
  else if(player.onGround) player.walkT=0;

  // Invincibilité
  if(player.invTimer>0) player.invTimer--;

  // Caméra
  const targetCamX = player.x - W*0.35;
  camX = Math.max(0, Math.min(worldW-W, targetCamX));

  // Ennemis
  for(const e of enemies){
    if(!e.alive || e.battling) continue;
    e.x += e.vx*dt;
    if(e.x<e.platX || e.x+e.w>e.platX+e.platW){
      e.vx*=-1;
      e.x = Math.max(e.platX, Math.min(e.platX+e.platW-e.w, e.x));
    }
    e.facing = e.vx>0?1:-1;
    e.walkT  = ((e.walkT||0)+dt*6)%1000;

    // Proximité
    const dx = (player.x+player.w/2)-(e.x+e.w/2);
    const dy = (player.y+player.h/2)-(e.y+e.h/2);
    e.alert  = Math.abs(dx)<90 && Math.abs(dy)<70;

    // Collision
    if(!QS.active && player.invTimer===0 && rectsTouch(player,e)){
      openQuestion(e);
    }
  }

  // Étoiles
  for(const s of stars_list){
    if(s.collected) continue;
    s.phase += dt*2.5;
    if(rectsTouch(player, {x:s.x,y:s.y+Math.sin(s.phase)*4,w:s.w,h:s.h})){
      s.collected=true;
      GS.stars++;
      SAVE.totalStars++;
      saveSave();
      GS.score+=10;
      spawnBurst(s.x+s.w/2, s.y+s.h/2, '#ffd700', 7);
    }
  }

  // Blocs à frapper ❓
  for(const br of bricks){
    // Jiggle animation
    if(br.jiggT>0){
      br.jiggT-=dt;
      br.offsetY = br.jiggT>0 ? -Math.abs(Math.sin(br.jiggT*28))*8 : 0;
    }
    // ⚠️ Détection AVANT resolveAABB (sinon resolveAABB remet vy=0)
    // Frappe par dessous : joueur monte (vy<0) et sa tête touche le bas du bloc
    if(!br.hit && player.vy<0 &&
       player.x+player.w > br.x+2 && player.x < br.x+br.w-2 &&
       player.y <= br.y+br.h+2 && player.y >= br.y-player.h){
      br.hit   = true;
      br.jiggT = 0.35;
      player.vy = 80; // rebond léger vers le bas
      bonuses.push({
        x: br.x + br.w/2 - 11, y: br.y - 26,
        w: 22, h: 22,
        vy: -240,
        type: br.type,
        timer: 5,
        collected: false,
      });
      spawnBurst(br.x+br.w/2, br.y, br.type==='life'?'#ef4444':'#ffd700', 6);
    }
    // Collision normale (le joueur peut se tenir dessus)
    resolveAABB(player, {x:br.x, y:br.y+br.offsetY, w:br.w, h:br.h});
  }

  // Bonus (items qui tombent des blocs)
  for(let i=bonuses.length-1; i>=0; i--){
    const b=bonuses[i];
    if(b.collected){ bonuses.splice(i,1); continue; }
    b.vy  += GRAV*0.6*dt;
    b.y   += b.vy*dt;
    b.timer -= dt;
    if(b.timer<=0){ bonuses.splice(i,1); continue; }
    // Arrêter sur le sol ou une plateforme
    for(const p of platforms) resolveAABB(b, p);
    // Collecte
    if(rectsTouch(player,b)){
      b.collected = true;
      if(b.type==='life'){
        GS.lives = Math.min(5, GS.lives+1);
        spawnBurst(b.x+b.w/2, b.y+b.h/2, '#ef4444', 10);
      } else {
        // Pièce de bloc : va dans les étoiles persistantes (pas compteur de niveau)
        SAVE.totalStars++;
        saveSave();
        GS.score+=25;
        spawnBurst(b.x+b.w/2, b.y+b.h/2, '#f59e0b', 10);
      }
    }
  }

  // Particules
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vy+=GRAV*0.35*dt;
    p.life-=dt*1.8;
    if(p.life<=0) particles.splice(i,1);
  }

  updateStarGains(dt);

  // Drapeau
  if(flag && rectsTouch(player,{x:flag.x,y:flag.y,w:flag.w,h:flag.h})){
    triggerLevelComplete();
  }
}

function resolveAABB(a, b){
  if(!rectsTouch(a,b)) return;
  // Plateformes flottantes : one-way (traversables par dessous)
  if(b.type === 'platform'){
    if(a.vy >= 0 && a.y + a.h - a.vy * 0.05 <= b.y + 4){
      a.y = b.y - a.h; a.vy = 0; a.onGround = true;
    }
    return;
  }
  const ox = Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
  const oy = Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  if(oy<ox){
    if(a.y<b.y){ a.y=b.y-a.h; a.vy=0; a.onGround=true; }
    else        { a.y=b.y+b.h; a.vy=Math.max(0,a.vy); }
  } else {
    if(a.x<b.x) a.x=b.x-a.w;
    else         a.x=b.x+b.w;
  }
}
function rectsTouch(a,b){ return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }

// ════════════════════════════════════════════════════════════════
//  STYLE AVANCÉ — PIXEL ART PAR TABLEAU DE PIXELS
// ════════════════════════════════════════════════════════════════

let advStyle = localStorage.getItem('cqSprStyle') || 'simple';
function setSprStyle(s){
  advStyle = s;
  localStorage.setItem('cqSprStyle', s);
  document.querySelectorAll('.sprTog').forEach(b => b.classList.toggle('on', b.dataset.spr === s));
}

// ─── Palette ────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════
//  RENDU
// ════════════════════════════════════════════════════════════════

function render(){
  const lvl = LEVELS[GS.level];
  const c = getLvlColors(lvl);

  // Ciel
  ctx.fillStyle = c.sky;
  ctx.fillRect(0,0,W,H);

  // Décor arrière-plan (parallaxe)
  if(advStyle==='advanced') drawBgAdv(c); else drawBg(c);

  ctx.save();
  ctx.translate(-camX, 0);

  // Colonnes décoratives
  for(const pl of pillars) drawPillar(pl, c);

  // Sol continu (mode avancé : bande unique tilée)
  if(advStyle==='advanced' && platGroundReady){
    drawGroundStripAdv(H - 55);
  }

  // Plateformes
  for(const p of platforms){
    // En mode avancé, le sol est dessiné en bande continue ci-dessus
    if(p.type==='ground' && advStyle==='advanced' && platGroundReady) continue;
    if(advStyle==='advanced') drawPlatformAdv(p, c); else drawPlatform(p, c);
  }

  // Blocs ❓
  for(const br of bricks) drawBrick(br);

  // Bonus tombants
  for(const b of bonuses) if(!b.collected) drawBonus(b);

  // Étoiles
  for(const s of stars_list) if(!s.collected) drawStar(s);

  // Drapeau
  if(flag) drawFlag(flag, lvl);

  // Ennemis
  for(const e of enemies) if(e.alive) drawEnemy(e);

  // Particules
  for(const p of particles){
    ctx.globalAlpha = Math.max(0,p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x-p.sz/2, p.y-p.sz/2, p.sz, p.sz);
  }
  ctx.globalAlpha=1;

  // Château (même plan que les plateformes, dessiné AVANT le joueur)
  if(castle) drawCastleSprite(castle, c);

  // Joueur
  drawPlayer(player);

  ctx.restore();

  // Gains d'étoiles flottants
  drawStarGains();

  // HUD
  drawHUD(lvl);
}

// ── Arrière-plan ──────────────────────────────────────────────
function drawBg(lvl){
  const px1 = camX*0.25;
  const px2 = camX*0.55;

  // Montagnes lointaines
  ctx.fillStyle = lvl.bgFar;
  for(let i=-1;i<7;i++){
    const mx = (i*130 - px1%130);
    const mh = 60+(i%3)*50;
    ctx.beginPath();
    ctx.moveTo(mx,H-55); ctx.lineTo(mx+65,H-55-mh); ctx.lineTo(mx+130,H-55); ctx.fill();
  }

  // Arbres / colonnes de pierre proches
  ctx.fillStyle = lvl.bgNear;
  for(let i=-1;i<10;i++){
    const tx = (i*88 - px2%88);
    ctx.fillRect(tx+18,H-85,6,30);     // tronc
    ctx.beginPath();
    ctx.moveTo(tx,H-85); ctx.lineTo(tx+21,H-140); ctx.lineTo(tx+42,H-85); ctx.fill();
  }
}

// ── Plateformes ───────────────────────────────────────────────
function drawPlatform(p, lvl){
  if(p.type==='ground'){
    // Herbe / pierre selon niveau
    ctx.fillStyle = lvl.ground;
    ctx.fillRect(p.x,p.y,p.w,10);
    ctx.fillStyle = darken(lvl.ground);
    ctx.fillRect(p.x,p.y+10,p.w,p.h-10);
    // petits brins d'herbe
    ctx.fillStyle = lighten(lvl.ground);
    for(let gx=p.x+4;gx<p.x+p.w-4;gx+=9) ctx.fillRect(gx,p.y-3,3,5);
  } else {
    ctx.fillStyle = lvl.plat;
    ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.fillStyle = lighten(lvl.plat);
    ctx.fillRect(p.x,p.y,p.w,5);
    ctx.fillStyle = darken(lvl.plat);
    ctx.fillRect(p.x,p.y+p.h-5,p.w,5);
    // veines bois
    ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1;
    for(let gx=p.x+12;gx<p.x+p.w-8;gx+=18){
      ctx.beginPath(); ctx.moveTo(gx,p.y+2); ctx.lineTo(gx+4,p.y+p.h-2); ctx.stroke();
    }
  }
}
// ── Thème ─────────────────────────────────────────────────────
let currentTheme = localStorage.getItem('cqTheme') || 'sombre';
function applyTheme(t){
  currentTheme = t;
  localStorage.setItem('cqTheme', t);
  document.body.classList.toggle('theme-funny', t === 'funny');
  document.querySelectorAll('.themeTog').forEach(b => {
    b.classList.toggle('on', b.dataset.theme === t);
  });
}
function getLvlColors(lvl){
  if(currentTheme !== 'funny') return lvl;
  return {...lvl, sky:lvl.funnySky, bgFar:lvl.funnyBgFar, bgNear:lvl.funnyBgNear, ground:lvl.funnyGround, plat:lvl.funnyPlat};
}

function darken(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)})`;
}
function lighten(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.min(255,r+35)},${Math.min(255,g+35)},${Math.min(255,b+35)})`;
}

// ── Colonnes / piliers de décor ────────────────────────────────
// pillar.png (1536×1024 RGBA) — contenu : x=583..1017 y=75..853 (435×779, ratio 0.56:1)
function drawPillar(pl, lvl){
  if(advStyle==='advanced' && pillarReady){
    // Crop au contenu réel (sans le transparent autour)
    const sx = 583, sy = 75, sw = 435, sh = 779;   // ratio 0.56:1
    const drawH = pl.h;
    const drawW = drawH * (sw / sh);                // ≈ 0.56 × pl.h
    const drawX = pl.x + pl.w/2 - drawW/2;
    ctx.drawImage(pillarImg, sx, sy, sw, sh, drawX, pl.y, drawW, drawH);
  } else {
    // Fallback procédural
    ctx.fillStyle = darken(lvl.ground);
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for(let gy=pl.y+12; gy<pl.y+pl.h-8; gy+=20) ctx.fillRect(pl.x+3, gy, pl.w-6, 8);
    ctx.fillStyle = darken(darken(lvl.ground));
    ctx.fillRect(pl.x-6, pl.y,        pl.w+12, 10);
    ctx.fillRect(pl.x-4, pl.y+pl.h-8, pl.w+8,  8);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(pl.x+2, pl.y+10, 4, pl.h-20);
  }
}

// ── Blocs ❓ ──────────────────────────────────────────────────
function drawBrick(br){
  const oy = br.offsetY || 0;
  if(br.hit){
    // Bloc utilisé — gris foncé
    ctx.fillStyle = '#4a3a1a';
    ctx.fillRect(br.x, br.y+oy, br.w, br.h);
    ctx.fillStyle = '#2e2210';
    ctx.fillRect(br.x+3, br.y+oy+3, br.w-6, br.h-6);
  } else {
    const isLife = br.type==='life';
    // Fond
    ctx.fillStyle = isLife ? '#b91c1c' : '#b45309';
    ctx.fillRect(br.x, br.y+oy, br.w, br.h);
    // Bordure claire
    ctx.fillStyle = isLife ? '#ef4444' : '#f59e0b';
    ctx.fillRect(br.x, br.y+oy, br.w, 4);
    ctx.fillRect(br.x, br.y+oy, 4, br.h);
    // Bordure sombre
    ctx.fillStyle = isLife ? '#7f1d1d' : '#78350f';
    ctx.fillRect(br.x, br.y+oy+br.h-4, br.w, 4);
    ctx.fillRect(br.x+br.w-4, br.y+oy, 4, br.h);
    // Symbole
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(isLife?'❤':'⭐', br.x+br.w/2, br.y+oy+br.h/2);
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Bonus tombants ────────────────────────────────────────────
function drawBonus(b){
  const pulse = 1 + Math.sin(Date.now()*.008)*0.15;
  ctx.save();
  ctx.translate(b.x+b.w/2, b.y+b.h/2);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = b.type==='life' ? '#ef4444' : '#ffd700';
  ctx.shadowBlur  = 14;
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.type==='life'?'❤️':'🪙', 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Étoile ────────────────────────────────────────────────────
function drawStar(s){
  const cy = s.y+Math.sin(s.phase)*4;
  ctx.save();
  ctx.shadowColor='#ffd700'; ctx.shadowBlur=12;
  ctx.fillStyle='#ffd700';
  starPath(s.x+s.w/2, cy+s.h/2, s.w*0.38, s.w*0.5, 5);
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore();
}
function starPath(cx,cy,r1,r2,pts){
  ctx.beginPath();
  for(let i=0;i<pts*2;i++){
    const a=(i*Math.PI/pts)-Math.PI/2;
    const r=i%2===0?r2:r1;
    i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
  }
  ctx.closePath();
}

// ── Drapeau ───────────────────────────────────────────────────
function drawFlag(f){
  ctx.fillStyle='#888';
  ctx.fillRect(f.x+4,f.y,5,f.h);
  const w=Math.sin(Date.now()*.003)*4;
  ctx.fillStyle='#ef4444';
  ctx.beginPath();
  ctx.moveTo(f.x+9,f.y);
  ctx.lineTo(f.x+9+26,f.y+11+w);
  ctx.lineTo(f.x+9+22,f.y+22+w*.6);
  ctx.lineTo(f.x+9,f.y+22);
  ctx.fill();
  ctx.fillStyle='#555';
  ctx.fillRect(f.x,f.y+f.h,22,8);
}

// ════════════════════════════════════════════════════════════════
//  DESSIN AVANCÉ
// ════════════════════════════════════════════════════════════════

// ── Joueur avancé (sprites Pixellab) ──────────────────────────
function drawPlayerAdv(p){
  if(p.invTimer>0 && Math.floor(p.invTimer/6)%2===0) return;

  // Fallback to old pixel-art if sprites not loaded yet
  if(!paladinSpritesReady){
    drawPlayerAdvFallback(p);
    return;
  }

  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h);

  // Pick the right sprite frame
  const dir = p.facing>=0 ? 'right' : 'left';
  let sprite;

  if(!p.onGround){
    // Jumping: 8 frames mapped to vy (JUMP_V=-560 to +560)
    const jFrames = PALADIN_SPRITES.jump[dir];
    const t = Math.min(1, Math.max(0, (p.vy - JUMP_V) / (-JUMP_V * 2)));
    const fi = Math.min(jFrames.length-1, Math.floor(t * jFrames.length));
    sprite = jFrames[fi];
  } else if(Math.abs(p.vx) > 0.5){
    // Running: 6 frames cycle
    const rFrames = PALADIN_SPRITES.run[dir];
    const fi = Math.floor(p.walkT * 1.5) % rFrames.length;
    sprite = rFrames[fi];
  } else {
    sprite = PALADIN_SPRITES.idle[dir];
  }

  // Draw sprite at 2× size (112×112)
  const drawH = 112;
  const drawW = 112;
  ctx.drawImage(sprite, -drawW/2, -drawH, drawW, drawH);

  ctx.restore();
}

// Fallback pixel-art version (used while sprites load)
function drawPlayerAdvFallback(p){
  const frame = Math.floor(p.walkT*3)%2;
  const sc = 2;
  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h);
  ctx.scale(p.facing, 1);
  ctx.fillStyle='rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0,0,14,4,0,0,Math.PI*2); ctx.fill();
  const skin = SAVE.skin||'knight';
  pxDraw(ctx, getSkinSprite(skin, frame), -20, -44, sc, false);
  ctx.restore();
}

// ── Ennemi avancé ─────────────────────────────────────────────
function drawGoblinAdv(bob){
  const frame = Math.floor(Date.now()/300)%2;
  const sc=2;
  // massue (main droite, visible derrière)
  ctx.fillStyle=PPAL.M; ctx.fillRect(14,-38+bob, 4,18);
  ctx.fillStyle=PPAL.m; ctx.fillRect(11,-42+bob, 10,8);
  ctx.fillStyle=PPAL.B; ctx.fillRect(13,-44+bob, 6,5);
  pxDraw(ctx, SPR_GOBLIN[frame], -20, -44+bob, sc, false);
}

function drawSkeletonAdv(bob){
  const frame = Math.floor(Date.now()/350)%2;
  const sc=2;
  // épée os
  ctx.fillStyle=PPAL.e; ctx.fillRect(14,-42+bob, 3,22);
  ctx.fillStyle=PPAL.K; ctx.fillRect(11,-38+bob, 9,4);
  pxDraw(ctx, SPR_SKELETON[frame], -20, -44+bob, sc, false);
}

function drawDragonAdv(bob){
  const frame = Math.floor(Date.now()/400)%2;
  const sc=2;
  // flamme
  const ft = Date.now()*.005;
  ctx.fillStyle=PPAL.F; ctx.fillRect(18,-28+bob+Math.sin(ft)*2, 18,6);
  ctx.fillStyle=PPAL.Y; ctx.fillRect(20,-27+bob+Math.sin(ft+1)*2, 12,3);
  ctx.fillStyle=PPAL.R; ctx.fillRect(24,-26+bob+Math.sin(ft+2)*2, 8,2);
  pxDraw(ctx, SPR_DRAGON[frame], -20, -44+bob, sc, false);
}

// ── Arrière-plan avancé — image parallaxe ─────────────────────
function drawBgAdv(c){
  if(!bgImageReady){ drawBg(c); return; }

  // Image aspect ratio — cover the canvas height, tile horizontally
  const imgAspect = bgImage.width / bgImage.height;
  const drawH = H;
  const drawW = drawH * imgAspect;

  // Parallax: background scrolls slower than camera
  const px = camX * 0.15;
  // Tile the image seamlessly
  const startX = -(px % drawW + drawW) % drawW;

  for(let x = startX - drawW; x < W + drawW; x += drawW){
    ctx.drawImage(bgImage, x, 0, drawW, drawH);
  }
}

// ── Sol continu (mode avancé) ─────────────────────────────────
// ground platform.png (1536×1024 RGBA) — contenu : x=165..1373 y=310..627 (1209×318)
// On crop le centre (sans les bords arrondis) pour un tiling continu
function drawGroundStripAdv(gY){
  const sx = 300, sy = 310, sw = 940, sh = 318;    // zone centrale sans arrondi
  const displayH = 80;                               // hauteur visuelle
  const tileW    = Math.round(displayH * (sw / sh)); // ≈237px
  const drawY    = gY - 15;                           // herbe dépasse au-dessus du sol

  for(let tx = 0; tx < worldW; tx += tileW){
    ctx.drawImage(platGroundImg, sx, sy, sw, sh, tx, drawY, tileW, displayH);
  }
}

// ── Plateformes avancées (sprite-based) ──────────────────────
// floating platform.png (1536×1024 RGBA) — contenu : x=184..1361 y=297..678 (1178×382)
function drawPlatformAdv(p, lvl){
  if(p.type!=='ground' && platFloatReady){
    // Crop au contenu réel (sans transparent), ratio 3.08:1
    const sx = 184, sy = 297, sw = 1178, sh = 382;
    const drawW = p.w + 24;
    const scale = drawW / sw;
    const drawH = sh * scale;
    const drawX = p.x - 12;
    // Surface bois ≈14% du haut du contenu → aligner avec p.y (hitbox)
    const drawY = p.y - drawH * 0.14;

    ctx.drawImage(platFloatImg, sx, sy, sw, sh, drawX, drawY, drawW, drawH);

  } else {
    // Fallback procédural
    if(p.type==='ground'){
      ctx.fillStyle=lvl.ground;
      ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle=lighten(lvl.ground);
      ctx.fillRect(p.x,p.y,p.w,3);
    } else {
      ctx.fillStyle='#a07850';
      ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle='rgba(255,255,255,.15)';
      ctx.fillRect(p.x,p.y,p.w,2);
    }
  }
}

// ── Joueur ────────────────────────────────────────────────────
function drawPlayer(p){
  if(advStyle==='advanced'){ drawPlayerAdv(p); return; }
  if(p.invTimer>0 && Math.floor(p.invTimer/6)%2===0){ return; }
  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h);
  ctx.scale(p.facing,1);
  const leg = Math.sin(p.walkT)*6;
  const arm = Math.sin(p.walkT+Math.PI)*5;

  // Ombre
  ctx.fillStyle='rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0,0,13,4,0,0,Math.PI*2); ctx.fill();

  const skin = SAVE.skin || 'knight';
  if(skin==='knight')      drawSkinKnight(leg, arm);
  else if(skin==='mage')   drawSkinMage(leg, arm);
  else if(skin==='ninja')  drawSkinNinja(leg, arm);
  else if(skin==='pirate') drawSkinPirate(leg, arm);

  ctx.restore();
}

function drawEyes(eyeColor='#1e3a8a'){
  ctx.fillStyle='#fff';
  ctx.fillRect(-6,-50,4,3);
  ctx.fillRect( 2,-50,4,3);
  ctx.fillStyle=eyeColor;
  ctx.fillRect(-5,-50,2,2);
  ctx.fillRect( 3,-50,2,2);
}

function drawSkinKnight(leg, arm){
  // Jambes
  ctx.fillStyle='#1e40af';
  ctx.fillRect(-10,-16+leg, 8,16);
  ctx.fillRect( 2, -16-leg, 8,16);
  // Corps
  ctx.fillStyle='#3b82f6';
  ctx.fillRect(-12,-38,24,24);
  ctx.fillStyle='#60a5fa';
  ctx.fillRect(-10,-37,8,8);
  ctx.fillRect(  2,-37,8,8);
  // Bras
  ctx.fillStyle='#3b82f6';
  ctx.fillRect(-18,-36+arm, 7,14);
  ctx.fillRect( 11,-36-arm, 7,14);
  // Épée
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(16,-44-arm, 3,22);
  ctx.fillStyle='#fbbf24';
  ctx.fillRect(13,-43-arm, 9, 4);
  // Tête
  ctx.fillStyle='#fde68a';
  ctx.fillRect(-9,-56,18,20);
  // Casque
  ctx.fillStyle='#9ca3af';
  ctx.fillRect(-11,-62,22,14);
  ctx.fillStyle='#6b7280';
  ctx.fillRect(-11,-62,22,4);
  ctx.fillRect(-11,-62,4,14);
  ctx.fillRect( 7,-62,4,14);
  // Visière
  ctx.fillStyle='rgba(100,180,255,.4)';
  ctx.fillRect(-7,-58,14,8);
  drawEyes('#1e3a8a');
}

function drawSkinMage(leg, arm){
  // Jambes (robe)
  ctx.fillStyle='#6d28d9';
  ctx.fillRect(-11,-16+leg, 9,16);
  ctx.fillRect( 2, -16-leg, 9,16);
  // Robe corps
  ctx.fillStyle='#7c3aed';
  ctx.fillRect(-13,-40,26,26);
  // Reflet robe
  ctx.fillStyle='#a78bfa';
  ctx.fillRect(-10,-39,6,10);
  // Bras
  ctx.fillStyle='#7c3aed';
  ctx.fillRect(-19,-38+arm, 7,15);
  ctx.fillRect( 12,-38-arm, 7,15);
  // Bâton magique
  ctx.fillStyle='#92400e';
  ctx.fillRect(17,-52-arm, 4,26);
  ctx.fillStyle='#a78bfa';
  ctx.shadowColor='#a78bfa'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.arc(19,-53-arm, 5, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  // Étoile sur bâton
  ctx.fillStyle='#fbbf24';
  ctx.font='8px Arial'; ctx.textAlign='center';
  ctx.fillText('✦',19,-53-arm);
  // Tête
  ctx.fillStyle='#fde68a';
  ctx.fillRect(-9,-56,18,20);
  // Chapeau pointu
  ctx.fillStyle='#4c1d95';
  ctx.beginPath();
  ctx.moveTo(0,-75); ctx.lineTo(-13,-60); ctx.lineTo(13,-60);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='#6d28d9';
  ctx.fillRect(-13,-63,26,5);
  drawEyes('#4c1d95');
}

function drawSkinNinja(leg, arm){
  // Jambes noires
  ctx.fillStyle='#111827';
  ctx.fillRect(-10,-16+leg, 8,16);
  ctx.fillRect( 2, -16-leg, 8,16);
  // Corps
  ctx.fillStyle='#1f2937';
  ctx.fillRect(-12,-38,24,24);
  ctx.fillStyle='#374151';
  ctx.fillRect(-10,-37,7,9);
  // Bras
  ctx.fillStyle='#1f2937';
  ctx.fillRect(-18,-36+arm, 7,14);
  ctx.fillRect( 11,-36-arm, 7,14);
  // Kunai
  ctx.fillStyle='#9ca3af';
  ctx.fillRect(16,-46-arm, 2,20);
  ctx.fillStyle='#6b7280';
  ctx.beginPath();
  ctx.moveTo(17,-48-arm); ctx.lineTo(13,-44-arm); ctx.lineTo(21,-44-arm);
  ctx.closePath(); ctx.fill();
  // Tête
  ctx.fillStyle='#fde68a';
  ctx.fillRect(-9,-56,18,20);
  // Masque ninja
  ctx.fillStyle='#111827';
  ctx.fillRect(-11,-62,22,14); // bandeau haut
  ctx.fillRect(-11,-52,22,8);  // masque bas (bouche)
  // Bandeau rouge
  ctx.fillStyle='#dc2626';
  ctx.fillRect(-11,-59,22,4);
  drawEyes('#fff');
}

function drawSkinPirate(leg, arm){
  // Jambes
  ctx.fillStyle='#7c2d12';
  ctx.fillRect(-10,-16+leg, 8,16);
  ctx.fillRect( 2, -16-leg, 8,16);
  // Corps
  ctx.fillStyle='#9a3412';
  ctx.fillRect(-12,-38,24,24);
  ctx.fillStyle='#c2410c';
  ctx.fillRect(-10,-37,8,8);
  // Écharpe
  ctx.fillStyle='#facc15';
  ctx.fillRect(-12,-30,24,5);
  // Bras
  ctx.fillStyle='#9a3412';
  ctx.fillRect(-18,-36+arm, 7,14);
  ctx.fillRect( 11,-36-arm, 7,14);
  // Sabre courbe (simplifié)
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(15,-46-arm, 3,24);
  ctx.fillStyle='#fbbf24';
  ctx.fillRect(12,-44-arm,10,4);
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(17,-23-arm, 6,3); // pointe incurvée
  // Tête
  ctx.fillStyle='#fcd34d';
  ctx.fillRect(-9,-56,18,20);
  // Tricorne
  ctx.fillStyle='#1c1917';
  ctx.fillRect(-13,-63,26,6);
  ctx.fillStyle='#292524';
  ctx.beginPath();
  ctx.moveTo(-5,-63); ctx.lineTo(0,-74); ctx.lineTo(5,-63);
  ctx.closePath(); ctx.fill();
  // Cache-œil
  ctx.fillStyle='#000';
  ctx.fillRect(-7,-51,5,4);
  ctx.fillStyle='#fff';
  ctx.fillRect(2,-50,4,3);
  ctx.fillStyle='#7c2d12';
  ctx.fillRect(3,-50,2,2);
  // Moustache
  ctx.fillStyle='#92400e';
  ctx.fillRect(-5,-43,10,2);
}

// ── Ennemis ───────────────────────────────────────────────────
function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x+e.w/2, e.y+e.h);
  ctx.scale(e.facing,1);
  const bob = Math.sin(Date.now()*.004+e.x*.01)*2;

  if(advStyle==='advanced'){
    if(e.type==='goblin')        drawGoblinAdv(bob);
    else if(e.type==='skeleton') drawSkeletonAdv(bob);
    else if(e.type==='dragon')   drawDragonAdv(bob);
  } else {
    if(e.type==='goblin')        drawGoblin(bob);
    else if(e.type==='skeleton') drawSkeleton(bob);
    else if(e.type==='dragon')   drawDragon(bob);
  }

  ctx.restore();

  // Indicateur d'alerte
  if(e.alert && !QS.active){
    ctx.font='bold 15px Arial'; ctx.textAlign='center';
    ctx.fillStyle='#ffd700';
    ctx.fillText('❗', e.x+e.w/2, e.y-6);
  }

  // Pastille couleur groupe
  ctx.fillStyle = VERBS[e.verbData.gKey].color;
  ctx.fillRect(e.x, e.y-5, e.w, 4);
  ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=.5;
  ctx.strokeRect(e.x, e.y-5, e.w, 4);
}

function drawGoblin(bob){
  // Ombre
  ctx.fillStyle='rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(0,0,11,3,0,0,Math.PI*2); ctx.fill();

  // Jambes
  ctx.fillStyle='#7c3aed';
  ctx.fillRect(-8,-14,6,14); ctx.fillRect(2,-14,6,14);

  // Corps
  ctx.fillStyle='#16a34a';
  ctx.fillRect(-11,-34+bob,22,22);
  ctx.fillStyle='#15803d';
  ctx.beginPath(); ctx.ellipse(0,-23+bob,7,8,0,0,Math.PI*2); ctx.fill();

  // Bras
  ctx.fillStyle='#16a34a';
  ctx.fillRect(-18,-32+bob,7,12); ctx.fillRect(11,-32+bob,7,12);

  // Massue
  ctx.fillStyle='#7c5a20';
  ctx.fillRect(16,-37+bob,4,16);
  ctx.fillStyle='#5a3a10';
  ctx.fillRect(13,-40+bob,10,7);

  // Tête
  ctx.fillStyle='#22c55e';
  ctx.fillRect(-12,-52+bob,24,20);

  // Oreilles pointues
  ctx.fillStyle='#16a34a';
  ctx.beginPath(); ctx.moveTo(-12,-48+bob); ctx.lineTo(-21,-58+bob); ctx.lineTo(-12,-40+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo( 12,-48+bob); ctx.lineTo( 21,-58+bob); ctx.lineTo( 12,-40+bob); ctx.fill();

  // Yeux
  ctx.fillStyle='#ff0000';
  ctx.fillRect(-7,-46+bob,5,4); ctx.fillRect(2,-46+bob,5,4);
  ctx.fillStyle='#fff';
  ctx.fillRect(-6,-45+bob,2,2); ctx.fillRect(3,-45+bob,2,2);

  // Dents
  ctx.fillStyle='#fff';
  ctx.fillRect(-5,-36+bob,3,4); ctx.fillRect(2,-36+bob,3,4);
}

function drawSkeleton(bob){
  ctx.fillStyle='rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(0,0,10,3,0,0,Math.PI*2); ctx.fill();

  // Jambes os
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(-7,-14,4,14); ctx.fillRect(3,-14,4,14);
  ctx.beginPath(); ctx.arc(-5,-14,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 5,-14,4,0,Math.PI*2); ctx.fill();

  // Côtes
  ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=2;
  for(let r=0;r<3;r++){
    ctx.beginPath();
    ctx.moveTo(-8,-18-r*5+bob); ctx.lineTo(8,-18-r*5+bob); ctx.stroke();
  }

  // Colonne
  ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0,-14+bob); ctx.lineTo(0,-34+bob); ctx.stroke();

  // Épaules
  ctx.fillStyle='#e2e8f0';
  ctx.beginPath(); ctx.arc(-10,-32+bob,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 10,-32+bob,4,0,Math.PI*2); ctx.fill();

  // Bras
  ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(-10,-32+bob); ctx.lineTo(-16,-20+bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 10,-32+bob); ctx.lineTo( 16,-20+bob); ctx.stroke();

  // Épée squelette
  ctx.beginPath(); ctx.moveTo(16,-20+bob); ctx.lineTo(20,-36+bob); ctx.stroke();
  ctx.strokeStyle='#94a3b8'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(20,-36+bob); ctx.lineTo(23,-54+bob); ctx.stroke();

  // Crâne
  ctx.fillStyle='#f1f5f9';
  ctx.beginPath(); ctx.ellipse(0,-44+bob,11,12,0,0,Math.PI*2); ctx.fill();

  // Mâchoire
  ctx.fillStyle='#e2e8f0';
  ctx.fillRect(-8,-36+bob,16,6);

  // Orbites
  ctx.fillStyle='#1e293b';
  ctx.beginPath(); ctx.ellipse(-4,-46+bob,4,5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 4,-46+bob,4,5,0,0,Math.PI*2); ctx.fill();

  // Lueur yeux
  ctx.fillStyle='#22d3ee';
  ctx.beginPath(); ctx.ellipse(-4,-46+bob,2,2.5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 4,-46+bob,2,2.5,0,0,Math.PI*2); ctx.fill();

  // Dents
  ctx.fillStyle='#f1f5f9';
  for(let t=-6;t<=4;t+=4) ctx.fillRect(t,-36+bob,3,5);
}

function drawDragon(bob){
  ctx.save(); ctx.scale(1.25,1.25);

  // Queue
  ctx.strokeStyle='#7f1d1d'; ctx.lineWidth=9;
  ctx.beginPath();
  ctx.moveTo(12,-8+bob);
  ctx.quadraticCurveTo(26,-2+bob, 22,-24+bob);
  ctx.stroke();

  // Corps
  ctx.fillStyle='#991b1b';
  ctx.fillRect(-15,-36+bob,30,28);
  ctx.fillStyle='#7f1d1d';
  ctx.fillRect(-11,-34+bob,22,5);

  // Ailes
  ctx.fillStyle='#b91c1c';
  ctx.beginPath(); ctx.moveTo(-15,-28+bob); ctx.lineTo(-32,-52+bob); ctx.lineTo(-15,-18+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo( 15,-28+bob); ctx.lineTo( 32,-52+bob); ctx.lineTo( 15,-18+bob); ctx.fill();
  // Nervures ailes
  ctx.strokeStyle='#7f1d1d'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-15,-28+bob); ctx.lineTo(-26,-46+bob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 15,-28+bob); ctx.lineTo( 26,-46+bob); ctx.stroke();

  // Ventre
  ctx.fillStyle='#fca5a5';
  ctx.fillRect(-8,-30+bob,16,22);

  // Tête
  ctx.fillStyle='#991b1b';
  ctx.fillRect(-14,-57+bob,28,23);

  // Museau
  ctx.fillStyle='#7f1d1d';
  ctx.fillRect(14,-54+bob,13,10);

  // Cornes
  ctx.fillStyle='#fbbf24';
  ctx.beginPath(); ctx.moveTo(-8,-57+bob); ctx.lineTo(-13,-72+bob); ctx.lineTo(-4,-57+bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo( 8,-57+bob); ctx.lineTo( 13,-72+bob); ctx.lineTo(  4,-57+bob); ctx.fill();

  // Yeux
  ctx.fillStyle='#fbbf24';
  ctx.beginPath(); ctx.ellipse(-5,-48+bob,4,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#1e0a00';
  ctx.beginPath(); ctx.ellipse(-5,-48+bob,2,3,0,0,Math.PI*2); ctx.fill();

  // Flamme
  if(Math.sin(Date.now()*.006)>0.3){
    ctx.fillStyle='rgba(255,140,0,.85)';
    ctx.beginPath(); ctx.moveTo(27,-50+bob); ctx.lineTo(50,-46+bob); ctx.lineTo(27,-43+bob); ctx.fill();
    ctx.fillStyle='rgba(255,220,0,.5)';
    ctx.beginPath(); ctx.moveTo(27,-49+bob); ctx.lineTo(44,-46+bob); ctx.lineTo(27,-44+bob); ctx.fill();
  }

  ctx.restore();
}

function enemyEmoji(type){ return {goblin:'👺',skeleton:'💀',dragon:'🐉'}[type]||'👾'; }

// ── HUD ───────────────────────────────────────────────────────
function drawHUD(){
  const lvl = LEVELS[GS.level];

  ctx.fillStyle='rgba(0,0,0,.62)';
  ctx.fillRect(0,0,W,46);

  // Vies
  ctx.font='21px Arial'; ctx.textAlign='left';
  for(let i=0;i<3;i++) ctx.fillText(i<GS.lives?'❤️':'🖤', 8+i*30, 33);

  // Score
  ctx.fillStyle='#e2e8f0'; ctx.font='bold 15px Courier New'; ctx.textAlign='right';
  ctx.fillText(`${GS.score} pts`, W-8, 31);

  // Étoiles niveau (progression)
  ctx.fillStyle='#ffd700'; ctx.textAlign='center'; ctx.font='13px Courier New';
  ctx.fillText(`⭐ ${GS.stars}/${GS.maxStars}`, W/2, 31);

  // Version
  ctx.fillStyle='rgba(255,255,255,.35)'; ctx.textAlign='left'; ctx.font='9px Courier New';
  ctx.fillText(VERSION, 6, 12);

  // Étoiles persistantes (monnaie boutique)
  ctx.fillStyle='#fbbf24'; ctx.textAlign='left'; ctx.font='bold 11px Courier New';
  ctx.fillText(`🪙${SAVE.totalStars}`, 100, 12);

  // Nom du niveau
  ctx.fillStyle='#a78bfa'; ctx.font='10px Courier New';
  ctx.fillText(`Niv.${GS.level+1} · ${lvl.name}`, W/2, 12);

  // Ennemis restants
  const alive = enemies.filter(e=>e.alive).length;
  ctx.fillStyle = alive>0?'#fca5a5':'#86efac';
  ctx.textAlign='right'; ctx.font='10px Courier New';
  ctx.fillText(`👾 ${alive} restant${alive>1?'s':''}`, W-8, 12);
}

// ════════════════════════════════════════════════════════════════
//  GESTION DES SCREENS
// ════════════════════════════════════════════════════════════════

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  const el=document.getElementById(id);
  if(el) el.classList.remove('hidden');
  document.getElementById('gameHUDBtns').style.display='none';
  document.body.classList.add('screen-mode');
}
function hideScreens(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  document.getElementById('gameHUDBtns').style.display='flex';
  document.body.classList.remove('screen-mode');
}

function startLevel(idx){
  GS.level  = idx;
  GS.score  = 0;
  GS.lives  = 3;
  GS.stars  = 0;
  if(idx === 0) GS.total = 0;
  generateLevel(LEVELS[idx]);
  GS.screen = 'game';
  hideScreens();
  document.getElementById('ctrl').style.display='flex';
}

function triggerLevelComplete(){
  if(GS.screen==='levelComplete') return;
  GS.screen = 'levelComplete';

  const totalEn = enemies.length;
  const killed  = enemies.filter(e=>!e.alive).length;
  const starCount = Math.min(3, 1+Math.floor(GS.stars/Math.max(1,GS.maxStars)*2)+(killed===totalEn?1:0));
  GS.total += GS.score;

  const starsHtml = '⭐'.repeat(starCount)+'☆'.repeat(3-starCount);
  document.getElementById('lcEmoji').textContent = LEVELS[GS.level].emoji;
  document.getElementById('lcTitle').textContent = `NIVEAU ${GS.level+1} TERMINÉ !`;
  document.getElementById('lcMsg').innerHTML =
    `<div style="font-size:34px;margin-bottom:10px">${starsHtml}</div>
     Score : <b style="color:#ffd700">${GS.score}</b><br>
     Étoiles : ${GS.stars}/${GS.maxStars}<br>
     <span style="color:#a78bfa">Ennemis : ${killed}/${totalEn}</span>`;

  document.getElementById('nextLevelBtn').textContent =
    GS.level>=LEVELS.length-1 ? '🏆 RÉSULTAT FINAL' : '▶ NIVEAU SUIVANT';

  showScreen('levelCompleteScreen');
}

function triggerGameOver(){
  GS.screen='gameOver';
  document.getElementById('gameOverMsg').innerHTML =
    `Niveau ${GS.level+1} &middot; Score : <b style="color:#ffd700">${GS.score}</b>`;
  showScreen('gameOverScreen');
}

// ════════════════════════════════════════════════════════════════
//  BOUTONS UI
// ════════════════════════════════════════════════════════════════

document.getElementById('playBtn').addEventListener('click',     ()=>startLevel(0));
document.getElementById('settingsBtn').addEventListener('click', ()=>{ showScreen('settingsScreen'); renderErrorList(); });
document.getElementById('shopBtn').addEventListener('click',     ()=>{ showScreen('shopScreen'); renderShop(); });
document.getElementById('shopBackBtn').addEventListener('click', ()=>{
  if(GS._shopFromGame){
    GS._shopFromGame = false;
    GS.paused = false;
    document.getElementById('inGamePauseBtn').classList.remove('active');
    hideScreens();
    GS.screen = 'game';
    document.getElementById('ctrl').style.display='flex';
  } else {
    showScreen('startScreen');
  }
  renderShop();
});

// ── Boutons HUD in-game ──────────────────────────────────────
document.getElementById('inGamePauseBtn').addEventListener('click', ()=>{
  GS.paused = !GS.paused;
  document.getElementById('inGamePauseBtn').classList.toggle('active', GS.paused);
});

document.getElementById('inGameShopBtn').addEventListener('click', ()=>{
  GS.paused = true;
  GS._shopFromGame = true;
  document.getElementById('ctrl').style.display='none';
  showScreen('shopScreen');
  renderShop();
});

document.getElementById('inGameMenuBtn').addEventListener('click', ()=>{
  GS.paused = false;
  GS.screen = 'start';
  document.getElementById('ctrl').style.display='none';
  showScreen('startScreen');
  renderShop();
});
document.getElementById('resetErrorsBtn').addEventListener('click', resetErrors);
document.getElementById('settingsBackBtn').addEventListener('click',()=>showScreen('startScreen'));
document.getElementById('howtoBtn').addEventListener('click',    ()=>showScreen('howtoScreen'));
document.getElementById('howtoBackBtn').addEventListener('click',()=>showScreen('startScreen'));

// ── Toggles de thème ─────────────────────────────────────────
document.querySelectorAll('.themeTog').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

// ── Toggle style sprites ──────────────────────────────────────
document.querySelectorAll('.sprTog').forEach(btn => {
  btn.addEventListener('click', () => setSprStyle(btn.dataset.spr));
});

// ── Logique des toggles de réglages ──────────────────────────
document.querySelectorAll('.tog:not(.themeTog):not(.sprTog)').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type; // 'group' | 'tense'
    const val  = btn.dataset.val;
    const arr  = type==='group' ? SETTINGS.groups : SETTINGS.tenses;
    const idx  = arr.indexOf(val);

    if(idx>=0){
      // Désactiver seulement si pas le dernier actif
      if(arr.length > 1){
        arr.splice(idx,1);
        btn.classList.remove('on');
        document.getElementById('setWarn').textContent='';
      } else {
        document.getElementById('setWarn').textContent =
          `⚠️ Garde au moins un ${type==='group'?'groupe':'temps'} actif.`;
      }
    } else {
      arr.push(val);
      btn.classList.add('on');
      document.getElementById('setWarn').textContent='';
    }
  });
});
document.getElementById('retryBtn').addEventListener('click',    ()=>startLevel(GS.level));
document.getElementById('menuBtn').addEventListener('click',     ()=>showScreen('startScreen'));
document.getElementById('menuBtn2').addEventListener('click',    ()=>showScreen('startScreen'));
document.getElementById('menuBtn3').addEventListener('click',    ()=>showScreen('startScreen'));
document.getElementById('playAgainBtn').addEventListener('click',()=>startLevel(0));

document.getElementById('nextLevelBtn').addEventListener('click',()=>{
  if(GS.level>=LEVELS.length-1){
    document.getElementById('finalScore').innerHTML =
      `Score total : <b style="color:#ffd700">${GS.total}</b><br><br>
       Tu maîtrises maintenant :<br>
       🟣 Groupe 1 · Présent & Imparfait<br>
       🔵 Groupe 2 · Présent & Imparfait<br>
       🔴 Groupe 3 · Présent & Futur simple`;
    showScreen('winScreen');
  } else {
    startLevel(GS.level+1);
  }
});

// ════════════════════════════════════════════════════════════════
//  CHÂTEAU — INTÉRIEUR
// ════════════════════════════════════════════════════════════════

const castlePlayer = { x:50, y:400, vx:0, vy:0, onGround:false, facing:1, walkT:0, w:28, h:44 };
const CHEST_OBJ   = { x:195, y:H-113, w:64, h:58 };
const castlePlats = [{ x:0, y:H-55, w:W, h:60, type:'ground' }];
const CQ = { active:false, streak:0, needed:3 };

function updateCastlePhysics(dt){
  const cp = castlePlayer;
  cp.vx = 0;
  if(keys.left)  { cp.vx=-PSPEED; cp.facing=-1; }
  if(keys.right) { cp.vx= PSPEED; cp.facing= 1; }
  if(jumpRequest && cp.onGround){ cp.vy=JUMP_V; cp.onGround=false; }
  jumpRequest=false;

  cp.vy = Math.min(cp.vy+GRAV*dt, MAX_FALL);
  cp.x += cp.vx*dt; cp.y += cp.vy*dt;
  cp.x = Math.max(0, Math.min(W-cp.w, cp.x));
  if(cp.y < 46){ cp.y=46; cp.vy=Math.max(0,cp.vy); }

  cp.onGround=false;
  for(const p of castlePlats) resolveAABB(cp,p);

  if(cp.vx!==0&&cp.onGround) cp.walkT=(cp.walkT+dt*8)%1000; else if(cp.onGround) cp.walkT=0;
  if(chestExplodeT>0) chestExplodeT=Math.max(0,chestExplodeT-dt);

  // Sortie par la porte gauche
  if(cp.x<=2){
    player.x=castlePlayerSavedX; player.vy=0;
    GS.screen='game'; return;
  }
  // Contact avec le coffre
  if(castleChestState==='closed' && !QS.active && rectsTouch(cp,CHEST_OBJ)){
    openChestQuestion();
  }
}

// ── Quiz coffre ──────────────────────────────────────────────

function buildChestQuestion(){
  const q = makeQuestion(randomVerbData());
  QS.q = q;
  const hearts = '🔑'.repeat(CQ.streak)+'⬜'.repeat(CQ.needed-CQ.streak);
  document.getElementById('qEnemy').textContent = '📦';
  document.getElementById('qGroup').textContent = `Coffre magique — ${CQ.streak}/${CQ.needed}`;
  document.getElementById('qTense').textContent = q.tenseLabel;
  document.getElementById('qText').innerHTML =
    `Conjugue le verbe <span class="vb">${q.vKey}</span> au <span class="vb">${q.tenseLabel}</span> :<br>
     <span class="pro">${PRONOUN_LABEL[q.pronIdx]}</span> <span class="blank">???</span>`;
  const container = document.getElementById('qAnswers');
  container.innerHTML='';
  q.options.forEach(opt=>{
    const btn=document.createElement('button');
    btn.className='qBtn'; btn.textContent=opt;
    const h=()=>chestAnswerClick(opt);
    btn.addEventListener('click',h);
    btn.addEventListener('touchend',e=>{e.preventDefault();h();},{passive:false});
    container.appendChild(btn);
  });
  document.getElementById('qHP').innerHTML=
    `<span style="font-size:13px;color:#ffd700">${hearts} — 3 bonnes réponses d'affilée !</span>`;
}

function openChestQuestion(){
  if(QS.active) return;
  QS.active=true; QS.enemy=null;
  CQ.active=true; CQ.streak=0;
  buildChestQuestion();
  document.getElementById('qModal').classList.add('show');
  GS.screen='question';
}

function chestAnswerClick(answer){
  if(!QS.active) return;
  const btns=document.querySelectorAll('.qBtn');
  btns.forEach(b=>b.disabled=true);
  btns.forEach(b=>{
    if(b.textContent===QS.q.correct) b.classList.add('ok');
    if(b.textContent===answer&&answer!==QS.q.correct) b.classList.add('bad');
  });

  if(answer===QS.q.correct){
    CQ.streak++;
    if(CQ.streak>=CQ.needed){
      // Succès : 3 bonnes réponses d'affilée !
      setTimeout(()=>{
        const coins = 10+Math.floor(Math.random()*41); // 10-50
        castleRewardCoins = coins;
        castleChestState  = 'open';
        SAVE.totalStars  += coins;
        saveSave();
        closeQuestion();
      },700);
    } else {
      // Question suivante
      setTimeout(()=>buildChestQuestion(),700);
    }
  } else {
    // Mauvaise réponse : coffre explose, modal se ferme
    recordError(QS.q);
    if(navigator.vibrate) navigator.vibrate([100,60,250]);
    setTimeout(()=>{
      castleChestState = 'destroyed';
      chestExplodeT = 2.2;
      closeQuestion();
    },800);
  }
}

// ── Dessin coffre ────────────────────────────────────────────

function drawChest(){
  const c=CHEST_OBJ;
  if(castleChestState==='destroyed'){
    const t=Date.now()*.003;
    // Morceaux de bois éparpillés
    const pieces=[
      [c.x-22,c.y+c.h-18,32,9,-0.35],
      [c.x+c.w-8, c.y+c.h-14,28,8, 0.42],
      [c.x+8,     c.y+c.h-44,22,9,-0.55],
      [c.x+c.w/2, c.y+4,     24,7, 0.22],
      [c.x-12,    c.y+c.h/2, 20,7,-0.72],
    ];
    for(const [px,py,pw,ph,ang] of pieces){
      ctx.save();
      ctx.translate(px+pw/2, py+ph/2);
      ctx.rotate(ang+Math.sin(t+px*.1)*.06);
      ctx.fillStyle='#5a3810'; ctx.fillRect(-pw/2,-ph/2,pw,ph);
      ctx.fillStyle='#3a2208'; ctx.fillRect(-pw/2,-ph/2,pw,2);
      ctx.fillStyle='#a08040'; ctx.fillRect(-pw/2+pw*.3,-ph/2,4,ph); // metal strip
      ctx.restore();
    }
    // Fumée
    for(let i=0;i<3;i++){
      const sr=16+i*10+Math.sin(t+i)*5;
      const sa=Math.max(0,.5-i*.15-Date.now()*.0001%0.3);
      ctx.save(); ctx.globalAlpha=sa;
      ctx.fillStyle='#666';
      ctx.beginPath(); ctx.arc(c.x+c.w/2+Math.sin(t+i*2)*6, c.y-10-i*16, sr, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha=1; ctx.restore();
    }
    ctx.fillStyle='#ef4444'; ctx.font='bold 13px Courier New'; ctx.textAlign='center';
    ctx.fillText('💥 COFFRE DÉTRUIT !', c.x+c.w/2, c.y-50);
    return;
  }
  if(castleChestState==='open'){
    // Base
    ctx.fillStyle='#7a4a10'; ctx.fillRect(c.x,c.y+22,c.w,c.h-22);
    ctx.fillStyle='#5a3008'; ctx.fillRect(c.x+3,c.y+25,c.w-6,c.h-25);
    ctx.fillStyle='#6a4010'; ctx.fillRect(c.x,c.y+22,c.w,4); ctx.fillRect(c.x,c.y+c.h-8,c.w,3);
    // Couvercle ouvert (rotation)
    ctx.save();
    ctx.translate(c.x+c.w/2,c.y+22);
    ctx.rotate(-Math.PI*.58);
    ctx.fillStyle='#8a5018'; ctx.fillRect(-c.w/2,0,c.w,c.h*.36);
    ctx.fillStyle='#a06020'; ctx.fillRect(-c.w/2,0,c.w,5);
    ctx.restore();
    // Pièces à l'intérieur
    ctx.fillStyle='#ffd700';
    for(let i=0;i<6;i++){
      ctx.beginPath(); ctx.ellipse(c.x+10+i*8,c.y+34+Math.sin(i)*2,5,3,0,0,Math.PI*2); ctx.fill();
    }
    // Étincelles
    const t=Date.now()*.005;
    ctx.font='16px Arial'; ctx.textAlign='center';
    ['✨','💰','✨'].forEach((em,i)=>{
      ctx.fillText(em, c.x+c.w/2+(i-1)*22+Math.sin(t+i)*5, c.y-4+Math.sin(t+i*1.5)*8);
    });
  } else {
    // Coffre fermé (pulsation légère)
    const pulse=1+Math.sin(Date.now()*.004)*.025;
    ctx.save();
    ctx.translate(c.x+c.w/2,c.y+c.h/2);
    ctx.scale(pulse,pulse);
    const hw=c.w/2, hh=c.h/2;
    // Ombre
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(-hw+5,hh+3,c.w,8);
    // Corps
    ctx.fillStyle='#7a4a10'; ctx.fillRect(-hw,hh*.25,c.w,hh*.75+hh);
    ctx.fillStyle='#5a3008'; ctx.fillRect(-hw+3,hh*.28,c.w-6,hh*.72+hh-2);
    // Bandes bois
    ctx.fillStyle='#6a4010';
    for(let i=0;i<2;i++) ctx.fillRect(-hw,hh*.25+i*(c.h*.75/3),c.w,4);
    // Renforts métalliques
    ctx.fillStyle='#a08040';
    for(const [mx,my] of [[-hw,hh*.25],[-hw,hh*.9],[hw-5,hh*.25],[hw-5,hh*.9]]){
      ctx.fillRect(mx,my,5,14);
    }
    // Couvercle
    ctx.fillStyle='#8a5018'; ctx.fillRect(-hw,-hh,c.w,hh*1.3);
    ctx.fillStyle='#a06020'; ctx.fillRect(-hw,-hh,c.w,5);
    ctx.fillStyle='#6a3a10'; ctx.fillRect(-hw,hh*.22,c.w,4);
    // Dôme du couvercle
    ctx.fillStyle='#9a5c20';
    ctx.beginPath(); ctx.ellipse(0,-hh,hw,hh*.2,0,Math.PI,0); ctx.fill();
    // Serrure
    ctx.fillStyle='#ffd700'; ctx.fillRect(-8,hh*.05,16,14);
    ctx.fillStyle='#c8a800';
    ctx.beginPath(); ctx.arc(0,hh*.02,7,Math.PI,0); ctx.fill();
    ctx.fillStyle='#1a1000'; ctx.fillRect(-3,hh*.1,6,7);
    // Bandes verticales
    ctx.fillStyle='rgba(160,120,50,.45)';
    for(const bx of [-hw,-hw*.3,hw*.3,hw-3]) ctx.fillRect(bx,-hh,3,c.h+10);
    ctx.restore();
    // Indication de proximité
    const cp=castlePlayer;
    if(Math.abs((cp.x+cp.w/2)-(c.x+c.w/2))<72&&cp.onGround){
      ctx.fillStyle='#ffd700'; ctx.font='bold 12px Courier New'; ctx.textAlign='center';
      ctx.fillText('⚡ Touchez le coffre !', c.x+c.w/2, c.y-16);
    }
  }
}

// ── Dessin intérieur château ─────────────────────────────────

function drawCastleRoom(){
  // Fond pierre
  ctx.fillStyle='#0f0f1e'; ctx.fillRect(0,0,W,H);
  const bW=56,bH=28;
  for(let row=-1;row<=Math.ceil(H/bH);row++){
    for(let col=-1;col<=Math.ceil(W/bW);col++){
      const sx=col*bW+(row%2===0?0:bW/2), sy=row*bH;
      const shade=(row+col)%3===0?'#2e2e42':(row+col)%3===1?'#282838':'#252535';
      ctx.fillStyle=shade; ctx.fillRect(sx+1,sy+1,bW-2,bH-2);
      ctx.fillStyle='rgba(255,255,255,.032)'; ctx.fillRect(sx+1,sy+1,bW-2,2);
      ctx.fillStyle='rgba(0,0,0,.24)'; ctx.fillRect(sx+1,sy+bH-3,bW-2,2);
    }
  }
  // Sol parqueté
  const flY=H-55;
  ctx.fillStyle='#3a2810'; ctx.fillRect(0,flY,W,55);
  ctx.fillStyle='#2a1c08'; ctx.fillRect(0,flY,W,5);
  for(let tx=0;tx<W;tx+=48){
    ctx.fillStyle=tx%96===0?'#4a3418':'#3e2c12';
    ctx.fillRect(tx+1,flY+5,47,50);
    ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fillRect(tx+1,flY+5,47,2);
  }
  // Torches
  for(const tx of [70,W-70]){
    const ty=flY-92;
    ctx.fillStyle='#6a6a6a'; ctx.fillRect(tx-3,ty,6,32); ctx.fillRect(tx-9,ty-4,18,8);
    const ft=Date.now()*.006;
    ctx.fillStyle='rgba(255,100,0,.9)';
    ctx.beginPath(); ctx.moveTo(tx,ty-30+Math.sin(ft)*4);
    ctx.lineTo(tx-12,ty+Math.sin(ft+1)*3); ctx.lineTo(tx+12,ty+Math.sin(ft+2)*3); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,220,50,.85)';
    ctx.beginPath(); ctx.moveTo(tx,ty-18+Math.sin(ft+.5)*3);
    ctx.lineTo(tx-6,ty+Math.sin(ft+1.5)*2); ctx.lineTo(tx+6,ty+Math.sin(ft+2.5)*2); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalAlpha=0.12+Math.sin(ft)*.04;
    const rg=ctx.createRadialGradient(tx,ty-5,0,tx,ty-5,55);
    rg.addColorStop(0,'#ff9900'); rg.addColorStop(1,'transparent');
    ctx.fillStyle=rg; ctx.fillRect(tx-55,ty-60,110,90);
    ctx.globalAlpha=1; ctx.restore();
  }
  // Porte de sortie (gauche)
  const dW=48,dH=130;
  ctx.fillStyle='#050510'; ctx.fillRect(0,flY-dH,dW,dH);
  ctx.fillStyle='#7a5028';
  ctx.fillRect(0,flY-dH,4,dH); ctx.fillRect(dW-4,flY-dH,4,dH); ctx.fillRect(0,flY-dH-4,dW,8);
  ctx.fillStyle='#050510'; ctx.beginPath(); ctx.arc(dW/2,flY-dH,dW/2,Math.PI,0); ctx.fill();
  ctx.strokeStyle='#7a5028'; ctx.lineWidth=6;
  ctx.beginPath(); ctx.arc(dW/2,flY-dH,dW/2+3,Math.PI,0); ctx.stroke();
  ctx.fillStyle='#ffd700'; ctx.font='bold 11px Courier New'; ctx.textAlign='center';
  ctx.fillText('◀ SORTIR', dW/2, flY-dH-12);

  // Coffre
  drawChest();

  // Joueur dans le château
  const cp=castlePlayer;
  if(advStyle==='advanced' && paladinSpritesReady){
    // Use paladin sprite in castle too
    ctx.save();
    ctx.translate(cp.x+cp.w/2, cp.y+cp.h);
    const dir = cp.facing>=0 ? 'right' : 'left';
    let spr;
    if(!cp.onGround){
      const jF = PALADIN_SPRITES.jump[dir];
      const t = Math.min(1, Math.max(0, (cp.vy - JUMP_V) / (-JUMP_V * 2)));
      spr = jF[Math.min(jF.length-1, Math.floor(t*jF.length))];
    } else if(Math.abs(cp.vx)>0.5){
      const rF = PALADIN_SPRITES.run[dir];
      spr = rF[Math.floor(cp.walkT*1.5)%rF.length];
    } else {
      spr = PALADIN_SPRITES.idle[dir];
    }
    ctx.drawImage(spr, -56, -112, 112, 112);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(cp.x+cp.w/2, cp.y+cp.h);
    ctx.scale(cp.facing,1);
    ctx.fillStyle='rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0,0,13,4,0,0,Math.PI*2); ctx.fill();
    const leg=Math.sin(cp.walkT)*6, arm=Math.sin(cp.walkT+Math.PI)*5;
    if(advStyle==='advanced'){
      pxDraw(ctx,getSkinSprite(SAVE.skin||'knight',Math.floor(cp.walkT*3)%2),-20,-44,2,false);
    } else {
      const sk=SAVE.skin||'knight';
      if(sk==='knight') drawSkinKnight(leg,arm);
      else if(sk==='mage') drawSkinMage(leg,arm);
      else if(sk==='ninja') drawSkinNinja(leg,arm);
      else if(sk==='pirate') drawSkinPirate(leg,arm);
    }
    ctx.restore();
  }

  // Anneau d'explosion du coffre
  if(chestExplodeT>0){
    const prog=1-chestExplodeT/2.2;
    const cx2=CHEST_OBJ.x+CHEST_OBJ.w/2, cy2=CHEST_OBJ.y+CHEST_OBJ.h/2;
    for(const [col,rMul,lw] of [['#ff6600',1,10],['#ffd700',.65,6],['#fff',.35,3]]){
      ctx.save();
      ctx.globalAlpha=Math.max(0,1-prog*1.4);
      ctx.strokeStyle=col; ctx.lineWidth=lw;
      ctx.beginPath(); ctx.arc(cx2,cy2,prog*130*rMul,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1; ctx.restore();
    }
    // Flash blanc
    if(prog<0.12){
      ctx.save(); ctx.globalAlpha=(0.12-prog)/0.12*.9;
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
      ctx.globalAlpha=1; ctx.restore();
    }
  }

  // HUD intérieur
  ctx.fillStyle='rgba(0,0,0,.78)'; ctx.fillRect(0,0,W,44);
  ctx.fillStyle='#d4b896'; ctx.font='bold 15px Courier New'; ctx.textAlign='center';
  ctx.fillText('🏰 CHÂTEAU — INTÉRIEUR', W/2, 15);
  ctx.fillStyle='#fbbf24'; ctx.font='11px Courier New';
  ctx.fillText(`🪙 ${SAVE.totalStars} pièces`, W/2, 33);

  // Message récompense coffre
  if(castleChestState==='open'&&castleRewardCoins>0){
    const t=Date.now()*.002;
    ctx.font='bold 22px Courier New'; ctx.textAlign='center';
    ctx.fillStyle=`rgba(255,215,0,${0.85+Math.sin(t)*.1})`;
    ctx.fillText(`+${castleRewardCoins} 🪙 gagnés !`, W/2, CHEST_OBJ.y-28);
  }
}

// ── Sprite château dans le monde (1er plan, grande porte transparente) ──────

// Styles de château selon le niveau (couleurs thématiques)
const CASTLE_STYLES = [
  { body:'#4a6640', dark:'#355230', accent:'#7a9a60', flag:'#22aa44', winCol:'#90ff80' }, // Forêt
  { body:'#2e4a7a', dark:'#1e3060', accent:'#5080b0', flag:'#3399ff', winCol:'#80d0ff' }, // Rivière
  { body:'#4a2870', dark:'#321850', accent:'#7040a0', flag:'#aa00ff', winCol:'#cc88ff' }, // Château Sombre
  { body:'#5a4020', dark:'#3e2a10', accent:'#8a6030', flag:'#cc8800', winCol:'#ffdd88' }, // Cavernes
  { body:'#7a1a10', dark:'#550d08', accent:'#aa3020', flag:'#ff3300', winCol:'#ff9966' }, // Dragon
];

function drawCastleSprite(ca, c){
  // Drawing happens inside ctx.translate(-camX), so use world x directly.
  const sx = ca.x;
  const sxScreen = ca.x - camX;
  if(sxScreen > W+240 || sxScreen + ca.w < -240) return;

  const st = CASTLE_STYLES[Math.min(GS.level, CASTLE_STYLES.length-1)];
  const gY2 = ca.y+ca.h;           // bas du château (sol)
  const cx2 = sx+ca.w/2;           // centre horizontal
  const dW=52, dH=90;              // porte
  const dX = cx2-dW/2;
  const dTop = gY2-dH;
  const archR = dW/2;
  const brickH=18, brickW=22;

  function drawBricks(x,y,w,h){
    ctx.fillStyle='rgba(0,0,0,.15)';
    for(let r=0;r<Math.ceil(h/brickH);r++){
      for(let bc=0;bc<Math.ceil(w/brickW)+1;bc++){
        const bx=x+bc*brickW+(r%2?brickW/2:0);
        const by=y+r*brickH;
        if(bx+brickW<=x||bx>=x+w||by+brickH<=y||by>=y+h) continue;
        const clX=Math.max(bx,x), clW=Math.min(bx+brickW,x+w)-clX;
        const clY=Math.max(by,y), clH=Math.min(by+brickH,y+h)-clY;
        ctx.fillRect(clX+1,clY+1,clW-2,clH-2);
      }
    }
    ctx.fillStyle='rgba(255,255,255,.05)';
    ctx.fillRect(x,y,w,2);
  }

  // ── Tours latérales (dessinées en premier pour être derrière le corps) ──
  const tW=32, tH=ca.h+28;
  for(const tX of [sx-tW+8, sx+ca.w-8]){
    ctx.fillStyle=st.dark; ctx.fillRect(tX,ca.y-26,tW,tH);
    drawBricks(tX,ca.y-26,tW,tH);
    // Merlons tour
    for(let i=0;i<3;i++){
      ctx.fillStyle=st.dark;
      ctx.fillRect(tX+2+i*(tW/3),ca.y-40,9,16);
    }
    // Fenêtre tour en ogive
    const wX=tX+tW/2-5, wY=ca.y+28;
    ctx.fillStyle='#030308'; ctx.fillRect(wX,wY,10,14);
    ctx.beginPath(); ctx.arc(wX+5,wY,5,Math.PI,0); ctx.fill();
    // Lueur
    ctx.save(); ctx.globalAlpha=0.45+Math.sin(Date.now()*.006)*.15;
    ctx.fillStyle=st.winCol;
    ctx.fillRect(wX+1,wY+1,8,10);
    ctx.beginPath(); ctx.arc(wX+5,wY,4,Math.PI,0); ctx.fill();
    ctx.globalAlpha=1; ctx.restore();
  }

  // ── Corps du château (plein — le joueur est dessiné par-dessus) ──
  ctx.fillStyle=st.body; ctx.fillRect(sx,ca.y,ca.w,ca.h);
  drawBricks(sx,ca.y,ca.w,ca.h);

  // ── Porte (ouverture sombre dans le mur) ─────────────────────
  // Fond sombre
  ctx.fillStyle='#05050a';
  ctx.fillRect(dX, dTop, dW, dH);
  // Arc du haut
  ctx.beginPath();
  ctx.arc(cx2, dTop, archR, Math.PI, 0);
  ctx.fill();
  // Cadre de porte en bois
  ctx.strokeStyle=st.accent; ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(dX-2, gY2); ctx.lineTo(dX-2, dTop);
  ctx.arc(cx2, dTop, archR+2, Math.PI, 0, false);
  ctx.lineTo(dX+dW+2, gY2);
  ctx.stroke();
  // Clef de voûte
  ctx.fillStyle=st.accent; ctx.fillRect(cx2-5, dTop-archR-6, 10, 10);
  // Lueur intérieure (profondeur)
  ctx.save(); ctx.globalAlpha=0.18+Math.sin(Date.now()*.004)*.06;
  ctx.fillStyle=st.winCol;
  ctx.fillRect(dX+4, dTop+4, dW-8, dH-4);
  ctx.beginPath(); ctx.arc(cx2, dTop, archR-4, Math.PI, 0); ctx.fill();
  ctx.globalAlpha=1; ctx.restore();

  // ── Merlons corps principal ───────────────────────────────────
  const mCount=Math.floor(ca.w/24);
  for(let i=0;i<mCount;i++){
    const mx=sx+3+i*(ca.w/mCount);
    if(mx+14>dX-2&&mx<dX+dW+2) continue;
    ctx.fillStyle=st.body; ctx.fillRect(mx,ca.y-14,14,18);
    ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(mx+1,ca.y-14,12,3);
  }

  // ── Fenêtres principales ──────────────────────────────────────
  ctx.fillStyle='#030308';
  const wins=[[sx+20,ca.y+38],[sx+ca.w-32,ca.y+38]];
  for(const [wx,wy] of wins){
    ctx.fillRect(wx,wy,12,18); ctx.beginPath(); ctx.arc(wx+6,wy,6,Math.PI,0); ctx.fill();
  }
  ctx.save(); ctx.globalAlpha=0.4+Math.sin(Date.now()*.005)*.12; ctx.fillStyle=st.winCol;
  for(const [wx,wy] of wins){
    ctx.fillRect(wx+1,wy+1,10,14); ctx.beginPath(); ctx.arc(wx+6,wy,5,Math.PI,0); ctx.fill();
  }
  ctx.globalAlpha=1; ctx.restore();

  // ── Marches d'entrée ─────────────────────────────────────────
  for(let i=0;i<3;i++){
    ctx.fillStyle=i%2===0?st.accent:st.dark;
    ctx.fillRect(dX-5+i*4, gY2+i*4, dW+10-i*8, 5);
  }

  // ── Bannière (petite, distincte du drapeau de fin de niveau) ──
  const flagX=sx+ca.w-12;
  const flagY=ca.y-10;
  ctx.fillStyle='#aaa'; ctx.fillRect(flagX,flagY-20,2,22);
  const fw=Math.sin(Date.now()*.004)*2;
  ctx.fillStyle=st.flag;
  ctx.beginPath();
  ctx.moveTo(flagX+2,flagY-20); ctx.lineTo(flagX+16,flagY-13+fw);
  ctx.lineTo(flagX+14,flagY-6+fw*.6); ctx.lineTo(flagX+2,flagY-6); ctx.fill();

  // ── Indication d'entrée ──────────────────────────────────────
  if(!QS.active&&GS.screen==='game'){
    const px=player.x+player.w/2;
    if(Math.abs(px-(ca.x+ca.w/2))<95&&player.onGround){
      ctx.save();
      ctx.font='bold 13px Courier New'; ctx.textAlign='center';
      ctx.fillStyle='rgba(0,0,0,.75)'; ctx.fillRect(cx2-108,ca.y-36,216,22);
      ctx.fillStyle='#ffd700'; ctx.fillText('⬆ Entrer dans le château',cx2,ca.y-20);
      ctx.restore();
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  BOUCLE PRINCIPALE
// ════════════════════════════════════════════════════════════════

let lastT=0;
function drawPauseOverlay(){
  ctx.fillStyle='rgba(0,0,0,.55)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';
  ctx.font='bold 36px Courier New';
  ctx.textAlign='center';
  ctx.fillText('⏸ PAUSE', W/2, H/2);
  ctx.font='14px Courier New';
  ctx.fillStyle='#94a3b8';
  ctx.fillText('Appuie sur ⏸ pour reprendre', W/2, H/2+36);
}

function loop(t){
  const dt=Math.min((t-lastT)/1000, .05);
  lastT=t;
  if(GS.screen==='game' && !GS.paused) updatePhysics(dt);
  if(GS.screen==='castle' && !QS.active) updateCastlePhysics(dt);
  if(GS.screen==='game' || (GS.screen==='question' && !CQ.active)){
    render();
    if(GS.paused) drawPauseOverlay();
  }
  if(GS.screen==='castle' || (GS.screen==='question' && CQ.active)){
    drawCastleRoom();
  }
  requestAnimationFrame(loop);
}

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════

document.getElementById('ctrl').style.display='none';
applyTheme(currentTheme);
setSprStyle(advStyle);
showScreen('startScreen');
document.getElementById('menuStars').textContent = `🪙${SAVE.totalStars}`;
requestAnimationFrame(loop);
