import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyAppAppearance, loadAppSettings } from './utils/appSettings';

applyAppAppearance(loadAppSettings());
createRoot(document.getElementById('root')!).render(<App />);
