import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import UpcomingBookingsScreen from "@/src/lib/calendar/UpcomingBookingsScreen";
import { styles } from "@/src/lib/calendar/styles";
import { useT } from "@/src/lib/calendar/i18n";
import { useSession } from "@/src/lib/auth-client";
import { useActiveOrg } from "@/src/lib/useActiveOrg";

export default function UpcomingRoute() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const signedIn = !!session?.user;
  const { activeOrgId, isPending: orgPending } = useActiveOrg(signedIn);
  const T = useT();

  if (isPending) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!signedIn) {
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

  if (!activeOrgId) {
    return (
      <View style={[styles.container, styles.content]}>
        {orgPending ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={styles.muted}>{T.no_active_organization}</Text>
            <Pressable
              onPress={() => router.replace("/")}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            >
              <Text style={styles.btnText}>{T.menu_account}</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return <UpcomingBookingsScreen organizationId={activeOrgId} />;
}
