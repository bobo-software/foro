import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { AppThemeProvider } from './components/providers/AppThemeProvider';
import { SkipLink } from './components/SkipLink';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider>
      <BrowserRouter>
        <SkipLink />
        <App />
        <Toaster position="top-center" />
      </BrowserRouter>
    </AppThemeProvider>
  </StrictMode>,
);
