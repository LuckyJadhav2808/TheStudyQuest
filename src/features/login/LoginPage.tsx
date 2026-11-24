"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, PageFrame } from "@/components/ui/misc";
import { Field, Select } from "@/components/ui/fields";
import { firebaseConfigured, emailSignIn, googleSignIn } from "@/core/firebase";
import { db } from "@/core/db";
import { ensureProfile, updateSettings } from "@/core/settings";
import { StrobiFace } from "@/features/strobi/StrobiFace";
import { adoptEgg } from "@/features/pets/PetsPage";
import { PetSprite } from "@/features/pets/PetSprite";
import { SPECIES } from "@/features/pets/petLogic";
import { strobiSay } from "@/features/strobi/toast";

const GOALS = ["Ace my exams", "Crack GATE or GRE", "Prepare for UPSC", "Land an SDE job", "Learn to code"];
export function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [seed, setSeed] = useState("strobi");
  const [species, setSpecies] = useState<string>(SPECIES[0].id);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const guest = async () => { await ensureProfile(); await updateSettings({ name: name.trim() || "Guest", profileCreated: true }); router.push("/"); };
  const finish = async () => {
    await ensureProfile();
    await updateSettings({ name: name.trim() || "Scholar", goal, avatarSeed: seed, profileCreated: true });
    if ((await db.pets.count()) === 0) await adoptEgg(species, SPECIES.find((s) => s.id === species)?.name ?? "Buddy", true);
    router.push("/");
  };
  const cloud = async (fn: () => Promise<string | null>) => { const n = await fn(); if (n) { await ensureProfile(); await updateSettings({ name: n, profileCreated: true }); router.push("/"); } else strobiSay("Sign-in did not complete. Guest Mode always works.", "error"); };
  return (
    <PageFrame title="Welcome to StudyQuest" subtitle="Your study life, turned into a quest.">
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <Card className="justify-between gap-4 overflow-y-auto">
          <div className="flex items-center gap-4"><StrobiFace mood="happy" size={88} /><p className="font-display text-2xl leading-tight">Hi, I&apos;m Strobi. No account needed. Jump in as a guest.</p></div>
          <button className="btn btn-lime !min-h-16 text-lg" onClick={() => void guest()}>Continue as Guest</button>
          <p className="text-xs text-muted">Guest Mode creates a local profile instantly. Your data stays on this device.</p>
          {firebaseConfigured && (
            <div className="space-y-2 border-t border-line/20 pt-3"><button className="btn w-full" onClick={() => void cloud(googleSignIn)}>Sign in with Google</button><div className="flex gap-2"><input className="input" type="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><input className="input" type="password" placeholder="Password" aria-label="Password" value={pw} onChange={(e) => setPw(e.target.value)} /></div><button className="btn btn-ink w-full" onClick={() => void cloud(() => emailSignIn(email, pw))}>Email sign in or sign up</button></div>
          )}
        </Card>
        <Card className="gap-3 overflow-y-auto">
          <h2 className="card-title">Create your character <span className="num text-sm text-muted">{step + 1}/3</span></h2>
          {step === 0 && <><Field label="What should I call you?"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></Field><Field label="Avatar seed"><input className="input" value={seed} onChange={(e) => setSeed(e.target.value)} /></Field></>}
          {step === 1 && <Field label="Primary goal"><Select value={goal} onChange={setGoal} options={GOALS.map((g) => ({ value: g, label: g }))} /></Field>}
          {step === 2 && <><p className="text-sm text-muted">Choose your starting egg. It is free and yours to raise.</p><div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Starting egg">{SPECIES.map((s) => <button key={s.id} role="radio" aria-checked={species === s.id} onClick={() => setSpecies(s.id)} className={`tile flex flex-col items-center border-[1.5px] ${species === s.id ? "border-line bg-lime text-ink" : "border-transparent"}`}><PetSprite species={s.id} stage={0} size={56} /><span className="text-xs font-bold">{s.name}</span></button>)}</div></>}
          <div className="mt-auto flex justify-between pt-2"><button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>{step < 2 ? <button className="btn btn-ink" onClick={() => setStep(step + 1)}>Next</button> : <button className="btn btn-lime" onClick={() => void finish()}>Start my quest</button>}</div>
        </Card>
      </div>
    </PageFrame>
  );
}
