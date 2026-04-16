import Link from 'next/link';
import type { Metadata } from 'next';
import { LucideIcon, NotebookPen, Briefcase, Inbox, Users, CalendarCheck, BarChart2 } from 'lucide-react';


export const metadata: Metadata = { title: 'HR Dashboard — TalentNet' };

const QUICK_LINKS: { label: string; href: string; description: string; icon: LucideIcon }[] = [
  {
    label: 'Post a New Job',
    href: '/portal/jobs/new',
    description: 'Create a job listing and configure screening',
    icon: NotebookPen,
  },
  {
    label: 'Manage Jobs',
    href: '/portal/jobs',
    description: 'View, edit, and update job statuses',
    icon: Briefcase,
  },
  {
    label: 'Applications',
    href: '/portal/applications',
    description: 'Review incoming candidate applications',
    icon: Inbox,
  },
  {
    label: 'Candidates',
    href: '/portal/candidates',
    description: 'Browse your candidate talent pool',
    icon: Users,
  },
  {
    label: 'Interviews',
    href: '/portal/interviews',
    description: 'Schedule and track interview stages',
    icon: CalendarCheck,
  },
  {
    label: 'Analytics',
    href: '/portal/analytics',
    description: 'Hiring funnel metrics and reports',
    icon: BarChart2,
  },
];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-5xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back. Here&apos;s a quick overview of your hiring pipeline.
        </p>
      </div>

      {/* Stat cards — static placeholders until API is connected */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Open Roles', value: '8', color: 'text-indigo-600' },
          { label: 'Active Applications', value: '—', color: 'text-gray-900' },
          { label: 'Interviews This Week', value: '—', color: 'text-gray-900' },
          { label: 'Offers Extended', value: '—', color: 'text-gray-900' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {stat.label}
            </p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <item.icon size={24} />
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {item.label}
              </h3>
            </div>

            <p className="text-xs text-gray-500 mt-1">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
