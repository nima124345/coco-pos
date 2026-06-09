"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import BranchSwitcher from "@/components/BranchSwitcher";
import { ADMIN_MENUS, canView, menuKeyForPath } from "@/lib/permissions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const hasContext = !!(currentBranchId || currentBoothEventId);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
      return () => unsub();
    }
  }, []);

  const isAdminPanelUser = user?.role === "ADMIN" || user?.role === "MANAGER";

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push("/");
    } else if (!isAdminPanelUser) {
      router.push("/staff");
    } else if (!hasContext) {
      router.push("/");
    }
  }, [user, hasContext, router, hydrated, isAdminPanelUser]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (!hydrated || !user || !isAdminPanelUser || !hasContext) return null;

  // Sidebar: ADMIN sees every menu; MANAGER sees only menus they can view.
  const navItems = ADMIN_MENUS.filter((m) =>
    user.role === "ADMIN" ? true : canView(user.role, user.permissions, m.key)
  );

  // Page gating: a MANAGER may only open mapped menus they can view. Unmapped
  // admin pages (e.g. /admin/branches) are blocked for managers entirely.
  const currentMenu = menuKeyForPath(pathname);
  const pageBlocked =
    user.role === "MANAGER" &&
    (!currentMenu || !canView(user.role, user.permissions, currentMenu));

  return (
    <div className="min-h-screen md:flex md:h-screen md:overflow-hidden bg-slate-50">
      {/* Mobile top bar — visible below md */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 shadow-sm">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-11 h-11 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
          aria-label="เปิดเมนู"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg overflow-hidden ring-2 ring-green-100 shrink-0">
            <Image
              src="/coco-zone-logo.jpg"
              alt="Coco Zone"
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 text-sm leading-tight truncate">Coco Zone</h1>
            <p className="text-[10px] text-green-600 font-medium uppercase tracking-wider">Admin</p>
          </div>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col",
          // Mobile: drawer sliding from left
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] transform transition-transform duration-200 ease-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
          // iPad+: static sidebar
          "md:relative md:translate-x-0 md:w-64 md:max-w-none md:transition-none md:z-auto"
        )}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-green-100 shadow-sm shrink-0">
              <Image
                src="/coco-zone-logo.jpg"
                alt="Coco Zone"
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 leading-tight">Coco Zone</h1>
              <p className="text-[11px] text-green-600 font-medium uppercase tracking-wider">
                Admin Panel
              </p>
            </div>
          </div>
          {/* Close button on mobile only */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="md:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
            aria-label="ปิดเมนู"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-3 pt-3">
          <BranchSwitcher variant="sidebar" />
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all min-h-11",
                  active
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/30"
                    : "text-slate-600 hover:bg-green-50 hover:text-green-700"
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-slate-50">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500">
                {user.role === "MANAGER" ? "Manager" : "Administrator"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="w-full flex items-center gap-2 px-3 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer min-h-11"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0 md:h-screen">
        {pageBlocked ? (
          <div className="flex h-full min-h-[60vh] items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                🔒
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                ไม่มีสิทธิ์เข้าถึงหน้านี้
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                บัญชีของคุณไม่ได้รับสิทธิ์ให้เข้าเมนูนี้ กรุณาติดต่อแอดมินหากต้องการสิทธิ์เพิ่มเติม
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
