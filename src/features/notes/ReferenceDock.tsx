"use client";
import { useEffect, useState } from "react";
import { usePinch } from "@use-gesture/react";
import { ArrowSquareOut, FilePdf, Globe, Image as ImageIcon, UploadSimple, X, YoutubeLogo } from "@phosphor-icons/react";

type SourceKind = "youtube" | "pdf" | "image" | "web";

interface RefSource {
  kind: SourceKind;
  url: string;
  label: string;
  isBlob?: boolean;
}

function extractYouTubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

function classifyUrl(raw: string): RefSource | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const yt = extractYouTubeId(withProto);
  if (yt) {
    return {
      kind: "youtube",
      url: `https://www.youtube-nocookie.com/embed/${yt}`,
      label: withProto,
    };
  }
  if (/\.pdf(\?.*)?$/i.test(withProto)) {
    return { kind: "pdf", url: withProto, label: withProto };
  }
  if (/\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(withProto)) {
    return { kind: "image", url: withProto, label: withProto };
  }
  return { kind: "web", url: withProto, label: withProto };
}

export function ReferenceDock() {
  const [input, setInput] = useState("");
  const [source, setSource] = useState<RefSource | null>(null);
  const [zoom, setZoom] = useState(1);

  const bindPinch = usePinch(({ offset: [d] }) => {
    setZoom(Math.min(3, Math.max(0.5, d)));
  });

  useEffect(() => {
    return () => {
      if (source?.isBlob) URL.revokeObjectURL(source.url);
    };
  }, [source]);

  const loadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const next = classifyUrl(input);
    if (!next) return;
    if (source?.isBlob) URL.revokeObjectURL(source.url);
    setSource(next);
  };

  const loadFile = (file: File) => {
    if (source?.isBlob) URL.revokeObjectURL(source.url);
    const blobUrl = URL.createObjectURL(file);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    setSource({
      kind: isPdf ? "pdf" : "image",
      url: blobUrl,
      label: file.name,
      isBlob: true,
    });
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-2 p-2.5"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const file = e.dataTransfer.files?.[0];
        if (file && (file.type.startsWith("image/") || file.type === "application/pdf" || /\.pdf$/i.test(file.name))) {
          e.preventDefault();
          loadFile(file);
        }
      }}
    >
      <form onSubmit={loadUrl} className="flex items-center gap-1.5 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste YouTube, PDF, image, or web URL..."
          aria-label="Reference URL"
          className="input !min-h-8 flex-1 !px-3 text-xs"
        />
        <button type="submit" className="btn btn-lime btn-sm !min-h-8 !px-3 text-xs shrink-0">
          Open
        </button>
        <label
          title="Upload PDF or Image"
          aria-label="Upload PDF or Image"
          className="btn btn-sm !min-h-8 !px-2.5 text-xs cursor-pointer shrink-0 inline-flex items-center gap-1"
        >
          <UploadSimple size={14} weight="bold" />
          <span className="hidden xl:inline">File</span>
          <input
            type="file"
            hidden
            accept="application/pdf,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </form>

      {source ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line/40 bg-surface">
          <div className="flex items-center justify-between gap-2 border-b border-line/30 bg-surface-2 px-3 py-1.5 text-[11px] shrink-0">
            <span className="inline-flex items-center gap-1.5 font-bold text-fg min-w-0 truncate">
              {source.kind === "youtube" && <YoutubeLogo size={14} weight="fill" className="text-coral shrink-0" />}
              {source.kind === "pdf" && <FilePdf size={14} weight="fill" className="text-orange shrink-0" />}
              {source.kind === "image" && <ImageIcon size={14} weight="duotone" className="text-violet shrink-0" />}
              {source.kind === "web" && <Globe size={14} weight="duotone" className="text-muted shrink-0" />}
              <span className="truncate">{source.label}</span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {!source.isBlob && (
                <a
                  href={source.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip !min-h-5 !px-2 text-[10px] font-bold hover:bg-soft inline-flex items-center gap-1"
                >
                  Open <ArrowSquareOut size={10} />
                </a>
              )}
              <button
                type="button"
                aria-label="Clear reference"
                onClick={() => {
                  if (source.isBlob) URL.revokeObjectURL(source.url);
                  setSource(null);
                }}
                className="grid size-5 place-items-center rounded-full text-muted hover:bg-soft hover:text-fg"
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-canvas/50">
            {source.kind === "image" ? (
              <div
                {...bindPinch()}
                style={{ touchAction: "none" }}
                onDoubleClick={() => setZoom((z) => (z === 1 ? 1.75 : 1))}
                className="flex min-h-full items-center justify-center p-3 cursor-zoom-in"
                title="Pinch or double-click to zoom"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={source.url}
                  alt={source.label}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                  className="max-h-full max-w-full rounded-xl object-contain transition-transform duration-150"
                />
              </div>
            ) : (
              <iframe
                src={source.url}
                title={source.label}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed border-border-strong/30 bg-surface-2/40 p-6 text-center">
          <div className="flex items-center gap-2 text-muted">
            <YoutubeLogo size={22} weight="duotone" />
            <FilePdf size={22} weight="duotone" />
            <ImageIcon size={22} weight="duotone" />
            <Globe size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-fg">Study side-by-side</p>
            <p className="mt-1 text-[11px] text-muted max-w-xs">
              Paste a YouTube lecture, PDF link, image URL, or webpage above — or drop a local PDF / image file here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
