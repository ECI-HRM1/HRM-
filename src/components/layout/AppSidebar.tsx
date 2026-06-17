'use client';

import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  RefreshCw,
  Users,
  Building2,
  Briefcase,
  FileText,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { view: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'management', 'employee'] },
  { view: 'cycles' as const, label: 'Appraisal Cycles', icon: RefreshCw, roles: ['admin'] },
  { view: 'employees' as const, label: 'Employees', icon: Users, roles: ['admin'] },
  { view: 'departments' as const, label: 'Departments', icon: Building2, roles: ['admin'] },
  { view: 'designations' as const, label: 'Designations', icon: Briefcase, roles: ['admin'] },
  { view: 'appraisal-list' as const, label: 'Appraisals', icon: FileText, roles: ['admin', 'supervisor', 'management', 'employee'] },
  { view: 'notifications' as const, label: 'Notifications', icon: Bell, roles: ['admin', 'supervisor', 'management', 'employee'], showBadge: true },
  { view: 'reports' as const, label: 'Reports', icon: BarChart3, roles: ['admin', 'management'] },
  { view: 'settings' as const, label: 'Settings', icon: Settings, roles: ['admin', 'supervisor', 'management', 'employee'] },
];

export default function AppSidebar() {
  const { currentUser, currentView, setCurrentView, sidebarOpen, setSidebarOpen, unreadCount } = useAppStore();

  const visibleItems = navItems.filter(
    (item) => !currentUser || item.roles.includes(currentUser.role)
  );

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src="/eci-logo.jpg" alt="ECI" className="w-9 h-9 object-contain" />
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">ECI HRM</p>
          <p className="text-xs text-sidebar-foreground/60 truncate">Performance Appraisal</p>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const isActive = currentView === item.view ||
              (item.view === 'dashboard' && currentView === 'dashboard');
            return (
              <Button
                key={item.view}
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 h-9 text-sm relative',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
                onClick={() => setCurrentView(item.view)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.showBadge && unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-1.5 min-w-5 text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}