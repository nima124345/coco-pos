/**
 * Per-menu access control for MANAGER accounts.
 *
 * ADMIN always has full access (permissions map is ignored). STAFF use the
 * separate /staff app. MANAGER is an admin-panel user whose access to each
 * admin menu is described by a {menuKey: level} map stored as JSON on the User
 * row (User.permissions).
 *
 * Three levels per menu:
 *   - NONE  : menu hidden, page blocked
 *   - VIEW  : can open the page, read-only (edit controls hidden)
 *   - EDIT  : full access to that page
 */

export type PermissionLevel = "NONE" | "VIEW" | "EDIT";

export type MenuKey =
  | "dashboard"
  | "income"
  | "expenses"
  | "menu"
  | "staff"
  | "promotions"
  | "inventory"
  | "orders"
  | "customers";

export type PermissionMap = Partial<Record<MenuKey, PermissionLevel>>;

export interface AdminMenu {
  key: MenuKey;
  href: string;
  label: string;
  icon: string;
}

/** Single source of truth for the admin menus (sidebar + permission matrix). */
export const ADMIN_MENUS: AdminMenu[] = [
  { key: "dashboard", href: "/admin", label: "แดชบอร์ด", icon: "📊" },
  { key: "income", href: "/admin/income", label: "รายรับ", icon: "💰" },
  { key: "expenses", href: "/admin/expenses", label: "รายจ่าย", icon: "💸" },
  { key: "menu", href: "/admin/menu", label: "จัดการเมนู", icon: "🍹" },
  { key: "staff", href: "/admin/staff", label: "พนักงาน", icon: "👥" },
  { key: "promotions", href: "/admin/promotions", label: "โปรโมชั่น", icon: "🏷️" },
  { key: "inventory", href: "/admin/inventory", label: "สต็อก", icon: "📦" },
  { key: "orders", href: "/admin/orders", label: "ออเดอร์ทั้งหมด", icon: "📋" },
  { key: "customers", href: "/admin/customers", label: "ลูกค้า", icon: "🧑‍💼" },
];

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  NONE: "ไม่ให้เข้า",
  VIEW: "ดูอย่างเดียว",
  EDIT: "ดู + แก้ไข",
};

/** Parse the JSON string stored on User.permissions into a typed map. */
export function parsePermissions(raw: string | null | undefined): PermissionMap {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: PermissionMap = {};
    for (const m of ADMIN_MENUS) {
      const v = obj[m.key];
      if (v === "VIEW" || v === "EDIT" || v === "NONE") out[m.key] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Serialize a permission map to the JSON string stored on User.permissions. */
export function serializePermissions(map: PermissionMap): string {
  const clean: PermissionMap = {};
  for (const m of ADMIN_MENUS) {
    const v = map[m.key];
    if (v === "VIEW" || v === "EDIT") clean[m.key] = v; // NONE = omit
  }
  return JSON.stringify(clean);
}

/** Map a pathname to its admin menu key (longest-prefix match). */
export function menuKeyForPath(pathname: string): MenuKey | null {
  // "/admin" must match exactly — every admin path starts with it.
  if (pathname === "/admin") return "dashboard";
  let best: AdminMenu | null = null;
  for (const m of ADMIN_MENUS) {
    if (m.key === "dashboard") continue;
    if (pathname === m.href || pathname.startsWith(m.href + "/")) {
      if (!best || m.href.length > best.href.length) best = m;
    }
  }
  return best?.key ?? null;
}

/**
 * Resolve the effective access level for a role + permission map on a menu.
 * ADMIN is always EDIT. MANAGER falls back to NONE for unlisted menus.
 */
export function levelFor(
  role: string | null | undefined,
  permissions: PermissionMap | null | undefined,
  menu: MenuKey
): PermissionLevel {
  if (role === "ADMIN") return "EDIT";
  if (role === "MANAGER") return permissions?.[menu] ?? "NONE";
  return "NONE";
}

export function canView(
  role: string | null | undefined,
  permissions: PermissionMap | null | undefined,
  menu: MenuKey
): boolean {
  const lvl = levelFor(role, permissions, menu);
  return lvl === "VIEW" || lvl === "EDIT";
}

export function canEdit(
  role: string | null | undefined,
  permissions: PermissionMap | null | undefined,
  menu: MenuKey
): boolean {
  return levelFor(role, permissions, menu) === "EDIT";
}
