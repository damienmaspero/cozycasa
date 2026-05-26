import { createServer, type IncomingHttpHeaders, type IncomingMessage } from "node:http";
import { resolve } from "node:path";
import { getMigrations } from "better-auth/db/migration";
import { auth, authOptions, isElevatedRole } from "./auth.ts";
import { readBootstrapStatus } from "./bootstrap-status.ts";
import { db } from "./db.ts";
import { sendWebResponse, serveStatic, toWebRequest } from "./server-utils.ts";

const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = resolve(process.cwd(), "dist");
const SYNTHETIC_EMAIL_DOMAIN = "cozycasa.invalid";
const ORGANIZATION_MEMBER_ROLES = new Set(["member", "admin", "owner"]);
const JSON_BODY_LIMIT_BYTES = 16 * 1024;
const STATUS_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

type CreateOrganizationMemberBody = {
  organizationId: string;
  username: string;
  password: string;
  role: "member" | "admin" | "owner";
  name?: string;
};

const authPluginAPI = auth.api as typeof auth.api & {
  createUser: (input: {
    body: {
      email: string;
      password: string;
      name: string;
      data: { username: string };
    };
    headers: Headers;
  }) => Promise<{ user: { id: string } }>;
  addMember: (input: {
    body: {
      userId: string;
      role: CreateOrganizationMemberBody["role"];
      organizationId: string;
    };
    headers: Headers;
  }) => Promise<unknown>;
  removeUser: (input: {
    body: { userId: string };
    headers: Headers;
  }) => Promise<unknown>;
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function toWebHeaders(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        result.append(name, item);
      }
    } else if (value !== undefined) {
      result.set(name, value);
    }
  }
  return result;
}

async function readJSONBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > JSON_BODY_LIMIT_BYTES) {
      throw new Error(`Request body exceeds limit of ${JSON_BODY_LIMIT_BYTES} bytes`);
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    throw new Error("Request body cannot be empty");
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function parseCreateOrganizationMemberBody(
  value: unknown,
): CreateOrganizationMemberBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object");
  }
  const {
    organizationId,
    username,
    password,
    role,
    name,
  } = value as Record<string, unknown>;
  const parsed = {
    organizationId:
      typeof organizationId === "string" ? organizationId.trim() : "",
    username: typeof username === "string" ? username.trim() : "",
    password: typeof password === "string" ? password : "",
    role: typeof role === "string" ? role : "",
    name: typeof name === "string" ? name.trim() : undefined,
  };
  if (!parsed.organizationId) {
    throw new Error("organizationId is required");
  }
  if (!parsed.username) {
    throw new Error("username is required");
  }
  if (!parsed.password) {
    throw new Error("password is required");
  }
  if (!ORGANIZATION_MEMBER_ROLES.has(parsed.role)) {
    throw new Error("role must be one of member, admin, or owner");
  }
  return {
    organizationId: parsed.organizationId,
    username: parsed.username,
    password: parsed.password,
    role: parsed.role as CreateOrganizationMemberBody["role"],
    ...(parsed.name ? { name: parsed.name } : {}),
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const message = "message" in error ? error.message : undefined;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    const body = "body" in error ? error.body : undefined;
    if (body && typeof body === "object" && "message" in body) {
      const bodyMessage = body.message;
      if (typeof bodyMessage === "string" && bodyMessage.trim()) {
        return bodyMessage;
      }
    }
  }
  return fallback;
}

function getStatusCode(error: unknown): number {
  if (error && typeof error === "object") {
    const status = "status" in error ? error.status : undefined;
    if (typeof status === "number") {
      return status;
    }
    if (
      typeof status === "string" &&
      Object.prototype.hasOwnProperty.call(STATUS_CODES, status)
    ) {
      return STATUS_CODES[status as keyof typeof STATUS_CODES];
    }
  }
  return 500;
}

async function rollbackCreatedUser(
  userId: string,
  headers: Headers,
): Promise<boolean> {
  try {
    await authPluginAPI.removeUser({
      body: { userId },
      headers,
    });
    return true;
  } catch {
    return false;
  }
}

async function handleCreateOrganizationMember(
  req: IncomingMessage,
): Promise<Response> {
  const headers = toWebHeaders(req.headers);

  // Authorization: only callers with an elevated role (i.e. not `"user"`) may
  // create accounts. Role `"user"` is the admin plugin's default for every
  // new sign-up (see `node_modules/better-auth/dist/plugins/admin/admin.mjs`),
  // so without this check a regular member could create new users by hitting
  // this endpoint directly. The bootstrap user is promoted to `"admin"` in
  // `src/auth.ts` so they can still seed accounts.
  let callerRole: string | null | undefined;
  try {
    const session = await auth.api.getSession({ headers });
    callerRole = (session?.user as { role?: string | null } | undefined)?.role;
    if (!session) {
      return jsonResponse(STATUS_CODES.UNAUTHORIZED, {
        error: { message: "Authentication required" },
      });
    }
  } catch {
    return jsonResponse(STATUS_CODES.UNAUTHORIZED, {
      error: { message: "Authentication required" },
    });
  }
  if (!isElevatedRole(callerRole)) {
    return jsonResponse(STATUS_CODES.FORBIDDEN, {
      error: {
        message: "Users with role 'user' cannot create organization members",
      },
    });
  }

  let body: CreateOrganizationMemberBody;
  try {
    body = parseCreateOrganizationMemberBody(await readJSONBody(req));
  } catch (error) {
    return jsonResponse(400, {
      error: {
        message:
          error instanceof SyntaxError
            ? "Request body must be valid JSON"
            : getErrorMessage(error, "Invalid request body"),
      },
    });
  }

  let createdUserId: string | null = null;

  try {
    const createdUser = await authPluginAPI.createUser({
      body: {
        email: `${body.username.toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`,
        password: body.password,
        name: body.name ?? body.username,
        data: { username: body.username },
      },
      headers,
    });
    createdUserId = createdUser.user.id;

    const member = await authPluginAPI.addMember({
      body: {
        userId: createdUser.user.id,
        role: body.role,
        organizationId: body.organizationId,
      },
      headers,
    });

    return jsonResponse(200, { user: createdUser.user, member });
  } catch (error) {
    let cleanupSucceeded = false;
    if (createdUserId !== null) {
      cleanupSucceeded = await rollbackCreatedUser(createdUserId, headers);
    }
    const message = getErrorMessage(error, "Failed to create organization member");
    return jsonResponse(getStatusCode(error), {
      error: {
        message: createdUserId === null || cleanupSucceeded
          ? message
          : `${message}. The user account was created and must be removed manually.`,
      },
    });
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/bootstrap-status") {
      res.statusCode = 200;
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(readBootstrapStatus(db)));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/organization/create-member") {
      const webRes = await handleCreateOrganizationMember(req);
      await sendWebResponse(webRes, res);
      return;
    }
    if (url.pathname.startsWith("/api/auth/")) {
      const webRes = await auth.handler(toWebRequest(req, PORT));
      await sendWebResponse(webRes, res);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      if (serveStatic(req, res, DIST_DIR)) return;
    }
    res.statusCode = 404;
    res.end("Not Found");
  } catch (err) {
    console.error("[server] unhandled error", err);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

try {
  const { runMigrations } = await getMigrations(authOptions);
  await runMigrations();
} catch (err) {
  console.error("[server] failed to run auth migrations", err);
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`cozycasa server listening on http://localhost:${PORT}`);
});
