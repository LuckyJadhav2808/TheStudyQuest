"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useStrobi, type Mood } from "./store";
import { getStrobiBehaviour } from "./pageBehaviour";

const pointer = { x: 0, y: 0, movedAt: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.movedAt = performance.now();
  }, { passive: true });
}
const EYE: Record<Mood, { sx: number; sy: number; rot: number; droop: number }> = {
  idle: { sx: 1, sy: 1, rot: 0, droop: 0 },
  happy: { sx: 1.15, sy: 0.38, rot: 0.55, droop: 0 },
  cheer: { sx: 1.25, sy: 0.35, rot: 0.75, droop: 0 },
  sleepy: { sx: 1.1, sy: 0.2, rot: 0, droop: -0.12 },
  alert: { sx: 1.2, sy: 1.35, rot: 0, droop: 0 },
  thinking: { sx: 0.9, sy: 0.85, rot: -0.25, droop: 0.04 },
  celebrate: { sx: 1.25, sy: 0.38, rot: 0.8, droop: 0 },
};

function DemandTicker({ route }: { route: string }) {
  const invalidate = useThree((s) => s.invalidate);
  const mood = useStrobi((s) => s.mood);
  const bounce = useStrobi((s) => s.bounce);
  const squash = useStrobi((s) => s.squash);

  useEffect(() => {
    invalidate();
  }, [mood, bounce, squash, route, invalidate]);

  useEffect(() => {
    let raf = 0;
    const onMove = () => invalidate();
    window.addEventListener("pointermove", onMove, { passive: true });
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const st = useStrobi.getState();
      const recentMove = performance.now() - pointer.movedAt < 900;
      const activeAnim = st.mood !== "idle" || recentMove || getStrobiBehaviour(route).idleBounce;
      if (activeAnim) invalidate();
    }, 66);
    // Periodic blink wake-up every 2s
    const blinkTimer = window.setInterval(() => {
      if (!document.hidden) invalidate();
    }, 2000);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(id);
      window.clearInterval(blinkTimer);
      cancelAnimationFrame(raf);
    };
  }, [invalidate, route]);
  return null;
}

function Body({ route }: { route: string }) {
  const root = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const eL = useRef<THREE.Mesh>(null);
  const eR = useRef<THREE.Mesh>(null);
  const st = useRef({
    lx: 0, ly: 0, nextBlink: 3, blink: 0, doubleBlink: false,
    squash: 0, bounce: 0, bt: 0, spin: 0,
    seenBounce: 0, seenSquash: 0, seenMood: "idle" as Mood,
    sy: 1, sx: 1, rot: 0, droop: 0, tilt: 0,
  });

  useFrame((state, dt) => {
    const s = st.current;
    const t = state.clock.elapsedTime;
    const { mood, bounce, squash } = useStrobi.getState();
    const beh = getStrobiBehaviour(route);

    if (bounce !== s.seenBounce) { s.seenBounce = bounce; s.bounce = 1; s.bt = 0; }
    if (squash !== s.seenSquash) { s.seenSquash = squash; s.squash = 1; }
    if (mood !== s.seenMood) {
      s.seenMood = mood;
      if (mood === "celebrate") s.spin = Math.PI * 2;
    }

    s.squash *= Math.exp(-dt * 6);
    s.bounce *= Math.exp(-dt * 2.2);
    s.spin *= Math.exp(-dt * 4);
    s.bt += dt;

    // Cursor tracking with page-aware gaze bias
    const recentPtr = performance.now() - pointer.movedAt < 2500;
    const targetX = recentPtr ? pointer.x : beh.lookX;
    const targetY = recentPtr ? pointer.y : beh.lookY;
    s.lx += (targetX - s.lx) * Math.min(1, dt * 4.5);
    s.ly += (targetY - s.ly) * Math.min(1, dt * 4.5);
    s.tilt += (beh.tiltZ - s.tilt) * Math.min(1, dt * 5);

    // Blink every 3-6s with occasional double blink
    if (t > s.nextBlink) {
      s.blink = 1;
      if (s.doubleBlink) {
        s.doubleBlink = false;
        s.nextBlink = t + 3 + Math.random() * 3;
      } else if (Math.random() < 0.25) {
        s.doubleBlink = true;
        s.nextBlink = t + 0.24;
      } else {
        s.nextBlink = t + 3 + Math.random() * 3;
      }
    }
    s.blink = Math.max(0, s.blink - dt * 7);

    const tgt = EYE[mood];
    const k = Math.min(1, dt * 10);
    s.sx += (tgt.sx - s.sx) * k;
    s.sy += (tgt.sy - s.sy) * k;
    s.rot += (tgt.rot - s.rot) * k;
    s.droop += (tgt.droop - s.droop) * k;

    const breathe = 1 + Math.sin(t * 2.1) * 0.025;
    // True inverse squash & stretch: wider when squashed, taller when stretched
    const sqY = 1 - 0.28 * s.squash + 0.14 * Math.sin(s.bt * 9) * s.bounce;
    const sqXZ = 1 / Math.sqrt(Math.max(0.65, sqY));

    if (root.current) {
      const idleHop = beh.idleBounce ? Math.abs(Math.sin(t * 3.5)) * 0.12 : 0;
      const hop = Math.abs(Math.sin(s.bt * 9)) * 0.42 * s.bounce + idleHop;
      root.current.position.set(s.lx * 0.08, hop + s.droop, 0);
      root.current.scale.set(breathe * sqXZ, breathe * sqY, breathe * sqXZ);
      const wobble =
        mood === "alert"
          ? Math.sin(t * 28) * 0.12
          : mood === "sleepy"
          ? -0.12
          : mood === "celebrate"
          ? Math.sin(t * 10) * 0.14
          : 0;
      root.current.rotation.set(-s.ly * 0.15 + (mood === "sleepy" ? 0.12 : 0), s.lx * 0.3 + s.spin, wobble + s.tilt);
    }

    if (eyes.current) eyes.current.rotation.set(-s.ly * 0.22, s.lx * 0.3, 0);
    const blinkY = 1 - s.blink * 0.92;
    if (eL.current) {
      eL.current.scale.set(s.sx, s.sy * blinkY * (mood === "thinking" ? 0.78 : 1), 0.45);
      eL.current.rotation.z = -0.14 + s.rot;
    }
    if (eR.current) {
      eR.current.scale.set(s.sx, s.sy * blinkY * (mood === "thinking" ? 1.22 : 1), 0.45);
      eR.current.rotation.z = -0.14 - s.rot;
    }
  });

  return (
    <group ref={root}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial color="#2E8BFF" roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} sheen={1} sheenColor="#a9d2ff" sheenRoughness={0.35} emissive="#0d4bb5" emissiveIntensity={0.35} />
      </mesh>
      <group ref={eyes}>
        <mesh ref={eL} position={[0.2, 0.26, 0.93]}>
          <capsuleGeometry args={[0.1, 0.34, 8, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} />
        </mesh>
        <mesh ref={eR} position={[0.52, 0.24, 0.8]} rotation={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.1, 0.34, 8, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export default function StrobiScene() {
  const route = usePathname();
  return (
    <Canvas dpr={[1, 1.5]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} camera={{ position: [0, 0, 4.1], fov: 34 }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[2.5, 3, 4]} intensity={2.4} />
      <pointLight position={[-3, -1.5, 2.5]} color="#9ccbff" intensity={18} />
      <Body route={route} />
      <DemandTicker route={route} />
    </Canvas>
  );
}
