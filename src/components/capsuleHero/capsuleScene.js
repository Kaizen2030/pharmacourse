import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
function rng(seed) {
  let a = seed >>> 0
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/* ---------- capsule half: hollow lathe, open rim at y=0, dome toward +Y ---------- */
function halfCapsuleGeometry(R = 0.5, L = 0.95, t = 0.045) {
  const r = R - t
  const pts = []
  const arc = (rad, cy, from, to, n) => { for (let i = 0; i <= n; i++) { const a = from + (to - from) * (i / n); pts.push(new THREE.Vector2(Math.cos(a) * rad, cy + Math.sin(a) * rad)) } }
  // inner: axis -> inner wall -> rim
  arc(r, L, Math.PI / 2, 0, 18)           // inner dome (top -> side)
  pts.push(new THREE.Vector2(r, 0.0))
  // rim bevel (semicircle below y=0)
  for (let i = 1; i < 8; i++) { const a = Math.PI + (Math.PI * i) / 8; pts.push(new THREE.Vector2((R + r) / 2 + Math.cos(a) * (t / 2), Math.sin(a) * (t / 2) * -1 * -1)) }
  pts.push(new THREE.Vector2(R, 0.0))
  arc(R, L, 0, Math.PI / 2, 24)           // outer dome
  const g = new THREE.LatheGeometry(pts, 64)
  return g
}
const capsuleMats = () => ({
  green: new THREE.MeshPhysicalMaterial({ color: 0x5aa91f, roughness: 0.2, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.06, emissive: 0x143d04, emissiveIntensity: 0.25, side: THREE.DoubleSide }),
  white: new THREE.MeshPhysicalMaterial({ color: 0xdde6f1, roughness: 0.24, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x5d7898, emissiveIntensity: 0.1, side: THREE.DoubleSide }),
})

/* ---------- leaf ---------- */
function leafTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 512
  const x = c.getContext("2d")
  const g = x.createLinearGradient(0, 512, 0, 0)
  g.addColorStop(0, "#1b5e1a"); g.addColorStop(0.5, "#389a26"); g.addColorStop(1, "#78c43f")
  x.fillStyle = g; x.fillRect(0, 0, 256, 512)
  // half-light on one side of the midrib
  const h = x.createLinearGradient(0, 0, 256, 0)
  h.addColorStop(0, "rgba(0,0,0,.16)"); h.addColorStop(0.5, "rgba(255,255,255,0)"); h.addColorStop(1, "rgba(255,255,255,.14)")
  x.fillStyle = h; x.fillRect(0, 0, 256, 512)
  x.strokeStyle = "rgba(215,255,170,.85)"; x.lineWidth = 5
  x.beginPath(); x.moveTo(128, 512); x.lineTo(128, 6); x.stroke()
  x.lineWidth = 2.2; x.strokeStyle = "rgba(215,255,170,.55)"
  for (let i = 1; i < 9; i++) {
    const y = 512 - i * 52
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(128, y); x.quadraticCurveTo(128 + s * 50, y - 28, 128 + s * (92 - i * 4), y - 78); x.stroke() }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
function leafGeometry(w = 0.34, l = 0.78) {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(w * 0.9, l * 0.12, w * 1.05, l * 0.55, 0, l)
  s.bezierCurveTo(-w * 1.05, l * 0.55, -w * 0.9, l * 0.12, 0, 0)
  const g = new THREE.ShapeGeometry(s, 22)
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i)
    uv.setXY(i, 0.5 + (x / (w * 2.1)), y / l)
    p.setZ(i, -Math.abs(x) * 0.55 + Math.pow(y / l, 2) * 0.24)   // crease + curl
  }
  g.computeVertexNormals()
  return g
}

/* ---------- tapered tube ---------- */
function taperTube(curve, segs, radial, r0, r1, mat) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false)
  const p = g.attributes.position
  const frames = curve.computeFrenetFrames(segs, false)
  for (let i = 0; i <= segs; i++) {
    const c = curve.getPointAt(i / segs)
    const rr = r0 + (r1 - r0) * (i / segs)
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j
      const px = p.getX(k) - c.x, py = p.getY(k) - c.y, pz = p.getZ(k) - c.z
      p.setXYZ(k, c.x + px * rr, c.y + py * rr, c.z + pz * rr)
    }
  }
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, mat)
  m.castShadow = false
  return m
}

