/**
 * Runs the home page cake: an arrival animation on load, then a camera and cake choreography tied
 * to the scroll position. Scrolling stays native. Nothing here takes over the scrollbar.
 * It stops drawing whenever the stage is off screen or the tab is hidden.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { buildCake, COAT_TOP, CORE_HEIGHT, HIGH_QUALITY, LOW_QUALITY } from "./cake-model";

export type StageElements = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  hero: HTMLElement;
  chapters: HTMLElement[];
  labels: HTMLElement[];
  progress: HTMLElement | null;
  cue: HTMLElement | null;
};

const SPREAD_PER_LAYER = 0.17;
/** The coat clears the top sponge by this much in the exploded view. */
const COAT_GAP = 0.2;
const WEDGE_TRAVEL = 0.92;
const KEY_LIGHT = 34;
const ENVIRONMENT = 0.72;
/** Where the wedge faces when the cake is cut: toward the viewer and a little to the left. */
const CUT_SPIN = Math.PI * 2 - 0.55;

/** Hands control back to the browser, so a long start-up never freezes the page in one piece. */
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * What the glaze and cream reflect: a dark room with large soft lights, as in a food photographer's
 * studio. Long window-shaped highlights on the glaze are most of what makes it read as real.
 */
function photoStudio(): THREE.Scene {
  const studio = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(24, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#1d1512"), side: THREE.BackSide }));
  studio.add(room);
  const panel = (width: number, height: number, x: number, y: number, z: number, colour: string, power: number) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(power), side: THREE.DoubleSide });
    const light = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    light.position.set(x, y, z);
    light.lookAt(0, 0.4, 0);
    studio.add(light);
  };
  panel(10, 8, -8, 8, 7, "#fff9f2", 10); // The main window, high on the left.
  panel(2.2, 11, 10, 3, 3, "#fff3ec", 5.5); // A tall strip on the right, for a long edge highlight.
  panel(12, 2.2, 0, 7, -10, "#ffe6da", 7); // Behind and above, which rims the top of the glaze.
  panel(10, 3.5, 3, -4, 9, "#ffd4bc", 1.3); // Low warm bounce from the table.
  return studio;
}

