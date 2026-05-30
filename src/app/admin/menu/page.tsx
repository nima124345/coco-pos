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
  image: string;
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
  const [menuImage, setMenuImage] = useState("");
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
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
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
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
    } finally {
      setLoading(false);
    }
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

    let imageUrl = menuImage;
    if (menuImageFile) {
      setImageUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", menuImageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url || "";
        }
      } catch {
        // upload not supported in this environment
      }
      setImageUploading(false);
    }

    if (editingMenu) {
      await fetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMenu.id,
          name: menuName,
          price,
          shopeePrice,
          image: imageUrl,
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
          image: imageUrl,
          categoryId: menuCategoryId,
        }),
      });
    }
    setMenuName("");
    setMenuPrice("");
    setMenuShopeePrice("");
    setShopeePriceTouched(false);
    setMenuImage("");
    setMenuImageFile(null);
    setShowMenuModal(false);
    loadData();
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm('ยืนยันการลบเมนูนี้?')) return;
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

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">จัดการเมนูและท็อปปิ้ง</h1>

      {/* Tab Navigation + Add Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
          <Button
            onClick={() => { setEditingMenu(null); setMenuName(""); setMenuPrice(""); setMenuShopeePrice(""); setShopeePriceTouched(false); setMenuImage(""); setMenuImageFile(null); setShowMenuModal(true); }}
            className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/30 text-base"
          >
            + เพิ่มเมนูใหม่
          </Button>
        )}
        {tab === "toppings" && (
          <Button
            onClick={() => { setToppingName(""); setToppingPrice(""); setShowToppingModal(true); }}
            className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/30 text-base"
          >
            + เพิ่มท็อปปิ้ง
          </Button>
        )}
        {tab === "categories" && (
          <Button
            onClick={() => { setCatName(""); setCatEmoji(""); setShowCategoryModal(true); }}
            className="h-12 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/30 text-base"
          >
            + เพิ่มหมวดหมู่
          </Button>
        )}
      </div>

      {tab === "menu" && (() => {
        const totalItems = items.length;
        const activeItems = items.filter((i) => i.active).length;
        const avgStorePrice = totalItems > 0 ? items.reduce((s, i) => s + i.price, 0) / totalItems : 0;
        const avgShopeePrice = totalItems > 0
          ? items.reduce((s, i) => s + (i.shopeePrice > 0 ? i.shopeePrice : i.price), 0) / totalItems
          : 0;
        return (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-slate-500 mb-1">เมนูทั้งหมด</p>
                <p className="text-2xl font-bold text-slate-900">
                  {totalItems} <span className="text-sm font-normal text-slate-400">รายการ</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-slate-500 mb-1">เมนูที่ขายอยู่</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeItems} <span className="text-sm font-normal text-slate-400">/ {totalItems}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-slate-500 mb-1">🏪 ราคาเฉลี่ยหน้าร้าน</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(avgStorePrice)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-slate-500 mb-1">🛍️ ราคาเฉลี่ย Shopee</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(avgShopeePrice)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {items.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                ยังไม่มีเมนู
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const effectiveShopee = item.shopeePrice > 0 ? item.shopeePrice : item.price;
                  const sameAsStore = effectiveShopee === item.price;
                  return (
                    <li
                      key={item.id}
                      className="group grid grid-cols-[1fr_auto_auto] md:grid-cols-[1.5fr_9rem_6rem_8rem_5rem_5rem] items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">{item.category?.emoji || "🍹"}</span>
                          </div>
                        )}
                        <span className="font-medium truncate">{item.name}</span>
                      </div>
                      <span className="hidden md:block text-sm text-slate-500 truncate">
                        {item.category?.emoji} {item.category?.name}
                      </span>
                      <span className="hidden md:block text-right font-bold text-amber-600 tabular-nums">
                        {formatCurrency(item.price)}
                      </span>
                      <div className="hidden md:flex flex-col items-end">
                        <span className={`font-bold tabular-nums ${sameAsStore ? "text-slate-400" : "text-orange-600"}`}>
                          {formatCurrency(effectiveShopee)}
                        </span>
                        {sameAsStore ? (
                          <span className="text-[10px] text-slate-400">(เท่ากัน)</span>
                        ) : (
                          <span className={`text-[10px] ${effectiveShopee > item.price ? "text-orange-500" : "text-red-500"}`}>
                            {effectiveShopee > item.price ? "+" : ""}{(effectiveShopee - item.price).toFixed(0)}฿
                          </span>
                        )}
                      </div>
                      <div className="hidden md:flex justify-center">
                        <Badge variant={item.active ? "success" : "destructive"}>{item.active ? "ขายอยู่" : "ปิด"}</Badge>
                      </div>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingMenu(item);
                            setMenuName(item.name);
                            setMenuPrice(String(item.price));
                            setMenuShopeePrice(String(item.shopeePrice > 0 ? item.shopeePrice : item.price));
                            setShopeePriceTouched(item.shopeePrice > 0 && item.shopeePrice !== item.price);
                            setMenuCategoryId(item.categoryId);
                            setMenuImage(item.image || "");
                            setMenuImageFile(null);
                            setShowMenuModal(true);
                          }}
                          aria-label="แก้ไขเมนู"
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer flex items-center justify-center"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(item.id)}
                          aria-label="ลบเมนู"
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-center"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
        );
      })()}

      {tab === "toppings" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {toppings.map((t) => (
              <Card key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-amber-600 font-bold">+{formatCurrency(t.price)}</p>
                </div>
                <button
                  onClick={async () => { if (!confirm('ยืนยันการลบท็อปปิ้งนี้?')) return; await fetch(`/api/menu/toppings?id=${t.id}`, { method: "DELETE" }); loadData(); }}
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
                <label className="text-sm font-medium text-slate-700">รูปภาพเมนู</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer flex-shrink-0">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-400 transition-colors flex items-center justify-center overflow-hidden bg-slate-50">
                      {(menuImageFile || menuImage) ? (
                        <img
                          src={menuImageFile ? URL.createObjectURL(menuImageFile) : menuImage}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <svg className="w-6 h-6 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                          </svg>
                          <span className="text-[10px] text-slate-400 mt-1">เพิ่มรูป</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setMenuImageFile(file);
                        }
                      }}
                    />
                  </label>
                  {(menuImageFile || menuImage) && (
                    <button
                      type="button"
                      onClick={() => { setMenuImageFile(null); setMenuImage(""); }}
                      className="text-sm text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      ลบรูป
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">ชื่อเมนู</label>
                <Input placeholder="เช่น มะพร้าวปั่น" value={menuName} onChange={(e) => setMenuName(e.target.value)} autoFocus className="h-11 rounded-xl" />
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
              <Button onClick={handleAddMenu} disabled={imageUploading} className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 disabled:opacity-50">
                {imageUploading ? "กำลังอัปโหลด..." : editingMenu ? "บันทึกการแก้ไข" : "เพิ่มเมนู"}
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
