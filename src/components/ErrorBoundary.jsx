import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-red-500 p-6 flex items-center gap-4 text-white">
              <AlertCircle size={32} />
              <div>
                <h1 className="text-2xl font-bold">Something went wrong</h1>
                <p className="text-red-100">The application encountered an unexpected error.</p>
              </div>
            </div>
            
            <div className="p-8">
              <p className="text-gray-700 mb-6 text-lg">
                Please take a screenshot of this entire page and send it to your administrator or developer so we can sort it out.
              </p>
              
              <div className="bg-gray-100 rounded-xl p-4 mb-8 overflow-auto max-h-64 border border-gray-200">
                <p className="font-mono text-sm text-red-600 font-bold mb-2">
                  {this.state.error && this.state.error.toString()}
                </p>
                <pre className="font-mono text-xs text-gray-600 whitespace-pre-wrap">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 px-6 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={20} />
                Refresh Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
