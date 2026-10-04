import { useEffect, useRef } from "react"
import proteinSurface from "../assets/hero-protein-surface.jpg"
import "./HomepageScrollExperience.css"

const SCENES = [
  { selector: "#pharmacyOS", sceneIndex: 2, label: "Dispense" },
  { selector: "#remedacareOS", sceneIndex: 3, label: "Hospital care" },
  { selector: "#features", sceneIndex: 4, label: "Learn" },
  { selector: "#courses", sceneIndex: 5, label: "Practice" },
  { selector: ".blog-preview-section", sceneIndex: 6, label: "Field notes" },
  { selector: "#faq", sceneIndex: 7, label: "Answers" },
  { selector: "#cta", sceneIndex: 8, label: "Begin" },
]

export default function HomepageScrollExperience() {
  const mountRef = useRef(null)
  const progressRef = useRef({ value: 0, pointerX: 0, pointerY: 0 })

  useEffect(() => {
    const mount = mountRef.current
    const home = mount?.closest(".home")
    if (!mount || !home) return undefined

    let cancelled = false
    let disposeScene

    const initializeScene = async () => {
      const THREE = await import("three")
      const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js")
      if (cancelled) return

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4))
      renderer.setSize(mount.clientWidth || window.innerWidth, mount.clientHeight || window.innerHeight)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.18
      renderer.setClearColor(0x000000, 0)
      mount.appendChild(renderer.domElement)

      const materials = []
      const textures = []
      const material = (color, options = {}) => {
        const created = new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.3,
          metalness: 0.08,
          clearcoat: 0.8,
          clearcoatRoughness: 0.18,
          ...options,
        })
        materials.push(created)
        return created
      }
      const addMesh = (parent, geometry, surface, position = [0, 0, 0], rotation = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geometry, surface)
        mesh.position.set(...position)
        mesh.rotation.set(...rotation)
        parent.add(mesh)
        return mesh
      }
      const addBox = (parent, size, surface, position = [0, 0, 0], rotation = [0, 0, 0]) =>
        addMesh(parent, new THREE.BoxGeometry(...size), surface, position, rotation)
      const addCapsule = (parent, surface, radius = 0.28, length = 1.05, position = [0, 0, 0], rotation = [0, 0, Math.PI / 2]) =>
        addMesh(parent, new THREE.CapsuleGeometry(radius, length, 8, 24), surface, position, rotation)

      const pmrem = new THREE.PMREMGenerator(renderer)
      const room = new RoomEnvironment()
      scene.environment = pmrem.fromScene(room, 0.04).texture
      pmrem.dispose()

      scene.add(new THREE.HemisphereLight(0xeafff5, 0x14352c, 2.2))
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.2)
      keyLight.position.set(-4, 7, 8)
      scene.add(keyLight)
      const rimLight = new THREE.DirectionalLight(0x8dd6f5, 2.1)
      rimLight.position.set(5, 1, -5)
      scene.add(rimLight)
      const warmLight = new THREE.PointLight(0xffaa6b, 34, 18)
      warmLight.position.set(-5, 1, 5)
      scene.add(warmLight)

      const textureLoader = new THREE.TextureLoader()
      const surfaceTexture = textureLoader.load(proteinSurface)
      surfaceTexture.colorSpace = THREE.SRGBColorSpace
      textures.push(surfaceTexture)

      const glassMaterial = material(0x8ddcc9, { roughness: 0.12, metalness: 0.08, transmission: 0.42, thickness: 0.7 })
      const goldMaterial = material(0xf2bb69, { roughness: 0.22, metalness: 0.76, clearcoat: 0.5 })
      const coralMaterial = material(0xff806d, { roughness: 0.22, metalness: 0.12 })
      const blueMaterial = material(0x6dbbd6, { roughness: 0.19, metalness: 0.18 })
      const inkMaterial = material(0x31554b, { roughness: 0.58, clearcoat: 0.15 })
      const glowMaterial = material(0x5be0b4, { color: 0x5be0b4, emissive: 0x1cae7a, emissiveIntensity: 2.1, roughness: 0.22 })

      const world = new THREE.Group()
      scene.add(world)
      const spacing = 7.4
      const sceneGroups = []
      const addScene = (index) => {
        const group = new THREE.Group()
        group.position.y = -index * spacing
        world.add(group)
        sceneGroups.push(group)
        return group
      }
      const addFloorRing = (group, color = 0x47c5a0) => {
        addMesh(group, new THREE.TorusGeometry(2.2, 0.018, 8, 128), material(color, { transparent: true, opacity: 0.55, metalness: 0.44, roughness: 0.28 }), [-0.15, -1.45, 0], [-Math.PI / 2, 0, 0])
      }

      const heroScene = addScene(0)
      const heroCapsule = new THREE.Group()
      const heroShell = addCapsule(heroCapsule, glassMaterial, 0.62, 2.8)
      heroShell.scale.set(1.7, 1.2, 1.14)
      heroCapsule.position.set(-0.5, 0.25, 0)
      heroScene.add(heroCapsule)
      const coreMaterial = material(0xffffff, { map: surfaceTexture, roughness: 0.22, metalness: 0.12, clearcoat: 1 })
      addMesh(heroCapsule, new THREE.SphereGeometry(0.74, 36, 28), coreMaterial, [0, 0, 0.05])
      const heroOrbit = []
      for (let index = 0; index < 3; index += 1) {
        const ring = addMesh(heroScene, new THREE.TorusGeometry(2.25 + index * 0.24, 0.018, 10, 128), material([0x4ed1a7, 0xffbb69, 0x8ac9e0][index], { metalness: 0.52, roughness: 0.22, transparent: true, opacity: 0.74 }), [-0.5, 0.2, -0.4])
        ring.rotation.set(0.4 + index * 0.55, 0.3, index * 0.35)
        heroOrbit.push(ring)
      }
      const heroParticles = new THREE.Group()
      for (let index = 0; index < 24; index += 1) {
        const bead = addMesh(heroParticles, new THREE.SphereGeometry(0.045 + (index % 3) * 0.018, 12, 10), [goldMaterial, coralMaterial, blueMaterial][index % 3])
        const angle = index * 2.399
        bead.position.set(Math.cos(angle) * (1.5 + index % 3 * 0.22), Math.sin(angle * 1.4) * 1.85, Math.sin(angle) * 0.62)
      }
      heroScene.add(heroParticles)
      addFloorRing(heroScene)

      const ecosystemScene = addScene(1)
      const productOrbit = new THREE.Group()
      ecosystemScene.add(productOrbit)
      const productColors = [0x40c7a0, 0xf0b45e, 0x76bfe0]
      productColors.forEach((color, index) => {
        const orb = addMesh(productOrbit, new THREE.IcosahedronGeometry(0.76, 2), material(color, { roughness: 0.2, metalness: 0.18, clearcoat: 1 }), [-1.55 + index * 1.55, 0.25 + (index % 2) * 0.48, 0])
        orb.scale.setScalar(1.15)
        addMesh(productOrbit, new THREE.TorusGeometry(1.02, 0.018, 8, 96), material(color, { metalness: 0.52, roughness: 0.2, transparent: true, opacity: 0.52 }), [-1.55 + index * 1.55, 0.25 + (index % 2) * 0.48, 0], [0.8, index * 0.5, 0.3])
      })

      const posScene = addScene(2)
      const counter = new THREE.Group()
      counter.position.set(-0.4, -0.25, 0)
      posScene.add(counter)
      addBox(counter, [5.5, 0.24, 3.45], material(0xb8c7bf, { metalness: 0.8, roughness: 0.24 }), [0, 0.05, 0], [0.18, 0.1, 0])
      addBox(counter, [5.08, 0.19, 3.1], material(0x163f37, { roughness: 0.34, metalness: 0.22 }), [0, -0.18, 0])
      const pills = []
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 5; column += 1) {
          const dome = addMesh(counter, new THREE.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassMaterial, [-1.76 + column * 0.88, 0.25, -0.88 + row * 0.88])
          const pill = addCapsule(counter, [goldMaterial, coralMaterial, blueMaterial][(row + column) % 3], 0.11, 0.34, [-1.76 + column * 0.88, 0.18, -0.88 + row * 0.88], [0.1, 0, Math.PI / 2])
          dome.scale.y = 0.72
          pills.push(pill)
        }
      }
      const scanBeam = addBox(counter, [5.25, 0.045, 0.045], material(0xff565d, { emissive: 0xe92639, emissiveIntensity: 2.8, transparent: true, opacity: 0.9 }), [0, 0.52, -1.2])
      const receipt = new THREE.Group()
      addBox(receipt, [0.88, 0.035, 1.28], material(0xf3efe2, { roughness: 0.82 }), [0, 0, 0])
      for (let index = 0; index < 5; index += 1) addBox(receipt, [0.48 + (index % 2) * 0.18, 0.01, 0.025], inkMaterial, [-0.08, 0.03, -0.42 + index * 0.16])
      receipt.position.set(-1.72, 0.3, 1.58)
      receipt.rotation.x = -0.18
      counter.add(receipt)
      const phone = new THREE.Group()
      addBox(phone, [0.68, 0.13, 1.18], material(0x1d302e, { metalness: 0.72, roughness: 0.2 }), [0, 0, 0], [-0.12, 0, 0])
      addBox(phone, [0.56, 0.035, 0.98], material(0xc7f2dc, { emissive: 0x1b7652, emissiveIntensity: 0.5, roughness: 0.24 }), [0, 0.085, 0], [-0.12, 0, 0])
      addMesh(phone, new THREE.TorusGeometry(0.14, 0.035, 10, 28, Math.PI * 1.5), glowMaterial, [0, 0.112, 0], [0, 0, -0.2])
      phone.position.set(2.02, 0.44, 0.68)
      counter.add(phone)
      const coins = new THREE.Group()
      for (let index = 0; index < 5; index += 1) {
        const coin = addMesh(coins, new THREE.CylinderGeometry(0.28, 0.28, 0.09, 36), goldMaterial, [Math.cos(index * 1.25) * 1.18, 0.85 + (index % 2) * 0.2, Math.sin(index * 1.25) * 0.46], [Math.PI / 2, 0, 0])
        addMesh(coins, new THREE.TorusGeometry(0.18, 0.012, 6, 32), material(0xffe0a2, { metalness: 0.82, roughness: 0.18 }), coin.position.toArray(), [Math.PI / 2, 0, 0])
      }
      posScene.add(coins)
      const bottle = new THREE.Group()
      addMesh(bottle, new THREE.CylinderGeometry(0.25, 0.29, 0.78, 32), material(0xd58d47, { roughness: 0.2, transmission: 0.18, thickness: 0.5 }), [0, 0, 0])
      addMesh(bottle, new THREE.CylinderGeometry(0.17, 0.18, 0.2, 24), inkMaterial, [0, 0.48, 0])
      addBox(bottle, [0.46, 0.32, 0.035], material(0xf3ead6, { roughness: 0.7 }), [0, 0.02, 0.27])
      bottle.position.set(2.6, 0.58, -0.55)
      posScene.add(bottle)
      addFloorRing(posScene)

      const hospitalScene = addScene(3)
      const building = new THREE.Group()
      building.position.set(-0.35, -0.28, 0)
      hospitalScene.add(building)
      const towerMaterial = material(0x86b8bc, { metalness: 0.28, roughness: 0.2, transmission: 0.14, thickness: 0.5 })
      addBox(building, [2.4, 4.5, 1.48], towerMaterial, [0, 0.65, 0])
      addBox(building, [3.35, 1.95, 1.42], material(0x315765, { metalness: 0.34, roughness: 0.3 }), [-1.78, -0.58, -0.02])
      addBox(building, [1.8, 1.45, 1.35], material(0x294c58, { metalness: 0.28, roughness: 0.3 }), [2.08, -0.82, -0.04])
      const floorMaterials = []
      for (let floor = 0; floor < 5; floor += 1) {
        const lit = material(0xffd17c, { emissive: 0x9e5d21, emissiveIntensity: 0.14, roughness: 0.26 })
        floorMaterials.push(lit)
        addBox(building, [2.02, 0.045, 0.025], inkMaterial, [0, -1.4 + floor * 0.83, 0.77])
        for (let column = 0; column < 4; column += 1) {
          addBox(building, [0.28, 0.3, 0.045], lit, [-0.76 + column * 0.51, -1.08 + floor * 0.83, 0.79])
        }
      }
      const kiosk = new THREE.Group()
      addBox(kiosk, [0.56, 0.88, 0.34], inkMaterial, [0, 0, 0])
      addBox(kiosk, [0.43, 0.36, 0.035], glowMaterial, [0, 0.12, 0.19])
      kiosk.position.set(2.85, -1.18, 0.55)
      building.add(kiosk)
      const pulsePath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.3, -1.4, 0.86),
        new THREE.Vector3(0.35, -0.88, 0.9),
        new THREE.Vector3(0.58, -0.25, 0.92),
        new THREE.Vector3(0.8, 0.42, 0.92),
        new THREE.Vector3(1.15, 0.92, 0.92),
        new THREE.Vector3(2.52, -0.92, 0.7),
      ])
      const pulse = addMesh(building, new THREE.TubeGeometry(pulsePath, 72, 0.026, 8, false), glowMaterial)
      addFloorRing(hospitalScene, 0x68bddd)

      const learningScene = addScene(4)
      const book = new THREE.Group()
      addBox(book, [1.42, 0.18, 2.1], inkMaterial, [-0.73, 0, 0], [0, 0, -0.12])
      addBox(book, [1.38, 0.14, 2.04], material(0xfff7e6, { roughness: 0.86 }), [0.72, 0.02, 0], [0, 0, 0.12])
      addBox(book, [0.12, 0.18, 2.12], goldMaterial, [0, 0, 0])
      for (let page = 0; page < 6; page += 1) {
        const sheet = addBox(book, [1.26, 0.022, 1.9], material(0xfff9ed, { roughness: 0.9 }), [0.7, 0.1 + page * 0.025, 0], [0, 0, 0.12 + page * 0.012])
        sheet.userData.page = page
      }
      book.position.set(-0.6, -0.6, 0)
      learningScene.add(book)
      const certificate = new THREE.Group()
      addBox(certificate, [1.42, 1.8, 0.08], material(0xe4c47e, { metalness: 0.42, roughness: 0.3 }), [0, 0, 0])
      addBox(certificate, [1.24, 1.58, 0.035], material(0xfffbef, { roughness: 0.8 }), [0, 0, 0.06])
      for (let line = 0; line < 4; line += 1) addBox(certificate, [0.78 - (line % 2) * 0.18, 0.025, 0.02], inkMaterial, [0, 0.36 - line * 0.21, 0.09])
      addMesh(certificate, new THREE.TorusGeometry(0.21, 0.035, 10, 36), goldMaterial, [0, -0.52, 0.11])
      certificate.position.set(1.4, 0.65, 0.05)
      certificate.rotation.set(-0.1, -0.2, -0.17)
      learningScene.add(certificate)
      const orbitMolecule = new THREE.Group()
      const organic = material(0xffffff, { map: surfaceTexture, roughness: 0.24, metalness: 0.06, clearcoat: 1 })
      ;[[-0.52, 0.28, 0], [0.48, 0.62, 0.12], [0.1, -0.34, 0.2], [-0.45, -0.58, -0.08]].forEach(([x, y, z], index) => {
        addMesh(orbitMolecule, new THREE.SphereGeometry(index === 0 ? 0.34 : 0.24, 24, 18), index % 2 ? blueMaterial : organic, [x, y, z])
      })
      orbitMolecule.position.set(1.8, 1.25, 0.5)
      learningScene.add(orbitMolecule)

      const coursesScene = addScene(5)
      const helix = new THREE.Group()
      for (let step = 0; step < 18; step += 1) {
        const angle = step * 0.58
        const y = -1.8 + step * 0.21
        const left = new THREE.Vector3(Math.cos(angle) * 0.78, y, Math.sin(angle) * 0.35)
        const right = new THREE.Vector3(-Math.cos(angle) * 0.78, y, -Math.sin(angle) * 0.35)
        addMesh(helix, new THREE.SphereGeometry(0.11, 16, 12), step % 2 ? blueMaterial : coralMaterial, left.toArray())
        addMesh(helix, new THREE.SphereGeometry(0.11, 16, 12), step % 2 ? goldMaterial : glowMaterial, right.toArray())
        const rungVector = right.clone().sub(left)
        const rung = addMesh(helix, new THREE.CylinderGeometry(0.028, 0.028, rungVector.length(), 8), goldMaterial, left.clone().add(right).multiplyScalar(0.5).toArray())
        rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rungVector.normalize())
      }
      helix.position.set(-0.45, 0.15, 0)
      coursesScene.add(helix)
      const courseVariants = []
      for (let index = 0; index < 4; index += 1) {
        const orbit = new THREE.Group()
        const angle = index * Math.PI / 2
        orbit.position.set(1.52 + Math.cos(angle) * 1.14, Math.sin(angle) * 1.06, 0.45)
        addMesh(orbit, new THREE.IcosahedronGeometry(0.44, 1), [goldMaterial, glowMaterial, blueMaterial, coralMaterial][index])
        const loop = addMesh(orbit, new THREE.TorusGeometry(0.61, 0.024, 8, 64), [goldMaterial, glowMaterial, blueMaterial, coralMaterial][index], [0, 0, 0], [0.45, angle, 0.2])
        loop.userData.variant = index
        coursesScene.add(orbit)
        courseVariants.push(orbit)
      }

      const blogScene = addScene(6)
      const journal = new THREE.Group()
      for (let page = 0; page < 4; page += 1) {
        const sheet = addBox(journal, [1.95, 0.07, 2.55], page % 2 ? material(0xf4ebd8, { roughness: 0.82 }) : material(0x1d765e, { roughness: 0.4 }), [0, page * 0.09, page * -0.1], [0, page * 0.08, 0.06 - page * 0.07])
        sheet.userData.pageIndex = page
      }
      journal.position.set(-0.8, -0.78, 0)
      journal.rotation.x = -0.32
      blogScene.add(journal)
      const drip = new THREE.Group()
      addMesh(drip, new THREE.CylinderGeometry(0.3, 0.28, 0.94, 32), material(0xb7793c, { roughness: 0.16, transmission: 0.42, thickness: 0.8, metalness: 0.08 }), [0, 0, 0])
      addMesh(drip, new THREE.CylinderGeometry(0.2, 0.23, 0.28, 28), inkMaterial, [0, 0.6, 0])
      addMesh(drip, new THREE.TorusGeometry(0.3, 0.028, 8, 32), goldMaterial, [0, -0.18, 0])
      drip.position.set(1.55, 0.72, 0.42)
      drip.rotation.z = -0.28
      blogScene.add(drip)
      const dripDrop = addMesh(blogScene, new THREE.SphereGeometry(0.13, 18, 14), blueMaterial, [1.74, -0.25, 0.5])
      addCapsule(blogScene, coralMaterial, 0.16, 0.62, [2.1, -0.82, 0.5], [0.4, 0.2, 0.7])

      const faqScene = addScene(7)
      const speech = new THREE.Group()
      const bubbleShell = addCapsule(speech, material(0x70d7b6, { transparent: true, opacity: 0.72, transmission: 0.24, metalness: 0.12, roughness: 0.18 }), 0.48, 1.36, [-0.65, 0.25, 0], [0, 0, Math.PI / 2])
      bubbleShell.scale.set(1.25, 0.72, 0.52)
      addMesh(speech, new THREE.ConeGeometry(0.25, 0.42, 3), glassMaterial, [-1.55, -0.5, 0.05], [0, 0, 0.55])
      for (let dot = 0; dot < 3; dot += 1) {
        addMesh(speech, new THREE.SphereGeometry(0.095, 16, 12), material(0xf6f1e2, { emissive: 0xb2ead3, emissiveIntensity: 0.55 }), [-1.12 + dot * 0.48, 0.25, 0.62])
      }
      const answerPulse = addMesh(speech, new THREE.TorusGeometry(1.72, 0.025, 8, 128), glowMaterial, [-0.65, 0.25, 0], [0.5, 0.4, 0.1])
      faqScene.add(speech)

      const ctaScene = addScene(8)
      const ctaCapsule = new THREE.Group()
      const capLeft = addCapsule(ctaCapsule, material(0x52d3a7, { roughness: 0.16, metalness: 0.18, clearcoat: 1 }), 0.55, 2.0, [-0.4, 0, 0])
      const capRight = addCapsule(ctaCapsule, material(0xff8871, { roughness: 0.16, metalness: 0.16, clearcoat: 1 }), 0.55, 2.0, [0.4, 0, 0])
      capLeft.scale.set(0.95, 0.8, 0.9)
      capRight.scale.set(0.95, 0.8, 0.9)
      ctaCapsule.position.set(-0.5, 0.25, 0.1)
      ctaScene.add(ctaCapsule)
      const core = addMesh(ctaScene, new THREE.IcosahedronGeometry(0.52, 2), material(0xffcf72, { emissive: 0xffa745, emissiveIntensity: 1.8, roughness: 0.18, metalness: 0.18 }), [-0.5, 0.25, 0.4])
      const ctaRings = []
      for (let index = 0; index < 3; index += 1) {
        const ring = addMesh(ctaScene, new THREE.TorusGeometry(2.32 + index * 0.24, 0.025, 8, 96), [glowMaterial, goldMaterial, coralMaterial][index], [-0.5, 0.25, -0.4], [0.8 + index * 0.42, index * 0.5, 0.25])
        ctaRings.push(ring)
      }
      const confetti = []
      for (let index = 0; index < 24; index += 1) {
        const pill = addCapsule(ctaScene, [glowMaterial, goldMaterial, blueMaterial, coralMaterial][index % 4], 0.1, 0.32, [-0.5, 0.25, 0])
        confetti.push(pill)
      }

      const sectionElements = []
      const collectSections = () => {
        sectionElements.length = 0
        SCENES.forEach((item) => {
          const element = home.querySelector(item.selector)
          if (!element) return
          sectionElements.push({ sceneIndex: item.sceneIndex, element, label: item.label })
        })
        sectionElements.sort((left, right) =>
          left.element.getBoundingClientRect().top - right.element.getBoundingClientRect().top
        )
      }

      let isMobile = window.matchMedia("(max-width: 640px)").matches
      let courseMode = 0
      let faqOpen = false
      let burstAt = -Infinity
      let pointerDown = false
      let pointerStart = 0
      let scrollFrame
      let animationFrame
      const updateProgress = () => {
        if (scrollFrame) return
        scrollFrame = window.requestAnimationFrame(() => {
          scrollFrame = undefined
          collectSections()
          const markers = sectionElements.map(({ sceneIndex, element }) => ({
            sceneIndex,
            center: window.scrollY + element.getBoundingClientRect().top + element.getBoundingClientRect().height * 0.42,
          }))
          if (markers.length < 2) return
          const target = window.scrollY + window.innerHeight * 0.52
          if (target < markers[0].center - window.innerHeight * 0.35) {
            progressRef.current.value = -1
            return
          }
          if (target <= markers[0].center) {
            progressRef.current.value = markers[0].sceneIndex
            return
          }
          if (target <= markers[0].center) {
            progressRef.current.value = markers[0].sceneIndex
            return
          }
          for (let index = 0; index < markers.length - 1; index += 1) {
            const current = markers[index]
            const next = markers[index + 1]
            if (target > next.center) continue
            const amount = THREE.MathUtils.clamp((target - current.center) / Math.max(1, next.center - current.center), 0, 1)
            progressRef.current.value = current.sceneIndex + (next.sceneIndex - current.sceneIndex) * amount
            return
          }
          progressRef.current.value = markers[markers.length - 1].sceneIndex
        })
      }

      const handlePointerMove = (event) => {
        if (pointerDown) {
          progressRef.current.pointerX += (event.clientX - pointerStart) * 0.0018
          pointerStart = event.clientX
        }
        progressRef.current.pointerY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 0.6
      }
      const handlePointerDown = (event) => {
        if (event.pointerType !== "mouse") return
        pointerDown = true
        pointerStart = event.clientX
      }
      const handlePointerUp = () => { pointerDown = false }
      const handleCourseMode = (event) => { courseMode = Number(event.detail) || 0 }
      const handleFaqToggle = (event) => { faqOpen = Boolean(event.detail) }
      const handleCtaBurst = () => { burstAt = performance.now() }
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

      window.addEventListener("scroll", updateProgress, { passive: true })
      window.addEventListener("resize", updateProgress)
      window.addEventListener("pointermove", handlePointerMove, { passive: true })
      window.addEventListener("pointerdown", handlePointerDown, { passive: true })
      window.addEventListener("pointerup", handlePointerUp, { passive: true })
      window.addEventListener("homepage-course-artifact", handleCourseMode)
      window.addEventListener("homepage-faq-toggle", handleFaqToggle)
      window.addEventListener("homepage-cta-burst", handleCtaBurst)

      const resizeObserver = new ResizeObserver(() => {
        isMobile = window.matchMedia("(max-width: 640px)").matches
        const width = mount.clientWidth || window.innerWidth
        const height = mount.clientHeight || window.innerHeight
        camera.aspect = width / height
        camera.fov = isMobile ? 37 : 34
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
        updateProgress()
      })
      resizeObserver.observe(home)
      collectSections()
      updateProgress()

      const animate = (time) => {
        const seconds = time * 0.001
        const travel = progressRef.current.value
        if (travel < 0) {
          sceneGroups.forEach((group) => { group.visible = false })
          renderer.clear()
          animationFrame = window.requestAnimationFrame(animate)
          return
        }
        const sceneIndex = THREE.MathUtils.clamp(Math.floor(travel), 0, sceneGroups.length - 1)
        const localProgress = THREE.MathUtils.clamp(travel - sceneIndex, 0, 1)
        const mobileOffset = isMobile ? (sceneIndex < 4 ? 1.6 : 4) : 0.08
        const cameraTargetY = -travel * spacing + mobileOffset
        const targetX = isMobile && (sceneIndex === 2 || sceneIndex === 3) ? 1.15 : isMobile ? 0 : 0.35
        const motion = reducedMotion.matches ? 0 : 1

        camera.position.x += (targetX + progressRef.current.pointerX * 0.38 - camera.position.x) * 0.055
        camera.position.y += (cameraTargetY + progressRef.current.pointerY * 0.22 - camera.position.y) * 0.09
        camera.position.z += ((isMobile ? 12.6 : 13.2) - camera.position.z) * 0.06
        camera.lookAt(targetX + progressRef.current.pointerX * 0.16, cameraTargetY, 0)

        sceneGroups.forEach((group, index) => {
          const distance = Math.abs(travel - index)
          const presence = THREE.MathUtils.clamp(1.12 - distance, 0, 1)
          group.visible = presence > 0.2
          const entrance = (0.72 + presence * 0.28) * (isMobile && index === 7 ? 0.82 : 1)
          group.scale.setScalar(entrance)
          group.rotation.y = Math.sin(seconds * 0.22 + index) * 0.045 * motion + progressRef.current.pointerX * 0.055
          group.rotation.x = Math.sin(seconds * 0.25 + index * 1.3) * 0.022 * motion
          group.position.x = isMobile ? 0 : 0.45
        })

        heroCapsule.rotation.z = Math.sin(seconds * 0.3) * 0.08 * motion
        heroCapsule.rotation.y = seconds * 0.12 * motion
        heroOrbit.forEach((ring, index) => { ring.rotation.z += (index % 2 ? 1 : -1) * 0.0018 * motion })
        heroParticles.rotation.y = seconds * 0.24 * motion
        productOrbit.rotation.y = seconds * 0.12 * motion

        scanBeam.position.z = -1.2 + Math.sin(seconds * 1.35) * 1.1
        bottle.position.y = 0.58 + Math.sin(seconds * 1.8) * 0.12 * motion
        coins.rotation.y = seconds * 0.42 * motion
        counter.position.set(isMobile ? 2.15 : -0.4, isMobile ? 0.48 : -0.25, isMobile ? 1.1 : 0)
        coins.position.set(isMobile ? 2.45 : 0, isMobile ? 0.7 : 0, isMobile ? 1.15 : 0)
        bottle.position.x = isMobile ? 2.25 : 2.6
        building.position.set(isMobile ? 1.75 : -0.35, isMobile ? 0.28 : -0.28, isMobile ? 0.72 : 0)
        pills.forEach((pill, index) => {
          const phase = seconds * 1.6 - index * 0.45
          pill.position.y = 0.18 + Math.max(0, Math.sin(phase)) * 0.2 * motion
        })
        floorMaterials.forEach((floorMaterial, index) => {
          const floorProgress = ((localProgress * floorMaterials.length) - index + seconds * 0.08) % floorMaterials.length
          const lit = sceneIndex === 3 ? Math.max(0, 1 - Math.abs(floorProgress - 0.5) * 1.5) : Math.max(0, Math.sin(seconds * 1.3 - index * 0.7)) * 0.18
          floorMaterial.emissiveIntensity = 0.15 + lit * 1.6
        })
        pulse.material.opacity = 0.35 + (sceneIndex === 3 ? localProgress * 0.55 : 0.1)
        book.rotation.y = Math.sin(seconds * 0.38) * 0.14 * motion
        certificate.rotation.y = -0.2 + Math.sin(seconds * 0.3) * 0.08 * motion
        orbitMolecule.rotation.y += 0.004 * motion
        helix.rotation.y = seconds * 0.24 * motion
        courseVariants.forEach((variant, index) => {
          const active = index === courseMode ? 1 : 0.64
          variant.scale.setScalar(active + Math.sin(seconds * 1.3 + index) * 0.055 * motion)
          variant.rotation.y = seconds * (index % 2 ? -0.28 : 0.28) * motion
        })
        journal.rotation.y = Math.sin(seconds * 0.36) * 0.13 * motion
        drip.rotation.z = -0.28 + Math.sin(seconds * 0.8) * 0.08 * motion
        dripDrop.position.y = -0.25 - (seconds * 0.5 % 1.1)
        answerPulse.rotation.z = seconds * 0.28 * motion
        bubbleShell.rotation.z = Math.sin(seconds * 0.72) * 0.08 * motion
        const answerLift = faqOpen ? 1.08 : 1 + Math.sin(seconds * 0.8) * 0.025 * motion
        speech.scale.setScalar(answerLift)
        speech.rotation.y = Math.sin(seconds * 0.52) * 0.08 * motion

        const burstProgress = THREE.MathUtils.clamp(1 - (performance.now() - burstAt) / 950, 0, 1)
        const split = Math.max(sceneIndex === 8 ? Math.max(0, (localProgress - 0.32) * 1.35) : 0, burstProgress) * motion
        capLeft.position.x = -0.4 - split * 0.76
        capRight.position.x = 0.4 + split * 0.76
        core.scale.setScalar(0.58 + split * 1.45 + Math.sin(seconds * 1.8) * 0.045 * motion)
        ctaRings.forEach((ring, index) => { ring.rotation.z += (index % 2 ? -1 : 1) * 0.0025 * motion })
        confetti.forEach((pill, index) => {
          const angle = index * 2.399 + seconds * 0.32 * motion
          const radius = split * (1.3 + (index % 4) * 0.22)
          pill.visible = split > 0.05
          pill.position.set(-0.5 + Math.cos(angle) * radius, 0.25 + Math.sin(angle) * radius, Math.sin(angle * 2) * 0.5)
          pill.rotation.z = angle
        })

        if (document.visibilityState === "visible") renderer.render(scene, camera)
        animationFrame = window.requestAnimationFrame(animate)
      }
      animationFrame = window.requestAnimationFrame(animate)

      disposeScene = () => {
        window.cancelAnimationFrame(animationFrame)
        if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
        window.removeEventListener("scroll", updateProgress)
        window.removeEventListener("resize", updateProgress)
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerdown", handlePointerDown)
        window.removeEventListener("pointerup", handlePointerUp)
        window.removeEventListener("homepage-course-artifact", handleCourseMode)
        window.removeEventListener("homepage-faq-toggle", handleFaqToggle)
        window.removeEventListener("homepage-cta-burst", handleCtaBurst)
        resizeObserver.disconnect()
        scene.traverse((object) => object.geometry?.dispose())
        materials.forEach((entry) => entry.dispose())
        textures.forEach((entry) => entry.dispose())
        scene.environment?.dispose()
        renderer.dispose()
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      }
    }

    initializeScene().catch((error) => console.error("Failed to initialize homepage 3D narrative:", error))
    return () => {
      cancelled = true
      disposeScene?.()
    }
  }, [])

  return <div ref={mountRef} className="homepage-scroll-experience" aria-hidden="true" />
}