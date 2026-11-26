declare module "yt-search" {
  interface YtsVideo {
    videoId: string;
    title: string;
    timestamp?: string;
    duration?: { timestamp?: string };
    thumbnail?: string;
    image?: string;
    author?: { name?: string };
  }
  interface YtsPlaylistResult {
    title?: string;
    listId?: string;
    author?: { name?: string };
    videos?: YtsVideo[];
  }
  interface YtsResult {
    videos?: YtsVideo[];
  }
  function yts(query: string): Promise<YtsResult>;
  function yts(opts: { videoId: string }): Promise<YtsVideo>;
  function yts(opts: { listId: string }): Promise<YtsPlaylistResult>;
  export default yts;
}
