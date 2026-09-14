import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  LayoutDashboard,
  Gamepad2,
  BookOpen,
  History,
  Trophy,
  Award,
  Upload,
  Settings,
  Database,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { soundService } from '../../services/soundService';
import { dataAdapter, HealthCheckResult } from '../../services/dataAdapter';
import { QuestionBankLesson, GameSession, CertificateRecord, Question } from '../../types';
import { QuestionBankRepository } from '../../repositories/questionBankRepository';
import { QuestionImportModal } from '../common/QuestionImportModal';

// Tabs
import { AdminOverviewTab } from './tabs/AdminOverviewTab';
import { AdminGamesTab } from './tabs/AdminGamesTab';
import { AdminQuestionBanksTab } from './tabs/AdminQuestionBanksTab';
import { AdminSessionsTab } from './tabs/AdminSessionsTab';
import { AdminResultsTab } from './tabs/AdminResultsTab';
import { AdminCertificatesTab } from './tabs/AdminCertificatesTab';
import { AdminSettingsTab } from './tabs/AdminSettingsTab';
import { AdminDatabaseTab } from './tabs/AdminDatabaseTab';
import { EDUPLAY_VERSION } from '../../version';

export type AdminTab =
  | 'OVERVIEW'
  | 'GAMES'
  | 'QUESTION_BANKS'
  | 'SESSIONS'
  | 'RESULTS'
  | 'CERTIFICATES'
  | 'IMPORT'
  | 'SETTINGS'
  | 'DATABASE';

interface TeacherDashboardProps {
  onBackToEduplay: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBackToEduplay }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');

  // State loaded via dataAdapter
  const [banks, setBanks] = useState<QuestionBankLesson[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importTargetBank, setImportTargetBank] = useState<QuestionBankLesson | undefined>(undefined);

  // Load initial data
  const loadData = async () => {
    try {
      const [loadedBanks, loadedSessions, loadedCerts, health] = await Promise.all([
        dataAdapter.listQuestionBanks(),
        dataAdapter.listSessions(),
        dataAdapter.listCertificates(),
        dataAdapter.checkHealth(),
      ]);
      setBanks(loadedBanks);
      setSessions(loadedSessions);
      setCertificates(loadedCerts);
      setHealthStatus(health);
    } catch (e) {
      console.warn('TeacherDashboard loadData fallback to local repo:', e);
      setBanks(QuestionBankRepository.getLessons());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics for Overview (Requirement 14)
  const totalQuestions = banks.reduce((sum, b) => sum + (b.questions?.length || 0), 0);
  const todayStr = new Date().toLocaleDateString('vi-VN');
  const sessionsToday = sessions.filter((s) => s.date?.includes(todayStr) || false).length;

  const overviewMetrics = {
    totalGames: 6,
    totalQuestionBanks: banks.length,
    totalQuestions,
    totalSessionsPlayed: sessions.length,
    sessionsToday,
    totalCertificates: certificates.length,
    isCloudConnected: healthStatus?.status === 'CONNECTED',
    dataMode: dataAdapter.getMode(),
  };

  // Handlers
  const handleSelectGame = (gameId: string) => {
    soundService.playClick();
    window.location.hash = `/games/${gameId}`;
  };

  const handleSaveBank = async (bank: QuestionBankLesson) => {
    await dataAdapter.saveQuestionBank(bank, bank.questions || []);
    await loadData();
  };

  const handleIssueCertificate = async (cert: CertificateRecord) => {
    await dataAdapter.issueCertificate(cert);
    await loadData();
  };

  const handleOpenImportModal = (target?: QuestionBankLesson) => {
    soundService.playClick();
    setImportTargetBank(target);
    setShowImportModal(true);
  };

  const handleImportSuccess = async () => {
    setShowImportModal(false);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onBackToEduplay();
              }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Trang Chủ</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>EDUPLAY ADMIN</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                    v{EDUPLAY_VERSION}
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">
                  Bảng Điều Khiển Giáo Viên • 6 Trò Chơi • Kho Câu Hỏi Chuẩn 18 Cột
                </p>
              </div>
            </div>
          </div>

          {/* Right: Cloud Status Quick Indicator */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div
              onClick={() => {
                soundService.playClick();
                setActiveTab('DATABASE');
              }}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                overviewMetrics.dataMode === 'cloud'
                  ? overviewMetrics.isCloudConnected
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>
                {overviewMetrics.dataMode === 'cloud'
                  ? overviewMetrics.isCloudConnected
                    ? 'Cloud: Đã kết nối'
                    : 'Cloud: Mất kết nối'
                  : 'Chế độ Local'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Strip (Requirement 13) */}
        <div className="max-w-7xl mx-auto pt-3 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
          {[
            { id: 'OVERVIEW', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'GAMES', label: 'Trò chơi (6)', icon: Gamepad2 },
            { id: 'QUESTION_BANKS', label: `Kho câu hỏi (${banks.length})`, icon: BookOpen },
            { id: 'SESSIONS', label: `Phiên chơi (${sessions.length})`, icon: History },
            { id: 'RESULTS', label: 'Kết quả & Xếp hạng', icon: Trophy },
            { id: 'CERTIFICATES', label: `Giấy chứng nhận (${certificates.length})`, icon: Award },
            { id: 'IMPORT', label: 'Import CSV/Excel', icon: Upload },
            { id: 'SETTINGS', label: 'Cài đặt lớp & đội', icon: Settings },
            { id: 'DATABASE', label: 'Database & Cloud', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundService.playClick();
                  if (tab.id === 'IMPORT') {
                    handleOpenImportModal();
                  } else {
                    setActiveTab(tab.id as AdminTab);
                  }
                }}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Tab Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'OVERVIEW' && (
          <AdminOverviewTab
            metrics={overviewMetrics}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectGame={handleSelectGame}
          />
        )}

        {activeTab === 'GAMES' && (
          <AdminGamesTab onSelectGame={handleSelectGame} />
        )}

        {activeTab === 'QUESTION_BANKS' && (
          <AdminQuestionBanksTab
            banks={banks}
            onRefreshBanks={loadData}
            onOpenImportModal={handleOpenImportModal}
            onSaveBank={handleSaveBank}
          />
        )}

        {activeTab === 'SESSIONS' && (
          <AdminSessionsTab
            sessions={sessions}
            onViewCertificate={(session) => {
              setActiveTab('CERTIFICATES');
            }}
          />
        )}

        {activeTab === 'RESULTS' && (
          <AdminResultsTab sessions={sessions} />
        )}

        {activeTab === 'CERTIFICATES' && (
          <AdminCertificatesTab
            certificates={certificates}
            onIssueCertificate={handleIssueCertificate}
          />
        )}

        {activeTab === 'SETTINGS' && (
          <AdminSettingsTab onSettingsSaved={loadData} />
        )}

        {activeTab === 'DATABASE' && (
          <AdminDatabaseTab onDatabaseRestored={loadData} />
        )}
      </main>

      {/* Question Import Modal Integration */}
      <QuestionImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
        onImportLessonSuccess={async (newLesson, newQuestions) => {
          await handleSaveBank({ ...newLesson, questions: newQuestions });
          setShowImportModal(false);
        }}
        currentQuestions={banks[0]?.questions || []}
        targetLessonId={importTargetBank?.id}
        initialLessonTitle={importTargetBank?.lessonTitle || ''}
        initialGrade={importTargetBank?.grade || 5}
        initialSubject={importTargetBank?.subject || 'Tin học'}
        initialTopic={importTargetBank?.topic || ''}
      />
    </div>
  );
};
