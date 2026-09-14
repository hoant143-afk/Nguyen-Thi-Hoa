import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onGoHome?: () => void;
  onReset?: () => void;
  onSkip?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[EDUPLAY ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.hash = '';
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] w-full flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase tracking-wide">
                ⚠️ ĐÃ XẢY RA LỖI
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đã xảy ra sự cố ngoài ý muốn trong quá trình thực thi. Dữ liệu trò chơi cục bộ vẫn được bảo lưu an toàn.
              </p>
              {this.state.error && (
                <p className="text-[11px] font-mono text-amber-300/80 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-words text-left max-h-24 overflow-y-auto">
                  {this.state.error.message || String(this.state.error)}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
              >
                <Home className="w-4 h-4" />
                <span>VỀ TRANG CHỦ</span>
              </button>

              <button
                type="button"
                onClick={this.handleRetry}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>THỬ LẠI</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
