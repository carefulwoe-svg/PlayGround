import * as THREE from 'three';
import './style.css';

const $ = (id) => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#20241f');
scene.fog = new THREE.FogExp2('#20241f', 0.027);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .1, 100);
camera.position.set(0, 6.35, 14.8);
camera.lookAt(0, 1.4, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.querySelector('#world').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#d5dbd1', '#1d1b19', 2.0));
const keyLight = new THREE.SpotLight('#fff0d9', 240, 32, Math.PI / 3.2, .5, 1.5);
keyLight.position.set(-2, 12, 4); keyLight.target.position.set(0, 0, 0); keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024); scene.add(keyLight, keyLight.target);
const fillLight = new THREE.SpotLight('#a9c8e8', 125, 28, Math.PI / 3.6, .6, 1.4);
fillLight.position.set(5, 9, -5); fillLight.target.position.set(0, 1, 0); scene.add(fillLight, fillLight.target);
const warmLight = new THREE.PointLight('#d98562', 30, 13); warmLight.position.set(-7, 4, 1); scene.add(warmLight);

function material(color, roughness = .7, metalness = 0) { return new THREE.MeshStandardMaterial({ color, roughness, metalness }); }
const mat = {
  ring: material('#5a6151'), apron: material('#272b25'), canvas: material('#838779'), ropeBlue: material('#7db3dc', .42),
  ropeWhite: material('#d9d8ca', .45), ropeRed: material('#bd7162', .45), steel: material('#3e423a', .32, .7),
  player: material('#31556f', .56), playerTrim: material('#9cc6d8', .43), opponent: material('#873f35', .55), opponentTrim: material('#e0b176', .45),
  skin: material('#87563e', .69), skin2: material('#b77c5c', .66), skinLight: material('#d69b76', .62), skinShade: material('#613e31'),
  gloveBlue: material('#477da5', .39), gloveRed: material('#b84f41', .38), wrap: material('#e7e2d4', .75), shoe: material('#171b1b', .72),
  black: material('#151714'), white: material('#eee9dd'), gold: material('#c6a665', .35, .55), hair: material('#191a19'),
  crowdA: material('#524b3e'), crowdB: material('#343e40'), crowdC: material('#72564a'), crowdD: material('#73735e'),
};

function box(parent, size, pos, matl, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), matl);
  mesh.position.set(...pos); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent, radius, pos, matl, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), matl);
  mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinderBetween(parent, a, b, radius, matl, radial = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, radial), matl);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); setBetween(mesh, a, b); return mesh;
}
function setBetween(mesh, a, b) {
  const aa = new THREE.Vector3(...a), bb = new THREE.Vector3(...b), d = bb.clone().sub(aa);
  mesh.position.copy(aa.add(bb).multiplyScalar(.5)); mesh.scale.set(1, d.length(), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}
function ringLabel(text, x, z, color = '#d4d7c7') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = color; ctx.font = '700 43px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 62);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.position.set(x, .41, z); sprite.scale.set(2.45, .46, 1); scene.add(sprite);
}

