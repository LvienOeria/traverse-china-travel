import { createRoot } from 'react-dom/client';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './styles/global.css';
import App from './App';

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}
window.CESIUM_BASE_URL = '/cesium/';

createRoot(document.getElementById('root')!).render(<App />);
