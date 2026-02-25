import React, { useState } from 'react';
import { Link, useNavigate, Outlet } from '@tanstack/react-router';
import {
  Menu, X, LayoutDashboard, Calendar, Clock, LogOut, ChevronRight, Shield
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const navLinks = [
  { to: '/supervisor', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/supervisor/schedules', icon: Calendar, label: 'Schedules' },
  { to: '/supervisor/time-off', icon: Clock, label: 'Time Off Requests' },
];

export default function SupervisorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { session, logout } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border h-16 flex items-center px-4 gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/assets/generated/aerotek-logo.dim_256x256.png" alt="Aerotek" className="w-7 h-7 object-contain" />
          <span className="font-bold text-foreground text-lg tracking-tight">Aerotek HR</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary text-xs font-medium">Supervisor</span>
          </div>
          <span className="text-muted-foreground text-sm hidden sm:block">{session?.username}</span>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="/assets/generated/aerotek-logo.dim_256x256.png" alt="Aerotek" className="w-8 h-8 object-contain" />
            <div>
              <p className="font-bold text-foreground text-sm">Aerotek HR</p>
              <p className="text-muted-foreground text-xs">Supervisor Portal</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">
                {(session?.username || 'S').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-foreground font-medium text-sm">{session?.username}</p>
              <p className="text-primary text-xs">Supervisor</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all group"
              activeProps={{ className: 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground bg-primary/10 border border-primary/20' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
