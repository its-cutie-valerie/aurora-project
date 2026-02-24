import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './styles/animations.css'
import App from './App.tsx'

// Remove loading screen once React mounts
const root = createRoot(document.getElementById('root')!);
root.render(

    <App />
);

// Fade out loading screen
requestAnimationFrame(() => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 800);
  }
});