export async function startStage({ root, canvas, hero, chapters, labels, progress, cue }: StageElements, isCancelled: () => boolean): Promise<(() => void) | null> {
  gsap.registerPlugin(ScrollTrigger);

  const smallScreen = window.matchMedia("(max-width: 760px)").matches;
  const weakDevice = (navigator.hardwareConcurrency ?? 8) <= 4 || ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  const quality = smallScreen || weakDevice ? LOW_QUALITY : HIGH_QUALITY;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, smallScreen ? 1.75 : 2);
  renderer.setPixelRatio(pixelRatio);
  // Keeps true colour: raspberries stay red and cream stays cream, as product photographs need.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  // Shadows are redrawn only when something moves, not on every frame at rest.
  renderer.shadowMap.autoUpdate = false;

  await breathe();
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = photoStudio();
  const environment = pmrem.fromScene(studio, 0.035).texture;
  scene.environment = environment;
  scene.environmentIntensity = ENVIRONMENT;
  studio.traverse((item) => {
    if (item instanceof THREE.Mesh) {
      item.geometry.dispose();
      (item.material as THREE.Material).dispose();
    }
  });
  await breathe();

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);

  /* The window light again, for the soft shadows, one blush rim behind, and warm bounce from the table. */
  const key = new THREE.SpotLight("#fff9f1", KEY_LIGHT, 18, 0.5, 0.85, 1.5);
  key.position.set(-3.6, 6.4, 4.6);
  key.target.position.set(0, 0.3, 0);
  key.castShadow = quality.shadows;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.bias = -0.0006;
  key.shadow.radius = 7;
  key.shadow.blurSamples = 14;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight("#ffdcd0", 1.5);
  rim.position.set(4.6, 2.8, -5);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight("#fff6ee", "#8a5a48", 0.34));

  const model = await buildCake(quality, breathe);
  if (isCancelled()) {
    model.dispose();
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
    return null;
  }
  scene.add(model.root);

  /** Everything the choreography can move. GSAP tweens these numbers; draw() reads them. */
  const state = {
    azimuth: -0.42,
    elevation: 0.24,
    zoom: 1,
    lookY: 0.42,
    spin: 2.9,
    explode: 0,
    coatLift: 0,
    wedge: 0,
    labels: 0,
    fade: 1,
    shiftLandscape: 0.2,
    shiftPortrait: 0,
    studio: 1,
    candleLight: 1,
  };
  /** The arrival animation, kept apart so that scrolling can skip it at any moment. */
  const layerFall = model.layers.map(() => ({ y: 4.6 }));
  const arrival = { coatRun: 0, pearls: 0, pour: 0, drips: 0, berries: 0, candles: 0, flames: 0, zoom: 1.1 };

  const wedgeDirection = new THREE.Vector3(0, 0, 1);
  const lookAt = new THREE.Vector3();
  const right = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const dummyScale = new THREE.Vector3();
  const dummyPosition = new THREE.Vector3();

  let width = 1;
  let height = 1;
  let baseDistance = 10;
  let portrait = false;

  const resize = () => {
    width = root.clientWidth || window.innerWidth;
    height = window.innerHeight;
    portrait = width / height < 0.85;
    camera.aspect = width / height;
    // Keep the whole stand in view on narrow screens. Landscape frames the cake by height.
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byHeight = 4.05 / (2 * tan);
    const byWidth = 3.25 / (2 * tan * camera.aspect);
    baseDistance = portrait ? Math.max(byHeight * 0.86, byWidth) : byHeight;
    renderer.setSize(width, height, false);
    camera.updateProjectionMatrix();
  };
  resize();

  const flameFlicker = (time: number, index: number) => 0.86 + 0.14 * Math.sin(time * 9.5 + index * 2.1) * Math.sin(time * 4.3 + index);

  const applyBerries = () => {
    for (const group of model.berries) {
      group.items.forEach((item, i) => {
        const delayed = THREE.MathUtils.clamp(arrival.berries * 1.6 - item.order * 0.6, 0, 1);
        // A slight overshoot, as a berry settling on soft glaze.
        const eased = delayed === 0 ? 0 : 1 + 2.2 * Math.pow(delayed - 1, 3) + 1.2 * Math.pow(delayed - 1, 2);
        dummyScale.setScalar(Math.max(item.scale * eased, 0.0001));
        dummyPosition.copy(item.position);
        dummyPosition.y += (1 - delayed) * 0.5;
        item.matrix.compose(dummyPosition, item.rotation, dummyScale);
        group.mesh.setMatrixAt(i, item.matrix);
      });
      group.mesh.instanceMatrix.needsUpdate = true;
    }
  };

  const totalPearls = model.pearls.reduce((sum, group) => sum + group.total, 0);
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let lastBerries = -1;
  let lastPose = Number.NaN;

  const draw = (time: number) => {
    smoothX += (pointerX - smoothX) * 0.04;
    smoothY += (pointerY - smoothY) * 0.04;

    /* The parts of the cake */
    const lastIndex = model.layers.length - 1;
    model.layers.forEach((layer, i) => {
      layer.group.position.y = layer.baseY + layerFall[i].y + state.explode * SPREAD_PER_LAYER * i;
      layer.wedge.position.copy(wedgeDirection).multiplyScalar(state.wedge * WEDGE_TRAVEL);
    });
    const coatLift = state.coatLift * (SPREAD_PER_LAYER * lastIndex + CORE_HEIGHT + COAT_GAP);
    model.coat.position.y = coatLift;
    model.coatWedge.position.copy(wedgeDirection).multiplyScalar(state.wedge * WEDGE_TRAVEL);
    model.sliceWedge.position.copy(wedgeDirection).multiplyScalar(state.wedge * WEDGE_TRAVEL);
    const showCut = state.wedge > 0.001 && state.explode < 0.001;
    model.sliceFaces.forEach((face) => {
      face.visible = showCut;
    });

    // The cream runs down over the layers, from the top edge to the board.
    model.coatClip.constant = arrival.coatRun >= 1 ? 10 : -(COAT_TOP + 0.02) + arrival.coatRun * (COAT_TOP + 0.04);
    // Pearls are piped around the cake, one after another.
    const piped = Math.round(arrival.pearls * totalPearls);
    model.pearls[0].mesh.count = Math.min(piped, model.pearls[0].total);
    model.pearls[1].mesh.count = Math.max(0, piped - model.pearls[0].total);
    // Glaze is poured at the centre and spreads to the rim.
    model.caps.forEach((cap) => {
      cap.visible = arrival.pour > 0.001;
      const spread = Math.max(arrival.pour, 0.001);
      cap.scale.set(spread, 1, spread);
    });
    model.drips.forEach((drip) => {
      drip.visible = arrival.pour >= 1;
      if (drip.morphTargetInfluences) drip.morphTargetInfluences[0] = arrival.drips;
    });
    if (arrival.berries !== lastBerries) {
      applyBerries();
      lastBerries = arrival.berries;
      const showGarnish = arrival.berries > 0.92;
      model.garnish.forEach((item) => {
        item.visible = showGarnish;
      });
    }
    model.candles.scale.y = Math.max(arrival.candles, 0.001);
    model.candles.visible = arrival.candles > 0.001;
    model.flames.forEach((flame, i) => {
      const glow = arrival.flames * flameFlicker(time, i);
      flame.material.opacity = glow;
      flame.scale.set(0.17 * (0.92 + glow * 0.1), 0.28 * glow, 1);
      model.halos[i].material.opacity = glow * 0.2;
    });
    model.flameLight.intensity = arrival.flames * 1.7 * state.candleLight * flameFlicker(time * 0.8, 3);
    key.intensity = KEY_LIGHT * state.studio;
    scene.environmentIntensity = ENVIRONMENT * (0.4 + 0.6 * state.studio);

    model.root.rotation.y = state.spin + Math.sin(time * 0.22) * 0.05;

    /* The camera */
    const azimuth = state.azimuth + smoothX * 0.07;
    const elevation = Math.min(state.elevation + smoothY * 0.03, 1.45);
    // A phone is framed by the width of the stand, so it cannot move in any closer than that.
    const zoom = portrait ? Math.max(state.zoom, 1) : state.zoom;
    const distance = baseDistance * zoom * arrival.zoom;
    lookAt.set(0, state.lookY, 0);
    camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      state.lookY + Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
    camera.lookAt(lookAt);
    // Moves the cake aside for the text: to the right on wide screens, upward on phones.
    const shiftX = portrait ? state.shiftPortrait : state.shiftLandscape;
    const shiftY = portrait ? 0.15 : 0.012;
    camera.setViewOffset(width, height, -shiftX * width, shiftY * height, width, height);
    camera.updateMatrixWorld();

    /* Labels follow the layers on screen */
    if (state.labels > 0.01) {
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      labels.forEach((label) => {
        const part = label.dataset.part;
        const y =
          part === "coat"
            ? COAT_TOP - 0.2 + coatLift
            : (() => {
                const index = Number(label.dataset.layer);
                return model.layers[index].centreY + state.explode * SPREAD_PER_LAYER * index;
              })();
        projected.set(right.x * 1.1, y, right.z * 1.1).project(camera);
        const x = ((projected.x + 1) / 2) * width;
        const top = ((1 - projected.y) / 2) * height;
        label.style.transform = `translate3d(${x.toFixed(1)}px, ${top.toFixed(1)}px, 0) translateY(-50%)`;
        label.style.opacity = String(state.labels);
      });
    } else {
      labels.forEach((label) => {
        label.style.opacity = "0";
      });
    }

    canvas.style.opacity = String(state.fade);

    const pose =
      layerFall.reduce((sum, fall) => sum + fall.y, 0) + arrival.coatRun + arrival.pour + arrival.candles + arrival.berries + arrival.drips + piped + state.explode + state.coatLift + state.wedge + state.spin;
    if (pose !== lastPose) {
      lastPose = pose;
      renderer.shadowMap.needsUpdate = true;
    }
    renderer.render(scene, camera);
  };

  /* ---------- arrival: one orchestrated moment on load ---------- */
  const intro = gsap.timeline({ delay: 0.15, paused: true });
  layerFall.forEach((fall, i) => {
    intro.to(fall, { y: 0, duration: 1.1, ease: "expo.out" }, i * 0.12);
  });
  intro
    .to(arrival, { coatRun: 1, duration: 0.95, ease: "power2.inOut" }, 0.95)
    .to(arrival, { pearls: 1, duration: 0.9, ease: "none" }, 1.6)
    .to(arrival, { pour: 1, duration: 0.65, ease: "power2.out" }, 1.75)
    .to(arrival, { drips: 1, duration: 1.7, ease: "power2.out" }, 2.3)
    .to(arrival, { berries: 1, duration: 1.05, ease: "none" }, 2.7)
    .to(arrival, { candles: 1, duration: 0.75, ease: "power3.out" }, 3.3)
    .to(arrival, { flames: 1, duration: 0.7, ease: "power1.out" }, 3.8)
    .to(arrival, { zoom: 1, duration: 4.4, ease: "power2.out" }, 0);

  /* ---------- scroll: the cake comes apart, is cut, and is seen from above ---------- */
  const scrollLine = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: smallScreen ? 0.6 : 1,
      onUpdate: (self) => {
        if (self.progress > 0.004 && intro.progress() < 1) intro.progress(1);
        if (progress) progress.style.transform = `scaleY(${self.progress.toFixed(4)})`;
      },
    },
  });
  const [chapterApart, chapterCut, chapterTop] = chapters;
  const reveal = (element: HTMLElement | undefined, at: number) => {
    if (element) scrollLine.fromTo(element, { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: 4.5, ease: "power2.out" }, at);
  };
  const conceal = (element: HTMLElement | undefined, at: number) => {
    if (element) scrollLine.to(element, { autoAlpha: 0, y: -34, duration: 3.5, ease: "power2.in" }, at);
  };

  scrollLine
    // Hero: a slow push in, then the headline leaves.
    .to(state, { azimuth: -0.22, elevation: 0.21, lookY: 0.44, duration: 8 }, 0)
    .to(hero, { autoAlpha: 0, y: -42, duration: 5, ease: "power2.in" }, 4);
  if (cue) scrollLine.to(cue, { autoAlpha: 0, duration: 2 }, 1);
  scrollLine
    // Apart: the coat lifts off, the layers separate, the camera pulls back to see them all.
    .to(state, { explode: 1, coatLift: 1, duration: 20 }, 9)
    .to(state, { azimuth: 0.14, elevation: 0.15, lookY: 1.5, zoom: 1.32, spin: 3.5, shiftPortrait: -0.16, duration: 20 }, 9)
    .to(state, { labels: 1, duration: 5, ease: "none" }, 21);
  reveal(chapterApart, 16);
  conceal(chapterApart, 38);
  scrollLine
    .to(state, { labels: 0, duration: 3, ease: "none" }, 36)
    // Back together, turning to where the cut will be.
    .to(state, { explode: 0, coatLift: 0, duration: 10 }, 38)
    .to(state, { azimuth: 0.1, elevation: 0.24, lookY: 0.36, zoom: 0.94, spin: CUT_SPIN, shiftPortrait: 0.03, duration: 14 }, 38)
    // Cut: the wedge slides toward the viewer and the layers show.
    .to(state, { wedge: 1, duration: 12 }, 50)
    .to(state, { azimuth: 0.2, elevation: 0.2, lookY: 0.3, zoom: 1, shiftLandscape: 0.27, duration: 12 }, 50);
  reveal(chapterCut, 53);
  conceal(chapterCut, 66);
  scrollLine
    .to(state, { wedge: 0, duration: 7 }, 67)
    // From above: the studio lights fall away and the candles take over.
    .to(state, { azimuth: 0.72, elevation: 0.86, lookY: 0.86, zoom: 0.84, spin: CUT_SPIN + 0.9, shiftLandscape: 0.2, shiftPortrait: 0, duration: 15 }, 70)
    .to(state, { studio: 0.52, candleLight: 0.55, duration: 12 }, 72);
  reveal(chapterTop, 78);
  scrollLine
    .to(state, { zoom: 1.06, elevation: 0.72, duration: 8 }, 90)
    .to(state, { fade: 0, duration: 5, ease: "none" }, 95)
    .to({}, { duration: 0.01 }, 100);

  /* ---------- drawing: only when it can be seen, and lighter if the device struggles ---------- */
  let visible = true;
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  observer.observe(root);

  let shown = false;
  let frames = 0;
  let spent = 0;
  let previous = performance.now();
  let compiled = false;
  let stopped = false;
  // Prepares the shaders in the background, so the first frame does not freeze the page.
  void renderer
    .compileAsync(scene, camera)
    .catch(() => undefined)
    .then(() => {
      if (stopped) return;
      compiled = true;
      if (intro.progress() < 1) intro.play();
    });

  const tick = (seconds: number) => {
    if (!visible || document.hidden || !compiled) {
      previous = performance.now();
      return;
    }
    draw(seconds);
    if (!shown) {
      shown = true;
      canvas.classList.add("is-ready");
    }
    const now = performance.now();
    spent += now - previous;
    previous = now;
    frames += 1;
    if (frames === 45) {
      const average = spent / frames;
      frames = 0;
      spent = 0;
      if (average > 26 && pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio - 0.25);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
      } else if (average > 30 && key.castShadow) {
        key.castShadow = false;
      }
    }
  };
  gsap.ticker.add(tick);

  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    pointerY = (event.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("resize", resize);

  // A reload partway down the page starts with the cake already finished.
  ScrollTrigger.refresh();
  if (window.scrollY > root.offsetTop + 20) intro.progress(1);

  return () => {
    stopped = true;
    gsap.ticker.remove(tick);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("resize", resize);
    observer.disconnect();
    intro.kill();
    scrollLine.scrollTrigger?.kill();
    scrollLine.kill();
    model.dispose();
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}
