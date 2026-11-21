// Probador 3D de cosméticos: dibuja el estilo (modelo .geo de BounceStyles/GeckoLib) sobre un jugador gris.
// Datos: probador/<id>.json (herramientas/gen_web.py). Se abre con los botones .ver3d del catálogo.
// Coordenadas: las de Blockbench (las del .geo con X invertida): frente del jugador = −Z, su derecha = +X, 1 unidad = 1 px.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = s => document.querySelector(s);
const modal = $('#probador'), box = $('#pr-canvas');
const D2R = Math.PI / 180;
let renderer, scene, camera, controls, player, cos = null, data = null, color = 0, anim = true, t0 = 0, raf = 0;
const loader = new THREE.TextureLoader();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  box.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 1, 1000);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x404050, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.4);
  sol.position.set(-30, 60, -50);
  scene.add(sol);
  const contra = new THREE.DirectionalLight(0xc8d8ff, 0.5);
  contra.position.set(40, 30, 60);
  scene.add(contra);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 25;
  controls.maxDistance = 140;
  player = jugador();
  scene.add(player);
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(18, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = 0.05;
  scene.add(suelo);
  new ResizeObserver(tam).observe(box);
}

function vista() {
  const k = camera.aspect < 0.9 ? 1.3 : 1;     // en pantallas angostas (teléfono) se aleja para que entre entero
  camera.position.set(-40 * k, 28, -66 * k);   // de frente y un poco de lado
  controls.target.set(0, 18, 0);
  controls.update();
}

function tam() {
  const w = box.clientWidth, h = box.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------- jugador gris
function jugador() {
  const g = new THREE.Group();
  const piel = new THREE.MeshLambertMaterial({ color: 0x9a9ca3 });
  const ropa = new THREE.MeshLambertMaterial({ color: 0x7c7f88 });
  const pierna = new THREE.MeshLambertMaterial({ color: 0x6a6d76 });
  const parte = (x, y, z, w, h, d, m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x + w / 2, y + h / 2, z + d / 2);
    g.add(b);
  };
  parte(-4, 24, -4, 8, 8, 8, piel);            // cabeza
  parte(-4, 12, -2, 8, 12, 4, ropa);           // cuerpo
  parte(4, 12, -2, 4, 12, 4, piel);            // brazo derecho (+X)
  parte(-8, 12, -2, 4, 12, 4, piel);           // brazo izquierdo
  parte(0, 0, -2, 4, 12, 4, pierna);           // pierna derecha
  parte(-4, 0, -2, 4, 12, 4, pierna);          // pierna izquierda
  const ojo = new THREE.MeshBasicMaterial({ color: 0x2a2c33 });
  for (const x of [-2.5, 1.5]) {               // ojos en la cara (−Z)
    const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ojo);
    o.position.set(x + 0.5, 28.5, -4.01);
    o.rotation.y = Math.PI;
    g.add(o);
  }
  return g;
}

// ---------------------------------------------------------------- .geo → three.js
const RANURA = { armorHead: 'head', armorBody: 'body', armorRightArm: 'body', armorLeftArm: 'body',
  armorRightLeg: 'legs', armorLeftLeg: 'legs', armorRightBoot: 'feet', armorLeftBoot: 'feet' };
const flip = p => [-p[0], p[1], p[2]];                   // Bedrock → Blockbench
const rot = (o, r) => { if (r) o.rotation.set(-r[0] * D2R, -r[1] * D2R, r[2] * D2R, 'ZYX'); };

// caras de una caja (vista desde afuera: arriba-izq., arriba-der., abajo-der., abajo-izq.) y su rectángulo de UV de caja
function caras(a, b) {
  const [x0, y0, z0] = a, [x1, y1, z1] = b;
  return {
    east: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]],
    west: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]],
    north: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]],
    south: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]],
    up: [[x1, y1, z1], [x0, y1, z1], [x0, y1, z0], [x1, y1, z0]],
    down: [[x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1]],
  };
}