// A compact professional ring, with layered canvas, apron, ropes and padded corner posts.
const ring = new THREE.Group(); scene.add(ring);
box(ring, [9.5, .55, 8.2], [0, -.12, 0], mat.apron);
box(ring, [9.2, .1, 7.9], [0, .2, 0], mat.canvas);
const innerCanvas = box(ring, [7.95, .014, 6.65], [0, .258, 0], material('#959887'));
// Subtle ring-canvas border stripes
for (const x of [-4.25, 4.25]) box(ring, [.035, .012, 7.85], [x, .258, 0], mat.white, false);
for (const z of [-3.65, 3.65]) box(ring, [8.55, .012, .035], [0, .258, z], mat.white, false);
ringLabel('CORNERSTONE  •  PROFESSIONAL BOXING', 0, 2.2, '#4d564a');
// neutral center emblem
const emblem = new THREE.Mesh(new THREE.CircleGeometry(.77, 48), material('#747a69'));
emblem.rotation.x = -Math.PI / 2; emblem.position.set(0, .27, 0); emblem.receiveShadow = true; ring.add(emblem);
const emblemRing = new THREE.Mesh(new THREE.RingGeometry(.72, .75, 48), mat.gold);
emblemRing.rotation.x = -Math.PI / 2; emblemRing.position.set(0, .275, 0); ring.add(emblemRing);
for (const x of [-4.15, 4.15]) for (const z of [-3.48, 3.48]) {
  box(ring, [.2, 2.5, .2], [x, 1.2, z], mat.steel);
  const cornerColor = (x < 0 && z > 0) || (x > 0 && z < 0) ? mat.ropeBlue : mat.ropeRed;
  box(ring, [.29, .45, .29], [x, 1.55, z], cornerColor);
}
for (const yy of [.82, 1.3, 1.78]) {
  const ropeMat = yy === 1.3 ? mat.ropeWhite : mat.ropeBlue;
  for (const x of [-4.15, 4.15]) {
    const rope = cylinderBetween(ring, [x, yy, -3.48], [x, yy, 3.48], .037, ropeMat, 8);
    rope.rotation.set(Math.PI / 2, 0, 0); rope.scale.set(1, 6.96, 1);
  }
  for (const z of [-3.48, 3.48]) {
    const rope = cylinderBetween(ring, [-4.15, yy, z], [4.15, yy, z], .035, ropeMat, 8);
    rope.rotation.z = Math.PI / 2; rope.scale.set(1, 8.3, 1);
  }
}
// Canvas corner marks and turnbuckle pads
for (const x of [-3.86, 3.86]) for (const z of [-3.18, 3.18]) {
  const pad = box(ring, [.22, 1.15, .22], [x, 1.32, z], material('#262924'));
  pad.rotation.y = Math.PI / 4;
}

// Stands, spectators and broadcast lights around the ring.
const arena = new THREE.Group(); scene.add(arena);
box(arena, [30, .4, 22], [0, -1.02, 0], material('#191c19'));
for (let row = 0; row < 5; row++) {
  const z = -5.3 - row * .68;
  box(arena, [16.4 - row * .7, .18, .64], [0, -.22 + row * .2, z], material(row % 2 ? '#373b35' : '#2c302b'));
}
let seed = 1931; function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const crowdMats = [mat.crowdA, mat.crowdB, mat.crowdC, mat.crowdD, material('#4f5551'), material('#7a5344')];
for (let row = 0; row < 5; row++) {
  for (let i = 0; i < 36; i++) {
    const x = -7.5 + i * .43 + (rand() - .5) * .17, z = -5.45 - row * .68 + (rand() - .5) * .3;
    const y = -.02 + row * .19 + rand() * .1, h = .32 + rand() * .22;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.105, h, 3, 6), crowdMats[Math.floor(rand()*crowdMats.length)]);
    body.position.set(x, y + h * .35, z); body.scale.set(1, 1, .7); body.castShadow = true; arena.add(body);
    sphere(arena, .11, [x, y + h * .88, z], material(['#a87457','#c18c69','#80523f','#d2a27d'][Math.floor(rand()*4)]), [1, 1, .85]);
  }
}
// Audience silhouettes in the far background
for(let i=0;i<36;i++){
  const x=-9+i*.52, h=1.4+rand()*1.1;
  const silhouette=new THREE.Mesh(new THREE.CapsuleGeometry(.17,h,3,7),crowdMats[Math.floor(rand()*crowdMats.length)]);
  silhouette.position.set(x,1.1+h*.42,-8.5);scene.add(silhouette);
  sphere(scene,.15,[x,1.2+h*.88,-8.5],mat.skin2,[1,1,.8]);
}
// Overhead lighting truss and visible hot spots
for (const x of [-7, 7]) {
  const truss = box(scene, [.13, .13, 12], [x, 8, 0], mat.steel); truss.rotation.y = Math.PI / 2;
  for (let i=0;i<4;i++) {
    const light = new THREE.SpotLight('#fff2d6', 45, 16, .6, .7, 1.5);
    light.position.set(x + (x < 0 ? 1 : -1), 7.6, -4.5 + i*3);
    light.target.position.set(0, 0, 0); scene.add(light,light.target);
    const glow = sphere(scene,.12,[light.position.x,light.position.y-.2,light.position.z],material('#f5e8ca',.25,0),[1,.4,1]);
  }
}

