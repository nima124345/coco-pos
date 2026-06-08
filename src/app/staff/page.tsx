"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import { useCartStore, CartTopping } from "@/store/cart";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  cn,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  shopeePrice: number;
  image: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  items: MenuItem[];
}

interface Topping {
  id: string;
  name: string;
  price: number;
}

const SWEETNESS_LEVELS = [
  { value: 0, label: "ไม่หวาน", short: "0%" },
  { value: 25, label: "หวานน้อย", short: "25%" },
  { value: 50, label: "หวานปกติ", short: "50%" },
  { value: 100, label: "หวานมาก", short: "100%" },
];

const QUICK_CASH = [50, 100, 500, 1000];

export default function StaffPOS() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [sweetness, setSweetness] = useState(100);
  const [selectedToppings, setSelectedToppings] = useState<CartTopping[]>([]);
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [channel, setChannel] = useState<"DINE_IN" | "DELIVERY" | "SHOPEE">(
    "DINE_IN"
  );
  const [shopeeOrderId, setShopeeOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);
  const [cartOpenMobile, setCartOpenMobile] = useState(false);

  const user = useAuthStore((s) => s.user);
  const shiftId = useAuthStore((s) => s.shiftId);
  const cart = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);

  const loadData = useCallback(async () => {
    const [catRes, topRes] = await Promise.all([
      apiFetch("/api/categories"),
      apiFetch("/api/menu/toppings"),
    ]);
    const catData = await catRes.json();
    const topData = await topRes.json();
    setCategories(catData);
    setToppings(topData);
    if (catData.length > 0) setActiveCategory(catData[0].id);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.id === activeCategory),
    [categories, activeCategory]
  );

  const visibleItems = useMemo(() => {
    const base = activeCategoryObj?.items ?? [];
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((i) => i.name.toLowerCase().includes(q));
  }, [activeCategoryObj, search]);

  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const itemEffectivePrice = (
    storePrice: number,
    shopeePrice: number
  ): number =>
    channel === "SHOPEE" && shopeePrice > 0 ? shopeePrice : storePrice;

  const cartEffective = useMemo(() => {
    return cart.map((item) => {
      const basePrice = itemEffectivePrice(item.price, item.shopeePrice);
      const toppingTotal = item.toppings.reduce((s, t) => s + t.price, 0);
      const effItemTotal = (basePrice + toppingTotal) * item.quantity;
      return { ...item, effPrice: basePrice, effItemTotal };
    });
  }, [cart, channel]);

  const effectiveSubTotal = cartEffective.reduce(
    (sum, i) => sum + i.effItemTotal,
    0
  );

  const selectedItemTotal = useMemo(() => {
    if (!selectedItem) return 0;
    const basePrice = itemEffectivePrice(
      selectedItem.price,
      selectedItem.shopeePrice
    );
    const toppingSum = selectedToppings.reduce((s, t) => s + t.price, 0);
    return (basePrice + toppingSum) * quantity;
  }, [selectedItem, selectedToppings, quantity, channel]);

  const openItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSweetness(100);
    setSelectedToppings([]);
    setNote("");
    setQuantity(1);
  };

  const closeItem = () => setSelectedItem(null);

  const handleAddToCart = () => {
    if (!selectedItem) return;
    addItem({
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      shopeePrice: selectedItem.shopeePrice || 0,
      quantity,
      sweetnessLevel: sweetness,
      toppings: selectedToppings,
      note,
    });
    closeItem();
  };

  const toggleTopping = (topping: Topping) => {
    setSelectedToppings((prev) => {
      const exists = prev.find((t) => t.id === topping.id);
      if (exists) return prev.filter((t) => t.id !== topping.id);
      return [
        ...prev,
        { id: topping.id, name: topping.name, price: topping.price },
      ];
    });
  };

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;

    const orderData = {
      subTotal: effectiveSubTotal,
      discount: 0,
      netTotal: effectiveSubTotal,
      paymentMethod,
      channel,
      shopeeOrderId: channel === "SHOPEE" ? shopeeOrderId.trim() : "",
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      staffId: user.id,
      shiftId: shiftId || undefined,
      items: cartEffective.map((item) => ({
        menuItemId: item.menuItemId,
        menuItemName: item.name,
        menuItemPrice: item.effPrice,
        sweetnessLevel: item.sweetnessLevel,
        quantity: item.quantity,
        itemTotal: item.effItemTotal,
        note: item.note,
        toppings: item.toppings.map((t) => ({
          toppingId: t.id,
          toppingName: t.name,
          toppingPrice: t.price,
        })),
      })),
    };

    const res = await apiFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });

    if (res.ok) {
      const order = await res.json();
      setOrderSuccess(order.orderNumber);
      clearCart();
      setShowPayment(false);
      setCashReceived("");
      setShopeeOrderId("");
      setCustomerName("");
      setCustomerPhone("");
      setChannel("DINE_IN");
      setTimeout(() => {
        setOrderSuccess(null);
        setCartOpenMobile(false);
      }, 3500);
    }
  };

  const change =
    paymentMethod === "CASH" && cashReceived
      ? parseFloat(cashReceived) - effectiveSubTotal
      : 0;

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-65px)] bg-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden min-h-[calc(100vh-65px-64px)] md:min-h-0">
        <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <Input
                placeholder="ค้นหาเมนู..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-slate-50 border-slate-200"
              />
            </div>
            <div className="text-xs text-slate-500 hidden md:block">
              {visibleItems.length} เมนูในหมวด{activeCategoryObj?.name ?? ""}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearch("");
                  }}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer",
                    active
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/30"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <span className="mr-1.5">{cat.emoji}</span>
                  {cat.name}
                  <span
                    className={cn(
                      "ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full",
                      active
                        ? "bg-white/25 text-white"
                        : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {cat.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <span className="text-5xl mb-3">🔍</span>
              <p className="font-medium">ไม่พบเมนูที่ค้นหา</p>
              <p className="text-sm">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดอื่น</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {visibleItems.map((item) => {
                const inCart = cart
                  .filter((c) => c.menuItemId === item.id)
                  .reduce((sum, c) => sum + c.quantity, 0);
                return (
                  <button
                    key={item.id}
                    onClick={() => openItem(item)}
                    className="group relative bg-white rounded-2xl p-3 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 border border-slate-200 hover:border-green-300 cursor-pointer"
                  >
                    {inCart > 0 && (
                      <span className="absolute top-2 right-2 z-10 min-w-[24px] h-6 px-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                        ×{inCart}
                      </span>
                    )}
                    <div className="w-full aspect-square bg-gradient-to-br from-lime-50 via-green-50 to-emerald-100 rounded-xl mb-3 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
                      {activeCategoryObj?.emoji || "🥤"}
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                      {item.name}
                    </h3>
                    <p className="text-emerald-600 font-bold mt-1">
                      {formatCurrency(item.price)}
                    </p>
                    {item.shopeePrice > 0 &&
                      item.shopeePrice !== item.price && (
                        <p className="text-[10px] text-orange-600 font-medium">
                          🛍️ {formatCurrency(item.shopeePrice)}
                        </p>
                      )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile cart backdrop */}
      {cartOpenMobile && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setCartOpenMobile(false)}
        />
      )}

      <aside
        className={cn(
          "bg-white flex flex-col shadow-xl",
          // Mobile: fixed bottom sheet
          "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl max-h-[92vh] transform transition-transform duration-200 ease-out",
          cartOpenMobile ? "translate-y-0" : "translate-y-full",
          // iPad+: static sidebar
          "md:relative md:translate-y-0 md:inset-auto md:w-80 lg:w-96 md:rounded-none md:max-h-none md:border-l md:border-slate-200 md:transition-none md:z-auto"
        )}
      >
        {/* Mobile grab handle */}
        <div className="md:hidden flex justify-center py-2 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="text-2xl">🛒</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                  {itemCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">รายการสั่งซื้อ</h2>
              <p className="text-xs text-slate-500">
                {cart.length > 0
                  ? `${cart.length} เมนู • ${itemCount} แก้ว`
                  : "ยังไม่มีรายการ"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && !showPayment && (
              <button
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-red-500 cursor-pointer px-2 py-1"
                title="ล้างตะกร้า"
              >
                ล้าง
              </button>
            )}
            <button
              onClick={() => setCartOpenMobile(false)}
              className="md:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              aria-label="ปิดตะกร้า"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {orderSuccess && (
          <div className="m-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-lg shadow-green-500/40 animate-pulse">
              ✓
            </div>
            <p className="font-bold text-green-800">สั่งซื้อสำเร็จ!</p>
            <p className="text-emerald-700 text-2xl font-bold mt-1">
              #{orderSuccess}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 && !orderSuccess && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-3">
                🥤
              </div>
              <p className="font-medium text-slate-500">ยังไม่มีรายการ</p>
              <p className="text-sm">เลือกเมนูเพื่อเริ่มสั่งซื้อ</p>
            </div>
          )}

          {cartEffective.map((item) => (
            <div
              key={item.cartId}
              className="bg-slate-50 rounded-xl p-3 group hover:bg-slate-100 transition-colors"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900 truncate">
                    {item.name}
                  </h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px] py-0">
                      หวาน {item.sweetnessLevel}%
                    </Badge>
                    {item.toppings.map((t) => (
                      <Badge
                        key={t.id}
                        variant="outline"
                        className="text-[10px] py-0 bg-green-50 border-green-200 text-green-700"
                      >
                        + {t.name}
                      </Badge>
                    ))}
                  </div>
                  {item.note && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md mt-1.5 inline-block">
                      📝 {item.note}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.cartId)}
                  className="w-10 h-10 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  aria-label="ลบรายการ"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200">
                  <button
                    onClick={() =>
                      updateQuantity(item.cartId, item.quantity - 1)
                    }
                    className="w-10 h-10 rounded-md hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer text-lg"
                    aria-label="ลดจำนวน"
                  >
                    −
                  </button>
                  <span className="font-bold text-base w-8 text-center text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.cartId, item.quantity + 1)
                    }
                    className="w-10 h-10 rounded-md hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer text-lg"
                    aria-label="เพิ่มจำนวน"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(item.effItemTotal)}
                  </span>
                  {channel === "SHOPEE" &&
                    item.shopeePrice > 0 &&
                    item.shopeePrice !== item.price && (
                      <p className="text-[10px] text-orange-600">
                        🛍️ ราคา Shopee
                      </p>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-slate-100 p-4 space-y-3 bg-white">
            {!showPayment ? (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>{itemCount} แก้ว</span>
                    <span>{formatCurrency(effectiveSubTotal)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">รวมทั้งหมด</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(effectiveSubTotal)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowPayment(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                  size="xl"
                >
                  ชำระเงิน
                  <svg className="ml-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Button>
              </>
            ) : (
              <>
                <div className="flex justify-between items-baseline pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900">
                    ยอดชำระ
                    {channel === "SHOPEE" && (
                      <span className="ml-1.5 text-xs font-medium text-orange-600">
                        (ราคา Shopee)
                      </span>
                    )}
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(effectiveSubTotal)}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    ช่องทางขาย
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setChannel("DINE_IN")}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl font-medium transition-all cursor-pointer border-2",
                        channel === "DINE_IN"
                          ? "bg-amber-50 border-amber-500 text-amber-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      <span className="text-xl">🏪</span>
                      <span className="text-xs">หน้าร้าน</span>
                    </button>
                    <button
                      onClick={() => setChannel("DELIVERY")}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl font-medium transition-all cursor-pointer border-2",
                        channel === "DELIVERY"
                          ? "bg-purple-50 border-purple-500 text-purple-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      <span className="text-xl">🛵</span>
                      <span className="text-xs">Delivery</span>
                    </button>
                    <button
                      onClick={() => setChannel("SHOPEE")}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl font-medium transition-all cursor-pointer border-2",
                        channel === "SHOPEE"
                          ? "bg-orange-50 border-orange-500 text-orange-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      <span className="text-xl">🛍️</span>
                      <span className="text-xs">Shopee</span>
                    </button>
                  </div>
                </div>

                {channel === "SHOPEE" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Shopee Order ID
                    </label>
                    <Input
                      placeholder="เช่น 250519XXXXXXX"
                      value={shopeeOrderId}
                      onChange={(e) => setShopeeOrderId(e.target.value)}
                      className="mt-1 font-mono"
                    />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    ข้อมูลลูกค้า <span className="text-slate-400 normal-case font-normal">(ไม่บังคับ)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="ชื่อลูกค้า"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="เบอร์โทร"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    วิธีชำระเงิน
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((pm) => {
                      const active = paymentMethod === pm.value;
                      const activeClass =
                        pm.value === "CASH"
                          ? "bg-green-50 border-green-500 text-green-700"
                          : pm.value === "QR"
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-rose-50 border-rose-500 text-rose-700";
                      return (
                        <button
                          key={pm.value}
                          onClick={() => setPaymentMethod(pm.value)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl font-medium transition-all cursor-pointer border-2 text-center",
                            active
                              ? activeClass
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          <span className="text-2xl">{pm.emoji}</span>
                          <span className="text-xs leading-tight">{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {paymentMethod === "CASH" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        รับเงิน
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="text-center text-2xl font-bold mt-1 h-14 bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {QUICK_CASH.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setCashReceived(String(amt))}
                          className="py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg text-sm font-semibold text-slate-700 cursor-pointer transition-colors min-h-11"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCashReceived(String(effectiveSubTotal))}
                      className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 rounded-lg text-sm font-semibold text-emerald-700 cursor-pointer transition-colors min-h-11"
                    >
                      พอดี {formatCurrency(effectiveSubTotal)}
                    </button>

                    {change > 0 && (
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
                        <span className="text-sm font-medium text-emerald-800">
                          เงินทอน
                        </span>
                        <span className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(change)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                  size="xl"
                  disabled={
                    (paymentMethod === "CASH" &&
                      parseFloat(cashReceived || "0") < effectiveSubTotal) ||
                    (channel === "SHOPEE" && shopeeOrderId.trim() === "")
                  }
                >
                  ✓ ยืนยันการชำระเงิน
                </Button>
                <Button
                  onClick={() => setShowPayment(false)}
                  variant="ghost"
                  className="w-full"
                >
                  ← ย้อนกลับ
                </Button>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Mobile floating cart bar — sits above bottom nav (bottom-16 = 64px) */}
      {!cartOpenMobile && (
        <button
          onClick={() => setCartOpenMobile(true)}
          className={cn(
            "md:hidden fixed left-3 right-3 bottom-[72px] z-30 rounded-2xl shadow-lg flex items-center justify-between px-4 py-3 transition-all active:scale-[0.98]",
            cart.length > 0
              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/40"
              : "bg-white border border-slate-200 text-slate-500"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <span className="text-2xl">🛒</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-white text-emerald-700 text-[11px] font-bold flex items-center justify-center shadow-sm">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-medium opacity-90 leading-tight">
                {cart.length > 0 ? `${cart.length} เมนู • ${itemCount} แก้ว` : "ตะกร้าว่าง"}
              </p>
              {cart.length > 0 && (
                <p className="text-sm font-bold leading-tight">
                  {formatCurrency(effectiveSubTotal)}
                </p>
              )}
            </div>
          </div>
          <span className="text-sm font-semibold flex items-center gap-1">
            {cart.length > 0 ? "ดูตะกร้า" : "เลือกเมนู"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeItem}
          />
          <div className="relative w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-50 via-green-50 to-emerald-100 flex items-center justify-center text-3xl shrink-0">
                  {activeCategoryObj?.emoji || "🥤"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-slate-900 truncate">
                    {selectedItem.name}
                  </h3>
                  <p className="text-emerald-600 font-bold">
                    {formatCurrency(selectedItem.price)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeItem}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  ระดับความหวาน
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {SWEETNESS_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setSweetness(level.value)}
                      className={cn(
                        "py-3 rounded-xl text-sm font-medium transition-all cursor-pointer border-2",
                        sweetness === level.value
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      <div className="font-bold">{level.short}</div>
                      <div className="text-[11px] mt-0.5">{level.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {toppings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    ท็อปปิ้ง
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {toppings.map((topping) => {
                      const isSelected = selectedToppings.some(
                        (t) => t.id === topping.id
                      );
                      return (
                        <button
                          key={topping.id}
                          onClick={() => toggleTopping(topping)}
                          className={cn(
                            "px-3.5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border-2 inline-flex items-center gap-1.5",
                            isSelected
                              ? "bg-green-50 border-green-500 text-green-700"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {isSelected && <span>✓</span>}
                          {topping.name}
                          <span className="text-xs opacity-75">
                            +{formatCurrency(topping.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  หมายเหตุ
                </p>
                <Input
                  placeholder="เช่น แยกน้ำแข็ง, ไม่ใส่นม"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  จำนวน
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600 cursor-pointer"
                  >
                    −
                  </button>
                  <div className="w-20 text-center">
                    <p className="text-3xl font-bold text-slate-900">
                      {quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 sm:rounded-b-3xl">
              <Button
                onClick={handleAddToCart}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                size="xl"
              >
                <span>เพิ่มลงตะกร้า</span>
                <span className="ml-auto font-bold">
                  {formatCurrency(selectedItemTotal)}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
