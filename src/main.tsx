import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import './ui/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div className="centered" role="alert">
          <span>Something went wrong. Your notes are safe.</span>
          <button onClick={() => location.reload()}>Reload</button>
        </div>
      }
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
