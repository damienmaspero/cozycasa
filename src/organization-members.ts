import { auth, isElevatedRole } from "./auth.ts";

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

async function readJSONBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length === 0) {
    throw new Error("Request body cannot be empty");
  }
  if (Buffer.byteLength(text, "utf8") > JSON_BODY_LIMIT_BYTES) {
    throw new Error(`Request body exceeds limit of ${JSON_BODY_LIMIT_BYTES} bytes`);
  }
  return JSON.parse(text) as unknown;
}

function parseCreateOrganizationMemberBody(
  value: unknown,
): CreateOrganizationMemberBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Request body must be a JSON object");
  }
  const { organizationId, username, password, role, name } = value as Record<
    string,
    unknown
  >;
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

export async function handleCreateOrganizationMember(
  req: Request,
): Promise<Response> {
  const headers = req.headers;

  // Authorization: only callers with an elevated role (i.e. not `"user"`) may
  // create accounts. Role `"user"` is the admin plugin's default for every
  // new sign-up, so without this check a regular member could create new
  // users by hitting this endpoint directly. The bootstrap user is promoted
  // to `"admin"` in `src/auth.ts` so they can still seed accounts.
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
    const message = getErrorMessage(
      error,
      "Failed to create organization member",
    );
    return jsonResponse(getStatusCode(error), {
      error: {
        message:
          createdUserId === null || cleanupSucceeded
            ? message
            : `${message}. The user account was created and must be removed manually.`,
      },
    });
  }
}
