// Adapted from bananaggong/grapes-web HeroCanvas.tsx at 6cf309d.
import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SONGS, type HeroSong } from './songs';
import { fibonacciSpherePoints } from './fibonacciSphere';
type GrapeMesh = THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
type LabelMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
type WaveRingMesh = THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

type GrapeState = {
  rest: THREE.Vector3;
  group: THREE.Group;
  mesh: GrapeMesh;
  label: LabelMesh;
  labelTexture: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
  labelMaterial: THREE.MeshBasicMaterial;
  baseScale: number;
  baseEmissive: THREE.Color;
  introScale: number;
  flipAngle: number;
  flipVel: number;
  selectionMix: number;
  selectionVel: number;
  pumpBoost: number;
};

const CLUSTER_RADIUS = 1.75;
const FLIP_HIDDEN = 0;
const FLIP_VISIBLE = Math.PI;
const FLIP_STIFFNESS = 28;
const FLIP_DAMPING = 8.5;
const SELECT_STIFFNESS = 24;
const SELECT_DAMPING = 7.8;
const SWITCH_STIFFNESS = 29;
const SWITCH_DAMPING = 8.4;
const LABEL_OFFSET = 1.12;
const LABEL_OPACITY_START = 0.18;
const LABEL_OPACITY_END = 0.82;
const PRESENTATION_RADIUS_MULT = 2.35;
const PRESENTATION_SIDE_CLUSTER_MULT = 1.08;
const PRESENTATION_UP_CLUSTER_MULT = 0.58;
const PRESENTATION_UP_RADIUS_MULT = 1.05;
const PRESENTATION_FORWARD_MULT = 0.15;
const ACTIVE_SCALE_BONUS = 0.2;
const ACTIVE_PULSE_BOOST = 0.85;
const ACTIVE_GLOW_BOOST = 0.42;
const ACTIVE_BREATH_AMP = 0.022;
const ACTIVE_BREATH_SPEED = 3.1;
const STOP_FADE_OUT_MS = 180;
const AUTO_ROT_SPEED = 0.38;
const INTRO_ROT_RAMP_RATE = 4.6;
const INTRO_POP_START_DELAY = 0.18;
const INTRO_POP_STAGGER_MIN = 0.055;
const INTRO_POP_STAGGER_MAX = 0.09;
const INTRO_POP_DURATION_MIN = 0.28;
const INTRO_POP_DURATION_MAX = 0.38;

function wrapLabelText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const nextLine = `${currentLine} ${words[i]}`;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }

  lines.push(currentLine);
  return lines.slice(0, 2);
}

