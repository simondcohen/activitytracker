import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import TimerPopup from './TimerPopup';
import './index.css';

const rootEl = document.getElementById('root')!;
const isPopup = window.location.pathname.startsWith('/popup');

createRoot(rootEl).render(
  <StrictMode>
    {isPopup ? <TimerPopup /> : <App />}
  </StrictMode>
);
