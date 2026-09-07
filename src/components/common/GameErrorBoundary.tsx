import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, ArrowRight } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  onSkip?: () => void;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class GameErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'Đã xảy ra sự cố hiển thị' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GameErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-xl mx-auto p-6 my-12 bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-amber-400 uppercase tracking-wide">
              Đã khôi phục trận đấu
            </h3>
            <p className="text-sm text-slate-300">
              Hệ thống phát hiện một sự cố nhỏ ({this.state.errorMessage}). Trận đấu vẫn được lưu an toàn.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {this.props.onSkip && (
              <button
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  this.props.onSkip?.();
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm shadow transition-transform active:scale-95 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Tiếp tục câu hỏi</span>
              </button>
            )}

            {this.props.onReset && (
              <button
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  this.props.onReset?.();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2 text-sm transition-transform active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Thử lại</span>
              </button>
            )}

            {this.props.onGoHome && (
              <button
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  this.props.onGoHome?.();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-2 text-sm transition-transform active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Về Menu</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
