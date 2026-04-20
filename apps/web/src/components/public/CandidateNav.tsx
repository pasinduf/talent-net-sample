'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCandidateToken } from '@/lib/candidateAuth';
import { UserCircle } from 'lucide-react';

export function CandidateNav() {
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setAuthed(!!getCandidateToken());
  }, [pathname]);

  if (!authed) return null;

  return (
    <Link
      href="/careers/profile"
      className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
    >
      <UserCircle size={18} />
      My profile
    </Link>
  );
}
