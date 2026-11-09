import './style.css';
import { createScene } from './scene.js';
import { createFight } from './fight.js';

const $ = (id) => document.getElementById(id);
const scene = createScene($('gameCanvas'));
const fight = createFight();
const keys = new Set();
const touch = { x: 0, z: 0, block: false, clinch: false, slip: 0 };
let started = false, paused = false, helpOpen = false, soundOn = true, lastTime = 0;
let audioContext, previousHealth = [100, 100], lastImpact = 0;

// A tiny synthesized impact keeps the slice self-contained (and can be muted).
function impactSound() {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(115, now);
    oscillator.frequency.exponentialRampToValueAtTime(45, now + 0.1);
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now); oscillator.stop(now + 0.13);
  } catch (_) { /* Audio is optional. */ }
}
function punch(type) {
  if (!started || paused || helpOpen || fight.state.phase === 'finished') return;
  fight.punch(type);
}
function start() {
  fight.restart();
  previousHealth = [100, 100];
  started = true; paused = false;
  $('startOverlay').classList.add('hidden');
  $('resultOverlay').classList.add('hidden');
  $('pauseBtn').textContent = 'Ⅱ  PAUSE';
}
$('startBtn').addEventListener('click', start);
$('restartBtn').addEventListener('click', start);
$('pauseBtn').addEventListener('click', () => {
  if (!started || fight.state.phase === 'finished') return;
  paused = !paused;
  $('pauseBtn').textContent = paused ? '▶  RESUME' : 'Ⅱ  PAUSE';
});
$('soundBtn').addEventListener('click', () => {
  soundOn = !soundOn;
  $('soundBtn').textContent = soundOn ? '♪' : '×';
  $('soundBtn').setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound');
});
function showHelp(show) { helpOpen = show; $('helpModal').classList.toggle('hidden', !show); }
$('helpBtn').addEventListener('click', () => showHelp(true));
$('moreControls').addEventListener('click', () => showHelp(true));
$('closeHelp').addEventListener('click', () => showHelp(false));
$('modalDone').addEventListener('click', () => showHelp(false));
$('helpModal').addEventListener('click', (e) => { if (e.target === $('helpModal')) showHelp(false); });

const punchKeys = { j: 'jab', k: 'cross', l: 'hook', i: 'uppercut', u: 'body', o: 'overhand' };
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(key)) event.preventDefault();
  if (key === 'escape') { if (helpOpen) showHelp(false); else $('pauseBtn').click(); return; }
  if (!event.repeat && punchKeys[key]) punch(punchKeys[key]);
  keys.add(key);
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); touch.block = false; touch.clinch = false; touch.x = touch.z = 0; });

// Pointer events cover touch, pen and mouse without browser gesture interference.
const joystick = $('joystick');
const knob = joystick.querySelector('.joystick-knob');
let joystickPointer = null;
function moveStick(event) {
  const rect = joystick.getBoundingClientRect();
  let x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * .35);
  let z = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * .35);
  const length = Math.hypot(x, z);
  if (length > 1) { x /= length; z /= length; }
  touch.x = x; touch.z = z;
  knob.style.transform = `translate(${x * 25}px, ${z * 25}px)`;
}
joystick.addEventListener('pointerdown', (event) => { event.stopPropagation(); joystickPointer = event.pointerId; joystick.setPointerCapture(event.pointerId); moveStick(event); });
joystick.addEventListener('pointermove', (event) => { if (event.pointerId === joystickPointer) moveStick(event); });
function resetStick(event) { if (event.pointerId !== joystickPointer) return; joystickPointer = null; touch.x = touch.z = 0; knob.style.transform = ''; }
joystick.addEventListener('pointerup', resetStick); joystick.addEventListener('pointercancel', resetStick);
document.querySelectorAll('[data-hold]').forEach((button) => {
  const field = button.dataset.hold;
  button.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); touch[field] = true; button.setPointerCapture(e.pointerId); });
  const release = () => { touch[field] = false; };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
});
document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('pointerdown', (e) => {
  e.stopPropagation(); e.preventDefault();
  if (button.dataset.action === 'slip') touch.slip = .3; else punch(button.dataset.action);
}));
let gesture = null;
$('arena').addEventListener('pointerdown', (event) => {
  if (event.target !== $('gameCanvas') && event.target !== $('touchLayer')) return;
  gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
  $('arena').setPointerCapture(event.pointerId);
});
$('arena').addEventListener('pointerup', (event) => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  if (Math.hypot(dx, dy) < 22) punch('jab');
  else if (Math.abs(dx) > Math.abs(dy)) punch('hook');
  else punch(dy < 0 ? 'uppercut' : 'body');
  gesture = null;
});
$('arena').addEventListener('pointercancel', () => { gesture = null; });

