"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Shift {
  id: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  cashDifference: number | null;
  note: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  staff: { name: string };
  _count: { orders: number };
}

interface CashMovement {
  id: string;
  type: string; // IN | OUT
  amount: number;
  reason: string;
  createdAt: string;
}

export default function StaffShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shiftError, setShiftError] = useState("");

  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [moveType, setMoveType] = useState<"IN" | "OUT" | null>(null);
  const [moveAmount, setMoveAmount] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [moveError, setMoveError] = useState("");
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  const user = useAuthStore((s) => s.user);
  const setShiftId = useAuthStore((s) => s.setShiftId);

  const loadMovements = useCallback(async (shiftId: string) => {
    try {
      const res = await apiFetch(`/api/shifts/cash-movement?shiftId=${shiftId}`);
      if (res.ok) setMovements(await res.json());
    } catch {
      /* ignore — movements are supplementary */
    }
  }, []);

  const loadShifts = useCallback(async () => {
    if (!user) return;
    const res = await apiFetch(`/api/shifts?staffId=${user.id}`);
    const data = await res.json();
    setShifts(data);

    const openShift = data.find((s: Shift) => s.status === "OPEN");
    if (openShift) {
      setCurrentShift(openShift);
      setShiftId(openShift.id);
      loadMovements(openShift.id);
    } else {
      setMovements([]);
    }
  }, [user, setShiftId, loadMovements]);

  const submitMovement = async () => {
    if (!currentShift || !moveType || moveSubmitting) return;
    const amt = parseFloat(moveAmount);
    if (!amt || amt <= 0) {
      setMoveError("จำนวนเงินต้องมากกว่า 0");
      return;
    }
    setMoveSubmitting(true);
    setMoveError("");
    try {
      const res = await apiFetch("/api/shifts/cash-movement", {
        method: "POST",
        body: JSON.stringify({
          shiftId: currentShift.id,
          type: moveType,
          amount: amt,
          reason: moveReason,
        }),
      });
      if (res.ok) {
        setMoveType(null);
        setMoveAmount("");
        setMoveReason("");
        loadMovements(currentShift.id);
      } else {
        const data = await res.json().catch(() => ({}));
        setMoveError(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch {
      setMoveError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setMoveSubmitting(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const handleOpenShift = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    setShiftError("");
    try {
      const res = await apiFetch("/api/shifts", {
        method: "POST",
        body: JSON.stringify({
          staffId: user.id,
          openingCash: parseFloat(openingCash) || 0,
        }),
      });

      if (res.ok) {
        const shift = await res.json();
        setShiftId(shift.id);
        setOpeningCash("");
        loadShifts();
      } else {
        const data = await res.json().catch(() => ({}));
        setShiftError(data.error || "เปิดกะไม่สำเร็จ กรุณาลองใหม่");
      }
    } catch {
      setShiftError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift || submitting) return;
    setSubmitting(true);
    setShiftError("");
    try {
      const res = await apiFetch("/api/shifts", {
        method: "PUT",
        body: JSON.stringify({
          shiftId: currentShift.id,
          closingCash: parseFloat(closingCash) || 0,
          note: closeNote,
        }),
      });

      if (res.ok) {
        setShiftId(null);
        setCurrentShift(null);
        setClosingCash("");
        setCloseNote("");
        loadShifts();
      } else {
        const data = await res.json().catch(() => ({}));
        setShiftError(data.error || "ปิดกะไม่สำเร็จ กรุณาลองใหม่");
      }
    } catch {
      setShiftError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">กะการทำงาน</h2>

      {/* Open/Close Shift */}
      {!currentShift ? (
        <Card>
          <CardHeader>
            <CardTitle>เปิดกะใหม่</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">
                เงินทอนเปิดร้าน (บาท)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="text-xl font-bold"
              />
            </div>
            {shiftError && (
              <p className="text-sm font-medium text-red-600">{shiftError}</p>
            )}
            <Button
              onClick={handleOpenShift}
              disabled={submitting}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              size="lg"
            >
              {submitting ? "กำลังเปิดกะ..." : "เปิดกะ"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-700">
                กะปัจจุบัน (เปิดอยู่)
              </CardTitle>
              <Badge variant="success">OPEN</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4">
                <p className="text-sm text-slate-500">เปิดกะเมื่อ</p>
                <p className="font-bold">{formatDate(currentShift.openedAt)}</p>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-sm text-slate-500">เงินทอนเปิดร้าน</p>
                <p className="font-bold text-lg">
                  {formatCurrency(currentShift.openingCash)}
                </p>
              </div>
            </div>

            <hr className="border-green-200" />

            {/* Cash in / out of the drawer during the shift */}
            <div>
              <h4 className="font-semibold mb-2">เงินเข้า-ออกลิ้นชัก</h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setMoveType("IN");
                    setMoveError("");
                  }}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  + เงินเข้า
                </Button>
                <Button
                  onClick={() => {
                    setMoveType("OUT");
                    setMoveError("");
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  − เงินออก (จ่ายของ)
                </Button>
              </div>

              {moveType && (
                <div className="bg-white rounded-xl p-3 space-y-2 mt-3">
                  <p className="text-sm font-medium">
                    {moveType === "IN" ? "บันทึกเงินเข้า" : "บันทึกเงินออก"}
                  </p>
                  <Input
                    type="number"
                    placeholder="จำนวนเงิน (บาท)"
                    value={moveAmount}
                    onChange={(e) => setMoveAmount(e.target.value)}
                  />
                  <Input
                    placeholder="เหตุผล (เช่น ซื้อน้ำแข็ง, ทอนเงิน)"
                    value={moveReason}
                    onChange={(e) => setMoveReason(e.target.value)}
                  />
                  {moveError && (
                    <p className="text-sm text-red-600">{moveError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={submitMovement}
                      disabled={moveSubmitting}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      {moveSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                    </Button>
                    <Button
                      onClick={() => {
                        setMoveType(null);
                        setMoveAmount("");
                        setMoveReason("");
                        setMoveError("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              )}

              {movements.length > 0 && (
                <div className="space-y-1 mt-3">
                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2"
                    >
                      <span className="text-slate-600 truncate">
                        {m.type === "IN" ? "เงินเข้า" : "เงินออก"}
                        {m.reason ? ` • ${m.reason}` : ""}
                      </span>
                      <span
                        className={`font-semibold shrink-0 ml-2 ${
                          m.type === "IN" ? "text-blue-600" : "text-orange-600"
                        }`}
                      >
                        {m.type === "IN" ? "+" : "−"}
                        {formatCurrency(m.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-green-200" />

            <h4 className="font-semibold">ปิดกะ</h4>
            <div>
              <label className="text-sm font-medium text-slate-700">
                เงินสดในลิ้นชัก (บาท)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="text-xl font-bold"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                หมายเหตุ
              </label>
              <Textarea
                placeholder="หมายเหตุ (ถ้ามี)"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
              />
            </div>
            {shiftError && (
              <p className="text-sm font-medium text-red-600">{shiftError}</p>
            )}
            <Button
              onClick={handleCloseShift}
              disabled={submitting}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {submitting ? "กำลังปิดกะ..." : "ปิดกะ"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Shift History */}
      <div>
        <h3 className="text-lg font-bold mb-3">ประวัติกะ</h3>
        <div className="space-y-3">
          {shifts
            .filter((s) => s.status === "CLOSED")
            .map((shift) => (
              <Card key={shift.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{formatDate(shift.openedAt)}</p>
                    <p className="text-sm text-slate-500">
                      ปิดกะ: {shift.closedAt ? formatDate(shift.closedAt) : "-"}
                    </p>
                  </div>
                  <Badge variant="outline">{shift._count.orders} ออเดอร์</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-xs text-slate-500">เงินเปิดร้าน</p>
                    <p className="font-bold text-sm">
                      {formatCurrency(shift.openingCash)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-xs text-slate-500">เงินที่ควรมี</p>
                    <p className="font-bold text-sm">
                      {formatCurrency(shift.expectedCash || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2">
                    <p className="text-xs text-slate-500">เงินจริง</p>
                    <p className="font-bold text-sm">
                      {formatCurrency(shift.closingCash || 0)}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-2 ${
                      (shift.cashDifference || 0) >= 0
                        ? "bg-green-50"
                        : "bg-red-50"
                    }`}
                  >
                    <p className="text-xs text-slate-500">ส่วนต่าง</p>
                    <p
                      className={`font-bold text-sm ${
                        (shift.cashDifference || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(shift.cashDifference || 0)}
                    </p>
                  </div>
                </div>
                {shift.note && (
                  <p className="text-sm text-slate-500 mt-2">
                    หมายเหตุ: {shift.note}
                  </p>
                )}
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
