import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BentenganPrototype } from '../app/prototype';
import '../app/globals.css';
import './pages.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Elemen root tidak ditemukan.');
}

createRoot(root).render(
  <StrictMode>
    <BentenganPrototype />
  </StrictMode>,
);
