"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { ArrowsOut, BookmarkSimple, MagnifyingGlass, Pause, Play, ArrowCounterClockwise, ShieldCheck, ShieldWarning, X, CloudRain, Fire, Coffee, Waves, Tree, Wind, Broadcast, MusicNotes, SkipBack, SkipForward, Trash } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { BentoCard } from "@/components/shell/BentoCard";
import { HeroCard } from "@/components/ui/design-primitives";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageFrame, ProgressBar, Segmented } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { db } from "@/core/db";
import { useSettings } from "@/core/settings";
import { StrobiFace, type StrobiPose } from "@/features/strobi/StrobiFace";
import { strobiSay } from "@/features/strobi/toast";
import { Illustration } from "@/components/illustrations/Illustration";
import { fmtClock, todayKey } from "@/lib/utils";
import { CHANNELS, useAmbient } from "@/lib/ambient";
import { parseYtUrl, useYtMusic, ytThumb, type YtTrack } from "@/lib/ytMusic";
import { RadialTimer } from "./RadialTimer";
import { useTimer } from "./useTimer";
import type { TimerKind } from "./store";

const PRESETS: Record<TimerKind, number[]> = { focus: [25, 50], short: [5, 10], long: [15, 30] };
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  rain: <CloudRain size={15} weight="duotone" />,
  fire: <Fire size={15} weight="duotone" />,
  cafe: <Coffee size={15} weight="duotone" />,
  white: <Broadcast size={15} weight="duotone" />,
  ocean: <Waves size={15} weight="duotone" />,
  forest: <Tree size={15} weight="duotone" />,
  wind: <Wind size={15} weight="duotone" />,
};

