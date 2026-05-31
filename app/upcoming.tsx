import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import UpcomingBookingsScreen from "@/src/lib/calendar/UpcomingBookingsScreen";
import { styles } from "@/src/lib/calendar/styles";
import { useT } from "@/src/lib/calendar/i18n";
import { organization, useSession } from "@/src/lib/auth-client";

type Org = { id: string; name: string; slug: string };

export default function UpcomingRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ org?: string }>();
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

  // When the user belongs to exactly one organization there is nothing to
  // choose, so skip the picker and open that household directly.
  useEffect(() => {
    if (params.org) return;
    if (orgs && orgs.length === 1 && orgs[0]) {
      router.replace(`/upcoming?org=${orgs[0].id}`);
    }
  }, [orgs, params.org, router]);

  if (isPending) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session?.user) {
    return (
      <View style={[styles.container, styles.content]}>
        <Text style={styles.h2}>{T.please_sign_in}</Text>
        <Pressable
          onPress={() => router.replace("/")}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnText}>{T.back}</Text>
        </Pressable>
      </View>
    );
  }

  const selectedOrgId = params.org;
  const selectedOrg = orgs?.find((o) => o.id === selectedOrgId);

  if (!selectedOrgId) {
    return (
      <View style={[styles.container, styles.content]}>
        <Text style={styles.h2}>{T.choose_a_household}</Text>
        {orgs === null || orgs.length === 1 ? (
          <ActivityIndicator />
        ) : orgs.length === 0 ? (
          <Text style={styles.muted}>{T.not_member_of_any_org}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {orgs.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => router.replace(`/upcoming?org=${o.id}`)}
                style={({ pressed }) => [
                  styles.btn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.btnText}>{o.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable
          onPress={() => router.replace("/")}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.btnText}>{T.back}</Text>
        </Pressable>
      </View>
    );
  }

  if (orgs && !selectedOrg) {
    return (
      <View style={[styles.container, styles.content]}>
        <Text style={styles.error}>{T.not_member_of_that_org}</Text>
        <Pressable
          onPress={() => router.replace("/upcoming")}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnText}>{T.back}</Text>
        </Pressable>
      </View>
    );
  }

  return <UpcomingBookingsScreen organizationId={selectedOrgId} />;
}
