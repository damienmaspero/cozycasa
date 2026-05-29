import { auth } from "@/src/auth.ts";

// better-auth and the node:sqlite database layer require the Node.js runtime.
export const runtime = "nodejs";
// Auth responses are session-specific and must never be cached.
export const dynamic = "force-dynamic";

const handler = (request: Request): Promise<Response> => auth.handler(request);

export { handler as GET, handler as POST };
