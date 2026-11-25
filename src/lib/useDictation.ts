"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeBlobWithWhisper } from "./localWhisper";

interface SpeechRecResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecEvent {
  resultIndex: number;
  results: ArrayLike<SpeechRecResult>;
}
interface SpeechRec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useDictation(onText: (text: string) => void, onUnsupported?: () => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const mediaRef = useRef<{ recorder: MediaRecorder; stream: MediaStream } | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const stop = useCallback(() => {
    if (recRef.current) {
      recRef.current.stop();
      recRef.current = null;
    }
    if (mediaRef.current) {
      mediaRef.current.recorder.stop();
      mediaRef.current = null;
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRec;
      webkitSpeechRecognition?: new () => SpeechRec;
    };
    const Rec = navigator.onLine ? win.SpeechRecognition || win.webkitSpeechRecognition : undefined;
    if (Rec) {
      const rec = new Rec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onresult = (e) => {
        let chunk = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) chunk += e.results[i][0].transcript + " ";
        }
        if (chunk.trim()) onTextRef.current(chunk);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
      recRef.current = rec;
      setListening(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onUnsupported?.();
      return;
    }

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const chunks: BlobPart[] = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          void transcribeBlobWithWhisper(blob)
            .then((text) => {
              if (text.trim()) onTextRef.current(text.trim() + " ");
            })
            .catch(() => onUnsupported?.());
        };
        recorder.start();
        mediaRef.current = { recorder, stream };
        setListening(true);
      })
      .catch(() => onUnsupported?.());
  }, [listening, onUnsupported, stop]);

  useEffect(() => stop, [stop]);
  return { listening, toggle };
}
