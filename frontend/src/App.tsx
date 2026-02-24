import { Suspense, lazy } from 'react';
import { Starfield } from './components/three/Starfield';
import { Navigation } from './components/layout/Navigation';
import { AmbientPlayer } from './components/audio/AmbientPlayer';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { MobileWarning } from './components/ui/MobileWarning';
import './styles/mobile-polish.css';

// Lazy load sections
const Hero = lazy(() => import('./components/sections/Hero').then(m => ({ default: m.Hero })));
const Introduction = lazy(() => import('./components/sections/Introduction').then(m => ({ default: m.Introduction })));
const SolarHeartbeat = lazy(() => import('./components/sections/SolarHeartbeat').then(m => ({ default: m.SolarHeartbeat })));
const WhenItErupts = lazy(() => import('./components/sections/WhenItErupts').then(m => ({ default: m.WhenItErupts })));
const EarthShield = lazy(() => import('./components/sections/EarthShield').then(m => ({ default: m.EarthShield })));
const HistoricalEvents = lazy(() => import('./components/sections/HistoricalEvents').then(m => ({ default: m.HistoricalEvents })));
const NearMiss2012 = lazy(() => import('./components/sections/NearMiss2012').then(m => ({ default: m.NearMiss2012 })));
const ImpactSimulator = lazy(() => import('./components/sections/ImpactSimulator').then(m => ({ default: m.ImpactSimulator })));
const SolarMaxNow = lazy(() => import('./components/sections/SolarMaxNow').then(m => ({ default: m.SolarMaxNow })));
const Footer = lazy(() => import('./components/sections/Footer').then(m => ({ default: m.Footer })));

function App() {
  return (
    <>
      <Starfield />
      <Navigation />
      <AmbientPlayer />
      <MobileWarning />
      <main>
        <Suspense fallback={<div className="section-loader" />}>
          <ErrorBoundary><Hero /></ErrorBoundary>
          <ErrorBoundary><Introduction /></ErrorBoundary>
          <ErrorBoundary><SolarHeartbeat /></ErrorBoundary>
          <ErrorBoundary><WhenItErupts /></ErrorBoundary>
          <ErrorBoundary><EarthShield /></ErrorBoundary>
          <ErrorBoundary><HistoricalEvents /></ErrorBoundary>
          <ErrorBoundary><NearMiss2012 /></ErrorBoundary>
          <ErrorBoundary><ImpactSimulator /></ErrorBoundary>
          <ErrorBoundary><SolarMaxNow /></ErrorBoundary>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}

export default App;
