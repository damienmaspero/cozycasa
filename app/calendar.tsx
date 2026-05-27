import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import CalendarScreen from "@/src/lib/calendar/CalendarScreen";
import { styles } from "@/src/lib/calendar/styles";
import { T } from "@/src/lib/calendar/i18n";
import { organization, useSession } from "@/src/lib/auth-client";

type Org = { id: string; name: string; slug: string };

export default function CalendarRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ org?: string }>();
  const { data: session, isPending } = useSession();
  const [orgs, setOrgs] = useState<Org[] | null>(null);

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
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session?.user) {
    return (
      <View style={[styles.container, styles.content]}>
        <Stack.Screen options={{ title: T.app_title }} />
        <Text style={styles.h2}>Please sign in.</Text>
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
        <Stack.Screen options={{ title: T.app_title }} />
        <Text style={styles.h2}>Choose a household</Text>
        {orgs === null ? (
          <ActivityIndicator />
        ) : orgs.length === 0 ? (
          <Text style={styles.muted}>
            You aren’t a member of any organization yet.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {orgs.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => router.replace(`/calendar?org=${o.id}`)}
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
        <Stack.Screen options={{ title: T.app_title }} />
        <Text style={styles.error}>
          You are not a member of that organization.
        </Text>
        <Pressable
          onPress={() => router.replace("/calendar")}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnText}>{T.back}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: selectedOrg?.name ?? T.app_title,
          headerLeft: () => (
            <Pressable
              onPress={() => router.replace("/")}
              style={({ pressed }) => [
                { paddingHorizontal: 8 },
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={{ color: "#2563eb", fontWeight: "600" }}>
                {T.back}
              </Text>
            </Pressable>
          ),
        }}
      />
      <CalendarScreen
        organizationId={selectedOrgId}
        organizationName={selectedOrg?.name}
      />
    </>
  );
}