/* ---------- icon sprites ---------- */
function iconTexture(kind) {
  const S = 128
  const c = document.createElement("canvas"); c.width = c.height = S
  const x = c.getContext("2d")
  x.lineCap = "round"; x.lineJoin = "round"
  x.strokeStyle = "#3e9a47"; x.fillStyle = "#3e9a47"; x.lineWidth = 7
  const cx = S / 2, cy = S / 2
  if (kind === "heart") {
    x.beginPath(); x.moveTo(cx, cy + 34); x.bezierCurveTo(cx - 62, cy - 4, cx - 30, cy - 44, cx, cy - 16); x.bezierCurveTo(cx + 30, cy - 44, cx + 62, cy - 4, cx, cy + 34); x.fill()
    x.strokeStyle = "#fff"; x.lineWidth = 5; x.beginPath(); x.moveTo(cx - 34, cy + 2); x.lineTo(cx - 14, cy + 2); x.lineTo(cx - 6, cy - 14); x.lineTo(cx + 6, cy + 18); x.lineTo(cx + 14, cy + 2); x.lineTo(cx + 34, cy + 2); x.stroke()
  } else if (kind === "atom") {
    for (let i = 0; i < 3; i++) { x.save(); x.translate(cx, cy); x.rotate((i * Math.PI) / 3); x.beginPath(); x.ellipse(0, 0, 46, 17, 0, 0, 7); x.stroke(); x.restore() }
    x.beginPath(); x.arc(cx, cy, 8, 0, 7); x.fill()
  } else if (kind === "dna") {
    for (let s = 0; s < 2; s++) { x.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40; const px = cx + Math.sin(t * Math.PI * 2 + s * Math.PI) * 24; const py = 14 + t * 100; i ? x.lineTo(px, py) : x.moveTo(px, py) } x.stroke() }
    x.lineWidth = 4; for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; const px = Math.sin(t * Math.PI * 2) * 24; x.beginPath(); x.moveTo(cx - px, 14 + t * 100); x.lineTo(cx + px, 14 + t * 100); x.stroke() }
  } else if (kind === "flask") {
    x.beginPath(); x.moveTo(cx - 12, 16); x.lineTo(cx - 12, 52); x.lineTo(cx - 40, 104); x.lineTo(cx + 40, 104); x.lineTo(cx + 12, 52); x.lineTo(cx + 12, 16); x.closePath(); x.stroke()
    x.beginPath(); x.moveTo(cx - 26, 82); x.lineTo(cx + 26, 82); x.lineTo(cx + 38, 102); x.lineTo(cx - 38, 102); x.closePath(); x.fill()
    x.beginPath(); x.moveTo(cx - 20, 16); x.lineTo(cx + 20, 16); x.stroke()
  } else if (kind === "pill") {
    x.save(); x.translate(cx, cy); x.rotate(-0.7)
    x.beginPath(); x.roundRect(-44, -18, 88, 36, 18); x.stroke()
    x.beginPath(); x.roundRect(-44, -18, 44, 36, [18, 0, 0, 18]); x.fill(); x.restore()
  } else if (kind === "cross") {
    x.beginPath(); x.roundRect(cx - 12, 24, 24, 80, 6); x.roundRect(24, cy - 12, 80, 24, 6); x.fill()
  } else if (kind === "steth") {
    x.beginPath(); x.moveTo(30, 20); x.quadraticCurveTo(30, 82, 64, 82); x.quadraticCurveTo(98, 82, 98, 20); x.stroke()
    x.beginPath(); x.arc(64, 98, 12, 0, 7); x.stroke()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

function hexSoftTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128
  const x = c.getContext("2d")
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62)
  g.addColorStop(0, "rgba(60,90,40,.55)"); g.addColorStop(1, "rgba(60,90,40,0)")
  x.fillStyle = g; x.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

