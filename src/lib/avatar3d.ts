// A small 3D character that jumps and spins, drawn into its own transparent <canvas>.
// The canvas can be used anywhere an HTML element can — e.g. as a map marker.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const MODEL_URL = '/models/avatar.gltf' // served from public/models
// Which of the model's built-in animations to loop. This model has: Idle, Walk, Run, Jump,
// Victory, Roll, PickUp, SitDown, StandUp, Punch, SwordSlash, Shoot_OneHanded, RecieveHit,
// Death, Defeat, Run_Carry, Walk_Carry.
const ANIMATION_NAME = 'Victory'

// Colours for the character, keyed by the model's material names.
const PALETTE: Record<string, string> = {
  Skin: '#c68b59', // natural skin tone (the model ships near-black)
  Face: '#1b1b1b', // the eyes — dark, so they read on the lighter face
  Hair: '#2b1b10',
  Shirt: '#0b6e4f', // Rally green
  Pants: '#1f2937', // dark shorts
  Belt: '#3b2a1a',
}

const CANVAS_SIZE = 120 // CSS pixels (square)
const MODEL_HEIGHT = 2 // scene units; the model is scaled to this height whatever its original size
const SPIN_SECONDS_PER_TURN = 4

export type Avatar3D = {
  element: HTMLElement
  setScale: (scale: number) => void // 1 = full size; e.g. 0.5 = half size, shrinking towards the feet
  dispose: () => void // stop animating and free GPU memory
}

export function createAvatar3D(): Avatar3D {
  // --- 1. Canvas + renderer -------------------------------------------------------------
  const canvas = document.createElement('canvas')
  canvas.style.width = `${CANVAS_SIZE}px`
  canvas.style.height = `${CANVAS_SIZE}px`
  canvas.style.display = 'block'
  canvas.style.transformOrigin = 'bottom center' // scale towards the feet, so they stay on the spot

  // The element we hand out is a wrapper. A map marker positions its element with a CSS transform,
  // so we scale the canvas inside instead of the element itself — otherwise the two would clash.
  const wrapper = document.createElement('div')
  wrapper.append(canvas)

  function setScale(scale: number) {
    canvas.style.transform = `scale(${scale})`
  }

  // alpha: true → transparent background, so only the character covers the map.
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // sharp on retina, capped for speed
  renderer.setSize(CANVAS_SIZE, CANVAS_SIZE, false) // false = don't touch the CSS size we set above

  // --- 2. Scene, camera, lights ---------------------------------------------------------
  const scene = new THREE.Scene()

  // Field of view 35°, square aspect. Placed in front of the character, looking at its middle,
  // far enough back that raised arms stay in frame.
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 1.4, 6)
  camera.lookAt(0, 1.3, 0)

  // Soft light from all around (sky colour above, ground colour below) + one "sun" for shading.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.5))
  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.position.set(3, 5, 4)
  scene.add(sun)

  // We spin this empty "pivot" group; the model sits inside it, centred on the pivot.
  // Spinning the model directly would swing it around its own origin, which may be off-centre.
  const pivot = new THREE.Group()
  scene.add(pivot)

  // --- 3. Load the model and start its Jump animation ----------------------------------
  let mixer: THREE.AnimationMixer | undefined
  let disposed = false

  new GLTFLoader().load(
    MODEL_URL,
    (gltf) => {
      if (disposed) return // dispose() was called while the file was still downloading
      const model = gltf.scene
      recolor(model)

      // Scale to MODEL_HEIGHT, then move it so it's centred and its feet are at y = 0.
      const box = new THREE.Box3().setFromObject(model)
      model.scale.setScalar(MODEL_HEIGHT / box.getSize(new THREE.Vector3()).y)
      box.setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      model.position.set(-center.x, -box.min.y, -center.z)
      pivot.add(model)

      // An AnimationMixer plays animation clips on a model; we loop just one clip.
      const clip = THREE.AnimationClip.findByName(gltf.animations, ANIMATION_NAME)
      if (clip) {
        mixer = new THREE.AnimationMixer(model)
        mixer.clipAction(clip).play() // loops forever by default
      } else {
        console.warn(`Avatar model has no "${ANIMATION_NAME}" animation`)
      }
    },
    undefined, // (progress callback — not needed)
    (error) => console.error('Could not load avatar model:', error),
  )

  // --- 4. Animation loop: runs once per screen refresh (~60 times a second) -------------
  let lastTime = performance.now()
  let frameId = requestAnimationFrame(tick)

  function tick(now: number) {
    const deltaSeconds = (now - lastTime) / 1000 // time since the previous frame
    lastTime = now

    mixer?.update(deltaSeconds) // advance the animation
    pivot.rotation.y += ((Math.PI * 2) / SPIN_SECONDS_PER_TURN) * deltaSeconds // spin
    renderer.render(scene, camera)

    frameId = requestAnimationFrame(tick) // ask for the next frame
  }

  // --- 5. Cleanup -------------------------------------------------------------------------
  function dispose() {
    disposed = true
    cancelAnimationFrame(frameId)
    mixer?.stopAllAction()

    // GPU memory isn't freed automatically — release every mesh's geometry, materials and textures.
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose()
        }
        material.dispose()
      }
    })
    renderer.dispose()
  }

  return { element: wrapper, setScale, dispose }
}

// Repaints each part of the character using PALETTE. Parts not in the palette keep their colour.
function recolor(model: THREE.Object3D) {
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const material = object.material as THREE.MeshStandardMaterial
    const color = PALETTE[material.name]
    if (color) material.color.set(color)
  })
}
