import { create } from "zustand";

export interface CartTopping {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartId: string;
  menuItemId: string;
  name: string;
  price: number;
  shopeePrice: number;
  quantity: number;
  sweetnessLevel: number;
  toppings: CartTopping[];
  note: string;
  itemTotal: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartId" | "itemTotal">) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  getSubTotal: () => number;
}

function calcItemTotal(item: Omit<CartItem, "cartId" | "itemTotal">): number {
  const toppingTotal = item.toppings.reduce((sum, t) => sum + t.price, 0);
  return (item.price + toppingTotal) * item.quantity;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    const cartId = crypto.randomUUID();
    const itemTotal = calcItemTotal(item);
    set((state) => ({
      items: [...state.items, { ...item, cartId, itemTotal }],
    }));
  },

  removeItem: (cartId) => {
    set((state) => ({
      items: state.items.filter((i) => i.cartId !== cartId),
    }));
  },

  updateQuantity: (cartId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.cartId === cartId
          ? {
              ...i,
              quantity,
              itemTotal: calcItemTotal({ ...i, quantity }),
            }
          : i
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  getSubTotal: () => {
    return get().items.reduce((sum, item) => sum + item.itemTotal, 0);
  },
}));
