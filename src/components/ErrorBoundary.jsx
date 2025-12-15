import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div
      role="alert"
      style={{
        padding: '20px',
        margin: '20px',
        border: '2px solid #c00',
        backgroundColor: '#ffe6e6',
        borderRadius: '4px',
      }}
    >
      <h2 style={{ color: '#c00', marginTop: 0 }}>Something went wrong</h2>
      <pre style={{ color: '#c00', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}

export default function ErrorBoundary({ children }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      {children}
    </ReactErrorBoundary>
  )
}

