import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Disc,
  Play,
  ArrowLeft,
  Sparkles,
  Gift,
  Users,
  Plus,
  Trash2,
  Trophy,
  CheckCircle,
  HelpCircle,
  Award,
} from 'lucide-react';
import { EduplayStorage, STORAGE_NAMESPACES } from '../../services/eduplayStorage';
import { soundService } from '../../services/soundService';
import { LuckyWheelRepository } from '../../repositories/luckyWheelRepository';
import { apiClient } from '../../services/apiClient';

interface WheelItem {
  id: string;
  text: string;
  color: string;
}

const PRESET_TEAMS: WheelItem[] = [
  { id: 't1', text: '🔵 ĐỘI XANH', color: '#3b82f6' },
  { id: 't2', text: '🟠 ĐỘI CAM', color: '#f97316' },
  { id: 't3', text: '🟢 ĐỘI XANH LÁ', color: '#22c55e' },
  { id: 't4', text: '🟣 ĐỘI TÍM', color: '#a855f7' },
];

const PRESET_QUESTIONS: WheelItem[] = [
  { id: 'q1', text: '❓ Thiết bị nhập & xuất', color: '#06b6d4' },
  { id: 'q2', text: '❓ Trình duyệt Web', color: '#3b82f6' },
  { id: 'q3', text: '❓ Tệp và Thư mục', color: '#10b981' },
  { id: 'q4', text: '❓ Phím tắt thông dụng', color: '#f59e0b' },
  { id: 'q5', text: '❓ An toàn Internet', color: '#ec4899' },
  { id: 'q6', text: '❓ Phần mềm trình chiếu', color: '#8b5cf6' },
];

const PRESET_PRIZES: WheelItem[] = [
  { id: 'p1', text: '👏 TRÀNG PHÁO TAY', color: '#10b981' },
  { id: 'p2', text: '🎵 CHỌN BÀI HÁT', color: '#06b6d4' },
  { id: 'p3', text: '⭐ HUY HIỆU DANH DỰ', color: '#f59e0b' },
  { id: 'p4', text: '👑 QUYỀN CHỌN CÂU HỎI', color: '#ec4899' },
  { id: 'p5', text: '🛡️ MIỄN 1 THỬ THÁCH', color: '#8b5cf6' },
  { id: 'p6', text: '🎁 QUÀ TẶNG BÍ MẬT', color: '#ef4444' },
];

const PRESET_CHALLENGES: WheelItem[] = [
  { id: 'c1', text: '⚡ Đọc 3 phím tắt tin học', color: '#f59e0b' },
  { id: 'c2', text: '⚡ Kể tên 2 thiết bị xuất', color: '#06b6d4' },
  { id: 'c3', text: '⚡ Tạo tư thế gõ phím chuẩn', color: '#10b981' },
  { id: 'c4', text: '⚡ Hát 1 câu hát vui', color: '#ec4899' },
  { id: 'c5', text: '⚡ Kể tên 3 trang web học tập', color: '#8b5cf6' },
  { id: 'c6', text: '⚡ Mô phỏng tiếng Robot', color: '#ef4444' },
];

const PRESET_POINTS: WheelItem[] = [
  { id: 'pt1', text: '+10 ĐIỂM', color: '#f59e0b' },
  { id: 'pt2', text: '+20 ĐIỂM THƯỞNG', color: '#ef4444' },
  { id: 'pt3', text: '+5 ĐIỂM', color: '#8b5cf6' },
  { id: 'pt4', text: '🔥 NHÂN ĐÔI ĐIỂM (x2)', color: '#14b8a6' },
  { id: 'pt5', text: '+15 ĐIỂM TỐC ĐỘ', color: '#06b6d4' },
  { id: 'pt6', text: '🍀 MAY MẮN LẦN SAU', color: '#64748b' },
];

const SLICE_COLORS = [
  '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
  '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6',
];

interface LuckyWheelGameProps {
  onBackToEduplay: () => void;
}

