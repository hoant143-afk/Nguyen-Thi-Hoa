import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './components/auth/LoginPage';
import { EduplayHeader } from './components/layout/EduplayHeader';
import { EduplayFooter } from './components/layout/EduplayFooter';
import { EduplayHome } from './components/EduplayHome';
import { CamRaceGame } from './games/cam-race/CamRaceGame';
import { SmileRaceGame } from './games/smile-race/SmileRaceGame';
import { LuckyWheelGame } from './games/lucky-wheel/LuckyWheelGame';
import { FastestHandGame } from './games/fastest-hand/FastestHandGame';
import { RandomPickerGame } from './games/random-picker/RandomPickerGame';
import { TeamChallengeGame } from './games/team-challenge/TeamChallengeGame';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { TeacherProfilePage } from './components/teacher/TeacherProfilePage';
import { getGameById } from './games/gameRegistry';
import { GameErrorBoundary } from './components/common/GameErrorBoundary';
import { CloudStatusBanner } from './components/common/CloudStatusBanner';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      return hash.startsWith('/') ? hash : `/${hash}`;
    }
    return '/';
  });

  // Sync route with browser hash for bookmarks and reloads
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const route = hash.startsWith('/') ? hash : `/${hash}`;
      setCurrentRoute(route || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (route: string) => {
    setCurrentRoute(route);
    if (route === '/') {
      window.location.hash = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (route.startsWith('/#')) {
      const targetId = route.replace('/#', '');
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = route;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectGameById = (gameId: string) => {
    const game = getGameById(gameId);
    if (game) {
      navigateTo(game.route);
    }
  };

  // If user navigates explicitly to /login
  if (currentRoute === '/login') {
    if (isAuthenticated) {
      navigateTo('/');
      return null;
    }
    return <LoginPage onLoginSuccess={() => navigateTo('/')} />;
  }

  // All other routes are protected under teacher authentication
  return (
    <ProtectedRoute onNavigateToLogin={() => navigateTo('/login')}>
      {/* 1. Cam Race Game */}
      {currentRoute === '/games/cam-race' && (
        <GameErrorBoundary onGoHome={() => navigateTo('/')}>
          <CamRaceGame onBackToEduplay={() => navigateTo('/')} />
          <CloudStatusBanner />
        </GameErrorBoundary>
      )}

      {/* 2. Smile Race Game */}
      {currentRoute === '/games/smile-race' && (
        <GameErrorBoundary onGoHome={() => navigateTo('/')}>
          <SmileRaceGame onBackToEduplay={() => navigateTo('/')} />
          <CloudStatusBanner />
        </GameErrorBoundary>
      )}

      {/* 3. Lucky Wheel Game */}
      {currentRoute === '/games/lucky-wheel' && (
        <GameErrorBoundary onGoHome={() => navigateTo('/')}>
          <LuckyWheelGame onBackToEduplay={() => navigateTo('/')} />
          <CloudStatusBanner />
        </GameErrorBoundary>
      )}

      {/* 4. Fastest Hand Game */}
      {currentRoute === '/games/fastest-hand' && (
        <GameErrorBoundary onGoHome={() => navigateTo('/')}>
          <FastestHandGame onBackToEduplay={() => navigateTo('/')} />
          <CloudStatusBanner />
        </GameErrorBoundary>
      )}

      {/* 5. Random Picker Game */}
      {currentRoute === '/games/random-picker' && (
        <GameErrorBoundary onGoHome={() => navigateTo('/')}>
          <RandomPickerGame onBackToEduplay={() => navigateTo('/')} />
          <CloudStatusBanner />
        </GameErrorBoundary>
      )}

      {/* 6. Team Challenge Game */}
      {currentRoute === '/games/team-challenge' && (
        <GameErrorBoundary onGoHome={() => navigateTo('/')}>
          <TeamChallengeGame onBackToEduplay={() => navigateTo('/')} />
          <CloudStatusBanner />
        </GameErrorBoundary>
      )}

      {/* 7. Teacher Profile Page */}
      {currentRoute === '/profile' && (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/75 to-rose-100/50 text-slate-800 flex flex-col font-sans">
          <EduplayHeader
            currentRoute={currentRoute}
            onNavigate={navigateTo}
            onOpenTeacherDashboard={() => navigateTo('/admin')}
          />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TeacherProfilePage onBack={() => navigateTo('/')} />
          </main>
          <EduplayFooter />
          <CloudStatusBanner />
        </div>
      )}

      {/* 8. Teacher Dashboard */}
      {(currentRoute === '/admin' || currentRoute === '/classes' || currentRoute === '/questions' || currentRoute === '/settings') && (
        <GameErrorBoundary onGoHome={() => navigateTo('/')}>
          <TeacherDashboard onBackToEduplay={() => navigateTo('/')} />
          <CloudStatusBanner />
        </GameErrorBoundary>
      )}

      {/* 9. Default: Platform Home */}
      {currentRoute !== '/games/cam-race' &&
        currentRoute !== '/games/smile-race' &&
        currentRoute !== '/games/lucky-wheel' &&
        currentRoute !== '/games/fastest-hand' &&
        currentRoute !== '/games/random-picker' &&
        currentRoute !== '/games/team-challenge' &&
        currentRoute !== '/profile' &&
        currentRoute !== '/admin' &&
        currentRoute !== '/classes' &&
        currentRoute !== '/questions' &&
        currentRoute !== '/settings' && (
          <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/75 to-rose-100/50 text-slate-800 flex flex-col selection:bg-rose-500 selection:text-white font-sans relative">
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-rose-200/25 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-200/25 rounded-full blur-3xl pointer-events-none -z-10" />

            <EduplayHeader
              currentRoute={currentRoute}
              onNavigate={navigateTo}
              onOpenTeacherDashboard={() => navigateTo('/admin')}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <EduplayHome
                onSelectGame={handleSelectGameById}
                onOpenTeacherDashboard={() => navigateTo('/admin')}
              />
            </main>

            <EduplayFooter />
            <CloudStatusBanner />
          </div>
        )}
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
