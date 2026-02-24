import React, { useState } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuthContext } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Briefcase, Calendar, Clock, FileText, LogOut,
  ChevronRight, Building2, UserCog, Menu, X, ClipboardList
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { to: '/hr', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hr/employees', label: 'Employees', icon: Users },
  { to: '/hr/hiring', label: 'Hiring & Recruitment', icon: Briefcase },
  { to: '/hr/scheduling', label: 'Scheduling', icon: Calendar },
  { to: '/hr/time-off', label: 'Time Off Requests', icon: Clock },
  { to: '/hr/timesheets', label: 'Timesheets', icon: ClipboardList },
  { to: '/hr/pto-policies', label: 'PTO Policies', icon: FileText },
  { to: '/hr/accounts', label: 'Account Management', icon: UserCog },
];

export default function HRAdminLayout() {
  const { session, logout } = useAuthContext();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  const isActive = (to: string) => {
    if (to === '/hr') return currentPath === '/hr' || currentPath === '/hr/';
    return currentPath.startsWith(to);
  };

  const handleNavClick = (to: string) => {
    navigate({ to });
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-screen bg-[oklch(0.97_0.005_240)] overflow-hidden">
      {/* Backdrop overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sliding drawer sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 bg-[oklch(0.18_0.04_255)] flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header with close button */}
        <div className="px-5 py-5 border-b border-[oklch(0.28_0.04_255)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-[oklch(0.78_0.16_75)] flex items-center justify-center">
              <img
                src="/assets/generated/aerotek-logo.dim_256x256.png"
                alt="Aerotek"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const p = e.currentTarget.parentElement;
                  if (p) p.innerHTML = '<span style="font-weight:800;color:oklch(0.15 0.02 255);font-size:1.1rem">A</span>';
                }}
              />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Aerotek</p>
              <p className="text-[oklch(0.78_0.16_75)] text-xs">(IU) Employee Mgmt</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-[oklch(0.75_0.02_250)] hover:text-white transition-colors p-1 rounded"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-3 border-b border-[oklch(0.28_0.04_255)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[oklch(0.78_0.16_75)] flex items-center justify-center">
              <span className="text-[oklch(0.15_0.02_255)] text-xs font-bold">
                {session?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white text-xs font-medium">{session?.username}</p>
              <p className="text-[oklch(0.78_0.16_75)] text-xs">HR Administrator</p>
            </div>
          </div>
        </div>

        {/* Scrollable nav + logout */}
        <ScrollArea className="flex-1">
          <nav className="px-3 py-3 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.to}
                onClick={() => handleNavClick(item.to)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  isActive(item.to)
                    ? 'bg-[oklch(0.78_0.16_75)] text-[oklch(0.15_0.02_255)]'
                    : 'text-[oklch(0.75_0.02_250)] hover:bg-[oklch(0.25_0.05_255)] hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout inside scroll area so it's reachable by scrolling */}
          <div className="px-3 pb-4 pt-2 border-t border-[oklch(0.28_0.04_255)] mx-3 mt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[oklch(0.75_0.02_250)] hover:bg-[oklch(0.25_0.05_255)] hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </ScrollArea>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-[oklch(0.88_0.01_240)] px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-lg text-[oklch(0.52_0.02_250)] hover:bg-[oklch(0.93_0.01_240)] hover:text-[oklch(0.18_0.04_255)] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-[oklch(0.52_0.02_250)]">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Aerotek (IU) Employee Management</span>
              <ChevronRight className="w-3 h-3 hidden sm:inline" />
              <span className="text-[oklch(0.18_0.04_255)] font-medium">HR Admin Portal</span>
            </div>
          </div>
          <span className="text-xs bg-[oklch(0.78_0.16_75)] text-[oklch(0.15_0.02_255)] px-2.5 py-1 rounded-full font-semibold">
            HR Admin
          </span>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
