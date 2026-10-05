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

const CHAPTER_STOPS = [0, 4.7, 9.7]

function getStorySlide(progress) {
  const chapterProgress = Math.min(progress * CHAPTERS.length, CHAPTERS.length - 1)
  const chapterIndex = Math.floor(chapterProgress)
  const nextChapterIndex = Math.min(chapterIndex + 1, CHAPTERS.length - 1)
  const localProgress = chapterProgress - chapterIndex
  const transition = Math.max(0, Math.min(1, (localProgress - 0.78) / 0.22))
  const easedTransition = transition * transition * (3 - 2 * transition)
  return chapterIndex + (nextChapterIndex - chapterIndex) * easedTransition
}

function applyCopyProgress(track, progress) {
  if (!track) return
  const slide = getStorySlide(progress)
  track.style.setProperty("--copy-shift", `${(-slide / CHAPTERS.length) * 100}%`)
}

export default function ThreeProductScroll() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const copyTrackRef = useRef(null)
  const progressRef = useRef(0)
  const activeRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeChapter = CHAPTERS[activeIndex]

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
      scene.background = null
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80)
      camera.position.set(0, 1.9, 10.2)
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
      renderer.setPixelRatio(Math.max(1, Math.min(window.devicePixelRatio || 1, 2)))
      renderer.setSize(mount.clientWidth || 640, mount.clientHeight || 620)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.05
      renderer.setClearColor(0x000000, 0)
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
      const greenLight = new THREE.PointLight(0xc4f3e5, 7, 11)
      greenLight.position.set(2.5, 2, -2)
      scene.add(greenLight)
      const coralLight = new THREE.PointLight(0xffdfc5, 3, 8)
      coralLight.position.set(-3, 0, 3)
      scene.add(coralLight)
      const rimLight = new THREE.DirectionalLight(0xd7e9ff, 1.1)
      rimLight.position.set(3, 3, -4)
      scene.add(rimLight)

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
      pharmacist.scale.setScalar(1.16)
      pharmacist.name = "guide"
      stage.add(pharmacist)

      const coat = makeMaterial(0xe0e9e4, { roughness: 0.82 })
      const coatShadow = makeMaterial(0xb9cbc2, { roughness: 0.86 })
      const skin = makeMaterial(0x895c46, { roughness: 0.8 })
      const hair = makeMaterial(0x2d2522, { roughness: 0.88 })
      const shirt = makeMaterial(0x176e5b, { roughness: 0.68 })
      const trousers = makeMaterial(0x263d4b, { roughness: 0.76 })
      const metal = makeMaterial(0xa7c4c5, { metalness: 0.72, roughness: 0.28 })
      const eye = makeMaterial(0x182522, { roughness: 0.4 })

      const torsoProfile = [
        [0.28, 0], [0.37, 0.16], [0.41, 0.48], [0.44, 0.78],
        [0.5, 1.1], [0.52, 1.37], [0.38, 1.54], [0.22, 1.62],
      ].map(([radius, height]) => new THREE.Vector2(radius, height))
      const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 40), coat)
      torso.name = "guide-torso"
      torso.position.y = 0.94
      torso.scale.z = 0.72
      pharmacist.add(torso)
      const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.62, 0.06), shirt)
      shirtFront.position.set(0, 1.96, 0.34)
      pharmacist.add(shirtFront)

      for (const side of [-1, 1]) {
        const lapelShape = new THREE.Shape()
        lapelShape.moveTo(0, 2.3)
        lapelShape.lineTo(side * 0.18, 2.23)
        lapelShape.lineTo(side * 0.32, 2.01)
        lapelShape.lineTo(side * 0.13, 1.76)
        lapelShape.lineTo(side * 0.07, 1.98)
        lapelShape.closePath()
        const lapel = new THREE.Mesh(
          new THREE.ExtrudeGeometry(lapelShape, { depth: 0.02, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.008, bevelThickness: 0.008 }),
          coatShadow
        )
        lapel.position.z = 0.32
        pharmacist.add(lapel)

        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.17, 0.025), coatShadow)
        pocket.position.set(side * 0.27, 1.48, 0.285)
        pharmacist.add(pocket)
      }

      const buttonMaterial = makeMaterial(0xa8b8b0, { metalness: 0.35, roughness: 0.38 })
      for (const y of [1.82, 1.61, 1.4]) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), buttonMaterial)
        button.position.set(0.055, y, 0.35)
        pharmacist.add(button)
      }

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
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.41, 32, 24), hair)
      hairCap.scale.set(0.9, 0.58, 0.9)
      hairCap.position.set(0, 0.22, -0.04)
      head.add(hairCap)
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.29, 24, 16), hair)
      fringe.scale.set(1.05, 0.23, 0.62)
      fringe.position.set(0, 0.13, 0.22)
      head.add(fringe)

      const eyeWhite = makeMaterial(0xf7f6f0, { roughness: 0.28 })
      const iris = makeMaterial(0x684b35, { roughness: 0.32 })
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), skin)
        ear.scale.set(0.72, 1.05, 0.72)
        ear.position.set(side * 0.31, -0.01, 0.005)
        head.add(ear)

        const white = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 14), eyeWhite)
        white.scale.set(1.1, 0.72, 0.58)
        white.position.set(side * 0.11, 0.025, 0.318)
        const irisMesh = new THREE.Mesh(new THREE.SphereGeometry(0.027, 16, 12), iris)
        irisMesh.position.set(side * 0.11, 0.02, 0.35)
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), eye)
        pupil.position.set(side * 0.11, 0.02, 0.372)
        const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.09, 3, 8), hair)
        brow.position.set(side * 0.11, 0.1, 0.322)
        brow.rotation.z = side * -0.08
        head.add(white, irisMesh, pupil, brow)
      }

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), skin)
      nose.scale.set(0.62, 1, 1.15)
      nose.position.set(0, -0.075, 0.34)
      head.add(nose)

      const mouth = new THREE.Group()
      mouth.name = "guide-mouth"
      mouth.position.set(0, -0.19, 0.32)
      const mouthCavity = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 18, 12),
        makeMaterial(0x542d29, { roughness: 0.86 })
      )
      mouthCavity.name = "guide-mouth-opening"
      mouthCavity.scale.set(1.35, 0.62, 0.42)
      mouthCavity.position.z = 0.012
      mouth.add(mouthCavity)
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), skin)
      jaw.name = "guide-jaw"
      jaw.scale.set(1.1, 0.3, 0.5)
      jaw.position.set(0, -0.045, 0.006)
      mouth.add(jaw)
      const lipCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.065, 0.008, 0.017),
        new THREE.Vector3(0, 0.025, 0.02),
        new THREE.Vector3(0.065, 0.008, 0.017),
      ])
      const lip = new THREE.Mesh(
        new THREE.TubeGeometry(lipCurve, 12, 0.008, 6, false),
        makeMaterial(0x75493e, { roughness: 0.7 })
      )
      mouth.add(lip)
      head.add(mouth)

      const armPivots = []
      const hands = []
      const elbows = []
      const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.24, 6, 16), trousers)
      pelvis.position.y = 0.78
      pelvis.scale.set(1, 0.72, 0.7)
      pharmacist.add(pelvis)
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.74, 6, 16), trousers)
        leg.position.set(side * 0.2, 0.48, 0)
        pharmacist.add(leg)
        const shoeMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.24, 4, 12), trousers)
        shoeMesh.scale.set(1, 0.5, 1.4)
        shoeMesh.rotation.z = Math.PI / 2
        shoeMesh.position.set(side * 0.2, 0.08, 0.1)
        pharmacist.add(shoeMesh)

        const pivot = new THREE.Group()
        pivot.position.set(side * 0.45, 2.08, 0)
        pivot.name = side < 0 ? "guide-left-arm" : "guide-right-arm"
        pharmacist.add(pivot)
        const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.37, 5, 12), coat)
        upper.position.y = -0.27
        pivot.add(upper)
        const elbow = new THREE.Group()
        elbow.position.set(0, -0.48, 0.05)
        elbow.name = side < 0 ? "guide-left-elbow" : "guide-right-elbow"
        pivot.add(elbow)
        const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 6, 16), coat)
        lower.position.set(0, -0.19, 0)
        elbow.add(lower)
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.095, 0.07, 20), coatShadow)
        cuff.position.set(0, -0.39, 0)
        elbow.add(cuff)
        const hand = new THREE.Group()
        hand.position.set(0, -0.45, 0.03)
        hand.name = side < 0 ? "guide-left-hand" : "guide-right-hand"
        const palm = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16), skin)
        palm.scale.set(0.82, 1.1, 0.68)
        palm.position.y = -0.035
        hand.add(palm)
        for (let fingerIndex = 0; fingerIndex < 4; fingerIndex += 1) {
          const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.075 - fingerIndex * 0.004, 4, 10), skin)
          finger.position.set(-0.05 + fingerIndex * 0.034, -0.14, 0.018)
          hand.add(finger)
        }
        const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.07, 4, 10), skin)
        thumb.position.set(side * 0.085, -0.065, 0.045)
        thumb.rotation.z = side * -0.65
        hand.add(thumb)

        if (side > 0) {
          const medication = new THREE.Group()
          medication.name = "chapter-medication"
          const amberGlass = makeMaterial(0x925021, { roughness: 0.26, metalness: 0.04 })
          const labelWhite = makeMaterial(0xf6f5eb, { roughness: 0.76 })
          const labelGreen = makeMaterial(0x19826c, { roughness: 0.58 })
          const vialProfile = [
            [0.06, 0], [0.1, 0.025], [0.115, 0.07], [0.115, 0.28],
            [0.09, 0.32], [0.055, 0.35], [0.055, 0.4],
          ].map(([radius, height]) => new THREE.Vector2(radius, height))
          const vial = new THREE.Mesh(new THREE.LatheGeometry(vialProfile, 28), amberGlass)
          medication.add(vial)
          const label = new THREE.Mesh(new THREE.CylinderGeometry(0.116, 0.116, 0.15, 28), labelWhite)
          label.position.y = 0.17
          medication.add(label)
          const labelMark = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.012), labelGreen)
          labelMark.position.set(0, 0.17, 0.112)
          const labelBar = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.018, 0.012), labelGreen)
          labelBar.position.set(0, 0.17, 0.112)
          medication.add(labelMark, labelBar)
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.09, 24), labelGreen)
          cap.position.y = 0.445
          medication.add(cap)
          medication.position.set(0.07, -0.18, 0.035)
          medication.rotation.z = -0.82
          medication.visible = false
          hand.add(medication)
          const pencil = new THREE.Group()
          pencil.name = "chapter-pencil"
          const pencilBody = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 10), labelGreen)
          pencilBody.rotation.z = -0.62
          const pencilTip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 10), makeMaterial(0x383a36, { roughness: 0.82 }))
          pencilTip.position.set(-0.087, -0.14, 0)
          pencilTip.rotation.z = -0.62
          pencil.add(pencilBody, pencilTip)
          pencil.position.set(-0.045, -0.035, 0.12)
          pencil.visible = false
          hand.add(pencil)
        } else {
          const clipboard = new THREE.Group()
          clipboard.name = "chapter-clipboard"
          const boardMaterial = makeMaterial(0x57756a, { roughness: 0.62 })
          const paperMaterial = makeMaterial(0xf7f4e9, { roughness: 0.84 })
          const inkMaterial = makeMaterial(0x4b8b77, { roughness: 0.7 })
          const board = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.64, 0.035), boardMaterial)
          const paperSheet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.012), paperMaterial)
          paperSheet.position.z = 0.024
          clipboard.add(board, paperSheet)
          for (let line = 0; line < 5; line += 1) {
            const rule = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.009, 0.006), inkMaterial)
            rule.position.set(0, 0.16 - line * 0.085, 0.034)
            clipboard.add(rule)
          }
          const clip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.025), metal)
          clip.position.set(0, 0.3, 0.035)
          clipboard.add(clip)
          clipboard.position.set(-0.08, -0.09, 0.12)
          clipboard.rotation.z = 0.18
          clipboard.visible = false
          hand.add(clipboard)
        }
        pivot.add(hand)
        armPivots.push(pivot)
        hands.push(hand)
        elbows.push(elbow)
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

      const posDashboard = new THREE.Group()
      posDashboard.name = "chapter-pos-dashboard"
      const dashboardCanvas = document.createElement("canvas")
      dashboardCanvas.width = 1200
      dashboardCanvas.height = 700
      const dashboardCtx = dashboardCanvas.getContext("2d")
      if (dashboardCtx) {
        const bg = dashboardCtx.createLinearGradient(0, 0, 1200, 700)
        bg.addColorStop(0, "#0a1d1b")
        bg.addColorStop(0.5, "#123534")
        bg.addColorStop(1, "#0d2424")
        dashboardCtx.fillStyle = bg
        dashboardCtx.fillRect(0, 0, 1200, 700)
        dashboardCtx.fillStyle = "rgba(255,255,255,0.04)"
        for (let row = 0; row < 8; row += 1) {
          dashboardCtx.fillRect(55, 95 + row * 70, 1090, 1)
        }
        for (let col = 0; col < 12; col += 1) {
          dashboardCtx.fillRect(80 + col * 90, 80, 1, 550)
        }

        dashboardCtx.fillStyle = "rgba(17, 52, 52, 0.8)"
        dashboardCtx.fillRect(70, 95, 220, 120)
        dashboardCtx.fillStyle = "#7ce3c8"
        dashboardCtx.font = "700 48px sans-serif"
        dashboardCtx.fillText("KSh 1.8M", 95, 170)
        dashboardCtx.fillStyle = "rgba(226, 255, 240, 0.7)"
        dashboardCtx.font = "600 22px sans-serif"
        dashboardCtx.fillText("Monthly sales", 95, 205)

        dashboardCtx.fillStyle = "rgba(17, 52, 52, 0.8)"
        dashboardCtx.fillRect(315, 95, 220, 120)
        dashboardCtx.fillStyle = "#ffe3a6"
        dashboardCtx.fillText("842", 345, 170)
        dashboardCtx.fillStyle = "rgba(226, 255, 240, 0.7)"
        dashboardCtx.fillText("Dispensed today", 345, 205)

        dashboardCtx.fillStyle = "rgba(17, 52, 52, 0.8)"
        dashboardCtx.fillRect(560, 95, 220, 120)
        dashboardCtx.fillStyle = "#ef8d9a"
        dashboardCtx.fillText("18", 600, 170)
        dashboardCtx.fillStyle = "rgba(226, 255, 240, 0.7)"
        dashboardCtx.fillText("Reorders", 600, 205)

        dashboardCtx.fillStyle = "rgba(17, 52, 52, 0.8)"
        dashboardCtx.fillRect(805, 95, 220, 120)
        dashboardCtx.fillStyle = "#7cbdfd"
        dashboardCtx.fillText("96%", 845, 170)
        dashboardCtx.fillStyle = "rgba(226, 255, 240, 0.7)"
        dashboardCtx.fillText("Stock health", 845, 205)

        const panels = [
          { x: 70, y: 285, w: 390, h: 260, color: "#133d3f" },
          { x: 490, y: 285, w: 300, h: 260, color: "#123b42" },
          { x: 820, y: 285, w: 300, h: 260, color: "#143f47" },
        ]
        panels.forEach(({ x, y, w, h, color }) => {
          dashboardCtx.fillStyle = color
          dashboardCtx.fillRect(x, y, w, h)
          dashboardCtx.fillStyle = "rgba(211, 255, 234, 0.72)"
          dashboardCtx.fillRect(x + 18, y + 18, 140, 12)
          dashboardCtx.fillStyle = "#e3fef6"
          dashboardCtx.fillRect(x + 18, y + 48, w - 36, 6)
          dashboardCtx.fillRect(x + 18, y + 76, Math.min(w - 36, 180), 6)
          dashboardCtx.fillRect(x + 18, y + 112, Math.min(w - 36, 200), 6)
          dashboardCtx.fillStyle = "rgba(149, 229, 194, 0.85)"
          for (let bar = 0; bar < 7; bar += 1) {
            const barHeight = 56 + (bar % 3) * 18
            dashboardCtx.fillRect(x + 22 + bar * 42, y + h - 42 - barHeight, 18, barHeight)
          }
        })

        dashboardCtx.fillStyle = "rgba(113, 225, 176, 0.9)"
        dashboardCtx.fillRect(885, 315, 190, 52)
        dashboardCtx.fillStyle = "#0a1718"
        dashboardCtx.font = "700 22px sans-serif"
        dashboardCtx.fillText("M-Pesa", 915, 350)
        dashboardCtx.fillStyle = "rgba(226, 255, 240, 0.65)"
        dashboardCtx.fillText("KSh 367k", 915, 390)

        dashboardCtx.fillStyle = "rgba(255, 255, 255, 0.87)"
        dashboardCtx.fillRect(520, 355, 220, 90)
        dashboardCtx.fillStyle = "#0c2125"
        dashboardCtx.fillRect(540, 375, 180, 50)
        dashboardCtx.fillStyle = "#79ddbb"
        dashboardCtx.fillRect(705, 392, 12, 12)
      }
      const dashboardTexture = new THREE.CanvasTexture(dashboardCanvas)
      dashboardTexture.colorSpace = THREE.SRGBColorSpace

      const monitorMaterial = new THREE.MeshStandardMaterial({ color: 0x0d1718, metalness: 0.7, roughness: 0.4 })
      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x1f3332, metalness: 0.3, roughness: 0.6 })
      const screenMaterial = new THREE.MeshStandardMaterial({ map: dashboardTexture, metalness: 0.15, roughness: 0.65 })
      const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x7ce3c8, emissive: 0x1c6e57, emissiveIntensity: 0.6, roughness: 0.45 })

      const screen = new THREE.Mesh(new THREE.BoxGeometry(1.98, 1.26, 0.08), screenMaterial)
      screen.position.z = 0.08
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.42, 0.14), frameMaterial)
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.16), monitorMaterial)
      stand.position.set(0, -1.06, 0)
      const standBase = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.12, 0.9), monitorMaterial)
      standBase.position.set(0, -1.54, 0)
      const pillTag = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.06), accentMaterial)
      pillTag.position.set(-0.8, 0.82, 0.19)
      const inventoryTag = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.06), new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0x7d5125, emissiveIntensity: 0.5 }))
      inventoryTag.position.set(0.7, 0.62, 0.2)
      const patientTag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.06), new THREE.MeshStandardMaterial({ color: 0x87c7ff, emissive: 0x24529a, emissiveIntensity: 0.5 }))
      patientTag.position.set(0.62, -0.06, 0.2)

      posDashboard.add(bezel, screen, stand, standBase, pillTag, inventoryTag, patientTag)
      posDashboard.position.set(1.95, 1.72, -0.55)
      posDashboard.scale.setScalar(0.72)
      posDashboard.rotation.set(0.12, 0.18, -0.28)
      posDashboard.visible = false
      stage.add(posDashboard)

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
        chapterStage.getObjectByName("chapter-pos-dashboard").visible = chapterIndex === 1
        chapterStage.getObjectByName("chapter-medication").visible = chapterIndex === 1
        chapterStage.getObjectByName("chapter-clipboard").visible = chapterIndex === 1
        chapterStage.getObjectByName("chapter-pencil").visible = false
        chapterStage.getObjectByName("chapter-hospital").visible = chapterIndex === 2
        chapterStage.getObjectByName("chapter-molecule").visible = chapterIndex === 0
        chapterStage.getObjectByName("chapter-network").visible = chapterIndex === 2
        chapterStage.userData.chapterIndex = chapterIndex
        return chapterStage
      }

      const posStage = cloneChapterStage(CHAPTER_STOPS[1], {
        coat: 0xf0f7f1,
        shirt: 0x30a98c,
        skin: 0x95634b,
        hair: 0x25221f,
        trousers: 0x24404a,
      }, 1)
      const hmisStage = cloneChapterStage(CHAPTER_STOPS[2], {
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
        torso: chapterStage.getObjectByName("guide-torso"),
        head: chapterStage.getObjectByName("guide-head"),
        leftArm: chapterStage.getObjectByName("guide-left-arm"),
        rightArm: chapterStage.getObjectByName("guide-right-arm"),
        leftElbow: chapterStage.getObjectByName("guide-left-elbow"),
        rightElbow: chapterStage.getObjectByName("guide-right-elbow"),
        rightHand: chapterStage.getObjectByName("guide-right-hand"),
        mouth: chapterStage.getObjectByName("guide-mouth-opening"),
        jaw: chapterStage.getObjectByName("guide-jaw"),
        medication: chapterStage.getObjectByName("chapter-medication"),
        clipboard: chapterStage.getObjectByName("chapter-clipboard"),
        pencil: chapterStage.getObjectByName("chapter-pencil"),
        book: chapterStage.getObjectByName("chapter-book"),
        posDashboard: chapterStage.getObjectByName("chapter-pos-dashboard"),
        hospital: chapterStage.getObjectByName("chapter-hospital"),
        molecule: chapterStage.getObjectByName("chapter-molecule"),
        network: chapterStage.getObjectByName("chapter-network"),
        ring: chapterStage.getObjectByName("base-ring"),
      }))

      let isVisible = false
      let animationFrame
      let scrollFrame
      let displayedProgress = null
      let pointerDown = false
      let lastPointerX = 0
      let dragRotation = 0

      const handlePointerDown = (event) => {
        pointerDown = true
        lastPointerX = event.clientX
        renderer.domElement.setPointerCapture(event.pointerId)
      }
      const handlePointerMove = (event) => {
        if (!pointerDown) return
        dragRotation += (event.clientX - lastPointerX) * 0.006
        lastPointerX = event.clientX
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
        const isMobile = window.innerWidth < 560
        camera.fov = isMobile ? 40 : 35
        camera.position.z = isMobile ? 10.5 : 9
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
          progressRef.current = progress
          const next = Math.round(getStorySlide(progress))
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
      const animate = (time) => {
        if (isVisible) {
          const seconds = time * 0.001
          const motion = reducedMotion.matches ? 0 : 1
          const targetProgress = progressRef.current
          displayedProgress ??= targetProgress
          displayedProgress += (targetProgress - displayedProgress) * (motion ? 0.16 : 1)
          const copyReveal = THREE.MathUtils.clamp((displayedProgress - 0.18) / 0.5, 0, 1)
          if (sectionRef.current) {
            sectionRef.current.style.setProperty("--copy-progress", copyReveal.toFixed(3))
          }
          applyCopyProgress(copyTrackRef.current, displayedProgress)

          const storySlide = getStorySlide(displayedProgress)
          const chapterIndex = Math.floor(storySlide)
          const nextChapterIndex = Math.min(chapterIndex + 1, CHAPTER_STOPS.length - 1)
          const chapterBlend = storySlide - chapterIndex
          const cameraTargetX = CHAPTER_STOPS[chapterIndex]
            + (CHAPTER_STOPS[nextChapterIndex] - CHAPTER_STOPS[chapterIndex]) * chapterBlend
          const cameraX = cameraTargetX + 0.62
          camera.position.x += (cameraX - camera.position.x) * (motion ? 0.16 : 1)
          camera.lookAt(camera.position.x, 1.52, 0)
          world.rotation.y = dragRotation

          const visibleChapter = Math.round(storySlide)
          chapterStages.forEach((chapterStage, index) => {
            chapterStage.visible = index === visibleChapter
          })

          chapterParts.forEach((parts, index) => {
            const actionPulse = Math.sin(seconds * 1.1 + index * 0.8) * motion
            parts.guide.position.y = 0
            parts.guide.rotation.y = Math.sin(seconds * 0.28 + index) * 0.025 * motion
            parts.torso.scale.y = 1 + Math.sin(seconds * 1.2 + index) * 0.008 * motion
            parts.head.rotation.y = Math.sin(seconds * 0.58 + index) * 0.035 * motion + (index === 1 ? 0.08 : -0.03)
            parts.head.rotation.x = index === 2 ? Math.sin(seconds * 0.7) * 0.035 * motion : 0

            let writingBlend = 0
            if (index === 1) {
              const actionPhase = (seconds % 10) / 10
              if (actionPhase < 0.4) writingBlend = 1
              else if (actionPhase < 0.5) writingBlend = 1 - (actionPhase - 0.4) * 10
              else if (actionPhase < 0.6) writingBlend = (actionPhase - 0.5) * 10
              parts.clipboard.visible = true
              parts.pencil.visible = writingBlend > 0.5
              parts.medication.visible = writingBlend <= 0.5
            }

            const leftShoulderTarget = index === 1
              ? 0.3
              : [-0.3, -0.1, -0.12][index]
            const rightShoulderTarget = index === 1
              ? -0.35 * writingBlend + 0.98 * (1 - writingBlend) + Math.sin(seconds * 1.8) * 0.035 * (1 - writingBlend)
              : [0.45, 0.35, 0.62][index]
            const leftElbowTarget = index === 1 ? 1.2 : 0.12
            const rightElbowTarget = index === 1 ? -0.4 - writingBlend * 0.75 : -0.12
            const articulationEase = motion ? 0.12 : 1
            parts.leftArm.rotation.z += (leftShoulderTarget - parts.leftArm.rotation.z) * articulationEase
            parts.rightArm.rotation.z += (rightShoulderTarget - parts.rightArm.rotation.z) * articulationEase
            parts.leftElbow.rotation.z += (leftElbowTarget - parts.leftElbow.rotation.z) * articulationEase
            parts.rightElbow.rotation.z += (rightElbowTarget - parts.rightElbow.rotation.z) * articulationEase
            parts.rightHand.rotation.z = index === 1
              ? writingBlend * Math.sin(seconds * 8) * 0.12 + (1 - writingBlend) * actionPulse * 0.06
              : actionPulse * 0.06
            if (index === 1) {
              parts.head.rotation.y = writingBlend * 0.2 - (1 - writingBlend) * 0.12
              parts.head.rotation.x = writingBlend * 0.08
            }
            const speechOpen = 0.5 + 0.5 * Math.sin(seconds * 6.2 + index)
            parts.mouth.scale.y = 0.48 + speechOpen * 0.9 * motion
            parts.jaw.position.y = -0.045 - speechOpen * 0.045 * motion
            parts.book.rotation.y = -0.3 + Math.sin(seconds * 0.92) * 0.18 * motion
            parts.posDashboard.rotation.y = 0.18 + Math.sin(seconds * 0.45) * 0.08 * motion
            parts.hospital.rotation.y = -0.18 + Math.sin(seconds * 0.68) * 0.07 * motion
            parts.molecule.rotation.y += 0.008 * motion
            parts.network.rotation.y = Math.sin(seconds * 0.65 + index) * 0.12 * motion
            parts.ring.rotation.z = displayedProgress * 0.3
          })
          windowLight.emissiveIntensity = 0.22 + Math.max(0, Math.sin(seconds * 1.7)) * 0.3 * motion
          renderer.render(scene, camera)
        }
        animationFrame = window.requestAnimationFrame(animate)
      }
      animationFrame = window.requestAnimationFrame(animate)

      disposeScene = () => {
        window.cancelAnimationFrame(animationFrame)
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
          <div className="three-products-copy">
            <div className="three-products-copy-viewport">
              <div className="three-products-copy-track" ref={copyTrackRef} aria-live="polite">
                {CHAPTERS.map((item, index) => {
                  const ChapterIcon = item.icon
                  return (
                    <article key={item.key} className="three-products-copy-slide" aria-hidden={activeIndex !== index}>
                      <span className="three-products-eyebrow"><ChapterIcon size={16} /> {item.number} / {item.eyebrow}</span>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <a className="three-products-link" href={item.href} tabIndex={activeIndex === index ? 0 : -1}>
                        {item.action} <ArrowUpRight size={17} />
                      </a>
                    </article>
                  )
                })}
              </div>
            </div>
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