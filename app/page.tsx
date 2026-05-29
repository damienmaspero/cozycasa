"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  authClient,
  organization,
  signIn,
  signOut,
  signUp,
  useSession,
} from "@/src/lib/auth-client";
import {
  LANG_LABELS,
  SUPPORTED_LANGS,
  useLanguage,
  useT,
} from "@/src/lib/calendar/i18n";

type Org = { id: string; name: string; slug: string };
type BootstrapStatus = { signUpAllowed: boolean };

export default function Index() {
  const { data: session, isPending } = useSession();
  const T = useT();

  if (isPending) {
    return (
      <div style={{ ...styles.container, ...styles.center }}>
        <span style={styles.muted}>{T.loading}</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.headerRow}>
          <h1 style={styles.h1}>{T.cozy_casa}</h1>
          <LanguageSwitcher />
        </div>
        {session?.user ? (
          (() => {
            const u = session.user as typeof session.user & {
              username?: string | null;
              displayUsername?: string | null;
              role?: string | null;
            };
            return (
              <SignedIn
                label={u.displayUsername ?? u.username ?? u.email}
                role={u.role}
              />
            );
          })()
        ) : (
          <AuthForms />
        )}
      </div>
    </div>
  );
}

function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const T = useT();
  if (SUPPORTED_LANGS.length < 2) return null;
  return (
    <div role="radiogroup" aria-label={T.language} style={styles.langRow}>
      {SUPPORTED_LANGS.map((code) => {
        const selected = code === lang;
        return (
          <button
            type="button"
            key={code}
            role="radio"
            aria-checked={selected}
            aria-label={LANG_LABELS[code]}
            onClick={() => setLang(code)}
            style={{
              ...styles.langChip,
              ...(selected ? styles.langChipSelected : null),
            }}
          >
            <span
              style={{
                ...styles.langChipText,
                ...(selected ? styles.langChipTextSelected : null),
              }}
            >
              {code.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AuthForms() {
  // Public sign-up is closed past the first user (see README "Scope"), but the
  // very first sign-up is allowed when the `user` table is empty so the
  // initial admin can bootstrap the app.
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signUpAllowed, setSignUpAllowed] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const T = useT();

  const isSignUp = mode === "signup";

  useEffect(() => {
    const controller = new AbortController();

    async function loadBootstrapStatus() {
      try {
        const response = await fetch("/api/bootstrap-status", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const status = (await response.json()) as BootstrapStatus;
        setSignUpAllowed(status.signUpAllowed);
        if (!status.signUpAllowed) {
          setMode("signin");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setSignUpAllowed(false);
      }
    }

    void loadBootstrapStatus();

    return () => controller.abort();
  }, []);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (isSignUp) {
        const res = await signUp.email({
          email,
          password,
          name: name || username,
          username,
        });
        if (res.error) setError(res.error.message ?? T.sign_up_failed);
      } else {
        const res = await signIn.username({ username, password });
        if (res.error) setError(res.error.message ?? T.sign_in_failed);
      }
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy && !!username && !!password && (!isSignUp || !!email);

  return (
    <div style={styles.section}>
      <h2 style={styles.h2}>{isSignUp ? T.sign_up : T.sign_in}</h2>
      <form
        style={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void onSubmit();
        }}
      >
        <div>
          <label style={styles.label}>{T.username}</label>
          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
          />
        </div>
        {isSignUp && (
          <>
            <div>
              <label style={styles.label}>{T.email}</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
              />
            </div>
            <div>
              <label style={styles.label}>{T.name_optional}</label>
              <input
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </>
        )}
        <div>
          <label style={styles.label}>{T.password}</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoCapitalize="none"
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
        </div>
        <button
          type="submit"
          style={{
            ...styles.button,
            ...(!canSubmit ? styles.buttonDisabled : null),
          }}
          disabled={!canSubmit}
        >
          <span style={styles.buttonText}>
            {busy ? "…" : isSignUp ? T.sign_up : T.sign_in}
          </span>
        </button>
        <button
          type="button"
          style={styles.linkButton}
          onClick={() => {
            setError(null);
            setMode(isSignUp ? "signin" : "signup");
          }}
          disabled={!isSignUp && signUpAllowed !== true}
        >
          <span style={styles.link}>
            {isSignUp
              ? T.already_have_account
              : signUpAllowed
                ? T.need_first_account
                : signUpAllowed === null
                  ? T.checking_first_account
                  : T.sign_in_only_ask_admin}
          </span>
        </button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

function SignedIn({ label, role }: { label: string; role?: string | null }) {
  const isAdmin =
    typeof role === "string" && role.trim() !== "" && role !== "user";
  const T = useT();
  return (
    <div style={styles.section}>
      <p>
        {T.signed_in_as} <span style={styles.bold}>{label}</span>
      </p>
      <button
        type="button"
        style={{ ...styles.button, ...styles.buttonSecondary }}
        onClick={() => {
          void signOut();
        }}
      >
        <span style={styles.buttonText}>{T.sign_out}</span>
      </button>
      <Organizations isAdmin={isAdmin} />
    </div>
  );
}

function Organizations({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const T = useT();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await organization.list();
    if (res.data) setOrgs(res.data as Org[]);
    return res.data ? (res.data as Org[]) : null;
  }, []);

  useEffect(() => {
    async function init() {
      const loaded = await reload();
      if (!isAdmin && loaded && loaded.length === 1 && loaded[0]) {
        router.replace(`/calendar?org=${loaded[0].id}`);
      }
    }
    void init();
  }, [isAdmin, reload, router]);

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await organization.create({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      });
      if (res.error) {
        setError(res.error.message ?? T.failed_create_organization);
      } else {
        setName("");
        setSlug("");
        await reload();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.section}>
      <h2 style={styles.h2}>{T.organizations}</h2>
      {orgs.length === 0 ? (
        <p style={styles.muted}>{T.no_organizations_yet}</p>
      ) : (
        <div style={styles.orgList}>
          {orgs.map((o) => (
            <div key={o.id} style={styles.orgItem}>
              <p>
                {o.name} <span style={styles.code}>({o.slug})</span>
              </p>
              <button
                type="button"
                onClick={() => router.push(`/calendar?org=${o.id}`)}
                style={styles.button}
              >
                <span style={styles.buttonText}>{T.open_calendar}</span>
              </button>
              {isAdmin && (
                <CreateOrganizationMember
                  organizationId={o.id}
                  organizationName={o.name}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {isAdmin && (
        <div style={styles.form}>
          <h3 style={styles.h3}>{T.create_organization}</h3>
          <div>
            <label style={styles.label}>{T.name}</label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label style={styles.label}>{T.slug_optional}</label>
            <input
              style={styles.input}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              autoCapitalize="none"
            />
          </div>
          <button
            type="button"
            style={{
              ...styles.button,
              ...(busy || !name ? styles.buttonDisabled : null),
            }}
            onClick={onCreate}
            disabled={busy || !name}
          >
            <span style={styles.buttonText}>{busy ? "…" : T.create}</span>
          </button>
        </div>
      )}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const MEMBER_ROLES = ["member", "admin", "owner"] as const;
type MemberRole = (typeof MEMBER_ROLES)[number];
type CreateOrganizationMemberResponse =
  | { error: { message?: string }; user?: never; member?: never }
  | { error?: undefined; user: { id: string }; member: { id: string } };

function CreateOrganizationMember({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const T = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    setMessage(null);
    setBusy(true);
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    try {
      const res = (await authClient.$fetch("/organization/create-member", {
        method: "POST",
        body: {
          organizationId,
          username: trimmedUsername,
          password,
          role,
          ...(trimmedName ? { name: trimmedName } : {}),
        },
      })) as CreateOrganizationMemberResponse;
      if (res.error) {
        setError(res.error.message ?? T.failed_create_member);
        return;
      }
      setMessage(T.member_created_for(trimmedUsername, organizationName));
      setUsername("");
      setPassword("");
      setName("");
    } catch {
      setError(T.network_error_try_again);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && !!username.trim() && !!password;

  return (
    <div style={styles.form}>
      <h3 style={styles.h3}>
        {T.create_member_for} {organizationName}
      </h3>
      <div>
        <label style={styles.label}>{T.username}</label>
        <input
          style={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
        />
      </div>
      <div>
        <label style={styles.label}>{T.password}</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoCapitalize="none"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label style={styles.label}>{T.name_optional}</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div>
        <label style={styles.label}>{T.role}</label>
        <div style={styles.roleRow}>
          {MEMBER_ROLES.map((r) => {
            const selected = r === role;
            return (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                style={{
                  ...styles.roleChip,
                  ...(selected ? styles.roleChipSelected : null),
                }}
              >
                <span
                  style={{
                    ...styles.roleChipText,
                    ...(selected ? styles.roleChipTextSelected : null),
                  }}
                >
                  {r}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        style={{
          ...styles.button,
          ...(!canSubmit ? styles.buttonDisabled : null),
        }}
        onClick={onCreate}
        disabled={!canSubmit}
      >
        <span style={styles.buttonText}>{busy ? "…" : T.create_member}</span>
      </button>
      {message && <p style={styles.muted}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", backgroundColor: "#fff" },
  content: {
    padding: 16,
    maxWidth: 640,
    width: "100%",
    margin: "0 auto",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  h1: { fontSize: 28, fontWeight: 700, marginBottom: 16 },
  headerRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  langRow: { display: "flex", flexDirection: "row", gap: 6, marginBottom: 16 },
  langChip: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ccc",
    borderRadius: 999,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  langChipSelected: { backgroundColor: "#0070f3", borderColor: "#0070f3" },
  langChipText: { color: "#444", fontSize: 12, fontWeight: 600 },
  langChipTextSelected: { color: "#fff" },
  h2: { fontSize: 20, fontWeight: 600, marginBottom: 12 },
  h3: { fontSize: 16, fontWeight: 600, marginTop: 8 },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 24,
  },
  form: { display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 },
  label: { display: "block", fontSize: 13, marginBottom: 4, color: "#444" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ccc",
    borderRadius: 6,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    fontFamily: "inherit",
  },
  button: {
    backgroundColor: "#0070f3",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: { backgroundColor: "#666", alignSelf: "flex-start" },
  buttonDisabled: { backgroundColor: "#aaa", cursor: "not-allowed" },
  buttonText: { color: "#fff", fontWeight: 600 },
  linkButton: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
  },
  error: { color: "crimson" },
  muted: { color: "#666" },
  bold: { fontWeight: 700 },
  code: { fontFamily: "monospace", color: "#555" },
  link: { color: "#0070f3", marginTop: 4 },
  orgList: { display: "flex", flexDirection: "column", gap: 16 },
  orgItem: { display: "flex", flexDirection: "column", gap: 8 },
  roleRow: { display: "flex", flexDirection: "row", gap: 8, flexWrap: "wrap" },
  roleChip: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ccc",
    borderRadius: 999,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    backgroundColor: "#fff",
    cursor: "pointer",
  },
  roleChipSelected: { backgroundColor: "#0070f3", borderColor: "#0070f3" },
  roleChipText: { color: "#444", fontSize: 13 },
  roleChipTextSelected: { color: "#fff", fontWeight: 600 },
} satisfies Record<string, CSSProperties>;
