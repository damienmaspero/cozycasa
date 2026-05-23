import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  authClient,
  organization,
  signIn,
  signOut,
  useSession,
} from "@/src/lib/auth-client";

type Org = { id: string; name: string; slug: string };

// Roles offered by the org "Create user" form. better-auth's default
// organization roles are `owner`, `admin`, and `member`; we expose them all
// so the admin can pick the right one when seeding accounts.
const ORG_ROLES = ["member", "admin", "owner"] as const;
type OrgRole = (typeof ORG_ROLES)[number];

/**
 * Build a synthetic email for a username-only account. better-auth's user
 * table requires a unique email even when the user signs in with a
 * username, so we deterministically derive one from the username. The
 * `.cozycasa.local` TLD is reserved for our internal use and never receives
 * real mail, matching the README's "no invitation is sent" requirement.
 */
function syntheticEmail(username: string): string {
  return `${username.toLowerCase()}@users.cozycasa.local`;
}

export default function Index() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>cozycasa</Text>
      {session?.user ? (
        <SignedIn user={session.user} />
      ) : (
        <AuthForms />
      )}
    </ScrollView>
  );
}

type SignInMode = "username" | "email";

function AuthForms() {
  // Username sign-in is the documented path for members (see README "Scope").
  // The email fallback is kept available for the admin and any other legacy
  // account that pre-dates the username plugin and therefore has no
  // `username` value on its user row. The server still has
  // `emailAndPassword.enabled = true` (see `src/auth.ts`), so `signIn.email`
  // continues to work alongside `signIn.username`.
  const [mode, setMode] = useState<SignInMode>("username");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "username"
          ? await signIn.username({ username: identifier, password })
          : await signIn.email({ email: identifier, password });
      if (res.error) setError(res.error.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: SignInMode) {
    if (next === mode) return;
    setMode(next);
    setIdentifier("");
    setError(null);
  }

  const isUsername = mode === "username";

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Sign in</Text>
      <View style={styles.form}>
        <View style={styles.roleRow}>
          <Pressable
            onPress={() => switchMode("username")}
            style={({ pressed }) => [
              styles.rolePill,
              isUsername && styles.rolePillSelected,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text
              style={[
                styles.rolePillText,
                isUsername && styles.rolePillTextSelected,
              ]}
            >
              Username
            </Text>
          </Pressable>
          <Pressable
            onPress={() => switchMode("email")}
            style={({ pressed }) => [
              styles.rolePill,
              !isUsername && styles.rolePillSelected,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text
              style={[
                styles.rolePillText,
                !isUsername && styles.rolePillTextSelected,
              ]}
            >
              Email
            </Text>
          </Pressable>
        </View>
        <View>
          <Text style={styles.label}>{isUsername ? "Username" : "Email"}</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoComplete={isUsername ? "username" : "email"}
            textContentType={isUsername ? "username" : "emailAddress"}
            keyboardType={isUsername ? "default" : "email-address"}
          />
        </View>
        <View>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            busy && styles.buttonDisabled,
            pressed && !busy && styles.buttonPressed,
          ]}
          onPress={onSubmit}
          disabled={busy || !identifier || !password}
        >
          <Text style={styles.buttonText}>{busy ? "…" : "Sign in"}</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function SignedIn({ user }: { user: { email: string; role?: string | null } }) {
  // Admins can create users in any organization. We use better-auth's
  // `user.role` (set by the admin plugin) to decide whether to render the
  // admin-only "Create user" form. Users in `BETTER_AUTH_ADMIN_USER_IDS`
  // are also treated as admins server-side; the server enforces this
  // independently when the request hits `/admin/create-user`, so the UI
  // check is purely cosmetic.
  const isAdmin = user.role === "admin";
  return (
    <View style={styles.section}>
      <Text>
        Signed in as <Text style={styles.bold}>{user.email}</Text>
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.buttonSecondary,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => {
          void signOut();
        }}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
      <Organizations isAdmin={isAdmin} />
    </View>
  );
}

function Organizations({ isAdmin }: { isAdmin: boolean }) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await organization.list();
    if (res.data) setOrgs(res.data as Org[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await organization.create({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      });
      if (res.error) {
        setError(res.error.message ?? "Failed to create organization");
      } else {
        setName("");
        setSlug("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Organizations</Text>
      {orgs.length === 0 ? (
        <Text style={styles.muted}>No organizations yet.</Text>
      ) : (
        <View style={styles.section}>
          {orgs.map((o) => (
            <View key={o.id} style={styles.orgRow}>
              <Text>
                {o.name} <Text style={styles.code}>({o.slug})</Text>
              </Text>
              {isAdmin && <CreateOrgUser org={o} />}
            </View>
          ))}
        </View>
      )}
      <View style={styles.form}>
        <Text style={styles.h3}>Create organization</Text>
        <View>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View>
          <Text style={styles.label}>Slug (optional)</Text>
          <TextInput
            style={styles.input}
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            (busy || !name) && styles.buttonDisabled,
            pressed && !busy && !!name && styles.buttonPressed,
          ]}
          onPress={onCreate}
          disabled={busy || !name}
        >
          <Text style={styles.buttonText}>{busy ? "…" : "Create"}</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

/**
 * Admin-only form that creates a brand-new user account and adds them as a
 * member of `org` in a single submit. No invitation email is sent: the
 * admin types the username + password, hands those credentials to the
 * member out-of-band, and the member signs in directly via the username
 * form above.
 */
function CreateOrgUser({ org }: { org: Org }) {
  const [username, setUsername] = useState("");
  const [displayUsername, setDisplayUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<OrgRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setUsername("");
    setDisplayUsername("");
    setName("");
    setPassword("");
    setRole("member");
  }

  async function onSubmit() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const created = await authClient.admin.createUser({
        email: syntheticEmail(username),
        password,
        name: name || displayUsername || username,
        // The username plugin reads `username` / `displayUsername` from the
        // create payload via a database hook and stores them on the user
        // row, so passing them through `data` is enough to enable
        // username-based sign-in for this account.
        data: {
          username,
          displayUsername: displayUsername || username,
        },
      });
      if (created.error || !created.data?.user) {
        setError(created.error?.message ?? "Failed to create user");
        return;
      }
      const addRes = await authClient.$fetch("/organization/add-member", {
        method: "POST",
        body: {
          userId: created.data.user.id,
          role,
          organizationId: org.id,
        },
      });
      if (addRes.error) {
        setError(
          addRes.error.message ??
            `User created (id ${created.data.user.id}), but failed to add to ${org.name}. You can retry by adding this userId via the better-auth admin tools.`,
        );
        return;
      }
      setInfo(`Added ${username} to ${org.name} as ${role}.`);
      reset();
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && username.length > 0 && password.length > 0;

  return (
    <View style={[styles.form, styles.createUserForm]}>
      <Text style={styles.h3}>Add user to {org.name}</Text>
      <View>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
        />
      </View>
      <View>
        <Text style={styles.label}>Display name (optional)</Text>
        <TextInput
          style={styles.input}
          value={displayUsername}
          onChangeText={setDisplayUsername}
        />
      </View>
      <View>
        <Text style={styles.label}>Full name (optional)</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
      </View>
      <View>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </View>
      <View>
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {ORG_ROLES.map((r) => {
            const selected = role === r;
            return (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={({ pressed }) => [
                  styles.rolePill,
                  selected && styles.rolePillSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    selected && styles.rolePillTextSelected,
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          !canSubmit && styles.buttonDisabled,
          pressed && canSubmit && styles.buttonPressed,
        ]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>
          {busy ? "…" : "Create user & add to org"}
        </Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      {info && <Text style={styles.info}>{info}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, maxWidth: 640, width: "100%", alignSelf: "center" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  h1: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  h2: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  h3: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  section: { gap: 12, marginBottom: 24 },
  orgRow: { gap: 8 },
  form: { gap: 8, maxWidth: 320 },
  createUserForm: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  label: { fontSize: 13, marginBottom: 4, color: "#444" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#0070f3",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonSecondary: { backgroundColor: "#666", alignSelf: "flex-start" },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontWeight: "600" },
  roleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  rolePill: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
  },
  rolePillSelected: { backgroundColor: "#0070f3", borderColor: "#0070f3" },
  rolePillText: { color: "#333", fontSize: 13 },
  rolePillTextSelected: { color: "#fff", fontWeight: "600" },
  error: { color: "crimson" },
  info: { color: "#0a7d32" },
  muted: { color: "#666" },
  bold: { fontWeight: "700" },
  code: { fontFamily: "monospace", color: "#555" },
});
