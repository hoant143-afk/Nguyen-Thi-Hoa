import React, { useState, useEffect } from 'react';
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
import { getGameById } from './games/gameRegistry';

export default function App() {
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

  // Render individual game views or home platform shell
  if (currentRoute === '/games/cam-race') {
    return <CamRaceGame onBackToEduplay={() => navigateTo('/')} />;
  }

  if (currentRoute === '/games/smile-race' || currentRoute === '/games/quiz-battle') {
    return <SmileRaceGame onBackToEduplay={() => navigateTo('/')} />;
  }

  if (currentRoute === '/games/lucky-wheel') {
    return <LuckyWheelGame onBackToEduplay={() => navigateTo('/')} />;
  }

  if (currentRoute === '/games/fastest-hand') {
    return <FastestHandGame onBackToEduplay={() => navigateTo('/')} />;
  }

  if (currentRoute === '/games/random-picker') {
    return <RandomPickerGame onBackToEduplay={() => navigateTo('/')} />;
  }

  if (currentRoute === '/games/team-challenge') {
    return <TeamChallengeGame onBackToEduplay={() => navigateTo('/')} />;
  }

  if (currentRoute === '/admin' || currentRoute === '/classes' || currentRoute === '/questions') {
    return <TeacherDashboard onBackToEduplay={() => navigateTo('/')} />;
  }

  // Default: EDUPLAY Platform Home
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/75 to-rose-100/50 text-slate-800 flex flex-col selection:bg-rose-500 selection:text-white font-sans relative">
      {/* Soft decorative background ambient orbs for warm, light atmosphere */}
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
    </div>
  );
}
