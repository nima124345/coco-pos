"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import {
  canEdit,
  canView,
  levelFor,
  menuKeyForPath,
  type MenuKey,
  type PermissionLevel,
} from "@/lib/permissions";

export interface MenuAccess {
  level: PermissionLevel;
  canView: boolean;
  canEdit: boolean;
}

/**
 * Access level for the current admin menu (or an explicit `menu`), derived from
 * the logged-in user's role + permission map.
 *
 * ADMIN is always full access. MANAGER is governed by their permission map.
 * Paths outside the admin menu map resolve to full access (no gating).
 */
export function useMenuAccess(menu?: MenuKey): MenuAccess {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const key = menu ?? menuKeyForPath(pathname ?? "");
  const role = user?.role;
  const perms = user?.permissions;

  if (!key) return { level: "EDIT", canView: true, canEdit: true };

  return {
    level: levelFor(role, perms, key),
    canView: canView(role, perms, key),
    canEdit: canEdit(role, perms, key),
  };
}
