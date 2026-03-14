import { create } from 'zustand';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image?: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  // Derived state calculations
  getSubtotal: () => number;
  getVAT: () => number;
  getTotal: () => number;
}

// [2.3] Advanced Shopping Cart using Zustand
export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  
  addItem: (item) => set((state) => {
    if (state.items.find(i => i.id === item.id)) return state;
    return { items: [...state.items, item], isOpen: true };
  }),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  
  clearCart: () => set({ items: [] }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  
  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.price, 0);
  },
  
  getVAT: () => {
    // Calculate 8% VAT
    return get().getSubtotal() * 0.08;
  },
  
  getTotal: () => {
    return get().getSubtotal() + get().getVAT();
  }
}));
