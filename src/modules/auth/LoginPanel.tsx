import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertTriangle, Eye, EyeOff, Building2, Sparkles } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';

interface LoginResponse {
  token: string;
}

export function LoginPanel() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Preenchimento de credenciais para facilitar apresentação de TCC
  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    toast.info(`Credenciais de teste preenchidas: ${demoEmail}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, informe seu e-mail institucional e senha.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      login(data.token);
      toast.success('Autenticação realizada com sucesso!');

      // Decodificação rápida de role para direcionamento correto
      const base64Url = data.token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const rawRole = payload.role || (payload.roles && payload.roles[0]);

      if (rawRole === 'ROLE_ADMIN' || rawRole === 'ADMIN') {
        navigate('/guiche');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha informados são inválidos.');
      toast.error('Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout hideFooter={true}>
      <div className="min-h-[80vh] flex items-center justify-center py-10 animate-fade-in">
        <div className="w-full max-w-md neo-card p-8 bg-white border-3 shadow-neo-lg relative">
          
          {/* Cabeçalho de Autenticação */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 border-3 border-neo-dark bg-neo-yellow mb-3 shadow-neo-xs">
              <Building2 className="w-8 h-8 text-neo-dark" />
            </div>
            <h1 className="font-heading font-bold text-2xl text-neo-dark tracking-tight">
              Acesso Acadêmico
            </h1>
            <p className="text-xs text-slate-600 font-sans mt-1">
              IFNMG Campus Salinas • Arrecadação Digital
            </p>
          </div>

          {/* Notificação de Erro */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border-2 border-rose-950 text-rose-950 font-mono text-xs flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                E-mail Institucional
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@ifnmg.edu.br"
                  className="neo-input neo-input-icon text-xs"
                  disabled={isLoading}
                  autoFocus
                />
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                Sua Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="neo-input neo-input-icon text-xs pr-10"
                  disabled={isLoading}
                />
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-neo-dark cursor-pointer p-0.5"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full neo-btn-primary py-3 font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-4 text-xs shadow-neo-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Acessar Carteira</span>
                </>
              )}
            </button>
          </form>

          {/* Atalhos de Demonstração para Banca de TCC */}
          <div className="mt-6 p-3 bg-slate-50 border-2 border-neo-dark space-y-2 text-left">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-neo-yellow" /> Demonstração Rápida (TCC):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('aluno@ifnmg.edu.br', 'senha123')}
                className="p-1.5 bg-white border border-neo-dark text-[10px] font-mono hover:bg-slate-100 cursor-pointer text-slate-700"
              >
                👤 Aluno Demo
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin@ifnmg.edu.br', 'admin123')}
                className="p-1.5 bg-white border border-neo-dark text-[10px] font-mono hover:bg-slate-100 cursor-pointer text-slate-700"
              >
                🛡️ Operador Admin
              </button>
            </div>
          </div>

          {/* Links Auxiliares */}
          <div className="mt-6 pt-5 border-t-2 border-dashed border-slate-300 text-center text-xs space-y-2">
            <p className="text-slate-600">
              Não possui conta acadêmica?{' '}
              <Link to="/register" className="font-bold text-neo-brand hover:underline">
                Cadastre-se aqui
              </Link>
            </p>
            <p className="text-slate-500 text-[11px]">
              Deseja comprar como visitante anônimo?{' '}
              <Link to="/store" className="font-bold text-neo-accent hover:underline">
                Acessar Vitrine Pública
              </Link>
            </p>
          </div>

        </div>
      </div>
    </Layout>
  );
}
