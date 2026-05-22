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
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingMenu ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">ชื่อเมนู</label>
                <Input
                  placeholder="เช่น ชาไทยปั่น"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    🏪 ราคาหน้าร้าน
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={menuPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMenuPrice(v);
                      if (!shopeePriceTouched) setMenuShopeePrice(v);
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    🛍️ ราคา Shopee
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={menuShopeePrice}
                    onChange={(e) => {
                      setMenuShopeePrice(e.target.value);
                      setShopeePriceTouched(true);
                    }}
                    className={
                      menuShopeePrice &&
                      menuPrice &&
                      parseFloat(menuShopeePrice) !== parseFloat(menuPrice)
                        ? "border-orange-300 bg-orange-50/50"
                        : ""
                    }
                  />
                </div>
                {menuPrice && (
                  <p className="col-span-2 text-[11px] text-slate-500">
                    {!shopeePriceTouched
                      ? "↳ ราคา Shopee จะ auto-fill ตามหน้าร้าน (แก้ได้)"
                      : menuShopeePrice &&
                          parseFloat(menuShopeePrice) > parseFloat(menuPrice)
                        ? `🛍️ Shopee แพงกว่า ฿${(parseFloat(menuShopeePrice) - parseFloat(menuPrice)).toFixed(2)}`
                        : menuShopeePrice &&
                            parseFloat(menuShopeePrice) < parseFloat(menuPrice)
                          ? `⚠️ Shopee ถูกกว่าหน้าร้าน`
                          : "ราคาเท่ากันทั้ง 2 ช่องทาง"}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">หมวดหมู่</label>
                <select
                  value={menuCategoryId}
                  onChange={(e) => setMenuCategoryId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleAddMenu}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                {editingMenu ? "บันทึกการแก้ไข" : "เพิ่มเมนู"}
              </Button>
              {editingMenu && (
                <Button
                  onClick={() => {
                    setEditingMenu(null);
                    setMenuName("");
                    setMenuPrice("");
                    setMenuShopeePrice("");
                    setShopeePriceTouched(false);
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  ยกเลิก
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="col-span-2">
            <div className="bg-white rounded-2xl border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 text-sm font-medium text-slate-500">
                      เมนู
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-slate-500">
                      หมวดหมู่
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-slate-500">
                      🏪 หน้าร้าน
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-slate-500">
                      🛍️ Shopee
                    </th>
                    <th className="text-center p-3 text-sm font-medium text-slate-500">
                      สถานะ
                    </th>
                    <th className="text-center p-3 text-sm font-medium text-slate-500">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const effectiveShopee =
                      item.shopeePrice > 0 ? item.shopeePrice : item.price;
                    const sameAsStore = effectiveShopee === item.price;
                    return (
                      <tr key={item.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-sm text-slate-500">
                          {item.category?.emoji} {item.category?.name}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`font-bold ${sameAsStore ? "text-slate-400" : "text-orange-600"}`}
                          >
                            {formatCurrency(effectiveShopee)}
                          </span>
                          {sameAsStore ? (
                            <span className="ml-1 text-[10px] text-slate-400">
                              (เท่ากัน)
                            </span>
                          ) : (
                            <span
                              className={`ml-1 text-[10px] ${effectiveShopee > item.price ? "text-orange-500" : "text-red-500"}`}
                            >
                              {effectiveShopee > item.price ? "+" : ""}
                              {(effectiveShopee - item.price).toFixed(0)}฿
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={item.active ? "success" : "destructive"}
                          >
                            {item.active ? "ขายอยู่" : "ปิด"}
                          </Badge>
                        </td>
                        <td className="p-3 text-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingMenu(item);
                              setMenuName(item.name);
                              setMenuPrice(String(item.price));
                              setMenuShopeePrice(
                                String(
                                  item.shopeePrice > 0
                                    ? item.shopeePrice
                                    : item.price
                                )
                              );
                              setShopeePriceTouched(
                                item.shopeePrice > 0 &&
                                  item.shopeePrice !== item.price
                              );
                              setMenuCategoryId(item.categoryId);
                            }}
                            className="text-blue-500 hover:text-blue-700 text-sm cursor-pointer"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteMenu(item.id)}
                            className="text-red-400 hover:text-red-600 text-sm cursor-pointer"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "toppings" && (
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>เพิ่มท็อปปิ้ง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">ชื่อท็อปปิ้ง</label>
                <Input
                  placeholder="เช่น ไข่มุก"
                  value={toppingName}
                  onChange={(e) => setToppingName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">ราคา (บาท)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={toppingPrice}
                  onChange={(e) => setToppingPrice(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAddTopping}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                เพิ่มท็อปปิ้ง
              </Button>
            </CardContent>
          </Card>

          <div className="col-span-2">
            <div className="grid grid-cols-2 gap-3">
              {toppings.map((t) => (
                <Card key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-amber-600 font-bold">
                      +{formatCurrency(t.price)}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`/api/menu/toppings?id=${t.id}`, {
                        method: "DELETE",
                      });
                      loadData();
                    }}
                    className="text-red-400 hover:text-red-600 text-sm cursor-pointer"
                  >
                    ลบ
                  </button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "categories" && (
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>เพิ่มหมวดหมู่</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">ชื่อหมวดหมู่</label>
                <Input
                  placeholder="เช่น กาแฟ"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Emoji</label>
                <Input
                  placeholder="เช่น ☕"
                  value={catEmoji}
                  onChange={(e) => setCatEmoji(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAddCategory}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                เพิ่มหมวดหมู่
              </Button>
            </CardContent>
          </Card>

          <div className="col-span-2">
            <div className="grid grid-cols-3 gap-3">
              {categories.map((cat) => (
                <Card key={cat.id} className="p-4 text-center">
                  <div className="text-3xl mb-2">{cat.emoji}</div>
                  <p className="font-medium">{cat.name}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
