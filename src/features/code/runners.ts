export const EXT_LANG: Record<string, string> = { js: "javascript", mjs: "javascript", ts: "typescript", py: "python", html: "html", css: "css", cpp: "cpp", cc: "cpp", java: "java", rs: "rust", json: "javascript", md: "javascript", txt: "javascript" };
export const langOf = (name: string): string => EXT_LANG[name.split(".").pop()?.toLowerCase() ?? ""] ?? "javascript";
export const RUNNABLE_NOTE: Record<string, string> = { cpp: "C++ needs a compiler runner. This editor is edit-only for now.", java: "Java needs a runner (JDK). Editor-only for now.", rust: "Rust needs a runner (cargo). Editor-only for now." };

const CAPTURE = `<script>(function(){var send=function(l,a){try{parent.postMessage({__sq:1,level:l,text:Array.prototype.map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}};['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){send(k,arguments);o.apply(console,arguments)}});window.addEventListener('error',function(e){send('error',[e.message])});window.addEventListener('unhandledrejection',function(e){send('error',[String(e.reason)])});})();<\/script>`;

export async function toJs(code: string, name: string): Promise<string> {
  if (!name.endsWith(".ts")) return code;
  const { transform } = await import("sucrase");
  return transform(code, { transforms: ["typescript"] }).code;
}
export function jsDoc(js: string): string {
  return `<!doctype html><html><body>${CAPTURE}<script>try{${js.replace(/<\/script>/gi, "<\\/script>")}\n}catch(e){console.error(e&&e.stack||String(e))}<\/script></body></html>`;
}
export function webDoc(files: { name: string; content: string }[]): string {
  const html = files.find((f) => f.name.endsWith(".html"))?.content ?? "<body></body>";
  const css = files.filter((f) => f.name.endsWith(".css")).map((f) => `<style>${f.content}</style>`).join("");
  const js = files.filter((f) => /\.(js|mjs)$/.test(f.name)).map((f) => `<script>try{${f.content.replace(/<\/script>/gi, "<\\/script>")}\n}catch(e){console.error(e&&e.stack||String(e))}<\/script>`).join("");
  return CAPTURE + css + html + js;
}
export function syntaxCheck(name: string, code: string): string | null {
  try {
    if (name.endsWith(".json")) JSON.parse(code);
    else if (/\.(js|mjs)$/.test(name)) new Function(code);
    else return null;
    return null;
  } catch (e) { return e instanceof Error ? e.message : "Syntax error"; }
}