function makeBoxer({ name, red = false, skin, style = 'technical' }) {
  const root = new THREE.Group(); scene.add(root);
  const torsoMat = red ? mat.opponent : mat.player, trim = red ? mat.opponentTrim : mat.playerTrim, glove = red ? mat.gloveRed : mat.gloveBlue;
  const person = new THREE.Group(); root.add(person);
  // Body mass and boxing kit
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.38, .77, 8, 16), skin); torso.position.y = 1.52; torso.scale.set(1.05, 1.06, .82); torso.castShadow = true; person.add(torso);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(.39, 20, 14), skin); chest.position.set(0, 1.88, .04); chest.scale.set(1.17, .61, .83); chest.castShadow = true; person.add(chest);
  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(.34, .39, .48, 16), torsoMat); shorts.position.y = .87; shorts.castShadow = true; person.add(shorts);
  const waistband = new THREE.Mesh(new THREE.CylinderGeometry(.355, .355, .075, 18), trim); waistband.position.y = 1.12; person.add(waistband);
  const shortStripe = box(person,[.025,.35,.012],[.29,.87,.345],trim); shortStripe.rotation.z=-.12;
  // Shorts side panel
  const patch = box(person,[.16,.22,.025],[.18,.88,.34],trim); patch.rotation.z=-.12;
  // Neck and head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.13,.17,.28,14),skin); neck.position.y=2.13; person.add(neck);
  const head = sphere(person,.285,[0,2.48,.02],skin,[.85,1.04,.84]);
  const ears = [-1,1].map(s=>sphere(person,.075,[s*.26,2.49,.02],skin,[.55,.8,.55]));
  // Face details oriented toward +z/front camera
  sphere(person,.075,[-.11,2.53,.247],mat.white,[.9,.55,.42]); sphere(person,.075,[.11,2.53,.247],mat.white,[.9,.55,.42]);
  sphere(person,.032,[-.11,2.53,.279],mat.black,[.9,1,.4]); sphere(person,.032,[.11,2.53,.279],mat.black,[.9,1,.4]);
  const brow1 = box(person,[.18,.035,.04],[-.11,2.62,.27],mat.hair); brow1.rotation.z=.1;
  const brow2 = box(person,[.18,.035,.04],[.11,2.62,.27],mat.hair); brow2.rotation.z=-.1;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.055,.19,8),skin); nose.position.set(0,2.43,.31); nose.rotation.x=-.25; person.add(nose);
  const mouth = box(person,[.11,.025,.02],[0,2.34,.274],mat.skinShade);
  // Close cropped hair cap
  const hair = sphere(person,.28,[0,2.67,-.015],mat.hair,[.91,.54,.88]);
  const hairline = box(person,[.31,.04,.05],[0,2.62,.24],mat.hair);
  // Arms and articulated joint helpers (computed from pose each frame)
  const arms = [];
  for (let side of [-1,1]) {
    const shoulder=sphere(person,.205,[side*.39,1.99,0],skin,[1,.95,.9]);
    const bicep=cylinderBetween(person,[side*.42,1.9,0],[side*.48,1.52,0],.125,skin,12);
    const forearm=cylinderBetween(person,[side*.48,1.52,0],[side*.43,1.18,.1],.095,skin,12);
    const elbow=sphere(person,.1,[side*.48,1.52,0],skin);
    const wrist=sphere(person,.095,[side*.43,1.18,.1],mat.wrap,[1,.8,.8]);
    const gloveMesh=sphere(person,.17,[side*.43,1.08,.14],glove,[1.03,.82,1.18]);
    const thumb=sphere(person,.065,[side*.31,1.08,.24],glove,[.7,.8,1]);
    const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.1,.11,.15,12),mat.wrap); person.add(cuff);
    arms.push({side,shoulder,bicep,forearm,elbow,wrist,glove:gloveMesh,thumb,cuff});
  }
  const legs=[];
  for(let side of [-1,1]){
    const thigh=cylinderBetween(person,[side*.17,.83,0],[side*.2,.45,0],.16,skin,12);
    const knee=sphere(person,.12,[side*.2,.44,0],skin);
    const calf=cylinderBetween(person,[side*.2,.43,0],[side*.2,.13,.02],.115,skin,12);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(.24,.13,.42),mat.shoe);shoe.position.set(side*.2,.1,.08);shoe.castShadow=true;person.add(shoe);
    const sole=box(person,[.25,.04,.42],[side*.2,.045,.08],trim);legs.push({side,thigh,knee,calf,shoe,sole});
  }
  // Shorts seams and glove logo tabs.
  const chestBadge=box(person,[.17,.085,.025],[0,1.62,.321],trim); chestBadge.rotation.z=.03;
  const logo=box(person,[.06,.025,.02],[0,1.62,.34],mat.white);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,32),new THREE.MeshBasicMaterial({color:'#090a09',transparent:true,opacity:.31}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.29;shadow.scale.set(1.12,.72,1);root.add(shadow);
  return {root,person,torso,chest,head,arms,legs,style,red,health:100,stamina:100,guard:false,lean:0,walk:0,attack:null,hitFlash:0,stun:0,skin};
}
const player = makeBoxer({name:'Malik Reed',skin:mat.skin,style:'technical'});
const opponent = makeBoxer({name:'Dante Vale',red:true,skin:mat.skin2,style:'pressure'});
player.root.position.set(-1.05,0,.72); player.root.rotation.y=2.15;
opponent.root.position.set(1.05,0,-.72); opponent.root.rotation.y=-.99;
player.person.rotation.y=.09; opponent.person.rotation.y=-.09;

