import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, BookOpen, Building2, Pill } from "lucide-react"
import "./ThreeProductScroll.css"

const CHAPTERS = [
  {
    key: "pharmacourse",
    label: "Pharmacourse",
    number: "01",
    eyebrow: "LEARN WITH PURPOSE",
    title: "Knowledge you can put to work.",
    description: "Practical CPD learning, clinical cases, and resources designed around real pharmacy practice.",
    href: "/courses",
    action: "Explore Pharmacourse",
    icon: BookOpen,
  },
  {
    key: "pos",
    label: "RemedacarePOS",
    number: "02",
    eyebrow: "RUN PHARMACY, CLEARLY",
    title: "Every dispense in its place.",
    description: "Connect prescriptions, stock, branches, and patient requests in one pharmacy workflow.",
    href: "/remedacarepos",
    action: "Explore RemedacarePOS",
    icon: Pill,
  },
  {
    key: "hmis",
    label: "RemedacareHMIS",
    number: "03",
    eyebrow: "CONNECT THE CARE TEAM",
    title: "Make the whole hospital move together.",
    description: "Bring patient records, departments, and clinical decisions into a connected view.",
    href: "/remedacarehmis",
    action: "Explore RemedacareHMIS",
    icon: Building2,
  },
]

export default function ThreeProductScroll() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const progressRef = useRef(0)
  const activeRef = useRef(0)
  const autoplayProgressRef = useRef(0)
  const autoplayModeRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeChapter = CHAPTERS[activeIndex]
  const ActiveIcon = activeChapter.icon

  useEffect(() => {
    const section = sectionRef.current
    const mount = canvasRef.current
    if (!section || !mount) return undefined

    let cancelled = false
    let disposeScene

    const initializeScene = async () => {
      const THREE = await import("three")
      if (cancelled) return

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a1918)
      scene.fog = new THREE.Fog(0x0a1918, 10, 24)
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80)
      camera.position.set(0, 1.9, 10.2)
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.setSize(mount.clientWidth || 640, mount.clientHeight || 620)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      mount.appendChild(renderer.domElement)

      const materials = []
      const makeMaterial = (color, options = {}) => {
        const created = new THREE.MeshStandardMaterial({ color, roughness: 0.48, ...options })
        materials.push(created)
        return created
      }

      scene.add(new THREE.HemisphereLight(0xe9fff6, 0x12382f, 2.2))
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.4)
      keyLight.position.set(-3, 6, 5)
      scene.add(keyLight)
      const greenLight = new THREE.PointLight(0x35d2a5, 18, 11)
      greenLight.position.set(2.5, 2, -2)
      scene.add(greenLight)
      const coralLight = new THREE.PointLight(0xffa374, 9, 8)
      coralLight.position.set(-3, 0, 3)
      scene.add(coralLight)

      const world = new THREE.Group()
      scene.add(world)
      const stage = new THREE.Group()
      stage.position.x = -0.3
      world.add(stage)
      const baseRing = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.012, 8, 128),
        makeMaterial(0x3ac7a1, { transparent: true, opacity: 0.5, metalness: 0.4 })
      )
      baseRing.name = "base-ring"
      baseRing.rotation.x = -Math.PI / 2
      baseRing.position.y = -0.05
      stage.add(baseRing)

      const pharmacist = new THREE.Group()
      pharmacist.position.x = 0.08
      pharmacist.name = "guide"
      stage.add(pharmacist)

      const coat = makeMaterial(0xf3f8f5, { roughness: 0.72 })
      const coatShadow = makeMaterial(0xd3e5dd, { roughness: 0.8 })
      const skin = makeMaterial(0x895c46, { roughness: 0.8 })
      const hair = makeMaterial(0x2d2522, { roughness: 0.88 })
      const shirt = makeMaterial(0x268a70, { roughness: 0.48 })
      const trousers = makeMaterial(0x263d4b, { roughness: 0.76 })
      const shoe = makeMaterial(0xf0e7d8, { roughness: 0.84 })
      const metal = makeMaterial(0xa7c4c5, { metalness: 0.72, roughness: 0.28 })
      const eye = makeMaterial(0x182522, { roughness: 0.4 })

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.72, 6, 18), coat)
      torso.position.y = 1.7
      torso.scale.set(0.96, 1.1, 0.68)
      pharmacist.add(torso)
      const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.92, 0.08), shirt)
      shirtFront.position.set(0, 1.73, 0.32)
      pharmacist.add(shirtFront)

      const leftLap = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.43, 0.1), coatShadow)
      leftLap.position.set(-0.15, 2.1, 0.35)
      leftLap.rotation.z = -0.34
      const rightLap = leftLap.clone()
      rightLap.position.x = 0.15
      rightLap.rotation.z = 0.34
      pharmacist.add(leftLap, rightLap)

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.22, 20), skin)
      neck.position.y = 2.34
      pharmacist.add(neck)
      const head = new THREE.Group()
      head.position.y = 2.78
      head.name = "guide-head"
      pharmacist.add(head)
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.39, 32, 24), skin)
      face.scale.set(0.83, 1.08, 0.86)
      head.add(face)
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.41, 28, 20), hair)
      hairCap.scale.set(0.88, 0.58, 0.88)
      hairCap.position.set(0, 0.22, -0.04)
      head.add(hairCap)
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.34), hair)
      fringe.position.set(0, 0.22, 0.24)
      head.add(fringe)

      const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), eye)
      leftEye.position.set(-0.105, 0.015, 0.32)
      const rightEye = leftEye.clone()
      rightEye.position.x = 0.105
      head.add(leftEye, rightEye)
      const glassesMaterial = makeMaterial(0x49605a, { metalness: 0.55, roughness: 0.28 })
      const leftLens = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.011, 8, 22), glassesMaterial)
      leftLens.position.set(-0.11, 0.015, 0.35)
      const rightLens = leftLens.clone()
      rightLens.position.x = 0.11
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.016, 0.014), glassesMaterial)
      bridge.position.set(0, 0.015, 0.36)
      head.add(leftLens, rightLens, bridge)

      const armPivots = []
      const hands = []
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.55, 5, 14), trousers)
        leg.position.set(side * 0.2, 0.36, 0)
        pharmacist.add(leg)
        const shoeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 12), shoe)
        shoeMesh.scale.set(1.28, 0.46, 1.55)
        shoeMesh.position.set(side * 0.2, 0.08, 0.1)
        pharmacist.add(shoeMesh)

        const pivot = new THREE.Group()
        pivot.position.set(side * 0.45, 2.08, 0)
        pivot.name = side < 0 ? "guide-left-arm" : "guide-right-arm"
        pharmacist.add(pivot)
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.37, 5, 12), coat)
        upper.position.y = -0.27
        pivot.add(upper)
        const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.34, 5, 12), skin)
        lower.position.set(0, -0.65, 0.05)
        pivot.add(lower)
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skin)
        hand.position.set(0, -0.92, 0.07)
        hand.name = side < 0 ? "guide-left-hand" : "guide-right-hand"
        pivot.add(hand)
        armPivots.push(pivot)
        hands.push(hand)
      }

      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.04), shirt)
      badge.position.set(0.23, 1.85, 0.39)
      pharmacist.add(badge)
      const crossVertical = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.13, 0.02), coat)
      crossVertical.position.set(0.23, 1.85, 0.415)
      const crossHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), coat)
      crossHorizontal.position.set(0.23, 1.85, 0.415)
      pharmacist.add(crossVertical, crossHorizontal)
      const stethoscope = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 8, 32, Math.PI), metal)
      stethoscope.position.set(0, 2.04, 0.36)
      stethoscope.rotation.z = Math.PI
      pharmacist.add(stethoscope)

      const book = new THREE.Group()
      book.name = "chapter-book"
      const bookCover = makeMaterial(0x176d5b, { roughness: 0.32, metalness: 0.16 })
      const paper = makeMaterial(0xfff7e7, { roughness: 0.88 })
      const detailInk = makeMaterial(0x4a9e83, { roughness: 0.7 })
      const bookBase = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.09, 0.82), bookCover)
      book.add(bookBase)
      for (const side of [-1, 1]) {
        const pageBlock = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.055, 0.75), paper)
        pageBlock.position.set(side * 0.3, 0.075, 0)
        book.add(pageBlock)
        for (let line = 0; line < 3; line += 1) {
          const pageRule = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.012, 0.012), detailInk)
          pageRule.position.set(side * 0.3, 0.11, -0.16 + line * 0.12)
          book.add(pageRule)
        }
      }
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.84), bookCover)
      book.add(spine)
      book.position.set(1.45, 1.78, 0.24)
      book.rotation.set(0.28, -0.3, -0.16)
      stage.add(book)

      const capsule = new THREE.Group()
      capsule.name = "chapter-capsule"
      const pill = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 1.02, 10, 28),
        makeMaterial(0x32bd91, { roughness: 0.2, metalness: 0.1 })
      )
      pill.rotation.z = Math.PI / 2
      capsule.add(pill)
      const pillBand = new THREE.Mesh(new THREE.CylinderGeometry(0.304, 0.304, 0.045, 36), paper)
      pillBand.rotation.z = Math.PI / 2
      pillBand.position.x = 0.015
      capsule.add(pillBand)
      capsule.position.set(1.5, 1.88, 0.28)
      capsule.rotation.set(0.18, 0.2, -0.5)
      capsule.visible = false
      stage.add(capsule)

      const dashboard = new THREE.Group()
      dashboard.name = "chapter-hospital"
      const hospitalShell = makeMaterial(0x92c7b5, { metalness: 0.2, roughness: 0.34 })
      const hospitalWing = makeMaterial(0x345c65, { metalness: 0.28, roughness: 0.32 })
      const windowLight = makeMaterial(0xf0c879, { emissive: 0x8f5923, emissiveIntensity: 0.42, roughness: 0.3 })
      const hospitalBase = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.14, 1.1), hospitalWing)
      hospitalBase.position.y = -0.62
      dashboard.add(hospitalBase)
      const centralTower = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.72, 0.72), hospitalShell)
      centralTower.position.set(0, 0.31, 0)
      dashboard.add(centralTower)
      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.02, 0.76), hospitalWing)
      leftWing.position.set(-0.7, -0.02, 0.02)
      dashboard.add(leftWing)
      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.78, 0.68), hospitalWing)
      rightWing.position.set(0.7, -0.14, 0.02)
      dashboard.add(rightWing)
      for (let floor = 0; floor < 4; floor += 1) {
        for (let column = 0; column < 3; column += 1) {
          const window = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.17, 0.025), windowLight)
          window.position.set(-0.25 + column * 0.25, -0.28 + floor * 0.38, 0.375)
          dashboard.add(window)
        }
      }
      for (const side of [-1, 1]) {
        const wingWindow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.025), windowLight)
        wingWindow.position.set(side * 0.7, 0.02, 0.41)
        dashboard.add(wingWindow)
      }
      const hospitalCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), paper)
      hospitalCrossV.position.set(0, 1.28, 0.08)
      const hospitalCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.12), paper)
      hospitalCrossH.position.set(0, 1.28, 0.08)
      dashboard.add(hospitalCrossV, hospitalCrossH)
      dashboard.position.set(1.5, 1.2, 0.24)
      dashboard.rotation.y = -0.18
      dashboard.visible = false
      stage.add(dashboard)

      const molecule = new THREE.Group()
      molecule.name = "chapter-molecule"
      const moleculeMaterial = makeMaterial(0x82e5c4, { metalness: 0.24, roughness: 0.3 })
      const atomPositions = [
        [-0.48, 0.15, 0], [0.48, 0.15, 0], [0, -0.34, 0.12], [0, 0.58, -0.05],
      ]
      atomPositions.forEach(([x, y, z], index) => {
        const atom = new THREE.Mesh(new THREE.SphereGeometry(index === 0 ? 0.11 : 0.085, 14, 12), moleculeMaterial)
        atom.position.set(x, y, z)
        molecule.add(atom)
      })
      ;[[0, 1], [0, 2], [1, 2], [0, 3], [1, 3]].forEach(([fromIndex, toIndex]) => {
        const from = new THREE.Vector3(...atomPositions[fromIndex])
        const to = new THREE.Vector3(...atomPositions[toIndex])
        const bond = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, from.distanceTo(to), 8),
          metal
        )
        bond.position.copy(from).add(to).multiplyScalar(0.5)
        bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
        molecule.add(bond)
      })
      molecule.position.set(1.38, 2.45, 0.18)
      molecule.visible = true
      stage.add(molecule)

      const network = new THREE.Group()
      network.name = "chapter-network"
      const networkPositions = [
        [-0.42, 0.25, 0], [0.38, 0.42, 0.08], [0.48, -0.35, -0.04], [-0.42, -0.3, 0.06], [0, 0.02, 0.16],
      ]
      const nodeMaterials = [
        makeMaterial(0x58c9a4, { emissive: 0x175d48, emissiveIntensity: 0.3 }),
        makeMaterial(0x6cb1da, { emissive: 0x183c60, emissiveIntensity: 0.3 }),
        makeMaterial(0xffaf76, { emissive: 0x6b351f, emissiveIntensity: 0.25 }),
      ]
      networkPositions.forEach(([x, y, z], index) => {
        const node = new THREE.Mesh(new THREE.SphereGeometry(index === 4 ? 0.16 : 0.12, 18, 14), nodeMaterials[index % nodeMaterials.length])
        node.position.set(x, y, z)
        network.add(node)
      })
      ;[[0, 1], [1, 2], [2, 4], [4, 3], [3, 0], [0, 4], [1, 4]].forEach(([fromIndex, toIndex]) => {
        const from = new THREE.Vector3(...networkPositions[fromIndex])
        const to = new THREE.Vector3(...networkPositions[toIndex])
        const link = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, from.distanceTo(to), 8), metal)
        link.position.copy(from).add(to).multiplyScalar(0.5)
        link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
        network.add(link)
      })
      network.position.set(2.05, 1.9, 0.5)
      network.visible = false
      stage.add(network)

      const floatingDots = new THREE.Group()
      floatingDots.name = "chapter-particles"
      const dotMaterial = makeMaterial(0xc1f2df, { transparent: true, opacity: 0.72 })
      for (let index = 0; index < 30; index += 1) {
        const angle = index * 2.399
        const radius = 1.7 + (index % 5) * 0.14
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018 + (index % 3) * 0.008, 8, 8), dotMaterial)
        dot.position.set(Math.cos(angle) * radius, 0.2 + (index % 9) * 0.34, Math.sin(angle) * 0.55 - 0.6)
        floatingDots.add(dot)
      }
      stage.add(floatingDots)

      const clonedMaterials = []
      const cloneChapterStage = (position, palette, chapterIndex) => {
        const chapterStage = stage.clone(true)
        chapterStage.position.x = position
        const materialCopies = new Map()
        chapterStage.traverse((object) => {
          if (!object.isMesh || !object.material) return
          const source = object.material
          if (!materialCopies.has(source)) {
            const copy = source.clone()
            if (source === coat) copy.color.setHex(palette.coat)
            if (source === shirt) copy.color.setHex(palette.shirt)
            if (source === skin) copy.color.setHex(palette.skin)
            if (source === hair) copy.color.setHex(palette.hair)
            if (source === trousers) copy.color.setHex(palette.trousers)
            materialCopies.set(source, copy)
            clonedMaterials.push(copy)
          }
          object.material = materialCopies.get(source)
        })
        chapterStage.getObjectByName("chapter-book").visible = chapterIndex === 0
        chapterStage.getObjectByName("chapter-capsule").visible = chapterIndex === 1
        chapterStage.getObjectByName("chapter-hospital").visible = chapterIndex === 2
        chapterStage.getObjectByName("chapter-molecule").visible = chapterIndex === 0
        chapterStage.getObjectByName("chapter-network").visible = chapterIndex === 2
        chapterStage.userData.chapterIndex = chapterIndex
        return chapterStage
      }

      const posStage = cloneChapterStage(4.7, {
        coat: 0xf0f7f1,
        shirt: 0x30a98c,
        skin: 0x95634b,
        hair: 0x25221f,
        trousers: 0x24404a,
      }, 1)
      const hmisStage = cloneChapterStage(9.7, {
        coat: 0xdcebf3,
        shirt: 0x327ca2,
        skin: 0x704b3e,
        hair: 0x292522,
        trousers: 0x26384b,
      }, 2)
      world.add(posStage, hmisStage)
      const chapterStages = [stage, posStage, hmisStage]
      const chapterParts = chapterStages.map((chapterStage) => ({
        guide: chapterStage.getObjectByName("guide"),
        head: chapterStage.getObjectByName("guide-head"),
        leftArm: chapterStage.getObjectByName("guide-left-arm"),
        rightArm: chapterStage.getObjectByName("guide-right-arm"),
        rightHand: chapterStage.getObjectByName("guide-right-hand"),
        book: chapterStage.getObjectByName("chapter-book"),
        capsule: chapterStage.getObjectByName("chapter-capsule"),
        hospital: chapterStage.getObjectByName("chapter-hospital"),
        molecule: chapterStage.getObjectByName("chapter-molecule"),
        network: chapterStage.getObjectByName("chapter-network"),
        particles: chapterStage.getObjectByName("chapter-particles"),
        ring: chapterStage.getObjectByName("base-ring"),
      }))

      let isVisible = false
      let animationFrame
      let scrollFrame
      let pointerDown = false
      let lastPointerX = 0
      let dragRotation = 0
      let lastInteractionAt = 0

      const handlePointerDown = (event) => {
        pointerDown = true
        lastPointerX = event.clientX
        lastInteractionAt = performance.now()
        renderer.domElement.setPointerCapture(event.pointerId)
      }
      const handlePointerMove = (event) => {
        if (!pointerDown) return
        dragRotation += (event.clientX - lastPointerX) * 0.006
        lastPointerX = event.clientX
        lastInteractionAt = performance.now()
      }
      const handlePointerUp = (event) => {
        pointerDown = false
        if (renderer.domElement.hasPointerCapture(event.pointerId)) {
          renderer.domElement.releasePointerCapture(event.pointerId)
        }
      }
      renderer.domElement.addEventListener("pointerdown", handlePointerDown)
      renderer.domElement.addEventListener("pointermove", handlePointerMove)
      renderer.domElement.addEventListener("pointerup", handlePointerUp)
      renderer.domElement.addEventListener("pointercancel", handlePointerUp)
      const resizeObserver = new ResizeObserver(() => {
        const width = mount.clientWidth || 640
        const height = mount.clientHeight || 620
        camera.position.z = width < 560 ? 10.2 : width < 900 ? 8.8 : 7.5
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      })
      resizeObserver.observe(mount)
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting
      }, { threshold: 0.05 })
      visibilityObserver.observe(section)

      const updateScroll = () => {
        if (scrollFrame) return
        scrollFrame = window.requestAnimationFrame(() => {
          scrollFrame = undefined
          const rect = section.getBoundingClientRect()
          const travel = Math.max(1, section.offsetHeight - window.innerHeight)
          const progress = THREE.MathUtils.clamp(-rect.top / travel, 0, 1)
          lastInteractionAt = performance.now()
          progressRef.current = progress
          autoplayProgressRef.current = progress
          autoplayModeRef.current = false
          const next = Math.min(CHAPTERS.length - 1, Math.floor(progress * CHAPTERS.length))
          if (next !== activeRef.current) {
            activeRef.current = next
            setActiveIndex(next)
          }
        })
      }
      window.addEventListener("scroll", updateScroll, { passive: true })
      window.addEventListener("resize", updateScroll)
      updateScroll()

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
      const autoplayTimer = window.setInterval(() => {
        if (!isVisible || document.visibilityState !== "visible" || reducedMotion.matches) return
        if (performance.now() - lastInteractionAt < 4500) return
        const next = (activeRef.current + 1) % CHAPTERS.length
        activeRef.current = next
        autoplayProgressRef.current = next / CHAPTERS.length + 0.025
        autoplayModeRef.current = true
        setActiveIndex(next)
      }, 6500)
      const animate = (time) => {
        if (isVisible) {
          const seconds = time * 0.001
          const chapterIndex = activeRef.current
          const motion = reducedMotion.matches ? 0 : 1
          const sceneProgress = autoplayModeRef.current ? autoplayProgressRef.current : progressRef.current
          const cameraTargetX = sceneProgress * 15
          camera.position.x += (cameraTargetX - camera.position.x) * (motion ? 0.12 : 1)
          camera.lookAt(camera.position.x, 1.52, 0)
          world.rotation.y = dragRotation

          chapterParts.forEach((parts, index) => {
            const guideMotion = Math.sin(seconds * 1.1 + index * 1.3) * 0.045 * motion
            parts.guide.position.y = guideMotion
            parts.guide.rotation.y = Math.sin(seconds * 0.4 + index) * 0.06 * motion + (index - 1) * 0.08
            parts.head.rotation.y = Math.sin(seconds * 0.55 + index) * 0.045 * motion + (index === 1 ? 0.12 : -0.06)
            parts.leftArm.rotation.z = -0.15 + Math.sin(seconds * 1.5 + index) * 0.025 * motion
            const armTarget = [0.86, 1.25, 1.05][index]
            parts.rightArm.rotation.z += (armTarget - parts.rightArm.rotation.z) * (motion ? 0.08 : 1)
            parts.rightHand.rotation.z = Math.sin(seconds * 1.3 + index) * 0.03 * motion
            parts.book.rotation.y = -0.3 + Math.sin(seconds * 0.7 + index) * 0.1 * motion
            parts.capsule.rotation.y += 0.012 * motion
            parts.hospital.rotation.y = -0.18 + Math.sin(seconds * 0.65 + index) * 0.04 * motion
            parts.molecule.rotation.y += 0.008 * motion
            parts.network.rotation.y = Math.sin(seconds * 0.5 + index) * 0.08 * motion
            parts.particles.rotation.y = seconds * 0.045 * motion
            parts.ring.rotation.z = sceneProgress * 0.3
          })
          renderer.render(scene, camera)
        }
        animationFrame = window.requestAnimationFrame(animate)
      }
      animationFrame = window.requestAnimationFrame(animate)

      disposeScene = () => {
        window.cancelAnimationFrame(animationFrame)
        window.clearInterval(autoplayTimer)
        if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
        window.removeEventListener("scroll", updateScroll)
        window.removeEventListener("resize", updateScroll)
        renderer.domElement.removeEventListener("pointerdown", handlePointerDown)
        renderer.domElement.removeEventListener("pointermove", handlePointerMove)
        renderer.domElement.removeEventListener("pointerup", handlePointerUp)
        renderer.domElement.removeEventListener("pointercancel", handlePointerUp)
        resizeObserver.disconnect()
        visibilityObserver.disconnect()
        scene.traverse((object) => object.geometry?.dispose())
        materials.forEach((entry) => entry.dispose())
        renderer.dispose()
        mount.removeChild(renderer.domElement)
      }
    }

    const preloadObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      preloadObserver.disconnect()
      initializeScene().catch((error) => console.error("Failed to initialize product 3D story:", error))
    }, { rootMargin: "500px 0px" })
    preloadObserver.observe(section)
    return () => {
      cancelled = true
      preloadObserver.disconnect()
      disposeScene?.()
    }
  }, [])

  function jumpToChapter(index) {
    const section = sectionRef.current
    if (!section) return
    const travel = Math.max(1, section.offsetHeight - window.innerHeight)
    const top = window.scrollY + section.getBoundingClientRect().top + travel * (index / CHAPTERS.length)
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    window.scrollTo({ top, behavior })
  }

  return (
    <section id="three-products-scroll" className="three-products-scroll" ref={sectionRef} aria-label="Explore our three healthcare products">
      <div className="three-products-sticky">
        <div className="three-products-layout">
          <div className="three-products-copy" aria-live="polite">
            <span className="three-products-eyebrow"><ActiveIcon size={16} /> {activeChapter.number} / {activeChapter.eyebrow}</span>
            <h2>{activeChapter.title}</h2>
            <p>{activeChapter.description}</p>
            <a className="three-products-link" href={activeChapter.href}>
              {activeChapter.action} <ArrowUpRight size={17} />
            </a>
            <div className="three-products-controls" role="group" aria-label="Select a product scene">
              {CHAPTERS.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  className={activeIndex === index ? "active" : ""}
                  aria-pressed={activeIndex === index}
                  onClick={() => jumpToChapter(index)}
                >
                  <span>{item.number}</span> {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="three-products-stage">
            <div ref={canvasRef} className="three-products-canvas" aria-hidden="true" />
            <span className="three-products-stage-label">A CONNECTED CARE JOURNEY</span>
            <span className="three-products-stage-index">{activeChapter.number}<i />03</span>
          </div>
        </div>
      </div>
    </section>
  )
}