function gamepadInput(input) {
  const gamepad = navigator.getGamepads?.()[0];
  if (!gamepad) return input;
  const deadzone = (n) => Math.abs(n || 0) > .18 ? n : 0;
  input.x += deadzone(gamepad.axes[0]); input.z += deadzone(gamepad.axes[1]);
  input.block ||= !!gamepad.buttons[4]?.pressed;
  input.slip ||= !!gamepad.buttons[5]?.pressed;
  input.clinch ||= !!gamepad.buttons[6]?.pressed;
  // Edge-trigger face buttons so one press throws one punch.
  const types = ['jab','cross','hook','uppercut'];
  gamepadInput.previous ||= [];
  types.forEach((type, i) => { const pressed = !!gamepad.buttons[i]?.pressed; if (pressed && !gamepadInput.previous[i]) punch(type); gamepadInput.previous[i] = pressed; });
  return input;
}
function updateHud(state) {
  const [player, opponent] = state.fighters;
  const setBar = (id, value) => { $(id).style.width = `${Math.max(0, Math.min(100, value || 0))}%`; };
  setBar('playerHealth', player.health); setBar('playerStamina', player.stamina);
  setBar('opponentHealth', opponent.health); setBar('opponentStamina', opponent.stamina);
  $('roundNumber').textContent = String(state.round || 1).padStart(2, '0');
  const seconds = Math.max(0, Math.ceil(state.roundTime ?? 90));
  $('clock').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('statusText').textContent = !started ? 'AWAITING FIRST BELL' : paused ? 'BOUT PAUSED' : state.phase === 'count' ? 'REFEREE COUNT' : state.phase === 'finished' ? 'THE FINAL BELL' : 'FIGHT IN PROGRESS';
  $('fightMessage').textContent = started && !paused ? (state.message || '') : (paused ? 'PAUSED' : '');
  [player, opponent].forEach((fighter, i) => {
    if (started && fighter.health < previousHealth[i] - .1 && performance.now() - lastImpact > 100) {
      impactSound(); lastImpact = performance.now();
      if (navigator.vibrate) navigator.vibrate(i === 0 ? 20 : 10);
    }
    previousHealth[i] = fighter.health;
  });
  if (started && state.phase === 'finished') {
    $('resultTitle').textContent = state.winner ? `${String(state.winner).toUpperCase()} WINS` : 'FIGHT OVER';
    $('resultDetail').textContent = `${state.message || 'The final bell.'}  ·  Punches landed: ${state.playerStats?.landed ?? 0} / ${state.playerStats?.thrown ?? 0}`;
    $('resultOverlay').classList.remove('hidden');
  }
}
function frame(timestamp) {
  const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, .05); lastTime = timestamp;
  if (started && !paused && !helpOpen && fight.state.phase !== 'finished') {
    touch.slip = Math.max(0, touch.slip - dt);
    const input = gamepadInput({
      x: touch.x + (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0),
      z: touch.z + (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0),
      block: touch.block || keys.has('shift'), slip: touch.slip > 0 || keys.has(' '), clinch: touch.clinch || keys.has('e')
    });
    fight.update(dt, input);
  }
  scene.update(fight.state, dt);
  updateHud(fight.state);
  requestAnimationFrame(frame);
}
window.addEventListener('resize', scene.resize);
requestAnimationFrame(frame);