function SoundscapeCard() {
  const [mode, setMode] = useState<"yt" | "ambient">("yt");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<YtTrack[] | null>(null);
  const [ytView, setYtView] = useState<"recent" | "saved">("recent");
  const [savingPl, setSavingPl] = useState(false);
  const [plName, setPlName] = useState("");
  const yt = useYtMusic();
  const { vols, set, stopAll } = useAmbient();

  const current = yt.tracks.find((t) => t.id === yt.activeId) ?? yt.tracks[0];
  const displayList = results ?? yt.tracks;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const parsed = parseYtUrl(q);
    if (parsed) {
      const added = yt.addFromUrl(q);
      if (added) {
        setQuery("");
        setResults(null);
        strobiSay(`Loading "${added.title}"…`);
        const params = new URLSearchParams();
        if (parsed.playlistId && !parsed.playlistId.startsWith("RD")) {
          params.set("listId", parsed.playlistId);
        } else if (parsed.videoId) {
          params.set("videoId", parsed.videoId);
        }
        if (params.toString()) {
          void fetch(`/api/music/search?${params.toString()}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { playlistTitle?: string; results?: YtTrack[] } | null) => {
              const list = data?.results ?? [];
              if (list.length === 0) return;
              if (parsed.playlistId && !parsed.playlistId.startsWith("RD")) {
                const targetId = parsed.videoId ? `yt-${parsed.videoId}` : list[0].id;
                yt.importTracks(list, targetId);
                if (!parsed.videoId) yt.removeTrack(`yt-pl-${parsed.playlistId}`);
                const title = data?.playlistTitle || "YouTube Playlist";
                yt.savePlaylist(title, list);
                strobiSay(`Saved ${title} (${list.length} tracks)`);
              } else if (list[0]) {
                yt.updateTrack(added.id, {
                  title: list[0].title,
                  artist: list[0].artist,
                  duration: list[0].duration,
                  thumbnail: list[0].thumbnail,
                });
                strobiSay(`Playing "${list[0].title}"`);
              }
            })
            .catch(() => undefined);
        }
      }
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results?: YtTrack[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      strobiSay(err instanceof Error ? err.message : "Could not search YouTube", "error");
    }
    setSearching(false);
  };

  return (
    <BentoCard
      title="Soundscape"
      subtitle={mode === "yt" ? "Search any song on YouTube Music." : "Synthesised loops, offline."}
      action={
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "yt", label: "YT Music" },
            { value: "ambient", label: "Ambient" },
          ]}
        />
      }
      className="h-full surface-inverse"
    >
      {mode === "yt" ? (
        <div className="flex h-full min-h-0 flex-col gap-2.5 pt-1">
          {/* Now Playing Bar */}
          <div className="flex items-center justify-between gap-2.5 rounded-[20px] border border-line/20 bg-soft/70 px-3.5 py-2.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {ytThumb(current) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ytThumb(current)!}
                  alt={current?.title ?? "Song cover"}
                  className="size-10 shrink-0 rounded-xl border border-line/30 object-cover"
                />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-ink">
                  <MusicNotes size={18} weight="duotone" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-fg">{current ? current.title : "No song selected"}</p>
                <p className="truncate text-[10px] text-muted">{current ? current.artist : "Search any song below to play"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" disabled={!current} className="btn btn-icon size-8 bg-surface/10 text-fg hover:bg-surface/20 disabled:opacity-40" aria-label="Previous track" onClick={yt.prev}>
                <SkipBack size={14} weight="fill" />
              </button>
              <button type="button" disabled={!current} className="btn btn-lime btn-icon size-9 disabled:opacity-40" aria-label={yt.playing ? "Pause music" : "Play music"} onClick={yt.toggle}>
                {yt.playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
              </button>
              <button type="button" disabled={!current} className="btn btn-icon size-8 bg-surface/10 text-fg hover:bg-surface/20 disabled:opacity-40" aria-label="Next track" onClick={yt.next}>
                <SkipForward size={14} weight="fill" />
              </button>
            </div>
          </div>

          {/* Search Any Song or Paste URL */}
          <form onSubmit={(e) => void handleSearch(e)} className="flex items-center gap-1.5 shrink-0">
            <input
              className="input !min-h-8 flex-1 text-xs"
              placeholder="Search any song or paste YT URL..."
              aria-label="Search YouTube songs"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) setResults(null);
              }}
            />
            <button type="submit" disabled={searching} className="btn btn-lime btn-sm !min-h-8 gap-1 shrink-0">
              <MagnifyingGlass size={13} weight="bold" />
              {searching ? "..." : "Search"}
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 shrink-0 px-0.5">
            {results ? (
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                Results ({results.length})
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setYtView("recent")}
                  className={`text-[10px] font-extrabold uppercase tracking-wider transition ${
                    ytView === "recent" ? "text-fg underline underline-offset-4" : "text-muted hover:text-fg"
                  }`}
                >
                  Recent ({yt.tracks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setYtView("saved")}
                  className={`text-[10px] font-extrabold uppercase tracking-wider transition ${
                    ytView === "saved" ? "text-fg underline underline-offset-4" : "text-muted hover:text-fg"
                  }`}
                >
                  Saved ({yt.savedPlaylists.length})
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {results ? (
                <button type="button" onClick={() => { setResults(null); setQuery(""); }} className="text-[10px] font-bold text-primary-text hover:underline">
                  Show recent
                </button>
              ) : yt.tracks.length > 0 && ytView === "recent" ? (
                <button
                  type="button"
                  onClick={() => setSavingPl((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-text hover:underline"
                  title="Save current queue as a playlist"
                >
                  <BookmarkSimple size={12} weight="bold" />
                  Save
                </button>
              ) : null}
              <div className="w-24">
                <Slider
                  aria-label="YT Music volume"
                  min={0}
                  max={1}
                  step={0.05}
                  value={yt.volume}
                  onChange={(e) => yt.setVolume(+e.target.value)}
                />
              </div>
            </div>
          </div>

          {savingPl && !results && ytView === "recent" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const saved = yt.savePlaylist(plName);
                if (saved) {
                  strobiSay(`Saved playlist "${saved.name}"`);
                  setPlName("");
                  setSavingPl(false);
                  setYtView("saved");
                }
              }}
              className="flex items-center gap-1.5 shrink-0"
            >
              <input
                autoFocus
                className="input !min-h-7 flex-1 text-xs"
                placeholder="Playlist name (e.g. Focus Lo-Fi)..."
                aria-label="Playlist name"
                value={plName}
                onChange={(e) => setPlName(e.target.value)}
              />
              <button type="submit" className="btn btn-lime btn-sm !min-h-7 px-2.5 text-[11px]">
                Save
              </button>
              <button type="button" onClick={() => setSavingPl(false)} className="p-1 text-muted hover:text-fg" aria-label="Cancel">
                <X size={13} />
              </button>
            </form>
          )}

          <ScrollArea className="min-h-0 flex-1 pr-1">
            {!results && ytView === "saved" ? (
              yt.savedPlaylists.length === 0 ? (
                <div className="grid h-full min-h-28 place-items-center rounded-2xl border border-dashed border-line/25 p-4 text-center">
                  <p className="text-xs font-semibold text-muted">
                    No saved playlists yet. Play songs or paste a YouTube playlist URL, then click Save.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 pb-1">
                  {yt.savedPlaylists.map((pl) => (
                    <div key={pl.id} className="flex items-center gap-2 rounded-xl border border-line/15 bg-soft/40 px-2.5 py-1.5 hover:border-line/40 transition">
                      <button
                        type="button"
                        onClick={() => {
                          yt.playSavedPlaylist(pl.id);
                          setYtView("recent");
                          strobiSay(`Playing "${pl.name}"`);
                        }}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime text-ink">
                            <Play size={14} weight="fill" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{pl.name}</p>
                            <p className="truncate text-[10px] text-muted">{pl.tracks.length} {pl.tracks.length === 1 ? "item" : "tracks"}</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-surface/15 px-2 py-0.5 text-[9px] font-extrabold">
                          Load
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete playlist ${pl.name}`}
                        onClick={() => yt.removeSavedPlaylist(pl.id)}
                        className="p-1 text-muted hover:text-fg"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : displayList.length === 0 ? (
              <div className="grid h-full min-h-28 place-items-center rounded-2xl border border-dashed border-line/25 p-4 text-center">
                <p className="text-xs font-semibold text-muted">
                  {results ? "No songs matched that search." : "Search for any artist, song, or album above."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 pb-1">
                {displayList.map((tr) => {
                  const active = current?.id === tr.id;
                  return (
                    <div
                      key={tr.id}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition ${
                        active ? "border-lime bg-lime/15 text-fg" : "border-line/15 bg-soft/40 hover:border-line/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => (active ? yt.toggle() : yt.playTrack(tr))}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {ytThumb(tr) && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={ytThumb(tr)!}
                              alt=""
                              loading="lazy"
                              className="size-8 shrink-0 rounded-lg border border-line/20 object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{tr.title}</p>
                            <p className="truncate text-[10px] text-muted">{tr.artist}</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-surface/15 px-2 py-0.5 text-[9px] font-extrabold num">
                          {active && yt.playing ? "Playing" : tr.duration || "Play"}
                        </span>
                      </button>
                      {!results && (
                        <button
                          type="button"
                          aria-label={`Remove ${tr.title}`}
                          onClick={() => yt.removeTrack(tr.id)}
                          className="p-1 text-muted hover:text-fg"
                        >
                          <Trash size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-3">
          <ScrollArea className="flex-1 min-h-0 pr-1">
            <div className="flex flex-col gap-3 pb-2">
              {CHANNELS.map((c) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  <span className="text-muted shrink-0">{CHANNEL_ICONS[c.id] ?? <Waves size={15} />}</span>
                  <span className="w-20 shrink-0 text-xs font-bold truncate">{c.label}</span>
                  <Slider
                    aria-label={`${c.label} volume`}
                    min={0}
                    max={1}
                    step={0.05}
                    value={vols[c.id]}
                    onChange={(e) => set(c.id, +e.target.value)}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
          <button className="btn btn-sm w-full shrink-0" onClick={stopAll}>
            Silence all
          </button>
        </div>
      )}
    </BentoCard>
  );
}

export function TimerPage() {
  const t = useTimer();
  const s = useSettings();
  const logs = useLiveQuery(() => db.studyLogs.toArray(), [], []);
  const [zen, setZen] = useState(false);
  const [custom, setCustom] = useState("");
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const today = todayKey();
  const cutoff = (() => {
    const d = new Date();
    d.setDate(d.getDate() - (period === "week" ? 6 : period === "month" ? 29 : 0));
    return todayKey(d);
  })();
  const inPeriod = (dateStr: string) => (period === "day" ? dateStr === today : dateStr >= cutoff && dateStr <= today);

  const periodLogs = logs.filter((l) => !l.deletedAt && inPeriod(l.date));
  const periodMinutes = periodLogs.reduce((a, l) => a + l.minutes, 0);
  const periodBlocks = periodLogs.length;
  const periodAbandoned = (t.abandonedLogs ?? []).filter((a) => inPeriod(a.date)).length;
  const periodGoal = s.focusGoalMin * (period === "week" ? 7 : period === "month" ? 30 : 1);
  const goalPct = periodGoal > 0 ? periodMinutes / periodGoal : 0;
  const periodLabel = period === "day" ? "Today's harvest" : period === "week" ? "7-day harvest" : "30-day harvest";

  const companionMood: StrobiPose =
    t.shield < 60 && t.running
      ? "worried"
      : t.running && t.kind === "focus"
      ? "headphones"
      : t.kind !== "focus"
      ? "happy"
      : "idle";
  const companionLine =
    t.shield < 60 && t.running
      ? "Shield cracked — stay on tab!"
      : t.running && t.kind === "focus"
      ? "Don't interrupt me!"
      : t.kind !== "focus"
      ? "Break time. Stretch & hydrate."
      : "Ready when you are.";

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName)) {
        e.preventDefault();
        if (t.running) t.pause();
        else t.start();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const zenEnteredFs = useRef(false);
  const enterZen = () => {
    setZen(true);
    if (!document.fullscreenElement) {
      zenEnteredFs.current = true;
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else {
      zenEnteredFs.current = false;
    }
  };
  const exitZen = () => {
    setZen(false);
    if (zenEnteredFs.current && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    zenEnteredFs.current = false;
  };
  const label = t.kind === "focus" ? "Focus" : t.kind === "short" ? "Short break" : "Long break";

  const main = (
    <HeroCard
      tint="focus"
      hardShadow
      title="Focus Timer"
      decorations={<Illustration name="horizon" tone="focus" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full opacity-50" />}
      action={
        <Segmented<TimerKind>
          value={t.kind}
          onChange={t.setKind}
          options={[
            { value: "focus", label: "Focus" },
            { value: "short", label: "Short" },
            { value: "long", label: "Long" },
          ]}
        />
      }
      className="h-full"
    >
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-between gap-2 py-1">
        {/* Live Companion Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-border-strong/30 bg-surface/85 px-3 py-1 shadow-2xs shrink-0">
          <StrobiFace mood={companionMood} size={24} />
          <span className="text-xs font-extrabold tracking-tight text-fg">{companionLine}</span>
        </div>

        <div
          style={{ containerType: "size" }}
          className="flex min-h-36 flex-1 w-full items-center justify-center overflow-hidden"
        >
          <RadialTimer pct={t.pct} rem={t.rem} label={label} running={t.running} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className="btn btn-lime min-w-32 py-2 font-bold shadow-xs hover:scale-105 active:scale-95 transition"
            onClick={t.running ? t.pause : t.start}
          >
            {t.running ? <><Pause weight="fill" size={18} /> Pause</> : <><Play weight="fill" size={18} /> Start</>}
          </button>
          <button className="btn btn-icon size-10 bg-surface" aria-label="Reset timer" onClick={t.reset}>
            <ArrowCounterClockwise size={18} weight="bold" />
          </button>
          <button className="btn btn-icon size-10 bg-surface" aria-label="Zen mode" onClick={enterZen}>
            <ArrowsOut size={18} weight="bold" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 shrink-0">
          {PRESETS[t.kind].map((m) => (
            <button
              key={m}
              className={`chip text-xs ${t.mins[t.kind] === m ? "bg-ink text-paper font-bold" : ""}`}
              onClick={() => t.setMins(t.kind, m)}
            >
              {m} min
            </button>
          ))}
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.min(240, Math.max(1, Number(custom)));
              if (n) t.setMins(t.kind, n);
              setCustom("");
            }}
          >
            <input
              suppressHydrationWarning
              className="input !min-h-8 w-20 !px-3 text-xs rounded-full border border-line bg-surface"
              inputMode="numeric"
              placeholder="Custom"
              aria-label="Custom minutes"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </form>
        </div>

        {/* Harvest Tally: Day / Week / Month switcher + Completed vs Abandoned */}
        <div className="flex w-full max-w-md flex-col gap-2 rounded-2xl border border-border-strong/20 bg-surface/85 px-3.5 py-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{periodLabel}</span>
            <Segmented
              size="xs"
              ariaLabel="History period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-[11px] font-extrabold mb-1">
                <span className="num text-fg">{periodMinutes}m / {periodGoal}m</span>
                <span className="num text-muted">
                  {periodBlocks} done
                  {periodAbandoned > 0 && (
                    <span className="ml-1.5 rounded-full bg-[var(--danger-tint)] px-1.5 py-px text-[10px] font-extrabold text-[var(--danger-text)]">
                      {periodAbandoned} abandoned
                    </span>
                  )}
                  {periodAbandoned === 0 && " · 0 abandoned"}
                </span>
              </div>
              <ProgressBar pct={goalPct} variant="hatched" color="var(--domain-stats-fill)" className="!h-2.5" />
            </div>
            <div className="flex items-center gap-1 shrink-0" aria-label={`${periodBlocks} focus blocks completed`}>
              {periodBlocks === 0 ? (
                <span className="opacity-30" title="Complete a block to earn your first orb">
                  <StrobiFace mood="idle" size={20} />
                </span>
              ) : (
                Array.from({ length: Math.min(5, periodBlocks) }, (_, idx) => (
                  <StrobiFace key={idx} mood="happy" size={20} />
                ))
              )}
              {periodBlocks > 5 && <span className="num text-[11px] font-extrabold text-muted">+{periodBlocks - 5}</span>}
            </div>
          </div>
        </div>
      </div>
    </HeroCard>
  );

  const shieldDanger = t.shield < 60;
  const shieldWarn = t.shield >= 60 && t.shield < 95;
  const rightCol = (
    <div style={{ gap: "var(--gutter, 16px)" }} className="flex h-full min-h-0 flex-col">
      {/* State-reactive Focus Defense Strip with Forgiving Recovery */}
      <BentoCard
        autoHeight
        className={`shrink-0 transition-colors ${
          shieldDanger
            ? "bg-[var(--danger-tint)] !border-[var(--danger)]"
            : shieldWarn
            ? "bg-[var(--warning-tint)]"
            : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {shieldDanger ? (
              <ShieldWarning size={20} weight="duotone" className="text-[var(--danger-text)] shrink-0" />
            ) : (
              <ShieldCheck size={20} weight="duotone" className="text-[var(--domain-stats-fill)] shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-extrabold leading-tight truncate">
                {shieldDanger ? "Focus shield cracked" : "Focus defense"}
              </p>
              <p className="text-[11px] text-muted truncate">
                {t.shield < 100 ? "Tab switched during focus" : "Leave tab and shield cracks"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {t.shield < 100 && (
              <button
                className="btn btn-sm !min-h-7 !px-2.5 text-[11px]"
                onClick={() => t.set({ shield: 100 })}
              >
                Repair
              </button>
            )}
            <div className="w-20 hidden sm:block">
              <ProgressBar
                pct={t.shield / 100}
                color={shieldDanger ? "var(--danger)" : shieldWarn ? "var(--warning)" : "var(--domain-stats-fill)"}
              />
            </div>
            <span className="font-display num text-lg font-black">{Math.round(t.shield)}%</span>
          </div>
        </div>
      </BentoCard>

      <div className="flex-1 min-h-0">
        <SoundscapeCard />
      </div>
    </div>
  );

  return (
    <PageFrame title="Focus" subtitle="Timers that survive reloads, with sound to match.">
      <Panels
        className="lg:grid-cols-12 lg:grid-rows-1 sm:grid-cols-2"
        panels={[
          { id: "timer", label: "Timer", className: "lg:col-span-7 sm:col-span-1", node: main },
          { id: "sound", label: "Soundscape", className: "lg:col-span-5 sm:col-span-1", node: rightCol },
        ]}
      />
      {zen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-surface-inverse text-on-inverse" role="dialog" aria-label="Zen mode">
          <button className="btn btn-icon absolute right-6 top-6 border-line text-on-inverse" aria-label="Exit zen mode" onClick={exitZen}>
            <X size={22} weight="bold" />
          </button>
          <div className="flex flex-col items-center gap-5">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-soft px-4 py-1.5">
              <StrobiFace mood={companionMood} size={32} />
              <span className="text-sm font-extrabold">{companionLine}</span>
            </div>
            <div className="font-display num text-[22vw] leading-none sm:text-[16vw]">
              {fmtClock(t.rem)}
            </div>
            <button className="btn btn-lime min-w-40 py-3 text-lg font-bold" onClick={t.running ? t.pause : t.start}>
              {t.running ? "Pause" : "Start"}
            </button>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
