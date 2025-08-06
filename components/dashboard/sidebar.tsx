
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  Bookmark,
  PieChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Users,
  TrendingDown,
  Building2,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Market Overview',
    href: '/dashboard/market',
    icon: PieChart,
  },
  {
    name: 'Earnings Analysis',
    href: '/dashboard/earnings',
    icon: TrendingUp,
  },
  {
    name: 'Options Activity',
    href: '/dashboard/options',
    icon: Activity,
  },
  {
    name: 'Congress Trading',
    href: '/dashboard/congress',
    icon: Users,
  },
  {
    name: 'Shorts Analysis',
    href: '/dashboard/shorts',
    icon: TrendingDown,
  },
  {
    name: 'Institutions',
    href: '/dashboard/institutions',
    icon: Building2,
  },
  {
    name: 'News & Headlines',
    href: '/dashboard/news',
    icon: Newspaper,
  },
  {
    name: 'Watchlists',
    href: '/dashboard/watchlist',
    icon: Bookmark,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-gray-900 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-blue-400" />
            <h1 className="text-lg font-bold text-blue-400">UW Analytics</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                'hover:bg-gray-800',
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300'
              )}
              title={collapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
            'hover:bg-gray-800 text-gray-300'
          )}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </Link>
      </div>
    </div>
  );
}
