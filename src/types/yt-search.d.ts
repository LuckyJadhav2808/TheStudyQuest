declare module "yt-search" {
  interface YtsVideo {
    videoId: string;
    title: string;
    timestamp?: string;
    thumbnail?: string;
    author?: { name?: string };
  }
  interface YtsResult {
    videos?: YtsVideo[];
  }
  export default function yts(query: string): Promise<YtsResult>;
}
