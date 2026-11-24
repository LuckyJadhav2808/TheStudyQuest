"use client";
import * as React from "react";
import { UploadSimple, File, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface DropzoneProps {
  accept?: string;
  multiple?: boolean;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function DashedDropzone({
  accept = ".pdf",
  multiple = false,
  files = [],
  onFilesChange,
  title = "Drop PDF here or click to browse",
  subtitle = "Files stay local in your browser",
  className,
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      const next = multiple ? [...files, ...dropped] : [dropped[0]];
      onFilesChange?.(next);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      const next = multiple ? [...files, ...selected] : [selected[0]];
      onFilesChange?.(next);
    }
  };

  const removeFile = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = files.filter((_, i) => i !== idx);
    onFilesChange?.(next);
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "group relative flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-ink/40 bg-soft/40 p-4 text-center transition-all hover:border-ink hover:bg-lime/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime",
          isDragging && "border-ink bg-lime/20 scale-[0.99]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
          aria-hidden="true"
        />
        <div className="grid size-9 place-items-center rounded-full bg-surface border border-line text-ink transition-transform group-hover:scale-110">
          <UploadSimple size={20} weight="bold" />
        </div>
        <div>
          <p className="text-xs font-bold text-fg">{title}</p>
          <p className="text-[11px] text-muted">{subtitle}</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scroll-thin">
          {files.map((file, i) => (
            <span
              key={`${file.name}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg shadow-sm"
            >
              <File size={14} weight="duotone" className="text-muted" />
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={(e) => removeFile(i, e)}
                aria-label={`Remove ${file.name}`}
                className="rounded-full p-0.5 text-muted hover:bg-soft hover:text-fg"
              >
                <X size={12} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
