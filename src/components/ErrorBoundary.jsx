import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches uncaught errors in the React tree and shows
 * a user-friendly fallback UI with a "Retry" button instead of a white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-16 h-16 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">خطایی رخ داد</h1>
            <p className="text-sm text-muted-foreground">
              یک خطای پیش‌بینی‌نشده در برنامه رخ داد. لطفاً دوباره تلاش کنید.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground/70 bg-muted rounded-md p-2 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <Button onClick={this.handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 ml-2" />
              تلاش مجدد
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}