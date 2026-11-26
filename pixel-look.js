/**
 * Pixel look for the 3D island (v0.5).
 *
 * Style reference (watched frame by frame): a 3D scene drawn as pixel art —
 *  - rendered at about 1/3 resolution and enlarged without smoothing;
 *  - flat light bands instead of smooth shading: lit faces warm, shaded faces
 *    cool (cream stone → slate blue, lime grass → teal green);
 *  - hard, ragged shadows; big cloud shadows drift across everything;
 *  - a light line on convex edges, a dark line where a nearer thing ends;
 *  - lime grass with a soft gradient and scattered tiny lilac flowers, moss on
 *    stone tops, water with moving cloud reflections and a white foam line.
 *
 * installPixelLook(stage, THREE) swaps the stage's materials for banded ones
 * (lazily, so things made later are converted too) and replaces the frame's
 * render with: scene → small target (+ normals) → outline pass → canvas.
 */

// sRGB palette taken from the reference video
const PAL = {
  grassLit: '#c6d966', grassLit2: '#b4cf5c', grassMid: '#7fb84e', grassShade: '#1b8058',
  stoneLit: '#f6eec8', stoneMid: '#d2c9a0', stoneShade: '#4a7a8c', stoneDeep: '#386878',
  moss: '#a9c95a', flower: '#c9a3dc', flowerShade: '#8f78b8',
  waterLit: '#78b8ec', waterMid: '#4f95d8', waterDeep: '#22589c', waterSky: '#dcdcdc', foam: '#f8f8f4',
  cool: '#2e6f86',
}

const KINDS = {
  Grass: 'grass', GrassRim: 'grass',
  Wall: 'stone', WallLow: 'stone', Path: 'stone', PathEdge: 'stone',
  Sea: 'water', Water_Pond: 'water',
  Crown: 'leaf', Cypress: 'leaf', Bush: 'leaf', Leaf: 'leaf', LeafA: 'leaf', LeafB: 'leaf', LeafC: 'leaf', LeafD: 'leaf', LeafDark: 'leaf', VineLeaf: 'leaf',
}
const KIND_ID = { other: 0, grass: 1, stone: 2, water: 3, leaf: 4, char: 5 }

const NOISE = /* glsl */ `
float pwHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float pwNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(pwHash(i), pwHash(i + vec2(1, 0)), u.x), mix(pwHash(i + vec2(0, 1)), pwHash(i + vec2(1, 1)), u.x), u.y);
}
float pwFbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * pwNoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return v;
}
vec3 pwLin(vec3 c) { return pow(c, vec3(2.2)); }
`

