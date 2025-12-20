import React from 'react'

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    if (process.env.NODE_ENV === 'development') {
      // Surface full details in dev tools
      // eslint-disable-next-line no-console
      console.error('[GlobalErrorBoundary] Uncaught error:', error, errorInfo)
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const isDev = process.env.NODE_ENV === 'development'

    return (
      <div
        className="window"
        style={{
          position: 'fixed',
          top: '40px',
          left: '40px',
          width: '420px',
          maxWidth: 'calc(100vw - 80px)',
          zIndex: 99999,
        }}
        role="alertdialog"
        aria-labelledby="app-error-title"
      >
        <div className="title-bar">
          <div className="title-bar-text" id="app-error-title">
            APPLICATION ERROR
          </div>
        </div>
        <div className="window-body" style={{ padding: '8px' }}>
          {isDev ? (
            <>
              <p style={{ marginBottom: '8px' }}>
                An uncaught error occurred in the React tree.
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                {this.state.error && this.state.error.toString()}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre
                  style={{
                    marginTop: '8px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    background: '#ffffff',
                    border: '1px solid #c0c0c0',
                    padding: '4px',
                    fontSize: '10px',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </>
          ) : (
            <p style={{ marginBottom: 0 }}>
              Something went wrong. Please refresh the page to try again.
            </p>
          )}
        </div>
      </div>
    )
  }
}

export default GlobalErrorBoundary



