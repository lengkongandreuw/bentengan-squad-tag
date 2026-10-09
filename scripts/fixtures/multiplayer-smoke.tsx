import React from 'react';
import {createRoot} from 'react-dom/client';
import {MultiplayerPanel} from '../../modules/ui/multiplayer-panel.tsx';
createRoot(document.getElementById('root')!).render(<MultiplayerPanel onClose={()=>{document.body.dataset.closed='true';document.getElementById('root')!.textContent='Ditutup';}}/>);
