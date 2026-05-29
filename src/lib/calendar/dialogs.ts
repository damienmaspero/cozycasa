// Cross-platform alert + confirm helpers for the web app. These wrap the
// browser's native dialogs; on the server (no `window`) they are inert.

export function notify(message: string): void {
  if (typeof window !== "undefined") window.alert(message);
}

export function ask(message: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return Promise.resolve(window.confirm(message));
}
