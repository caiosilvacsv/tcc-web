import React, { useState } from 'react';
import { useAuth, AuthSession } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Mail, CreditCard, Lock, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { isValidCpf, formatCpf, cleanCpf } from '../../utils/cpf';
import { Layout } from '../../components/layout/Layout';

export function RegisterPanel() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCpf(rawValue);
    setCpf(formatted);

    const numericOnly = cleanCpf(rawValue);
    if (numericOnly.length === 11) {
      if (!isValidCpf(numericOnly)) {
        setError('O CPF informado possui dígitos verificadores incorretos.');
      } else {
        setError(null);
      }
    } else if (error && error.includes('CPF')) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !cpf || !email.trim() || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const rawCpf = cleanCpf(cpf);
    if (rawCpf.length !== 11 || !isValidCpf(rawCpf)) {
      setError('Informe um CPF válido com 11 dígitos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // POST /auth/register emite o Cookie seguro HttpOnly ("accessToken")
      // e retorna apenas o AuthSessionDTO ({ name, lastName, role }) conforme LGPD.
      const session = await api<AuthSession>('/auth/register', {
        method: 'POST',
        skipAuthRedirect: true,
        body: JSON.stringify({
          name: firstName.trim(),
          lastName: lastName.trim(),
          cpf: rawCpf,
          email: email.trim(),
          password,
        }),
      });

      await login(session);
      toast.success(`Conta criada com sucesso! Bem-vindo(a), ${session.name}.`);

      if (session.role === 'ADMIN' || (session.role as string) === 'ROLE_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao registrar conta. Verifique os dados informados.');
      toast.error('Erro no cadastro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout hideFooter={true}>
      <div className="min-h-[85vh] flex items-center justify-center py-10 animate-fade-in">
        <div className="w-full max-w-lg neo-card p-8 bg-white border-3 shadow-neo-lg relative">
          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 border-3 border-neo-dark bg-neo-yellow mb-3 shadow-neo-xs">
              <UserPlus className="w-8 h-8 text-neo-dark" />
            </div>
            <h1 className="font-heading font-bold text-2xl text-neo-dark tracking-tight">
              Criar Conta Acadêmica
            </h1>
            <p className="text-xs text-slate-600 font-sans mt-1">
              Cadastre-se para adquirir refeições, quitar taxas e gerenciar sua carteira digital
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Primeiro Nome *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Seu nome"
                    className="neo-input neo-input-icon text-xs"
                    disabled={isLoading}
                    autoFocus
                  />
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Sobrenome *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Seu sobrenome"
                    className="neo-input neo-input-icon text-xs"
                    disabled={isLoading}
                  />
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                CPF do Titular (11 dígitos) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  className="neo-input neo-input-icon font-mono text-xs"
                  disabled={isLoading}
                />
                <CreditCard className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                E-mail Institucional *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@aluno.ifnmg.edu.br"
                  className="neo-input neo-input-icon text-xs"
                  disabled={isLoading}
                />
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                Defina sua Senha (mínimo 6 caracteres) *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
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
              className="w-full neo-btn-primary py-3 font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-6 text-xs shadow-neo-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registrando Sessão HttpOnly...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Concluir Cadastro & Acessar</span>
                </>
              )}
            </button>
          </form>

          {/* Navegação de Volta */}
          <div className="mt-6 pt-5 border-t-2 border-dashed border-slate-300 text-center text-xs">
            <p className="text-slate-600">
              Já possui conta acadêmica?{' '}
              <Link to="/login" className="font-bold text-neo-brand hover:underline">
                Acesse aqui
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
