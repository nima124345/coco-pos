"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "sidebar" | "header";
}

export default function BranchSwitcher({ variant = "header" }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<{
    mode: "BRANCH" | "BOOTH";
    id: string;
  } | null>(null);
  const [tab, setTab] = useState<"BRANCH" | "BOOTH">("BRANCH");
  const branches = useAuthStore((s) => s.availableBranches);
  const boothEvents = useAuthStore((s) => s.availableBoothEvents);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const currentBoothEventId = useAuthStore((s) => s.currentBoothEventId);
  const setBranchContext = useAuthStore((s) => s.setBranchContext);
  const setBoothContext = useAuthStore((s) => s.setBoothContext);
  const shiftId = useAuthStore((s) => s.shiftId);
  const cart = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  const isInBoothMode = !!currentBoothEventId;
  const currentBranch = branches.find((b) => b.id === currentBranchId);
  const currentBooth = boothEvents.find((b) => b.id === currentBoothEventId);

  const totalOptions = branches.length + boothEvents.length;
  if (totalOptions === 0) return null;

  const needsConfirm = !!shiftId || cart.length > 0;

  const doSwitch = (mode: "BRANCH" | "BOOTH", id: string) => {
    clearCart();
    if (mode === "BRANCH") setBranchContext(id);
    else setBoothContext(id);
    setOpen(false);
    setConfirming(null);
    if (typeof window !== "undefined") window.location.reload();
  };

  const handleSelect = (mode: "BRANCH" | "BOOTH", id: string) => {
    const isSame =
      (mode === "BRANCH" && id === currentBranchId) ||
      (mode === "BOOTH" && id === currentBoothEventId);
    if (isSame) {
      setOpen(false);
      return;
    }
    if (needsConfirm) {
      setConfirming({ mode, id });
    } else {
      doSwitch(mode, id);
    }
  };

  const openPicker = () => {
    setTab(isInBoothMode ? "BOOTH" : "BRANCH");
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={openPicker}
        className={cn(
          "flex items-center gap-2 cursor-pointer transition-all",
          variant === "sidebar"
            ? cn(
                "w-full px-3 py-2.5 rounded-xl border",
                isInBoothMode
                  ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100 hover:border-orange-300"
                  : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 hover:border-green-300"
              )
            : "px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-green-300 shadow-sm"
        )}
        title="เปลี่ยนสาขา/บูธ"
      >
        <span className="text-lg">{isInBoothMode ? "🎪" : "🏪"}</span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold leading-none">
            {isInBoothMode ? "บูธ" : "สาขา"}
          </p>
          <p className="text-sm font-bold text-slate-900 truncate leading-tight mt-0.5">
            {isInBoothMode
              ? currentBooth?.name ?? "ยังไม่ได้เลือก"
              : currentBranch?.name ?? "ยังไม่ได้เลือก"}
          </p>
        </div>
        {totalOptions > 1 && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400"
          >
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => {
              setOpen(false);
              setConfirming(null);
            }}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {confirming ? "ยืนยันการเปลี่ยน" : "เปลี่ยนสาขา / บูธ"}
              </h3>
              {confirming && (
                <p className="text-sm text-amber-600 mt-1">
                  ⚠️ {shiftId && "คุณยังเปิดกะอยู่"}
                  {shiftId && cart.length > 0 && " และ"}
                  {cart.length > 0 && `มีสินค้าในตะกร้า ${cart.length} รายการ`}
                  <br />
                  การเปลี่ยนจะล้างตะกร้าและออกจากกะปัจจุบัน
                </p>
              )}
            </div>

            {!confirming ? (
              <>
                <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-4">
                  <button
                    onClick={() => setTab("BRANCH")}
                    disabled={branches.length === 0}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                      tab === "BRANCH"
                        ? "bg-white text-green-700 shadow-sm"
                        : "text-slate-500"
                    )}
                  >
                    🏪 สาขาประจำ ({branches.length})
                  </button>
                  <button
                    onClick={() => setTab("BOOTH")}
                    disabled={boothEvents.length === 0}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                      tab === "BOOTH"
                        ? "bg-white text-orange-700 shadow-sm"
                        : "text-slate-500"
                    )}
                  >
                    🎪 ออกบูธ ({boothEvents.length})
                  </button>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {tab === "BRANCH" ? (
                    branches.length === 0 ? (
                      <p className="text-center text-sm text-slate-400 py-4">
                        คุณยังไม่ได้กำหนดสาขาประจำ
                      </p>
                    ) : (
                      branches.map((b) => {
                        const isActive = b.id === currentBranchId;
                        return (
                          <button
                            key={b.id}
                            onClick={() => handleSelect("BRANCH", b.id)}
                            className={cn(
                              "w-full p-3 rounded-2xl border-2 text-left cursor-pointer flex items-center gap-3",
                              isActive
                                ? "bg-green-50 border-green-500"
                                : "bg-white border-slate-200 hover:border-green-300 hover:bg-green-50/40"
                            )}
                          >
                            <span className="text-2xl">🏪</span>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">
                                {b.name}
                              </p>
                            </div>
                            {isActive && (
                              <span className="text-green-600 font-bold">✓</span>
                            )}
                          </button>
                        );
                      })
                    )
                  ) : boothEvents.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-4">
                      ตอนนี้ยังไม่มีบูธที่เปิดอยู่
                    </p>
                  ) : (
                    boothEvents.map((b) => {
                      const isActive = b.id === currentBoothEventId;
                      return (
                        <button
                          key={b.id}
                          onClick={() => handleSelect("BOOTH", b.id)}
                          className={cn(
                            "w-full p-3 rounded-2xl border-2 text-left cursor-pointer flex items-center gap-3",
                            isActive
                              ? "bg-orange-50 border-orange-500"
                              : "bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/40"
                          )}
                        >
                          <span className="text-2xl">🎪</span>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">
                              {b.name}
                            </p>
                            {b.location && (
                              <p className="text-xs text-slate-500">
                                {b.location}
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <span className="text-orange-600 font-bold">✓</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => doSwitch(confirming.mode, confirming.id)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  ยืนยันเปลี่ยน
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