export function installPixelLook(stage, THREE, options = {}) {
  const px = options.px ?? 2
  const renderer = stage.renderer
  const lin = (hex) => new THREE.Color(hex)   // THREE.Color(hex) is already linear in r184 (colour management on)
  const shared = {
    uTime: { value: 0 },
    uSun: { value: 1 },
    uWind: { value: new THREE.Vector2(0.55, 0.25) },
    uCloudScale: { value: 0.045 },
    uCloudCover: { value: 0.56 },
    uSeaY: { value: -3.0 },
    uBand: { value: new THREE.Vector2(0.18, 0.5) },
    uIsle: { value: new THREE.Vector3(0, 0, 20) },
  }
  for (const [k, v] of Object.entries(PAL)) shared['u_' + k] = { value: lin(v) }

  // ------------------------------------------------------------ lights
  let sun = null
  stage.scene.traverse((o) => { if (o.isDirectionalLight && !sun) sun = o })
  if (sun) {
    sun.color.set(0xffffff)
    sun.intensity = 2.5
    sun.shadow.radius = 4
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.normalBias = 0.14   // the wide soft kernel needs a bigger offset or the lawn shadows itself
    sun.shadow.bias = -0.0008
    sun.shadow.map?.dispose()
    sun.shadow.map = null
  }
  stage.fxScene.traverse((o) => { if (o.isDirectionalLight) { o.color.set(0xffffff); o.intensity = 2.5 } })
  // Lambert direct light = N·L × intensity × albedo / π, so this turns it back into 0…1
  shared.uSun.value = 2.5 / Math.PI

  // ------------------------------------------------------------ materials
  const cache = new WeakMap()
  const patch = (kind) => (shader) => {
    Object.assign(shader.uniforms, shared)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPwPos;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      {
        vec4 pwP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          pwP = instanceMatrix * pwP;
        #endif
        vPwPos = (modelMatrix * pwP).xyz;
      }`)
    const uniformDecl = Object.keys(shared).map((k) => {
      const v = shared[k].value
      const type = v.isColor || v.isVector3 ? 'vec3' : v.isVector2 ? 'vec2' : 'float'
      return `uniform ${type} ${k};`
    }).join('\n')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPwPos;\n${uniformDecl}\n${NOISE}`)
      .replace('#include <opaque_fragment>', `{
        const int KIND = ${KIND_ID[kind]};
        vec3 base = diffuseColor.rgb;
        float sunK = dot(reflectedLight.directDiffuse, vec3(1.0)) / max(dot(base, vec3(1.0)) * uSun, 1e-4);
        // drifting cloud shadows (ragged edges from the fine octaves)
        float cloud = step(uCloudCover, pwFbm(vPwPos.xz * uCloudScale + uWind * uTime * 0.05));
        vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        float facingUp = dot(normalize(normal), up);
        if (KIND == 4) sunK += (pwFbm(vPwPos.xz * 1.3 + vPwPos.y * 0.9) - 0.5) * 0.9;   // leafy clumps
        sunK *= 1.0 - cloud;
        sunK += (pwNoise(vPwPos.xz * 2.7 + vPwPos.y) - 0.5) * 0.45 * smoothstep(0.8, 0.95, facingUp);   // ragged band and shadow edges (inside the soft penumbra)
        int band = sunK > uBand.y ? 2 : (sunK > uBand.x ? 1 : 0);
        vec3 lit, mid, shade;
        if (KIND == 1) {
          float g = smoothstep(0.35, 0.75, pwFbm(vPwPos.xz * 0.06));
          lit = mix(u_grassLit, u_grassLit2, g);
          mid = u_grassMid; shade = u_grassShade;
          // tiny lilac flowers on ~1.5% of 0.25 m cells
          vec2 cell = floor(vPwPos.xz * 4.0);
          if (pwHash(cell) > 0.985 && pwNoise(vPwPos.xz * 0.3) > 0.45) { lit = u_flower; mid = u_flower; shade = u_flowerShade; }
        } else if (KIND == 2) {
          lit = u_stoneLit; mid = u_stoneMid; shade = facingUp < -0.2 ? u_stoneDeep : u_stoneShade;
          if (facingUp > 0.7) shade = mix(u_grassShade, u_stoneShade, 0.35);   // paths and stone tops in shadow stay with the lawn's shadow
          if (abs(facingUp) < 0.6) {   // block courses on the walls
            float course = floor(vPwPos.y / 0.7);
            float along = atan(vPwPos.z - uIsle.y, vPwPos.x - uIsle.x) * uIsle.z;
            float joint = fract(along / 1.6 + course * 0.5 + pwHash(vec2(course, 3.0)) * 0.3);
            if (fract(vPwPos.y / 0.7) < 0.17 || joint < 0.07) { lit = u_stoneMid; mid = u_stoneShade; shade = u_stoneDeep; }
          }
          if (facingUp > 0.7 && pwFbm(vPwPos.xz * 0.9) > 0.58) { lit = u_moss; mid = u_grassMid; shade = u_grassShade; }
          // white foam where the island wall meets the sea
          float foam = smoothstep(0.32, 0.0, abs(vPwPos.y - uSeaY - 0.05) + (pwNoise(vPwPos.xz * 3.0 + uTime * 0.3) - 0.5) * 0.25);
          if (foam > 0.5) { lit = u_foam; mid = u_foam; shade = mix(u_foam, u_stoneShade, 0.25); }
        } else if (KIND == 3) {
          float r = pwFbm(vPwPos.xz * 0.09 + vec2(uTime * 0.012, uTime * 0.006));
          float r2 = pwFbm(vPwPos.xz * 0.35 - vec2(uTime * 0.02, 0.0));
          lit = (r > 0.64 && r2 > 0.5) ? u_waterSky : (r > 0.42 ? u_waterLit : u_waterMid);
          mid = u_waterMid; shade = r > 0.3 ? u_waterMid : u_waterDeep;   // deep blue only in small pockets
          if (pwHash(floor(vPwPos.xz * vec2(1.2, 6.0) + floor(uTime * 0.7))) > 0.9985) lit = u_foam;   // glints
          band = cloud > 0.5 ? 0 : 2;
        } else if (KIND == 5) {
          vec3 b = pow(base, vec3(1.0 / 2.2));
          lit = pwLin(min(vec3(1.0), b * 1.06 + 0.02));
          mid = base;
          shade = pwLin(mix(b * 0.8, pow(u_cool, vec3(1.0 / 2.2)), 0.15));
        } else {
          vec3 b = pow(base, vec3(1.0 / 2.2));
          lit = pwLin(min(vec3(1.0), b * vec3(1.06, 1.04, 0.95) + 0.03));
          shade = pwLin(mix(b * 0.55, pow(u_cool, vec3(1.0 / 2.2)), 0.38));
          mid = pwLin(mix(pow(shade, vec3(1.0 / 2.2)), pow(lit, vec3(1.0 / 2.2)), 0.55));
        }
        outgoingLight = (band == 2 ? lit : (band == 1 ? mid : shade)) + totalEmissiveRadiance;
      }
      #include <opaque_fragment>`)
  }
  const kindOf = (name) => KINDS[name] ?? (/^(Dog_|DogDark|Basket|Strap|Eye)/.test(name ?? '') ? 'char' : 'other')
  const convert = (src) => {
    if (!src || src.userData?.pw) return src
    if (!(src.isMeshStandardMaterial || src.isMeshLambertMaterial || src.isMeshPhongMaterial)) return src
    let t = cache.get(src)
    if (t) {
      t.opacity = src.opacity
      return t
    }
    const kind = kindOf(src.name)
    t = new THREE.MeshLambertMaterial({
      color: src.color, map: src.map ?? null, emissive: src.emissive ?? new THREE.Color(0),
      emissiveIntensity: src.emissiveIntensity ?? 1, transparent: src.transparent, opacity: src.opacity,
      side: src.side, depthWrite: kind === 'water' ? true : src.depthWrite, alphaTest: src.alphaTest,
    })
    t.name = src.name
    t.userData = { ...src.userData, pw: true }
    t.onBeforeCompile = patch(kind)
    t.customProgramCacheKey = () => 'pw-' + kind
    cache.set(src, t)
    return t
  }
  const convertTree = (root) => root.traverse((m) => {
    if (!m.isMesh) return
    if (Array.isArray(m.material)) m.material = m.material.map(convert)
    else m.material = convert(m.material)
    if (m.userData.solid) m.userData.solid = convert(m.userData.solid)
  })
  for (const tpl of Object.values(stage.lib ?? {})) convertTree(tpl)

  // ------------------------------------------------------------ targets and the outline pass
  const make = (depth) => {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })
    if (depth) rt.depthTexture = new THREE.DepthTexture(1, 1)
    return rt
  }
  const rtMain = make(true), rtNormal = make(false), rtFx = make(false)
  const normalMat = new THREE.MeshNormalMaterial()
  const cam = stage.camera
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rtMain.texture }, tDepth: { value: rtMain.depthTexture }, tNormal: { value: rtNormal.texture }, tFx: { value: rtFx.texture },
      uRes: { value: new THREE.Vector2(1, 1) }, uRange: { value: cam.far - cam.near },
      uDark: { value: 0.32 }, uLight: { value: 0.35 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor, tDepth, tNormal, tFx;
      uniform vec2 uRes; uniform float uRange, uDark, uLight;
      varying vec2 vUv;
      float D(vec2 uv) { return texture2D(tDepth, uv).r * uRange; }
      vec3 N(vec2 uv) { return texture2D(tNormal, uv).rgb * 2.0 - 1.0; }
      float nEdge(vec2 uv, float d, vec3 n) {
        float dd = D(uv) - d;
        vec3 m = N(uv);
        float nd = dot(n - m, vec3(1.0, 1.0, 1.0));
        return (1.0 - dot(n, m)) * clamp(sign(dd + 0.05), 0.0, 1.0) * clamp(smoothstep(-0.01, 0.01, nd), 0.0, 1.0);
      }
      vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main() {
        vec2 t = 1.0 / uRes;
        vec3 col = texture2D(tColor, vUv).rgb;
        float d = D(vUv);
        vec3 n = N(vUv);
        float de = 0.0, ne = 0.0;
        vec2 o[4]; o[0] = vec2(0, -t.y); o[1] = vec2(0, t.y); o[2] = vec2(t.x, 0); o[3] = vec2(-t.x, 0);
        for (int i = 0; i < 4; i++) {
          de += clamp(D(vUv + o[i]) - d, 0.0, 1.0);
          ne += nEdge(vUv + o[i], d, n);
        }
        de = step(0.45, de);
        ne = step(0.2, ne);
        if (de > 0.5) col *= 1.0 - uDark;
        else if (ne > 0.5) col = col + (vec3(1.0) - col) * uLight;
        vec4 fx = texture2D(tFx, vUv);
        col = mix(col, fx.rgb / max(fx.a, 1e-4), fx.a);
        gl_FragColor = vec4(toSRGB(col), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  }))
  const quadScene = new THREE.Scene()
  quadScene.add(quad)
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  renderer.toneMapping = THREE.NoToneMapping
  renderer.domElement.style.imageRendering = 'pixelated'
  const size = { w: 1, h: 1 }
  const resize = () => {
    const w = stage.host.clientWidth || 1280, h = stage.host.clientHeight || 800
    size.w = Math.max(1, Math.ceil(w / px))
    size.h = Math.max(1, Math.ceil(h / px))
    renderer.setPixelRatio(1)
    renderer.setSize(size.w, size.h, false)
    for (const rt of [rtMain, rtNormal, rtFx]) rt.setSize(size.w, size.h)
    quad.material.uniforms.uRes.value.set(size.w, size.h)
  }
  resize()

  const isle = stage.node?.('Island')
  if (isle) {
    const box = new THREE.Box3().setFromObject(isle), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3())
    shared.uIsle.value.set(c.x, c.z, Math.max(sz.x, sz.z) / 2)
  }
  const start = performance.now()
  const sea = stage.node?.('Sea')
  if (sea?.material) { sea.material = convert(sea.material); sea.material.opacity = 0.82 }
  function render() {
    convertTree(stage.scene)
    convertTree(stage.fxScene)
    shared.uTime.value = (performance.now() - start) / 1000
    const clear = new THREE.Color()
    renderer.getClearColor(clear)
    renderer.setRenderTarget(rtMain)
    renderer.setClearColor(clear, 1)
    renderer.clear()
    renderer.render(stage.scene, cam)
    stage.scene.overrideMaterial = normalMat
    renderer.setRenderTarget(rtNormal)
    renderer.setClearColor(0x8080ff, 1)
    renderer.clear()
    renderer.render(stage.scene, cam)
    stage.scene.overrideMaterial = null
    renderer.setRenderTarget(rtFx)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(stage.fxScene, cam)
    renderer.setRenderTarget(null)
    renderer.setClearColor(clear, 1)
    renderer.clear()
    renderer.render(quadScene, quadCam)
  }
  return { render, resize, shared, quad, px }
}
