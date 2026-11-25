"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface YtTrack {
  id: string;
  title: string;
  artist: string;
  duration?: string;
  thumbnail?: string;
  videoId?: string;
  playlistId?: string;
}

export function ytThumb(track?: Pick<YtTrack, "thumbnail" | "videoId"> | null): string | null {
  if (!track) return null;
  if (track.thumbnail) return track.thumbnail;
  return track.videoId ? `https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg` : null;
}

export function parseYtUrl(raw: string): { videoId?: string; playlistId?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return { videoId: trimmed };
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");
    if (!host.includes("youtube.com") && !host.includes("youtu.be")) return null;
    const list = url.searchParams.get("list") ?? undefined;
    let videoId = url.searchParams.get("v") ?? undefined;
    if (!videoId && host === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0] || undefined;
    }
    if (!videoId && url.pathname.startsWith("/live/")) {
      videoId = url.pathname.split("/live/")[1]?.split("/")[0] || undefined;
    }
    if (!videoId && !list) return null;
    return { videoId, playlistId: list };
  } catch {
    return null;
  }
}

interface YtMusicState {
  tracks: YtTrack[];
  activeId: string | null;
  playing: boolean;
  volume: number;
  playTrack: (track: YtTrack) => void;
  play: (id?: string) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  addFromUrl: (url: string, title?: string) => YtTrack | null;
  removeTrack: (id: string) => void;
  setPlaying: (playing: boolean) => void;
}

export const useYtMusic = create<YtMusicState>()(
  persist(
    (set, get) => ({
      tracks: [],
      activeId: null,
      playing: false,
      volume: 0.65,
      playTrack: (track) =>
        set((s) => {
          const exists = s.tracks.some((t) => t.id === track.id);
          const tracks = exists ? s.tracks : [track, ...s.tracks].slice(0, 30);
          return { tracks, activeId: track.id, playing: true };
        }),
      play: (id) =>
        set((s) => {
          const targetId = id ?? s.activeId ?? s.tracks[0]?.id ?? null;
          if (!targetId) return s;
          return { activeId: targetId, playing: true };
        }),
      pause: () => set({ playing: false }),
      toggle: () =>
        set((s) => {
          if (!s.activeId && s.tracks.length === 0) return s;
          return { activeId: s.activeId ?? s.tracks[0]?.id ?? null, playing: !s.playing };
        }),
      next: () => {
        const s = get();
        if (s.tracks.length === 0) return;
        const idx = s.tracks.findIndex((t) => t.id === s.activeId);
        const nextTrack = s.tracks[(idx + 1) % s.tracks.length];
        if (nextTrack) set({ activeId: nextTrack.id, playing: true });
      },
      prev: () => {
        const s = get();
        if (s.tracks.length === 0) return;
        const idx = s.tracks.findIndex((t) => t.id === s.activeId);
        const prevTrack = s.tracks[(idx - 1 + s.tracks.length) % s.tracks.length];
        if (prevTrack) set({ activeId: prevTrack.id, playing: true });
      },
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      addFromUrl: (rawUrl, title) => {
        const parsed = parseYtUrl(rawUrl);
        if (!parsed) return null;
        const id = parsed.videoId ? `yt-${parsed.videoId}` : `yt-pl-${parsed.playlistId}`;
        const track: YtTrack = {
          id,
          title: title?.trim() || (parsed.playlistId ? "YouTube Playlist" : "YouTube Track"),
          artist: "Added via URL",
          ...parsed,
        };
        get().playTrack(track);
        return track;
      },
      removeTrack: (id) =>
        set((s) => {
          const tracks = s.tracks.filter((t) => t.id !== id);
          const activeId = s.activeId === id ? tracks[0]?.id ?? null : s.activeId;
          return { tracks, activeId, playing: s.activeId === id ? false : s.playing };
        }),
      setPlaying: (playing) => set({ playing }),
    }),
    {
      name: "sq-yt-music-v2",
      partialize: (s) => ({
        tracks: s.tracks,
        activeId: s.activeId,
        volume: s.volume,
      }),
    }
  )
);
