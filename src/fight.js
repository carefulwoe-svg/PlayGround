// A self-contained boxing simulation. Positions use world-space x/z coordinates;
// angle is measured from +z, so (sin(angle), cos(angle)) is the forward vector.
export function createFight(options = {}) {
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const roundLength = Number.isFinite(options.roundLength) && options.roundLength > 0 ? options.roundLength : 180;
  const ring = Number.isFinite(options.ringSize) && options.ringSize > 1 ? options.ringSize : 5;
  const punches = {
    jab:      { duration: 0.43, active: [0.27, 0.52], range: 2.18, damage: 6,  cost: 5,  hand: 'left' },
    cross:    { duration: 0.58, active: [0.32, 0.56], range: 2.14, damage: 10, cost: 9,  hand: 'right' },
    hook:     { duration: 0.64, active: [0.36, 0.58], range: 1.76, damage: 12, cost: 11, hand: 'left' },
    uppercut: { duration: 0.62, active: [0.34, 0.57], range: 1.65, damage: 13, cost: 12, hand: 'right' },
    body:     { duration: 0.57, active: [0.32, 0.57], range: 1.83, damage: 8,  cost: 8,  hand: 'left' },
    overhand: { duration: 0.78, active: [0.42, 0.62], range: 1.98, damage: 16, cost: 15, hand: 'right' }
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = value => Number.isFinite(value) ? value : 0;
  const modeFor = mode => mode === 'spar' ? 'spar' : 'fight';
  const fighter = (name, color, x, z) => ({
    name, color, x, z, angle: 0, health: 100, stamina: 100,
    blocking: false, slip: 0, punch: null, hitFlash: 0, down: false
  });
  const state = {
    fighters: [], time: 0, round: 1, roundTime: roundLength,
    phase: 'fighting', message: '', winner: null,
    playerStats: { landed: 0, thrown: 0 }, opponentStats: { landed: 0, thrown: 0 },
    mode: modeFor(options.mode), count: 0, event: null
  };

  // Simulation-only bookkeeping stays separate from the render-facing state.
  let runtime, ai, countTimer, countTarget, countRecovery, messageTimer, roundDamage, score;
  function reset() {
    state.fighters = [fighter('Player', 'red', 0, -1.15), fighter('Opponent', 'blue', 0, 1.15)];
    state.fighters[1].angle = Math.PI;
    state.time = 0;
    state.round = 1;
    state.roundTime = roundLength;
    state.phase = 'fighting';
    state.message = 'Round 1';
    state.winner = null;
    state.playerStats = { landed: 0, thrown: 0 };
    state.opponentStats = { landed: 0, thrown: 0 };
    state.count = 0;
    state.event = null;
    runtime = [0, 1].map(() => ({ elapsed: 0, connected: false, knockdowns: 0, stun: 0 }));
    ai = { decision: 0, x: 0, z: 0, block: false, slip: 0, attack: null };
    countTimer = 0;
    countTarget = -1;
    countRecovery = 0;
    messageTimer = 2;
    roundDamage = [0, 0];
    score = [0, 0];
  }
  function announce(message, duration = 1.4) {
    state.message = message;
    messageTimer = duration;
  }
  function face() {
    const [a, b] = state.fighters;
    const dx = b.x - a.x, dz = b.z - a.z;
    if (dx * dx + dz * dz > 0.0001) {
      a.angle = Math.atan2(dx, dz);
      b.angle = Math.atan2(-dx, -dz);
    }
  }
  function beginPunch(index, type) {
    const spec = punches[type];
    const f = state.fighters[index];
    if (!spec || state.phase !== 'fighting' || f.down || f.punch || f.blocking || runtime[index].stun > 0 || f.stamina < spec.cost) return false;
    f.stamina = clamp(f.stamina - spec.cost, 0, 100);
    f.punch = { type, progress: 0, hand: spec.hand };
    runtime[index].elapsed = 0;
    runtime[index].connected = false;
    (index === 0 ? state.playerStats : state.opponentStats).thrown++;
    return true;
  }
  function finish(winner, reason) {
    state.phase = 'finished';
    state.winner = winner;
    state.fighters.forEach(f => { f.punch = null; f.blocking = false; f.slip = 0; });
    state.message = winner === 'draw' ? `Draw — ${reason}` : `${winner === 'player' ? 'Player' : 'Opponent'} wins — ${reason}`;
    state.event = { type: 'finish', winner, reason };
    messageTimer = 0;
  }
  function knockdown(index, overkill) {
    const f = state.fighters[index];
    f.down = true;
    state.fighters.forEach(boxer => { boxer.punch = null; });
    f.blocking = false;
    f.slip = 0;
    runtime[index].knockdowns++;
    state.phase = 'count';
    countTarget = index;
    countTimer = 0;
    // A particularly decisive finishing shot can keep a fighter down for ten.
    countRecovery = state.mode === 'fight' && overkill >= 8 ? Infinity : Math.min(9, 4 + runtime[index].knockdowns * 2);
    state.count = 0;
    state.event = { type: 'knockdown', fighter: index === 0 ? 'player' : 'opponent' };
    announce(`${f.name} is down!`, 0);
    if (state.mode === 'fight' && runtime[index].knockdowns >= 3) finish(index === 0 ? 'opponent' : 'player', 'TKO');
  }
  function attemptHit(index) {
    const attacker = state.fighters[index], target = state.fighters[1 - index];
    const spec = punches[attacker.punch.type];
    const dx = target.x - attacker.x, dz = target.z - attacker.z;
    const distance = Math.hypot(dx, dz);
    if (distance > spec.range || target.down) return;
    // A slip evades head shots from outside the pocket, but not body shots.
    runtime[index].connected = true;
    if (attacker.punch.type !== 'body' && Math.abs(target.slip) > 0.45 && distance > 1.15) {
      state.event = { type: 'miss', attacker: index === 0 ? 'player' : 'opponent', punch: attacker.punch.type };
      return;
    }
    const counter = !!target.punch && target.punch.progress < 0.65;
    const blocked = target.blocking && target.stamina > 2;
    const power = 0.65 + 0.35 * (attacker.stamina / 100);
    let damage = spec.damage * power * (counter ? 1.35 : 1);
    if (blocked) {
      damage *= attacker.punch.type === 'body' ? 0.42 : 0.24;
      target.stamina = clamp(target.stamina - spec.damage * 0.55, 0, 100);
    }
    const overkill = damage - target.health;
    target.health = clamp(target.health - damage, 0, 100);
    if (attacker.punch.type === 'body') target.stamina = clamp(target.stamina - damage * 0.7, 0, 100);
    target.hitFlash = blocked ? 0.12 : 0.3;
    if (!blocked) runtime[1 - index].stun = Math.max(runtime[1 - index].stun, counter ? 0.18 : 0.08);
    roundDamage[index] += damage;
    (index === 0 ? state.playerStats : state.opponentStats).landed++;
    state.event = { type: 'hit', attacker: index === 0 ? 'player' : 'opponent', punch: attacker.punch.type, damage, blocked, counter };
    if (target.health <= 0) knockdown(1 - index, overkill);
  }
  function updatePunch(index, dt) {
    const f = state.fighters[index];
    if (!f.punch) return;
    const data = runtime[index], spec = punches[f.punch.type];
    const oldProgress = f.punch.progress;
    data.elapsed += dt;
    f.punch.progress = clamp(data.elapsed / spec.duration, 0, 1);
    // Test throughout the active window, including if a time step crosses it.
    if (!data.connected && oldProgress <= spec.active[1] && f.punch.progress >= spec.active[0]) attemptHit(index);
    if (f.punch && f.punch.progress >= 1) f.punch = null;
  }
  function chooseAI(dt) {
    ai.decision -= dt;
    if (ai.decision > 0) return;
    ai.decision = 0.18 + random() * 0.25;
    const [player, opponent] = state.fighters;
    const dx = player.x - opponent.x, dz = player.z - opponent.z;
    const distance = Math.max(0.001, Math.hypot(dx, dz));
    const forward = distance > 1.75 ? 1 : distance < 1.15 ? -0.65 : 0;
    const side = (random() - 0.5) * 0.9;
    ai.x = dx / distance * forward - dz / distance * side;
    ai.z = dz / distance * forward + dx / distance * side;
    ai.block = !!player.punch && random() < 0.48 && opponent.stamina > 10;
    ai.slip = !ai.block && player.punch && random() < 0.22 ? (random() < 0.5 ? -1 : 1) : 0;
    ai.attack = null;
    if (distance < 2.15 && !ai.block && random() < 0.44) {
      const choices = ['jab', 'jab', 'cross', 'hook', 'body', 'uppercut', 'overhand'];
      ai.attack = choices[Math.floor(random() * choices.length) % choices.length];
    }
  }
  function move(f, x, z, dt, clinch) {
    const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    const speed = 2.25 * (f.blocking ? 0.65 : 1) * (f.punch ? 0.6 : 1) * (clinch ? 0.65 : 1) * (f.stamina < 10 ? 0.7 : 1);
    f.x = clamp(f.x + x * speed * dt, -ring, ring);
    f.z = clamp(f.z + z * speed * dt, -ring, ring);
  }
  function separate() {
    const [a, b] = state.fighters;
    let dx = b.x - a.x, dz = b.z - a.z;
    let d = Math.hypot(dx, dz);
    if (d >= 0.85) return;
    if (d < 0.001) { dx = 0; dz = 0.001; d = 0.001; }
    const push = (0.85 - d) / 2;
    a.x = clamp(a.x - dx / d * push, -ring, ring);
    a.z = clamp(a.z - dz / d * push, -ring, ring);
    b.x = clamp(b.x + dx / d * push, -ring, ring);
    b.z = clamp(b.z + dz / d * push, -ring, ring);
  }
  function endRound() {
    if (roundDamage[0] > roundDamage[1] + 1) { score[0] += 10; score[1] += 9; }
    else if (roundDamage[1] > roundDamage[0] + 1) { score[1] += 10; score[0] += 9; }
    else { score[0] += 10; score[1] += 10; }
    if (state.round >= 3 && state.mode === 'fight') {
      finish(score[0] === score[1] ? 'draw' : score[0] > score[1] ? 'player' : 'opponent', 'decision');
      return;
    }
    state.round++;
    state.roundTime = roundLength;
    roundDamage = [0, 0];
    state.fighters.forEach(f => { f.stamina = clamp(f.stamina + 25, 0, 100); f.punch = null; });
    state.event = { type: 'round', round: state.round };
    announce(`Round ${state.round}`, 2);
  }
  function step(dt, input) {
    state.time += dt;
    state.fighters.forEach((f, i) => {
      f.hitFlash = Math.max(0, f.hitFlash - dt);
      runtime[i].stun = Math.max(0, runtime[i].stun - dt);
    });
    if (state.phase === 'finished') return;
    if (state.phase === 'count') {
      countTimer += dt;
      state.count = Math.min(10, Math.floor(countTimer));
      const target = state.fighters[countTarget];
      // Each successive knockdown takes longer to recover; a hard KO stays down.
      state.message = `${target.name} down — ${state.count}`;
      if (countTimer >= 10) {
        finish(countTarget === 0 ? 'opponent' : 'player', 'KO');
      } else if (countTimer >= countRecovery) {
        target.down = false;
        target.health = state.mode === 'spar' ? 65 : Math.max(25, 42 - runtime[countTarget].knockdowns * 7);
        target.stamina = Math.max(target.stamina, 35);
        state.phase = 'fighting';
        state.count = 0;
        state.event = { type: 'rise', fighter: countTarget === 0 ? 'player' : 'opponent' };
        countTarget = -1;
        announce('Box!', 1);
      }
      return;
    }
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) state.message = '';
    }
    state.roundTime = Math.max(0, state.roundTime - dt);
    if (state.roundTime <= 0) { endRound(); return; }
    chooseAI(dt);
    const [player, opponent] = state.fighters;
    player.blocking = !!input.block && !player.punch && player.stamina > 0;
    player.slip = player.blocking ? 0 : clamp(typeof input.slip === 'boolean' ? (input.slip ? 1 : 0) : finite(input.slip), -1, 1);
    opponent.blocking = ai.block && !opponent.punch && opponent.stamina > 0;
    opponent.slip = opponent.blocking ? 0 : ai.slip;
    move(player, clamp(finite(input.x), -1, 1), clamp(finite(input.z), -1, 1), dt, !!input.clinch);
    move(opponent, ai.x, ai.z, dt, false);
    separate();
    face();
    if (ai.attack && !opponent.blocking) { beginPunch(1, ai.attack); ai.attack = null; }
    // Clinching at close range limits both boxers' ability to land cleanly.
    const clinched = !!input.clinch && Math.hypot(player.x - opponent.x, player.z - opponent.z) < 1.2;
    if (!clinched) {
      updatePunch(0, dt);
      if (state.phase === 'fighting') updatePunch(1, dt);
    } else {
      // Existing punches still recover during a clinch, without landing.
      state.fighters.forEach((f, i) => { if (f.punch) { runtime[i].connected = true; updatePunch(i, dt); } });
    }
    state.fighters.forEach(f => {
      const regen = f.punch ? 2 : f.blocking ? 4 : 11;
      f.stamina = clamp(f.stamina + regen * dt, 0, 100);
    });
  }
  function update(dt, input = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    input = input || {};
    // Small steps keep active punch windows and ring collision stable on slow frames.
    let remaining = dt;
    while (remaining > 0) {
      const slice = Math.min(remaining, 1 / 60);
      step(slice, input);
      remaining -= slice;
    }
  }
  function restart() { reset(); }
  function setMode(mode) {
    if (mode !== 'fight' && mode !== 'spar') return;
    if (state.mode !== mode) { state.mode = mode; reset(); }
  }
  reset();
  return { state, update, punch: type => beginPunch(0, type), restart, setMode };
}
