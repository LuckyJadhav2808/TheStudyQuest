import { NextResponse } from "next/server";
import yts from "yt-search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  if (!q) return NextResponse.json({ results: [] });

  try {
    const res = await yts(q);
    const results = (res.videos ?? []).slice(0, 12).map((v) => ({
      id: `yt-${v.videoId}`,
      videoId: v.videoId,
      title: v.title,
      artist: v.author?.name || "YouTube",
      duration: v.timestamp || "",
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "YouTube search failed" }, { status: 500 });
  }
}
