import React from 'react';
import { Trophy, Medal, Award, Calendar, ShieldCheck, Download } from 'lucide-react';
import { GameSession } from '../../../types';
import { soundService } from '../../../services/soundService';

interface AdminResultsTabProps {
  sessions: GameSession[];
}

export const AdminResultsTab: React.FC<AdminResultsTabProps> = ({ sessions }) => {
  // Compute leaderboard across all sessions by team name
  const teamStatsMap = new Map<string, { wins: number; totalScore: number; gamesPlayed: number }>();

  sessions.forEach((s) => {
    // Blue Team
    const blueName = s.blueTeamName || 'Đội Xanh';
    const blueCurrent = teamStatsMap.get(blueName) || { wins: 0, totalScore: 0, gamesPlayed: 0 };
    blueCurrent.gamesPlayed += 1;
    blueCurrent.totalScore += s.blueScore || 0;
    if (s.blueScore > s.orangeScore) blueCurrent.wins += 1;
    teamStatsMap.set(blueName, blueCurrent);

    // Orange Team
    const orangeName = s.orangeTeamName || 'Đội Cam';
    const orangeCurrent = teamStatsMap.get(orangeName) || { wins: 0, totalScore: 0, gamesPlayed: 0 };
    orangeCurrent.gamesPlayed += 1;
    orangeCurrent.totalScore += s.orangeScore || 0;
    if (s.orangeScore > s.blueScore) orangeCurrent.wins += 1;
    teamStatsMap.set(orangeName, orangeCurrent);
  });

  const leaderboard = Array.from(teamStatsMap.entries())
    .map(([name, stat]) => ({ name, ...stat }))
    .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore);

  const exportResultsCsv = () => {
    soundService.playClick();
    const rows = [
      ['Hạng', 'Tên Đội', 'Số Trận Thắng', 'Tổng Điểm', 'Số Trận Đã Đấu'],
      ...leaderboard.map((item, idx) => [
        String(idx + 1),
        item.name,
        String(item.wins),
        String(item.totalScore),
        String(item.gamesPlayed),
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `eduplay_bang_xep_hang_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            BẢNG XẾP HẠNG & KẾT QUẢ ĐỒNG ĐỘI
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tổng hợp huy chương, điểm số thi đua tập thể. Tuân thủ quyền riêng tư: Tuyệt đối không lưu dữ liệu cá nhân học sinh.
          </p>
        </div>

        {leaderboard.length > 0 && (
          <button
            type="button"
            onClick={exportResultsCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Xuất CSV Bảng Điểm</span>
          </button>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl text-slate-500">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-500" />
          <p className="text-sm font-bold text-slate-300">Chưa có kết quả xếp hạng nào.</p>
          <p className="text-xs text-slate-500 mt-1">
            Sau khi hoàn thành các trận đấu, thống kê huy chương các đội sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 3 Podium Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaderboard.slice(0, 3).map((team, idx) => {
              const medals = ['🥇 QUÁN QUÂN', '🥈 Á QUÂN', '🥉 HẠNG BA'];
              const medalStyles = [
                'from-amber-500/20 to-yellow-600/10 border-amber-500/40 text-amber-300',
                'from-slate-400/20 to-slate-500/10 border-slate-400/40 text-slate-300',
                'from-amber-700/20 to-orange-800/10 border-amber-700/40 text-amber-400',
              ];

              return (
                <div
                  key={team.name}
                  className={`bg-gradient-to-b ${medalStyles[idx]} border p-5 rounded-3xl flex flex-col justify-between shadow-lg`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider">{medals[idx]}</span>
                    <span className="text-2xl">{['🥇', '🥈', '🥉'][idx]}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{team.name}</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      {team.wins} trận thắng • {team.totalScore} tổng điểm
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400">
                    Đã thi đấu {team.gamesPlayed} trận
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Table */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                BẢNG XẾP HẠNG CHI TIẾT TẤT CẢ CÁC ĐỘI
              </h3>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Team-Level Privacy
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">HẠNG</th>
                    <th className="px-4 py-3">TÊN ĐỘI</th>
                    <th className="px-4 py-3 text-center">TRẬN THẮNG</th>
                    <th className="px-4 py-3 text-center">TỔNG ĐIỂM</th>
                    <th className="px-4 py-3 text-center">SỐ TRẬN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {leaderboard.map((team, idx) => (
                    <tr key={team.name} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-black">
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white">
                        {team.name}
                      </td>
                      <td className="px-4 py-3.5 text-center font-extrabold text-amber-400">
                        {team.wins}
                      </td>
                      <td className="px-4 py-3.5 text-center font-black text-white">
                        {team.totalScore}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-400">
                        {team.gamesPlayed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
