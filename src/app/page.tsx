"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore, AuthBranch, AuthBoothEvent } from "@/store/auth";
import type { PermissionMap } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Store,
  Tent,
  Check,
  X,
  ChevronRight,
  User,
  Lock,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

interface LoginResponse {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  permissions?: PermissionMap;
  branches: AuthBranch[];
  boothEvents: AuthBoothEvent[];
}

const FEATURES = [
  { icon: Store, label: "หลายสาขา", desc: "ดูแลทุกสาขาในที่เดียว" },
  { icon: Tent, label: "ออกบูธ", desc: "เปิดรอบขายนอกสถานที่" },
  { icon: BarChart3, label: "รายงานยอดขาย", desc: "สรุปยอดแบบเรียลไทม์" },
];

// ใช้ซ้ำกับทุก input ในหน้านี้ — โทน stone + โฟกัสเขียวแบรนด์
const fieldClass =
  "h-12 rounded-xl border-stone-200 bg-white pl-11 text-[15px] text-stone-900 placeholder:text-stone-400 focus:border-[#1f7d3b] focus:ring-[#1f7d3b]/15";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regRole, setRegRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [regBranchIds, setRegBranchIds] = useState<string[]>([]);
  const [allBranches, setAllBranches] = useState<{ id: string; name: string }[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<LoginResponse | null>(null);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setBranches = useAuthStore((s) => s.setBranches);
  const setBoothEvents = useAuthStore((s) => s.setBoothEvents);
  const setBranchContext = useAuthStore((s) => s.setBranchContext);
  const setBoothContext = useAuthStore((s) => s.setBoothContext);

  useEffect(() => {
    if (mode === "register" && allBranches.length === 0) {
      fetch("/api/branches")
        .then((r) => r.json())
        .then((data) => setAllBranches(data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))))
        .catch(() => {});
    }
  }, [mode, allBranches.length]);

  const finalize = (
    data: LoginResponse,
    mode: "BRANCH" | "BOOTH",
    contextId: string
  ) => {
    setUser({
      id: data.id,
      name: data.name,
      username: data.username,
      role: data.role,
      permissions: data.permissions,
    });
    setBranches(data.branches);
    setBoothEvents(data.boothEvents);
    // ADMIN and MANAGER both use the admin panel; STAFF uses the staff app.
    const usesAdminPanel = data.role === "ADMIN" || data.role === "MANAGER";
    if (mode === "BRANCH") {
      setBranchContext(contextId);
      router.push(usesAdminPanel ? "/admin" : "/staff");
    } else {
      setBoothContext(contextId);
      router.push(usesAdminPanel ? "/admin" : "/staff/booth-summary");
    }
  };

  const handleStartBooth = async () => {
    if (!pendingUser) return;
    setLoading(true);
    try {
      const res = await fetch("/api/booth-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          status: "ACTIVE",
        }),
      });
      const booth = await res.json();
      finalize(pendingUser, "BOOTH", booth.id);
    } catch {
      setError("ไม่สามารถสร้างบูธได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data: LoginResponse | { error: string } = await res.json();

      if (!res.ok) {
        setError("error" in data ? data.error : "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      const loginData = data as LoginResponse;

      if (loginData.branches.length === 1) {
        finalize(loginData, "BRANCH", loginData.branches[0].id);
        return;
      }

      setPendingUser(loginData);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (regPassword !== regConfirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          username: regUsername,
          password: regPassword,
          role: regRole,
          branchIds: regBranchIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "สมัครสมาชิกไม่สำเร็จ");
        return;
      }

      setSuccess("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ");
      setRegName("");
      setRegUsername("");
      setRegPassword("");
      setRegConfirmPassword("");
      setRegRole("STAFF");
      setRegBranchIds([]);
      setTimeout(() => {
        setMode("login");
        setUsername(data.username);
        setSuccess("");
      }, 1500);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  const fillDemo = (role: "admin" | "staff") => {
    setUsername(role);
    setPassword("1234");
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* ── แผงแบรนด์ (แท็บเล็ตขึ้นไป) ─────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-[#0c2716] p-8 md:flex md:w-[44%] lg:w-[46%] lg:p-12 xl:p-14">
        {/* texture: จุดละเอียดให้พื้นมีมิติ ไม่เรียบจนแบน */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* กรอบเส้นบางแบบ editorial */}
        <div aria-hidden className="absolute inset-6 rounded-[1.75rem] border border-white/[0.07]" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between">
          {/* แบรนด์มาร์ก */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-xl shadow-sm ring-1 ring-white/15">
              <Image
                src="/coco-zone-logo.jpg"
                alt="Coco Zone"
                width={44}
                height={44}
                priority
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="font-semibold leading-none tracking-tight text-white">Coco Zone</p>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-lime-300/80">
                POS System
              </p>
            </div>
          </div>

          {/* พาดหัว + ฟีเจอร์ ดันลงล่าง */}
          <div className="mt-auto pt-12">
            <h2 className="text-[2rem] font-bold leading-[1.06] tracking-tight text-white lg:text-[2.6rem]">
              ขายหน้าร้าน
              <br />
              ออกบูธ
              <br />
              <span className="text-lime-300">จบในระบบเดียว</span>
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/55">
              ระบบจัดการร้านน้ำปั่น Coco Zone ดูแลหลายสาขาและการออกบูธ
              พร้อมสรุปยอดขายแบบเรียลไทม์
            </p>

            <div className="mt-10 max-w-sm divide-y divide-white/10 border-y border-white/10">
              {FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-4 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-lime-300 ring-1 ring-white/10">
                    <f.icon size={17} strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{f.label}</p>
                    <p className="text-xs text-white/45">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-white/35">
            © {new Date().getFullYear()} Coco Zone POS
          </p>
        </div>
      </aside>

      {/* ── ฟอร์ม ─────────────────────────────────────────── */}
      <main className="relative flex flex-1 items-center justify-center bg-[#f6f4ec] px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          {/* แบรนด์มาร์ก (มือถือ) */}
          <div className="mb-9 flex items-center gap-3 md:hidden">
            <div className="h-11 w-11 overflow-hidden rounded-xl shadow-sm ring-1 ring-stone-200">
              <Image
                src="/coco-zone-logo.jpg"
                alt="Coco Zone"
                width={44}
                height={44}
                priority
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="font-semibold leading-none tracking-tight text-stone-900">Coco Zone</p>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-[#1f7d3b]">
                POS System
              </p>
            </div>
          </div>

          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1f7d3b]">
              {mode === "login" ? "เข้าใช้งานระบบ" : "เปิดบัญชีใหม่"}
            </p>
            <h1 className="mt-2 text-[27px] font-bold tracking-tight text-stone-900">
              {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </h1>
            <p className="mt-1.5 text-[14px] text-stone-500">
              {mode === "login"
                ? "กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเริ่มงาน"
                : "สร้างบัญชีพนักงานเพื่อเข้าใช้งานระบบ"}
            </p>
          </div>

          {mode === "login" ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                    ชื่อผู้ใช้
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      strokeWidth={1.75}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <Input
                      placeholder="กรอกชื่อผู้ใช้"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      strokeWidth={1.75}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(fieldClass, "pr-11")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-stone-400 transition-colors hover:text-stone-700"
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border-l-2 border-red-400 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="group mt-1 h-12 w-full rounded-xl bg-[#1f7d3b] text-[15px] font-semibold text-white shadow-sm hover:bg-[#1a6c33] disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
                  {!loading && (
                    <ArrowRight
                      size={18}
                      className="ml-1.5 transition-transform group-hover:translate-x-0.5"
                    />
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-[14px] text-stone-500">
                ยังไม่มีบัญชี?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="cursor-pointer font-semibold text-[#1f7d3b] hover:underline"
                >
                  สมัครสมาชิก
                </button>
              </p>

              {process.env.NODE_ENV === "development" && (
                <div className="mt-9">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-stone-200" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
                      บัญชีทดสอบ
                    </span>
                    <div className="h-px flex-1 bg-stone-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => fillDemo("admin")}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white/60 p-3 text-left transition-colors hover:border-[#1f7d3b]/40 hover:bg-[#1f7d3b]/[0.04]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                        <ShieldCheck size={16} strokeWidth={1.75} />
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold text-stone-700">Admin</div>
                        <code className="font-mono text-[11px] text-stone-400">admin / 1234</code>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemo("staff")}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white/60 p-3 text-left transition-colors hover:border-[#1f7d3b]/40 hover:bg-[#1f7d3b]/[0.04]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                        <User size={16} strokeWidth={1.75} />
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold text-stone-700">Staff</div>
                        <code className="font-mono text-[11px] text-stone-400">staff / 1234</code>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                    ชื่อ-นามสกุล
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      strokeWidth={1.75}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <Input
                      placeholder="กรอกชื่อ-นามสกุล"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      autoFocus
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                    ชื่อผู้ใช้
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      strokeWidth={1.75}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <Input
                      placeholder="อย่างน้อย 3 ตัวอักษร"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white/60 p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                    <User size={17} strokeWidth={1.75} />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-stone-900">บัญชีพนักงาน (Staff)</div>
                    <div className="text-[11px] leading-snug text-stone-500">
                      สิทธิ์แอดมินต้องให้แอดมินที่มีอยู่เป็นผู้เพิ่มให้
                    </div>
                  </div>
                </div>

                {allBranches.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                      สาขาที่ประจำ
                    </label>
                    <div className="space-y-2">
                      {allBranches.map((b) => {
                        const active = regBranchIds.includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() =>
                              setRegBranchIds((prev) =>
                                prev.includes(b.id)
                                  ? prev.filter((id) => id !== b.id)
                                  : [...prev, b.id]
                              )
                            }
                            className={cn(
                              "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                              active
                                ? "border-[#1f7d3b] bg-[#1f7d3b]/[0.05]"
                                : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                active
                                  ? "border-[#1f7d3b] bg-[#1f7d3b] text-white"
                                  : "border-stone-300"
                              )}
                            >
                              {active && <Check size={13} strokeWidth={3} />}
                            </span>
                            <Store size={16} strokeWidth={1.75} className="text-stone-400" />
                            <span className="text-[14px] font-medium text-stone-900">{b.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[11px] text-stone-400">เลือกได้หลายสาขา (ไม่เลือกก็ได้)</p>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      strokeWidth={1.75}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="อย่างน้อย 4 ตัวอักษร"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className={cn(fieldClass, "pr-11")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-stone-400 transition-colors hover:text-stone-700"
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      strokeWidth={1.75}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border-l-2 border-red-400 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border-l-2 border-[#1f7d3b] bg-[#1f7d3b]/[0.06] px-3.5 py-3 text-[13px] text-[#1a6c33]">
                    {success}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="group mt-1 h-12 w-full rounded-xl bg-[#1f7d3b] text-[15px] font-semibold text-white shadow-sm hover:bg-[#1a6c33] disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? "กำลังสมัคร…" : "สมัครสมาชิก"}
                  {!loading && (
                    <ArrowRight
                      size={18}
                      className="ml-1.5 transition-transform group-hover:translate-x-0.5"
                    />
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-[14px] text-stone-500">
                มีบัญชีแล้ว?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="cursor-pointer font-semibold text-[#1f7d3b] hover:underline"
                >
                  เข้าสู่ระบบ
                </button>
              </p>
            </>
          )}
        </div>
      </main>

      {/* ── เลือกบริบทการทำงาน (สาขา / บูธ) ────────────────── */}
      {pendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-stone-900/55 backdrop-blur-sm"
            onClick={() => setPendingUser(null)}
          />
          <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl">
            <div className="border-b border-stone-100 bg-[#f6f4ec] px-8 py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    สวัสดีคุณ {pendingUser.name}
                  </p>
                  <h3 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-[28px]">
                    เลือกที่จะทำงาน
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">เลือกสาขาประจำ หรือกดออกบูธ</p>
                </div>
                <button
                  onClick={() => setPendingUser(null)}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
                  aria-label="ปิด"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="px-6 pt-5 sm:px-8">
              <div className="flex gap-2 rounded-xl bg-stone-100 p-1.5">
                <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-[#1a6c33] shadow-sm sm:text-base">
                  <Store size={18} strokeWidth={1.9} />
                  สาขาประจำ
                  <span className="rounded-full bg-[#1f7d3b]/10 px-2 py-0.5 text-xs font-bold text-[#1a6c33]">
                    {pendingUser.branches.length}
                  </span>
                </div>
                <button
                  onClick={handleStartBooth}
                  disabled={loading}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#bb5e2c] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a4521f] disabled:opacity-50 sm:text-base"
                >
                  <Tent size={18} strokeWidth={1.9} />
                  {loading ? "กำลังเข้า…" : "ออกบูธ"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
              {pendingUser.branches.length === 0 ? (
                <div className="py-16 text-center">
                  <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                    <Store size={26} strokeWidth={1.6} />
                  </span>
                  <p className="font-medium text-stone-600">คุณยังไม่ได้กำหนดสาขาประจำ</p>
                  <p className="mt-1 text-sm text-stone-400">ติดต่อแอดมินเพื่อเพิ่มสาขา</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pendingUser.branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => finalize(pendingUser, "BRANCH", b.id)}
                      className="group flex items-center gap-3.5 rounded-xl border border-stone-200 p-4 text-left transition-all hover:border-[#1f7d3b]/50 hover:bg-[#1f7d3b]/[0.03]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f7d3b] text-white">
                        <Store size={20} strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-stone-900">{b.name}</p>
                        {b.isDefault && (
                          <span className="mt-1 inline-block rounded-full bg-[#1f7d3b]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1a6c33]">
                            ค่าเริ่มต้น
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        size={18}
                        className="shrink-0 text-stone-300 transition-colors group-hover:text-[#1f7d3b]"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 bg-stone-50 px-6 py-4 sm:px-8">
              <button
                onClick={() => setPendingUser(null)}
                className="w-full cursor-pointer py-2 text-sm font-medium text-stone-500 hover:text-stone-900"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
