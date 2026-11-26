/**
 * Puppy Workbench — 3D island stage (v0.4).
 *
 * The island model (assets/island.glb, built by blender/build_island.py) is
 * drawn with three.js. All of the story logic stays in the drawn stage of
 * client.js (class Stage): this class extends it, keeps its SVG only as a flat
 * overlay for words (signs, name tags, speech bubbles, cards, flow lines) and
 * replaces every drawing call with a 3D one. Positions stay in the v0.3 screen
 * space (1280 × 800); the model was built from the same numbers, so
 * `fromScreen` / `toScreen` map between the two exactly.
 *
 * The user's rule: nothing pops in. Whatever appears, leaves or changes goes
 * through a Presence (a springy grow / rise, or a 150 ms fade when the system
 * asks for reduced motion) or one of the fade helpers below; `visible` is only
 * written inside those.
 */
import * as THREE from './vendor/three/build/three.module.min.js'
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js'
import { installPixelLook } from './pixel-look.js'

const V3 = THREE.Vector3
const S = 0.06            // metres per v0.3 plan unit
const VZ = 0.95           // v0.3 screen pixels per unit of height
const SEA = -3.0          // sea level, metres (island top is 0)
const U = 1.7             // metres per dog unit (DOG in build_island.py)
const PITCH = Math.asin(0.57)
// v0.3 vine points (screen space); the Blender vine follows the same line
const VINE = [[124, 503], [140, 478], [170, 462], [196, 440], [214, 418], [228, 398]]
// small things that fly between places: template, size, flat (faces the camera)
const PROPS = {
  envelope: ['Lib_Envelope', 2.2, true], letter: ['Lib_Envelope', 2.2, true],
  petal: ['Lib_Petal', 4.2, true], leaf: ['Lib_Leaf', 2.6, true],
  flower: ['Lib_Flower', 0.85, false], bundle: ['Lib_Bundle', 1.7, false],
  fluff: ['Lib_Dandelion', 1.7, false], boot: ['Lib_Boot', 1.8, false],
  puff: ['Lib_Puff', 1, false], bubble: ['Lib_Puff', 0.8, false], seed: [null, 1.2, false],
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2)
const backOut = (p) => { const c = 1.9; return p <= 0 ? 0 : 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2 }
/** Grow-in with a soft start and a small overshoot (backOut alone jumps to ~50% in its first frame). */
const popIn = (p) => backOut(p * p * (3 - 2 * p))
const turn = (a, b, k) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * k }
const hash = (text) => { let h = 7; for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) % 9973; return h / 9973 }

/** A damped spring toward `target` (about 10% overshoot): things grow in and settle. */
function spring(s, target, dt, k = 170, c = 15) {
  const steps = Math.max(1, Math.ceil(dt / 0.016))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    s.vel += ((target - s.v) * k - s.vel * c) * h
    s.v += s.vel * h
  }
  if (Math.abs(target - s.v) < 0.002 && Math.abs(s.vel) < 0.02) { s.v = target; s.vel = 0 }
  if (target === 0 && s.v < 0) { s.v = 0; s.vel = 0 }
}

/** Fades a model by swapping in transparent copies of its materials (kept per mesh). */
function setOpacity(obj, a) {
  obj.traverse((m) => {
    if (!m.isMesh) return
    if (a >= 0.999) {
      if (m.userData.solid) { m.material = m.userData.solid; m.userData.solid = null }
      return
    }
    if (!m.userData.solid) {
      m.userData.solid = m.material
      if (!m.userData.faded) {
        const copy = m.material.clone()
        copy.userData.base = m.material.transparent ? m.material.opacity : 1
        copy.transparent = true
        m.userData.faded = copy
      }
      m.material = m.userData.faded
    }
    m.material.opacity = a * m.material.userData.base
  })
}

export function webglAvailable() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

let pending = null
/** Loads the island model once per page; a failed load can be tried again. */
export function loadAssets(base) {
  if (!pending) {
    pending = new GLTFLoader().loadAsync(base + 'assets/island.glb')
    pending.catch(() => { pending = null })
  }
  return pending
}

/** Original Blender names → objects (GLTFLoader may suffix duplicates; userData.name keeps the original). */
function namesOf(root) {
  const map = new Map()
  root.traverse((o) => {
    const name = o.userData?.name || o.name
    if (name && !map.has(name)) map.set(name, o)
  })
  return map
}

