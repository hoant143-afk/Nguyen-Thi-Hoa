import React, { useState } from 'react';
import { Settings, HelpCircle, Plus, Trash2, ArrowUp, ArrowDown, Edit2, RotateCcw, X, Check, Sparkles, Volume2 } from 'lucide-react';
import { Question, GameSettings } from '../types';
import { DEFAULT_QUESTIONS, DEFAULT_SETTINGS } from '../data/defaultQuestions';
import { soundService } from '../services/soundService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  settings: GameSettings;
  onSaveQuestions: (questions: Question[]) => void;
  onSaveSettings: (settings: GameSettings) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  questions,
  settings,
  onSaveQuestions,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');
  const [localQuestions, setLocalQuestions] = useState<Question[]>(questions);
  const [localSettings, setLocalSettings] = useState<GameSettings>(settings);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const list = [...localQuestions];
    const temp = list[index - 1];
    list[index - 1] = list[index];
    list[index] = temp;
    setLocalQuestions(list);
  };

  const handleMoveDown = (index: number) => {
    if (index === localQuestions.length - 1) return;
    const list = [...localQuestions];
    const temp = list[index + 1];
    list[index + 1] = list[index];
    list[index] = temp;
    setLocalQuestions(list);
  };

  const handleDelete = (index: number) => {
    if (localQuestions.length <= 1) {
      alert('Trận đấu cần tối thiểu 1 câu hỏi.');
      return;
    }
    const list = localQuestions.filter((_, i) => i !== index);
    setLocalQuestions(list);
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: Date.now(),
      category: 'Tin học lớp 5',
      question: 'Câu hỏi mới môn Tin học lớp 5...',
      options: ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'],
      correctAnswer: 0,
      explanation: 'Giải thích đáp án chính xác...',
      normalPoints: 10,
      stealPoints: 5,
    };
    setLocalQuestions([...localQuestions, newQ]);
    setEditingIndex(localQuestions.length);
  };

  const handleResetQuestions = () => {
    if (confirm('Khôi phục danh sách 15 câu hỏi Tin học 5 mặc định chuẩn?')) {
      setLocalQuestions(DEFAULT_QUESTIONS);
      setEditingIndex(null);
    }
  };

  const handleSaveAll = () => {
    soundService.playClick();
    onSaveQuestions(localQuestions);
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl space-y-6 relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              QUẢN TRỊ CÂU HỎI & THIẾT LẬP CAM RACE
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('questions')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'questions' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                15 Câu Hỏi ({localQuestions.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'settings' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cài Đặt Điểm & Hệ Thống
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Questions Management */}
        {activeTab === 'questions' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Chỉnh sửa, thêm mới, sắp xếp thứ tự hoặc đánh dấu câu đặc biệt cho trận đấu:
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetQuestions}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục 15 câu mặc định</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm câu hỏi mới</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {localQuestions.map((q, idx) => {
                const isEditingThis = editingIndex === idx;

                return (
                  <div
                    key={q.id || idx}
                    className={`bg-slate-950/90 border rounded-2xl p-4 transition-all ${
                      isEditingThis ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-slate-800'
                    }`}
                  >
                    {/* Collapsed view / header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-xs font-black text-cyan-400 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {q.isSpecial && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded font-black flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            ĐẶC BIỆT +20
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {q.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Chuyển lên"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === localQuestions.length - 1}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Chuyển xuống"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingIndex(isEditingThis ? null : idx)}
                          className="p-1.5 text-cyan-400 hover:text-cyan-300 ml-1"
                          title="Sửa câu hỏi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(idx)}
                          className="p-1.5 text-rose-400 hover:text-rose-300"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question text snippet */}
                    {!isEditingThis && (
                      <div className="mt-2 text-sm font-bold text-slate-200">
                        {q.question}
                      </div>
                    )}

                    {/* Expanded Edit Form */}
                    {isEditingThis && (
                      <div className="mt-4 space-y-4 pt-4 border-t border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 mb-1">Chủ đề:</label>
                            <input
                              type="text"
                              value={q.category}
                              onChange={(e) => {
                                const list = [...localQuestions];
                                list[idx].category = e.target.value;
                                setLocalQuestions(list);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-5">
                            <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!q.isSpecial}
                                onChange={(e) => {
                                  const list = [...localQuestions];
                                  list[idx].isSpecial = e.target.checked;
                                  setLocalQuestions(list);
                                }}
                                className="accent-amber-400 w-4 h-4 rounded"
                              />
                              <span>🌟 Câu đặc biệt (+20 điểm)</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Nội dung câu hỏi:</label>
                          <textarea
                            rows={2}
                            value={q.question}
                            onChange={(e) => {
                              const list = [...localQuestions];
                              list[idx].question = e.target.value;
                              setLocalQuestions(list);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                          />
                        </div>

                        {/* Options A, B, C, D */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400">
                            4 Lựa chọn (Chọn ô tròn phía trước đáp án ĐÚNG):
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`flex items-center gap-2 bg-slate-900 border rounded-xl p-2 ${
                                  q.correctAnswer === optIdx
                                    ? 'border-emerald-500/80 bg-emerald-950/20'
                                    : 'border-slate-800'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`correct_${q.id || idx}`}
                                  checked={q.correctAnswer === optIdx}
                                  onChange={() => {
                                    const list = [...localQuestions];
                                    list[idx].correctAnswer = optIdx;
                                    setLocalQuestions(list);
                                  }}
                                  className="accent-emerald-400 w-4 h-4"
                                />
                                <span className="text-xs font-mono font-bold text-slate-400">
                                  {['A', 'B', 'C', 'D'][optIdx]}:
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const list = [...localQuestions];
                                    const newOpts = [...list[idx].options];
                                    newOpts[optIdx] = e.target.value;
                                    list[idx].options = newOpts;
                                    setLocalQuestions(list);
                                  }}
                                  className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 mb-1">Giải thích đáp án:</label>
                          <input
                            type="text"
                            value={q.explanation}
                            onChange={(e) => {
                              const list = [...localQuestions];
                              list[idx].explanation = e.target.value;
                              setLocalQuestions(list);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Settings Management */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Scoring Settings */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-extrabold text-cyan-400 uppercase tracking-wide">
                  CÀI ĐẶT ĐIỂM SỐ (SCORING)
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Điểm câu trả lời đúng thông thường:
                    </label>
                    <input
                      type="number"
                      value={localSettings.normalPoints}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, normalPoints: parseInt(e.target.value, 10) || 10 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Điểm cướp điểm thành công (+5):
                    </label>
                    <input
                      type="number"
                      value={localSettings.stealPoints}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, stealPoints: parseInt(e.target.value, 10) || 5 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Điểm câu đặc biệt (+20):
                    </label>
                    <input
                      type="number"
                      value={localSettings.specialPoints}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, specialPoints: parseInt(e.target.value, 10) || 20 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Game Timing Settings */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-wide">
                  CÀI ĐẶT THỜI GIAN & HIỆU ỨNG
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Thời gian trả lời mỗi câu hỏi (giây):
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={localSettings.questionTimeLimitSeconds ?? 15}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, questionTimeLimitSeconds: parseInt(e.target.value, 10) || 15 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-400 font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Mặc định 15 giây cho mỗi lượt trả lời và cướp điểm. Hết giờ sẽ chuyển lượt cho đội khác.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Thời gian giữ Camera ổn định trước khi nhận diện (giây):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={localSettings.cameraHoldSeconds ?? 5}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, cameraHoldSeconds: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-400 font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Giữ camera 5 giây để học sinh ổn định trước vạch xuất phát, sau 5s mới bắt đầu tính thời gian và nhận diện thẻ.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Thời lượng Freeze dừng hình khi có người thắng (ms):
                    </label>
                    <input
                      type="number"
                      value={localSettings.freezeDurationMs}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, freezeDurationMs: parseInt(e.target.value, 10) || 1800 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Ngưỡng hòa thời gian tranh quyền (ms):
                    </label>
                    <input
                      type="number"
                      value={localSettings.tieThresholdMs}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, tieThresholdMs: parseInt(e.target.value, 10) || 200 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 font-bold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.soundEnabled}
                        onChange={(e) =>
                          setLocalSettings({ ...localSettings, soundEnabled: e.target.checked })
                        }
                        className="accent-cyan-400 w-4 h-4 rounded"
                      />
                      <span>Bật âm thanh hiệu ứng Game Show (Web Audio API)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs uppercase shadow-lg shadow-cyan-600/30 flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Lưu tất cả thay đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
