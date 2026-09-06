import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  HelpCircle,
  History,
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  Upload,
  Save,
  CheckCircle,
  FileText,
  BookOpen,
  Database,
  Cloud,
  RefreshCw,
  Copy,
  ExternalLink,
  Palette,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Classroom, DEFAULT_TEAM_PRESETS, TEAM_COLOR_OPTIONS, TeamPreset } from '../../data/classData';
import { Question, Team, TeamCount } from '../../types';
import { EduplayStorage } from '../../services/eduplayStorage';
import { soundService } from '../../services/soundService';
import { apiClient, SyncStatus } from '../../services/apiClient';
import { QuestionImportModal } from '../common/QuestionImportModal';
import { TeamImportModal } from '../common/TeamImportModal';

interface TeacherDashboardProps {
  onBackToEduplay: () => void;
}

const FAST_PRESET_PACKS = [
  {
    name: '🎨 4 Màu Tiêu Chuẩn',
    desc: 'Đội Xanh, Đội Cam, Đội Xanh Lá, Đội Tím',
    teams: [
      { name: 'ĐỘI XANH', color: '#3b82f6', badge: '🔵' },
      { name: 'ĐỘI CAM', color: '#f97316', badge: '🟠' },
      { name: 'ĐỘI XANH LÁ', color: '#22c55e', badge: '🟢' },
      { name: 'ĐỘI TÍM', color: '#a855f7', badge: '🟣' },
    ],
  },
  {
    name: '🚀 Đội Công Nghệ',
    desc: 'Cyber Bots, Code Masters, AI Explorers, Robo Warriors',
    teams: [
      { name: 'CYBER BOTS', color: '#06b6d4', badge: '🤖' },
      { name: 'CODE MASTERS', color: '#f59e0b', badge: '💻' },
      { name: 'AI EXPLORERS', color: '#8b5cf6', badge: '🚀' },
      { name: 'ROBO WARRIORS', color: '#ec4899', badge: '⚡' },
    ],
  },
  {
    name: '🦁 Linh Thú Rừng Xanh',
    desc: 'Rồng Xanh, Hổ Trắng, Phượng Hoàng, Đại Bàng',
    teams: [
      { name: 'RỒNG XANH', color: '#0ea5e9', badge: '🐉' },
      { name: 'HỔ TRẮNG', color: '#f59e0b', badge: '🐯' },
      { name: 'PHƯỢNG HOÀNG', color: '#ef4444', badge: '🦅' },
      { name: 'ĐẠI BÀNG VÀNG', color: '#10b981', badge: '⚡' },
    ],
  },
  {
    name: '🔥 Tứ Đại Nguyên Tố',
    desc: 'Đội Lửa, Đội Nước, Đội Gió, Đội Đất',
    teams: [
      { name: 'ĐỘI LỬA', color: '#ef4444', badge: '🔥' },
      { name: 'ĐỘI NƯỚC', color: '#0ea5e9', badge: '💧' },
      { name: 'ĐỘI GIÓ', color: '#22c55e', badge: '🍃' },
      { name: 'ĐỘI ĐẤT', color: '#f59e0b', badge: '🌍' },
    ],
  },
];

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onBackToEduplay }) => {
  const [activeTab, setActiveTab] = useState<'TEAMS' | 'QUESTIONS' | 'HISTORY' | 'DATABASE'>('TEAMS');
  const [defaultTeamCount, setDefaultTeamCount] = useState<TeamCount>(4);
  const [configuredTeams, setConfiguredTeams] = useState<TeamPreset[]>(() => {
    return EduplayStorage.getGameData('eduplay_team_presets', DEFAULT_TEAM_PRESETS);
  });

  const [questions, setQuestions] = useState<Question[]>(() => EduplayStorage.getQuestions());
  const [history, setHistory] = useState(() => EduplayStorage.getHistory());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(apiClient.getStatus());
  const [cloudUrlInput, setCloudUrlInput] = useState<string>(apiClient.getApiUrl());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  useEffect(() => {
    const unsub = apiClient.subscribe(setSyncStatus);
    return () => unsub();
  }, []);

  const [newQuestionForm, setNewQuestionForm] = useState<Partial<Question>>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: 'Tin học 5',
    explanation: '',
    normalPoints: 10,
    stealPoints: 5,
  });

  const [showAddQuestionModal, setShowAddQuestionModal] = useState<boolean>(false);
  const [showQuestionImportModal, setShowQuestionImportModal] = useState<boolean>(false);
  const [showTeamImportModal, setShowTeamImportModal] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleApplyImportedTeams = (importedTeams: { name: string; color: string; badge?: string }[]) => {
    soundService.playClick();
    const updated = configuredTeams.map((t, idx) => {
      const imp = importedTeams[idx];
      if (imp) {
        return {
          ...t,
          defaultName: imp.name,
          color: imp.color,
          badge: imp.badge || t.badge,
        };
      }
      return t;
    });
    setConfiguredTeams(updated);
    EduplayStorage.setGameData('eduplay_team_presets', updated);
    setSaveSuccessMsg(`Đã nhập thành công ${importedTeams.length} đội từ tệp!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveTeamsConfig = () => {
    soundService.playClick();
    EduplayStorage.setGameData('eduplay_team_presets', configuredTeams);
    setSaveSuccessMsg('Đã lưu cấu hình danh sách Đội mặc định thành công!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleApplyFastPack = (pack: typeof FAST_PRESET_PACKS[0]) => {
    soundService.playClick();
    const updated = configuredTeams.map((t, idx) => {
      const p = pack.teams[idx];
      if (p) {
        return {
          ...t,
          defaultName: p.name,
          color: p.color,
          badge: p.badge,
        };
      }
      return t;
    });
    setConfiguredTeams(updated);
    EduplayStorage.setGameData('eduplay_team_presets', updated);
    setSaveSuccessMsg(`Đã áp dụng mẫu [${pack.name}]!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleCreateQuestion = () => {
    if (!newQuestionForm.question || !newQuestionForm.options?.every((o) => o.trim())) {
      alert('Vui lòng nhập đầy đủ nội dung câu hỏi và 4 phương án lựa chọn.');
      return;
    }
    soundService.playClick();
    const newQ: Question = {
      id: Date.now(),
      question: newQuestionForm.question || '',
      options: newQuestionForm.options || ['', '', '', ''],
      correctAnswer: newQuestionForm.correctAnswer || 0,
      category: newQuestionForm.category || 'Tin học 5',
      explanation: newQuestionForm.explanation || '',
      normalPoints: 10,
      stealPoints: 5,
    };
    const updated = [newQ, ...questions];
    setQuestions(updated);
    EduplayStorage.saveQuestions(updated);
    setShowAddQuestionModal(false);
    setNewQuestionForm({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      category: 'Tin học 5',
      explanation: '',
      normalPoints: 10,
      stealPoints: 5,
    });
    setSaveSuccessMsg('Đã thêm câu hỏi mới vào ngân hàng câu hỏi!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteQuestion = (qId: number) => {
    soundService.playClick();
    const updated = questions.filter((q) => q.id !== qId);
    setQuestions(updated);
    EduplayStorage.saveQuestions(updated);
  };

  const handleExportQuestions = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `eduplay_questions_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundService.playClick();
              onBackToEduplay();
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Eduplay Home</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                <span>DASHBOARD GIÁO VIÊN</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                  Thi Đấu Theo Đội
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Quản lý Đội chơi • Ngân hàng câu hỏi • Google Sheets</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('TEAMS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'TEAMS'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Đội thi đấu (2-4 đội)</span>
          </button>
          <button
            onClick={() => setActiveTab('QUESTIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'QUESTIONS'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ngân hàng câu hỏi ({questions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử ván đấu</span>
          </button>
          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'DATABASE'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Google Sheets Cloud</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* TAB 1: TEAMS MANAGEMENT (No individual students) */}
        {activeTab === 'TEAMS' && (
          <div className="space-y-6">
            {/* Philosophy Banner */}
            <div className="bg-gradient-to-r from-blue-950/60 to-purple-950/60 border border-blue-500/30 rounded-3xl p-5 shadow-xl space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-black text-white uppercase">
                  Mô Hình Thi Đấu Theo Đội (2, 3 hoặc 4 Đội)
                </h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hệ thống EDUPLAY chuyển hoàn toàn sang cơ chế thi đua theo nhóm: Giáo viên không cần quản lý chi tiết từng học sinh. Trước mỗi trận đấu, giáo viên chỉ cần chọn số lượng đội (2, 3, hoặc 4 đội), đặt tên và phân màu sắc.
              </p>
            </div>

            {/* Quick Presets Pack selector */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Gợi Ý Mẫu Đội Nhanh Cho Lớp Học
                </h3>
                <span className="text-[11px] text-slate-400">Bấm để áp dụng nhanh</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {FAST_PRESET_PACKS.map((pack, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyFastPack(pack)}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl text-left transition-all hover:scale-[1.02] cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-white group-hover:text-cyan-300">
                        {pack.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{pack.desc}</p>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      {pack.teams.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          style={{ backgroundColor: t.color }}
                          className="w-4 h-4 rounded-full inline-block shadow-sm"
                          title={t.name}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Teams Configuration Editor (4 Default Teams) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <span>Cấu hình 4 Đội chơi mặc định</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Các giá trị này sẽ tự động nạp sẵn khi bắt đầu bất kỳ trò chơi nào (Cam Race, Quiz Battle, Fastest Hand...)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setShowTeamImportModal(true);
                    }}
                    className="px-4 py-2 bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>📥 Nhập Đội Từ CSV / Excel</span>
                  </button>
                  <button
                    onClick={handleSaveTeamsConfig}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Cấu Hình Đội</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {configuredTeams.map((team, idx) => (
                  <div
                    key={team.id}
                    style={{ borderColor: `${team.color}55` }}
                    className="p-4 rounded-2xl bg-slate-950/80 border-2 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-400">
                        ĐỘI {idx + 1}
                      </span>
                      <span className="text-xl">{team.badge}</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tên Đội:</label>
                      <input
                        type="text"
                        value={team.defaultName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfiguredTeams((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, defaultName: val } : t))
                          );
                        }}
                        style={{ color: team.color }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-bold text-sm focus:outline-none focus:border-cyan-400 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Màu Sắc Đội:</label>
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {TEAM_COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => {
                              setConfiguredTeams((prev) =>
                                prev.map((t, i) =>
                                  i === idx ? { ...t, color: c.color, badge: c.badge } : t
                                )
                              );
                            }}
                            style={{ backgroundColor: c.color }}
                            className={`w-6 h-6 rounded-full shrink-0 transition-transform ${
                              team.color === c.color ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-60 hover:opacity-100'
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUESTIONS */}
        {activeTab === 'QUESTIONS' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl">
              <div>
                <h3 className="text-sm font-black text-white uppercase">
                  Ngân hàng câu hỏi trắc nghiệm ({questions.length} câu)
                </h3>
                <p className="text-[11px] text-slate-400">Dùng chung cho Cam Race, Quiz Battle & Fastest Hand</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setShowQuestionImportModal(true);
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[3]" />
                  <span>📥 NHẬP TỪ CSV / EXCEL</span>
                </button>
                <button
                  onClick={handleExportQuestions}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Xuất JSON</span>
                </button>
                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3] text-cyan-400" />
                  <span>+ Thêm câu hỏi mới</span>
                </button>
              </div>
            </div>

            {/* Question List */}
            <div className="space-y-3">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-xs font-black">
                        Câu {qIdx + 1}
                      </span>
                      {q.category && (
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                          {q.category}
                        </span>
                      )}
                      {q.isSpecial && (
                        <span className="text-xs bg-purple-950 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md font-bold">
                          ★ Đặc biệt (x2)
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-white">{q.question}</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`p-2 rounded-xl border flex items-center gap-2 ${
                          optIdx === q.correctAnswer
                            ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      💡 Giải thích: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase">
                Lịch sử các ván đấu đã diễn ra ({history.length} ván)
              </h3>
              <button
                onClick={() => {
                  EduplayStorage.addHistoryEntry({
                    gameId: 'quiz-battle',
                    gameName: 'ĐẤU TRÍ ĐỒNG ĐỘI',
                    className: 'Toàn khối',
                    timestamp: Date.now(),
                    winner: 'ĐỘI XANH',
                    summary: 'Điểm số: ĐỘI XANH (40đ) • ĐỘI CAM (20đ) • ĐỘI TÍM (10đ)',
                  });
                  setHistory(EduplayStorage.getHistory());
                }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                + Thêm ván mẫu
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">Chưa có ván đấu nào được ghi lại.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-cyan-400">{h.gameName}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 font-semibold">{h.className}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{new Date(h.timestamp).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <p className="text-slate-300 mt-1">{h.summary}</p>
                    </div>

                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold">
                      🏆 {h.winner}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DATABASE & CLOUD */}
        {activeTab === 'DATABASE' && (
          <div className="space-y-6">
            {/* Cloud Status Banner */}
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-400" />
                      HỆ THỐNG DỮ LIỆU GOOGLE SHEETS CLOUD
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      syncStatus.mode === 'cloud'
                        ? syncStatus.isCloudReachable
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {syncStatus.mode === 'cloud'
                        ? (syncStatus.isCloudReachable ? '● Cloud Đang hoạt động' : '○ Mất kết nối Cloud')
                        : '💻 Local Mode (Trình duyệt)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Kiến trúc: EDUPLAY Web ↔ Google Apps Script API (/exec) ↔ 16 Bảng dữ liệu Google Sheets
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      apiClient.setMode(syncStatus.mode === 'cloud' ? 'local' : 'cloud');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                      syncStatus.mode === 'cloud'
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 hover:bg-blue-600/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Chuyển sang: {syncStatus.mode === 'cloud' ? '💻 Chế độ Local' : '☁️ Chế độ Cloud'}
                  </button>

                  <button
                    type="button"
                    disabled={isSyncing || syncStatus.pendingEventsCount === 0}
                    onClick={async () => {
                      soundService.playClick();
                      setIsSyncing(true);
                      await apiClient.flushPendingQueue();
                      setIsSyncing(false);
                      setSaveSuccessMsg('Đã hoàn tất đồng bộ hàng đợi ngoại tuyến!');
                      setTimeout(() => setSaveSuccessMsg(null), 3000);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Đồng bộ hàng đợi ({syncStatus.pendingEventsCount})</span>
                  </button>
                </div>
              </div>

              {/* Web App URL Config */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 block">
                  Đường dẫn Google Apps Script Web App (/exec):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cloudUrlInput}
                    onChange={(e) => setCloudUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      apiClient.setApiUrl(cloudUrlInput);
                      setSaveSuccessMsg('Đã cập nhật URL Google Apps Script Web App!');
                      setTimeout(() => setSaveSuccessMsg(null), 3000);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
                  >
                    Lưu URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Biến môi trường hiện tại: <code className="text-cyan-400">VITE_APPS_SCRIPT_API_URL</code>. Thầy cô có thể ghi đè bằng ô nhập trên.
                </p>
              </div>

              {/* 16 Sheet Schemas Grid */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  16 Bảng dữ liệu chuẩn hóa của hệ sinh thái EDUPLAY:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {[
                    { name: 'SETTINGS', desc: '13 tham số hệ thống' },
                    { name: 'GAME_CATALOG', desc: '6 game tương tác' },
                    { name: 'CLASSES', desc: 'Danh sách khối/lớp' },
                    { name: 'STUDENTS', desc: '(Bảo lưu) Hồ sơ' },
                    { name: 'QUESTION_BANKS', desc: 'Ngân hàng đề thi' },
                    { name: 'QUESTIONS', desc: 'Bộ câu hỏi trắc nghiệm' },
                    { name: 'GAME_SESSIONS', desc: 'Phiên trận đấu (2-4 đội)' },
                    { name: 'TEAMS', desc: 'Đội thi đấu & điểm số' },
                    { name: 'PARTICIPANTS', desc: '(Bảo lưu) Người chơi' },
                    { name: 'SCORE_EVENTS', desc: 'Lịch sử cộng/trừ điểm' },
                    { name: 'GAME_RESULTS', desc: 'Bảng xếp hạng chung cuộc' },
                    { name: 'CAM_RACE_RESULTS', desc: 'Lịch sử nhận diện thẻ' },
                    { name: 'LUCKY_WHEEL_HISTORY', desc: 'Lịch sử quay may mắn' },
                    { name: 'RANDOM_PICKER_HISTORY', desc: 'Lịch sử chọn ngẫu nhiên' },
                    { name: 'CERTIFICATES', desc: 'Chứng nhận khen thưởng' },
                    { name: 'APP_LOGS', desc: 'Nhật ký lỗi & sự kiện' },
                  ].map((table) => (
                    <div key={table.name} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <p className="font-bold text-cyan-400 font-mono text-[11px]">{table.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{table.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD QUESTION */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white uppercase">Thêm câu hỏi trắc nghiệm mới</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nội dung câu hỏi:</label>
                <textarea
                  rows={2}
                  value={newQuestionForm.question}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question: e.target.value })}
                  placeholder="Ví dụ: Đâu là thiết bị xuất của máy tính?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {['A', 'B', 'C', 'D'].map((label, idx) => (
                  <div key={label}>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Phương án {label}:</label>
                    <input
                      type="text"
                      value={newQuestionForm.options?.[idx] || ''}
                      onChange={(e) => {
                        const newOpts = [...(newQuestionForm.options || ['', '', '', ''])];
                        newOpts[idx] = e.target.value;
                        setNewQuestionForm({ ...newQuestionForm, options: newOpts });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Đáp án đúng:</label>
                <select
                  value={newQuestionForm.correctAnswer}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, correctAnswer: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value={0}>A</option>
                  <option value={1}>B</option>
                  <option value={2}>C</option>
                  <option value={3}>D</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Chủ đề:</label>
                <input
                  type="text"
                  value={newQuestionForm.category}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateQuestion}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Lưu câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION IMPORT MODAL */}
      <QuestionImportModal
        isOpen={showQuestionImportModal}
        onClose={() => setShowQuestionImportModal(false)}
        currentQuestions={questions}
        onImportSuccess={(newQuestions) => {
          setQuestions(newQuestions);
          setSaveSuccessMsg(`Đã nhập thành công dữ liệu vào Ngân hàng câu hỏi! Hiện có ${newQuestions.length} câu.`);
          setTimeout(() => setSaveSuccessMsg(null), 4000);
        }}
      />

      {/* TEAM IMPORT MODAL */}
      <TeamImportModal
        isOpen={showTeamImportModal}
        onClose={() => setShowTeamImportModal(false)}
        onApplyTeams={handleApplyImportedTeams}
      />
    </div>
  );
};
