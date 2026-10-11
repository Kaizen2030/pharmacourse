import * as THREE from "three"
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

const TAU = Math.PI * 2
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const ease = (t) => t * t * (3 - 2 * t)
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt))
const rand = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export const SPACING = 3.6
export const ACCENTS = [0x2fd29a, 0xe08a4c, 0x4bb6d8]

/* ---------- textures ---------- */

function makeTerrazzoTexture() {
  const c = document.createElement("canvas")
  c.width = c.height = 512
  const x = c.getContext("2d")
  x.fillStyle = "#d5d9d8"
  x.fillRect(0, 0, 512, 512)
  const palette = ["#f4f6f5", "#aab2b0", "#8c9694", "#ffffff", "#c2d9d2", "#b9c3c1"]
  for (let i = 0; i < 2200; i++) {
    x.fillStyle = palette[Math.floor(rand(i) * palette.length)]
    x.globalAlpha = 0.35 + rand(i + 9) * 0.6
    x.beginPath()
    x.arc(rand(i + 1) * 512, rand(i + 2) * 512, 0.6 + rand(i + 3) * 2.2, 0, TAU)
    x.fill()
  }
  x.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 1.6)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeShadowTexture() {
  const c = document.createElement("canvas")
  c.width = c.height = 128
  const x = c.getContext("2d")
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, "rgba(0,0,0,0.5)")
  g.addColorStop(1, "rgba(0,0,0,0)")
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

function makeCertificateTexture() {
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 180
  const x = c.getContext("2d")
  x.fillStyle = "#fffaf0"
  x.fillRect(0, 0, 256, 180)
  x.strokeStyle = "#1b8a62"
  x.lineWidth = 8
  x.strokeRect(8, 8, 240, 164)
  x.fillStyle = "#14604a"
  x.font = "bold 54px Georgia, serif"
  x.textAlign = "center"
  x.fillText("CPD", 128, 96)
  x.font = "16px Georgia, serif"
  x.fillText("CERTIFIED", 128, 128)
  x.fillStyle = "#e08a4c"
  x.beginPath()
  x.arc(128, 150, 9, 0, TAU)
  x.fill()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ---------- pedestal ---------- */

export function buildPedestal(kind) {
  const group = new THREE.Group()
  const bodyMat =
    kind === 0
      ? new THREE.MeshStandardMaterial({ color: 0x41544d, roughness: 0.7, metalness: 0.05 })
      : kind === 1
        ? new THREE.MeshStandardMaterial({ color: 0xb87038, roughness: 0.3, metalness: 1 })
        : new THREE.MeshStandardMaterial({ color: 0x35687f, roughness: 0.55, metalness: 0.15 })
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xc6cac9, roughness: 0.85 })
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x10241f,
    emissive: new THREE.Color(ACCENTS[kind]),
    emissiveIntensity: 0.35,
    roughness: 0.4,
  })

  const plinth = new THREE.Mesh(new RoundedBoxGeometry(2.95, 0.22, 2.35, 3, 0.07), stoneMat)
  plinth.position.y = 0.11
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.7, 0.74, 2.1, 4, 0.1), bodyMat)
  body.position.y = 0.59
  const plate = new THREE.Mesh(new RoundedBoxGeometry(2.45, 0.05, 1.85, 2, 0.02), plateMat)
  plate.position.y = 0.985
  ;[plinth, body, plate].forEach((m) => {
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  })
  return { group, plateMat, topY: 1.01 }
}

/* ---------- 01 Pharmacourse: open book with flipping pages + hologram ---------- */

