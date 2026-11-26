"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkle } from "@phosphor-icons/react";
import { PageFrame } from "@/components/ui/misc";
import { Field, Select } from "@/components/ui/fields";
import { firebaseConfigured, emailSignIn, googleSignIn } from "@/core/firebase";
import { db } from "@/core/db";
import { ensureProfile, updateSettings } from "@/core/settings";
import { StrobiFace } from "@/features/strobi/StrobiFace";
import { adoptEgg } from "@/features/pets/PetsPage";
import { PetSprite } from "@/features/pets/PetSprite";
import { SPECIES } from "@/features/pets/petLogic";
import { strobiSay } from "@/features/strobi/toast";
import { fetchCloudSession, syncWithCloud } from "@/lib/cloudSync";

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
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [rightPane, setRightPane] = useState<"auth" | "character">("auth");
  const [mobileScreen, setMobileScreen] = useState<"welcome" | "action">("welcome");
  const [sbConfigured, setSbConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focusField, setFocusField] = useState<"none" | "email" | "pw">("none");

  useEffect(() => {
    router.prefetch("/");
    void fetchCloudSession().then((r) => {
      setSbConfigured(r.configured);
      if (!r.configured && !firebaseConfigured) setRightPane("character");
    });
  }, [router]);

  const guest = async () => {
    await ensureProfile();
    await updateSettings({ name: name.trim() || "Guest", profileCreated: true });
    router.push("/");
  };

  const finish = async () => {
    await ensureProfile();
    await updateSettings({ name: name.trim() || "Scholar", goal, avatarSeed: seed, profileCreated: true });
    if ((await db.pets.count()) === 0) {
      await adoptEgg(species, SPECIES.find((s) => s.id === species)?.name ?? "Buddy", true);
    }
    router.push("/");
  };

  const cloud = async (fn: () => Promise<string | null>) => {
    const n = await fn();
    if (n) {
      await ensureProfile();
      await updateSettings({ name: n, profileCreated: true });
      router.push("/");
    } else {
      strobiSay("Sign-in did not complete. Guest Mode always works.", "error");
    }
  };

  const supabaseAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || pw.length < 6) {
      strobiSay("Enter a valid email and password (6+ chars).", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: pw,
          mode: authMode,
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { user?: { name: string }; error?: string };
      if (!res.ok || !data.user) {
        strobiSay(data.error || "Sign-in failed", "error");
        setBusy(false);
        return;
      }
      await ensureProfile();
      await updateSettings({ name: data.user.name, profileCreated: true });
      strobiSay(`Signed in as ${data.user.name}`, "tip");
      router.push("/");
      void syncWithCloud()
        .then((synced) => {
          if (synced?.needsSchema) strobiSay("Run supabase/schema.sql to enable table sync.", "tip");
        })
        .catch(() => undefined);
    } catch {
      strobiSay("Could not reach auth server.", "error");
    }
    setBusy(false);
  };

  const hasCloud = sbConfigured || firebaseConfigured;
  const strobiMood = focusField === "pw" ? "sleepy" : focusField === "email" ? "cheering" : "happy";

  return (
    <PageFrame title="StudyQuest" subtitle="Your study life, turned into a quest.">
      <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 gap-4 lg:grid-cols-2 items-stretch">
        {/* Left Card: Warm Paper Welcome */}
        <section
          className={`relative flex-col justify-between overflow-hidden rounded-[32px] border-[1.5px] border-border-strong bg-surface p-6 sm:p-8 shadow-sm animate-in fade-in duration-200 ${
            mobileScreen === "welcome" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Decorative geometric blobs matching reference */}
          <div className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full bg-primary" aria-hidden />
          <div className="pointer-events-none absolute left-28 top-6 size-12 rounded-full bg-surface-inverse" aria-hidden />
          <div className="pointer-events-none absolute -right-8 top-12 size-24 rounded-full bg-[var(--color-violet-300)]" aria-hidden />

          <div className="relative z-10 mt-20 sm:mt-24 flex flex-col gap-3">
            <h2 className="font-display text-balance text-3xl sm:text-4xl font-extrabold tracking-tight text-fg leading-[1.08]">
              Let&apos;s turn study into a quest!
            </h2>
            <p className="text-sm text-muted max-w-xs">
              Say goodbye to procrastination. Notes, spaced repetition, and focus sprints — offline-first.
            </p>

            <div className="mt-3 flex flex-col gap-2.5 max-w-xs">
              <button
                type="button"
                onClick={() => void guest()}
                className="btn rounded-full bg-surface-inverse text-on-inverse !min-h-12 text-sm font-extrabold hover:opacity-90"
              >
                Continue as Guest
              </button>

              {hasCloud ? (
                <button
                  type="button"
                  onClick={() => {
                    setRightPane("auth");
                    setAuthMode("signin");
                    setMobileScreen("action");
                  }}
                  className="btn rounded-full border-[1.5px] border-border-strong bg-surface text-fg !min-h-12 text-sm font-extrabold hover:bg-soft"
                >
                  Sign In / Cloud Sync
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRightPane("character");
                    setMobileScreen("action");
                  }}
                  className="btn rounded-full border-[1.5px] border-border-strong bg-surface text-fg !min-h-12 text-sm font-extrabold hover:bg-soft"
                >
                  Create Character (3 steps)
                </button>
              )}
            </div>
          </div>

          {/* Peeking Strobi anchored to bottom */}
          <div className="pointer-events-none relative -mb-16 mt-4 flex justify-center" aria-hidden>
            <div className="rounded-t-full bg-primary px-8 pt-4 pb-6 shadow-inner">
              <StrobiFace mood="happy" size={124} />
            </div>
          </div>
        </section>

        {/* Right Card: Electric Lime Auth / Character Card */}
        <section
          className={`relative flex-col justify-between overflow-y-auto scroll-thin rounded-[32px] border-[1.5px] border-border-strong bg-primary p-6 sm:p-8 text-on-primary shadow-sm animate-in fade-in duration-200 ${
            mobileScreen === "action" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Mobile back button */}
          <div className="flex items-center justify-between lg:hidden mb-2">
            <button
              type="button"
              onClick={() => setMobileScreen("welcome")}
              className="inline-flex items-center gap-1 rounded-full bg-surface/85 px-3 py-1 text-xs font-extrabold text-fg"
            >
              <ArrowLeft size={13} weight="bold" /> Back
            </button>
            {hasCloud && (
              <button
                type="button"
                onClick={() => setRightPane((p) => (p === "auth" ? "character" : "auth"))}
                className="rounded-full bg-surface/85 px-3 py-1 text-xs font-extrabold text-fg"
              >
                {rightPane === "auth" ? "Character Setup" : "Cloud Sign In"}
              </button>
            )}
          </div>

          {/* Peeking Strobi Eyes at top */}
          <div className="flex flex-col items-center text-center">
            <div className="-mt-2 mb-2 transition-transform duration-200">
              <StrobiFace mood={strobiMood} size={86} />
            </div>
            <h2 className="font-display text-balance text-2xl sm:text-3xl font-extrabold tracking-tight text-on-primary">
              {rightPane === "auth" && hasCloud ? "Ready for focus?" : "Create your scholar"}
            </h2>
            {hasCloud && (
              <div className="hidden lg:flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setRightPane("auth")}
                  className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold transition ${
                    rightPane === "auth" ? "bg-surface-inverse text-on-inverse" : "bg-surface/65 text-fg hover:bg-surface"
                  }`}
                >
                  Cloud Sync
                </button>
                <button
                  type="button"
                  onClick={() => setRightPane("character")}
                  className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold transition ${
                    rightPane === "character" ? "bg-surface-inverse text-on-inverse" : "bg-surface/65 text-fg hover:bg-surface"
                  }`}
                >
                  Character ({step + 1}/3)
                </button>
              </div>
            )}
          </div>

          {rightPane === "auth" && hasCloud ? (
            <div className="my-auto flex flex-col gap-3 pt-4">
              {sbConfigured && (
                <form onSubmit={(e) => void supabaseAuth(e)} className="flex flex-col gap-2.5">
                  {authMode === "signup" && (
                    <input
                      className="input !rounded-2xl border-border-strong/30 bg-surface/90 text-fg placeholder:text-muted"
                      type="text"
                      placeholder="Your Name"
                      aria-label="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusField("none")}
                      onBlur={() => setFocusField("none")}
                    />
                  )}
                  <input
                    className="input !rounded-2xl border-border-strong/30 bg-surface/90 text-fg placeholder:text-muted"
                    type="email"
                    placeholder="Email"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusField("email")}
                    onBlur={() => setFocusField("none")}
                  />
                  <input
                    className="input !rounded-2xl border-border-strong/30 bg-surface/90 text-fg placeholder:text-muted"
                    type="password"
                    placeholder="Password (6+ chars)"
                    aria-label="Password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    onFocus={() => setFocusField("pw")}
                    onBlur={() => setFocusField("none")}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="btn mt-1 w-full rounded-full bg-surface-inverse text-on-inverse !min-h-12 text-sm font-extrabold hover:opacity-90"
                  >
                    <Sparkle size={16} weight="fill" />
                    {busy ? "Working..." : authMode === "signup" ? "Let's Quest!" : "Sign In & Sync"}
                  </button>
                </form>
              )}

              {firebaseConfigured && (
                <div className="space-y-2 border-t border-border-strong/20 pt-2">
                  <button
                    type="button"
                    className="btn w-full rounded-full bg-surface text-fg text-xs font-extrabold"
                    onClick={() => void cloud(googleSignIn)}
                  >
                    Continue with Google
                  </button>
                  {!sbConfigured && (
                    <>
                      <div className="flex gap-2">
                        <input
                          className="input bg-surface/90 text-fg"
                          type="email"
                          placeholder="Email"
                          aria-label="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                          className="input bg-surface/90 text-fg"
                          type="password"
                          placeholder="Password"
                          aria-label="Password"
                          value={pw}
                          onChange={(e) => setPw(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn w-full rounded-full bg-surface-inverse text-on-inverse"
                        onClick={() => void cloud(() => emailSignIn(email, pw))}
                      >
                        Email sign in
                      </button>
                    </>
                  )}
                </div>
              )}

              {sbConfigured && (
                <p className="text-center text-xs font-semibold text-on-primary/85 mt-1">
                  {authMode === "signup" ? "Already have an account?" : "New to StudyQuest?"}{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode((m) => (m === "signin" ? "signup" : "signin"))}
                    className="font-extrabold underline"
                  >
                    {authMode === "signup" ? "Sign In" : "Sign Up"}
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div className="my-auto flex flex-col gap-3 pt-4">
              <div className="rounded-2xl bg-surface/90 p-4 text-fg space-y-3">
                {step === 0 && (
                  <>
                    <Field label="What should I call you?">
                      <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </Field>
                    <Field label="Avatar seed">
                      <input className="input" value={seed} onChange={(e) => setSeed(e.target.value)} />
                    </Field>
                  </>
                )}
                {step === 1 && (
                  <Field label="Primary goal">
                    <Select
                      value={goal}
                      onChange={setGoal}
                      options={GOALS.map((g) => ({ value: g, label: g }))}
                    />
                  </Field>
                )}
                {step === 2 && (
                  <>
                    <p className="text-xs font-semibold text-muted">
                      Choose your starting egg. It is free and yours to raise.
                    </p>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Starting egg">
                      {SPECIES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={species === s.id}
                          onClick={() => setSpecies(s.id)}
                          className={`tile flex flex-col items-center border-[1.5px] p-2 ${
                            species === s.id ? "border-border-strong bg-primary text-on-primary" : "border-line/40 bg-surface"
                          }`}
                        >
                          <PetSprite species={s.id} stage={0} size={48} />
                          <span className="text-[11px] font-bold">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="btn rounded-full bg-surface/85 text-fg text-xs font-extrabold disabled:opacity-40"
                  disabled={step === 0}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
                {step < 2 ? (
                  <button
                    type="button"
                    className="btn rounded-full bg-surface-inverse text-on-inverse text-xs font-extrabold px-6"
                    onClick={() => setStep(step + 1)}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn rounded-full bg-surface-inverse text-on-inverse text-xs font-extrabold px-6"
                    onClick={() => void finish()}
                  >
                    Start my quest
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="mt-2 text-center text-[11px] font-semibold text-on-primary/75">
            Offline-first · Data syncs automatically when signed in
          </p>
        </section>
      </div>
    </PageFrame>
  );
}
