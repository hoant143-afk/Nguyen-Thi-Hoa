import React, { useState } from 'react';
import { History, Trophy, Users, Calendar, Clock, CheckCircle2, AlertCircle, Eye, X, Award } from 'lucide-react';
import { GameSession } from '../../../types';
import { soundService } from '../../../services/soundService';

interface AdminSessionsTabProps {
  sessions: GameSession[];
  onViewCertificate?: (session: GameSession) => void;
}

export const AdminSessionsTab: React.FC<AdminSessionsTabProps> = ({
  sessions,
  onViewCertificate,
}) => {
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            LỊCH SỬ CÁC PHIÊN CHƠI (GAME SESSIONS)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Theo dõi trạng thái, đội chiến thắng, điểm số và chi tiết các phiên đấu theo lớp.
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl text-slate-500">
          <History className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-500" />
          <p className="text-sm font-bold text-slate-300">Chưa có phiên chơi nào được ghi nhận.</p>
          <p className="text-xs text-slate-500 mt-1">
            Bắt đầu một trò chơi bất kỳ trên EDUPLAY, kết quả sẽ tự động lưu trữ tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const isBlueWinner = s.blueScore >= s.orangeScore;
            const winnerName = isBlueWinner ? s.blueTeamName : s.orangeTeamName;
            const winnerScore = isBlueWinner ? s.blueScore : s.orangeScore;

            return (
              <div
                key={s.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white uppercase tracking-wide">
                        {s.gameName || 'Trận Đấu EDUPLAY'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {s.className || 'Lớp học'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Hoàn thành
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      🏆 Đội vô địch:{' '}
                      <strong className="text-amber-400 font-extrabold">{winnerName}</strong> ({winnerScore} điểm)
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {s.date || 'Gần đây'}
                      </span>
                      <span>•</span>
                      <span>
                        Tỉ số: {s.blueTeamName} ({s.blueScore}) - {s.orangeTeamName} ({s.orangeScore})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setSelectedSession(s);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Chi tiết</span>
                  </button>

                  {onViewCertificate && (
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        onViewCertificate(s);
                      }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Cấp chứng nhận</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                CHI TIẾT PHIÊN CHƠI
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Trò chơi:</span>
                <span className="font-bold text-white">{selectedSession.gameName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Thời gian:</span>
                <span className="font-bold text-slate-200">{selectedSession.date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Lớp & Trường:</span>
                <span className="font-bold text-slate-200">{selectedSession.className} - {selectedSession.schoolName || 'Chưa thiết lập'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Giáo viên phụ trách:</span>
                <span className="font-bold text-slate-200">{selectedSession.teacherName || 'Thầy / Cô'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">{selectedSession.blueTeamName}:</span>
                <span className="font-black text-blue-400">{selectedSession.blueScore} điểm</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">{selectedSession.orangeTeamName}:</span>
                <span className="font-black text-orange-400">{selectedSession.orangeScore} điểm</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Đội vô địch:</span>
                <span className="font-black text-amber-400 text-sm">
                  🏆 {selectedSession.blueScore >= selectedSession.orangeScore ? selectedSession.blueTeamName : selectedSession.orangeTeamName}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
