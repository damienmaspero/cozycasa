import { useEffect, useState, type FormEvent } from "react";
import { organization, signIn, signOut, signUp, useSession } from "./auth-client.ts";

type Org = { id: string; name: string; slug: string };

export function App() {
  const { data: session, isPending } = useSession();

  if (isPending) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>cozycasa</h1>
      {session?.user ? <SignedIn email={session.user.email} /> : <AuthForms />}
    </main>
  );
}

function AuthForms() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await signUp.email({ email, password, name: name || email });
        if (res.error) setError(res.error.message ?? "Sign-up failed");
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) setError(res.error.message ?? "Sign-in failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>{mode === "signin" ? "Sign in" : "Sign up"}</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        {mode === "signup" && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <p>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </p>
    </section>
  );
}

function SignedIn({ email }: { email: string }) {
  return (
    <section>
      <p>
        Signed in as <strong>{email}</strong>{" "}
        <button type="button" onClick={() => signOut()}>Sign out</button>
      </p>
      <Organizations />
    </section>
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await organization.create({ name, slug: slug || name.toLowerCase().replace(/\s+/g, "-") });
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
    <section>
      <h2>Organizations</h2>
      {orgs.length === 0 ? <p>No organizations yet.</p> : (
        <ul>
          {orgs.map((o) => <li key={o.id}>{o.name} <code>({o.slug})</code></li>)}
        </ul>
      )}
      <form onSubmit={onCreate} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <h3>Create organization</h3>
        <label>
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Slug (optional)
          <input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>{busy ? "…" : "Create"}</button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </section>
  );
}
