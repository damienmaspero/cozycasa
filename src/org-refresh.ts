/**
 * Decide whether the cached organization data must be refetched after a render.
 *
 * better-auth's `useListOrganizations` / `useActiveOrganization` queries are
 * keyed on their own signals (org create/delete/update, set-active) and are
 * *not* tied to the session signal, so they keep returning the previous user's
 * cached data when the signed-in user changes without a full reload (e.g. sign
 * out, then sign in as someone else). Without a refetch the new user would see
 * an organization they don't belong to. We refetch whenever the signed-in user
 * id changes to a new, defined value (the very first defined id included, so a
 * remount that reuses a stale module-level cache is also corrected).
 */
export function shouldRefetchOrgsOnUserChange(
  previousUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!currentUserId) return false;
  return previousUserId !== currentUserId;
}
