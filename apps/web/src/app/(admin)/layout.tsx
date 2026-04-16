'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Toaster } from 'sonner';
import {
  LayoutDashboard,
  Briefcase,
  Star,
  Inbox,
  Users,
  CalendarCheck,
  UsersRound,
  BarChart2,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

const NAV_ITEMS: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: 'Dashboard',         href: '/portal/dashboard',          Icon: LayoutDashboard },
  { label: 'Jobs',              href: '/portal/jobs',               Icon: Briefcase       },
  { label: 'Scoring Templates', href: '/portal/scoring/templates',  Icon: Star            },
  { label: 'Applications',      href: '/portal/applications',       Icon: Inbox           },
  { label: 'Candidates',        href: '/portal/candidates',         Icon: Users           },
  { label: 'Interviews',        href: '/portal/interviews',         Icon: CalendarCheck   },
  { label: 'Talent Pools',      href: '/portal/pools',              Icon: UsersRound      },
  { label: 'Analytics',         href: '/portal/analytics',          Icon: BarChart2       },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/portal/dashboard" className="text-lg font-bold text-indigo-600">
            TalentNet HR
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link
            href="/careers"
            target="_blank"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <ExternalLink size={12} /> View Careers Portal
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">HR Admin</span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
              H
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
