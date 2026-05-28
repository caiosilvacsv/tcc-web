import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPanel } from '../../modules/auth/LoginPanel';
import { RegisterPanel } from '../../modules/auth/RegisterPanel';
import { GuichePanel } from '../../modules/guiche/GuichePanel';
import { AdminProducts } from '../../modules/admin/AdminProducts';
import { UserDashboard } from '../../modules/dashboard/UserDashboard';
import { ProductStore } from '../../modules/store/ProductStore';
import { useAuth } from '../../contexts/AuthContext';

// Componente Wrapper para proteger rotas privadas baseando-se no AuthContext nativo de roles estritas
const PrivateRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'USER' | 'ADMIN' }> = ({ 
  children, 
  allowedRole 
}) => {
  const { isAuthenticated, user } = useAuth();

  // 1. Se o usuário não possui nenhuma sessão ativa, envia obrigatoriamente para o login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Se já possui sessão ativa, mas a role do usuário não condiz com a role permitida na rota
  if (allowedRole && user?.role !== allowedRole) {
    // Usuário comum tentando acessar rotas de administração
    // Redireciona de forma suave para o Dashboard pessoal dele em vez de deslogá-lo
    if (user?.role !== 'ADMIN') {
      return <Navigate to="/dashboard" replace />;
    }
    
    // Fallback: Admin tentando acessar rota comum é enviado para a sua rota inicial (guichê)
    return <Navigate to="/guiche" replace />;
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

      {/* Rota Privada Protegida do Guichê (Apenas para operadores ADMINISTRADORES) */}
      <Route 
        path="/guiche" 
        element={
          <PrivateRoute allowedRole="ADMIN">
            <GuichePanel />
          </PrivateRoute>
        } 
      />

      {/* Rota Privada Protegida de Administração de Produtos (Apenas para ADMINISTRADORES) */}
      <Route 
        path="/admin/products" 
        element={
          <PrivateRoute allowedRole="ADMIN">
            <AdminProducts />
          </PrivateRoute>
        } 
      />

      {/* Rota Privada Protegida do Dashboard do Estudante/Servidor */}
      <Route 
        path="/dashboard" 
        element={
          <PrivateRoute>
            <UserDashboard />
          </PrivateRoute>
        } 
      />

      {/* Rota Raiz - Direciona imediatamente para o catálogo público de vendas da Loja */}
      <Route path="/" element={<Navigate to="/store" replace />} />

      {/* Rota Fallback - Qualquer rota desconhecida redireciona para a vitrine pública */}
      <Route path="*" element={<Navigate to="/store" replace />} />
    </Routes>
  );
}
