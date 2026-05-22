"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import BranchSwitcher from "@/components/BranchSwitcher";

const adminNavItems = [
  { href: "/admin", label: "แดชบอร์ด", icon: "📊" },
  { href: "/admin/branches", label: "สาขาประจำ", icon: "🏪" },
  { href: "/admin/booths", label: "ออกบูธ", icon: "🎪" },
  { href: "/admin/expenses", label: "รายจ่าย", icon: "💸" },
  { href: "/admin/menu", label: "จัดการเมนู", icon: "🍹" },
  { href: "/admin/staff", label: "พนักงาน", icon: "👥" },
  { href: "/admin/promotions", label: "โปรโมชั่น", icon: "🏷️" },
  { href: "/admin/inventory", label: "สต็อก", icon: "📦" },
  { href: "/admin/orders", label: "ออเดอร์ทั้งหมด", icon: "📋" },
];

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

  useEffect(() => {
    if (!user) {
      router.push("/");
    } else if (user.role !== "ADMIN") {
      router.push("/staff");
    } else if (!hasContext) {
      router.push("/");
    }
  }, [user, hasContext, router]);

  if (!user || user.role !== "ADMIN" || !hasContext) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-green-100 shadow-sm">
              <Image
                src="/coco-zone-logo.jpg"
                alt="Coco Zone"
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Coco Zone</h1>
              <p className="text-[11px] text-green-600 font-medium uppercase tracking-wider">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 pt-3">
          <BranchSwitcher variant="sidebar" />
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {adminNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
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
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
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

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
