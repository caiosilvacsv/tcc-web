import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppRouter } from './app/router';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SystemConfigProvider>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <div className="min-h-screen bg-neo-bg text-neo-dark font-sans selection:bg-neo-yellow selection:text-neo-dark">
                <AppRouter />
              </div>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </SystemConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
