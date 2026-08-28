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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </ThemeProvider>
  </StrictMode>,
)
