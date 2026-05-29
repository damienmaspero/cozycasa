import { Stack, useRouter } from "expo-router";
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
  apiBaseURL,
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

function resolveBootstrapStatusURL(): string | null {
  if (typeof window !== "undefined") {
    return "/api/bootstrap-status";
  }
  return apiBaseURL ? `${apiBaseURL}/api/bootstrap-status` : null;
}

export default function Index() {
  const { data: session, isPending } = useSession();
  const T = useT();

  if (isPending) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.muted}>{T.loading}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: T.cozy_casa }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.h1}>{T.cozy_casa}</Text>
          <LanguageSwitcher />
        </View>
        {session?.user ? (
          (() => {
            const u = session.user as typeof session.user & {
              username?: string | null;
              displayUsername?: string | null;
              role?: string | null;
            };
            return <SignedIn label={u.displayUsername ?? u.username ?? u.email} role={u.role} />;
          })()
        ) : (
          <AuthForms />
        )}
      </ScrollView>
    </>
  );
}

function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const T = useT();
  // Hide the switcher entirely when only one language is exposed.
  if (SUPPORTED_LANGS.length < 2) return null;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={T.language}
      style={styles.langRow}
    >
      {SUPPORTED_LANGS.map((code) => {
        const selected = code === lang;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={LANG_LABELS[code]}
            onPress={() => setLang(code)}
            style={({ pressed }) => [
              styles.langChip,
              selected && styles.langChipSelected,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text
              style={[
                styles.langChipText,
                selected && styles.langChipTextSelected,
              ]}
            >
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AuthForms() {
  // Public sign-up is closed past the first user (see README "Scope"), but the
  // very first sign-up is allowed when the `user` table is empty so the
  // initial admin can bootstrap the app. We surface a "Sign up" toggle here
  // so that bootstrap is reachable from the UI; subsequent attempts get the
  // server's `EMAIL_PASSWORD_SIGN_UP_DISABLED` error which is shown inline.
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
        const url = resolveBootstrapStatusURL();
        if (!url) {
          setSignUpAllowed(false);
          return;
        }
        const response = await fetch(url, {
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
    !busy &&
    !!username &&
    !!password &&
    (!isSignUp || !!email);

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{isSignUp ? T.sign_up : T.sign_in}</Text>
      <View style={styles.form}>
        <View>
          <Text style={styles.label}>{T.username}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
          />
        </View>
        {isSignUp && (
          <>
            <View>
              <Text style={styles.label}>{T.email}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
            <View>
              <Text style={styles.label}>{T.name_optional}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoComplete="name"
                textContentType="name"
              />
            </View>
          </>
        )}
        <View>
          <Text style={styles.label}>{T.password}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => {
              if (canSubmit) {
                void onSubmit();
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? "new-password" : "password"}
            textContentType={isSignUp ? "newPassword" : "password"}
            returnKeyType={isSignUp ? "done" : "go"}
          />
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
            {busy ? "…" : isSignUp ? T.sign_up : T.sign_in}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setError(null);
            setMode(isSignUp ? "signin" : "signup");
          }}
          disabled={!isSignUp && signUpAllowed !== true}
        >
          <Text style={styles.link}>
            {isSignUp
              ? T.already_have_account
              : signUpAllowed
                ? T.need_first_account
                : signUpAllowed === null
                  ? T.checking_first_account
                  : T.sign_in_only_ask_admin}
          </Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function SignedIn({ label, role }: { label: string; role?: string | null }) {
  const isAdmin = typeof role === "string" && role.trim() !== "" && role !== "user";
  const T = useT();
  return (
    <View style={styles.section}>
      <Text>
        {T.signed_in_as} <Text style={styles.bold}>{label}</Text>
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
        <Text style={styles.buttonText}>{T.sign_out}</Text>
      </Pressable>
      <Organizations isAdmin={isAdmin} />
    </View>
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
        setError(res.error.message ?? T.failed_create_organization);
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
      <Text style={styles.h2}>{T.organizations}</Text>
      {orgs.length === 0 ? (
        <Text style={styles.muted}>{T.no_organizations_yet}</Text>
      ) : (
        <View style={styles.orgList}>
          {orgs.map((o) => (
            <View key={o.id} style={styles.orgItem}>
              <Text>
                {o.name} <Text style={styles.code}>({o.slug})</Text>
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  router.push({
                    pathname: "/calendar",
                    params: { org: o.id },
                  });
                }}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonText}>{T.open_calendar}</Text>
              </Pressable>
              {isAdmin && (
                <CreateOrganizationMember
                  organizationId={o.id}
                  organizationName={o.name}
                />
              )}
            </View>
          ))}
        </View>
      )}
      {isAdmin && (
        <View style={styles.form}>
          <Text style={styles.h3}>{T.create_organization}</Text>
          <View>
            <Text style={styles.label}>{T.name}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View>
            <Text style={styles.label}>{T.slug_optional}</Text>
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
            <Text style={styles.buttonText}>{busy ? "…" : T.create}</Text>
          </Pressable>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const MEMBER_ROLES = ["member", "admin", "owner"] as const;
type MemberRole = (typeof MEMBER_ROLES)[number];
type CreateOrganizationMemberResponse =
  | {
      error: { message?: string };
      user?: never;
      member?: never;
    }
  | {
      error?: undefined;
      user: { id: string };
      member: { id: string };
    };

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
    <View style={styles.form}>
      <Text style={styles.h3}>{T.create_member_for} {organizationName}</Text>
      <View>
        <Text style={styles.label}>{T.username}</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
        />
      </View>
      <View>
        <Text style={styles.label}>{T.password}</Text>
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
        <Text style={styles.label}>{T.name_optional}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
        />
      </View>
      <View>
        <Text style={styles.label}>{T.role}</Text>
        <View style={styles.roleRow}>
          {MEMBER_ROLES.map((r) => {
            const selected = r === role;
            return (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={({ pressed }) => [
                  styles.roleChip,
                  selected && styles.roleChipSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    selected && styles.roleChipTextSelected,
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
        onPress={onCreate}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>{busy ? "…" : T.create_member}</Text>
      </Pressable>
      {message && <Text style={styles.muted}>{message}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, maxWidth: 640, width: "100%", alignSelf: "center" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  h1: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  langRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  langChip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  langChipSelected: { backgroundColor: "#0070f3", borderColor: "#0070f3" },
  langChipText: { color: "#444", fontSize: 12, fontWeight: "600" },
  langChipTextSelected: { color: "#fff" },
  h2: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  h3: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  section: { gap: 12, marginBottom: 24 },
  form: { gap: 8, maxWidth: 320 },
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
  error: { color: "crimson" },
  muted: { color: "#666" },
  bold: { fontWeight: "700" },
  code: { fontFamily: "monospace", color: "#555" },
  link: { color: "#0070f3", marginTop: 4 },
  orgList: { gap: 16 },
  orgItem: { gap: 8 },
  roleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  roleChip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  roleChipSelected: { backgroundColor: "#0070f3", borderColor: "#0070f3" },
  roleChipText: { color: "#444", fontSize: 13 },
  roleChipTextSelected: { color: "#fff", fontWeight: "600" },
});