export function createCapsuleHero(mount, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
  const mobile = () => window.innerWidth < 700
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.88
  const canvas = renderer.domElement
  canvas.style.cssText = "display:block;width:100%;height:100%"
  mount.appendChild(canvas)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.03)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.7
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(-3, 5, 6); scene.add(key)
  const rimL = new THREE.DirectionalLight(0xd8ffc0, 1.1); rimL.position.set(5, 2, -3); scene.add(rimL)
  scene.add(new THREE.HemisphereLight(0xf4ffe8, 0x7aa860, 0.7))

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60)
  camera.position.set(0, 0, 15)

  const mats = capsuleMats()
  const halfGeo = halfCapsuleGeometry()
  const mkHalf = (m) => new THREE.Mesh(halfGeo, m)

  /* --- three capsule groups */
  const center = new THREE.Group(); scene.add(center)
  const tl = new THREE.Group(); scene.add(tl)
  const tr = new THREE.Group(); scene.add(tr)

  // CENTER: green half (dome down-left) + white half (dome down-right), plant between
  const cG = mkHalf(mats.green); cG.position.set(-0.5, -0.1, 0); cG.rotation.z = 2.5
  const cW = mkHalf(mats.white); cW.position.set(0.5, -0.12, 0); cW.rotation.z = 3.78
  center.add(cG, cW)

  const plant = new THREE.Group(); plant.position.set(0, -0.25, 0); center.add(plant)
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f8f2c, roughness: 0.5 })
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(), side: THREE.DoubleSide, roughness: 0.42, metalness: 0, emissive: 0x102f08, emissiveIntensity: 0.12 })
  const lg = leafGeometry(0.42, 0.95)
  const stems = []
  const leaves = []
  const r = rng(11)
  for (let s = 0; s < 2; s++) {
    const sg = s ? 1 : -1
    const pts = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      const y = t * 2.6
      const x = sg * Math.sin(t * Math.PI * 1.7) * (0.2 + 0.1 * t) + sg * 0.03 + (s ? 0.12 : -0.1) * t * t
      const z = Math.cos(t * Math.PI * 1.7) * 0.12 * sg
      pts.push(new THREE.Vector3(x, y, z))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const mesh = taperTube(curve, 60, 10, 0.075, 0.022, stemMat)
    plant.add(mesh); stems.push(mesh)
    // leaves
    const n = 6
    for (let i = 0; i < n; i++) {
      const t = 0.28 + (i / (n - 1)) * 0.7
      const p = curve.getPointAt(t)
      const tan = curve.getTangentAt(t)
      const holder = new THREE.Group()
      holder.position.copy(p)
      const side = (i + s) % 2 ? 1 : -1
      const size = 1.5 - t * 0.7 + r() * 0.15
      const leaf = new THREE.Mesh(lg, leafMat)
      leaf.scale.setScalar(size)
      leaf.rotation.set(-0.55 + r() * 0.3, 0, 0)       // lean outward from stem
      holder.add(leaf)
      holder.rotation.y = side * (0.1 + r() * 0.35)
      holder.rotation.z = -side * (0.95 + r() * 0.45) * (1.15 - t * 0.5)
      holder.userData = { delay: 0.5 + t * 1.5 + s * 0.15, base: size, phase: r() * 6, side, rz: holder.rotation.z, ry: holder.rotation.y }
      plant.add(holder); leaves.push(holder)
    }
  }
  // crowning leaves
  for (let i = 0; i < 3; i++) {
    const holder = new THREE.Group(); holder.position.set((i - 1) * 0.03, 2.6, 0)
    const leaf = new THREE.Mesh(lg, leafMat); leaf.scale.setScalar(0.85 - i * 0.05); leaf.rotation.x = -0.25
    holder.add(leaf); holder.rotation.y = (i - 1) * 0.5; holder.rotation.z = (i - 1) * -0.85
    holder.userData = { delay: 2.0 + i * 0.12, base: 0.62, phase: i, side: 1, rz: holder.rotation.z, ry: holder.rotation.y }
    plant.add(holder); leaves.push(holder)
  }

  // soft ground shadow
  const shadowTex = hexSoftTexture()
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }))
  shadow.position.set(0, -1.7, -0.6); center.add(shadow)

  // TOP-LEFT: open capsule releasing science icons
  const tG = mkHalf(mats.green); tG.position.set(0.5, 0.08, 0); tG.rotation.z = -1.02
  const tW = mkHalf(mats.white); tW.position.set(-0.48, -0.02, 0); tW.rotation.z = 1.12
  tl.add(tG, tW)
  const kinds = ["heart", "atom", "dna", "flask", "pill", "cross", "steth"]
  const icons = kinds.map((k, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(k), transparent: true, depthWrite: false, opacity: 0 }))
    sp.userData = { k: i / kinds.length, seed: r() }
    tl.add(sp); return sp
  })
  const dotGeo = new THREE.SphereGeometry(1, 10, 8)
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshStandardMaterial({ color: 0x5fb046, roughness: 0.3 }), 60)
  tl.add(dots)
  const dotSeeds = Array.from({ length: 60 }, () => ({ a: r(), b: r(), c: r(), d: r() }))

  // TOP-RIGHT: powder burst
  const pG = mkHalf(mats.green); pG.position.set(0.55, 0.1, 0); pG.rotation.z = -0.66
  const pW = mkHalf(mats.white); pW.position.set(-0.58, 0.0, 0); pW.rotation.z = 0.98
  tr.add(pG, pW)
  const NP = mobile() ? 150 : 280
  const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1, vertexColors: false }), NP)
  const gcol = new THREE.Color()
  const gseed = Array.from({ length: NP }, (_, i) => {
    const green = r() < 0.38
    gcol.set(green ? 0x7cc043 : 0xdbe6f2); grains.setColorAt(i, gcol)
    return { a: r(), b: r(), c: r(), s: 0.022 + Math.pow(r(), 2.4) * 0.07 }
  })
  grains.instanceColor.needsUpdate = true
  tr.add(grains)

  /* --- floating molecules around the whole scene */
  const mol = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xcfe0f0, roughness: 0.2, clearcoat: 1 }), 26)
  const mseed = Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * 2, y: (r() - 0.5) * 2, z: -1 - r() * 3, s: 0.03 + r() * 0.07, p: r() * 6 }))
  scene.add(mol)

  /* --- layout */
  const L = { halfW: 6, halfH: 3.5 }
  const place = () => {
    const w = mount.clientWidth || 800, h = mount.clientHeight || 600
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    L.halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z
    L.halfW = L.halfH * camera.aspect
    const a = camera.aspect
    if (a >= 1.1) {
      const u = Math.min(1, L.halfH / 3.5) * 1.0
      center.position.set(L.halfW * 0.02, -L.halfH * 0.42, 0); center.scale.setScalar(1.3 * u * Math.min(1, a / 1.6))
      tl.position.set(-L.halfW * 0.6, L.halfH * 0.52, 0); tl.scale.setScalar(1.02 * u * Math.min(1, a / 1.6))
      tr.position.set(L.halfW * 0.62, L.halfH * 0.5, 0); tr.scale.setScalar(1.02 * u * Math.min(1, a / 1.6))
    } else {
      const sc = Math.min((1.55 * L.halfH) / 4.7, L.halfW / 1.9)
      center.position.set(0, -1.05 * sc - L.halfH * 0.04, 0); center.scale.setScalar(sc)
      tl.position.set(-L.halfW * 0.7, L.halfH * 0.72, 0); tl.scale.setScalar(sc * 0.52)
      tr.position.set(L.halfW * 0.7, L.halfH * 0.72, 0); tr.scale.setScalar(sc * 0.52)
    }
  }
  place()
  const ro = new ResizeObserver(place); ro.observe(mount)

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
  const onMove = (e) => {
    const rc = canvas.getBoundingClientRect()
    pointer.x = clamp(((e.clientX - rc.left) / rc.width) * 2 - 1, -1.2, 1.2)
    pointer.y = clamp(-(((e.clientY - rc.top) / rc.height) * 2 - 1), -1.2, 1.2)
  }
  window.addEventListener("pointermove", onMove, { passive: true })

  const dummy = new THREE.Object3D()
  let visible = false, raf = 0, T = opts.reduced ? 6 : 0, last = performance.now()
  const reduced = () => (typeof opts.reduced === "function" ? opts.reduced() : !!opts.reduced)

  const frame = (now) => {
    raf = 0
    if (!visible || document.hidden) return
    const dt = Math.min((now - last) / 1000, 0.05); last = now
    const rm = reduced()
    T += rm ? 0 : dt
    const t = T
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 4)
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 4)
    const m = rm ? 0 : 1

    // gentle parallax
    camera.position.x = pointer.sx * 0.55 * m
    camera.position.y = pointer.sy * 0.3 * m
    camera.lookAt(0, 0, 0)

    // center halves breathe apart & together
    const open = Math.sin(t * 0.9) * 0.05 * m
    cG.position.set(-0.5 - open, -0.1 + Math.sin(t * 1.1) * 0.03 * m, 0)
    cW.position.set(0.5 + open, -0.12 + Math.cos(t * 1.0) * 0.03 * m, 0)
    center.rotation.y = pointer.sx * 0.28 * m
    center.position.y += 0 // layout owned by place()
    tl.rotation.y = pointer.sx * 0.35 * m; tl.rotation.x = -pointer.sy * 0.15 * m
    tr.rotation.y = pointer.sx * 0.35 * m; tr.rotation.x = -pointer.sy * 0.15 * m
    const bobTL = Math.sin(t * 0.8) * 0.06 * m, bobTR = Math.sin(t * 0.9 + 2) * 0.06 * m
    tG.position.y = 0.08 + bobTL; tW.position.y = -0.02 - bobTL
    pG.position.y = 0.1 + bobTR; pW.position.y = bobTR * -1

    // plant growth
    const grow = smooth(0.0, 2.4, t)
    stems.forEach((s) => { s.scale.set(1, Math.max(0.0001, grow), 1) })
    plant.rotation.z = Math.sin(t * 0.7) * 0.018 * m
    leaves.forEach((h) => {
      const u = h.userData
      const k = clamp((t - u.delay) / 0.9, 0, 1)
      const sc = k === 0 ? 0.0001 : easeOutBack(k)
      h.scale.setScalar(Math.max(0.0001, sc))
      h.position.y = h.position.y // positions along stem already scaled via stem grow below
      const sway = Math.sin(t * 1.3 + u.phase) * 0.06 * m
      h.rotation.z = u.rz + sway
      h.rotation.y = u.ry + Math.sin(t * 0.9 + u.phase) * 0.05 * m
    })
    shadow.scale.set(1 + Math.sin(t * 1.1) * 0.02 * m, 1, 1)

    // icons float out of TL capsule (emit toward lower-right like the reference)
    icons.forEach((sp) => {
      const per = 7
      const ph = ((t / per + sp.userData.k) % 1)
      const e = ph
      const a = sp.userData.seed
      const x = 0.5 + e * (1.3 + a * 1.9) + Math.sin(t * 1.2 + a * 9) * 0.1 * m
      const y = -0.45 - e * (0.45 + a * 0.55) + Math.sin(t * 0.9 + a * 5) * 0.08 * m
      sp.position.set(x, y, 0.4 + a * 0.6)
      const s = (0.44 + a * 0.2) * (0.5 + 0.5 * smooth(0, 0.18, e))
      sp.scale.set(s, s, 1)
      sp.material.opacity = smooth(0, 0.12, e) * (1 - smooth(0.62, 1, e)) * 0.95
      sp.material.rotation = Math.sin(t * 0.6 + a * 7) * 0.2 * m
    })
    for (let i = 0; i < 60; i++) {
      const d = dotSeeds[i]
      const ph = ((t * 0.16 + d.a) % 1)
      dummy.position.set(0.4 + ph * (1.0 + d.b * 2.2), -0.45 - ph * (0.4 + d.c * 0.8) + Math.sin(t + d.d * 9) * 0.04 * m, 0.2 + d.d * 0.6)
      const s = (0.015 + d.b * 0.032) * smooth(0, 0.1, ph) * (1 - smooth(0.6, 1, ph))
      dummy.scale.setScalar(Math.max(0.0001, s)); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix)
    }
    dots.instanceMatrix.needsUpdate = true

    // powder burst from TR capsule, fanning to the lower-right
    for (let i = 0; i < NP; i++) {
      const g = gseed[i]
      const ph = ((t * 0.11 + g.a) % 1)
      const spread = 0.12 + g.b * 0.55
      const ang = -0.9 + (g.c - 0.5) * spread * 2.6
      const dist = ph * (0.4 + g.b * 2.6)
      dummy.position.set(0.05 + Math.cos(ang) * dist + Math.sin(t * 0.8 + g.a * 12) * 0.04 * m, -0.55 + Math.sin(ang) * dist * 1.05 - ph * ph * 0.7, 0.2 + g.c * 0.8)
      const sc = g.s * smooth(0, 0.08, ph) * (1 - smooth(0.7, 1, ph))
      dummy.scale.setScalar(Math.max(0.0001, sc)); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); grains.setMatrixAt(i, dummy.matrix)
    }
    grains.instanceMatrix.needsUpdate = true

    // ambient molecules
    for (let i = 0; i < mseed.length; i++) {
      const s = mseed[i]
      dummy.position.set(s.x * L.halfW * 0.95 + Math.sin(t * 0.3 + s.p) * 0.15 * m, s.y * L.halfH * 0.95 + Math.cos(t * 0.4 + s.p) * 0.15 * m, s.z)
      dummy.scale.setScalar(s.s); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); mol.setMatrixAt(i, dummy.matrix)
    }
    mol.instanceMatrix.needsUpdate = true

    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) } }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start() }, { threshold: 0.01 })
  io.observe(mount)
  const onVis = () => { if (!document.hidden) start() }
  document.addEventListener("visibilitychange", onVis)

  return {
    setTime(v) { T = v },
    dispose() {
      cancelAnimationFrame(raf); visible = false
      io.disconnect(); ro.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pointermove", onMove)
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []
        ms.forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose() })
      })
      envRT.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss()
      if (canvas.parentNode === mount) mount.removeChild(canvas)
    },
  }
}
