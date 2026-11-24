import { z } from "zod";

const q = `query($u:String!){matchedUser(username:$u){submitStats:submitStatsGlobal{acSubmissionNum{difficulty count}}}}`;
export async function GET(req: Request): Promise<Response> {
  const user = z.string().min(1).max(40).safeParse(new URL(req.url).searchParams.get("user"));
  if (!user.success) return Response.json({ error: "missing-user" }, { status: 400 });
  try {
    const res = await fetch("https://leetcode.com/graphql", { method: "POST", headers: { "content-type": "application/json", referer: "https://leetcode.com" }, body: JSON.stringify({ query: q, variables: { u: user.data } }), signal: AbortSignal.timeout(8000) });
    const json = (await res.json()) as { data?: { matchedUser?: { submitStats?: { acSubmissionNum?: { difficulty: string; count: number }[] } } } };
    const rows = json.data?.matchedUser?.submitStats?.acSubmissionNum;
    if (!rows) return Response.json({ error: "not-found" }, { status: 404 });
    return Response.json({ solved: Object.fromEntries(rows.map((r) => [r.difficulty.toLowerCase(), r.count])) });
  } catch {
    return Response.json({ error: "unreachable" }, { status: 502 });
  }
}
