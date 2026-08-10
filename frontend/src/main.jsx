import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'material-symbols/rounded.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './themes/theme.css'
import './styles/style_config.css'
import './index.css'
import App from './App.jsx'
import { ConfigProvider } from './contexts/ConfigContext.jsx'

document.documentElement.classList.add('light')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
