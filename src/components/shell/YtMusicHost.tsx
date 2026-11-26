"use client";
import { useEffect, useRef } from "react";
import { useSettings } from "@/core/settings";
import { strobiSay } from "@/features/strobi/toast";
import { audioPrefs } from "@/lib/audio";
import { useYtMusic } from "@/lib/ytMusic";

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (videoId: string) => void;
  loadPlaylist: (opts: { list: string; listType: "playlist" }) => void;
  setVolume: (vol: number) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: { data: number }) => void;
            onError?: () => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Persistent hidden YouTube IFrame audio host mounted once in AppShell. */
export function YtMusicHost() {
  const { tracks, activeId, playing, volume, setPlaying } = useYtMusic();
  const s = useSettings();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const loadedKeyRef = useRef("");

  const track = tracks.find((t) => t.id === activeId) ?? tracks[0];
  const trackKey = track ? (track.playlistId ? `pl:${track.playlistId}` : `v:${track.videoId ?? ""}`) : "";

  useEffect(() => {
    if (!track || (!playing && !playerRef.current)) return;

    const mountPlayer = () => {
      if (!hostRef.current || playerRef.current || !window.YT?.Player) return;
      const target = document.createElement("div");
      hostRef.current.appendChild(target);
      loadedKeyRef.current = trackKey;
      playerRef.current = new window.YT.Player(target, {
        height: "1",
        width: "1",
        videoId: track.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          ...(track.playlistId ? { listType: "playlist", list: track.playlistId } : {}),
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            const effVol = audioPrefs.muted ? 0 : Math.round(volume * audioPrefs.master * audioPrefs.music * 100);
            playerRef.current?.setVolume(effVol);
            if (useYtMusic.getState().playing) playerRef.current?.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === 1) setPlaying(true);
            else if (e.data === 2) setPlaying(false);
            else if (e.data === 0) {
              const state = useYtMusic.getState();
              if (state.tracks.length > 1) state.next();
              else setPlaying(false);
            }
          },
          onError: () => {
            const state = useYtMusic.getState();
            if (state.tracks.length > 1) {
              strobiSay("Track unavailable to embed — skipping", "error");
              state.next();
            } else {
              strobiSay("This YouTube video cannot be embedded", "error");
              state.pause();
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      mountPlayer();
      return;
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      mountPlayer();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    }
  }, [playing, track, trackKey, volume, setPlaying]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current || !track) return;
    if (loadedKeyRef.current !== trackKey) {
      loadedKeyRef.current = trackKey;
      if (track.playlistId) p.loadPlaylist({ list: track.playlistId, listType: "playlist" });
      else if (track.videoId) p.loadVideoById(track.videoId);
    }
    if (playing) p.playVideo();
    else p.pauseVideo();
  }, [playing, track, trackKey]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    const effVol = s.muted ? 0 : Math.round(volume * s.masterVolume * s.musicVolume * 100);
    p.setVolume(effVol);
  }, [volume, s.muted, s.masterVolume, s.musicVolume]);

  return <div ref={hostRef} aria-hidden className="pointer-events-none fixed -left-[9999px] -top-[9999px] size-px overflow-hidden opacity-0" />;
}