export function buildBook() {
  const group = new THREE.Group()
  const coverMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b8a62, roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12,
    transparent: true, opacity: 0.92,
  })
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xfdf8ea, roughness: 0.8 })
  const coverGeo = new RoundedBoxGeometry(1.5, 0.07, 1.9, 3, 0.025)
  const blockGeo = new RoundedBoxGeometry(1.4, 0.16, 1.78, 3, 0.03)

  const book = new THREE.Group()
  group.add(book)
  ;[-1, 1].forEach((s) => {
    const half = new THREE.Group()
    half.rotation.z = s * 0.08
    const cover = new THREE.Mesh(coverGeo, coverMat)
    cover.position.set(s * 0.75, 0, 0)
    const block = new THREE.Mesh(blockGeo, pageMat)
    block.position.set(s * 0.72, 0.115, 0)
    half.add(cover, block)
    book.add(half)
  })

  const pageGeo = new THREE.BoxGeometry(1.38, 0.008, 1.75)
  pageGeo.translate(0.69, 0, 0)
  const pages = []
  for (let k = 0; k < 6; k++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xfffdf6, roughness: 0.7, transparent: true })
    const pivot = new THREE.Group()
    pivot.position.y = 0.205 + k * 0.003
    pivot.add(new THREE.Mesh(pageGeo, mat))
    book.add(pivot)
    pages.push({ pivot, mat })
  }
  book.rotation.x = 0.12

  // hologram: rising particles
  const N = 90
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const seeds = Array.from({ length: N }, (_, i) => ({
    a: rand(i) * TAU, r: 0.15 + rand(i + 5) * 0.6, s: 0.12 + rand(i + 9) * 0.18, o: rand(i + 13),
  }))
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3))
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.07, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }))
  group.add(points)

  const orb = new THREE.Group()
  orb.position.y = 1.55
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.4, 1),
    new THREE.MeshBasicMaterial({ color: 0x7dffc8, wireframe: true, transparent: true, opacity: 0.6 })
  )
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe6fff5 }))
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.012, 8, 72),
    new THREE.MeshBasicMaterial({ color: 0x9fffd8, transparent: true, opacity: 0.8 })
  )
  ring.rotation.x = Math.PI / 2.4
  orb.add(shell, core, ring)
  group.add(orb)

  const cert = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.44),
    new THREE.MeshBasicMaterial({ map: makeCertificateTexture(), side: THREE.DoubleSide })
  )
  group.add(cert)

  let time = 0
  return {
    group,
    baseY: 1.1,
    update(dt, hover, mo) {
      time += dt * (1 + hover * 1.4) * Math.max(mo, 0.25)
      const P = 4.2
      pages.forEach((p, k) => {
        const l = (time / P + k / pages.length) % 1
        let theta = 0.08
        let op = 1
        if (l < 0.3) theta = 0.08 + ease(l / 0.3) * (Math.PI - 0.16)
        else if (l < 0.55) theta = Math.PI - 0.08
        else if (l < 0.65) { theta = Math.PI - 0.08; op = 1 - (l - 0.55) / 0.1 }
        else if (l < 0.9) op = 0
        else op = (l - 0.9) / 0.1
        p.pivot.rotation.z = theta
        p.mat.opacity = op
      })
      for (let i = 0; i < N; i++) {
        const s = seeds[i]
        const f = (s.o + time * s.s) % 1
        const y = 0.3 + f * 1.7
        const r = s.r * (0.35 + f * 0.5)
        pos[i * 3] = Math.cos(s.a + time * 0.9) * r
        pos[i * 3 + 1] = y
        pos[i * 3 + 2] = Math.sin(s.a + time * 0.9) * r
        const fade = Math.sin(f * Math.PI)
        col[i * 3] = 0.45 * fade; col[i * 3 + 1] = 1 * fade; col[i * 3 + 2] = 0.8 * fade
      }
      geo.attributes.position.needsUpdate = true
      geo.attributes.color.needsUpdate = true
      orb.rotation.y = time * 0.9
      orb.rotation.x = Math.sin(time * 0.6) * 0.3
      ring.rotation.z = time * 1.4
      const sc = 1 + hover * 0.25 + Math.sin(time * 3) * 0.03
      orb.scale.setScalar(sc)
      cert.position.set(Math.cos(time * 0.8) * 1.25, 1.05 + Math.sin(time * 1.2) * 0.12, Math.sin(time * 0.8) * 1.25)
      cert.lookAt(0, 1.1, 0)
      cert.rotateY(Math.PI)
      group.rotation.y = Math.sin(time * 0.35) * 0.25
    },
  }
}

/* ---------- 02 RemedacarePOS: glass cube with a tumbling capsule ---------- */