export const LuckyWheelGame: React.FC<LuckyWheelGameProps> = ({ onBackToEduplay }) => {
  const [items, setItems] = useState<WheelItem[]>(() => {
    return EduplayStorage.getGameData(STORAGE_NAMESPACES.LUCKY_WHEEL, PRESET_TEAMS);
  });
  const [activeCategory, setActiveCategory] = useState<'TEAMS' | 'QUESTIONS' | 'PRIZES' | 'CHALLENGES' | 'POINTS'>('TEAMS');
  const [newItemText, setNewItemText] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Save items to local storage
  useEffect(() => {
    EduplayStorage.setGameData(STORAGE_NAMESPACES.LUCKY_WHEEL, items);
  }, [items]);

  // Load Presets (Team-based, No students)
  const handleSelectPreset = (cat: 'TEAMS' | 'QUESTIONS' | 'PRIZES' | 'CHALLENGES' | 'POINTS') => {
    soundService.playClick();
    setActiveCategory(cat);
    setWinner(null);
    switch (cat) {
      case 'TEAMS':
        setItems(PRESET_TEAMS);
        break;
      case 'QUESTIONS':
        setItems(PRESET_QUESTIONS);
        break;
      case 'PRIZES':
        setItems(PRESET_PRIZES);
        break;
      case 'CHALLENGES':
        setItems(PRESET_CHALLENGES);
        break;
      case 'POINTS':
        setItems(PRESET_POINTS);
        break;
    }
  };

  // Canvas drawing routine
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2 - 10;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Thêm ô để quay', centerX, centerY);
      return;
    }

    const arcSize = (2 * Math.PI) / items.length;

    // Draw Slices
    items.forEach((item, i) => {
      const sliceAngle = angle + i * arcSize;

      ctx.beginPath();
      ctx.fillStyle = item.color;
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, sliceAngle, sliceAngle + arcSize);
      ctx.closePath();
      ctx.fill();

      // Slice border
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(sliceAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;

      // Truncate text if needed
      const maxLen = 22;
      const textToDraw = item.text.length > maxLen ? item.text.slice(0, maxLen) + '...' : item.text;
      ctx.fillText(textToDraw, radius - 20, 5);
      ctx.restore();
    });

    // Center Hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center Dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  };

  useEffect(() => {
    drawWheel(rotationAngle);
  }, [items, rotationAngle]);

  // Spin Logic with Ease-Out Deceleration
  const handleSpin = () => {
    if (isSpinning || items.length === 0) return;
    setIsSpinning(true);
    setWinner(null);
    soundService.playDrumRoll();

    const spinRotations = 6 + Math.random() * 4; // 6 to 10 full turns
    const extraDegrees = Math.random() * 2 * Math.PI;
    const totalAngleDelta = spinRotations * 2 * Math.PI + extraDegrees;
    const startAngle = rotationAngle;
    const endAngle = startAngle + totalAngleDelta;

    const duration = 4500; // 4.5 seconds
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + totalAngleDelta * ease;

      setRotationAngle(currentAngle);
      drawWheel(currentAngle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        // Calculate Winner
        const normalizedAngle = (endAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const pointerAngle = (3 * Math.PI) / 2; // Pointer is at top
        const relativeAngle = (pointerAngle - normalizedAngle + 2 * Math.PI) % (2 * Math.PI);

        const arcSize = (2 * Math.PI) / items.length;
        const winningIndex = Math.floor(relativeAngle / arcSize) % items.length;
        const winningItem = items[winningIndex];

        setWinner(winningItem);
        soundService.playChampionFanfare();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

        // Record History
        EduplayStorage.addHistoryEntry({
          gameId: 'lucky-wheel',
          gameName: 'VÒNG QUAY MAY MẮN',
          className: 'Toàn trường',
          timestamp: Date.now(),
          winner: winningItem.text,
          summary: `Kết quả quay: ${winningItem.text}`,
        });

        // Cloud sync
        if (apiClient.getMode() === 'cloud') {
          LuckyWheelRepository.logSpin({
            sessionId: `lw_${Date.now()}`,
            segmentLabel: winningItem.text,
            rewardType: activeCategory,
            appliedTarget: winningItem.text,
          }).catch(() => {});
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    soundService.playClick();
    const newItem: WheelItem = {
      id: `custom_${Date.now()}`,
      text: newItemText.trim(),
      color: SLICE_COLORS[items.length % SLICE_COLORS.length],
    };
    setItems((prev) => [...prev, newItem]);
    setNewItemText('');
  };

  const handleDeleteItem = (id: string) => {
    soundService.playClick();
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-emerald-900/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Disc className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                <span>VÒNG QUAY MAY MẮN</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  LUCKY WHEEL
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Quay tên đội, câu hỏi, điểm thưởng & thử thách vui</p>
            </div>
          </div>
        </div>

        {/* 5 Preset Tabs (Quay Đội, Câu hỏi, Quà, Thử thách, Điểm) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => handleSelectPreset('TEAMS')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1 cursor-pointer transition-all ${
              activeCategory === 'TEAMS'
                ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 Đội chơi</span>
          </button>
          <button
            onClick={() => handleSelectPreset('QUESTIONS')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1 cursor-pointer transition-all ${
              activeCategory === 'QUESTIONS'
                ? 'bg-cyan-600 border-cyan-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>❓ Câu hỏi</span>
          </button>
          <button
            onClick={() => handleSelectPreset('POINTS')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1 cursor-pointer transition-all ${
              activeCategory === 'POINTS'
                ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>🌟 Điểm</span>
          </button>
          <button
            onClick={() => handleSelectPreset('PRIZES')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1 cursor-pointer transition-all ${
              activeCategory === 'PRIZES'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>🎁 Quà tặng</span>
          </button>
          <button
            onClick={() => handleSelectPreset('CHALLENGES')}
            className={`text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1 cursor-pointer transition-all ${
              activeCategory === 'CHALLENGES'
                ? 'bg-pink-600 border-pink-400 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ Thử thách</span>
          </button>
        </div>
      </header>

      {/* Main Wheel View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Wheel Side */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Arrow Pointer on Top */}
          <div className="relative z-20 mb-[-18px]">
            <div className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[32px] border-t-amber-400 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
          </div>

          {/* Canvas Wheel */}
          <div className="relative p-2 bg-slate-900 border-4 border-slate-800 rounded-full shadow-2xl shadow-emerald-500/10">
            <canvas
              ref={canvasRef}
              width={420}
              height={420}
              className="max-w-[320px] max-h-[320px] sm:max-w-[420px] sm:max-h-[420px] rounded-full"
            />
          </div>

          {/* Spin Button */}
          <div className="mt-6 flex items-center gap-3">
            <button
              disabled={isSpinning || items.length === 0}
              onClick={handleSpin}
              className={`px-10 py-4 rounded-2xl font-black text-lg uppercase tracking-wider flex items-center gap-3 shadow-2xl transition-all cursor-pointer ${
                isSpinning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 active:scale-95 shadow-emerald-500/20 hover:scale-105'
              }`}
            >
              <Play className="w-6 h-6 fill-current" />
              <span>{isSpinning ? 'ĐANG QUAY...' : 'QUAY NGAY'}</span>
            </button>
          </div>
        </div>

        {/* Item Editor / Management Side */}
        <div className="w-full lg:w-96 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 backdrop-blur shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                <span>Danh sách ô quay</span>
                <span className="text-xs bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {items.length} ô
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Chế độ: <strong className="text-emerald-400">{activeCategory}</strong>
              </p>
            </div>
          </div>

          {/* Winner Result Box */}
          {winner && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border-2 border-emerald-500/60 shadow-xl text-center space-y-1 animate-in zoom-in-50 duration-200">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> KẾT QUẢ VÒNG QUAY
              </span>
              <h4 className="text-xl font-black text-white">{winner.text}</h4>
            </div>
          )}

          {/* Add custom slice input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nhập tên ô quay mới..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleAddItem}
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              title="Thêm ô"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Slices list */}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-bold text-slate-200 truncate">{item.text}</span>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                  title="Xóa ô"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
