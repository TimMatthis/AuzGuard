import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="max-w-md w-full mx-4 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-300 mb-4">
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            {this.state.error && (
              <details className="text-xs text-gray-400 mb-4">
                <summary className="cursor-pointer text-gray-300 hover:text-white">Error details</summary>
                <pre className="mt-2 p-2 bg-gray-900 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

