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
  organization,
  signIn,
  signOut,
  useSession,
} from "@/src/lib/auth-client";

type Org = { id: string; name: string; slug: string };

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
        <SignedIn email={session.user.email} />
      ) : (
        <AuthForms />
      )}
    </ScrollView>
  );
}

function AuthForms() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      const res = await signIn.email({ email, password });
      if (res.error) setError(res.error.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Sign in</Text>
      <View style={styles.form}>
        <View>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
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
          disabled={busy || !email || !password}
        >
          <Text style={styles.buttonText}>{busy ? "…" : "Sign in"}</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function SignedIn({ email }: { email: string }) {
  return (
    <View style={styles.section}>
      <Text>
        Signed in as <Text style={styles.bold}>{email}</Text>
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
      <Organizations />
    </View>
  );
}

function Organizations() {
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
        <View>
          {orgs.map((o) => (
            <Text key={o.id}>
              {o.name} <Text style={styles.code}>({o.slug})</Text>
            </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, maxWidth: 640, width: "100%", alignSelf: "center" },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  h1: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
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
});
