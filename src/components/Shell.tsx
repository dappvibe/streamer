'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { ReactNode } from 'react';

interface ShellProps {
  children: ReactNode;
  variant?: 'default' | 'auth';
  className?: string;
}

export function Shell({ children, variant = 'default', className = '' }: ShellProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white ${className}`}>
      {variant === 'default' && (
        <nav className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Streamer Admin
            </h1>
            <div className="flex gap-4 items-center">
              <Link href="/dashboard" className="text-slate-300 hover:text-white transition">
                Dashboard
              </Link>
              <Link href="/settings" className="text-slate-300 hover:text-white transition">
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      {children}
    </div>
  );
}
