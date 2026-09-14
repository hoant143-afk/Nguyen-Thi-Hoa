import React, { useState } from 'react';
import {
  Camera,
  Zap,
  Disc,
  Flame,
  Sparkles,
  Trophy,
  Users,
  Play,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Monitor,
  CheckCircle2,
  ChevronRight,
  Star,
} from 'lucide-react';
import { GAME_REGISTRY, GameDefinition } from '../games/gameRegistry';
import { soundService } from '../services/soundService';

interface EduplayHomeProps {
  onSelectGame: (gameId: string) => void;
  onOpenTeacherDashboard: () => void;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Camera: <Camera className="w-6 h-6" />,
  Zap: <Zap className="w-6 h-6" />,
  Disc: <Disc className="w-6 h-6" />,
  Flame: <Flame className="w-6 h-6" />,
  Sparkles: <Sparkles className="w-6 h-6" />,
  Trophy: <Trophy className="w-6 h-6" />,
  Users: <Users className="w-6 h-6" />,
};

export const EduplayHome: React.FC<EduplayHomeProps> = ({
  onSelectGame,
  onOpenTeacherDashboard,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'Tất cả trò chơi (6)' },
    { id: 'Vận động & AI', label: '🏃 Vận động & AI' },
    { id: 'Trí tuệ & Trắc nghiệm', label: '⚡ Trí tuệ' },
    { id: 'May mắn & Hoạt náo', label: '🎡 Hoạt náo' },
    { id: 'Phản xạ & Tốc độ', label: '⏱️ Tốc độ' },
    { id: 'Lựa chọn', label: '🎯 Lựa chọn' },
    { id: 'Thi đua nhóm', label: '🏆 Nhóm' },
  ];

  const filteredGames = GAME_REGISTRY.filter((game) => {
    if (selectedCategory === 'ALL') return true;
    return game.category === selectedCategory;
  });

  const handleGameClick = (gameId: string) => {
    soundService.playClick();
    onSelectGame(gameId);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-rose-50/90 to-pink-100/70 border border-rose-200/90 p-6 md:p-12 shadow-xl shadow-rose-500/5">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-rose-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100/90 border border-rose-300/80 text-rose-700 text-xs font-black tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>NỀN TẢNG GIÁO DỤC TƯƠNG TÁC LỚP HỌC 4.0</span>
          </div>

          {/* Slogan & Title */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              EDUPLAY
            </h1>
            <p className="text-lg md:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600">
              “Hệ thống trò chơi tương tác lớp học”
            </p>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed pt-1">
              Hệ thống trò chơi tương tác đa năng dành riêng cho giáo viên và học sinh trên máy chiếu:
              Webcam AI nhận diện thẻ màu, chuông bấm tốc độ cao, vòng quay may mắn và bảng thi đua nhóm trực quan.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#games"
              onClick={() => soundService.playClick()}
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-rose-500/25 cursor-pointer active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>CHỌN TRÒ CHƠI NGAY</span>
            </a>

            <button
              onClick={() => {
                soundService.playClick();
                onOpenTeacherDashboard();
              }}
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-rose-50 text-slate-700 border border-rose-200/90 font-bold text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <GraduationCap className="w-4 h-4 text-amber-500" />
              <span>Bảng điều khiển Giáo viên</span>
            </button>
          </div>

          {/* Classroom Feature Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-rose-200/80 text-left">
            <div className="p-3 rounded-xl bg-white/90 border border-rose-200/80 flex items-center gap-2.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <div>
                <p className="text-xs font-black text-slate-900">6 Trò chơi phong phú</p>
                <p className="text-[10px] text-slate-500">Đáp ứng mọi môn học</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/90 border border-rose-200/80 flex items-center gap-2.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-black text-slate-900">Chuẩn máy chiếu 16:9</p>
                <p className="text-[10px] text-slate-500">Chữ to, rõ ràng từ xa</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/90 border border-rose-200/80 flex items-center gap-2.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <div>
                <p className="text-xs font-black text-slate-900">Computer Vision AI</p>
                <p className="text-[10px] text-slate-500">Nhận diện thẻ giơ cực nhạy</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/90 border border-rose-200/80 flex items-center gap-2.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <div>
                <p className="text-xs font-black text-slate-900">Không cần cài đặt</p>
                <p className="text-[10px] text-slate-500">Mở là chơi ngay lập tức</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Catalog Section */}
      <section id="games" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-rose-600 uppercase tracking-wider mb-1">
              <span>🎮 KHO TRÒ CHƠI LỚP HỌC</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Chọn trò chơi tương tác cho tiết học
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Nhấp vào trò chơi bất kỳ để bắt đầu thi đấu ngay trên lớp học
            </p>
          </div>

          {/* Filter Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  soundService.playClick();
                  setSelectedCategory(cat.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black shadow-md shadow-rose-500/20'
                    : 'bg-white border border-rose-200/80 text-slate-600 hover:text-slate-900 hover:bg-rose-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6 Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGames.map((game) => {
            const iconElement = ICONS_MAP[game.iconName] || <Play className="w-6 h-6" />;

            return (
              <div
                key={game.id}
                onClick={() => handleGameClick(game.id)}
                className="group relative rounded-3xl border border-rose-200/80 bg-white hover:bg-white/95 p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-300 cursor-pointer shadow-xs"
              >
                <div>
                  {/* Top Badges & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${game.theme.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      {iconElement}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                          game.supportsCamera
                            ? 'bg-cyan-500/15 text-cyan-700 border-cyan-400/40'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {game.supportsCamera ? '📷 Có Webcam' : '❌ Không cần Webcam'}
                      </span>
                      <span
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${game.theme.badgeBg} ${game.theme.badgeText}`}
                      >
                        {game.badge}
                      </span>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-1 mb-2">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                      {game.name}
                    </h3>
                    <p className={`text-xs font-bold ${game.theme.accentColor}`}>
                      {game.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {game.description}
                  </p>

                  {/* Suitable Subjects & Players Info */}
                  <div className="space-y-2 py-3 border-t border-rose-100 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Số đội hỗ trợ:</span>
                      <span className="font-extrabold text-slate-900 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100">
                        {game.players}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Môn phù hợp:</span>
                      <strong className="text-slate-800 text-right truncate max-w-[180px]">
                        {game.suitableSubject}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 mt-2 border-t border-rose-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGameClick(game.id);
                    }}
                    className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-gradient-to-r ${game.theme.gradient} group-hover:shadow-lg transition-all active:scale-95 shadow-md cursor-pointer`}
                  >
                    <span>CHƠI NGAY</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Teacher Control Quick Strip */}
      <section className="bg-white/95 border border-rose-200/80 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Cần cập nhật danh sách học sinh hoặc ngân hàng câu hỏi?
            </h3>
            <p className="text-xs text-slate-600">
              Truy cập Bảng điều khiển Giáo viên để quản lý lớp 5A1, 5A2, tạo câu hỏi trắc nghiệm Tin học và xuất dữ liệu.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundService.playClick();
            onOpenTeacherDashboard();
          }}
          className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-500/20 transition-transform active:scale-95 whitespace-nowrap"
        >
          MỞ BẢNG ĐIỀU KHIỂN →
        </button>
      </section>
    </div>
  );
};
