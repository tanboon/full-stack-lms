import React, { useState, useRef, useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ShoppingCart, LogOut, User, ChevronDown } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

function UserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rawUser = localStorage.getItem('lms_user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const name: string = user?.name ?? 'User';
  const role: string = user?.role ?? 'admin';
  const email: string = user?.email ?? '';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
    navigate('/login');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted transition-colors active:scale-95"
      >
        <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary select-none">
          {initials || <User className="w-4 h-4" />}
        </div>
        <div className="hidden sm:block text-left leading-tight">
          <div className="text-sm font-semibold text-foreground max-w-[120px] truncate">{name}</div>
          <div className="text-xs text-muted-foreground capitalize">{role}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3.5 border-b border-border/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary select-none shrink-0">
              {initials || <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{name}</div>
              <div className="text-xs text-muted-foreground truncate">{email}</div>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-primary/10 text-primary border border-primary/20">
                {role}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/8 transition-colors font-medium text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <header className="h-16 border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-10 flex items-center justify-between px-6 gap-4">
          <h2 className="text-base font-display font-semibold text-foreground/70 hidden md:block">Admin Portal</h2>
          
          <div className="flex items-center gap-2 ml-auto">
            {/* Cart button */}
            <button
              onClick={toggleCart}
              className="relative p-2.5 rounded-full hover:bg-muted transition-colors active:scale-95"
            >
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {cartItemsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4.5 h-4.5 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-bold rounded-full border-2 border-background min-w-[18px] min-h-[18px]">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-border/60 mx-1" />

            {/* User menu */}
            <UserMenu />
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
