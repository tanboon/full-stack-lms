import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

// [2.5] Protected Routes Implementation
export function DashboardLayout() {
  const token = localStorage.getItem('lms_token');
  const toggleCart = useCartStore(state => state.toggleCart);
  const cartItemsCount = useCartStore(state => state.items.length);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-hidden">
        <header className="h-20 border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-10 flex items-center justify-between px-8">
          <h2 className="text-xl font-display font-semibold text-foreground/80">Admin Portal</h2>
          
          {/* Global Top-Right Cart Trigger */}
          <button 
            onClick={toggleCart}
            className="relative p-2.5 rounded-full hover:bg-muted transition-colors active:scale-95"
          >
            <ShoppingCart className="w-6 h-6 text-foreground" />
            {cartItemsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full border-2 border-background">
                {cartItemsCount}
              </span>
            )}
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
