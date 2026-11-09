import * as THREE from 'three';

// Everything in the arena is procedural so the scene is ready as soon as the game starts.
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080c14);
  scene.fog = new THREE.Fog(0x080c14, 18, 38);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  camera.position.set(0, 8.6, -15.8);
  camera.lookAt(0, 0.65, 0);

  const mat = (color, roughness = 0.75, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const materials = {
    floor: mat(0x111722), ring: mat(0x9baeb1), apron: mat(0x101923),
    trim: mat(0xc0a476, 0.5, 0.55), dark: mat(0x111720), white: mat(0xd5dbd3),
    red: mat(0xd2443d, 0.48), blue: mat(0x367db2, 0.48),
    rope: mat(0xc9d2cd), black: mat(0x090d13),
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
  const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  const addBox = (parent, material, x, y, z, w, h, d, shadow = true) => {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const addBall = (parent, material, x, y, z, sx, sy, sz) => {
    const mesh = new THREE.Mesh(sphereGeo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const addCylinder = (parent, material, x, y, z, radius, height) => {
    const mesh = new THREE.Mesh(cylinderGeo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(radius, height, radius);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  function link(parent, material, radius) {
    const mesh = new THREE.Mesh(cylinderGeo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return (a, b, taper = 1) => {
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(b, a);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      mesh.scale.set(radius * taper, dir.length(), radius * taper);
    };
  }
  function labelTexture(text, subtext) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#283b40';
    ctx.font = '900 145px sans-serif';
    ctx.fillText(text, 512, 230);
    ctx.strokeStyle = '#536b6a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(270, 265); ctx.lineTo(754, 265); ctx.stroke();
    ctx.font = 'bold 42px sans-serif'; ctx.letterSpacing = '12px';
    ctx.fillText(subtext, 512, 325);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  scene.add(new THREE.HemisphereLight(0xb7d2ef, 0x18202b, 1.15));
  const key = new THREE.DirectionalLight(0xffe6c6, 2.2);
  key.position.set(-4, 10, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 25;
  key.shadow.bias = -0.0003;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7ab8ee, 1.3);
  rim.position.set(4, 6, -8); scene.add(rim);
  const spot = new THREE.SpotLight(0xf8e8d1, 85, 30, Math.PI / 3.4, 0.55, 1.3);
  spot.position.set(0, 12, 0); spot.target.position.set(0, 0, 0);
  scene.add(spot, spot.target);

  addBox(scene, materials.floor, 0, -0.85, 0, 70, 0.12, 70, false);
  // Raised canvas and a dark apron give the ring a strong silhouette.
  addBox(scene, materials.apron, 0, -0.4, 0, 10.65, 0.8, 10.65);
  addBox(scene, materials.trim, 0, -0.035, 0, 10.65, 0.07, 10.65);
  addBox(scene, materials.ring, 0, 0, 0, 10.35, 0.07, 10.35);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 2.55), new THREE.MeshBasicMaterial({ map: labelTexture('FIGHT NIGHT', 'CHAMPIONSHIP BOXING'), transparent: true, opacity: 0.7, depthWrite: false }));
  logo.rotation.x = -Math.PI / 2; logo.position.y = 0.041; scene.add(logo);
  // Canvas boundary lines.
  for (const s of [-1, 1]) {
    addBox(scene, materials.white, 0, 0.043, s * 4.65, 9.35, 0.012, 0.035, false);
    addBox(scene, materials.white, s * 4.65, 0.043, 0, 0.035, 0.012, 9.35, false);
  }
  // Rope strands run just inside the posts, with a different color on each side.
  const ropeMats = [materials.red, materials.white, materials.blue, materials.white];
  for (let i = 0; i < 4; i++) {
    const y = 0.59 + i * 0.34;
    for (const side of [-1, 1]) {
      addBox(scene, ropeMats[i], 0, y, side * 4.88, 9.76, 0.045, 0.045, false);
      addBox(scene, ropeMats[i], side * 4.88, y, 0, 0.045, 0.045, 9.76, false);
    }
  }
  for (const x of [-4.96, 4.96]) for (const z of [-4.96, 4.96]) {
    addCylinder(scene, materials.dark, x, 0.94, z, 0.12, 2.05);
    addBall(scene, materials.trim, x, 2.03, z, 0.15, 0.15, 0.15);
    const cornerMat = x * z < 0 ? materials.red : materials.blue;
    addBox(scene, cornerMat, x - Math.sign(x) * 0.12, 1.25, z - Math.sign(z) * 0.12, 0.3, 1.08, 0.3);
  }
  // Vertical rope ties.
  for (const side of [-1, 1]) for (const p of [-2.45, 0, 2.45]) {
    addBox(scene, materials.white, p, 1.1, side * 4.88, 0.055, 1.13, 0.06, false);
    addBox(scene, materials.white, side * 4.88, 1.1, p, 0.06, 1.13, 0.055, false);
  }

  // A low-lit crowd, instanced to keep the arena inexpensive to render.
  let seed = 937;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const crowdMat = mat(0x26303d);
  const headMat = mat(0x39404a);
  const crowdCount = 340;
  const bodies = new THREE.InstancedMesh(sphereGeo, crowdMat, crowdCount);
  const heads = new THREE.InstancedMesh(sphereGeo, headMat, crowdCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < crowdCount; i++) {
    const side = i % 4;
    const row = Math.floor(i / 4) % 4;
    const along = (random() - 0.5) * 25;
    const away = 7 + row * 1.35 + random() * 0.7;
    const x = side < 2 ? along : (side === 2 ? -away : away);
    const z = side < 2 ? (side === 0 ? -away : away) : along;
    const base = -0.75 + row * 0.3;
    const size = 0.8 + random() * 0.4;
    dummy.position.set(x, base + 0.57 * size, z);
    dummy.scale.set(0.31 * size, 0.6 * size, 0.23 * size);
    dummy.rotation.y = random() * Math.PI; dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, base + 1.28 * size, z);
    dummy.scale.setScalar(0.19 * size); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
  }
  scene.add(bodies, heads);
  // Pockets of distant light suggest a much larger venue beyond the ring.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffdba0 });
  const coolLightMat = new THREE.MeshBasicMaterial({ color: 0x9fcff5 });
  for (let i = 0; i < 80; i++) {
    const a = random() * Math.PI * 2;
    const r = 9 + random() * 11;
    addBall(scene, i % 3 ? lightMat : coolLightMat, Math.sin(a) * r, 1 + random() * 4, Math.cos(a) * r, 0.025, 0.025, 0.025).castShadow = false;
  }
  // Four overhead light banks visible at the edges of the composition.
  const fixture = mat(0x222c35, 0.5, 0.5);
  const glow = new THREE.MeshBasicMaterial({ color: 0xffebc8 });
  for (const x of [-6.6, 6.6]) for (const z of [-5, 5]) {
    addBox(scene, fixture, x, 8.7, z, 2.2, 0.2, 0.55, false);
    for (let j = -2; j <= 2; j++) addBox(scene, glow, x + j * 0.38, 8.57, z, 0.24, 0.04, 0.35, false);
  }

  function makeFighter(isPlayer) {
    const root = new THREE.Group(); scene.add(root);
    const rig = new THREE.Group(); root.add(rig);
    const skin = mat(isPlayer ? 0xb77b5c : 0x986047);
    skin.emissive = new THREE.Color(0xcc3429); skin.emissiveIntensity = 0;
    const skinShade = mat(isPlayer ? 0x9e664d : 0x7d4a39);
    skinShade.emissive = new THREE.Color(0xcc3429); skinShade.emissiveIntensity = 0;
    const trunks = mat(isPlayer ? 0xb82e2d : 0x245e9b, 0.65);
    const glove = mat(isPlayer ? 0xdf4840 : 0x428bc4, 0.38);
    const gloveShade = mat(isPlayer ? 0x8c211f : 0x194979, 0.5);
    const boots = mat(0x171d24, 0.6);
    const hair = mat(isPlayer ? 0x211c1a : 0x17181c);
    // Broad shoulders and tapered abdomen define a muscular silhouette.
    addBall(rig, skin, 0, 1.49, 0, 0.38, 0.43, 0.22);
    addBall(rig, skin, -0.27, 1.67, 0, 0.21, 0.2, 0.21);
    addBall(rig, skin, 0.27, 1.67, 0, 0.21, 0.2, 0.21);
    addBall(rig, skinShade, 0, 1.19, 0, 0.26, 0.21, 0.18);
    addCylinder(rig, skin, 0, 1.9, 0, 0.105, 0.2);
    addBall(rig, skin, 0, 2.1, 0, 0.205, 0.265, 0.19);
    addBall(rig, hair, 0, 2.27, -0.025, 0.205, 0.11, 0.18);
    addBall(rig, skinShade, 0, 2.08, 0.182, 0.065, 0.08, 0.055); // nose
    addBall(rig, skinShade, -0.205, 2.1, 0, 0.04, 0.075, 0.06);
    addBall(rig, skinShade, 0.205, 2.1, 0, 0.04, 0.075, 0.06);
    addBall(rig, trunks, 0, 1.01, 0, 0.34, 0.24, 0.235);
    addBox(rig, materials.white, 0, 1.17, 0, 0.6, 0.075, 0.4);
    addBox(rig, materials.trim, 0, 1.17, 0.206, 0.12, 0.065, 0.02);
    for (const s of [-1, 1]) {
      addBall(rig, trunks, s * 0.19, 0.88, 0, 0.18, 0.19, 0.2);
      addBox(rig, materials.white, s * 0.315, 0.99, 0.015, 0.026, 0.23, 0.3);
    }
    const arms = [-1, 1].map(s => {
      const upper = link(rig, skin, 0.12);
      const fore = link(rig, skinShade, 0.105);
      const elbow = addBall(rig, skin, 0, 0, 0, 0.115, 0.115, 0.115);
      const cuff = addBall(rig, gloveShade, 0, 0, 0, 0.13, 0.13, 0.13);
      const hand = new THREE.Group(); rig.add(hand);
      addBall(hand, glove, 0, 0, 0, 0.17, 0.18, 0.21);
      addBall(hand, gloveShade, -s * 0.12, -0.05, 0.07, 0.09, 0.105, 0.13);
      addBox(hand, materials.white, 0, -0.12, -0.1, 0.23, 0.075, 0.08);
      return { upper, fore, elbow, cuff, hand };
    });
    const legs = [-1, 1].map(() => {
      const thigh = link(rig, skin, 0.135);
      const shin = link(rig, skinShade, 0.105);
      const knee = addBall(rig, skin, 0, 0, 0, 0.13, 0.13, 0.13);
      const boot = addBall(rig, boots, 0, 0, 0, 0.14, 0.16, 0.24);
      const sock = link(rig, materials.white, 0.11);
      return { thigh, shin, knee, boot, sock };
    });
    return { root, rig, skin, skinShade, trunks, glove, gloveShade, color: isPlayer ? 'red' : 'blue', arms, legs, prevX: null, prevZ: null, motion: 0, phase: isPlayer ? 0 : 1.3 };
  }
  const fighters = [makeFighter(true), makeFighter(false)];

  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  function animateFighter(model, state, time, dt) {
    if (!state) return;
    const x = Number.isFinite(state.x) ? state.x : 0;
    const z = Number.isFinite(state.z) ? state.z : 0;
    if (model.color !== state.color && (state.color === 'red' || state.color === 'blue')) {
      model.color = state.color;
      const red = state.color === 'red';
      model.trunks.color.setHex(red ? 0xb82e2d : 0x245e9b);
      model.glove.color.setHex(red ? 0xdf4840 : 0x428bc4);
      model.gloveShade.color.setHex(red ? 0x8c211f : 0x194979);
    }
    const speed = model.prevX === null || dt <= 0 ? 0 : Math.hypot(x - model.prevX, z - model.prevZ) / dt;
    model.prevX = x; model.prevZ = z;
    model.motion = THREE.MathUtils.lerp(model.motion, Math.min(speed / 2.2, 1), 1 - Math.exp(-dt * 10));
    const walk = Math.sin(time * 10 + model.phase) * model.motion;
    const breathe = Math.sin(time * 3 + model.phase) * 0.015;
    const slip = THREE.MathUtils.clamp(Number(state.slip) || 0, -1, 1);
    const hit = THREE.MathUtils.clamp(Number(state.hitFlash) || 0, 0, 1);
    model.root.position.set(x, 0.04, z);
    model.root.rotation.y = Number.isFinite(state.angle) ? state.angle : 0;
    model.rig.rotation.set(state.down ? 0.15 : -0.035 - hit * 0.13, 0, state.down ? -1.42 : -slip * 0.26 + hit * 0.1);
    model.rig.position.set(state.down ? -0.12 : slip * 0.12, state.down ? 0.22 : breathe, 0);
    model.skin.emissiveIntensity = hit * 0.65;
    model.skinShade.emissiveIntensity = hit * 0.5;
    const punch = state.punch;
    const progress = punch ? THREE.MathUtils.clamp(Number(punch.progress) || 0, 0, 1) : 0;
    const strike = punch ? Math.sin(progress * Math.PI) : 0;
    const punchHand = punch && (punch.hand === 'left' || punch.hand === 'l' || punch.hand === 0 || punch.hand === -1) ? -1 : 1;
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      const arm = model.arms[i];
      const shoulder = v(s * 0.37, 1.68, 0);
      const active = s === punchHand ? strike : 0;
      const guarding = !!state.blocking;
      const gloveX = s * (guarding ? 0.17 : 0.27);
      const gloveY = guarding ? 2.03 : 1.84;
      const type = String(punch?.type || '').toLowerCase();
      const hook = type.includes('hook');
      const uppercut = type.includes('upper');
      const hand = v(gloveX + (hook ? -s * active * 0.16 : 0), gloveY + (uppercut ? active * 0.19 : -active * 0.04), 0.38 + active * (hook ? 0.46 : 0.76));
      const elbow = v(s * (0.44 + (hook ? active * 0.12 : 0)), 1.37 + active * 0.19, 0.2 + active * 0.26);
      arm.upper(shoulder, elbow); arm.fore(elbow, hand);
      arm.elbow.position.copy(elbow);
      arm.cuff.position.copy(hand).lerp(elbow, 0.14);
      arm.hand.position.copy(hand);
      arm.hand.rotation.set(-active * 0.5, 0, -s * active * (hook ? 0.55 : 0.2));
      const leg = model.legs[i];
      const step = walk * s;
      const hip = v(s * 0.18, 0.88, 0);
      const knee = v(s * 0.19, 0.5 + Math.max(0, step) * 0.06, step * 0.12);
      const ankle = v(s * 0.21, 0.15 + Math.max(0, step) * 0.07, s * 0.07 + step * 0.24);
      leg.thigh(hip, knee); leg.shin(knee, ankle);
      leg.knee.position.copy(knee);
      leg.boot.position.copy(ankle).add(v(0, -0.02, 0.07));
      leg.sock(ankle.clone().add(v(0, 0.08, 0)), ankle.clone().add(v(0, 0.22, 0)));
    }
  }
  let elapsed = 0;
  function resize() {
    const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull back on portrait screens so the whole fight remains in view.
    camera.fov = width / height < 1 ? 52 : 39;
    camera.updateProjectionMatrix();
  }
  function update(state, dt = 0) {
    const delta = Math.min(Math.max(Number(dt) || 0, 0), 0.1);
    elapsed += delta;
    const time = Number.isFinite(state?.time) ? state.time : elapsed;
    animateFighter(fighters[0], state?.fighters?.[0], time, delta);
    animateFighter(fighters[1], state?.fighters?.[1], time, delta);
    renderer.render(scene, camera);
  }
  function dispose() {
    window.removeEventListener('resize', resize);
    const geometries = new Set();
    const allMaterials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => allMaterials.add(m));
    });
    geometries.forEach(geometry => geometry.dispose());
    allMaterials.forEach(material => {
      if (material.map) material.map.dispose();
      material.dispose();
    });
    renderer.dispose();
  }
  window.addEventListener('resize', resize);
  resize();
  return { update, resize, dispose };
}
