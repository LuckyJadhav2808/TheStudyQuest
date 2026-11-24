"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Microphone, PaperPlaneTilt, Plus, SpeakerHigh, Trash } from "@phosphor-icons/react";
import { Panels } from "@/components/shell/Panels";
import { Card, CardTitle, Empty, PageFrame } from "@/components/ui/misc";
import { Select } from "@/components/ui/fields";
import { chatRepo } from "@/core/repos";
import type { ChatMessage, ChatThread } from "@/core/types";
import { PERSONAS, getPersona } from "@/content/personas";
import { deleteWithUndo, useRows } from "@/features/shared/hooks";
import { AiError, streamAI } from "@/lib/aiClient";
import { MarkdownView } from "@/lib/MarkdownView";

interface SpeechRec { lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void }
type RecCtor = new () => SpeechRec;

export function ChatPage() {
  const threads = useRows(chatRepo) ?? [];
  const [id, setId] = useState<string | null>(null);
  const [persona, setPersona] = useState("sage");
  const [input, setInput] = useState("");
  const [live, setLive] = useState<string | null>(null);
  const [err, setErr] = useState<AiError | null>(null);
  const [listening, setListening] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const cur = threads.find((t) => t.id === id) ?? null;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [cur?.messages.length, live]);

  async function send(text: string) {
    if (!text.trim() || live !== null) return;
    setErr(null); setInput("");
    let t: ChatThread = cur ?? (await chatRepo.add({ title: text.slice(0, 40), persona, messages: [] }));
    setId(t.id);
    const msgs: ChatMessage[] = [...t.messages, { role: "user", content: text, at: Date.now() }];
    await chatRepo.update(t.id, { messages: msgs });
    setLive("");
    abort.current = new AbortController();
    try {
      const full = await streamAI(msgs.map(({ role, content }) => ({ role, content })), { system: getPersona(t.persona).system, signal: abort.current.signal, onChunk: setLive });
      await chatRepo.update(t.id, { messages: [...msgs, { role: "assistant", content: full, at: Date.now() }] });
    } catch (e) { if (e instanceof AiError) setErr(e); else if (!(e instanceof DOMException)) setErr(new AiError("failed", "Something went wrong.")); }
    setLive(null);
  }
  const voice = () => {
    const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
    const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!R) return setErr(new AiError("failed", "Voice input is not supported in this browser."));
    const r = new R(); r.lang = "en-US";
    r.onresult = (e) => setInput((v) => (v + " " + e.results[0][0].transcript).trim());
    r.onend = () => setListening(false);
    r.start(); setListening(true);
  };
  const speak = (t: string) => { window.speechSynthesis?.cancel(); window.speechSynthesis?.speak(new SpeechSynthesisUtterance(t.replace(/[#*`$]/g, ""))); };
  const list = (
    <Card className="gap-2">
      <CardTitle right={<button className="btn btn-sm btn-icon" aria-label="New chat" onClick={() => { setId(null); setErr(null); }}><Plus size={16} weight="bold" /></button>}>Threads</CardTitle>
      <Select value={persona} onChange={setPersona} options={PERSONAS.map((p) => ({ value: p.id, label: p.name }))} />
      <p className="text-xs text-muted">{getPersona(persona).blurb}</p>
      <div className="scroll-thin min-h-0 flex-1 space-y-1">
        {threads.sort((a, b) => b.updatedAt - a.updatedAt).map((t) => <div key={t.id} className={`flex items-center rounded-full ${t.id === id ? "bg-lime text-ink" : "hover:bg-soft"}`}><button className="min-h-10 flex-1 truncate px-3 text-left text-sm font-bold" onClick={() => { setId(t.id); setPersona(t.persona); }}>{t.title}</button><button className="px-2" aria-label="Delete thread" onClick={() => { if (id === t.id) setId(null); void deleteWithUndo(chatRepo, t.id, "thread"); }}><Trash size={14} /></button></div>)}
      </div>
    </Card>
  );
  const chat = (
    <Card className="gap-2">
      <div className="scroll-thin min-h-0 flex-1 space-y-3" aria-live="polite">
        {!cur && live === null && <Empty title="Ask me anything" hint={`Chatting as ${getPersona(persona).name}. Your threads stay on this device.`} mood="happy" />}
        {[...(cur?.messages ?? []), ...(live !== null ? [{ role: "assistant" as const, content: live || "...", at: 0 }] : [])].map((m, i) => (
          <div key={i} className={`max-w-[92%] rounded-[24px] p-3 ${m.role === "user" ? "ml-auto bg-lime text-ink" : "bg-soft"}`}>
            {m.role === "user" ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <MarkdownView source={m.content} className="!text-sm" />}
            {m.role === "assistant" && m.at > 0 && <button className="mt-1 text-xs text-muted" aria-label="Read aloud" onClick={() => speak(m.content)}><SpeakerHigh size={14} className="mr-1 inline" />Read aloud</button>}
          </div>
        ))}
        {err && (
          <div className="tile border-[1.5px] border-line bg-peach text-ink" role="alert"><p className="font-bold">{err.code === "no-key" ? "Add an API key in Settings" : "Chat hit a snag"}</p><p className="text-sm">{err.message}</p>{err.code === "no-key" && <Link className="btn btn-lime btn-sm mt-2" href="/settings">Open settings</Link>}</div>
        )}
        <div ref={end} />
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <button type="button" className={`btn btn-icon shrink-0 ${listening ? "bg-orange" : ""}`} aria-label="Voice input" onClick={voice}><Microphone size={20} /></button>
        <input className="input" aria-label="Message" placeholder="Type your question" value={input} onChange={(e) => setInput(e.target.value)} />
        {live !== null ? <button type="button" className="btn shrink-0" onClick={() => abort.current?.abort()}>Stop</button> : <button className="btn btn-lime btn-icon shrink-0" type="submit" aria-label="Send"><PaperPlaneTilt size={20} weight="fill" /></button>}
      </form>
    </Card>
  );
  return (
    <PageFrame title="AI Chat" subtitle="Five tutors, streaming answers, math and code rendered properly.">
      <Panels className="lg:grid-cols-12" panels={[{ id: "t", label: "Threads", className: "lg:col-span-3", node: list }, { id: "c", label: "Chat", className: "lg:col-span-9", node: chat }]} />
    </PageFrame>
  );
}
