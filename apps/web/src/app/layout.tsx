import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | TalentNet',
    default: 'TalentNet — Hiring & Talent Engagement Platform',
  },
  description:
    'Apply for open roles, track your application status, and connect with our talent community.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
