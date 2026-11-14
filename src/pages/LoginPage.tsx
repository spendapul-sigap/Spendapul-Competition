import { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { api, type AuthUser } from '../lib/api';

interface LoginPageProps {
  onSuccess: (user: AuthUser) => void;
  onNavigate: (path: string) => void;
}

export function LoginPage({ onSuccess, onNavigate }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.login(username, password);
      onSuccess(user);
      onNavigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[440px] mx-auto px-4 py-16">
      <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white space-y-6">
        <div className="space-y-1.5">
          <div className="w-10 h-10 rounded-xl bg-[#1A2438] text-white flex items-center justify-center mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-display font-bold text-2xl text-[#1A2438]">Masuk Panel Admin</h1>
          <p className="text-sm text-slate-600">
            Halaman internal untuk pengelolaan pendaftar, Juknis PDF, konten, dan pengaturan Spendapul Competition.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26440]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26440]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F26440] hover:bg-[#DC4E2B] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Memeriksa...' : 'Masuk'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
