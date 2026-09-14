import React from 'react';
import { Play, Camera, Sparkles, Disc, Flame, Trophy, Users, ShieldCheck, ChevronRight } from 'lucide-react';
import { GAME_REGISTRY, GameDefinition } from '../../../games/gameRegistry';
import { soundService } from '../../../services/soundService';

const ICONS_MAP: Record<string, React.ReactNode> = {
  Camera: <Camera className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Disc: <Disc className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  Trophy: <Trophy className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
};

interface AdminGamesTabProps {
  onSelectGame: (gameId: string) => void;
}

export const AdminGamesTab: React.FC<AdminGamesTabProps> = ({ onSelectGame }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-5 h-5 text-rose-500" />
            Danh Mục 6 Trò Chơi Chính Thức
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tất cả trò chơi đều hỗ trợ máy chiếu 16:9, bảng điểm trực quan và cấp chứng nhận vô địch theo đội.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {GAME_REGISTRY.map((game) => {
          const icon = ICONS_MAP[game.iconName] || <Play className="w-5 h-5" />;

          return (
            <div
              key={game.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl flex flex-col justify-between transition-all group shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${game.theme.gradient} flex items-center justify-center text-white shadow-md`}>
                    {icon}
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    game.supportsCamera
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {game.supportsCamera ? '📷 Có Webcam' : '❌ Không cần Webcam'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-white group-hover:text-rose-400 transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">{game.subtitle}</p>
                  <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Số đội hỗ trợ:</span>
                  <span className="font-extrabold text-white px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                    {game.players}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    onSelectGame(game.id);
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-gradient-to-r ${game.theme.gradient} hover:opacity-90 shadow-md cursor-pointer transition-all active:scale-95`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>CHƠI NGAY</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
