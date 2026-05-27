import { Alert, Platform } from "react-native";

// Cross-platform alert + confirm helpers. RN web shims `Alert.alert` but only
// renders the first button as a window.alert; we use the native window APIs on
// web for proper confirm dialogs and full RN Alert on iOS/Android.

export function notify(message: string, title = ""): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message);
    return;
  }
  Alert.alert(title || message, title ? message : undefined);
}

export function ask(message: string, title = ""): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return Promise.resolve(false);
    return Promise.resolve(window.confirm(message));
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title || message, title ? message : undefined, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", onPress: () => resolve(true) },
    ]);
  });
}