function uvCaja(u, v, s, mirror) {
  const [w, h, d] = s.map(Math.floor);
  const r = { east: [u, v + d, d, h], north: [u + d, v + d, w, h], west: [u + d + w, v + d, d, h],
    south: [u + 2 * d + w, v + d, w, h], up: [u + d, v, w, d], down: [u + d + w, v + d, w, -d] };   // abajo: v invertida
  if (mirror) [r.east, r.west] = [r.west, r.east];
  return r;
}

function malla(cube, tw, th, mat) {
  const inf = cube.inflate || 0;
  const s = cube.size, o = cube.origin;
  const a = [-(o[0] + s[0]) - inf, o[1] - inf, o[2] - inf];
  const b = [a[0] + s[0] + 2 * inf, a[1] + s[1] + 2 * inf, a[2] + s[2] + 2 * inf];
  const c = caras(a, b);
  let rects;
  if (Array.isArray(cube.uv)) rects = uvCaja(cube.uv[0], cube.uv[1], s, cube.mirror);
  else { rects = {}; for (const [k, f] of Object.entries(cube.uv)) if (f.uv) rects[k] = [f.uv[0], f.uv[1], f.uv_size[0], f.uv_size[1]]; }
  const pos = [], uv = [], idx = [];
  for (const [k, q] of Object.entries(c)) {
    const r = rects[k];
    if (!r || (s[0] === 0 && (k === 'east' || k === 'west')) || (s[1] === 0 && (k === 'up' || k === 'down')) || (s[2] === 0 && !Array.isArray(cube.uv) && !(k in rects))) continue;
    let [u, v, w, h] = r;
    if (Array.isArray(cube.uv) && cube.mirror) { u += w; w = -w; }
    const n = pos.length / 3;
    q.forEach(p => pos.push(...p));
    uv.push(u / tw, 1 - v / th, (u + w) / tw, 1 - v / th, (u + w) / tw, 1 - (v + h) / th, u / tw, 1 - (v + h) / th);
    idx.push(n, n + 3, n + 1, n + 1, n + 3, n + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

function construir(pieza, mat) {
  const geo = pieza.geo['minecraft:geometry'][0], d = geo.description;
  const raiz = new THREE.Group(), nodos = {}, info = {};
  geo.bones.forEach(b => info[b.name] = b);
  const ranura = n => { for (let b = info[n]; b; b = info[b.parent]) if (RANURA[b.name]) return RANURA[b.name]; return null; };
  for (const b of geo.bones) {                       // los padres vienen antes que los hijos en los .geo
    const piv = flip(b.pivot || [0, 0, 0]);
    const n = new THREE.Group();
    const padre = b.parent && nodos[b.parent];
    const ppiv = padre ? flip(info[b.parent].pivot || [0, 0, 0]) : [0, 0, 0];
    n.position.set(piv[0] - ppiv[0], piv[1] - ppiv[1], piv[2] - ppiv[2]);
    rot(n, b.rotation);
    n.userData = { base: n.rotation.clone(), piv };
    (padre || raiz).add(n);
    nodos[b.name] = n;
    const r = ranura(b.name);
    if (r && !pieza.slots.includes(r)) continue;      // un estilo solo muestra su ranura (las 4 piezas de una armadura comparten modelo)
    for (const c of b.cubes || []) {
      const m = malla(c, d.texture_width, d.texture_height, mat);
      if (c.rotation) {
        const cp = flip(c.pivot || [0, 0, 0]), h = new THREE.Group();
        h.position.set(cp[0] - piv[0], cp[1] - piv[1], cp[2] - piv[2]);
        rot(h, c.rotation);
        m.position.set(-cp[0], -cp[1], -cp[2]);
        h.add(m);
        n.add(h);
      } else {
        m.position.set(-piv[0], -piv[1], -piv[2]);
        n.add(m);
      }
    }
  }
  return { raiz, nodos };
}

// ---------------------------------------------------------------- animación de reposo (rotación y escala por hueso)
function valor(track, t) {
  if (Array.isArray(track)) return track;
  const ks = Object.keys(track).map(Number).sort((a, b) => a - b);
  if (!ks.length) return null;
  const val = k => { const x = track[Object.keys(track).find(s => Number(s) === k)]; return Array.isArray(x) ? x : (x.post || x.pre || [0, 0, 0]); };
  if (t <= ks[0]) return val(ks[0]);
  for (let i = 1; i < ks.length; i++) if (t <= ks[i]) {
    const a = val(ks[i - 1]), b = val(ks[i]), f = (t - ks[i - 1]) / (ks[i] - ks[i - 1]);
    return a.map((v, j) => (typeof v === 'number' ? v : 0) + ((typeof b[j] === 'number' ? b[j] : 0) - (typeof v === 'number' ? v : 0)) * f);
  }
  return val(ks[ks.length - 1]);
}

function animar(t) {
  if (!cos) return;
  for (const { pieza, nodos } of cos.partes) {
    const an = pieza.anim;
    if (!an || !an.bones) continue;
    const len = an.animation_length || 1, tt = anim ? (t % len) : 0;
    for (const [name, tr] of Object.entries(an.bones)) {
      const n = nodos[name];
      if (!n) continue;
      const base = n.userData.base;
      const r = tr.rotation && valor(tr.rotation, tt);
      n.rotation.set(base.x + (r ? -r[0] * D2R : 0), base.y + (r ? -r[1] * D2R : 0), base.z + (r ? r[2] * D2R : 0), 'ZYX');
      const s = tr.scale && valor(tr.scale, tt);
      if (s) n.scale.set(...(s.length ? s : [s, s, s]));
    }
  }
}

// ---------------------------------------------------------------- abrir / cerrar
function texturas(k) {
  for (const p of cos.partes) {
    const url = p.pieza.tex[Math.min(k, p.pieza.tex.length - 1)];
    loader.load(url, tx => { tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter; tx.colorSpace = THREE.SRGBColorSpace; p.mat.map = tx; p.mat.needsUpdate = true; });
  }
}

function botones() {
  const n = Math.max(...data.piezas.map(p => p.tex.length));
  const nombres = data.piezas.find(p => p.tex.length === n).colores || [];
  $('#pr-colores').innerHTML = n > 1 ? nombres.map((c, i) => `<button class="chip" data-k="${i}" aria-pressed="${i === color}">${c}</button>`).join('') : '';
}

async function abrir(item) {
  if (!renderer) init();
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#pr-nombre').textContent = item.nombre;
  $('#pr-desc').textContent = item.desc || '';
  $('#pr-estado').textContent = 'Cargando…';
  tam();
  vista();
  if (cos) { scene.remove(cos.grupo); cos = null; }
  try {
    data = await (await fetch(item.demo)).json();
  } catch (e) { $('#pr-estado').textContent = 'No se pudo cargar el modelo.'; return; }
  color = 0;
  const grupo = new THREE.Group(), partes = [];
  for (const pieza of data.piezas) {
    const mat = new THREE.MeshLambertMaterial({ alphaTest: 0.1, side: THREE.FrontSide });
    const { raiz, nodos } = construir(pieza, mat);
    grupo.add(raiz);
    partes.push({ pieza, nodos, mat });
  }
  cos = { grupo, partes };
  scene.add(grupo);
  texturas(0);
  botones();
  $('#pr-estado').textContent = '';
  t0 = performance.now();
  if (!raf) loop();
}

function cerrar() {
  modal.hidden = true;
  document.body.style.overflow = '';
  cancelAnimationFrame(raf);
  raf = 0;
}

function loop() {
  raf = requestAnimationFrame(loop);
  animar((performance.now() - t0) / 1000);
  controls.update();
  renderer.render(scene, camera);
}

document.addEventListener('click', e => {
  const b = e.target.closest('.ver3d');
  if (b) { const it = (window.TIENDA?.articulos || []).find(a => a.id === b.dataset.id); if (it) abrir(it); return; }
  if (e.target === modal || e.target.closest('#pr-cerrar')) cerrar();
  const c = e.target.closest('#pr-colores .chip');
  if (c) { color = +c.dataset.k; texturas(color); botones(); }
  if (e.target.closest('#pr-anim')) { anim = !anim; e.target.closest('#pr-anim').setAttribute('aria-pressed', anim); }
  if (e.target.closest('#pr-vista')) vista();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrar(); });
