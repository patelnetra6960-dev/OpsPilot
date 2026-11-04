import React, { Component } from 'react';
import { AlertOctagon, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Structured client error logging
    console.error('OpsPilot ErrorBoundary captured an unhandled exception:', {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopy = () => {
    const errorText = [
      `Error: ${this.state.error?.message || 'Unknown error'}`,
      `Stack: ${this.state.error?.stack || ''}`,
      `Component Stack: ${this.state.errorInfo?.componentStack || ''}`,
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`
    ].join('\n\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(errorText).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      });
    }
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback({
            error: this.state.error,
            resetErrorBoundary: this.handleReset
          });
        }
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400 shrink-0">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Application Error Encountered
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  OpsPilot encountered an unexpected rendering error. Your organization context and
                  session remain intact.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <p className="text-xs font-mono text-rose-300 break-words font-medium">
                {this.state.error?.message || 'An unknown runtime error occurred in this view.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                {this.state.showDetails ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Hide technical diagnostic details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Show technical diagnostic details
                  </>
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                      Diagnostics Stack
                    </span>
                    <button
                      type="button"
                      onClick={this.handleCopy}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      {this.state.copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Stack
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-400 bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-48 border border-slate-800 whitespace-pre-wrap leading-relaxed">
                    {this.state.error?.stack ||
                      this.state.errorInfo?.componentStack ||
                      'No stack trace available.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
