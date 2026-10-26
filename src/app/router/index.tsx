import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPanel } from '../../modules/auth/LoginPanel';
import { RegisterPanel } from '../../modules/auth/RegisterPanel';
import { ResetPasswordPanel } from '../../modules/auth/ResetPasswordPanel';
import { GuichePanel } from '../../modules/guiche/GuichePanel';
import { AdminProducts } from '../../modules/admin/AdminProducts';
import { UserDashboard } from '../../modules/dashboard/UserDashboard';
import { ProductStore } from '../../modules/store/ProductStore';
import { useAuth } from '../../contexts/AuthContext';

const PrivateRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'USER' | 'ADMIN' }> = ({
  children,
  allowedRole,
}) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    if (user?.role !== 'ADMIN') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export function AppRouter() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/store" element={<ProductStore />} />
      <Route path="/login" element={<LoginPanel />} />
      <Route path="/register" element={<RegisterPanel />} />
      <Route path="/reset-password" element={<ResetPasswordPanel />} />

      {/* Rota Privada do Guichê POS (ADMIN) */}
      <Route
        path="/guiche"
        element={
          <PrivateRoute allowedRole="ADMIN">
            <GuichePanel />
          </PrivateRoute>
        }
      />

      {/* Central Administrativa Unificada (/admin e /admin/products) */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRole="ADMIN">
            <AdminProducts />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <PrivateRoute allowedRole="ADMIN">
            <AdminProducts />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/produtos"
        element={
          <PrivateRoute allowedRole="ADMIN">
            <AdminProducts />
          </PrivateRoute>
        }
      />

      {/* Rota Privada da Carteira e Painel do Aluno */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <UserDashboard />
          </PrivateRoute>
        }
      />

      {/* Rota Raiz e Fallback */}
      <Route path="/" element={<Navigate to="/store" replace />} />
      <Route path="*" element={<Navigate to="/store" replace />} />
    </Routes>
  );
}