function capsuleHalf(color, dir) {
  const g = new THREE.Group()
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 })
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 32), mat)
  cyl.rotation.z = Math.PI / 2
  cyl.position.x = dir * 0.2
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 16, 0, TAU, 0, Math.PI / 2), mat)
  cap.rotation.z = -dir * Math.PI / 2
  cap.position.x = dir * 0.4
  g.add(cyl, cap)
  return g
}

export function buildCapsuleCube() {
  const group = new THREE.Group()
  const cubeGeo = new RoundedBoxGeometry(1.75, 1.75, 1.75, 5, 0.16)
  const cube = new THREE.Mesh(
    cubeGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.04, metalness: 0, transmission: 1, thickness: 1.1, ior: 1.45,
      attenuationColor: new THREE.Color(0xcdf5e8), attenuationDistance: 2.5, clearcoat: 1, envMapIntensity: 1.4,
    })
  )
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.76, 1.76, 1.76)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
  )
  const pill = new THREE.Group()
  const left = capsuleHalf(0x2fd29a, -1)
  const right = capsuleHalf(0xff5a47, 1)
  pill.add(left, right)
  pill.scale.setScalar(1.05)

  const tabletMats = [0xffffff, 0xf6c177, 0x9fe8cf].map((c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, clearcoat: 0.8 }))
  const tablets = tabletMats.map((m) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.055, 28), m)
    group.add(t)
    return t
  })

  const cross = new THREE.Group()
  const crossMat = new THREE.MeshStandardMaterial({ color: 0x1b8a62, emissive: 0x2fd29a, emissiveIntensity: 0.9, roughness: 0.3 })
  cross.add(new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.12, 0.12, 2, 0.03), crossMat))
  cross.add(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.4, 0.12, 2, 0.03), crossMat))
  cross.position.set(1.15, 1.1, 0.5)
  group.add(cube, frame, pill, cross)

  let time = 0
  return {
    group,
    baseY: 2.05,
    update(dt, hover, mo) {
      time += dt * (1 + hover * 1.8) * Math.max(mo, 0.25)
      group.rotation.y = time * 0.35
      pill.rotation.set(time * 0.9, time * 0.5, Math.sin(time * 0.8) * 0.6)
      pill.position.y = Math.sin(time * 1.6) * 0.1
      const split = hover * 0.14 + Math.max(0, Math.sin(time * 0.9)) * 0.03
      left.position.x = -split
      right.position.x = split
      tablets.forEach((t, i) => {
        const a = time * (0.9 + i * 0.25) + i * 2.1
        t.position.set(Math.cos(a) * 1.35, Math.sin(a * 0.7 + i) * 0.55, Math.sin(a) * 1.35)
        t.rotation.set(a, a * 0.6, 0)
      })
      cross.rotation.y = time * 1.3
      cross.position.y = 1.1 + Math.sin(time * 1.4) * 0.08
      cross.scale.setScalar(1 + hover * 0.3)
      cube.scale.setScalar(1 + hover * 0.05)
    },
  }
}

/* ---------- 03 RemedacareHMIS: living network with data pulses ---------- */

