import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

class KBErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log for diagnostics
    console.error('Knowledge Base crashed:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <h3 className="text-lg font-semibold">Failed to load Knowledge Base</h3>
            <p className="text-sm text-muted-foreground">{this.state.message}</p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default KBErrorBoundary;
