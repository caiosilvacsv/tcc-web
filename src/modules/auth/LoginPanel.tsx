import React, { useState } from 'react';
import { useAuth, AuthSession } from '../../contexts/AuthContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogIn,
  Mail,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  Building2,
  KeyRound,
  X,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';

export function LoginPanel() {
  const { login } = useAuth();
  const { getConfig } = useSystemConfig();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados do Modal de Recuperação de Senha (LGPD Anti-Enumeração)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const institutionName = getConfig('institution.name', 'IFNMG • Campus Salinas');
  const resetExpirationMinutes = getConfig('auth.reset_token_expiration_minutes', '15');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, informe seu e-mail institucional e senha.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // O backend define o Cookie seguro HttpOnly ("accessToken") via Set-Cookie
      // e retorna apenas o AuthSessionDTO ({ name, lastName, role }) sem expor JWT ou CPF.
      const session = await api<AuthSession>('/auth/login', {
        method: 'POST',
        skipAuthRedirect: true,
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      await login(session);
      toast.success(`Bem-vindo(a), ${session.name}! Sessão segura HttpOnly iniciada.`);

      if (session.role === 'ADMIN' || (session.role as string) === 'ROLE_ADMIN') {
        navigate('/admin');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Informe seu e-mail institucional.');
      return;
    }

    setIsSendingReset(true);
    setResetMessage(null);
    try {
      const res = await api<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        skipAuthRedirect: true,
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setResetMessage(
        res?.message ||
          'Se o e-mail informado estiver cadastrado em nosso sistema, as instruções de recuperação de senha foram enviadas.'
      );
      toast.success('Solicitação processada com segurança!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar redefinição de senha.');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <Layout hideFooter={true}>
      <div className="min-h-[82vh] flex items-center justify-center py-10 animate-fade-in">
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
              {institutionName} • Arrecadação Digital STN
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-neo-dark text-[10px] font-mono font-bold text-emerald-900">
              <ShieldCheck className="w-3.5 h-3.5 text-neo-brand" />
              Sessão Protegida por Cookie HttpOnly & LGPD
            </div>
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700">
                  Sua Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setResetMessage(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-[11px] font-mono font-bold text-neo-brand hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
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
              className="w-full neo-btn-primary py-3 font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-4 text-xs shadow-neo-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando Sessão Segura...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Acessar Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Links Auxiliares */}
          <div className="mt-6 pt-5 border-t-2 border-dashed border-slate-300 text-center text-xs space-y-2">
            <p className="text-slate-600">
              Não possui conta acadêmica?{' '}
              <Link to="/register" className="font-bold text-neo-brand hover:underline">
                Cadastre-se aqui
              </Link>
            </p>
            <p className="text-slate-500 text-[11px]">
              Deseja comprar ou consultar tíquetes como visitante?{' '}
              <Link to="/store" className="font-bold text-neo-accent hover:underline">
                Acessar Vitrine Pública
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* MODAL DE RECUPERAÇÃO DE SENHA (POST /auth/forgot-password) */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md neo-card bg-white border-3 border-neo-dark shadow-neo-lg overflow-hidden">
            <div className="p-4 bg-neo-yellow border-b-3 border-neo-dark flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-neo-dark" />
                <h2 className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Recuperação de Senha Institucional
                </h2>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1 border-2 border-neo-dark bg-white hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {resetMessage ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border-2 border-neo-dark text-emerald-950 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-heading font-bold uppercase text-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-neo-brand flex-shrink-0" />
                      <span>Solicitação Registrada (Proteção LGPD)</span>
                    </div>
                    <p className="font-sans leading-relaxed">{resetMessage}</p>
                    <p className="text-[11px] font-mono text-slate-600 pt-1">
                      O token de uso único possui validade de {resetExpirationMinutes} minutos. Caso
                      já possua o token, você também pode informar diretamente na tela de
                      redefinição.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotModalOpen(false);
                        navigate('/reset-password');
                      }}
                      className="flex-1 neo-btn-primary py-2.5 text-xs font-heading font-bold uppercase cursor-pointer"
                    >
                      Já tenho o Token
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="neo-btn bg-white py-2.5 px-4 text-xs cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Informe seu e-mail acadêmico cadastrado. Enviaremos um link seguro com token de
                    uso único (válido por {resetExpirationMinutes} minutos) para redefinir sua
                    senha.
                  </p>

                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                      E-mail Cadastrado *
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu.email@aluno.ifnmg.edu.br"
                      className="neo-input text-xs"
                      disabled={isSendingReset}
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="neo-btn bg-white py-2.5 px-4 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="neo-btn-primary py-2.5 px-5 text-xs font-heading font-bold uppercase cursor-pointer"
                    >
                      {isSendingReset ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
