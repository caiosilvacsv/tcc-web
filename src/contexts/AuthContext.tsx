import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserClaims {
  sub: string; // Geralmente o e-mail ou identificador do usuário
  role?: 'USER' | 'ADMIN'; // Claim do papel mapeado de forma estrita com o backend
  roles?: string[]; // Algumas implementações enviam como array de authorities
  iss?: string;
  exp?: number;
}

interface User {
  email: string;
  role: 'USER' | 'ADMIN';
  name?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Decodifica um token JWT nativamente, extraindo as claims em formato de objeto
  const decodeJwt = (jwtToken: string): UserClaims | null => {
    try {
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Falha ao decodificar o token JWT nativamente', e);
      return null;
    }
  };

  const login = (newToken: string) => {
    setToken(newToken);
    
    // Extrai os dados do usuário a partir das claims do JWT recebido
    const claims = decodeJwt(newToken);
    let userRole: 'USER' | 'ADMIN' = 'USER';
    let userEmail = '';

    if (claims) {
      userEmail = claims.sub;
      const rawRole = claims.role || (claims.roles && claims.roles[0]);
      
      if (rawRole === 'ROLE_ADMIN' || rawRole === 'ADMIN') {
        userRole = 'ADMIN';
      }
    }

    const userData: User = {
      email: userEmail,
      role: userRole,
      name: (claims as any).name || (claims as any).nome,
    };

    setUser(userData);
    localStorage.setItem(
      'auth-data',
      JSON.stringify({ token: newToken })
    );
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth-data');
    window.location.href = '/login';
  };

  // 1. Carrega a sessão inicial do localStorage ao inicializar o app e valida a expiração preventiva
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth-data');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.token) {
          const claims = decodeJwt(parsed.token);
          if (claims) {
            // Verifica preventivamente se o token recuperado do localStorage já está expirado
            if (claims.exp && claims.exp * 1000 < Date.now()) {
              console.warn('Sessão acadêmica expirada detectada na inicialização do frontend. Limpando credenciais.');
              localStorage.removeItem('auth-data');
            } else {
              setToken(parsed.token);
              
              // Tenta obter a role do formato de string ou do primeiro elemento do array de authorities/roles
              let userRole: 'USER' | 'ADMIN' = 'USER';
              const rawRole = claims.role || (claims.roles && claims.roles[0]);
              
              if (rawRole === 'ROLE_ADMIN' || rawRole === 'ADMIN') {
                userRole = 'ADMIN';
              }

              setUser({
                email: claims.sub,
                role: userRole,
                name: (claims as any).name || (claims as any).nome,
              });
            }
          }
        }
      } catch (e) {
        console.error('Erro ao ler autenticação do localStorage', e);
      }
    }
    setIsLoading(false);
  }, []);

  // 2. Efeito periódico em background que monitora a expiração do token em tempo real (a cada 10s)
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiration = () => {
      const claims = decodeJwt(token);
      if (claims && claims.exp && claims.exp * 1000 < Date.now()) {
        console.warn('Token JWT expirado em background. Redirecionando para login.');
        logout();
      }
    };

    // Valida imediatamente ao ativar ou restaurar o token
    checkTokenExpiration();

    const interval = setInterval(checkTokenExpiration, 10000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        login,
        logout,
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