export function buildNetwork() {
  const group = new THREE.Group()
  const net = new THREE.Group()
  group.add(net)

  const pts = [new THREE.Vector3(0, 0, 0)]
  for (let i = 0; i < 13; i++) {
    const y = 1 - (i / 12) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const phi = i * 2.399963
    pts.push(new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r).multiplyScalar(0.85 + rand(i + 3) * 0.3))
  }
  const edgeSet = new Set()
  const edges = []
  const addEdge = (a, b) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (a === b || edgeSet.has(key)) return
    edgeSet.add(key)
    edges.push([a, b])
  }
  for (let i = 1; i < pts.length; i++) {
    pts
      .map((p, j) => ({ j, d: p.distanceTo(pts[i]) }))
      .filter((o) => o.j !== i && o.j !== 0)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach((o) => addEdge(i, o.j))
    if (i % 3 === 0) addEdge(0, i)
  }

  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xa9c7d1, metalness: 0.6, roughness: 0.3 })
  const unit = new THREE.CylinderGeometry(1, 1, 1, 6)
  const up = new THREE.Vector3(0, 1, 0)
  edges.forEach(([a, b]) => {
    const dir = new THREE.Vector3().subVectors(pts[b], pts[a])
    const len = dir.length()
    const m = new THREE.Mesh(unit, edgeMat)
    m.position.copy(pts[a]).addScaledVector(dir, 0.5)
    m.quaternion.setFromUnitVectors(up, dir.normalize())
    m.scale.set(0.018, len, 0.018)
    net.add(m)
  })

  const nodeColors = [0x2db3a0, 0x7fd0ea, 0xf2b45e, 0xd8825c]
  const nodes = pts.map((p, i) => {
    const c = i === 0 ? 0x55cba1 : nodeColors[i % nodeColors.length]
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(i === 0 ? 0.2 : 0.1 + rand(i) * 0.05, 24, 16),
      new THREE.MeshPhysicalMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.2, clearcoat: 1 })
    )
    m.position.copy(p)
    net.add(m)
    return m
  })

  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true })
  const pulseGeo = new THREE.SphereGeometry(0.045, 10, 8)
  const pulses = Array.from({ length: 10 }, (_, i) => {
    const mesh = new THREE.Mesh(pulseGeo, pulseMat)
    net.add(mesh)
    return { mesh, e: Math.floor(rand(i + 40) * edges.length), t: rand(i + 50), v: 0.5 + rand(i + 60) * 0.7, flip: rand(i) > 0.5 }
  })

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.MeshBasicMaterial({ color: 0x8fd6e8, wireframe: true, transparent: true, opacity: 0.12 })
  )
  const ring = new THREE.Group()
  ring.add(new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0xbfe9f2, transparent: true, opacity: 0.5 })))
  const sats = [0, 1, 2].map(() => {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshStandardMaterial({ color: 0xf2b45e, emissive: 0xf2b45e, emissiveIntensity: 0.5 }))
    ring.add(s)
    return s
  })
  ring.rotation.x = 1.1
  group.add(shell, ring)

  let time = 0
  return {
    group,
    baseY: 2.15,
    update(dt, hover, mo) {
      time += dt * (1 + hover * 1.6) * Math.max(mo, 0.25)
      net.rotation.y = time * 0.35
      net.rotation.x = 0.2 + Math.sin(time * 0.4) * 0.08
      net.scale.setScalar(1 + hover * 0.14)
      shell.rotation.y = -time * 0.15
      ring.rotation.z = time * 0.5
      sats.forEach((s, i) => {
        const a = time * 1.1 + (i * TAU) / 3
        s.position.set(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0)
        s.rotation.set(a, a, 0)
      })
      nodes.forEach((n, i) => n.scale.setScalar(1 + Math.sin(time * 2 + i) * 0.1 + (i === 0 ? hover * 0.25 : 0)))
      pulses.forEach((p) => {
        p.t += dt * p.v * (1 + hover * 2)
        if (p.t >= 1) { p.t = 0; p.e = Math.floor(Math.random() * edges.length); p.flip = Math.random() > 0.5 }
        const [a, b] = edges[p.e]
        const from = p.flip ? pts[b] : pts[a]
        const to = p.flip ? pts[a] : pts[b]
        p.mesh.position.lerpVectors(from, to, p.t)
        p.mesh.scale.setScalar(0.8 + Math.sin(p.t * Math.PI) * 0.9)
      })
    },
  }
}

/* ---------- scene ---------- */

