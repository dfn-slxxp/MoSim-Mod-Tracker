// App entry point — mounts the React tree into <div id="root"> (index.html).
// The providers wrap the app so every component can reach the store + theme.
// HashRouter keeps the route in the URL fragment (/#/robots) which works from
// any static file server with zero configuration.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './store/StoreContext';
import { ThemeProvider } from './theme';
import './styles.css';
import './lib/desktop'; // sets up window.desktop when running in Tauri

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);
