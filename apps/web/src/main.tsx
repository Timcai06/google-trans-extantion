import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { isExtension } from './connection';
import './style.css';
if (isExtension() && new URLSearchParams(location.search).get('view') !== 'tab') document.documentElement.classList.add('extension');
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
if (!isExtension() && 'serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {});
