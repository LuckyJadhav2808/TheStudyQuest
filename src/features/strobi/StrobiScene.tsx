"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useStrobi, type Mood } from "./store";

const pointer = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
}
const EYE: Record<Mood, { sx: number; sy: number; rot: number; droop: number }> = {
  idle: { sx: 1, sy: 1, rot: 0, droop: 0 }, happy: { sx: 1.1, sy: 0.42, rot: 0.5, droop: 0 }, cheer: { sx: 1.2, sy: 0.38, rot: 0.7, droop: 0 },
  sleepy: { sx: 1.1, sy: 0.22, rot: 0, droop: -0.1 }, alert: { sx: 1.15, sy: 1.3, rot: 0, droop: 0 }, thinking: { sx: 0.9, sy: 0.85, rot: -0.2, droop: 0 }, celebrate: { sx: 1.2, sy: 0.4, rot: 0.8, droop: 0 },
};

function Tick() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) invalidate(); }, 33);
    return () => window.clearInterval(id);
  }, [invalidate]);
  return null;
}

function Body() {
  const root = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const eL = useRef<THREE.Mesh>(null);
  const eR = useRef<THREE.Mesh>(null);
  const st = useRef({ lx: 0, ly: 0, nextBlink: 3, blink: 0, squash: 0, bounce: 0, bt: 0, seenBounce: 0, seenSquash: 0, sy: 1, sx: 1, rot: 0, droop: 0 });

  useFrame((state, dt) => {
    const s = st.current;
    const t = state.clock.elapsedTime;
    const { mood, bounce, squash } = useStrobi.getState();
    if (bounce !== s.seenBounce) { s.seenBounce = bounce; s.bounce = 1; s.bt = 0; }
    if (squash !== s.seenSquash) { s.seenSquash = squash; s.squash = 1; }
    s.squash *= Math.exp(-dt * 6);
    s.bounce *= Math.exp(-dt * 2.2);
    s.bt += dt;
    s.lx += (pointer.x - s.lx) * Math.min(1, dt * 4);
    s.ly += (pointer.y - s.ly) * Math.min(1, dt * 4);
    if (t > s.nextBlink) { s.blink = 1; s.nextBlink = t + 3 + Math.random() * 3; }
    s.blink = Math.max(0, s.blink - dt * 7);
    const tgt = EYE[mood];
    const k = Math.min(1, dt * 10);
    s.sx += (tgt.sx - s.sx) * k; s.sy += (tgt.sy - s.sy) * k; s.rot += (tgt.rot - s.rot) * k; s.droop += (tgt.droop - s.droop) * k;
    const breathe = 1 + Math.sin(t * 2) * 0.025;
    const sq = s.squash * Math.sin(s.squash * 3.14);
    if (root.current) {
      const hop = Math.abs(Math.sin(s.bt * 9)) * 0.38 * s.bounce;
      root.current.position.set(s.lx * 0.08, hop + s.droop, 0);
      root.current.scale.set(breathe * (1 + 0.18 * s.squash + sq * 0.05), breathe * (1 - 0.26 * s.squash), breathe * (1 + 0.18 * s.squash));
      const wobble = mood === "alert" ? Math.sin(t * 28) * 0.1 : mood === "sleepy" ? -0.12 : mood === "celebrate" ? Math.sin(t * 10) * 0.12 : 0;
      root.current.rotation.set(-s.ly * 0.15 + (mood === "sleepy" ? 0.12 : 0), s.lx * 0.3, wobble);
    }
    if (eyes.current) eyes.current.rotation.set(-s.ly * 0.22, s.lx * 0.3, 0);
    const blinkY = 1 - s.blink * 0.92;
    if (eL.current) { eL.current.scale.set(s.sx, s.sy * blinkY * (mood === "thinking" ? 0.8 : 1), 0.45); eL.current.rotation.z = -0.14 + s.rot; }
    if (eR.current) { eR.current.scale.set(s.sx, s.sy * blinkY * (mood === "thinking" ? 1.2 : 1), 0.45); eR.current.rotation.z = -0.14 - s.rot; }
  });

  return (
    <group ref={root}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
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
  return (
    <Canvas dpr={[1, 1.75]} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} camera={{ position: [0, 0, 4.1], fov: 34 }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[2.5, 3, 4]} intensity={2.4} />
      <pointLight position={[-3, -1.5, 2.5]} color="#9ccbff" intensity={18} />
      <Body />
      <Tick />
    </Canvas>
  );
}
