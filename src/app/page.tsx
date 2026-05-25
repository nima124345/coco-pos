"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore, AuthBranch, AuthBoothEvent } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LoginResponse {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "STAFF";
  branches: AuthBranch[];
  boothEvents: AuthBoothEvent[];
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regRole, setRegRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<LoginResponse | null>(null);
  const [contextTab, setContextTab] = useState<"BRANCH" | "BOOTH">("BRANCH");
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setBranches = useAuthStore((s) => s.setBranches);
  const setBoothEvents = useAuthStore((s) => s.setBoothEvents);
  const setBranchContext = useAuthStore((s) => s.setBranchContext);
  const setBoothContext = useAuthStore((s) => s.setBoothContext);

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
    });
    setBranches(data.branches);
    setBoothEvents(data.boothEvents);
    if (mode === "BRANCH") setBranchContext(contextId);
    else setBoothContext(contextId);
    router.push(data.role === "ADMIN" ? "/admin" : "/staff");
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
      const noBooths = loginData.boothEvents.length === 0;
      const noBranches = loginData.branches.length === 0;

      // Auto-select if user has exactly 1 branch and no booths available
      if (loginData.branches.length === 1 && noBooths) {
        finalize(loginData, "BRANCH", loginData.branches[0].id);
        return;
      }

      // Default tab: prefer branch if available, else booth
      setContextTab(noBranches ? "BOOTH" : "BRANCH");
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <aside className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-gradient-to-br from-lime-400 via-green-500 to-emerald-700 p-12 items-center justify-center">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-lime-300/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-[28rem] h-[28rem] bg-emerald-400/30 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="mx-auto w-52 h-52 rounded-[2rem] overflow-hidden shadow-2xl shadow-emerald-900/40 ring-4 ring-white/40 mb-10">
            <Image
              src="/coco-zone-logo.jpg"
              alt="Coco Zone"
              width={208}
              height={208}
              priority
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow">
            Coco Zone
          </h1>
          <p className="text-green-50/90 text-lg mb-10">
            ระบบจัดการร้านน้ำปั่น + ออกบูธ
          </p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🏪", label: "หลายสาขา" },
              { icon: "🎪", label: "ออกบูธ" },
              { icon: "📊", label: "รายงาน" },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20"
              >
                <div className="text-3xl mb-1">{f.icon}</div>
                <div className="text-xs text-white/90 font-medium">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Coco Zone POS
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-lime-50 via-white to-emerald-50" />

        <div className="relative w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden shadow-lg ring-2 ring-green-200 mb-4">
              <Image
                src="/coco-zone-logo.jpg"
                alt="Coco Zone"
                width={96}
                height={96}
                priority
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Coco Zone</h1>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium mb-4 border border-green-100">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              ระบบพร้อมใช้งาน
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {mode === "login" ? "ยินดีต้อนรับกลับ 👋" : "สมัครสมาชิก 📝"}
            </h2>
            <p className="text-slate-500">
              {mode === "login"
                ? "กรอกข้อมูลเพื่อเข้าใช้งานระบบ POS"
                : "สร้างบัญชีใหม่เพื่อเข้าใช้งานระบบ"}
            </p>
          </div>

          {mode === "login" ? (
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
                  <Input
                    placeholder="กรอกชื่อผู้ใช้"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    className="h-12 rounded-2xl border-slate-200 focus:border-green-500 focus:ring-green-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">รหัสผ่าน</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-11 h-12 rounded-2xl border-slate-200 focus:border-green-500 focus:ring-green-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-2xl">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-green-500/30"
                  disabled={loading}
                >
                  {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ →"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  ยังไม่มีบัญชี?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="text-green-600 hover:text-green-700 font-semibold cursor-pointer"
                  >
                    สมัครสมาชิก
                  </button>
                </p>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px bg-slate-200 flex-1" />
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                    บัญชีทดสอบ
                  </span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fillDemo("admin")}
                    className="text-left p-3 rounded-2xl border border-slate-200 hover:border-green-300 hover:bg-green-50/50 cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      👑 Admin
                    </div>
                    <code className="text-[11px] text-slate-500 font-mono">
                      admin / 1234
                    </code>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo("staff")}
                    className="text-left p-3 rounded-2xl border border-slate-200 hover:border-green-300 hover:bg-green-50/50 cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      🧑‍💼 Staff
                    </div>
                    <code className="text-[11px] text-slate-500 font-mono">
                      staff / 1234
                    </code>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">ชื่อ-นามสกุล</label>
                  <Input
                    placeholder="กรอกชื่อ-นามสกุล"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    autoFocus
                    className="h-12 rounded-2xl border-slate-200 focus:border-green-500 focus:ring-green-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
                  <Input
                    placeholder="กรอกชื่อผู้ใช้ (อย่างน้อย 3 ตัวอักษร)"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200 focus:border-green-500 focus:ring-green-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">สิทธิ์การใช้งาน</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegRole("ADMIN")}
                      className={cn(
                        "p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all",
                        regRole === "ADMIN"
                          ? "border-amber-400 bg-amber-50 shadow-md shadow-amber-500/10"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="text-lg mb-1">👑</div>
                      <div className="text-sm font-bold text-slate-900">Admin</div>
                      <div className="text-[11px] text-slate-500">จัดการระบบทั้งหมด</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole("STAFF")}
                      className={cn(
                        "p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all",
                        regRole === "STAFF"
                          ? "border-green-400 bg-green-50 shadow-md shadow-green-500/10"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="text-lg mb-1">🧑‍💼</div>
                      <div className="text-sm font-bold text-slate-900">Staff</div>
                      <div className="text-[11px] text-slate-500">พนักงานขายหน้าร้าน</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">รหัสผ่าน</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="กรอกรหัสผ่าน (อย่างน้อย 4 ตัวอักษร)"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="pr-11 h-12 rounded-2xl border-slate-200 focus:border-green-500 focus:ring-green-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่าน</label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="h-12 rounded-2xl border-slate-200 focus:border-green-500 focus:ring-green-500/20"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-2xl">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-600 text-sm p-3.5 rounded-2xl">
                    {success}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-green-500/30"
                  disabled={loading}
                >
                  {loading ? "กำลังสมัคร..." : "สมัครสมาชิก →"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  มีบัญชีแล้ว?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-green-600 hover:text-green-700 font-semibold cursor-pointer"
                  >
                    เข้าสู่ระบบ
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {pendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setPendingUser(null)}
          />
          <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-3xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div
              className={cn(
                "px-8 py-6 border-b border-slate-100 bg-gradient-to-br transition-colors",
                contextTab === "BRANCH"
                  ? "from-green-50 to-emerald-50"
                  : "from-orange-50 to-amber-50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    สวัสดีคุณ {pendingUser.name}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    เลือกที่จะทำงาน
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    เลือกสาขาประจำ หรือบูธที่กำลังเปิดอยู่
                  </p>
                </div>
                <button
                  onClick={() => setPendingUser(null)}
                  className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center shrink-0 transition-colors"
                  aria-label="ปิด"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 sm:px-8 pt-5">
              <div className="flex gap-2 bg-slate-100 rounded-2xl p-1.5">
                <button
                  onClick={() => setContextTab("BRANCH")}
                  disabled={pendingUser.branches.length === 0}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm sm:text-base font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                    contextTab === "BRANCH"
                      ? "bg-white text-green-700 shadow-md shadow-green-500/10"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <span className="text-lg">🏪</span>
                  สาขาประจำ
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      contextTab === "BRANCH"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {pendingUser.branches.length}
                  </span>
                </button>
                <button
                  onClick={() => setContextTab("BOOTH")}
                  disabled={pendingUser.boothEvents.length === 0}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm sm:text-base font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                    contextTab === "BOOTH"
                      ? "bg-white text-orange-700 shadow-md shadow-orange-500/10"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <span className="text-lg">🎪</span>
                  ออกบูธ
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      contextTab === "BOOTH"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {pendingUser.boothEvents.length}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5">
              {contextTab === "BRANCH" ? (
                pendingUser.branches.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-3">🏪</div>
                    <p className="text-slate-500 font-medium">
                      คุณยังไม่ได้กำหนดสาขาประจำ
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      ติดต่อแอดมินเพื่อเพิ่มสาขา
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingUser.branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => finalize(pendingUser, "BRANCH", b.id)}
                        className="group p-5 rounded-2xl border-2 text-left cursor-pointer bg-white border-slate-200 hover:border-green-400 hover:bg-green-50/40 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl shadow-md shadow-green-500/30 shrink-0">
                            🏪
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {b.name}
                            </p>
                            {b.isDefault && (
                              <span className="inline-block mt-1 text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                ⭐ ค่าเริ่มต้น
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end text-sm font-medium text-slate-400 group-hover:text-green-600 transition-colors">
                          เลือกสาขานี้ →
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : pendingUser.boothEvents.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">🎪</div>
                  <p className="text-slate-500 font-medium">
                    ตอนนี้ยังไม่มีบูธที่เปิดอยู่
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    แอดมินสามารถเปิดบูธใหม่ได้ที่หน้าจัดการ
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingUser.boothEvents.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => finalize(pendingUser, "BOOTH", b.id)}
                      className="group p-5 rounded-2xl border-2 text-left cursor-pointer bg-white border-slate-200 hover:border-orange-400 hover:bg-orange-50/40 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-2xl shadow-md shadow-orange-500/30 shrink-0">
                          🎪
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {b.name}
                          </p>
                          {b.location && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              📍 {b.location}
                            </p>
                          )}
                          {b.status === "PLANNED" && (
                            <span className="inline-block mt-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              📅 วางแผน
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end text-sm font-medium text-slate-400 group-hover:text-orange-600 transition-colors">
                        เลือกบูธนี้ →
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setPendingUser(null)}
                className="w-full text-sm font-medium text-slate-600 hover:text-slate-900 py-2 cursor-pointer"
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
