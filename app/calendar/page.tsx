"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CalendarScreen from "@/src/lib/calendar/CalendarScreen";
import { styles } from "@/src/lib/calendar/styles";
import { useT } from "@/src/lib/calendar/i18n";
import { organization, useSession } from "@/src/lib/auth-client";

type Org = { id: string; name: string; slug: string };

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarRoute />
    </Suspense>
  );
}

function CalendarRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const T = useT();

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    void (async () => {
      const res = await organization.list();
      if (!cancelled && res.data) setOrgs(res.data as Org[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  if (isPending) {
    return (
      <div
        style={{
          ...styles.container,
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <span style={styles.muted}>{T.loading}</span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div style={{ ...styles.container, ...styles.content }}>
        <h2 style={styles.h2}>{T.please_sign_in}</h2>
        <button type="button" onClick={() => router.replace("/")} style={styles.btn}>
          <span style={styles.btnText}>{T.back}</span>
        </button>
      </div>
    );
  }

  const selectedOrgId = searchParams.get("org") ?? undefined;
  const selectedOrg = orgs?.find((o) => o.id === selectedOrgId);

  if (!selectedOrgId) {
    return (
      <div style={{ ...styles.container, ...styles.content }}>
        <h2 style={styles.h2}>{T.choose_a_household}</h2>
        {orgs === null ? (
          <span style={styles.muted}>{T.loading}</span>
        ) : orgs.length === 0 ? (
          <p style={styles.muted}>{T.not_member_of_any_org}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {orgs.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => router.replace(`/calendar?org=${o.id}`)}
                style={styles.btn}
              >
                <span style={styles.btnText}>{o.name}</span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => router.replace("/")}
          style={{ ...styles.btn, ...styles.btnSecondary }}
        >
          <span style={styles.btnText}>{T.back}</span>
        </button>
      </div>
    );
  }

  if (orgs && !selectedOrg) {
    return (
      <div style={{ ...styles.container, ...styles.content }}>
        <p style={styles.error}>{T.not_member_of_that_org}</p>
        <button
          type="button"
          onClick={() => router.replace("/calendar")}
          style={styles.btn}
        >
          <span style={styles.btnText}>{T.back}</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          padding: 8,
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <button
          type="button"
          onClick={() => router.replace("/")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#2563eb",
            fontWeight: 600,
            padding: "0 8px",
          }}
        >
          {T.back}
        </button>
      </div>
      <CalendarScreen organizationId={selectedOrgId} />
    </>
  );
}
