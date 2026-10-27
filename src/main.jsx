import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/lib/pwaInstallStore'
import App from '@/App.jsx'
import '@/index.css'
import { setupSWUpdate } from '@/lib/swUpdate'

// Global error handler — catches errors that escape React's error boundary
// (e.g. errors thrown by providers wrapping the boundary)
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error || event.message);
  showFatalError(event.error?.message || event.message || 'Unknown error');
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

function showFatalError(message) {
  // Never let the boot overlay hide the fatal-error screen.
  document.getElementById('boot-fallback')?.remove();
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = `
      <div dir="rtl" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;font-family:sans-serif;background:#f8fafc;">
        <div style="max-width:28rem;width:100%;text-align:center;padding:1.5rem;background:white;border-radius:0.75rem;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <h1 style="font-size:1.25rem;font-weight:bold;color:#dc2626;margin-bottom:0.5rem;">خطای بارگذاری برنامه</h1>
          <p style="font-size:0.875rem;color:#64748b;margin-bottom:1rem;">برنامه با خطا مواجه شد. لطفاً صفحه را بازخوانی کنید.</p>
          <pre style="font-size:0.75rem;color:#475569;background:#f1f5f9;padding:0.5rem;border-radius:0.375rem;overflow:auto;text-align:right;direction:ltr;white-space:pre-wrap;word-break:break-all;">${(message || '').toString().slice(0, 500)}</pre>
          <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;background:#3b46f6;color:white;border:none;border-radius:0.375rem;cursor:pointer;font-size:0.875rem;">بازخوانی</button>
        </div>
      </div>
    `;
  }
}

setupSWUpdate();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Remove the static startup overlay once the browser has had a chance to mount React.
// If React itself fails, showFatalError removes the overlay and displays the error screen.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.getElementById('boot-fallback')?.remove();
  });
});
