import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BentenganPrototype } from '../app/prototype';
import { GameErrorBoundary } from '../modules/ui/error-boundary.tsx';
import '../app/globals.css';
import './pages.css';
import '../app/ux-priority.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemen root tidak ditemukan.');
}

createRoot(root).render(
  <StrictMode>
    <GameErrorBoundary>
      <BentenganPrototype />
    </GameErrorBoundary>
  </StrictMode>,
);
