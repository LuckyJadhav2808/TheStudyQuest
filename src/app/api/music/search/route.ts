import { NextResponse } from "next/server";
import yts from "yt-search";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const videoId = (searchParams.get("videoId") ?? "").trim();
  const listId = (searchParams.get("listId") ?? "").trim();
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);

  if (!q && !videoId && !listId) return NextResponse.json({ results: [] });

  try {
    if (listId) {
      try {
        const pl = await yts({ listId });
        const results = (pl.videos ?? [])
          .filter((v) => v.videoId)
          .slice(0, 25)
          .map((v) => ({
            id: `yt-${v.videoId}`,
            videoId: v.videoId,
            title: v.title,
            artist: v.author?.name || pl.author?.name || "YouTube",
            duration: v.duration?.timestamp || v.timestamp || "",
            thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          }));
        if (results.length > 0) {
          return NextResponse.json({ playlistTitle: pl.title || "YouTube Playlist", results });
        }
      } catch {
        if (!videoId) return NextResponse.json({ results: [] });
      }
    }

    if (videoId) {
      const v = await yts({ videoId });
      return NextResponse.json({
        results: [
          {
            id: `yt-${v.videoId || videoId}`,
            videoId: v.videoId || videoId,
            title: v.title,
            artist: v.author?.name || "YouTube",
            duration: v.timestamp || v.duration?.timestamp || "",
            thumbnail: v.image || v.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          },
        ],
      });
    }

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
    return NextResponse.json({ error: "YouTube lookup failed" }, { status: 500 });
  }
}
