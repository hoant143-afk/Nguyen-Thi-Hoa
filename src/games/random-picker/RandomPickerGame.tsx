import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowLeft,
  Users,
  RotateCcw,
  Star,
  CheckCircle2,
  Play,
  HelpCircle,
  Gift,
  Award,
  Zap,
} from 'lucide-react';
import { EduplayStorage } from '../../services/eduplayStorage';
import { soundService } from '../../services/soundService';
import { RandomPickerRepository } from '../../repositories/randomPickerRepository';
import { apiClient } from '../../services/apiClient';
import { DEFAULT_TEAM_PRESETS } from '../../data/classData';
import { TeamCount } from '../../types';

interface PickerItem {
  id: string;
  name: string;
  badge?: string;
  color?: string;
  category?: string;
}

type PickerCategory = 'TEAMS' | 'QUESTIONS' | 'CHALLENGES' | 'REWARDS' | 'CUSTOM';

interface RandomPickerGameProps {
  onBackToEduplay: () => void;
}

export const RandomPickerGame: React.FC<RandomPickerGameProps> = ({ onBackToEduplay }) => {
  const [activeCategory, setActiveCategory] = useState<PickerCategory>('TEAMS');
  const [teamCount, setTeamCount] = useState<TeamCount>(4);

  // Default preset pools
  const teamsPool: PickerItem[] = DEFAULT_TEAM_PRESETS.slice(0, teamCount).map((t, idx) => ({
    id: `team_${idx + 1}`,
    name: t.defaultName,
    badge: t.badge,
    color: t.color,
  }));

  const questionsPool: PickerItem[] = EduplayStorage.getQuestions().map((q) => ({
    id: `q_${q.id}`,
    name: q.question,
    category: q.category,
    badge: '❓',
  }));

  const challengesPool: PickerItem[] = [
    { id: 'c1', name: 'Đọc to 3 phím tắt tin học thông dụng', badge: '⚡' },
    { id: 'c2', name: 'Kể tên 2 thiết bị xuất và 2 thiết bị nhập', badge: '⚡' },
    { id: 'c3', name: 'Mô phạm tư thế ngồi gõ phím 10 ngón chuẩn', badge: '⚡' },
    { id: 'c4', name: 'Kể tên 3 trang web học tập bổ ích', badge: '⚡' },
    { id: 'c5', name: 'Đại diện cả đội đồng thanh khẩu hiệu quyết tâm', badge: '⚡' },
    { id: 'c6', name: 'Giải thích nguyên tắc bảo vệ mật khẩu an toàn', badge: '⚡' },
  ];

  const rewardsPool: PickerItem[] = [
    { id: 'r1', name: 'Thưởng +10 Điểm Trực Tiếp', badge: '🎁', color: '#f59e0b' },
    { id: 'r2', name: 'Một tràng pháo tay cổ vũ từ cả lớp', badge: '👏', color: '#10b981' },
    { id: 'r3', name: 'Quyền ưu tiên chọn câu hỏi vòng tiếp theo', badge: '👑', color: '#3b82f6' },
    { id: 'r4', name: 'Thưởng +20 Điểm Siêu Cấp', badge: '🌟', color: '#ec4899' },
    { id: 'r5', name: 'Tấm khiên miễn trừ 1 lần trả lời sai', badge: '🛡️', color: '#8b5cf6' },
    { id: 'r6', name: 'Nhận Ngôi sao may mắn', badge: '⭐', color: '#eab308' },
  ];

  const [customTextarea, setCustomTextarea] = useState<string>('Đội Alpha\nĐội Beta\nĐội Gamma\nĐội Delta');
  const [calledIds, setCalledIds] = useState<string[]>([]);
  const [excludeCalled, setExcludeCalled] = useState<boolean>(true);

  const [isPicking, setIsPicking] = useState<boolean>(false);
  const [displayedText, setDisplayedText] = useState<string>('BẤM BẮT ĐẦU ĐỂ CHỌN');
  const [winnerItem, setWinnerItem] = useState<PickerItem | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Compute active item pool
  const getCurrentPool = (): PickerItem[] => {
    switch (activeCategory) {
      case 'TEAMS':
        return teamsPool;
      case 'QUESTIONS':
        return questionsPool;
      case 'CHALLENGES':
        return challengesPool;
      case 'REWARDS':
        return rewardsPool;
      case 'CUSTOM':
        return customTextarea
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((text, idx) => ({ id: `cust_${idx}`, name: text, badge: '🎯' }));
      default:
        return teamsPool;
    }
  };

  const pool = getCurrentPool();
  const availableItems = pool.filter((item) => !excludeCalled || !calledIds.includes(item.id));

  const handleCategoryChange = (cat: PickerCategory) => {
    soundService.playClick();
    setActiveCategory(cat);
    setCalledIds([]);
    setWinnerItem(null);
    setDisplayedText('BẤM BẮT ĐẦU ĐỂ CHỌN');
  };

  const handlePickRandom = () => {
    if (isPicking || availableItems.length === 0) return;
    soundService.playClick();
    setIsPicking(true);
    setWinnerItem(null);
    soundService.playDrumRoll();

    let counter = 0;
    const totalFlips = 30;
    const intervalDuration = 65;

    intervalRef.current = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * availableItems.length);
      const chosen = availableItems[randomIdx];
      setDisplayedText(`${chosen.badge ? chosen.badge + ' ' : ''}${chosen.name}`);
      soundService.playWheelTick();

      counter++;
      if (counter >= totalFlips) {
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Final Winner
        const finalWinner = availableItems[Math.floor(Math.random() * availableItems.length)];
        setWinnerItem(finalWinner);
        setDisplayedText(`${finalWinner.badge ? finalWinner.badge + ' ' : ''}${finalWinner.name}`);
        setCalledIds((prev) => [...prev, finalWinner.id]);
        setIsPicking(false);

        soundService.playChampionFanfare();
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.5 },
        });

        EduplayStorage.addHistoryEntry({
          gameId: 'random-picker',
          gameName: 'CHỌN ĐỘI NGẪU NHIÊN',
          className: 'Lớp thi đấu',
          timestamp: Date.now(),
          winner: finalWinner.name,
          summary: `Chế độ [${activeCategory}]: Đã chọn ${finalWinner.name}`,
        });

        // Cloud record
        if (apiClient.getMode() === 'cloud') {
          RandomPickerRepository.recordPick({
            studentId: finalWinner.id,
            studentName: finalWinner.name,
            className: activeCategory,
            actionType: 'CALLED',
          }).catch(() => {});
        }
      }
    }, intervalDuration);
  };

  const handleResetCalled = () => {
    soundService.playClick();
    setCalledIds([]);
    setWinnerItem(null);
    setDisplayedText('BẤM BẮT ĐẦU ĐỂ CHỌN');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-cyan-900/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
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
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                <span>CHỌN ĐỘI NGẪU NHIÊN</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                  RANDOM PICKER
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Chọn ngẫu nhiên đội, câu hỏi, thử thách & phần thưởng</p>
            </div>
          </div>
        </div>

        {/* Categories Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => handleCategoryChange('TEAMS')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeCategory === 'TEAMS'
                ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 Chọn Đội</span>
          </button>
          <button
            onClick={() => handleCategoryChange('QUESTIONS')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeCategory === 'QUESTIONS'
                ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>❓ Câu hỏi</span>
          </button>
          <button
            onClick={() => handleCategoryChange('CHALLENGES')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeCategory === 'CHALLENGES'
                ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Thử thách</span>
          </button>
          <button
            onClick={() => handleCategoryChange('REWARDS')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeCategory === 'REWARDS'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>🎁 Phần thưởng</span>
          </button>
          <button
            onClick={() => handleCategoryChange('CUSTOM')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeCategory === 'CUSTOM'
                ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <span>✍️ Tùy chỉnh</span>
          </button>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col items-center justify-center space-y-6">
        {/* Team count toggle if TEAMS mode */}
        {activeCategory === 'TEAMS' && (
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-2xl">
            <span className="text-xs font-bold text-slate-400 uppercase">Số lượng đội:</span>
            {[2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                onClick={() => {
                  setTeamCount(cnt as TeamCount);
                  setCalledIds([]);
                  setWinnerItem(null);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                  teamCount === cnt
                    ? 'bg-cyan-500 text-slate-950 shadow-md scale-105'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cnt} ĐỘI
              </button>
            ))}
          </div>
        )}

        {/* Giant Display Podium */}
        <div className="w-full max-w-3xl aspect-[16/8] min-h-[260px] bg-slate-900/90 border-4 border-slate-800 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="text-xs bg-slate-800 text-cyan-400 border border-slate-700 px-3 py-1 rounded-full font-bold">
              Còn lại: {availableItems.length}/{pool.length}
            </span>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeCalled}
                onChange={(e) => setExcludeCalled(e.target.checked)}
                className="accent-cyan-500 rounded"
              />
              <span>Loại trừ mục đã gọi</span>
            </label>
          </div>

          {/* Center Name/Text */}
          <div className="text-center space-y-3 max-w-2xl px-4">
            <div
              className={`font-black text-2xl sm:text-4xl md:text-5xl tracking-tight leading-snug transition-all ${
                isPicking
                  ? 'text-cyan-300 scale-105 filter drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : winnerItem
                  ? 'text-amber-300 filter drop-shadow-[0_0_16px_rgba(245,158,11,0.5)]'
                  : 'text-slate-400'
              }`}
            >
              {displayedText}
            </div>

            {winnerItem && !isPicking && (
              <p className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider animate-bounce">
                🎉 ĐÃ CHỌN ĐƯỢC MỤC NGẪU NHIÊN!
              </p>
            )}
          </div>

          {/* Progress bar line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            disabled={isPicking || availableItems.length === 0}
            onClick={handlePickRandom}
            className={`px-10 py-4 rounded-2xl font-black text-lg uppercase tracking-wider flex items-center gap-3 shadow-2xl transition-all cursor-pointer ${
              isPicking || availableItems.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white active:scale-95 shadow-cyan-500/25 hover:scale-105'
            }`}
          >
            <Play className="w-6 h-6 fill-current" />
            <span>{isPicking ? 'ĐANG CHỌN...' : 'QUAY CHỌN NGẪU NHIÊN'}</span>
          </button>

          <button
            onClick={handleResetCalled}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Đặt lại danh sách"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>

        {/* Custom text area if CUSTOM mode */}
        {activeCategory === 'CUSTOM' && (
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-bold text-slate-300">
              Nhập danh sách tùy chỉnh (mỗi dòng một mục):
            </label>
            <textarea
              rows={4}
              value={customTextarea}
              onChange={(e) => setCustomTextarea(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
        )}

        {/* Called items history pill list */}
        {calledIds.length > 0 && (
          <div className="w-full max-w-3xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase">Đã gọi ({calledIds.length} mục):</span>
              <button
                onClick={handleResetCalled}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                Xóa lịch sử gọi
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {calledIds.map((id) => {
                const item = pool.find((i) => i.id === id);
                return (
                  <span
                    key={id}
                    className="text-xs bg-slate-900 border border-slate-700 px-3 py-1 rounded-xl text-slate-300 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{item?.name || id}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
