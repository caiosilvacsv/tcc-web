import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

/**
 * DTO de sessão mínima retornado por POST /auth/login e POST /auth/register
 * conforme Princípio da Minimização da LGPD (Art. 6º, III) — sem token JWT e sem CPF/email.
 */
export interface AuthSession {
  name: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
}

/**
 * Perfil completo do titular retornado exclusivamente por GET /auth/me
 * autenticado via Cookie seguro HttpOnly ("accessToken").
 */
export interface UserProfile {
  id?: string;
  name: string;
  lastName: string;
  email?: string;
  cpf?: string;
  role: 'USER' | 'ADMIN';
  active?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const SESSION_STORAGE_KEY = 'auth-session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      // Remove qualquer vestígio legado de token em localStorage
      localStorage.removeItem('auth-data');
      const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached) as UserProfile;
      }
    } catch {
      // Ignora erro de parse
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const normalizeRole = (rawRole?: string): 'USER' | 'ADMIN' => {
    if (rawRole === 'ADMIN' || rawRole === 'ROLE_ADMIN') {
      return 'ADMIN';
    }
    return 'USER';
  };

  /**
   * Consulta GET /auth/me (autenticado pelo Cookie HttpOnly) para sincronizar
   * os dados cadastrais completos do titular apenas em memória.
   */
  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const me = await api<UserProfile>('/auth/me', {
        method: 'GET',
        skipAuthRedirect: true,
      });
      if (me && me.name) {
        const normalized: UserProfile = {
          id: me.id,
          name: me.name,
          lastName: me.lastName || '',
          email: me.email,
          cpf: me.cpf,
          role: normalizeRole(me.role),
          active: me.active,
        };
        setUser(normalized);
        // Em sessionStorage persiste apenas o AuthSessionDTO mínimo (sem CPF/email), respeitando a LGPD
        const minimalSession: AuthSession = {
          name: normalized.name,
          lastName: normalized.lastName,
          role: normalized.role,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(minimalSession));
        return normalized;
      }
      return null;
    } catch {
      setUser(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }, []);

  /**
   * Registra a sessão mínima recebida no login/cadastro e hidrata o perfil via cookie HttpOnly.
   */
  const login = async (session: AuthSession) => {
    const minimalUser: UserProfile = {
      name: session.name,
      lastName: session.lastName || '',
      role: normalizeRole(session.role),
    };
    setUser(minimalUser);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(minimalUser));

    // Hidrata dados completos (id, email, cpf) via cookie HttpOnly em background
    await refreshProfile();
  };

  /**
   * Encerra a sessão no servidor invalidando o cookie HttpOnly ("accessToken") via POST /auth/logout.
   */
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST', skipAuthRedirect: true });
    } catch {
      // Ignora falha de rede no logout e limpa estado local mesmo assim
    } finally {
      setUser(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('auth-data');
      window.location.href = '/login';
    }
  };

  // Hidrata e valida a sessão HttpOnly ao inicializar a aplicação
  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      await refreshProfile();
      if (isMounted) {
        setIsLoading(false);
      }
    };
    initSession();
    return () => {
      isMounted = false;
    };
  }, [refreshProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