export function createStage3D(kit) {
  const { Stage, planAt, P, C, svgEl } = kit

  /** v0.3 screen point seen at height `h` (metres) → three.js world point. */
  const fromScreen = (sx, sy, h = 0) => {
    const z = h / S
    const [x, y] = planAt(sx, sy + z * VZ)
    return new V3(x * S, h, y * S)
  }
  const toScreen = (v) => P(v.x / S, v.z / S, v.y / S)
  const onSea = (p) => fromScreen(p[0], p[1], SEA)

  /** Something that comes and goes: springs in (or fades when motion is reduced). */
  class Presence {
    constructor(stage, obj, apply) {
      this.stage = stage
      this.obj = obj
      this.apply = apply || ((k) => obj.scale.setScalar(Math.max(0.0001, k)))
      this.on = false
      this.s = { v: 0, vel: 0 }
      this.fade = 0
      this.delay = 0
      this.faded = false
      obj.visible = false
      stage.presences.add(this)
    }
    set(on, delayMs = 0) {
      on = !!on
      if (on === this.on) return
      this.on = on
      this.delay = this.stage.snap ? 0 : delayMs / 1000
      if (this.stage.snap) this.snap()
    }
    snap() {
      const t = this.on ? 1 : 0
      this.s.v = t
      this.s.vel = 0
      this.fade = t
      this.delay = 0
      this.draw()
    }
    get settled() {
      const t = this.on ? 1 : 0
      return this.s.v === t && this.s.vel === 0 && this.fade === t && this.delay <= 0
    }
    update(dt) {
      if (this.settled) return false
      if (this.delay > 0) { this.delay -= dt; return true }
      const t = this.on ? 1 : 0
      if (this.stage.reduced) {
        this.fade = t > this.fade ? Math.min(t, this.fade + dt / 0.15) : Math.max(t, this.fade - dt / 0.15)
        this.s.v = this.fade > 0 ? 1 : 0
        this.s.vel = 0
        if (this.fade === t) this.s.v = t
      } else {
        spring(this.s, t, dt)
        this.fade = t
      }
      this.draw()
      return true
    }
    draw() {
      const reduced = this.stage.reduced
      const shown = reduced ? this.fade > 0.001 : this.s.v > 0.001 || (this.on && this.delay <= 0)
      this.obj.visible = shown
      if (!shown) return
      this.apply(reduced ? 1 : this.s.v, this)
      const a = reduced ? this.fade : 1
      if (a < 0.999 || this.faded) { setOpacity(this.obj, a); this.faded = a < 0.999 }
    }
  }

  class Stage3D extends Stage {
    constructor(host, hooks, gltf) {
      super(host, hooks)
      try {
        this.setup3d(gltf)
      } catch (error) {
        this.dispose()
        throw error
      }
    }

    // ------------------------------------------------------------ set-up
    setup3d(gltf) {
      this.presences = new Set()
      this.fxItems = new Set()
      this.activity = 0
      this.snap = true
      this.dogs3 = new Map()
      this.tints = new Map()
      this.glow = { house: 0, shed: 0, islet: 0.35 }
      this.pulse = { house: 0, board: 0 }
      this.millRate = (Math.PI * 2) / 10
      this.millTarget = this.millRate
      this.millAngle = 0
      this.last = performance.now()
      this.lastRender = 0
      this.host.style.opacity = '0'
      this.host.style.transition = `opacity ${this.reduced ? 0.15 : 0.6}s ease`

      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
      canvas.setAttribute('aria-hidden', 'true')
      this.host.insertBefore(canvas, this.svg)
      this.svg.style.position = 'relative'
      this.svg.classList.add('pws-3d')

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
      this.renderer = renderer
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFShadowMap
      renderer.toneMapping = THREE.NeutralToneMapping
      renderer.setClearColor(0x2f7d74)
      renderer.autoClear = false

      this.scene = new THREE.Scene()
      this.fxScene = new THREE.Scene()   // flying things, drawn on top like the v0.3 effects layer
      const root = gltf.scene.clone(true)
      this.root = root
      this.scene.add(root)
      root.traverse((m) => {
        if (m.isMesh) { m.castShadow = true; m.receiveShadow = true }
      })
      const names = namesOf(root)
      this.node = (name) => names.get(name)
      for (const name of ['Sea', 'Pond', 'PondEdge', 'Paths']) {
        const m = this.node(name)
        if (m) m.traverse((o) => { o.castShadow = false })
      }
      // the parts library: templates the stage clones (dogs, flowers, props)
      this.lib = {}
      const library = this.node('Library')
      if (library) {
        library.removeFromParent()
        for (const child of [...library.children]) {
          child.position.set(0, 0, 0)
          child.updateMatrixWorld(true)
          this.lib[child.userData?.name || child.name] = child
        }
      }
      const sea = this.node('Sea')
      if (sea) {
        sea.material = sea.material.clone()
        sea.material.transparent = true
        sea.material.opacity = 0.72
        sea.material.depthWrite = false
        sea.receiveShadow = false   // the whale under the water would print a dark copy on the surface
      }

      // light: a warm sun from the upper left (as in the references) + sky
      const toSun = new V3(-0.4, 0, 0.9).normalize().multiplyScalar(Math.cos(0.873)).add(new V3(0, Math.sin(0.873), 0)).normalize()
      const sun = new THREE.DirectionalLight(0xfff0d8, 2.5)
      sun.position.copy(toSun).multiplyScalar(80)
      sun.castShadow = true
      sun.shadow.mapSize.set(2048, 2048)
      Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 200 })
      sun.shadow.bias = -0.0004
      sun.shadow.normalBias = 0.03
      sun.shadow.radius = 2.5
      this.scene.add(sun, sun.target)
      this.scene.add(new THREE.HemisphereLight(0xe8f6ff, 0x6f8f4a, 1.5))
      const fxSun = new THREE.DirectionalLight(0xfff0d8, 2.2)
      fxSun.position.copy(sun.position)
      this.fxScene.add(fxSun, fxSun.target, new THREE.HemisphereLight(0xe8f6ff, 0x8f9f7a, 1.7))

      // camera: the v0.3 view (screen right = plan (1,−1), depth squashed to sin(pitch) = 0.57)
      const camera = new THREE.OrthographicCamera(-32, 32, 20, -20, 1, 1200)
      this.camera = camera
      const target = fromScreen(640, 400, 0)
      const fwd = new V3(-Math.cos(PITCH) / Math.SQRT2, -Math.sin(PITCH), -Math.cos(PITCH) / Math.SQRT2)
      camera.position.copy(target).addScaledVector(fwd, -300)
      camera.lookAt(target)
      this.resize = () => {
        const w = this.host.clientWidth || 1280, h = this.host.clientHeight || 800
        renderer.setSize(w, h, false)
        const s = Math.min(w / 1280, h / 800)       // same fit as the SVG overlay (xMidYMid meet)
        const hw = w / s / 40, hh = h / s / 40      // 20 px per metre in v0.3 space
        Object.assign(camera, { left: -hw, right: hw, top: hh, bottom: -hh })
        camera.updateProjectionMatrix()
        this.lastRender = 0
      }
      this.ro = new ResizeObserver(() => this.resize())
      this.ro.observe(this.host)
      this.resize()

      this.puffGeo = new THREE.IcosahedronGeometry(0.3, 1)
      this.dropGeo = new THREE.SphereGeometry(0.16, 8, 6)
      this.buildMoving()
      this.adoptOverlay()
      this.patchIsland()
      // pixel-art look (v0.5): small render, banded colours, outlines; if it fails, the plain render stays
      try {
        this.pixel = installPixelLook(this, THREE, { px: 2 })
        this.dogBoost = 1.3   // dogs read better a bit bigger at this pixel size
        const base = this.resize
        this.resize = () => { base(); this.pixel.resize() }
      } catch (error) {
        console.warn('[puppy-workflow] pixel look failed, using the plain 3D render:', error)
        this.pixel = null
      }
      this.frame3 = this.frame3.bind(this)
      this.raf3 = requestAnimationFrame(this.frame3)
    }

    /** The parts of the model that move, and their resting transforms. */
    buildMoving() {
      const rest = (o) => o && { pos: o.position.clone(), quat: o.quaternion.clone(), scale: o.scale.clone() }
      const ownMaterials = (o) => o?.traverse((m) => { if (m.isMesh) m.material = m.material.clone() })
      this.whale = this.node('Whale')
      this.whaleRest = rest(this.whale)
      this.whaleTail = this.node('Whale_Tail')
      this.whaleTailRest = rest(this.whaleTail)
      this.whaleSpout = this.node('Whale_Spout')
      this.sails = this.node('Mill_Sails')
      this.sailsRest = rest(this.sails)
      this.doors = {}
      for (const [key, name] of [['house', 'House_Door'], ['shed', 'Shed_Door']]) {
        const o = this.node(name)
        if (!o) continue
        ownMaterials(o)
        this.doors[key] = { o, rest: rest(o), open: 0 }
      }
      this.islet = this.node('Islet')
      this.isletRest = rest(this.islet)
      this.isletLight = this.node('Islet_Light')
      ownMaterials(this.isletLight)
      this.makeNappers()
      this.rowboat = this.node('Boat')
      this.rowboatRest = rest(this.rowboat)
      this.trees = []
      for (const [name, o] of namesOf(this.root)) {
        const kind = name.startsWith('Tree_Cypress') ? 0.012 : name.startsWith('Tree_Round') ? 0.01 : name.startsWith('Bush_') ? 0.02 : 0
        if (kind) this.trees.push({ o, amp: kind, phase: hash(name) * 6.28, speed: 0.7 + hash(name + 'x') * 0.5 })
      }
      // board face: a drawn texture with the plan's lines
      const face = this.node('Board_Face')
      if (face?.isMesh) {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 168
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        const geo = face.geometry.clone()
        geo.computeBoundingBox()
        const box = geo.boundingBox, pos = geo.attributes.position, uv = []
        const w = box.max.z - box.min.z || 1, hgt = box.max.y - box.min.y || 1
        for (let i = 0; i < pos.count; i++) uv.push((box.max.z - pos.getZ(i)) / w, (pos.getY(i) - box.min.y) / hgt)
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
        face.geometry = geo
        face.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xfff3c4, emissiveIntensity: 0 })
        this.board3 = { canvas, tex, mat: face.material, widths: [0, 0, 0, 0], targets: [0, 0, 0, 0], dirty: true }
      }
      // flower beds (folders): the mound, scattered blooms, six flowers that grow on writes
      this.beds3 = [1, 2, 3, 4].map((n, index) => this.makeBed3(this.node('Bed_' + n), index))
      // buoys (web places)
      this.buoys3 = [1, 2, 3, 4].map((n, index) => {
        const o = this.node('Buoy_' + n)
        if (!o) return null
        const b = { o, rest: rest(o), k: 0, index }
        b.pres = new Presence(this, o, (k) => { b.k = k })
        return b
      })
      // the vine from the shed to the island middle, for the connector pulse
      this.vineCurve = new THREE.CatmullRomCurve3(VINE.map(([x, y]) => fromScreen(x, y, 0).add(new V3(0, 0.15, 0))))
      // glints on the sea (v0.3 had 18 short white strokes)
      const glint = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, 0.09), new THREE.MeshBasicMaterial({ color: 0xeaf6f0, transparent: true, opacity: 0.8, depthWrite: false }), 18)
      glint.frustumCulled = false
      this.glints = { mesh: glint, list: [] }
      {
        let seed = 21
        const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
        for (let i = 0; this.glints.list.length < 18 && i < 400; i++) {
          const x = rand() * 1280, y = 30 + rand() * 750
          if (x < 880 && y > 120 && y < 690) continue
          this.glints.list.push({ at: fromScreen(x, y, SEA + 0.03), len: 0.7 + rand() * 1.2, period: 5 + rand() * 4, phase: rand() * 9 })
        }
      }
      this.scene.add(glint)
    }

    makeBed3(o, index) {
      if (!o) return null
      const bed = { o, rest: { pos: o.position.clone() }, index, flowers: [], count: 0, wiggle: 0 }
      const [a, d] = o.userData.radii ?? [3, 1.8]
      const color = o.userData.color ?? '#f1c63c', light = o.userData.light ?? '#f8e27e'
      const e1 = new V3(1, 0, -1).normalize(), e2 = new V3(1, 0, 1).normalize()   // the mound's long axis runs screen-right
      const surface = (rho, phi) => new V3().addScaledVector(e1, Math.cos(phi) * a * rho).addScaledVector(e2, Math.sin(phi) * d * rho).setY(-0.3 + Math.sqrt(Math.max(0, 1 - rho * rho)))
      // blooms scattered over the top
      const tpl = this.lib.Lib_Bloom
      if (tpl) {
        let seed = 31 + index
        const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
        const n = Math.round(a * d * 13)
        const spots = []
        for (let i = 0; i < n; i++) spots.push([Math.sqrt(rand()) * 0.9, rand() * Math.PI * 2, rand(), rand()])
        tpl.updateMatrixWorld(true)
        tpl.traverse((m) => {
          if (!m.isMesh) return
          const petal = m.material.name === 'Bloom'
          const mat = m.material.clone()
          if (petal) mat.color.set(0xffffff)
          const inst = new THREE.InstancedMesh(m.geometry, mat, n)
          inst.castShadow = false
          inst.receiveShadow = true
          const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3()
          spots.forEach(([rho, phi, r1, r2], i) => {
            const p = surface(rho, phi)
            q.setFromEuler(new THREE.Euler((r1 - 0.5) * 0.5, r2 * 6.28, (r2 - 0.5) * 0.5))
            sc.setScalar(1.1 + r1 * 0.8)
            mx.compose(p, q, sc).multiply(m.matrixWorld)
            inst.setMatrixAt(i, mx)
            if (petal) inst.setColorAt(i, new THREE.Color(r1 > 0.65 ? light : color))
          })
          o.add(inst)
        })
      }
      // six flowers that grow, one per write
      const petal = color === '#f4efe2' ? C.yellow : color
      for (let i = 0; i < 6; i++) {
        const f = this.tinted('Lib_Flower', { Petal: petal })?.clone(true)
        if (!f) break
        const parts = namesOf(f)
        const flower = {
          o: f, g: 0, target: 0, delay: 0,
          stem: parts.get('Lib_Flower_Stem'), leaf: parts.get('Lib_Flower_Leaf'), head: parts.get('Lib_Flower_Head'),
        }
        f.position.copy(surface(0.5, -Math.PI / 2 + (i - 2.5) * 0.42)).add(new V3(0, -0.04, 0))
        f.rotation.y = i * 1.7
        f.scale.setScalar(1.15)
        f.visible = false
        o.add(f)
        bed.flowers.push(flower)
      }
      bed.pres = new Presence(this, o, (k) => {
        const s = Math.max(0.001, k)
        o.scale.set(0.7 + 0.3 * k, s, 0.7 + 0.3 * k)
        o.position.y = bed.rest.pos.y - (1 - Math.min(1, k)) * 0.2
      })
      return bed
    }

    /** Moves the overlay's words out of the drawn scenery, then drops the scenery. */
    adoptOverlay() {
      const L = this.isl.layers
      const words = svgEl('g', { class: 'pws-words' })
      this.svg.insertBefore(words, this.isl.objects)
      for (const node of this.svg.querySelectorAll('.pws-place')) words.append(node)
      const wall = L.island.querySelector('text')
      if (wall) words.append(wall)
      for (const bed of this.isl.beds) {
        words.append(bed.signLayer, bed.count)
        this.showNode(bed.signLayer, false)
      }
      words.append(this.isl.shed.sign.g.parentNode, this.isl.islet.sign.g)
      for (const buoy of this.isl.buoys) {
        words.append(buoy.sign.g)
        this.showNode(buoy.sign.g, false)
      }
      for (const layer of [L.bg, L.sea, L.whaleLayer, L.island, L.groundLayer, L.shadows, L.tufts, L.clouds, L.grain, L.speck]) layer?.remove()
      for (const node of [...this.isl.objects.children]) node.remove()
      for (const sign of this.svg.querySelectorAll('.pws-signpost')) sign.classList.add('pws-sign3')
    }

    /** Swaps the drawn island's handles for ones that drive the 3D model. */
    patchIsland() {
      const isl = this.isl
      isl.beds.forEach((bed, index) => {
        const b3 = this.beds3[index]
        bed.show = (on) => {
          b3?.pres.set(on)
          this.showNode(bed.signLayer, on, 14, 320)
        }
        bed.setBuds = (n) => b3 && this.setFlowers(b3, n)
        bed.count = this.countText(bed.count)
        this.flipSign(bed.sign)
      })
      for (const buoy of isl.buoys) this.flipSign(buoy.sign)
      this.flipSign(isl.shed.sign)
      this.flipSign(isl.islet.sign)
      isl.moreText = this.countText(isl.moreText)
      isl.sleepText = this.countText(isl.sleepText)
      const glowShim = (key) => ({ setAttribute: (k, v) => { if (k === 'opacity') this.glow[key] = +v } })
      const litShim = (key) => ({ classList: { add: () => { this.pulse[key] = 1 }, remove: () => {} } })
      isl.house.glow = glowShim('house')
      isl.shed.glow = glowShim('shed')
      isl.islet.light = glowShim('islet')
      isl.house.g = litShim('house')
      isl.board.g = litShim('board')
      isl.board.lines = [0, 1, 2, 3].map((i) => ({
        setAttribute: (k, v) => {
          if (k !== 'width' || !this.board3) return
          this.board3.targets[i] = +v
          if (this.snap) this.board3.widths[i] = +v
          this.board3.dirty = true
        },
      }))
      isl.sails = { style: { setProperty: (k, v) => { this.millTarget = (Math.PI * 2) / (parseFloat(v) || 10) } } }
      isl.wpt = () => (this.whaleSpout ? toScreen(this.whaleSpout.getWorldPosition(new V3())) : [1000, 420])
      // known anchors carry their 3D point, so real-scene trips (gull) start at the model
      const anchor = (arr, name) => {
        const o = this.node(name)
        if (arr && o) Object.defineProperty(arr, 'world', { configurable: true, get: () => o.getWorldPosition(new V3()) })
      }
      anchor(isl.house.doorTop, 'House_DoorTop')
      anchor(isl.shed.doorTop, 'Shed_DoorTop')
      anchor(isl.millTop, 'Mill_Top')
      anchor(isl.compost.top, 'Compost_Top')
      anchor(isl.islet.home, 'Islet_Home')
      this.patchCards()
    }

    patchCards() {
      const [chatG, planG] = this.isl.layers.ui.querySelectorAll(':scope > .pws-card')
      const rowsOf = (g) => [...g.children].filter((n) => n.tagName === 'g')
      const stateOf = (row) => (row.style.display === 'none' ? null : row.textContent + '|' + (row.querySelector('path')?.getAttribute('opacity') ?? ''))
      const slide = (g, on) => g.animate(
        [{ opacity: on ? 0 : 1, transform: `translate(0px, ${on ? 16 : 0}px)` }, { opacity: on ? 1 : 0, transform: `translate(0px, ${on ? 0 : 16}px)` }],
        { duration: this.reduced ? 150 : 380, easing: 'cubic-bezier(.2,.9,.3,1)' })
      const rowIn = (row) => row.animate(
        [{ opacity: 0, transform: this.reduced ? 'none' : 'translate(0px, 14px)' }, { opacity: 1, transform: 'none' }],
        { duration: this.reduced ? 150 : 320, easing: 'cubic-bezier(.2,.9,.3,1)' })
      const wrap = (card, g, method) => {
        const original = card[method]
        let token = 0
        card[method] = (...args) => {
          const was = g.style.display !== 'none'
          const rows = rowsOf(g)
          const before = rows.map(stateOf)
          const empty = method === 'set' && !(args[0] ?? []).length
          if (was && empty && !this.snap) {
            const mine = ++token
            slide(g, false).onfinish = () => { if (mine === token) original(...args) }
            return
          }
          token++
          original(...args)
          if (this.snap) return
          if (!was && g.style.display !== 'none') { slide(g, true); return }
          rows.forEach((row, i) => { const now = stateOf(row); if (now !== null && now !== before[i]) rowIn(row) })
        }
      }
      if (chatG) wrap(this.isl.chatCard, chatG, 'push')
      if (planG) wrap(this.isl.planCard, planG, 'set')
    }

    // ------------------------------------------------------------ overlay helpers (no pops)
    showNode(node, on, dy = 0, delay = 0) {
      if (!node || node.__on === on) return
      const first = node.__on === undefined
      node.__on = on
      node.style.display = ''
      node.style.opacity = on ? '' : '0'
      node.style.pointerEvents = on ? '' : 'none'
      if (first || this.snap) return
      const move = this.reduced ? 0 : dy
      node.animate(
        [{ opacity: on ? 0 : 1, transform: `translate(0px, ${on ? move : 0}px)` }, { opacity: on ? 1 : 0, transform: `translate(0px, ${on ? 0 : move}px)` }],
        { duration: this.reduced ? 150 : on ? 460 : 300, delay: on && !this.reduced ? delay : 0, easing: on ? 'cubic-bezier(.2,1.5,.4,1)' : 'ease-in', fill: 'backwards' })
    }
    /** A sign turns over to show its new name instead of switching at once. */
    flipSign(sign) {
      const set = sign.set
      let chain = Promise.resolve(), last = null
      sign.set = (value, title) => {
        const key = value + '\u0001' + (title ?? '')
        if (key === last) return
        last = key
        const hidden = sign.g.__on === false || sign.g.parentNode?.__on === false
        if (this.snap || hidden) { set(value, title); return }
        chain = chain.then(async () => {
          if (!this.alive) return
          const half = this.reduced ? 75 : 150
          const out = this.reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }]
          await sign.g.animate(out, { duration: half, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {})
          set(value, title)
          const back = sign.g.animate([...out].reverse(), { duration: half + 40, easing: 'ease-out', fill: 'forwards' })
          await back.finished.catch(() => {})
          back.cancel()
        })
      }
    }
    /** Text whose numbers count up one by one (and fades when the wording changes). */
    countText(node) {
      const stage = this
      let target = node.textContent, timer = null
      return {
        node,
        get textContent() { return target },
        set textContent(value) {
          value = String(value ?? '')
          if (value === target) return
          const from = node.textContent
          target = value
          clearInterval(timer)
          if (stage.snap || !stage.alive) { node.textContent = value; return }
          const shape = (s) => s.replace(/\d+/g, '#')
          if (from && value && shape(from) === shape(value) && !stage.reduced) {
            const goal = value.match(/\d+/g).map(Number)
            const now = from.match(/\d+/g).map(Number)
            const step = () => {
              let done = true
              now.forEach((n, i) => {
                if (n === goal[i]) return
                const d = goal[i] - n
                now[i] = n + Math.sign(d) * Math.max(1, Math.round(Math.abs(d) / 4))
                if (now[i] !== goal[i]) done = false
              })
              let k = 0
              node.textContent = value.replace(/\d+/g, () => now[k++])
              node.animate([{ transform: 'translate(0px, -3px)', opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 160 })
              if (done) clearInterval(timer)
            }
            step()
            timer = setInterval(step, 110)
          } else {
            node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: from ? 140 : 1, fill: 'forwards' }).finished.then(() => {
              if (target !== value) return
              node.textContent = value
              node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' }).finished.then((a) => a.cancel?.(), () => {})
            }, () => {})
          }
        },
      }
    }

    // ------------------------------------------------------------ overrides of the drawn stage
    async tween(ms, fn) {
      this.activity = (this.activity ?? 0) + 1
      try { return await super.tween(ms, fn) } finally { this.activity-- }
    }
    sync(data) {
      if (!this.started) this.snap = true
      super.sync(data)
    }
    makeDog(row, index) {
      const dog = super.makeDog(row, index)
      for (const node of [dog.flip, dog.back, dog.shadow]) node.style.display = 'none'
      svgEl('rect', { x: -24, y: -56, width: 64, height: 60, fill: '#000', 'fill-opacity': 0 }, dog.root)
      const shift = svgEl('g', { transform: 'translate(0 7)' })
      dog.bubble.parentNode.insertBefore(shift, dog.bubble)
      shift.append(dog.bubble)
      dog.zzz.style.transition = 'opacity .4s'
      dog.ring.style.transition = 'opacity .25s'
      dog.born = performance.now()
      return dog
    }
    setHidden(dog, hidden) {
      dog.hidden = hidden
      const root = dog.root
      if (hidden) {
        // a dog made this very moment has not been seen yet: hide it at once (a fade would flash it first)
        const unseen = performance.now() - (dog.born ?? 0) < 60 || root.getAttribute('opacity') === '0'
        if (this.snap || unseen || root.style.display === 'none') { root.style.display = 'none'; return }
        root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).onfinish = () => { if (dog.hidden) root.style.display = 'none' }
      } else {
        const was = root.style.display === 'none'
        root.style.display = ''
        if (was && !this.snap) root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 })
      }
    }
    drawDog(dog) {
      super.drawDog(dog)
      if (dog.lastAlpha !== undefined && dog.lastAlpha !== dog.alpha && !this.snap) {
        dog.root.animate([{ opacity: dog.lastAlpha }, { opacity: dog.alpha }], { duration: 260 })
      }
      dog.lastAlpha = dog.alpha
    }
    setBubble(dog, text) {
      const was = dog.bubble.getAttribute('opacity') === '1'
      const prev = dog.bubbleText.textContent
      super.setBubble(dog, text)
      if (this.snap || dog.hidden) return
      const now = !!text
      if (now && !was) dog.bubble.animate([{ opacity: 0, transform: this.reduced ? 'none' : 'translate(0px, 6px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: this.reduced ? 150 : 220, easing: 'cubic-bezier(.2,1.4,.4,1)' })
      else if (!now && was) dog.bubble.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 })
      else if (now && prev !== text) dog.bubbleText.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 180 })
    }
    renderSlot(kind, index, pop) {
      super.renderSlot(kind, index, pop)
      if (kind === 'buoy') {
        const on = !!this.slots.buoy[index]
        this.buoys3[index]?.pres.set(on, 0)
        this.showNode(this.isl.buoys[index].sign.g, on, 10, 380)
      }
    }
    drawFlows(show) {
      const group = this.isl.flows
      const before = new Set([...group.querySelectorAll('text')].map((t) => t.textContent))
      super.drawFlows(show)
      if (this.snap || !show) return
      for (const text of group.querySelectorAll('text')) {
        if (before.has(text.textContent)) continue
        const path = text.previousElementSibling
        for (const node of [text, path]) node?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: this.reduced ? 150 : 420 })
      }
    }
    pop() {}
    wiggle(node) {
      const bed = this.beds3.find((b, i) => b && this.isl.beds[i].body === node)
      if (bed && !this.reduced) bed.wiggle = 1
    }
    mouthOf(dog) {
      const d3 = this.dogs3.get(dog.id)
      if (!d3?.placed) return super.mouthOf(dog)
      return toScreen(d3.mouth.getWorldPosition(new V3()))
    }
    basketOf(dog) {
      const d3 = this.dogs3.get(dog.id)
      if (!d3?.placed) return super.basketOf(dog)
      return toScreen(d3.basket.getWorldPosition(new V3()))
    }

    // ------------------------------------------------------------ effects in 3D
    /** A short-lived effect run by the render loop: step(p) for p in 0…1, then done(). */
    addFx(obj, seconds, step, done, delay = 0) {
      const item = { obj, t: -delay, dur: seconds, step, done }
      obj.visible = false
      this.fxScene.add(obj)
      this.fxItems.add(item)
      return item
    }
    stepFx(dt) {
      for (const item of this.fxItems) {
        item.t += dt
        if (item.t < 0) continue
        const p = Math.min(1, item.t / item.dur)
        item.obj.visible = true
        item.step(p)
        if (p >= 1) {
          this.fxScene.remove(item.obj)
          this.fxItems.delete(item)
          item.done?.()
        }
      }
    }
    tinted(name, tint) {
      const tpl = this.lib[name]
      if (!tpl || !tint) return tpl
      const key = name + '|' + Object.entries(tint).join(',')
      if (!this.tints.has(key)) {
        const copy = tpl.clone(true)
        copy.traverse((m) => {
          if (!m.isMesh) return
          const color = tint[m.material.name] ?? tint['*']
          if (!color) return
          m.material = m.material.clone()
          m.material.color.set(color)
        })
        this.tints.set(key, copy)
      }
      return this.tints.get(key)
    }
    prop(kind, color) {
      const [name, size, flat] = PROPS[kind] ?? PROPS.leaf
      const holder = new THREE.Group()
      let model
      if (!name) {
        model = new THREE.Group()
        const seed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc88c3c, roughness: 0.8 }))
        seed.scale.set(1, 1.4, 1)
        const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 6), new THREE.MeshStandardMaterial({ color: 0x5d9a45, roughness: 0.8 }))
        sprout.position.y = 0.22
        model.add(seed, sprout)
      } else {
        const tint = kind === 'flower' ? (color ? { Petal: color } : null) : (kind === 'leaf' || kind === 'puff') && color ? { '*': color } : null
        const tpl = this.tinted(name, tint)
        if (!tpl) return holder
        if (!tpl.userData.centre) tpl.userData.centre = new THREE.Box3().setFromObject(tpl).getCenter(new V3())
        model = tpl.clone(true)
        model.position.copy(tpl.userData.centre).negate()
      }
      holder.add(model)
      holder.userData.size = size
      holder.userData.flat = flat
      return holder
    }
    async toss(kind, from, to, ms, height, dog, color) {
      if (this.reduced) return
      const obj = this.prop(kind, color)
      const { size, flat } = obj.userData
      const spin = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 2)
      // the tween's first step comes a frame later: start tiny at the start point, never at full size
      obj.position.copy(fromScreen(from[0], from[1], 1.5))
      obj.scale.setScalar(0.001)
      this.fxScene.add(obj)
      try {
        await this.tween(dog?.rush ? ms * 0.4 : ms, (p) => {
          const sx = from[0] + (to[0] - from[0]) * p
          const sy = from[1] + (to[1] - from[1]) * p - height * 4 * p * (1 - p)
          obj.position.copy(fromScreen(sx, sy, 1.5))
          obj.scale.setScalar(Math.max(0.001, size * Math.min(easeInOut(clamp(p * 4)), easeInOut(clamp((1 - p) * 5)))))
          if (flat) {
            obj.quaternion.copy(this.camera.quaternion)
            obj.rotateX(Math.PI / 2 - 0.45)
            obj.rotateY(p * spin)
          } else {
            obj.rotation.set(Math.sin(p * 6) * 0.25, p * spin, 0)
          }
        })
      } finally {
        this.fxScene.remove(obj)
      }
    }
    poof(x, y) {
      if (this.reduced) return
      this.poofAt(fromScreen(x, y + 14, 0).add(new V3(0, 0.8, 0)))
    }
    poofAt(at) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 1, transparent: true })
      const g = new THREE.Group()
      g.position.copy(at)
      for (let i = 0; i < 9; i++) g.add(new THREE.Mesh(this.puffGeo, mat))
      this.addFx(g, 0.65, (p) => {
        const e = 1 - (1 - p) ** 2
        const swell = easeInOut(clamp(p / 0.18))
        g.children.forEach((m, i) => {
          if (i === 8) { m.scale.setScalar((1.6 * (1 - p) + 0.2) * swell); return }
          const a = (i * Math.PI) / 4
          m.position.set(Math.cos(a) * e * 1.6, e * 0.5, Math.sin(a) * e * 1.6)
          m.scale.setScalar((0.5 + e * 0.6) * swell)
        })
        mat.opacity = swell * (1 - p)
      }, () => mat.dispose())
    }
    puffs(x, y, color, n = 3, rise = 34) {
      if (this.reduced) return
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: color || '#ffffff', roughness: 1, transparent: true })
        const m = new THREE.Mesh(this.puffGeo, mat)
        const dx = (i - (n - 1) / 2) * 6
        this.addFx(m, 1.2, (p) => {
          m.position.copy(fromScreen(x + dx + p * 8, y - p * rise, 1.5))
          m.scale.setScalar(0.8 + p * 0.9)
          mat.opacity = 0.9 * (1 - p) * Math.min(1, p * 8)
        }, () => mat.dispose(), i * 0.22)
      }
    }
    async grow(bed) {
      const b3 = this.beds3[this.isl.beds.indexOf(bed)]
      if (!b3) return
      if (b3.count >= 6) {
        this.setFlowers(b3, 0)
        await this.wait(520)
      }
      this.setFlowers(b3, b3.count + 1)
      await this.wait(this.reduced ? 150 : 820)
    }
    setFlowers(b3, n) {
      n = Math.max(0, Math.min(6, n))
      const grew = n > b3.count
      b3.flowers.forEach((f, i) => {
        const target = i < n ? 1 : 0
        if (f.target === target) return
        f.target = target
        f.delay = this.snap ? 0 : grew ? (i - b3.count) * 0.12 : (b3.count - 1 - i) * 0.06
        if (this.snap) { f.g = target; this.drawFlower(f) }
      })
      b3.count = n
    }
    drawFlower(f) {
      f.o.visible = f.g > 0.001
      if (!f.o.visible) return
      if (this.reduced) {
        for (const part of [f.stem, f.leaf, f.head]) part?.scale.setScalar(1)
        if (f.stem) f.head?.position.setY(0.92)
        setOpacity(f.o, f.g)
        return
      }
      const stem = clamp(f.g / 0.45)
      if (f.stem) f.stem.scale.set(1, Math.max(0.001, stem), 1)
      if (f.leaf) { f.leaf.scale.setScalar(Math.max(0.001, popIn(clamp((f.g - 0.3) / 0.35)))); f.leaf.position.y = 0.35 * stem }
      if (f.head) { f.head.scale.setScalar(Math.max(0.001, popIn(clamp((f.g - 0.5) / 0.5)))); f.head.position.y = 0.92 * stem }
    }
    async spout() {
      if (this.reduced) return
      const W = this.isl.whale
      W.spouting = true
      try {
        await this.tween(300, (p) => { W.lift = p })
        if (this.whaleSpout) this.burst(this.whaleSpout.getWorldPosition(new V3()))
        await this.tween(900, () => {})
        await this.tween(380, (p) => { W.lift = 1 - p })
      } finally {
        W.spouting = false
        W.lift = 0
      }
    }
    makeNappers() {
      const tpl = this.lib.Lib_Gull, home = this.node('Islet_Home')
      if (!tpl || !home || !this.islet) return
      this.islet.updateWorldMatrix(true, true)
      const at = this.islet.worldToLocal(home.getWorldPosition(new V3()))
      const sw = this.islet.getWorldScale(new V3()).x || 1
      const scale = 1.25 / sw
      this.napWake = 0
      this.nappers = [[-0.9, 0.35, 0.6], [0.7, -0.45, 2.4]].map(([dx, dz, yaw]) => {
        const o = tpl.clone(true)
        const parts = namesOf(o)
        const wings = [parts.get('Lib_Gull_WingL'), parts.get('Lib_Gull_WingR')]
        o.rotation.order = 'YXZ'
        o.scale.setScalar(scale)
        // stand on the islet's ground: drop a ray from above at that spot
        const spot = home.getWorldPosition(new V3()).add(new V3(dx, 0, dz))
        const hit = new THREE.Raycaster(spot.clone().setY(spot.y + 20), new V3(0, -1, 0)).intersectObject(this.islet, true)[0]
        if (hit) spot.y = hit.point.y
        const rest = this.islet.worldToLocal(spot.clone())
        o.position.copy(rest)
        this.islet.add(o)
        return { o, wings, wingRest: wings.map((w) => w?.quaternion.clone()), rest, yaw }
      })
    }
    /** The final answer: a spout, and a rainbow that grows out of it, stays a moment and fades. */
    async rainbow() {
      if (this.reduced || !this.whaleSpout) return this.spout()
      const at = this.whaleSpout.getWorldPosition(new V3())
      const colors = ['#ec5f52', '#f3a23f', '#f6dc52', '#7fc65c', '#55aadb', '#6e72d4', '#a46fcb']
      const g = new THREE.Group()
      const mats = colors.map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false }))
      const R = 5.2
      colors.forEach((c, i) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(R - i * 0.34, 0.18, 4, 40, Math.PI), mats[i])
        g.add(m)
      })
      g.position.copy(at).add(new V3(0, 0.6, 0))
      g.quaternion.copy(this.camera.quaternion)
      this.spout().catch(() => {})
      this.addFx(g, 3.2, (p) => {
        const grow = popIn(clamp(p / 0.28))
        g.scale.setScalar(Math.max(0.001, grow))
        const o = 0.85 * clamp(p / 0.15) * (1 - clamp((p - 0.7) / 0.3))
        for (const m of mats) m.opacity = o
      }, () => { mats.forEach((m) => m.dispose()); g.children.forEach((m) => m.geometry.dispose()) }, 0.45)
    }
    /** The whale thinking: round bubbles rise from its blowhole, wobble and pop. */
    thinkBubbles(n) {
      if (this.reduced || !this.whaleSpout) return
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xf4fbfd, transparent: true, opacity: 0.95 })
        const m = new THREE.Mesh(this.puffGeo, mat)
        const side = (i % 2 ? 1 : -1) * (0.3 + (i % 3) * 0.25)
        const size = 1.5 + (i % 3) * 0.45
        this.addFx(m, 1.6, (p) => {
          const at = this.whaleSpout.getWorldPosition(new V3())
          m.position.set(at.x + side * p + Math.sin(p * 9 + i) * 0.25, at.y + 0.4 + p * 4.2, at.z + side * 0.4 * p)
          const pop = p > 0.86 ? 1 + (p - 0.86) * 4 : 1
          m.scale.setScalar(Math.max(0.001, size * popIn(clamp(p / 0.2)) * pop))
          mat.opacity = 0.95 * (1 - clamp((p - 0.86) / 0.14))
        }, () => mat.dispose(), i * 0.28)
      }
    }
    /** Idle play only: a small butterfly flutters around a dog's head and away. */
    butterfly(dog) {
      if (this.reduced) return
      const d3 = this.dogs3.get(dog.id)
      if (!d3) return
      const mat = new THREE.MeshBasicMaterial({ color: ['#f6e27a', '#f5f1e6', '#c9a3dc'][Math.floor(Math.random() * 3)], side: THREE.DoubleSide })
      const wing = new THREE.PlaneGeometry(0.34, 0.26)
      const g = new THREE.Group(), wl = new THREE.Mesh(wing, mat), wr = new THREE.Mesh(wing, mat)
      wl.position.x = -0.17; wr.position.x = 0.17
      const l = new THREE.Group(), r = new THREE.Group()
      l.add(wl); r.add(wr)
      g.add(l, r)
      const centre = d3.pos.clone().add(new V3(0, 1.9 * d3.scale, 0))
      const away = new V3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(4)
      const spin = Math.random() < 0.5 ? -1 : 1
      this.addFx(g, 3.4, (p) => {
        const now = performance.now()
        const a = spin * p * Math.PI * 3.2
        const out = easeInOut(clamp((p - 0.72) / 0.28))
        g.position.set(centre.x + Math.cos(a) * 0.9 + away.x * out, centre.y + Math.sin(p * 9) * 0.25 + out * 2.2, centre.z + Math.sin(a) * 0.9 + away.z * out)
        g.rotation.set(0.3, -a, 0)
        const flap = Math.sin(now / 45) * 1.1
        l.rotation.y = flap; r.rotation.y = -flap
        g.scale.setScalar(Math.max(0.001, popIn(clamp(p / 0.12)) * (1 - easeInOut(clamp((p - 0.85) / 0.15)))))
      }, () => { mat.dispose(); wing.dispose() })
    }
    /** The whale's fountain: a fan of drops that rise, fall and fade. */
    burst(at) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xd4edf0, roughness: 0.3, transparent: true, opacity: 0.95 })
      const g = new THREE.Group()
      g.position.copy(at)
      const drops = []
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2
        const m = new THREE.Mesh(this.dropGeo, mat)
        drops.push({ m, v: new V3(Math.cos(a) * (1.2 + (i % 3) * 0.7), 8.5 + (i % 4) * 1.4, Math.sin(a) * (1.2 + (i % 3) * 0.7)) })
        g.add(m)
      }
      this.addFx(g, 1.5, (p) => {
        const t = p * 1.5
        for (const d of drops) {
          d.m.position.set(d.v.x * t, d.v.y * t - 7 * t * t, d.v.z * t)
          d.m.scale.setScalar(Math.min(1, p * 8) * (1.2 - p * 0.5))
        }
        mat.opacity = 0.95 * (1 - clamp((p - 0.6) / 0.4))
      }, () => mat.dispose())
    }
    async boatTrip(from, to, cargo, dog) {
      if (this.reduced) return
      const tpl = this.lib.Lib_MailBoat
      if (!tpl) return
      const boat = new THREE.Group()
      boat.add(tpl.clone(true))
      if (cargo) {
        const c = this.prop(cargo)
        c.scale.setScalar(c.userData.size * 0.6)
        c.position.set(0.5, 0.75, 0)
        boat.add(c)
      }
      boat.rotation.order = 'YXZ'
      const a = onSea(from), b = onSea(to)
      const yaw = Math.atan2(-(b.z - a.z), b.x - a.x)
      const ms = dog?.rush ? 600 : 1800
      boat.scale.setScalar(0.001)
      this.scene.add(boat)
      try {
        await this.tween(ms, (p) => {
          const e = easeInOut(p), now = performance.now()
          boat.position.lerpVectors(a, b, e)
          boat.position.y = SEA + 0.1 + Math.sin(now / 380) * 0.06
          boat.rotation.set(Math.sin(now / 470) * 0.04, yaw, Math.sin(now / 420) * 0.05)
          const t = p * ms, edge = Math.min(420, ms * 0.35)
          boat.scale.setScalar(Math.max(0.001, Math.min(popIn(clamp(t / edge)), easeInOut(clamp((ms - t) / edge)))))
        })
      } finally {
        this.scene.remove(boat)
      }
    }
    /** Where a gull flies: a model anchor when the point has one, else 3.8 m above the ground under it. */
    airPoint(p) {
      return p.world ?? fromScreen(p[0], p[1], 3.8)
    }
    async gullTrip(from, to, letter, dog) {
      if (this.reduced) return
      const tpl = this.lib.Lib_Gull
      if (!tpl) return
      const a = this.airPoint(from), b = this.airPoint(to)
      let gull = this.gull
      if (gull && gull.at.distanceTo(a) < 0.6) {
        clearTimeout(gull.timer)
        gull.fresh = false
      } else {
        if (gull) this.gullAway(gull, true)
        const o = tpl.clone(true)
        const parts = namesOf(o)
        gull = { o, wings: [parts.get('Lib_Gull_WingL'), parts.get('Lib_Gull_WingR')], at: a, fresh: true, letter: null }
        gull.wingRest = gull.wings.map((w) => w?.quaternion.clone())
        o.rotation.order = 'YXZ'
        o.scale.setScalar(0.001)
        this.scene.add(o)
      }
      this.gull = gull
      // the letter in its beak never pops: a new one grows in, a dropped one shrinks away, a kept one stays
      let newLetter = null, oldLetter = null
      if (letter && !gull.letter) {
        newLetter = gull.letter = this.prop('envelope')
        newLetter.scale.setScalar(0.001)
        newLetter.position.set(0, -0.25, 0)
        gull.o.add(newLetter)
      } else if (!letter && gull.letter) {
        oldLetter = gull.letter
        gull.letter = null
      }
      const yaw = Math.atan2(-(b.z - a.z), b.x - a.x)
      const ms = dog?.rush ? 500 : 1500
      const home = to === this.isl.islet.home
      const grow = gull.fresh
      const edge = Math.min(420, ms * 0.4)
      try {
        await this.tween(ms, (p) => {
          gull.o.position.lerpVectors(a, b, p)
          gull.o.position.y += 2.8 * Math.sin(p * Math.PI)
          gull.o.rotation.set(0, yaw, Math.sin(p * Math.PI) * 0.12)
          this.flap(gull, performance.now(), 1)
          const t = p * ms
          const k = Math.min(grow ? popIn(clamp(t / edge)) : 1, home ? easeInOut(clamp((ms - t) / edge)) : 1)
          if (!gull.leaving) gull.o.scale.setScalar(Math.max(0.001, k * 1.6)) // once sent away, the shrink owns the scale
          if (newLetter) newLetter.scale.setScalar(Math.max(0.001, 1.1 * popIn(clamp(t / 320))))
          if (oldLetter) oldLetter.scale.setScalar(Math.max(0.001, 1.1 * (1 - easeInOut(clamp(t / 260)))))
        })
      } catch (error) {
        this.gullAway(gull, true)
        throw error
      } finally {
        if (oldLetter) gull.o.remove(oldLetter)
      }
      gull.at = b
      if (home) { this.gullAway(gull, false); return }
      // hover a moment; if no trip continues from here, fly home on its own
      gull.timer = setTimeout(() => {
        if (this.gull === gull && this.alive) this.gullTrip(b, this.isl.islet.home, false).catch(() => {})
      }, 1400)
    }
    flap(gull, now, k) {
      gull.wings.forEach((w, i) => {
        if (!w) return
        w.quaternion.copy(gull.wingRest[i]).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((i ? -1 : 1) * Math.sin(now / 70) * 0.7 * k, 0, 0)))
      })
    }
    gullAway(gull, shrink) {
      clearTimeout(gull.timer)
      if (this.gull === gull) this.gull = null
      if (gull.leaving) return
      gull.leaving = true
      if (!shrink) { this.scene.remove(gull.o); return }
      const s0 = gull.o.scale.x
      this.addFx(new THREE.Group(), 0.3, (p) => { gull.o.scale.setScalar(Math.max(0.001, s0 * (1 - easeInOut(p)))) }, () => this.scene.remove(gull.o))
    }
    async vinePulse(ms = 1300) {
      if (this.reduced || !this.vineCurve) return
      const mat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true })
      const dots = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(this.dropGeo, mat)
        m.visible = false
        this.fxScene.add(m)
        return m
      })
      try {
        await this.tween(ms, (p) => dots.forEach((dot, i) => {
          const k = p * 1.5 - i * 0.25
          dot.visible = k > 0 && k < 1
          if (!dot.visible) return
          dot.position.copy(this.vineCurve.getPointAt(1 - k))
          dot.scale.setScalar(1.3 * Math.min(1, k * 6, (1 - k) * 6))
        }))
      } finally {
        dots.forEach((dot) => this.fxScene.remove(dot))
        mat.dispose()
      }
    }

    // ------------------------------------------------------------ dogs in 3D
    makeDog3(dog) {
      const names = { shiba: 'Lib_Dog_Shiba', brown: 'Lib_Dog_Brown', cream: 'Lib_Dog_Cream' }
      const tplName = names[dog.kind] ?? names.brown
      const tpl = this.lib[tplName]
      if (!tpl) return null
      const model = tpl.clone(true)
      const parts = namesOf(model)
      const part = (s) => parts.get(tplName + s)
      const hips = new V3(-0.24 * U, 0.4 * U, 0)
      const base = new THREE.Group(), lift = new THREE.Group(), pivot = new THREE.Group()
      pivot.position.copy(hips)
      model.position.copy(hips).negate()
      base.add(lift)
      lift.add(pivot)
      pivot.add(model)
      const d3 = {
        dog, base, lift, pivot,
        body: part('_Body'), head: part('_Head'), tail: part('_Tail'),
        legs: ['_Leg_FL', '_Leg_FR', '_Leg_BL', '_Leg_BR'].map(part),
        pos: new V3(), prev: new V3(), yaw: 0, placed: false, tp: false, wanted: false, dead: false,
        cur: { pitch: 0, drop: 0, head: 0, roll: 0, yawHead: 0, legs: [0, 0, 0, 0], front: 1, back: 1 },
      }
      for (const p of [d3.body, d3.head, d3.tail, ...d3.legs]) if (p) p.userData.rest = p.quaternion.clone()
      d3.mouth = new THREE.Object3D()
      d3.mouth.position.set(0.46 * U, 0.17 * U, 0)
      ;(d3.head ?? model).add(d3.mouth)
      d3.basket = new THREE.Object3D()
      d3.basket.position.set(-0.06 * U, 1.06 * U, 0)
      ;(d3.body ?? model).add(d3.basket)
      // sprouts in the basket = what it has read; a flower or a bundle in the mouth
      d3.sprouts = []
      for (let i = 0; i < 6; i++) {
        const flower = i % 2 === 1
        const tpl2 = flower ? this.tinted('Lib_Flower', { Petal: C.yellow }) : this.lib.Lib_Leaf
        if (!tpl2) break
        const s = new THREE.Group()
        const m = tpl2.clone(true)
        if (flower) m.scale.setScalar(0.42)
        else { m.scale.setScalar(2.4); m.rotation.z = 1.15; m.position.set(-0.08, 0.2, 0) }
        s.add(m)
        const a = i * 1.05
        s.position.set(-0.06 * U + Math.cos(a) * 0.14, 1.0 * U, Math.sin(a) * 0.14)
        s.rotation.set(Math.sin(a) * 0.3, a, Math.cos(a) * 0.3)
        ;(d3.body ?? model).add(s)
        d3.sprouts.push(new Presence(this, s))
      }
      const carry = (tplName2, scale, setup) => {
        const tpl3 = this.lib[tplName2]
        if (!tpl3) return null
        const g = new THREE.Group()
        const m = tpl3.clone(true)
        m.scale.setScalar(scale)
        setup?.(m)
        g.add(m)
        d3.mouth.add(g)
        return new Presence(this, g)
      }
      d3.carryFlower = carry('Lib_Flower', 0.5, (m) => { m.rotation.z = -1.25; m.position.set(0.05, -0.05, 0) })
      d3.carryBundle = carry('Lib_Bundle', 1.4)
      d3.scale = dog.scale / 0.84 * (this.dogBoost ?? 1)
      d3.pres = new Presence(this, base, (k, pres) => {
        const s = Math.max(0.0001, k) * d3.scale
        const squash = clamp(-pres.s.vel * 0.035, -0.22, 0.22)
        base.scale.set(s * (1 - squash * 0.5), s * (1 + squash), s * (1 - squash * 0.5))
      })
      this.scene.add(base)
      return d3
    }
    poseOf(dog) {
      const t = { pitch: 0, drop: 0, head: 0, roll: 0, yawHead: 0, legs: [0, 0, 0, 0], front: 1, back: 1 }
      const p = dog.pose
      if (p === 'walk') {
        const s = Math.sin(dog.phase) * 0.6
        t.legs = [s, -s, -s, s]
        t.pitch = Math.sin(dog.phase * 2) * 0.03
      } else if (p === 'sit') {
        Object.assign(t, { pitch: 0.5, drop: -0.1 * U, legs: [-0.5, -0.5, 1.25, 1.25], front: 1.3, back: 0.85, head: -0.3 })
      } else if (p === 'sleep') {
        Object.assign(t, { drop: -0.24 * U, legs: [1.35, 1.35, -1.35, -1.35], front: 0.85, back: 0.85, head: -0.3, yawHead: 0.35 })
      } else if (p === 'sniff') {
        Object.assign(t, { head: -0.6, pitch: -0.08 })
      } else if (p === 'yawn') {
        t.head = 0.5
      } else if (p === 'push') {
        Object.assign(t, { pitch: -0.18, legs: [0.45, 0.45, -0.45, -0.45], head: 0.15 })
      } else if (p === 'jump') {
        Object.assign(t, { pitch: 0.25, legs: [-0.7, -0.7, 0.4, 0.4] })
      } else if (p === 'shrug') {
        Object.assign(t, { roll: 0.32, head: 0.15, pitch: 0.06 })
      } else if (p === 'happy') {
        Object.assign(t, { legs: [-0.35, -0.35, 0.25, 0.25], head: 0.2 })
      } else if (p === 'gaze') {
        Object.assign(t, { pitch: 0.5, drop: -0.1 * U, legs: [-0.5, -0.5, 1.25, 1.25], front: 1.3, back: 0.85, head: 0.3 })            // sits and looks up (at the whale)
      } else if (p === 'beg') {
        Object.assign(t, { pitch: 0.5, drop: -0.1 * U, legs: [-0.5, -0.5, 1.25, 1.25], front: 1.3, back: 0.85, head: -0.1, roll: 0.34 }) // head tilted, a paw up
        t.legs = [-1.45, -0.5, 1.25, 1.25]
      } else if (p === 'scratch') {
        Object.assign(t, { pitch: 0.5, drop: -0.1 * U, legs: [-0.5, -0.5, 1.25, 1.25], front: 1.3, back: 0.85, head: -0.15, roll: -0.38 })
        t.legs = [-0.5, -0.5, 1.25, -0.2]
      } else if (p === 'bow') {
        Object.assign(t, { pitch: -0.34, drop: -0.04 * U, legs: [-1.0, -1.0, 0.15, 0.15], head: 0.42 })   // play bow
      } else if (p === 'sad') {
        Object.assign(t, { pitch: 0.06, drop: -0.05 * U, head: -0.62, legs: [0.12, 0.12, -0.1, -0.1] })
      } else if (p === 'boop') {
        Object.assign(t, { pitch: -0.16, head: -0.08, legs: [0.28, 0.28, -0.22, -0.22] })
      }
      if (dog.dozing && p !== 'sleep') t.head -= 0.35
      return t
    }
    updateDog(dog, d3, dt, now) {
      const want = !dog.hidden && dog.alpha > 0.5 && !d3.dead
      const target = fromScreen(dog.x, dog.y, 0)
      const shown = d3.pres.s.v > 0.001 || d3.pres.fade > 0.001
      if (this.snap || !d3.placed || !shown) {
        d3.pos.copy(target)
        d3.tp = false
      } else if (d3.tp) {
        if (d3.pres.s.v < 0.05) { d3.pos.copy(target); d3.tp = false }
      } else if (dog.pose !== 'walk' && target.distanceTo(d3.pos) > 1.2) {
        d3.tp = true   // jumped (a dog far behind the log): shrink here, grow there
      } else {
        d3.pos.copy(target)
      }
      if (d3.wanted && !want && !d3.tp && !this.snap && !this.reduced) this.poofAt(d3.pos.clone().add(new V3(0, 0.8, 0)))
      d3.wanted = want
      d3.pres.set(want && !d3.tp)
      d3.placed = true
      // heading: along the path while walking, else the v0.3 left/right face, turned a little toward us
      const dx = d3.pos.x - d3.prev.x, dz = d3.pos.z - d3.prev.z
      let yaw = dog.face > 0 ? Math.PI / 4 - 0.35 : -3 * Math.PI / 4 + 0.35
      if (dog.pose === 'walk' && dx * dx + dz * dz > 1e-6) yaw = Math.atan2(-dz, dx)
      d3.yaw = this.snap ? yaw : turn(d3.yaw, yaw, 1 - Math.exp(-dt * (dog.pose === 'walk' ? 14 : 7)))
      d3.prev.copy(d3.pos)
      d3.base.position.copy(d3.pos)
      d3.base.rotation.y = d3.yaw
      // pose: every joint eases toward its target, so a new pose never snaps
      const t = this.poseOf(dog), c = d3.cur
      const k = this.snap ? 1 : 1 - Math.exp(-dt * 12)
      const kl = this.snap || dog.pose === 'walk' ? 1 : 1 - Math.exp(-dt * 14)
      for (const key of ['pitch', 'drop', 'head', 'roll', 'yawHead', 'front', 'back']) c[key] += (t[key] - c[key]) * k
      c.legs = c.legs.map((v, i) => v + (t.legs[i] - v) * kl)
      d3.pivot.rotation.z = c.pitch
      d3.lift.position.y = (dog.hop / VZ) * S + c.drop
      const q = new THREE.Quaternion(), e = new THREE.Euler()
      const turnPart = (o, x, y, z) => { if (o) o.quaternion.copy(o.userData.rest).multiply(q.setFromEuler(e.set(x, y, z))) }
      const shake = dog.shake ? Math.sin((dog.shakeT ?? 0) * Math.PI * 6) * 0.55 * dog.shake : 0
      turnPart(d3.head, c.roll, c.yawHead + shake, c.head)
      const live = this.reduced ? 0 : 1
      d3.legs.forEach((leg, i) => {
        const extra = live * (i === 3 && dog.pose === 'scratch' ? Math.sin(now / 55) * 0.5 : i === 0 && dog.pose === 'beg' ? Math.sin(now / 380) * 0.2 : 0)
        turnPart(leg, 0, 0, c.legs[i] + extra)
        if (leg) leg.scale.y = i < 2 ? c.front : c.back
      })
      const p = dog.pose
      const wag = p === 'happy' || p === 'walk' ? Math.sin(now / 90) * 0.6
        : p === 'gaze' || p === 'beg' || p === 'bow' || p === 'boop' || p === 'jump' ? Math.sin(now / 150) * 0.42
          : p === 'sad' ? Math.sin(now / 900) * 0.05 : Math.sin(now / 700) * 0.12
      d3.tailDrop = (d3.tailDrop ?? 0) + ((p === 'sad' ? -0.7 : 0) - (d3.tailDrop ?? 0)) * k
      turnPart(d3.tail, 0, wag, d3.tailDrop)
      if (d3.body) d3.body.scale.y = dog.pose === 'sleep' && !this.reduced ? 1 + Math.sin(now / 650) * 0.03 : 1
      const reads = Math.min(6, dog.reads)
      d3.sprouts.forEach((s, i) => s.set(i < reads))
      d3.carryFlower?.set(dog.carry === 'flower')
      d3.carryBundle?.set(dog.carry === 'bundle')
    }
    updateDogs(dt, now) {
      let moving = false
      for (const dog of this.dogs.values()) {
        let d3 = this.dogs3.get(dog.id)
        if (d3 && d3.dog !== dog) { d3.dead = true; this.dogs3.delete(dog.id); this.dying = [...(this.dying ?? []), d3]; d3 = null }
        if (!d3) {
          d3 = this.makeDog3(dog)
          if (!d3) continue
          this.dogs3.set(dog.id, d3)
        }
        this.updateDog(dog, d3, dt, now)
        if (dog.pose === 'walk' || d3.tp) moving = true
      }
      for (const [id, d3] of this.dogs3) {
        if (this.dogs.get(id) === d3.dog) continue
        this.dogs3.delete(id)
        d3.dead = true
        this.dying = [...(this.dying ?? []), d3]
      }
      if (this.dying?.length) {
        for (const d3 of this.dying) {
          if (d3.wanted && !this.reduced) this.poofAt(d3.pos.clone().add(new V3(0, 0.8, 0)))
          d3.wanted = false
          d3.pres.set(false)
        }
        this.dying = this.dying.filter((d3) => {
          if (d3.pres.on || !d3.pres.settled) return true
          this.scene.remove(d3.base)
          for (const p of [d3.pres, d3.carryFlower, d3.carryBundle, ...d3.sprouts]) if (p) this.presences.delete(p)
          return false
        })
        moving = true
      }
      return moving
    }

    // ------------------------------------------------------------ the scene each frame
    update(dt, now) {
      let busy = this.activity > 0 || this.fxItems.size > 0
      const t = now / 1000
      const W = this.isl.whale
      // whale: rises while the model thinks, lifts its flukes to spout
      if (this.whale) {
        const r = this.whaleRest
        const rise = W.rise ?? 0.45
        this.whale.position.copy(r.pos)
        this.whale.position.x += this.reduced ? 0 : Math.sin(now / 5600) * 0.5
        this.whale.position.y += (rise - 1) * 2.3 + (this.reduced ? 0 : Math.sin(now / 1400) * 0.12)
        if (this.whaleTail) {
          const lift = (W.lift ?? 0) * 0.55 + (this.reduced ? 0 : Math.sin(now / 900) * 0.08)
          this.whaleTail.quaternion.copy(this.whaleTailRest.quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -lift)))
        }
      }
      // windmill: the speed eases to its new value
      this.millRate += (this.millTarget - this.millRate) * (1 - Math.exp(-dt * 1.2))
      if (Math.abs(this.millTarget - this.millRate) > 0.01) busy = true
      if (this.sails) {
        this.millAngle += this.millRate * dt * (this.reduced ? 0.3 : 1)
        this.sails.quaternion.copy(this.sailsRest.quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.millAngle, 0, 0)))
      }
      // doors open with a warm light while you are asked / an app is in use
      const ease = this.snap ? 1 : 1 - Math.exp(-dt * 5)
      for (const [key, door] of Object.entries(this.doors)) {
        const g = this.glow[key] ?? 0
        const open = key === 'house' ? (g > 0.3 ? 1 : 0) : g > 0.3 ? 0.8 : 0
        door.open += (open - door.open) * ease
        const glow = Math.min(1.2, g + (this.pulse[key] ?? 0))
        door.o.quaternion.copy(door.rest.quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -door.open * 1.2, 0)))
        door.o.traverse((m) => { if (m.isMesh) { m.material.emissive?.set(0xffc966); m.material.emissiveIntensity += (glow * 0.6 - m.material.emissiveIntensity) * ease } })
        if (Math.abs(open - door.open) > 0.01) busy = true
      }
      for (const key of Object.keys(this.pulse)) this.pulse[key] = Math.max(0, this.pulse[key] - dt / 1.4)
      if (this.isletLight) {
        const g = this.glow.islet
        // unused: a slow lighthouse blink; in use: lit up
        const blink = this.reduced ? 0 : Math.pow(Math.max(0, Math.sin(now / 1500)), 14) * 1.1
        const want = Math.max(g * 1.4, blink)
        this.isletLight.traverse((m) => { if (m.isMesh) { m.material.emissive?.set(0xffd84d); m.material.emissiveIntensity += (want - m.material.emissiveIntensity) * ease } })
      }
      if (this.nappers) {
        // two gulls nap on the islet; while a cloud service is in use they are up and flapping
        const awake = (this.glow.islet ?? 0) > 0.5 || (this.gull && !this.gull.leaving) ? 1 : 0
        this.napWake += (awake - this.napWake) * (1 - Math.exp(-dt * 3))
        this.nappers.forEach((n, i) => {
          const bob = this.reduced ? 0 : Math.sin(now / (1700 + i * 300) + i) * 0.04
          n.o.position.copy(n.rest).add(new V3(0, bob + this.napWake * 0.25, 0))
          n.o.rotation.set(0, n.yaw + (this.reduced ? 0 : Math.sin(now / 2300 + i * 2) * 0.25) * (1 - this.napWake), (1 - this.napWake) * 0.18)
          this.flap({ wings: n.wings, wingRest: n.wingRest }, now + i * 37, this.reduced ? 0 : this.napWake * 0.6)
        })
      }
      if (this.islet && !this.reduced) this.islet.position.y = this.isletRest.pos.y + Math.sin(now / 1300) * 0.08
      if (this.rowboat && !this.reduced) {
        this.rowboat.quaternion.copy(this.rowboatRest.quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(now / 1100) * 0.03, 0, Math.sin(now / 900) * 0.04)))
      }
      // the board: plan lines are "written" left to right
      if (this.board3) {
        const b = this.board3
        b.widths = b.widths.map((w, i) => {
          const d = b.targets[i] - w
          if (Math.abs(d) < 0.01) return b.targets[i]
          b.dirty = true
          return w + Math.sign(d) * Math.min(Math.abs(d), dt * 40)
        })
        if (b.dirty) { this.drawBoard(); b.dirty = false; busy = true }
        b.mat.emissiveIntensity = this.pulse.board * 0.35
      }
      // trees and bushes sway a little
      if (!this.reduced) for (const tree of this.trees) {
        const a = Math.sin(t * tree.speed + tree.phase) * tree.amp
        tree.o.rotation.x = a
        tree.o.rotation.z = Math.cos(t * tree.speed * 0.8 + tree.phase) * tree.amp
      }
      // sea glints
      {
        const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI / 4, 0, 'YXZ')), sc = new V3()
        this.glints.list.forEach((g, i) => {
          const ph = ((t + g.phase) % g.period) / g.period
          const k = this.reduced ? 0.6 : Math.max(0, Math.sin(ph * Math.PI * 2)) ** 2
          sc.set(Math.max(0.001, g.len * k), 1, 1)
          m.compose(g.at, q, sc)
          this.glints.mesh.setMatrixAt(i, m)
        })
        this.glints.mesh.instanceMatrix.needsUpdate = true
      }
      // beds and buoys
      for (const bed of this.beds3) {
        if (!bed) continue
        for (const f of bed.flowers) {
          if (f.g === f.target) continue
          busy = true
          if (f.delay > 0) { f.delay -= dt; continue }
          const speed = this.reduced ? 1 / 0.15 : f.target > f.g ? 1 / 0.8 : 1 / 0.45
          f.g = f.target > f.g ? Math.min(f.target, f.g + dt * speed) : Math.max(f.target, f.g - dt * speed)
          this.drawFlower(f)
        }
        if (bed.wiggle > 0) {
          bed.wiggle = Math.max(0, bed.wiggle - dt / 0.7)
          bed.o.rotation.z = Math.sin(now / 25) * 0.025 * bed.wiggle
          busy = true
        }
      }
      for (const b of this.buoys3) {
        if (!b) continue
        b.o.position.copy(b.rest.pos)
        b.o.position.y += (Math.min(1.1, b.k) - 1) * 1.9 + (this.reduced ? 0 : Math.sin(now / 900 + b.index * 1.3) * 0.08)
        b.o.rotation.z = this.reduced ? 0 : Math.sin(now / 1100 + b.index) * 0.06
      }
      if (this.gull && !this.reduced) this.flap(this.gull, now, 0.6)
      if (this.updateDogs(dt, now)) busy = true
      for (const p of this.presences) if (this.snap) p.snap(); else if (p.update(dt)) busy = true
      this.stepFx(dt)
      return busy
    }
    drawBoard() {
      const { canvas, tex, widths } = this.board3
      const g = canvas.getContext('2d')
      g.fillStyle = '#f6ecd2'
      g.fillRect(0, 0, canvas.width, canvas.height)
      g.fillStyle = '#8a6a45'
      widths.forEach((w, i) => {
        const len = (w / 36) * 200
        if (len < 2) return
        g.beginPath()
        g.roundRect(26, 26 + i * 34, len, 13, 6)
        g.fill()
      })
      g.fillStyle = '#c0392b'
      g.beginPath()
      g.arc(canvas.width / 2, 12, 5, 0, Math.PI * 2)
      g.fill()
      tex.needsUpdate = true
    }
    frame3(now) {
      if (!this.alive) return
      this.raf3 = requestAnimationFrame(this.frame3)
      const hidden = document.visibilityState === 'hidden' || !this.host.isConnected || !this.host.clientWidth
      if (hidden) { this.last = now; return }
      // idle (only sway and water moving): about 20 frames a second is enough
      if (!this.snap && !this.busyLast && this.activity <= 0 && now - this.lastRender < 48) return
      const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000))
      this.last = now
      this.lastRender = now
      this.busyLast = this.update(dt, now)
      const r = this.renderer
      if (this.pixel) this.pixel.render()
      else {
        r.clear()
        r.render(this.scene, this.camera)
        r.clearDepth()
        r.render(this.fxScene, this.camera)
      }
      if (this.snap) {
        this.snap = false
        requestAnimationFrame(() => { if (this.alive) this.host.style.opacity = '1' })
      }
    }

    dispose() {
      this.alive = false
      cancelAnimationFrame(this.raf3)
      this.ro?.disconnect()
      if (this.gull) clearTimeout(this.gull.timer)
      if (this.renderer) {
        this.renderer.dispose()
        this.renderer.forceContextLoss()
      }
      this.host.style.opacity = ''
      this.host.style.transition = ''
      super.dispose()
    }
  }

  return Stage3D
}
