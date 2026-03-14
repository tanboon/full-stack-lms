import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  PlusCircle, 
  UploadCloud, 
  Settings, 
  LogOut,
  Moon,
  Sun,
  FileCode
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/users', icon: Users, label: 'User Directory' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/courses/new', icon: PlusCircle, label: 'Create Course' },
    { to: '/exams/create', icon: FileCode, label: 'Dynamic Exam' },
    { to: '/upload', icon: UploadCloud, label: 'Upload Manager' },
    { to: '/profile', icon: Settings, label: 'Identity Profile' },
  ];

  return (
    <aside className="w-64 h-screen flex flex-col bg-sidebar border-r border-sidebar-border shadow-2xl z-20 hidden md:flex shrink-0 fixed left-0 top-0">
      <div className="h-20 flex items-center px-8 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-8 h-8 rounded-lg" />
          <h1 className="text-xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">LMS Pro</h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
        {links.map((link) => {
          const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary/10 text-primary font-semibold' 
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-border hover:text-sidebar-foreground'
              }`}
            >
              <link.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'group-hover:text-foreground'}`} />
              {link.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border/50 space-y-2">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-border transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          Toggle Theme
        </button>
        <button 
          onClick={() => { localStorage.removeItem('lms_token'); window.location.href='/login'; }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
