import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/pages.css';

import { ToastProvider } from './context/ToastContext.jsx';
import { ConfigProvider } from './context/ConfigContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConfigProvider>
          <AuthProvider>
            <CartProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </CartProvider>
          </AuthProvider>
        </ConfigProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
