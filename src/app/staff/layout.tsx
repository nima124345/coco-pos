"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import BranchSwitcher from "@/components/BranchSwitcher";

const baseNavItems = [
  { href: "/staff", label: "สั่งซื้อ", icon: "🛒" },
  { href: "/staff/orders", label: "ประวัติ", icon: "📋" },
  { href: "/staff/shift", label: "กะการทำงาน", icon: "⏰" },
];

const boothNavItem = { href: "/staff/booth-summary", label: "สรุปบูธ", icon: "🎪" };

export default function StaffLayout({
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
    } else if (!hasContext) {
      router.push("/");
    }
  }, [user, hasContext, router]);

  const staffNavItems = currentBoothEventId
    ? [...baseNavItems, boothNavItem]
    : baseNavItems;

  if (!user || !hasContext) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shadow-sm gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-green-100 shadow-sm shrink-0">
            <Image
              src="/coco-zone-logo.jpg"
              alt="Coco Zone"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 hidden xs:block sm:block">
            <h1 className="font-bold text-slate-900 leading-tight text-sm sm:text-base">Coco Zone</h1>
            <p className="text-[11px] text-slate-500 truncate">พนักงาน: {user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <BranchSwitcher variant="header" />
          <nav className="hidden md:flex gap-1 bg-slate-100 rounded-xl p-1">
            {staffNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/30"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer min-h-11"
            aria-label="ออกจากระบบ"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            <span className="hidden sm:inline">ออก</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar — fixed, only on phones */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex gap-1 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {staffNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all min-h-12",
                active
                  ? "bg-green-50 text-green-700"
                  : "text-slate-500 hover:bg-slate-50 active:bg-slate-100"
              )}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
