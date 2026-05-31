import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  organization,
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from "@/src/lib/auth-client";
import { shouldRefetchOrgsOnUserChange } from "@/src/org-refresh";

export type Org = { id: string; name: string; slug: string };

export interface UseActiveOrgResult {
  /** The user's member organizations, or `null` while still loading. */
  orgs: Org[] | null;
  /** The id of the active organization, or `null` when none is selected. */
  activeOrgId: string | null;
  /** True while either the org list or the active org is still loading. */
  isPending: boolean;
  /** Switch the active organization (persisted server-side on the session). */
  setActiveOrg: (organizationId: string) => Promise<void>;
}

/**
 * Shared source of truth for the active organization. Wraps better-auth's
 * `useActiveOrganization` / `useListOrganizations` hooks and the
 * `organization.setActive()` action, and adds two behaviours:
 *
 * - Bootstrap: when the user belongs to exactly one organization and none is
 *   active yet, that organization is selected automatically (mirrors the old
 *   single-org auto-redirect).
 * - Self-healing: if the active organization is no longer one the user is a
 *   member of (e.g. membership revoked), the selection is cleared so the UI
 *   can re-prompt.
 *
 * The selection lives on the better-auth session, so it persists across
 * reloads and is shared by every screen (web and native alike).
 */
export function useActiveOrg(enabled: boolean = true): UseActiveOrgResult {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const {
    data: list,
    isPending: listPending,
    refetch: refetchList,
  } = useListOrganizations();
  const {
    data: active,
    isPending: activePending,
    refetch: refetchActive,
  } = useActiveOrganization();

  // Self-heal stale caches when the signed-in user changes. The better-auth
  // org/active-org queries are not invalidated on sign-in/sign-out, so without
  // this the new user would keep seeing the previous user's organizations (see
  // `shouldRefetchOrgsOnUserChange`).
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!shouldRefetchOrgsOnUserChange(lastUserIdRef.current, userId)) return;
    lastUserIdRef.current = userId;
    void refetchList?.();
    void refetchActive?.();
  }, [userId, refetchList, refetchActive]);

  const orgs = useMemo<Org[] | null>(
    () => (list ? (list as Org[]) : null),
    [list],
  );

  const activeOrgId = useMemo<string | null>(() => {
    const id = (active as { id?: string } | null)?.id ?? null;
    if (!id) return null;
    // Guard against a stale active id pointing at an org the user left.
    if (orgs && !orgs.some((o) => o.id === id)) return null;
    return id;
  }, [active, orgs]);

  const setActiveOrg = useCallback(async (organizationId: string) => {
    await organization.setActive({ organizationId });
  }, []);

  // Bootstrap: auto-select the only organization when nothing is active yet.
  // A ref guards against repeatedly firing while the set-active request is in
  // flight (the hooks re-render before the session reflects the change).
  const autoSelecting = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (activeOrgId) return;
    if (!orgs || orgs.length !== 1) return;
    if (autoSelecting.current) return;
    const only = orgs[0];
    if (!only) return;
    autoSelecting.current = true;
    void setActiveOrg(only.id).finally(() => {
      autoSelecting.current = false;
    });
  }, [enabled, activeOrgId, orgs, setActiveOrg]);

  return {
    orgs,
    activeOrgId,
    isPending: listPending || activePending,
    setActiveOrg,
  };
}
