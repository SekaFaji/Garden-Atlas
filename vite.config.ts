import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { writeOfflineWorker } from './scripts/offlineWorker.mjs';
function offlineShell():Plugin{return{name:'garden-atlas-offline-shell',apply:'build',async closeBundle(){await writeOfflineWorker('dist','/Garden-Atlas/');}};}
export default defineConfig({plugins:[react(),offlineShell()],base:'/Garden-Atlas/'});
