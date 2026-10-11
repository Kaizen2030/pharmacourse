import * as THREE from "three"

const PRODUCTS = [
  {
    key: "pharmacourse",
    name: "Pharmacourse",
    route: "/courses",
    color: 0x69f3b6,
    accent: 0x9cf6d1,
    x: -4,
  },
  {
    key: "pos",
    name: "RemedacarePOS",
    route: "/remedacarepos",
    color: 0x7de7d5,
    accent: 0xe9f9fd,
    x: 0,
  },
  {
    key: "hmis",
    name: "RemedacareHMIS",
    route: "/remedacarehmis",
    color: 0x8ac8ff,
    accent: 0xb9edff,
    x: 4,
  },
]

function toRadians(value) {
  return (value * Math.PI) / 180
}

export function createShowroomScene({ canvas, onSelect, onHoverChange, activeProductRef, reducedMotion }) {
  if (!canvas) return () => {}

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x030b10, 12, 26)

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 2.9, 11.5)
  let cameraDistance = 11.5

  const root = new THREE.Group()
  scene.add(root)

  const ambient = new THREE.HemisphereLight(0xdffaf5, 0x102228, 1.8)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight(0xe5fffb, 1.9)
  keyLight.position.set(4, 8, 8)
  scene.add(keyLight)

  const pointLightA = new THREE.PointLight(0x6ceab9, 22, 20, 2)
  pointLightA.position.set(-4, 3.2, 4)
  scene.add(pointLightA)

  const pointLightB = new THREE.PointLight(0x73d5ff, 15, 20, 2)
  pointLightB.position.set(4, 3.2, 2)
  scene.add(pointLightB)

  const pointLightC = new THREE.PointLight(0x7de7d5, 18, 20, 2)
  pointLightC.position.set(0, 4, 4)
  scene.add(pointLightC)

  const slabMaterial = new THREE.MeshStandardMaterial({
    color: 0x15272b,
    metalness: 0.72,
    roughness: 0.4,
  })
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xa6b9bc,
    metalness: 1,
    roughness: 0.15,
    emissive: 0x0c1a1f,
  })
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x21383d,
    metalness: 0.86,
    roughness: 0.34,
  })

  const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 8), slabMaterial)
  slab.position.y = -1.65
  root.add(slab)

  const slabTop = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.18, 7.2), new THREE.MeshStandardMaterial({
    color: 0x2d3d41,
    metalness: 0.8,
    roughness: 0.52,
  }))
  slabTop.position.y = -1.14
  root.add(slabTop)

  const grooveGroup = new THREE.Group()
  root.add(grooveGroup)

  const grooveConfigs = [
    { x: -4.2, z: 0.1 },
    { x: -0.2, z: 0.0 },
    { x: 3.8, z: -0.15 },
  ]

  const pulses = []
  grooveConfigs.forEach((config, index) => {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.05, 0.09), metalMaterial)
    groove.position.set(config.x, -0.88, config.z)
    groove.rotation.x = toRadians(0)
    grooveGroup.add(groove)

    const pulseMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 1.2, 2, 8),
      new THREE.MeshStandardMaterial({
        color: index === 0 ? 0x67f8c3 : index === 1 ? 0x7ee7d5 : 0x8fc7ff,
        emissive: index === 0 ? 0x1dd9a1 : index === 1 ? 0x2ccfc3 : 0x53a7ff,
        emissiveIntensity: 2,
        metalness: 0.1,
        roughness: 0.2,
      })
    )
    pulseMesh.scale.set(0.9, 0.42, 0.7)
    pulseMesh.position.set(-6.5 + index * 4, -0.83, config.z)
    grooveGroup.add(pulseMesh)
    pulses.push({ mesh: pulseMesh, speed: 0.42 + index * 0.18, drift: index * 1.7, start: index * 3 })
  })

  const pedestalGroup = new THREE.Group()
  root.add(pedestalGroup)

  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2f33,
    metalness: 0.85,
    roughness: 0.26,
    emissive: 0x0d191d,
  })

  const interactiveTargets = []
  const interactiveMeshes = []
  const productByKey = new Map()

  function addPedestal(baseX, item) {
    const pedestalRoot = new THREE.Group()
    pedestalRoot.position.set(baseX, 0, 0)
    pedestalGroup.add(pedestalRoot)

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.8, 48), pedestalMaterial)
    base.position.y = -0.08
    pedestalRoot.add(base)

    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.28, 0.26, 48), metalMaterial)
    outer.position.y = 0.54
    pedestalRoot.add(outer)

    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.87, 0.2, 36), new THREE.MeshStandardMaterial({
      color: item.color,
      emissive: item.color,
      emissiveIntensity: 0.5,
      metalness: 0.2,
      roughness: 0.35,
      transparent: true,
      opacity: 0.9,
    }))
    glow.position.y = 0.7
    pedestalRoot.add(glow)

    const product = new THREE.Group()
    product.position.y = 0.9
    pedestalRoot.add(product)
    productByKey.set(item.key, { base: pedestalRoot, product, glow, item })

    interactiveTargets.push({ key: item.key, mesh: product, link: item.route })
    product.traverse((child) => {
      if (child.isMesh) {
        child.userData.productKey = item.key
        interactiveMeshes.push(child)
      }
    })
    return { pedestalRoot, product, glow }
  }

  const productMeshes = {
    pharmacourse: null,
    pos: null,
    hmis: null,
  }

  const productSceneData = {}

  PRODUCTS.forEach((item) => {
    const { pedestalRoot, product, glow } = addPedestal(item.x, item)
    productSceneData[item.key] = { pedestalRoot, product, glow }
  })

  const bookMaterial = new THREE.MeshStandardMaterial({
    color: 0x214b40,
    metalness: 0.22,
    roughness: 0.45,
    emissive: 0x102d29,
  })
  const pharmacourseGroup = productSceneData.pharmacourse.product
  pharmacourseGroup.position.y = 1.2

  const bookLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.08), bookMaterial)
  bookLeft.position.set(-0.35, 0, 0)
  bookLeft.rotation.y = toRadians(8)
  pharmacourseGroup.add(bookLeft)

  const bookRight = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.08), bookMaterial)
  bookRight.position.set(0.35, 0, 0)
  bookRight.rotation.y = toRadians(-8)
  pharmacourseGroup.add(bookRight)

  const bookSpine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.45, 0.16), darkMetal)
  bookSpine.position.set(0, 0.02, 0)
  pharmacourseGroup.add(bookSpine)

  const particleGeometry = new THREE.BufferGeometry()
  const particleCount = 180
  const particlePositions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount; i += 1) {
    const i3 = i * 3
    particlePositions[i3] = (Math.random() - 0.5) * 1.5
    particlePositions[i3 + 1] = (Math.random() - 0.5) * 1.7
    particlePositions[i3 + 2] = (Math.random() - 0.5) * 1.5
  }
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3))
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({ color: 0x8ef5d5, size: 0.06, transparent: true, opacity: 0.95 })
  )
  particles.position.y = 1.2
  pharmacourseGroup.add(particles)

  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.45, 1),
    new THREE.MeshBasicMaterial({ color: 0xb0f7dd, wireframe: true, transparent: true, opacity: 0.8 })
  )
  orb.position.set(0, 1.6, 0)
  pharmacourseGroup.add(orb)

  const cardPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.54),
    new THREE.MeshStandardMaterial({
      color: 0xbafce1,
      emissive: 0x3fe2b4,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
  )
  cardPlane.position.set(1.25, 1.5, 0)
  cardPlane.rotation.y = -0.8
  pharmacourseGroup.add(cardPlane)

  const cardText = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.1, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x163b34, emissive: 0x0b2723, emissiveIntensity: 0.4 })
  )
  cardText.position.set(1.25, 1.62, 0.05)
  pharmacourseGroup.add(cardText)

  productMeshes.pharmacourse = pharmacourseGroup

  const posGroup = productSceneData.pos.product
  posGroup.position.y = 1.4

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.MeshPhysicalMaterial({
      color: 0x8ff0d8,
      transmission: 0.9,
      opacity: 0.34,
      transparent: true,
      metalness: 0.1,
      roughness: 0.12,
      thickness: 1.2,
      ior: 1.2,
      emissive: 0x0f4030,
      emissiveIntensity: 0.45,
    })
  )
  posGroup.add(cube)

  const capsule = new THREE.Group()
  capsule.position.y = 0.1
  posGroup.add(capsule)

  const capsuleBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.25, 0.9, 4, 12),
    new THREE.MeshStandardMaterial({
      color: 0xeaf7ff,
      emissive: 0x0b2a2d,
      emissiveIntensity: 0.5,
      metalness: 0.15,
      roughness: 0.22,
    })
  )
  capsule.add(capsuleBody)

  const greenPart = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 18, 16),
    new THREE.MeshStandardMaterial({ color: 0x5ff0a6, emissive: 0x1dcf86, emissiveIntensity: 1.2 })
  )
  greenPart.position.set(0.2, 0.3, 0)
  capsule.add(greenPart)

  const redPart = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 18, 16),
    new THREE.MeshStandardMaterial({ color: 0xff6f7f, emissive: 0xff4467, emissiveIntensity: 1.1 })
  )
  redPart.position.set(-0.2, -0.3, 0)
  capsule.add(redPart)

  const cross = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x7af9d0, emissive: 0x5de2b0, emissiveIntensity: 1.5 })
  )
  cross.position.set(1.3, 1.3, 0.4)
  posGroup.add(cross)

  const orbitGroup = new THREE.Group()
  posGroup.add(orbitGroup)

  for (let i = 0; i < 7; i += 1) {
    const tablet = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.06),
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x77ebc7 : 0xa3d0ff,
        emissive: i % 2 === 0 ? 0x1ebc86 : 0x2c8dff,
        emissiveIntensity: 1.1,
      })
    )
    const angle = (i / 7) * Math.PI * 2
    tablet.position.set(Math.cos(angle) * 1.6, Math.sin(angle) * 1.2 + 0.1, Math.sin(angle * 1.7) * 1.1)
    orbitGroup.add(tablet)
  }

  productSceneData.pos = { ...productSceneData.pos, capsule, cube, orbitGroup, cross }
  productMeshes.pos = posGroup

  const hmisGroup = productSceneData.hmis.product
  hmisGroup.position.y = 1.2

  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: 0x9de7ff,
    emissive: 0x47c5ff,
    emissiveIntensity: 1.7,
  })

  const nodePositions = [
    [-0.9, 0.45, 0],
    [0.9, 0.7, 0.2],
    [0.4, -0.8, -0.4],
    [-0.6, -0.7, 0.6],
    [0, 0.1, 0],
  ]

  const nodeGroup = new THREE.Group()
  hmisGroup.add(nodeGroup)

  const hmisNodes = []
  nodePositions.forEach((position, index) => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(index === 4 ? 0.28 : 0.14, 18, 18), nodeMaterial)
    node.position.set(...position)
    nodeGroup.add(node)
    hmisNodes.push(node)
  })

  hmisNodes.forEach((node, index) => {
    if (index === 0) return
    const connection = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.75, 12),
      new THREE.MeshStandardMaterial({
        color: 0x7ed4ff,
        emissive: 0x4fb4ff,
        emissiveIntensity: 1.2,
      })
    )
    const center = new THREE.Vector3().copy(node.position)
    const origin = new THREE.Vector3().copy(hmisNodes[0].position)
    connection.position.copy(origin.clone().add(center).multiplyScalar(0.5))
    connection.lookAt(center)
    connection.rotateX(Math.PI / 2)
    connection.scale.y = 1
    nodeGroup.add(connection)
  })

  const orbitalGroup = new THREE.Group()
  hmisGroup.add(orbitalGroup)

  for (let i = 0; i < 5; i += 1) {
    const orbitNode = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xb8f1ff,
        emissive: 0x5fd6ff,
        emissiveIntensity: 1.2,
      })
    )
    orbitNode.position.set(Math.cos(i * 1.2) * 1.7, 0.6 + Math.sin(i) * 0.7, Math.sin(i * 1.7) * 1.4)
    orbitalGroup.add(orbitNode)
  }

  productMeshes.hmis = hmisGroup

  interactiveTargets.forEach(({ key, mesh }) => {
    mesh.traverse((child) => {
      if (!child.isMesh) return
      child.userData.productKey = key
      interactiveMeshes.push(child)
    })
  })

  const pointer = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const smoothPointer = new THREE.Vector2(0, 0)
  const targetPointer = new THREE.Vector2(0, 0)

  let hoveredKey = null
  const handleHover = (nextKey) => {
    if (nextKey === hoveredKey) return
    hoveredKey = nextKey
    onHoverChange?.(nextKey || null)
  }

  const resize = () => {
    const width = canvas.clientWidth || 900
    const height = canvas.clientHeight || 520
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.fov = camera.aspect < 1.35 ? 55 : 32
    cameraDistance = camera.aspect < 1.35 ? 13.6 : 11.5
    camera.position.z = cameraDistance
    camera.updateProjectionMatrix()
  }

  resize()

  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect()
    targetPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    targetPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    canvas.style.cursor = "default"
  }

  const onPointerLeave = () => {
    targetPointer.set(0, 0)
    canvas.style.cursor = "default"
    handleHover(null)
  }

  canvas.addEventListener("pointermove", onPointerMove)
  canvas.addEventListener("pointerleave", onPointerLeave)
  const handleClick = () => {
    if (hoveredKey) {
      const selected = PRODUCTS.find((product) => product.key === hoveredKey)
      if (selected) onSelect?.(selected.route)
    }
  }
  canvas.addEventListener("click", handleClick)

  const clock = new THREE.Clock()
  let animationFrameId = 0

  function animate() {
    if (reducedMotion) {
      renderer.render(scene, camera)
      return
    }

    const elapsed = clock.getElapsedTime()

    smoothPointer.lerp(targetPointer, 0.08)
    pointer.copy(smoothPointer)

    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(interactiveMeshes, false)
    const nextKey = hits.length > 0 ? hits[0].object.userData.productKey : null

    if (nextKey !== hoveredKey) {
      handleHover(nextKey)
      if (nextKey) {
        canvas.style.cursor = "pointer"
      }
    }

    camera.position.x += (smoothPointer.x * 1.2 - camera.position.x) * 0.04
    camera.position.y += ((2.4 + smoothPointer.y * 0.8) - camera.position.y) * 0.04
    camera.lookAt(0, 1.4, 0)

    if (!reducedMotion) {
      const drift = elapsed * 0.3
      camera.position.z = cameraDistance + Math.sin(drift) * 0.35
    }

    PRODUCTS.forEach((product) => {
      const data = productSceneData[product.key]
      const active = hoveredKey === product.key || activeProductRef?.current === product.key
      const pedestalHit = data.pedestalRoot
      pedestalHit.position.y = THREE.MathUtils.lerp(pedestalHit.position.y, active ? 0.25 : 0, 0.08)
      data.glow.material.emissiveIntensity = active ? 1.2 : 0.5
      data.product.rotation.y += product.key === "pharmacourse" ? 0.005 : product.key === "pos" ? 0.009 : 0.007

      if (product.key === "pharmacourse") {
        const group = data.product
        group.position.y = 0.9 + Math.sin(elapsed * 1.4 + product.x) * 0.08
        group.rotation.x = active ? 0.18 : 0.05
        group.rotation.z = Math.sin(elapsed * 0.7 + product.x) * 0.12
        const pulseScale = active ? 1.25 : 1
        orb.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.08 * pulseScale)
        particles.rotation.y += 0.01
        cardPlane.position.x = 1.25 + Math.sin(elapsed * 2) * 0.15
        cardPlane.rotation.z = Math.sin(elapsed * 1.8) * 0.18
      }

      if (product.key === "pos") {
        const state = data
        state.cube.rotation.x += 0.018
        state.cube.rotation.y += 0.013
        state.capsule.rotation.y += active ? 0.04 : 0.02
        state.capsule.rotation.z += active ? 0.03 : 0.015
        state.capsule.rotation.x += 0.016
        state.cross.position.y = 1.15 + Math.sin(elapsed * 2.1) * 0.14
        state.cross.rotation.z = elapsed * 0.9
        state.orbitGroup.rotation.y += 0.012
        state.capsule.scale.setScalar(active ? 1.12 : 1)
      }

      if (product.key === "hmis") {
        const group = data.product
        const firstOrbit = group.children[0]
        const secondOrbit = group.children[1]
        group.rotation.y += active ? 0.02 : 0.011
        group.rotation.x = Math.sin(elapsed * 0.8) * 0.12
        if (firstOrbit) firstOrbit.rotation.y += active ? 0.03 : 0.015
        if (secondOrbit) secondOrbit.rotation.y -= active ? 0.018 : 0.01
      }
    })

    pulses.forEach((pulse, index) => {
      const offset = ((elapsed * pulse.speed) + pulse.start) % 12.5
      pulse.mesh.position.x = -6 + offset * 1.1 + index * 0.15
      pulse.mesh.scale.y = 0.4 + 0.18 * Math.sin((elapsed + index) * 3)
      pulse.mesh.material.emissiveIntensity = 1.5 + Math.sin(elapsed * 4 + index) * 0.8
    })

    renderer.render(scene, camera)
    animationFrameId = requestAnimationFrame(animate)
  }

  animationFrameId = requestAnimationFrame(animate)

  const handleResize = () => resize()
  window.addEventListener("resize", handleResize)

  const handleVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrameId)
    } else {
      animationFrameId = requestAnimationFrame(animate)
    }
  }

  document.addEventListener("visibilitychange", handleVisibility)

  return () => {
    cancelAnimationFrame(animationFrameId)
    canvas.removeEventListener("pointermove", onPointerMove)
    canvas.removeEventListener("pointerleave", onPointerLeave)
    canvas.removeEventListener("click", handleClick)
    window.removeEventListener("resize", handleResize)
    document.removeEventListener("visibilitychange", handleVisibility)
    renderer.dispose()
    scene.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }
}