function makeLabelTexture(song: HeroSong): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create canvas context for grape label.");
  }

  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(255, 255, 255, 0.42)";
  ctx.shadowBlur = 18;

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  const fontFamily = getComputedStyle(document.body).fontFamily;
  ctx.font = `600 74px ${fontFamily}`;
  ctx.fillText(song.artist, width / 2, 132);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 132px ${fontFamily}`;

  const titleLines = wrapLabelText(ctx, song.title, width - 180);
  const lineHeight = 124;
  const titleBlockHeight = Math.max(titleLines.length - 1, 0) * lineHeight;
  const titleStartY = 298 - titleBlockHeight / 2;

  titleLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, titleStartY + index * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function projectAxisOntoPlane(source: THREE.Vector3, normal: THREE.Vector3, target: THREE.Vector3) {
  target.copy(source).addScaledVector(normal, -source.dot(normal));
  return target;
}

function stepSpring(current: number, target: number, velocity: number, dt: number, stiffness: number, damping: number) {
  const nextVelocity = velocity + (stiffness * (target - current) - damping * velocity) * dt;
  const nextValue = current + nextVelocity * dt;
  return { value: nextValue, velocity: nextVelocity };
}

function smoothTo(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * Math.min(rate * dt, 1);
}

function shuffledIndices(length: number) {
  const values = Array.from({ length }, (_, index) => index);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function mountGrapeScene({container: heroEl, canvas: canvasEl, onSelect, onFirstRender, getActiveIndex, getAnalyser}: {
  container: HTMLElement; canvas: HTMLCanvasElement; onSelect: (index: number) => void;
  onFirstRender: () => void; getActiveIndex: () => number | null; getAnalyser: () => AnalyserNode | null;
}) {
    const wrap = heroEl;
    const canvas = canvasEl;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;
    const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
    visibility.observe(heroEl);
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(55, heroEl.clientWidth / heroEl.clientHeight, 0.08, 200);
    camera.position.set(0, 0.5, 6.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(heroEl.clientWidth, heroEl.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false;

    let envRT: THREE.WebGLRenderTarget | null = null;

    const ambient = new THREE.AmbientLight(0xcc88ff, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffeeff, 0.8);
    key.position.set(4, 6, 8);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x9944ff, 1.6);
    rim.position.set(-5, 2.5, -4);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xdd55ff, 1.2);
    fill.position.set(0, -3, 5);
    scene.add(fill);

    const mouseLight = new THREE.PointLight(0xffffff, 0.0, 28);
    mouseLight.position.set(0, 0, 3.5);
    scene.add(mouseLight);

    const cluster = new THREE.Group();
    scene.add(cluster);

    const waveHalo = new THREE.Group();
    waveHalo.position.set(0, 0.08, -0.95);
    scene.add(waveHalo);

    const sphereGeom = new THREE.SphereGeometry(1, 22, 22);
    const labelGeom = new THREE.PlaneGeometry(1, 1);
    const waveGeomPrimary = new THREE.RingGeometry(2.18, 2.46, 128);
    const waveGeomSecondary = new THREE.RingGeometry(2.78, 2.98, 128);
    const waveMaterialPrimary = new THREE.MeshBasicMaterial({
      color: 0x8ec7ff,
      transparent: true,
      opacity: 0.055,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const waveMaterialSecondary = new THREE.MeshBasicMaterial({
      color: 0xcf8fff,
      transparent: true,
      opacity: 0.035,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const waveRingPrimary: WaveRingMesh = new THREE.Mesh(waveGeomPrimary, waveMaterialPrimary);
    const waveRingSecondary: WaveRingMesh = new THREE.Mesh(waveGeomSecondary, waveMaterialSecondary);
    waveRingPrimary.position.z = -0.06;
    waveRingSecondary.position.z = -0.18;
    waveHalo.add(waveRingPrimary, waveRingSecondary);

    const grapes: GrapeState[] = [];
    const rayMeshes: GrapeMesh[] = [];
    const rests = fibonacciSpherePoints(SONGS.length, CLUSTER_RADIUS);

    for (let i = 0; i < SONGS.length; i++) {
      const t = i / Math.max(1, SONGS.length - 1);
      const cr = Math.round(0x98 + (0xcc - 0x98) * t);
      const cg = Math.round(0x18 + (0x22 - 0x18) * t);
      const cb = Math.round(0xee + (0xc0 - 0xee) * t);
      const color = new THREE.Color(`rgb(${cr},${cg},${cb})`).convertSRGBToLinear();
      const baseEmissive = color.clone().lerp(new THREE.Color(0xffffff), 0.18);

      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.05,
        roughness: 0.25,
        envMapIntensity: 0.55,
        emissive: baseEmissive.clone(),
        emissiveIntensity: 0.16,
      });

      const labelTexture = makeLabelTexture(SONGS[i]);
      const labelMaterial = new THREE.MeshBasicMaterial({
        map: labelTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        alphaTest: 0.02,
        depthTest: true,
        depthWrite: false,
        side: THREE.FrontSide,
        toneMapped: false,
      });

      const mesh = new THREE.Mesh(sphereGeom, material);
      mesh.scale.setScalar(0.001);
      mesh.userData.grapeIndex = i;
      rayMeshes.push(mesh);

      const group = new THREE.Group();
      group.position.copy(rests[i]);
      group.add(mesh);
      cluster.add(group);

      const label = new THREE.Mesh(labelGeom, labelMaterial);
      label.visible = false;
      scene.add(label);

      grapes.push({
        rest: rests[i].clone(),
        group,
        mesh,
        label,
        labelTexture,
        material,
        labelMaterial,
        baseScale: 0.32 + (i % 5) * 0.025,
        baseEmissive,
        introScale: 0.001,
        flipAngle: FLIP_HIDDEN,
        flipVel: 0,
        selectionMix: 0,
        selectionVel: 0,
        pumpBoost: 0,
      });
    }

    const raycaster = new THREE.Raycaster();
    raycaster.params.Mesh = { threshold: 0 };

    const mouseTarget = new THREE.Vector2(0.5, 0.5);
    const mouseSmooth = new THREE.Vector2(0.5, 0.5);
    const worldUp = new THREE.Vector3(0, 1, 0);
    const worldRight = new THREE.Vector3(1, 0, 0);

    const tmpMouseWorld = new THREE.Vector3();
    const tmpMouseDir = new THREE.Vector3();
    const tmpClusterWorld = new THREE.Vector3();
    const tmpGrapeWorld = new THREE.Vector3();
    const tmpToCamera = new THREE.Vector3();
    const tmpCameraRight = new THREE.Vector3();
    const tmpCameraLook = new THREE.Vector3();
    const tmpCameraUp = new THREE.Vector3();
    const tmpPresentationWorld = new THREE.Vector3();
    const tmpPresentationLocal = new THREE.Vector3();
    const tmpFlipAxis = new THREE.Vector3();
    const tmpLabelOffset = new THREE.Vector3();

    let autoRotY = 0.28;
    let introRotationMix = 0;
    let introComplete = false;
    let firstRenderNotified = false;
    let elapsedTime = 0;
    let isPointerIn = false;
    let lockedGrapeIdx: number | null = null;
    let activeGrapeIdx: number | null = null;
    let isSwitching = false;
    let waveHoverMix = 0;
    let waveActiveMix = 0;
    let cancelled = false;
    let introTL: gsap.core.Timeline | null = null;
    let rotationDelayId: ReturnType<typeof setTimeout> | null = null;
    let tickerFn: (() => void) | null = null;

    let lastFrame = performance.now();
    const frameDelta = () => { const now = performance.now(); const dt = (now - lastFrame) / 1000; lastFrame = now; return dt; };
    const freqBuf = new Uint8Array(128);
    const emissivePulse = new THREE.Color(0xcc88ff);
    const audioReactive = { bass: 0, emissiveBoost: 0, scalePulse: 1 };

    let onPointerMove: (e: PointerEvent) => void = () => {};
    let onPointerLeave: () => void = () => {};
    let onClick: (e: PointerEvent) => void = () => {};
    let resize: () => void = () => {};

    const gctx = gsap.context(() => {
      cluster.scale.setScalar(1);

      const quickMouseX = gsap.quickTo(mouseSmooth, "x", { duration: 0.55, ease: "power3.out" });
      const quickMouseY = gsap.quickTo(mouseSmooth, "y", { duration: 0.55, ease: "power3.out" });
      const quickBass = gsap.quickTo(audioReactive, "bass", { duration: 0.18, ease: "power2.out" });
      const quickEmissiveBoost = gsap.quickTo(audioReactive, "emissiveBoost", { duration: 0.14, ease: "sine.out" });
      const quickScalePulse = gsap.quickTo(audioReactive, "scalePulse", { duration: 0.14, ease: "power2.out" });

      const ROTATION_DELAY_MS = 400;

      const introTimeline = gsap.timeline({
        paused: true,
        onComplete: () => {
          rotationDelayId = globalThis.setTimeout(() => {
            introComplete = true;
          }, ROTATION_DELAY_MS);
        },
      });

      let introCursor = (reducedMotion.matches ? 0 : INTRO_POP_START_DELAY);
      shuffledIndices(grapes.length).forEach((grapeIndex) => {
        introTimeline.to(
          grapes[grapeIndex],
          {
            introScale: 1,
            duration: reducedMotion.matches ? 0.01 : gsap.utils.random(INTRO_POP_DURATION_MIN, INTRO_POP_DURATION_MAX),
            ease: "back.out(2.2)",
          },
          introCursor,
        );
        introCursor += reducedMotion.matches ? 0 : gsap.utils.random(INTRO_POP_STAGGER_MIN, INTRO_POP_STAGGER_MAX);
      });
      introTL = introTimeline;

      resize = () => {
        const w = heroEl.clientWidth;
        const h = heroEl.clientHeight;
        if (!w || !h) return;
        // Fit the original cluster and its selected grape inside a narrow card.
        camera.position.z = Math.max(6.5, 4.15 / (w / h));
        camera.lookAt(0, 0, 0);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };

      function pickGrapeAtNDC(ndcx: number, ndcy: number): number | null {
        raycaster.setFromCamera(new THREE.Vector2(ndcx, ndcy), camera);
        const hits = raycaster.intersectObjects(rayMeshes, false);
        return hits.length ? (hits[0].object.userData.grapeIndex as number) : null;
      }

      tickerFn = () => {
        if (cancelled || !visible || document.hidden) { frameDelta(); return; }
        const nextActive = getActiveIndex();
        if (nextActive !== activeGrapeIdx) { isSwitching = activeGrapeIdx !== null && nextActive !== null; activeGrapeIdx = nextActive; }

        const dt = Math.min(frameDelta(), 0.05);
        if (!reducedMotion.matches) elapsedTime += dt;

        introRotationMix = smoothTo(introRotationMix, introComplete ? 1 : 0, INTRO_ROT_RAMP_RATE, dt);
        if (!reducedMotion.matches) autoRotY += dt * AUTO_ROT_SPEED * introRotationMix;
        cluster.rotation.y = autoRotY;
        cluster.rotation.x = 0.12;
        cluster.updateMatrixWorld(true);

        const ndcX = mouseSmooth.x * 2 - 1;
        const ndcY = -(mouseSmooth.y * 2 - 1);

        tmpMouseWorld.set(ndcX, ndcY, 0.5).unproject(camera);
        tmpMouseDir.subVectors(tmpMouseWorld, camera.position).normalize();
        if (Math.abs(tmpMouseDir.z) > 1e-6) {
          const tRay = (3.5 - camera.position.z) / tmpMouseDir.z;
          tmpMouseWorld.copy(camera.position).addScaledVector(tmpMouseDir, tRay);
          mouseLight.position.lerp(tmpMouseWorld, 0.12);
        }
        mouseLight.intensity += ((isPointerIn ? 7.0 : 0.0) - mouseLight.intensity) * 0.08;

        const analyser = reducedMotion.matches ? null : getAnalyser();
        let rawBass = 0;
        if (analyser) {
          analyser.getByteFrequencyData(freqBuf);
          let sum = 0;
          for (let i = 0; i < 10; i++) sum += freqBuf[i];
          rawBass = sum / (10 * 255);
        }

        quickBass(rawBass);
        quickEmissiveBoost(gsap.utils.mapRange(0, 1, 0, 1, rawBass) * 0.92);
        quickScalePulse(1 + gsap.utils.mapRange(0, 1, 0, 0.14, rawBass));

        const canInteract = introComplete;
        const rayHit = canInteract && isPointerIn ? pickGrapeAtNDC(ndcX, ndcY) : null;
        lockedGrapeIdx = rayHit;
        const hoveredIdx = canInteract && isPointerIn ? lockedGrapeIdx : null;
        canvasEl.style.cursor = canInteract && hoveredIdx !== null ? "pointer" : "default";

        camera.getWorldDirection(tmpCameraLook).normalize();
        tmpCameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
        tmpCameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
        cluster.getWorldPosition(tmpClusterWorld);

        waveHoverMix = smoothTo(waveHoverMix, hoveredIdx !== null ? 1 : 0, 5.2, dt);
        waveActiveMix = smoothTo(waveActiveMix, activeGrapeIdx !== null ? 1 : 0, 4.2, dt);

        const bass = audioReactive.bass;
        const emBoost = audioReactive.emissiveBoost;
        const pulseAmount = Math.max(audioReactive.scalePulse - 1, 0);
        const clusterScale = cluster.scale.x;
        const selectionStiffness = isSwitching ? SWITCH_STIFFNESS : SELECT_STIFFNESS;
        const selectionDamping = isSwitching ? SWITCH_DAMPING : SELECT_DAMPING;

        for (let i = 0; i < grapes.length; i++) {
          const grape = grapes[i];
          const isActive = activeGrapeIdx === i;

          const selectionStep = stepSpring(
            grape.selectionMix,
            isActive ? 1 : 0,
            grape.selectionVel,
            dt,
            selectionStiffness,
            selectionDamping,
          );
          grape.selectionMix = THREE.MathUtils.clamp(selectionStep.value, 0, 1);
          grape.selectionVel = selectionStep.velocity;
          grape.pumpBoost = smoothTo(grape.pumpBoost, isActive ? 1 : 0, 7.5, dt);

          const targetFlip = isActive || hoveredIdx === i ? FLIP_VISIBLE : FLIP_HIDDEN;
          const flipStep = stepSpring(grape.flipAngle, targetFlip, grape.flipVel, dt, FLIP_STIFFNESS, FLIP_DAMPING);
          grape.flipAngle = THREE.MathUtils.clamp(flipStep.value, FLIP_HIDDEN, FLIP_VISIBLE);
          grape.flipVel = flipStep.velocity;

          const progress = THREE.MathUtils.clamp(grape.flipAngle / Math.PI, 0, 1);
          const hoverMix = THREE.MathUtils.smoothstep(progress, 0.08, 0.88);

          const presentationRadius = grape.baseScale * grape.introScale * clusterScale * (1 + grape.selectionMix * ACTIVE_SCALE_BONUS);
          const breathing = 1 + grape.pumpBoost * ACTIVE_BREATH_AMP * Math.sin(elapsedTime * ACTIVE_BREATH_SPEED + i * 0.45);
          const pulseScale = 1 + pulseAmount * (1 + ACTIVE_PULSE_BOOST * grape.pumpBoost);
          const displayScale = grape.baseScale * grape.introScale * (1 + grape.selectionMix * ACTIVE_SCALE_BONUS) * breathing * pulseScale;
          const worldScale = displayScale * clusterScale;

          tmpPresentationWorld
            .copy(tmpClusterWorld)
            .addScaledVector(
              tmpCameraRight,
              CLUSTER_RADIUS * PRESENTATION_SIDE_CLUSTER_MULT + presentationRadius * PRESENTATION_RADIUS_MULT,
            )
            .addScaledVector(
              tmpCameraUp,
              CLUSTER_RADIUS * PRESENTATION_UP_CLUSTER_MULT + presentationRadius * PRESENTATION_UP_RADIUS_MULT,
            )
            .addScaledVector(tmpCameraLook, -presentationRadius * PRESENTATION_FORWARD_MULT);
          tmpPresentationLocal.copy(tmpPresentationWorld);
          cluster.worldToLocal(tmpPresentationLocal);
          grape.group.position.lerpVectors(grape.rest, tmpPresentationLocal, grape.selectionMix);

          grape.mesh.scale.setScalar(displayScale);
          grape.material.emissive.copy(grape.baseEmissive).lerp(emissivePulse, THREE.MathUtils.clamp(bass * 0.72, 0, 1));

          const hoverGlow = hoverMix * gsap.utils.mapRange(0, 1, 0.18, 0.88, emBoost);
          const activeGlow = grape.pumpBoost * gsap.utils.mapRange(0, 1, 0.2, ACTIVE_GLOW_BOOST, emBoost);
          const targetEmissiveIntensity = 0.16 + hoverGlow + activeGlow;
          grape.material.emissiveIntensity = smoothTo(grape.material.emissiveIntensity, targetEmissiveIntensity, 6, dt);

          grape.group.getWorldPosition(tmpGrapeWorld);
          tmpToCamera.copy(camera.position).sub(tmpGrapeWorld).normalize();

          projectAxisOntoPlane(worldUp, tmpToCamera, tmpFlipAxis);
          if (tmpFlipAxis.lengthSq() < 1e-6) {
            projectAxisOntoPlane(worldRight, tmpToCamera, tmpFlipAxis);
          }
          if (tmpFlipAxis.lengthSq() < 1e-6) {
            tmpFlipAxis.set(1, 0, 0);
          } else {
            tmpFlipAxis.normalize();
          }

          tmpLabelOffset.copy(tmpToCamera).multiplyScalar(-worldScale * LABEL_OFFSET).applyAxisAngle(tmpFlipAxis, grape.flipAngle);

          grape.label.position.copy(tmpGrapeWorld).add(tmpLabelOffset);
          grape.label.quaternion.copy(camera.quaternion);
          grape.label.scale.set(worldScale * 2.15, worldScale * 1.02, 1);

          const labelOpacity = THREE.MathUtils.smoothstep(progress, LABEL_OPACITY_START, LABEL_OPACITY_END);
          grape.labelMaterial.opacity = Math.max(labelOpacity, grape.selectionMix * 0.95);
          grape.label.visible = grape.labelMaterial.opacity > 0.001 && worldScale > 0.001;
        }

        waveHalo.quaternion.copy(camera.quaternion);
        waveHalo.position.z = -0.95 - waveActiveMix * 0.08;

        const waveBass = THREE.MathUtils.clamp(bass, 0, 1);
        const primaryIdle = 1 + 0.015 * Math.sin(elapsedTime * 0.62);
        const secondaryIdle = 1 + 0.018 * Math.sin(elapsedTime * 0.48 + 1.3);
        const hoverWave = waveHoverMix * 0.035;
        const activeWave = waveActiveMix * (0.045 + waveBass * 0.065);

        waveRingPrimary.scale.setScalar(primaryIdle + hoverWave + activeWave);
        waveRingSecondary.scale.setScalar(secondaryIdle + hoverWave * 0.65 + activeWave * 0.78);
        waveRingPrimary.rotation.z = elapsedTime * 0.08;
        waveRingSecondary.rotation.z = -elapsedTime * 0.055 + 0.42;
        waveMaterialPrimary.opacity = 0.04 + waveHoverMix * 0.02 + waveActiveMix * 0.028 + waveBass * 0.028;
        waveMaterialSecondary.opacity = 0.024 + waveHoverMix * 0.012 + waveActiveMix * 0.02 + waveBass * 0.018;

        if (isSwitching && activeGrapeIdx !== null && grapes[activeGrapeIdx]?.selectionMix > 0.9) {
          isSwitching = false;
        } else if (activeGrapeIdx === null && grapes.every((grape) => grape.selectionMix < 0.02)) {
          isSwitching = false;
        }

        renderer.render(scene, camera);
        if (!firstRenderNotified) {
          firstRenderNotified = true;
          onFirstRender();
        }
      };

      gsap.ticker.add(tickerFn);

      function ndcFromEvent(event: PointerEvent) {
        const rect = canvasEl.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        mouseTarget.set(x, y);
        quickMouseX(x);
        quickMouseY(y);
      }

      onPointerMove = (event: PointerEvent) => {
        isPointerIn = true;
        ndcFromEvent(event);
      };

      onPointerLeave = () => {
        isPointerIn = false;
        lockedGrapeIdx = null;
        mouseTarget.set(0.5, 0.5);
        quickMouseX(0.5);
        quickMouseY(0.5);
        canvasEl.style.cursor = "default";
      };

      onClick = (event: PointerEvent) => {
        if (!introComplete) return;
        ndcFromEvent(event);
        const idx = pickGrapeAtNDC(mouseTarget.x * 2 - 1, -(mouseTarget.y * 2 - 1));
        if (idx === null) return;

        onSelect(idx);
      };

      window.addEventListener("resize", resize);
      canvasEl.addEventListener("pointermove", onPointerMove);
      canvasEl.addEventListener("pointerleave", onPointerLeave);
      canvasEl.addEventListener("click", onClick);

      resize();
    }, wrap);

    const sizeObserver = new ResizeObserver(() => resize());
    sizeObserver.observe(heroEl);

    requestAnimationFrame(() => {
      if (cancelled) return;
      const pmrem = new THREE.PMREMGenerator(renderer);
      envRT = pmrem.fromScene(new RoomEnvironment(), 0.039);
      pmrem.dispose();
      scene.environment = envRT.texture;
      introTL?.play();
    });

    return () => {
      cancelled = true;
      if (tickerFn) gsap.ticker.remove(tickerFn);
      gctx.revert();
      window.removeEventListener("resize", resize);
      canvasEl.removeEventListener("pointermove", onPointerMove);
      canvasEl.removeEventListener("pointerleave", onPointerLeave);
      canvasEl.removeEventListener("click", onClick);
      canvasEl.style.cursor = "default";
      sizeObserver.disconnect();
      visibility.disconnect();
      if (rotationDelayId !== null) globalThis.clearTimeout(rotationDelayId);

      sphereGeom.dispose();
      labelGeom.dispose();
      waveGeomPrimary.dispose();
      waveGeomSecondary.dispose();
      waveMaterialPrimary.dispose();
      waveMaterialSecondary.dispose();
      envRT?.dispose();

      for (const grape of grapes) {
        grape.labelTexture.dispose();
        grape.material.dispose();
        grape.labelMaterial.dispose();
        scene.remove(grape.label);
      }

      renderer.dispose();
      scene.clear();
    };
}