export function createShowroom(mount, api) {
  const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const mo = reduced ? 0.3 : 1

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.86
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y"
  mount.appendChild(canvas)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.72

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  const camBase = new THREE.Vector3()
  const lookTarget = new THREE.Vector3(0, 1.4, 0)

  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(3, 8, 6)
  key.intensity = 1.7
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 24 })
  key.shadow.bias = -0.0005
  scene.add(key)

  // slab
  const slabMat = new THREE.MeshStandardMaterial({ map: makeTerrazzoTexture(), roughness: 0.78, metalness: 0.02 })
  const slab = new THREE.Mesh(new RoundedBoxGeometry(12.4, 0.5, 4.7, 4, 0.12), slabMat)
  slab.position.y = -0.25
  slab.receiveShadow = true
  const foot = new THREE.Mesh(new RoundedBoxGeometry(13.1, 0.3, 5.3, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x9aa4a2, roughness: 0.9 }))
  foot.position.y = -0.62
  scene.add(slab, foot)

  // circuit grooves + pulses
  const S = SPACING
  const curves = [
    new THREE.CatmullRomCurve3([new THREE.Vector3(-S, 0.02, 1.45), new THREE.Vector3(-S * 0.5, 0.02, 2.0), new THREE.Vector3(0, 0.02, 1.45)]),
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.02, 1.45), new THREE.Vector3(S * 0.5, 0.02, 2.0), new THREE.Vector3(S, 0.02, 1.45)]),
  ]
  const grooveMat = new THREE.MeshStandardMaterial({ color: 0x7f8d8a, metalness: 0.8, roughness: 0.3 })
  curves.forEach((c) => scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.035, 6, false), grooveMat)))
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0x66ffcc })
  const pulseGeo = new THREE.SphereGeometry(0.075, 12, 10)
  const slabPulses = curves.flatMap((c, ci) => [0, 0.5].map((o) => {
    const m = new THREE.Mesh(pulseGeo, pulseMat)
    scene.add(m)
    return { m, points: c.getPoints(96), o, ci }
  }))

  // columns
  const builders = [buildBook, buildCapsuleCube, buildNetwork]
  const shadowTex = makeShadowTexture()
  const hitMat = new THREE.MeshBasicMaterial({ visible: false })
  const hitBoxes = []
  const columns = builders.map((build, i) => {
    const x = (i - 1) * S
    const col = new THREE.Group()
    col.position.x = x
    const ped = buildPedestal(i)
    const obj = build()
    obj.group.position.y = obj.baseY
    obj.group.traverse((m) => { if (m.isMesh && !m.material.transparent) m.castShadow = true })
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }))
    blob.rotation.x = -Math.PI / 2
    blob.position.y = ped.topY + 0.01
    const light = new THREE.PointLight(ACCENTS[i], 14, 7, 2)
    light.position.set(0, 3.2, 1.6)
    col.add(ped.group, blob, obj.group, light)
    scene.add(col)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.6, 2.4), hitMat)
    hit.position.set(x, 1.8, 0)
    hit.userData.index = i
    scene.add(hit)
    hitBoxes.push(hit)
    return { col, ped, obj, blob, light, x, hover: 0 }
  })

  // dust motes
  const M = 140
  const mp = new Float32Array(M * 3)
  for (let i = 0; i < M; i++) {
    mp[i * 3] = (rand(i) - 0.5) * 12
    mp[i * 3 + 1] = rand(i + 7) * 4.2
    mp[i * 3 + 2] = (rand(i + 11) - 0.5) * 5
  }
  const moteGeo = new THREE.BufferGeometry()
  moteGeo.setAttribute("position", new THREE.BufferAttribute(mp, 3))
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false }))
  scene.add(motes)

  /* sizing */
  const fit = () => {
    const w = mount.clientWidth || 800
    const h = mount.clientHeight || 460
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    const tan = Math.tan((camera.fov * Math.PI) / 360)
    const distW = (S * 3 * 0.58) / (tan * camera.aspect)
    const distV = (4.9 * 0.5) / tan
    const dist = Math.max(distW, distV, 9)
    camBase.set(0, dist * 0.36 + 0.4, dist * 0.93)
  }
  fit()
  camera.position.copy(camBase)
  const ro = new ResizeObserver(fit)
  ro.observe(mount)

  /* pointer */
  const pointer = new THREE.Vector2(0, 0)
  const ray = new THREE.Raycaster()
  const pick = (e) => {
    const r = canvas.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1))
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects(hitBoxes, false)[0]
    return hit ? hit.object.userData.index : -1
  }
  const onMove = (e) => {
    const idx = pick(e)
    canvas.style.cursor = idx >= 0 ? "pointer" : "default"
    api.setHover(idx)
  }
  const onLeave = () => { pointer.set(0, 0); canvas.style.cursor = "default"; api.setHover(-1) }
  const onClick = (e) => { const idx = pick(e); if (idx >= 0) api.onOpen(idx) }
  canvas.addEventListener("pointermove", onMove)
  canvas.addEventListener("pointerleave", onLeave)
  canvas.addEventListener("click", onClick)

  /* loop */
  let visible = false
  let raf = 0
  let t = 0
  let revealStart = null
  let last = performance.now()
  const smoothLook = lookTarget.clone()

  const frame = (now) => {
    raf = 0
    if (!visible || document.hidden) return
    const dt = clamp((now - last) / 1000, 0, 0.05)
    last = now
    t += dt
    if (revealStart === null) revealStart = reduced ? -10 : t
    const hoverIdx = api.hoverRef.current

    columns.forEach((c, i) => {
      c.hover = damp(c.hover, hoverIdx === i ? 1 : 0, 6, dt)
      const local = clamp((t - revealStart - i * 0.22) / 1.0, 0, 1)
      const e = 1 - Math.pow(1 - local, 3)
      c.col.position.y = (e - 1) * 2.6 + c.hover * 0.16
      c.col.visible = e > 0.01
      c.obj.group.position.y = c.obj.baseY + Math.sin(t * 1.3 + i * 1.7) * 0.07 * mo
      c.obj.update(dt, c.hover, mo)
      c.ped.plateMat.emissiveIntensity = 0.35 + c.hover * 1.1
      c.light.intensity = 14 + c.hover * 22
      c.blob.scale.setScalar(1 - Math.sin(t * 1.3 + i * 1.7) * 0.05 * mo - c.hover * 0.1)
    })

    slabPulses.forEach((p) => {
      const phase = (t * 0.12 * mo + p.o) % 1
      const u = phase < 0 ? phase + 1 : phase
      const segment = u * (p.points.length - 1)
      const index = Math.min(Math.floor(segment), p.points.length - 2)
      p.m.position.lerpVectors(p.points[index], p.points[index + 1], segment - index)
      p.m.scale.setScalar(0.7 + Math.sin(u * Math.PI) * 0.8)
    })

    const mpArr = moteGeo.attributes.position.array
    for (let i = 0; i < M; i++) {
      mpArr[i * 3 + 1] += dt * (0.05 + rand(i) * 0.1) * mo
      mpArr[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.05 * mo
      if (mpArr[i * 3 + 1] > 4.4) mpArr[i * 3 + 1] = 0
    }
    moteGeo.attributes.position.needsUpdate = true

    const hx = hoverIdx >= 0 ? columns[hoverIdx].x : 0
    const px = reduced ? 0 : pointer.x
    const py = reduced ? 0 : pointer.y
    const idle = reduced ? 0 : Math.sin(t * 0.25) * 0.5
    camera.position.x = damp(camera.position.x, camBase.x + px * 1.1 + idle + hx * 0.08, 3, dt)
    camera.position.y = damp(camera.position.y, camBase.y + py * 0.45, 3, dt)
    camera.position.z = damp(camera.position.z, camBase.z - (hoverIdx >= 0 ? 0.6 : 0), 2.5, dt)
    smoothLook.x = damp(smoothLook.x, hx * 0.18, 3, dt)
    camera.lookAt(smoothLook.x, lookTarget.y, 0)

    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) } }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) start()
  }, { threshold: 0.15 })
  io.observe(mount)
  const onVis = () => { if (!document.hidden) start() }
  document.addEventListener("visibilitychange", onVis)

  return () => {
    cancelAnimationFrame(raf)
    visible = false
    io.disconnect()
    ro.disconnect()
    document.removeEventListener("visibilitychange", onVis)
    canvas.removeEventListener("pointermove", onMove)
    canvas.removeEventListener("pointerleave", onLeave)
    canvas.removeEventListener("click", onClick)
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []
      mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose() })
    })
    envRT.dispose()
    pmrem.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    if (canvas.parentNode === mount) mount.removeChild(canvas)
  }
}
