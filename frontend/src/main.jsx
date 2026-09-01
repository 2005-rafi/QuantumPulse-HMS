import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import 'material-symbols/rounded.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './themes/theme.css'
import './styles/style_config.css'
import './index.css'
import App from './App.jsx'
import { ConfigProvider } from './contexts/ConfigContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

// Global Safety Interceptor for Browser Web-Vitals / Cloudflare RUM / DevTools Performance timing race conditions
if (typeof window !== 'undefined') {
  const isBenignTelemetryError = (msg, stack) => {
    const text = String(msg || '') + ' ' + String(stack || '');
    return (
      text.includes("Cannot read properties of undefined (reading 'startTime')") ||
      text.includes('reportAllChanges') ||
      text.includes('ResizeObserver loop completed with undelivered notifications') ||
      text.includes('ResizeObserver loop limit exceeded') ||
      text.includes('PerformanceObserver')
    );
  };

  window.addEventListener('error', (event) => {
    if (isBenignTelemetryError(event?.message, event?.error?.stack)) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event?.reason?.message || event?.reason;
    if (isBenignTelemetryError(reasonMsg, event?.reason?.stack)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </ThemeProvider>
  </StrictMode>,
)
