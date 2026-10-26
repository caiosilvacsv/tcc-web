import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Layout } from '../../components/layout/Layout';
import { KeyRound, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export function ResetPasswordPanel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const initialToken = searchParams.get('token') || '';
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('O token de recuperação é obrigatório.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await api<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        skipAuthRedirect: true,
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
        }),
      });
      setIsDone(true);
      toast.success('Senha redefinida com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Token inválido ou expirado. Solicite uma nova recuperação.');
      toast.error('Não foi possível redefinir a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout hideFooter={true}>
      <div className="min-h-[80vh] flex items-center justify-center py-10 animate-fade-in">
        <div className="w-full max-w-md neo-card p-8 bg-white border-3 shadow-neo-lg">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 border-3 border-neo-dark bg-neo-yellow mb-3 shadow-neo-xs">
              <KeyRound className="w-8 h-8 text-neo-dark" />
            </div>
            <h1 className="font-heading font-bold text-2xl text-neo-dark tracking-tight">
              Redefinir Senha
            </h1>
            <p className="text-xs text-slate-600 font-sans mt-1">
              Informe o token de uso único recebido por e-mail e defina sua nova credencial
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border-2 border-rose-950 text-rose-950 font-mono text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isDone ? (
            <div className="space-y-5 text-center">
              <div className="p-4 bg-emerald-50 border-2 border-neo-dark text-emerald-950 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-neo-brand mx-auto" />
                <p className="font-heading font-bold uppercase text-sm">Senha Atualizada!</p>
                <p className="font-sans">
                  Sua senha foi redefinida e o token temporário foi invalidado. Você já pode se autenticar.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full neo-btn-primary py-3 text-xs font-heading font-bold uppercase cursor-pointer"
              >
                Ir para o Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                  Token de Recuperação *
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Cole o token enviado para seu e-mail"
                  className="neo-input font-mono text-xs"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                  Nova Senha (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="neo-input neo-input-icon text-xs pr-10"
                    disabled={isSubmitting}
                  />
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-neo-dark cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="neo-input neo-input-icon text-xs"
                    disabled={isSubmitting}
                  />
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full neo-btn-primary py-3 text-xs font-heading font-bold uppercase tracking-wider cursor-pointer"
              >
                {isSubmitting ? 'Salvando Nova Senha...' : 'Confirmar Nova Senha'}
              </button>

              <div className="pt-3 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600 hover:text-neo-dark"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
