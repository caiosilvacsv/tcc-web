import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertTriangle } from 'lucide-react';

interface LoginResponse {
  token: string;
}

export function LoginPanel() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // 1. Executa chamada de login com payload estrito exigido pelo backend DTO
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      // 2. Salva a sessão no AuthContext global (e no localStorage)
      login(data.token);

      // 3. Decodifica o token JWT de forma rápida e nativa para realizar o redirecionamento imediato
      const base64Url = data.token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const rawRole = payload.role || (payload.roles && payload.roles[0]);

      if (rawRole === 'ROLE_ADMIN' || rawRole === 'ADMIN') {
        navigate('/guiche'); // Administrador vai direto para o guichê presencial
      } else {
        navigate('/dashboard'); // Alunos e servidores vão para o dashboard pessoal
      }
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha informados são inválidos!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neo-bg animate-fade-in">
      <div className="w-full max-w-md neo-card p-8 bg-white border-3">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 border-3 border-neo-dark bg-neo-yellow mb-4 shadow-neo-sm">
            <LogIn className="w-8 h-8 text-neo-dark" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">IFNMG Express</h1>
          <p className="text-sm text-gray-600 mt-1">Acesse sua carteira acadêmica e adquira produtos</p>
        </div>

        {/* Notificação de Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-red-950 text-red-950 font-bold text-xs flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              E-mail Acadêmico
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@ifnmg.edu.br"
                className="neo-input neo-input-icon"
                disabled={isLoading}
              />
              <Mail className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Sua Senha
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="neo-input neo-input-icon"
                disabled={isLoading}
              />
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full neo-btn-primary py-3 font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? 'Autenticando...' : 'Acessar Conta'}
          </button>
        </form>

        {/* Links de navegação */}
        <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 text-center text-xs">
          <p className="text-gray-600">
            Ainda não tem conta acadêmica?{' '}
            <Link to="/register" className="font-bold text-neo-brand hover:underline">
              Cadastre-se aqui
            </Link>
          </p>
          <p className="mt-3 text-gray-500">
            Deseja comprar sem fazer login?{' '}
            <Link to="/store" className="font-bold text-neo-accent hover:underline">
              Acessar Loja Pública
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
