import { useCallback, useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { api, clearAuthSession, getAuthToken, getAuthUser, type AuthUser } from './lib/api';
import { MobileLegendsDetailPage, TryOutDetailPage } from './pages/ActivityDetailPages';
import { AdminPage } from './pages/AdminPage';
import { CekStatusPage } from './pages/CekStatusPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import {
  BracketPage,
  FaqPage,
  GaleriPage,
  HasilPage,
  JadwalPage,
  JuknisPage,
  KontakPage,
  PengumumanPage,
  PesertaPublicPage,
} from './pages/PublicInfoPages';
import { RegisterMlPage } from './pages/RegisterMlPage';
import { RegisterToPage } from './pages/RegisterToPage';
import type { PublicConfig, PublicContent } from './types/spendapul';

function getPathname(): string {
  return window.location.pathname || '/';
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(getPathname);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [content, setContent] = useState<PublicContent | null>(null);
  const [user, setUser] = useState<AuthUser | null>(getAuthUser);

  const loadPublic = useCallback(async () => {
    try {
      const [cfg, cnt] = await Promise.all([api.getConfigPublic(), api.getContent()]);
      setConfig(cfg);
      setContent(cnt);
    } catch {
      // ignore initial error
    }
  }, []);

  useEffect(() => {
    loadPublic();
    if (getAuthToken()) {
      api
        .me()
        .then(setUser)
        .catch(() => {
          clearAuthSession();
          setUser(null);
        });
    }
  }, [loadPublic]);

  useEffect(() => {
    const onPopState = () => setCurrentPath(getPathname());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((target: string) => {
    if (target.startsWith('/#')) {
      const hashId = target.slice(2);
      if (getPathname() !== '/') {
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
        setTimeout(() => {
          document.getElementById(hashId)?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        document.getElementById(hashId)?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (target !== getPathname()) {
      window.history.pushState({}, '', target);
      setCurrentPath(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    navigate('/');
  };

  // Internal Route (/admin)
  if (currentPath === '/admin' || currentPath === '/dashboard') {
    if (!user) {
      return (
        <Layout currentPath="/login" onNavigate={navigate} config={config}>
          <LoginPage onSuccess={setUser} onNavigate={navigate} />
        </Layout>
      );
    }
    return <AdminPage user={user} onNavigate={navigate} onLogout={handleLogout} onPublicUpdated={loadPublic} />;
  }

  const renderPublicView = () => {
    switch (currentPath) {
      case '/':
        return <LandingPage config={config} content={content} onNavigate={navigate} />;
      case '/try-out':
        return <TryOutDetailPage config={config} content={content} onNavigate={navigate} />;
      case '/mobile-legends':
        return <MobileLegendsDetailPage config={config} content={content} onNavigate={navigate} />;
      case '/daftar/try-out':
        return <RegisterToPage config={config} onNavigate={navigate} onRegistered={loadPublic} />;
      case '/daftar/mobile-legends':
        return <RegisterMlPage config={config} onNavigate={navigate} onRegistered={loadPublic} />;
      case '/juknis':
        return <JuknisPage config={config} />;
      case '/jadwal':
        return <JadwalPage content={content} />;
      case '/pengumuman':
        return <PengumumanPage content={content} />;
      case '/cek-status':
        return <CekStatusPage config={config} />;
      case '/peserta':
        return <PesertaPublicPage />;
      case '/bracket':
        return <BracketPage />;
      case '/hasil':
        return <HasilPage />;
      case '/faq':
        return <FaqPage content={content} />;
      case '/galeri':
        return <GaleriPage content={content} />;
      case '/kontak':
        return <KontakPage config={config} />;
      case '/login':
        return <LoginPage onSuccess={setUser} onNavigate={navigate} />;
      default:
        return <LandingPage config={config} content={content} onNavigate={navigate} />;
    }
  };

  return (
    <Layout currentPath={currentPath} onNavigate={navigate} config={config}>
      {renderPublicView()}
    </Layout>
  );
}
