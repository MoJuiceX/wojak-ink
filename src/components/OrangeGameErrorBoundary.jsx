import { Component } from 'react'
import Window from './windows/Window'

/**
 * OrangeGameErrorBoundary - Catches errors in the orange game layer
 * Shows a Windows 98-style error window and disables the game
 * Rest of the site continues working
 */
class OrangeGameErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('[OrangeGameErrorBoundary] Orange game crashed:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleClose = () => {
    // Close the error window but keep game disabled
    this.setState({ error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Show Windows 98-style error window
      return (
        <>
          {/* Error window */}
          {this.state.error && (
            <Window
              id="orange-game-error"
              title="ERROR"
              style={{
                width: '400px',
                maxWidth: 'calc(100vw - 40px)',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed',
                zIndex: 10002, // Above everything
              }}
              onClose={this.handleClose}
            >
              <div className="window-body" style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontFamily: 'MS Sans Serif, sans-serif',
                fontSize: '11px',
              }}>
                {/* Error icon and message */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <div style={{
                    fontSize: '32px',
                    lineHeight: '1',
                  }}>
                    ⚠
                  </div>
                  <div style={{
                    flex: 1,
                    color: '#000',
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      Orange game has stopped working
                    </div>
                    <div style={{ color: '#666', fontSize: '10px', marginBottom: '8px' }}>
                      The orange game layer encountered an error and has been disabled.
                      The rest of the site continues to work normally.
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                      <details style={{
                        marginTop: '8px',
                        fontSize: '9px',
                        color: '#666',
                        cursor: 'pointer',
                      }}>
                        <summary style={{ marginBottom: '4px' }}>Error details (dev only)</summary>
                        <pre style={{
                          background: '#f0f0f0',
                          padding: '8px',
                          border: '1px inset #c0c0c0',
                          overflow: 'auto',
                          maxHeight: '150px',
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {this.state.error.toString()}
                          {this.state.errorInfo?.componentStack && (
                            <>
                              {'\n\nComponent Stack:'}
                              {this.state.errorInfo.componentStack}
                            </>
                          )}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                {/* OK button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '8px',
                }}>
                  <button
                    className="button"
                    onClick={this.handleClose}
                    style={{
                      minWidth: '75px',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    OK
                  </button>
                </div>
              </div>
            </Window>
          )}
          
          {/* Game layer is disabled - render nothing (or a disabled placeholder) */}
          {this.props.renderDisabled ? this.props.renderDisabled() : null}
        </>
      )
    }

    // No error - render children normally
    return this.props.children
  }
}

export default OrangeGameErrorBoundary


