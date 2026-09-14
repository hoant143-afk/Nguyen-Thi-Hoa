import React, { useState, useRef } from 'react';
import { Award, Printer, Download, Plus, Sparkles, ShieldCheck, Check, Edit3, X } from 'lucide-react';
import { CertificateRecord, CertificateConfig } from '../../../types';
import { soundService } from '../../../services/soundService';
import { GAME_REGISTRY } from '../../../games/gameRegistry';

interface AdminCertificatesTabProps {
  certificates: CertificateRecord[];
  onIssueCertificate: (cert: CertificateRecord) => Promise<void>;
}

export const AdminCertificatesTab: React.FC<AdminCertificatesTabProps> = ({
  certificates,
  onIssueCertificate,
}) => {
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const [form, setForm] = useState({
    teamName: 'ĐỘI RỒNG XANH',
    gameId: 'cam-race',
    awardTitle: 'QUÁN QUÂN',
    score: 100,
    className: '5A1',
    teacherName: 'Thầy Hoàng',
    schoolName: 'TRƯỜNG TIỂU HỌC CHU VĂN AN',
    message: 'Đã xuất sắc thể hiện tốc độ, phản xạ công nghệ và kiến thức Tin học vượt trội',
  });

  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    soundService.playClick();
    window.print();
  };

  const handleCreateSubmit = async () => {
    if (!form.teamName.trim()) {
      alert('Vui lòng nhập tên đội nhận chứng nhận!');
      return;
    }
    soundService.playClick();
    const game = GAME_REGISTRY.find((g) => g.id === form.gameId) || GAME_REGISTRY[0];

    const code = `EDU-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord: CertificateRecord = {
      id: `cert_${Date.now()}`,
      certificateCode: code,
      teamName: form.teamName.trim(),
      gameId: game.id,
      gameName: game.name,
      awardTitle: form.awardTitle,
      score: Number(form.score) || 0,
      className: form.className.trim(),
      teacherName: form.teacherName.trim(),
      schoolName: form.schoolName.trim(),
      issuedDate: new Date().toLocaleDateString('vi-VN'),
      customMessage: form.message.trim(),
    };

    await onIssueCertificate(newRecord);
    setShowCreateModal(false);
    setSelectedCert(newRecord);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            GIẤY CHỨNG NHẬN ĐỒNG ĐỘI (CERTIFICATES)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cấp chứng nhận thành tích vinh danh cho các đội thi đấu. Tuyệt đối không lưu trữ thông tin cá nhân học sinh.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            soundService.playClick();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>CẤP CHỨNG NHẬN MỚI</span>
        </button>
      </div>

      {/* Certificate List */}
      {certificates.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl text-slate-500">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-40 text-indigo-400" />
          <p className="text-sm font-bold text-slate-300">Chưa có giấy chứng nhận nào được cấp.</p>
          <p className="text-xs text-slate-500 mt-1">
            Bấm "Cấp chứng nhận mới" hoặc bấm "Cấp chứng nhận" tại danh sách phiên chơi sau mỗi trận đấu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-5 rounded-3xl flex flex-col justify-between transition-all group shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {c.certificateCode}
                  </span>
                  <span className="text-xs font-bold text-amber-400">{c.awardTitle}</span>
                </div>

                <div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors">
                    {c.teamName}
                  </h3>
                  <p className="text-xs text-slate-400">{c.gameName} • {c.score} Điểm</p>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 space-y-1">
                  <p>Lớp: <strong className="text-slate-200">{c.className}</strong></p>
                  <p>Giáo viên: <strong className="text-slate-200">{c.teacherName}</strong></p>
                  <p>Ngày cấp: <strong className="text-slate-200">{c.issuedDate}</strong></p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setSelectedCert(c);
                  }}
                  className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl text-xs font-bold border border-indigo-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>XEM & IN / PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE CERTIFICATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                CẤP GIẤY CHỨNG NHẬN ĐỒNG ĐỘI
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Tên Đội nhận giải:</label>
                <input
                  type="text"
                  value={form.teamName}
                  onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Trò chơi:</label>
                  <select
                    value={form.gameId}
                    onChange={(e) => setForm({ ...form, gameId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {GAME_REGISTRY.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Danh hiệu:</label>
                  <select
                    value={form.awardTitle}
                    onChange={(e) => setForm({ ...form, awardTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="QUÁN QUÂN">QUÁN QUÂN 🥇</option>
                    <option value="Á QUÂN">Á QUÂN 🥈</option>
                    <option value="GIẢI BA">GIẢI BA 🥉</option>
                    <option value="ĐỘI PHẢN XẠ NHANH NHẤT">ĐỘI PHẢN XẠ NHANH</option>
                    <option value="ĐỘI CHIẾN THUẬT XUẤT SẮC">ĐỘI CHIẾN THUẬT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Tổng điểm:</label>
                  <input
                    type="number"
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                  </input>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Lớp học:</label>
                  <input
                    type="text"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Giáo viên:</label>
                  <input
                    type="text"
                    value={form.teacherName}
                    onChange={(e) => setForm({ ...form, teacherName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Tên trường:</label>
                  <input
                    type="text"
                    value={form.schoolName}
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Lời tuyên dương:</label>
                <textarea
                  rows={2}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateSubmit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Tạo Giấy Chứng Nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW & PRINT CERTIFICATE MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  GIẤY CHỨNG NHẬN ĐỒNG ĐỘI • {selectedCert.certificateCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>🖨 IN / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCert(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Canvas Frame (Ready for print) */}
            <div
              ref={printAreaRef}
              className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-amber-950/20 via-slate-950 to-slate-950 border-4 border-amber-500/80 shadow-2xl text-center space-y-6 overflow-hidden"
            >
              {/* Corner decorative accents */}
              <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-400/80 pointer-events-none" />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-400/80 pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-400/80 pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-400/80 pointer-events-none" />

              <div className="space-y-1">
                <p className="text-xs font-black uppercase text-amber-400/90 tracking-widest">
                  {selectedCert.schoolName || 'TRƯỜNG HỌC EDUPLAY'}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wide uppercase">
                  GIẤY CHỨNG NHẬN VINH DANH
                </h1>
                <p className="text-xs text-slate-400">HỆ THỐNG TRÒ CHƠI TƯƠNG TÁC EDUPLAY</p>
              </div>

              <div className="py-2">
                <p className="text-xs text-slate-400 italic">Trân trọng trao tặng cho:</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  {selectedCert.teamName}
                </h2>
                <div className="inline-block mt-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-sm uppercase">
                  🏆 {selectedCert.awardTitle} ({selectedCert.score} ĐIỂM)
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                {selectedCert.customMessage || 'Đã xuất sắc thể hiện tinh thần đồng đội, phản xạ nhanh và sự hiểu biết vượt bậc.'}
              </p>

              <div className="pt-6 border-t border-amber-500/20 grid grid-cols-2 text-xs text-slate-400">
                <div className="text-left">
                  <p>Lớp học: <strong className="text-white">{selectedCert.className}</strong></p>
                  <p>Môn / Trò chơi: <strong className="text-white">{selectedCert.gameName}</strong></p>
                  <p className="text-[10px] text-slate-500 mt-1">Mã xác thực: {selectedCert.certificateCode}</p>
                </div>
                <div className="text-right">
                  <p>Ngày cấp: <strong className="text-white">{selectedCert.issuedDate}</strong></p>
                  <p>Giáo viên bộ môn</p>
                  <p className="text-sm font-black text-amber-300 mt-3">{selectedCert.teacherName || 'Giáo viên'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
