"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  shopeePrice: number;
  categoryId: string;
  active: boolean;
  category: Category;
}

interface Topping {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [tab, setTab] = useState<"menu" | "toppings" | "categories">("menu");

  // Menu form
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuShopeePrice, setMenuShopeePrice] = useState("");
  const [shopeePriceTouched, setShopeePriceTouched] = useState(false);
  const [menuCategoryId, setMenuCategoryId] = useState("");
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);

  // Topping form
  const [toppingName, setToppingName] = useState("");
  const [toppingPrice, setToppingPrice] = useState("");

  // Category form
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("");

  // Modals
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showToppingModal, setShowToppingModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const loadData = useCallback(async () => {
    const [menuRes, catRes, topRes] = await Promise.all([
      fetch("/api/menu"),
      fetch("/api/categories"),
      fetch("/api/menu/toppings"),
    ]);
    setItems(await menuRes.json());
    const catData = await catRes.json();
    setCategories(catData);
    if (catData.length > 0 && !menuCategoryId) setMenuCategoryId(catData[0].id);
    setToppings(await topRes.json());
  }, [menuCategoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddMenu = async () => {
    if (!menuName || !menuPrice) return;
    const price = parseFloat(menuPrice);
    const shopeePrice = menuShopeePrice
      ? parseFloat(menuShopeePrice)
      : price;
    if (editingMenu) {
      await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMenu.id,
          name: menuName,
          price,
          shopeePrice,
          categoryId: menuCategoryId,
        }),
      });
      setEditingMenu(null);
    } else {
      await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: menuName,
          price,
          shopeePrice,
          categoryId: menuCategoryId,
        }),
      });
    }
    setMenuName("");
    setMenuPrice("");
    setMenuShopeePrice("");
    setShopeePriceTouched(false);
    setShowMenuModal(false);
    loadData();
  };

  const handleDeleteMenu = async (id: string) => {
    await fetch(`/api/menu?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const handleAddTopping = async () => {
    if (!toppingName || !toppingPrice) return;
    await fetch("/api/menu/toppings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: toppingName,
        price: parseFloat(toppingPrice),
      }),
    });
    setToppingName("");
    setToppingPrice("");
    setShowToppingModal(false);
    loadData();
  };

  const handleAddCategory = async () => {
    if (!catName) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName, emoji: catEmoji || "🍹" }),
    });
    setCatName("");
    setCatEmoji("");
    setShowCategoryModal(false);
    loadData();
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">จัดการเมนูและท็อปปิ้ง</h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border w-fit">
        {[
          { value: "menu" as const, label: "เมนู" },
          { value: "toppings" as const, label: "ท็อปปิ้ง" },
          { value: "categories" as const, label: "หมวดหมู่" },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              tab === t.value
                ? "bg-amber-500 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "menu" && (
        <>
          <div className="flex justify-end">
            <Button
              onClick={() => { setEditingMenu(null); setMenuName(""); setMenuPrice(""); setMenuShopeePrice(""); setShopeePriceTouched(false); setShowMenuModal(true); }}
              className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/30 text-base"
            >
              + เพิ่มเมนูใหม่
            </Button>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-sm font-medium text-slate-500">เมนู</th>
                  <th className="text-left p-3 text-sm font-medium text-slate-500">หมวดหมู่</th>
                  <th className="text-right p-3 text-sm font-medium text-slate-500">🏪 หน้าร้าน</th>
                  <th className="text-right p-3 text-sm font-medium text-slate-500">🛍️ Shopee</th>
                  <th className="text-center p-3 text-sm font-medium text-slate-500">สถานะ</th>
                  <th className="text-center p-3 text-sm font-medium text-slate-500">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const effectiveShopee = item.shopeePrice > 0 ? item.shopeePrice : item.price;
                  const sameAsStore = effectiveShopee === item.price;
                  return (
                    <tr key={item.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-sm text-slate-500">{item.category?.emoji} {item.category?.name}</td>
                      <td className="p-3 text-right font-bold text-amber-600">{formatCurrency(item.price)}</td>
                      <td className="p-3 text-right">
                        <span className={`font-bold ${sameAsStore ? "text-slate-400" : "text-orange-600"}`}>{formatCurrency(effectiveShopee)}</span>
                        {sameAsStore ? (
                          <span className="ml-1 text-[10px] text-slate-400">(เท่ากัน)</span>
                        ) : (
                          <span className={`ml-1 text-[10px] ${effectiveShopee > item.price ? "text-orange-500" : "text-red-500"}`}>
                            {effectiveShopee > item.price ? "+" : ""}{(effectiveShopee - item.price).toFixed(0)}฿
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={item.active ? "success" : "destructive"}>{item.active ? "ขายอยู่" : "ปิด"}</Badge>
                      </td>
                      <td className="p-3 text-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingMenu(item);
                            setMenuName(item.name);
                            setMenuPrice(String(item.price));
                            setMenuShopeePrice(String(item.shopeePrice > 0 ? item.shopeePrice : item.price));
                            setShopeePriceTouched(item.shopeePrice > 0 && item.shopeePrice !== item.price);
                            setMenuCategoryId(item.categoryId);
                            setShowMenuModal(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 text-sm cursor-pointer"
                        >
                          แก้ไข
                        </button>
                        <button onClick={() => handleDeleteMenu(item.id)} className="text-red-400 hover:text-red-600 text-sm cursor-pointer">ลบ</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "toppings" && (
        <>
          <div className="flex justify-end">
            <Button
              onClick={() => { setToppingName(""); setToppingPrice(""); setShowToppingModal(true); }}
              className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/30 text-base"
            >
              + เพิ่มท็อปปิ้ง
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {toppings.map((t) => (
              <Card key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-amber-600 font-bold">+{formatCurrency(t.price)}</p>
                </div>
                <button
                  onClick={async () => { await fetch(`/api/menu/toppings?id=${t.id}`, { method: "DELETE" }); loadData(); }}
                  className="text-red-400 hover:text-red-600 text-sm cursor-pointer"
                >
                  ลบ
                </button>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "categories" && (
        <>
          <div className="flex justify-end">
            <Button
              onClick={() => { setCatName(""); setCatEmoji(""); setShowCategoryModal(true); }}
              className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/30 text-base"
            >
              + เพิ่มหมวดหมู่
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <Card key={cat.id} className="p-4 text-center">
                <div className="text-3xl mb-2">{cat.emoji}</div>
                <p className="font-medium">{cat.name}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMenuModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{editingMenu ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{editingMenu ? "แก้ไขรายละเอียดเมนู" : "เพิ่มเมนูเครื่องดื่มใหม่"}</p>
                </div>
                <button onClick={() => setShowMenuModal(false)} className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อเมนู</label>
                <Input placeholder="เช่น ชาไทยปั่น" value={menuName} onChange={(e) => setMenuName(e.target.value)} autoFocus className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">🏪 ราคาหน้าร้าน</label>
                  <Input type="number" placeholder="0" value={menuPrice} onChange={(e) => { const v = e.target.value; setMenuPrice(v); if (!shopeePriceTouched) setMenuShopeePrice(v); }} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">🛍️ ราคา Shopee</label>
                  <Input
                    type="number" placeholder="0" value={menuShopeePrice}
                    onChange={(e) => { setMenuShopeePrice(e.target.value); setShopeePriceTouched(true); }}
                    className={`h-11 rounded-xl ${menuShopeePrice && menuPrice && parseFloat(menuShopeePrice) !== parseFloat(menuPrice) ? "border-orange-300 bg-orange-50/50" : ""}`}
                  />
                </div>
                {menuPrice && (
                  <p className="col-span-2 text-[11px] text-slate-500">
                    {!shopeePriceTouched
                      ? "↳ ราคา Shopee จะ auto-fill ตามหน้าร้าน (แก้ได้)"
                      : menuShopeePrice && parseFloat(menuShopeePrice) > parseFloat(menuPrice)
                        ? `🛍️ Shopee แพงกว่า ฿${(parseFloat(menuShopeePrice) - parseFloat(menuPrice)).toFixed(2)}`
                        : menuShopeePrice && parseFloat(menuShopeePrice) < parseFloat(menuPrice)
                          ? `⚠️ Shopee ถูกกว่าหน้าร้าน`
                          : "ราคาเท่ากันทั้ง 2 ช่องทาง"}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">หมวดหมู่</label>
                <select value={menuCategoryId} onChange={(e) => setMenuCategoryId(e.target.value)} className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm">
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>))}
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setShowMenuModal(false)} variant="outline" className="flex-1 h-12 rounded-xl">ยกเลิก</Button>
              <Button onClick={handleAddMenu} className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30">
                {editingMenu ? "บันทึกการแก้ไข" : "เพิ่มเมนู"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Topping Modal */}
      {showToppingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowToppingModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">เพิ่มท็อปปิ้ง</h3>
                  <p className="text-sm text-slate-500 mt-0.5">เพิ่มท็อปปิ้งใหม่</p>
                </div>
                <button onClick={() => setShowToppingModal(false)} className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อท็อปปิ้ง</label>
                <Input placeholder="เช่น ไข่มุก" value={toppingName} onChange={(e) => setToppingName(e.target.value)} autoFocus className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">ราคา (บาท)</label>
                <Input type="number" placeholder="0" value={toppingPrice} onChange={(e) => setToppingPrice(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setShowToppingModal(false)} variant="outline" className="flex-1 h-12 rounded-xl">ยกเลิก</Button>
              <Button onClick={handleAddTopping} className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30">เพิ่มท็อปปิ้ง</Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">เพิ่มหมวดหมู่</h3>
                  <p className="text-sm text-slate-500 mt-0.5">เพิ่มหมวดหมู่เมนูใหม่</p>
                </div>
                <button onClick={() => setShowCategoryModal(false)} className="w-10 h-10 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-slate-700 cursor-pointer flex items-center justify-center transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อหมวดหมู่</label>
                <Input placeholder="เช่น กาแฟ" value={catName} onChange={(e) => setCatName(e.target.value)} autoFocus className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Emoji</label>
                <Input placeholder="เช่น ☕" value={catEmoji} onChange={(e) => setCatEmoji(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button onClick={() => setShowCategoryModal(false)} variant="outline" className="flex-1 h-12 rounded-xl">ยกเลิก</Button>
              <Button onClick={handleAddCategory} className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30">เพิ่มหมวดหมู่</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
