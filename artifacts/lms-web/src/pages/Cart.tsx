import React from 'react';
import { useCartStore } from '@/store/cartStore';
import { X, ShoppingBag, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// [2.3] Shopping Cart - Tailwind Side Drawer & Zustand derived state
export default function Cart() {
  const { items, isOpen, toggleCart, removeItem, getSubtotal, getVAT, getTotal, clearCart } = useCartStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
          
          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/50">
              <h2 className="text-2xl font-bold font-display flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-primary" /> Your Cart
              </h2>
              <button onClick={toggleCart} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 opacity-50" />
                  </div>
                  <p className="font-medium">Your cart is empty.</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-background hover:border-primary/30 transition-colors group">
                    <div>
                      <h4 className="font-bold text-foreground">{item.title}</h4>
                      <p className="text-primary font-semibold mt-1">${item.price.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-border bg-background/50">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT (8%)</span>
                    <span>${getVAT().toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex justify-between font-bold text-xl text-foreground">
                    <span>Total</span>
                    <span className="text-primary">${getTotal().toFixed(2)}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    alert('Checkout flow not implemented in this phase');
                    clearCart();
                    toggleCart();
                  }}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" /> Secure Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