const ui = Object.fromEntries(['playerHealth','playerHealthText','playerStamina','playerStaminaText','opponentHealth','opponentHealthText','opponentStamina','opponentStaminaText','roundNumber','footRound','timer','roundStatus','fightNote','coachTip','tipText','damageFlash','scorecard','resultTitle','resultBody','cornerTools','continueButton','restartButton','pauseButton','soundToggle','enterRing','modalBackdrop','targetButton','targetLabel','guardButton','dodgeButton','helpButton','toast'].map(id=>[id,$(id)]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const clock=new THREE.Clock();
const held=new Set();
const state={mode:'intro',round:1,time:180,elapsed:0,target:'HEAD',guard:false,slip:0,roundHits:0,playerScore:0,opponentScore:0,toastTimer:0,aiThink:1.2,sound:false,cornerUsed:false};
const punchData={jab:{cost:7,damage:5,stun:.16,side:-1,reach:1.34,duration:.48},cross:{cost:12,damage:9,stun:.25,side:1,reach:1.52,duration:.68},hook:{cost:14,damage:10,stun:.3,side:-1,reach:1.24,duration:.72},uppercut:{cost:17,damage:12,stun:.38,side:1,reach:1.05,duration:.78}};
const v3=(x,y,z)=>new THREE.Vector3(x,y,z);
function toast(message){ui.toast.textContent=message;ui.toast.classList.add('show');state.toastTimer=2.3;}
function flash(){ui.damageFlash.classList.remove('hit');void ui.damageFlash.offsetWidth;ui.damageFlash.classList.add('hit');}
function facing(boxer,target){const forward=v3(Math.sin(boxer.root.rotation.y),0,Math.cos(boxer.root.rotation.y));const direction=target.root.position.clone().sub(boxer.root.position).setY(0).normalize();return forward.dot(direction);}
function startPunch(boxer,type){
  if(state.mode!=='active'||boxer.attack||boxer.stun>0)return;
  const data=punchData[type];if(boxer.stamina<data.cost){if(boxer===player)toast('TOO TIRED — RESET YOUR FEET');return;}
  boxer.stamina-=data.cost;boxer.attack={type,elapsed:0,connected:false};
  if(boxer===player){ui.tipText.innerHTML=`${type.toUpperCase()} — ${state.target==='HEAD'?'HEAD HUNTING':'BODY WORK'}`;}
}
function landPunch(attacker,defender){
  const attack=attacker.attack;if(!attack||attack.connected)return;
  const data=punchData[attack.type];const gap=attacker.root.position.distanceTo(defender.root.position);
  const toTarget=facing(attacker,defender);const targetFactor=state.target==='BODY'&&attacker===player ? .82 : 1;
  attack.connected=true;
  if(gap>data.reach+targetFactor||toTarget<.28)return;
  const blocked=defender.guard&&facing(defender,attacker)>.1;
  const clean=attacker===player?(!defender.guard):(!defender.guard||Math.random()>.7);
  let damage=data.damage*(blocked?.18:clean?1:.58);
  if(defender.stun>0)damage*=1.14;
  defender.health=Math.max(0,defender.health-damage);defender.stun=Math.max(defender.stun,data.stun*(blocked?.4:1));
  defender.hitFlash=.18;defender.root.position.add(attacker.root.position.clone().sub(defender.root.position).setY(0).normalize().multiplyScalar(blocked?.025:.12));
  if(attacker===player){state.roundHits+=blocked?0:1;toast(blocked?'GUARD — FIND ANOTHER OPENING':clean?'CLEAN SHOT':'PARTIALLY BLOCKED');if(!blocked)flash();}
  else if(!blocked){flash();toast('YOU WERE CAUGHT — RESET YOUR GUARD');}
  if(defender.health<=0)finishFight(attacker===player?'KNOCKOUT — MALIK REED':'KNOCKOUT — DANTE VALE',attacker===player);
}
function setGuard(on){state.guard=on;player.guard=on;ui.guardButton.classList.toggle('active',on);}
function moveInput(){const left=held.has('left'),right=held.has('right'),forward=held.has('forward'),back=held.has('back');return v3((right?1:0)-(left?1:0),0,(back?1:0)-(forward?1:0));}
function bindHold(button,down,up){button.addEventListener('pointerdown',e=>{e.preventDefault();down();});for(const name of ['pointerup','pointercancel','pointerleave'])button.addEventListener(name,up);}

for(const button of document.querySelectorAll('[data-move]'))bindHold(button,()=>held.add(button.dataset.move),()=>held.delete(button.dataset.move));
for(const button of document.querySelectorAll('[data-punch]'))button.addEventListener('click',()=>startPunch(player,button.dataset.punch));
bindHold(ui.guardButton,()=>setGuard(true),()=>setGuard(false));
bindHold($('dodgeButton'),()=>{state.slip=.48;player.root.position.x+=Math.sin(player.root.rotation.y)*.13;},()=>{});
ui.targetButton.addEventListener('click',()=>{state.target=state.target==='HEAD'?'BODY':'HEAD';ui.targetLabel.textContent=state.target;toast(`TARGET SET: ${state.target}`);});
ui.enterRing.addEventListener('click',()=>{ui.modalBackdrop.classList.add('hidden');state.mode='active';toast('BELL! TOUCH GLOVES? NO—FIGHT!');});
ui.pauseButton.addEventListener('click',togglePause);
ui.soundToggle.addEventListener('click',()=>{state.sound=!state.sound;ui.soundToggle.classList.toggle('active',state.sound);toast(state.sound?'RING AUDIO ENABLED':'RING AUDIO MUTED');});
ui.helpButton.addEventListener('click',()=>toast('WASD / ARROWS MOVE · J K L I PUNCH · G GUARD · SPACE SLIP · T TARGET'));
ui.restartButton.addEventListener('click',restartBout);
ui.continueButton.addEventListener('click',continueBout);
window.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
  if(key==='escape'||key==='p'){togglePause();return;}if(state.mode==='intro'){if(key==='enter')ui.enterRing.click();return;}
  const move={w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',arrowleft:'left',d:'right',arrowright:'right'}[key];if(move){held.add(move);return;}
  if(key==='g')setGuard(true);if(key===' '){state.slip=.48;}if(key==='t')ui.targetButton.click();
  const punch={j:'jab',k:'cross',l:'hook',i:'uppercut'}[key];if(punch)startPunch(player,punch);
});
window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(key==='g')setGuard(false);const move={w:'forward',arrowup:'forward',s:'back',arrowdown:'back',a:'left',arrowleft:'left',d:'right',arrowright:'right'}[key];if(move)held.delete(move);});
function togglePause(){if(state.mode==='active'){state.mode='paused';ui.resultTitle.textContent='BOUT PAUSED';ui.resultBody.textContent='Take a moment. The ring will wait.';ui.cornerTools.classList.remove('visible');ui.continueButton.innerHTML='RESUME <span>→</span>';ui.scorecard.classList.add('visible');}else if(state.mode==='paused'){state.mode='active';ui.scorecard.classList.remove('visible');ui.continueButton.innerHTML='CONTINUE <span>→</span>';}}
function restartBout(){for(const boxer of [player,opponent]){boxer.health=100;boxer.stamina=100;boxer.attack=null;boxer.stun=0;boxer.root.position.set(boxer===player?-1.05:1.05,0,boxer===player ? .72 : -.72);}state.round=1;state.time=180;state.playerScore=0;state.opponentScore=0;state.mode='active';state.roundHits=0;state.cornerUsed=false;ui.scorecard.classList.remove('visible');updateHud();toast('FRESH BOUT — BOX SMART');}
function poseArms(boxer,time){
  for(const arm of boxer.arms){
    const {side}=arm;let shoulder=v3(side*.39,1.99,0),elbow=v3(side*.46,1.68,.17),glove=v3(side*.43,1.48,.39);
    if(boxer.guard){elbow.set(side*.39,1.72,.24);glove.set(side*.39,1.56,.43);}
    if(boxer.attack){const {type,elapsed}=boxer.attack,data=punchData[type],phase=elapsed/data.duration;const power=phase<.34?phase/.34:phase>.76?(1-phase)/.24:1;
      if(side===data.side){const cross=type==='cross'||type==='uppercut';elbow.set(side*.48,1.78,.26+power*.18);glove.set((type==='hook'?side*.63:side*.31)+ (type==='cross'?.05:0),type==='uppercut'?1.85+power*.38:1.54+power*.03,.42+power*(type==='jab'?.82:type==='cross'?.98:.55));}
    }
    const bob=Math.sin(time*7+side)*.018;if(!boxer.attack&&!boxer.guard){glove.y+=bob;elbow.y+=bob;}
    setBetween(arm.bicep,[shoulder.x,shoulder.y,shoulder.z],[elbow.x,elbow.y,elbow.z]);setBetween(arm.forearm,[elbow.x,elbow.y,elbow.z],[glove.x,glove.y,glove.z]);
    arm.elbow.position.copy(elbow);arm.wrist.position.set(glove.x,glove.y-.08,glove.z-.02);arm.glove.position.copy(glove);arm.thumb.position.set(glove.x-side*.11,glove.y-.035,glove.z+.09);arm.cuff.position.set(glove.x,glove.y-.13,glove.z-.02);
  }
}
function updateHud(){
  for(const [boxer,prefix] of [[player,'player'],[opponent,'opponent']]){const hp=Math.round(boxer.health),st=Math.round(boxer.stamina);$(prefix+'Health').style.width=`${hp}%`;$(prefix+'HealthText').textContent=`${hp}%`;$(prefix+'Stamina').style.width=`${st}%`;$(prefix+'StaminaText').textContent=`${st}%`;}
  ui.roundNumber.textContent=String(state.round).padStart(2,'0');$('footRound').textContent=String(state.round).padStart(2,'0');
  ui.timer.textContent=`${Math.floor(state.time/60)}:${String(Math.ceil(state.time%60)).padStart(2,'0')}`;
}
function endRound(){
  if(state.mode!=='active')return;state.mode=state.round>=10?'finished':'intermission';state.playerScore+=player.health>opponent.health?10:9;state.opponentScore+=opponent.health>player.health?10:9;
  ui.resultTitle.textContent=state.mode==='finished'?'FINAL SCORECARDS':`ROUND ${String(state.round).padStart(2,'0')} COMPLETE`;
  ui.resultBody.textContent=state.mode==='finished'?`Malik ${state.playerScore} — Dante ${state.opponentScore} · ${state.playerScore>=state.opponentScore?'Malik Reed wins on points':'Dante Vale wins on points'}`:`Your corner: ${state.playerScore} · Vale’s corner: ${state.opponentScore}. Choose one treatment.`;
  ui.cornerTools.innerHTML='';ui.cornerTools.classList.toggle('visible',state.mode==='intermission');ui.continueButton.innerHTML=state.mode==='finished'?'FIGHT AGAIN <span>→</span>':'BACK TO THE FIGHT <span>→</span>';
  if(state.mode==='intermission'){
    const treatments=[['ICE','Restore 18% condition','health',18],['WATER','Restore 28% gas','stamina',28],['CUT CARE','Reduce damage taken','recovery',0]];
    for(const [label,desc,type,value] of treatments){const button=document.createElement('button');button.className='corner-tool';button.innerHTML=`<b>${label}</b><small>${desc}</small>`;button.addEventListener('click',()=>{if(state.cornerUsed)return;state.cornerUsed=true;if(type==='health')player.health=Math.min(100,player.health+value);if(type==='stamina')player.stamina=Math.min(100,player.stamina+value);if(type==='recovery')player.health=Math.min(100,player.health+8);button.classList.add('used');for(const other of ui.cornerTools.querySelectorAll('button'))other.disabled=true;ui.resultBody.textContent=`${label} applied. Your corner has you ready for the next round.`;updateHud();});ui.cornerTools.appendChild(button);}
  }
  ui.scorecard.classList.add('visible');
}
function continueBout(){
  if(state.mode==='paused'){togglePause();return;}if(state.mode==='finished'){restartBout();return;}if(state.mode!=='intermission')return;
  state.round++;state.time=180;state.roundHits=0;state.cornerUsed=false;state.mode='active';state.player.stamina=Math.min(100,state.player.stamina+18);state.opponent.stamina=Math.min(100,state.opponent.stamina+18);player.root.position.set(-1.05,0,.72);opponent.root.position.set(1.05,0,-.72);player.attack=opponent.attack=null;ui.scorecard.classList.remove('visible');ui.roundStatus.textContent='ROUND IN PROGRESS';updateHud();toast(`ROUND ${String(state.round).padStart(2,'0')} — BOX!`);
}
function finishFight(title,playerWon){state.mode='finished';ui.resultTitle.textContent=title;ui.resultBody.textContent=playerWon?'A decisive finish for Malik Reed.':'Dante Vale gets the stoppage. Run it back?';ui.cornerTools.classList.remove('visible');ui.continueButton.innerHTML='FIGHT AGAIN <span>→</span>';ui.scorecard.classList.add('visible');}
function updateBoxer(boxer,dt,time){
  if(boxer.hitFlash>0){boxer.hitFlash-=dt;boxer.person.rotation.z=Math.sin(time*40)*.07;}
  else boxer.person.rotation.z=lerp(boxer.person.rotation.z,0,Math.min(1,dt*8));
  boxer.stun=Math.max(0,boxer.stun-dt);boxer.stamina=Math.min(100,boxer.stamina+dt*(boxer.attack?2.5:boxer.guard?3.5:7));
  if(boxer.attack){const attack=boxer.attack;attack.elapsed+=dt;if(attack.elapsed>=attack.duration*.43&&!attack.connected)landPunch(boxer,boxer===player?opponent:player);if(attack.elapsed>=attack.duration)boxer.attack=null;}
  poseArms(boxer,time);boxer.person.position.y=Math.sin(time*8+(boxer.red?1:0))*.018;
}
function updateAI(dt){
  state.aiThink-=dt;const delta=player.root.position.clone().sub(opponent.root.position).setY(0);const gap=delta.length();const forward=delta.clone().normalize();const desiredAngle=Math.atan2(forward.x,forward.z);let turn=THREE.MathUtils.euclideanModulo(desiredAngle-opponent.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;opponent.root.rotation.y+=clamp(turn,-dt*3,dt*3);
  opponent.guard=opponent.stun>0||state.aiThink<.22;let move=gap>1.55?forward:gap<1.12?forward.clone().negate():v3(0,0,0);
  if(state.aiThink<=0&&opponent.stun<=0){state.aiThink=.65+Math.random()*1.05;if(gap<2.5){opponent.guard=Math.random()<.23;const roll=Math.random();startPunch(opponent,roll<.5?'jab':roll<.78?'cross':roll<.94?'hook':'uppercut');}else opponent.guard=false;}
  if(move.lengthSq()){opponent.root.position.addScaledVector(move,dt*(opponent.attack?.12:.72));opponent.walk+=dt*7;}
}
function updatePlayer(dt){
  const input=moveInput();if(input.lengthSq()){input.normalize();const angle=player.root.rotation.y;const forward=v3(Math.sin(angle),0,Math.cos(angle));const right=v3(Math.cos(angle),0,-Math.sin(angle));const motion=right.multiplyScalar(input.x).addScaledVector(forward,-input.z);player.root.position.addScaledVector(motion,dt*(player.guard?1.35:2.05));player.walk+=dt*9;}
  const delta=opponent.root.position.clone().sub(player.root.position).setY(0);const angle=Math.atan2(delta.x,delta.z);let turn=THREE.MathUtils.euclideanModulo(angle-player.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;player.root.rotation.y+=clamp(turn,-dt*4,dt*4);
  if(state.slip>0){state.slip=Math.max(0,state.slip-dt);player.person.rotation.z=Math.sin(state.slip/0.48*Math.PI)*.28;}
}
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)ui.toast.classList.remove('show');}
  if(state.mode==='active'){
    state.time-=dt*3;if(state.time<=0){state.time=0;endRound();}
    updatePlayer(dt);updateAI(dt);for(const boxer of [player,opponent]){updateBoxer(boxer,dt,time);boxer.root.position.x=clamp(boxer.root.position.x,-3.45,3.45);boxer.root.position.z=clamp(boxer.root.position.z,-2.75,2.75);}
    const gap=player.root.position.distanceTo(opponent.root.position);if(gap<.82){const push=opponent.root.position.clone().sub(player.root.position).setY(0).normalize();player.root.position.addScaledVector(push,-.018);opponent.root.position.addScaledVector(push,.018);}
    ui.roundStatus.textContent=state.guard?'GUARD UP':state.target==='BODY'?'BODY TARGET':'ROUND IN PROGRESS';updateHud();
  }else{for(const boxer of [player,opponent]){boxer.stamina=Math.min(100,boxer.stamina+dt*5);poseArms(boxer,time);}updateHud();}
  renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));});
updateHud();tick();

