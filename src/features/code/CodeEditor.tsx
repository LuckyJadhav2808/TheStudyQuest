"use client";
import { cpp } from "@codemirror/lang-cpp";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { oneDark } from "@codemirror/theme-one-dark";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { nord } from "@uiw/codemirror-theme-nord";
import CodeMirror from "@uiw/react-codemirror";
import type { Extension } from "@codemirror/state";

export type CmTheme = "one-dark" | "nord" | "dracula";
const LANGS: Record<string, () => Extension> = {
  javascript: () => javascript(), typescript: () => javascript({ typescript: true }), python: () => python(), html: () => html(), css: () => css(), cpp: () => cpp(), java: () => java(), rust: () => rust(),
};
const THEMES = { "one-dark": oneDark, nord, dracula };
export default function CodeEditor({ value, onChange, language, theme = "one-dark", height = "100%" }: { value: string; onChange: (v: string) => void; language: string; theme?: CmTheme; height?: string }) {
  const lang = LANGS[language];
  return <CodeMirror value={value} height={height} theme={THEMES[theme]} extensions={lang ? [lang()] : []} onChange={onChange} basicSetup={{ lineNumbers: true, foldGutter: false }} style={{ fontSize: 13, height }} className="h-full overflow-hidden rounded-[20px] text-left" aria-label="Code editor" />;
}
