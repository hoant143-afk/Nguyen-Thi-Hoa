import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { validateFirebaseConfig } from '../../config/firebase';
import { soundService } from '../../services/soundService';

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onExploreDemo?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onExploreDemo }) => {
  const { signInWithGoogle, loginAsDemo, loading, authError, authErrorCode, clearError } = useAuth();
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showDomainGuide, setShowDomainGuide] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const validation = validateFirebaseConfig();

  // Dynamically resolve current hostname without protocol or path
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  // Detect if running in Google AI Studio / Cloud Run Preview environment
  const isPreview = Boolean(
    currentHostname && (
      currentHostname.includes('run.app') ||
      currentHostname.includes('ais-') ||
      currentHostname.includes('googleusercontent.com') ||
      currentHostname.includes('webcontainer') ||
      (typeof window !== 'undefined' && window.self !== window.top)
    )
  );

  const isUnauthorizedDomain =
    authErrorCode === 'auth/unauthorized-domain' ||
    (Boolean(authError) && (
      authError!.includes('unauthorized-domain') ||
      authError!.includes('chưa được cấp phép') ||
      authError!.includes('chưa được Firebase cho phép') ||
      authError!.includes('Domain hiện tại chưa được')
    ));

  const handleCopyHostname = async () => {
    soundService.playClick();
    if (!currentHostname) return;

    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentHostname);
        success = true;
      }
    } catch {
      // Fallback for sandboxed iframes
    }

    if (!success) {
      try {
        const el = document.createElement('textarea');
        el.value = currentHostname;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        success = true;
      } catch (err) {
        console.warn('[EDUPLAY AUTH] Copy failed:', err);
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleGoogleLogin = async () => {
    soundService.playClick();
    clearError();
    await signInWithGoogle();
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleDemoLogin = () => {
    soundService.playClick();
    clearError();
    if (onExploreDemo) {
      onExploreDemo();
    } else {
      loginAsDemo();
    }
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const firebaseConsoleDomainUrl = validation.config.projectId
    ? `https://console.firebase.google.com/project/${validation.config.projectId}/authentication/settings`
    : 'https://console.firebase.google.com';

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50/80 to-indigo-50/60 flex flex-col justify-center items-center px-4 py-12 selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Soft background ambient blurs */}
      <div className="fixed top-1/4 left-1/4 w-[450px] h-[450px] bg-rose-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-200/25 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-rose-200/90 rounded-3xl shadow-2xl shadow-rose-500/10 p-8 sm:p-10 flex flex-col items-center text-center relative z-10">
        {/* Logo Badge */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-rose-500/30 mb-6 transform hover:scale-105 transition-transform">
          <GraduationCap className="w-9 h-9" />
        </div>

        {/* Brand Titles */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600">
            EDUPLAY
          </span>
          <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 tracking-wider">
            Lớp học 4.0
          </span>
        </div>

        <h1 className="text-sm font-black uppercase text-slate-700 tracking-wider mb-3">
          HỆ THỐNG TRÒ CHƠI TƯƠNG TÁC LỚP HỌC
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed max-w-xs mb-6">
          Đăng nhập bằng tài khoản Google để sử dụng kho câu hỏi, lịch sử trò chơi và dữ liệu cá nhân của bạn.
        </p>

        {/* Error notification banner: Dedicated Diagnostic & Resolution for auth/unauthorized-domain */}
        {isUnauthorizedDomain && (
          <div className="w-full bg-amber-50/95 border-2 border-amber-400 rounded-3xl p-5 mb-6 text-left shadow-lg shadow-amber-500/10 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-start gap-3 text-amber-950 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-black text-sm text-amber-950">
                  Domain hiện tại chưa được Firebase cho phép.
                </p>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  {isPreview
                    ? 'Bạn đang chạy EDUPLAY trong môi trường Preview. Firebase chỉ cho phép đăng nhập Google trên những hostname đã được thêm vào Authorized domains.'
                    : 'Firebase yêu cầu tên miền đang chạy ứng dụng phải được thêm vào danh sách Authorized domains trước khi thực hiện Google Login.'}
                </p>
              </div>
            </div>

            {/* Current Hostname Display & Copy Button */}
            <div className="bg-white rounded-2xl border border-amber-300/90 p-3.5 my-3 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  {isPreview ? 'Hostname Preview hiện tại:' : 'Tên miền cần thêm vào Firebase Authorized domains:'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                  Chỉ hostname (không kèm https://)
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 font-bold select-all break-all flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{currentHostname || 'localhost'}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyHostname}
                  className={`h-9 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ĐÃ SAO CHÉP!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{isPreview ? 'SAO CHÉP HOSTNAME' : '📋 SAO CHÉP TÊN MIỀN'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="bg-amber-100/60 rounded-2xl p-3 my-3 text-[11px] space-y-1.5 border border-amber-200/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Firebase Project ID:</span>
                <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                  <span className="text-emerald-600">✅</span> {validation.config.projectId || 'Đã cấu hình'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Google Provider:</span>
                <span className="font-medium text-emerald-800 flex items-center gap-1">
                  <span className="text-emerald-600">✅</span> Đã sẵn sàng trong mã nguồn (Đảm bảo bật trong Sign-in method)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Current Hostname:</span>
                <span className="font-mono font-bold text-slate-800 break-all">{currentHostname}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Authorized Domain Required:</span>
                <span className="font-mono font-bold text-indigo-700 break-all">{currentHostname}</span>
              </div>
            </div>

            {/* Step-by-Step 6-step Guide */}
            <div className="bg-white/90 rounded-2xl p-3.5 border border-amber-200/90 text-xs text-amber-950 space-y-2">
              <p className="font-black text-xs uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <span>📋 6 Bước thêm tên miền vào Firebase Console:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-700 leading-relaxed font-medium">
                <li>
                  <strong>Bước 1:</strong> Sao chép hostname bên dưới (hoặc bên trên):{' '}
                  <code className="bg-slate-100 text-indigo-700 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200">
                    {currentHostname}
                  </code>
                </li>
                <li>
                  <strong>Bước 2:</strong> Vào{' '}
                  <a
                    href={firebaseConsoleDomainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    <span>Firebase Console → Authentication → Settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <strong>Bước 3:</strong> Tại tab <strong>Authorized domains</strong> → Nhấn <strong>Add domain</strong> (Thêm miền)
                </li>
                <li>
                  <strong>Bước 4:</strong> Dán hostname vừa sao chép (tuyệt đối không kèm <code>https://</code> hoặc <code>/login</code>)
                </li>
                <li>
                  <strong>Bước 5:</strong> Nhấn <strong>Save</strong> (Lưu)
                </li>
                <li>
                  <strong>Bước 6:</strong> Quay lại EDUPLAY và thử đăng nhập lại
                </li>
              </ol>

              <div className="pt-2 border-t border-amber-100 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500">
                  Hỗ trợ tối thiểu: <code>localhost</code>, domain Vercel production của EDUPLAY (ví dụ: <code>eduplay.vercel.app</code>) và domain Preview.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Thử đăng nhập lại</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generic Error notification banner for other issues */}
        {authError && !isUnauthorizedDomain && (
          <div className="w-full bg-rose-50 border border-rose-300/80 rounded-2xl p-4 mb-6 text-left flex items-start gap-3 text-rose-800 text-xs shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold mb-1">Không thể đăng nhập bằng Google</p>
              <p className="text-rose-700 leading-normal">{authError}</p>
              {authErrorCode === 'auth/operation-not-allowed' && (
                <p className="text-amber-800 mt-2 bg-amber-100/70 p-2 rounded-lg text-[11px] font-medium border border-amber-200">
                  💡 <strong>Cách sửa:</strong> Vào Firebase Console → <strong>Authentication</strong> → <strong>Sign-in method</strong> → Bật <strong>Google</strong> (Enable) → Lưu (Save).
                </p>
              )}
            </div>
          </div>
        )}

        {/* Missing Firebase configuration prompt with Production Diagnostics */}
        {!validation.isValid && (
          <div className="w-full bg-amber-50/95 border-2 border-amber-400 rounded-3xl p-5 mb-6 text-left shadow-lg shadow-amber-500/10">
            <div className="flex items-start gap-3 text-amber-950 mb-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-black text-sm text-amber-950">
                  ⚠️ Firebase chưa được cấu hình đầy đủ.
                </p>
                <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                  Trang web đang thiếu <strong>{validation.missingKeys.length}</strong> biến môi trường bắt buộc lúc build để khởi tạo Firebase:
                </p>
              </div>
            </div>

            {/* Diagnostic Box */}
            <div className="bg-white/90 border border-amber-200 rounded-2xl p-3.5 my-3 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-amber-100 text-[11px]">
                <span className="text-slate-500 font-semibold uppercase tracking-wider">Môi trường:</span>
                <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {currentHostname.includes('vercel.app')
                    ? 'VERCEL / PRODUCTION'
                    : currentHostname.includes('run.app')
                    ? 'AI STUDIO / PREVIEW'
                    : 'PRODUCTION / BROWSER'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-700 font-semibold">VITE_FIREBASE_API_KEY:</span>
                  <span className="font-bold flex items-center gap-1">
                    {validation.config.apiKey && !validation.config.apiKey.startsWith('AIzaSyPlaceholder') ? (
                      <span className="text-emerald-600">✅ Có sẵn</span>
                    ) : (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">❌ Thiếu</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-700 font-semibold">VITE_FIREBASE_AUTH_DOMAIN:</span>
                  <span className="font-bold flex items-center gap-1">
                    {validation.config.authDomain ? (
                      <span className="text-emerald-600">✅ Có sẵn</span>
                    ) : (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">❌ Thiếu</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-700 font-semibold">VITE_FIREBASE_PROJECT_ID:</span>
                  <span className="font-bold flex items-center gap-1">
                    {validation.config.projectId ? (
                      <span className="text-emerald-600">✅ Có sẵn</span>
                    ) : (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">❌ Thiếu</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-700 font-semibold">VITE_FIREBASE_MESSAGING_SENDER_ID:</span>
                  <span className="font-bold flex items-center gap-1">
                    {validation.config.messagingSenderId ? (
                      <span className="text-emerald-600">✅ Có sẵn</span>
                    ) : (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">❌ Thiếu</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-700 font-semibold">VITE_FIREBASE_APP_ID:</span>
                  <span className="font-bold flex items-center gap-1">
                    {validation.config.appId ? (
                      <span className="text-emerald-600">✅ Có sẵn</span>
                    ) : (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">❌ Thiếu</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">VITE_FIREBASE_STORAGE_BUCKET:</span>
                  <span className="text-slate-600 font-medium">
                    {validation.config.storageBucket ? '✅ Có sẵn' : '⚪ OPTIONAL (Tùy chọn)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Build-time Notice */}
            <div className="bg-amber-100/70 border border-amber-300/80 rounded-2xl p-3 text-[11px] text-amber-950 space-y-1.5 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <span>⚡ LƯU Ý QUAN TRỌNG KHI DEPLOY VERCEL:</span>
              </p>
              <p>
                • Vite nhúng các biến <code>VITE_*</code> vào mã JavaScript tại <strong>BUILD TIME</strong> (khi chạy lệnh <code>npm run build</code>).
              </p>
              <p>
                • Biến cấu hình trên Google AI Studio <strong>không tự động truyền sang Vercel</strong>. Bạn phải thêm riêng trên Vercel Dashboard.
              </p>
              <p className="font-bold text-rose-800 bg-rose-50/80 p-2 rounded-xl border border-rose-200">
                🔄 “Environment Variables đã được cấu hình nhưng deployment hiện tại có thể được build trước khi các biến được thêm. Hãy vào Vercel Deployments → Redeploy.”
              </p>
            </div>

            {/* Collapsible Quick Setup Guide */}
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="mt-3 w-full flex items-center justify-between text-xs font-bold text-amber-950 hover:text-amber-900 bg-amber-200/60 hover:bg-amber-200/90 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <span>📋 Hướng dẫn thêm biến & Redeploy trên Vercel</span>
              {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showGuide && (
              <div className="mt-2.5 p-3.5 bg-white/95 rounded-2xl text-[11px] text-slate-700 space-y-2 border border-amber-200 font-sans">
                <p className="font-bold text-amber-900 uppercase tracking-wide">
                  Các bước thiết lập trên Vercel:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 leading-relaxed font-medium">
                  <li>Mở <strong>Vercel</strong> → chọn đúng project <strong>EDUPLAY</strong> đang deploy.</li>
                  <li>Vào <strong>Settings</strong> → mục <strong>Environment Variables</strong>.</li>
                  <li>
                    Thêm đủ 5 biến bắt buộc:
                    <ul className="list-disc list-inside pl-4 pt-1 font-mono text-[10px] text-indigo-700 space-y-0.5">
                      <li>VITE_FIREBASE_API_KEY</li>
                      <li>VITE_FIREBASE_AUTH_DOMAIN</li>
                      <li>VITE_FIREBASE_PROJECT_ID</li>
                      <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
                      <li>VITE_FIREBASE_APP_ID</li>
                      <li className="text-slate-500">VITE_FIREBASE_STORAGE_BUCKET (nếu có)</li>
                    </ul>
                  </li>
                  <li>
                    Đảm bảo bật checkbox scope cho cả <strong>Production</strong> và <strong>Preview</strong>.
                  </li>
                  <li>
                    Lấy giá trị thật từ <strong>Firebase Console</strong> → <strong>Project Settings</strong> → <strong>General</strong> → <strong>Your apps (Web)</strong> → <strong>Config</strong> (tuyệt đối không copy placeholder).
                  </li>
                  <li>
                    <strong>BẮT BUỘC REDEPLOY:</strong> Sau khi Save, vào tab <strong>Deployments</strong> → bấm menu 3 chấm ở deployment mới nhất → chọn <strong>Redeploy</strong> (hoặc git push commit mới).
                  </li>
                  <li>
                    Thêm hostname Vercel (ví dụ: <code className="font-mono text-indigo-700">{currentHostname || 'eduplay.vercel.app'}</code>) vào <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>.
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Google Login Action Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || !validation.isValid}
          className="w-full h-12 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-800 font-bold rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-rose-600 rounded-full animate-spin" />
              <span>Đang kết nối tài khoản Google...</span>
            </div>
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.87c2.26-2.09 3.67-5.17 3.67-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.04c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.13C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.62H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.38l4-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.27 6.62l4 3.13c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span className="text-sm font-black tracking-wide text-slate-800">
                🔵 TIẾP TỤC VỚI GOOGLE
              </span>
            </>
          )}
        </button>

        {/* Instant Demo / Local Experience Button */}
        <div className="w-full mt-3">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full h-12 bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-700 hover:via-pink-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="text-sm font-black tracking-wide">
              🎮 TRẢI NGHIỆM NGAY (CHẾ ĐỘ LỚP HỌC / DEMO)
            </span>
          </button>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Sử dụng đầy đủ 6 trò chơi, bộ câu hỏi mẫu và công cụ quản lý lớp học mà không cần đăng nhập Google
          </p>
        </div>

        {/* Proactive Authorized Domains helper for teachers/admins */}
        <div className="w-full mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowDomainGuide(!showDomainGuide)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>Xem thông tin Tên miền được phép (Authorized Domains)</span>
            {showDomainGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDomainGuide && (
            <div className="mt-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-700 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Hostname hiện tại của bạn:
                </span>
                <span className="text-[10px] text-slate-400 font-mono">window.location.hostname</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 font-mono text-xs text-slate-800 font-bold select-all break-all">
                <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="flex-1">{currentHostname || 'localhost'}</span>
                <button
                  type="button"
                  onClick={handleCopyHostname}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Khi triển khai lên <strong>localhost</strong>, <strong>Vercel</strong> (ví dụ: <code>eduplay.vercel.app</code>) hoặc <strong>Google AI Studio Preview</strong>, hãy thêm hostname tương ứng vào <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Privacy Note */}
        <div className="mt-6 pt-6 border-t border-slate-100 w-full flex flex-col gap-2 text-[11px] text-slate-500">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Bảo mật danh tính giáo viên – Không quản lý học sinh</span>
          </div>
          <p className="text-slate-400">
            EDUPLAY chỉ yêu cầu thông tin hồ sơ cơ bản (Email, Tên, Avatar). Hệ thống tuyệt đối không truy cập Gmail, Google Drive hay Lịch cá nhân.
          </p>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-xs text-slate-500 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-rose-500" />
        <span>EDUPLAY Lớp học 4.0 – Trò chơi tương tác đồng đội</span>
      </div>
    </div>
  );
};
