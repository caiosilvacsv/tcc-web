import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Mail, CreditCard, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { isValidCpf, formatCpf, cleanCpf } from '../../utils/cpf';

interface RegisterResponse {
  token: string;
}

export function RegisterPanel() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCpf(rawValue);
    setCpf(formatted);

    const numericOnly = cleanCpf(rawValue);
    
    // Feedback instantâneo reativo: se digitou os 11 dígitos, faz a validação matemática oficial do CPF
    if (numericOnly.length === 11) {
      if (!isValidCpf(numericOnly)) {
        setError('O CPF informado é inválido! Por favor, revise a digitação dos dígitos verificadores.');
      } else {
        setError(null);
      }
    } else {
      // Limpa o aviso de erro do CPF caso o usuário apague ou continue digitando
      if (error && error.includes('CPF')) {
        setError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas de entrada
    if (!firstName || !lastName || !cpf || !email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    const rawCpf = cleanCpf(cpf);
    if (rawCpf.length !== 11) {
      setError('CPF inválido. Deve possuir exatamente 11 dígitos.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // 1. Faz chamada ao backend Spring Boot para registrar a conta
      const data = await api<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: firstName,
          last_name: lastName, // Exigido obrigatoriamente no DTO do backend
          cpf: rawCpf,         // CPF enviado limpo sem caracteres especiais
          email,
          password,
        }),
      });

      setSuccess('Conta criada e autenticada com sucesso! Redirecionando...');

      // 2. Realiza o AUTO-LOGIN instantâneo com o token retornado pelo backend
      login(data.token);

      // 3. Decodifica o token JWT de forma nativa para realizar o redirecionamento imediato
      const base64Url = data.token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const rawRole = payload.role || (payload.roles && payload.roles[0]);

      // 4. Redireciona o usuário sem forçá-lo a passar pela tela de login
      setTimeout(() => {
        if (rawRole === 'ROLE_ADMIN' || rawRole === 'ADMIN') {
          navigate('/guiche'); // Administrador/Operador vai ao guichê
        } else {
          navigate('/dashboard'); // Alunos e servidores vão para o dashboard
        }
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Falha ao registrar conta. Verifique seus dados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neo-bg animate-fade-in">
      <div className="w-full max-w-lg neo-card p-8 bg-white border-3">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 border-3 border-neo-dark bg-neo-yellow mb-4 shadow-neo-sm">
            <UserPlus className="w-8 h-8 text-neo-dark" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Criar Conta Acadêmica</h1>
          <p className="text-sm text-gray-600 mt-1">
            Cadastre-se para comprar produtos institucionais e gerenciar sua carteira
          </p>
        </div>

        {/* Notificação de Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-2 border-red-950 text-red-950 font-bold text-xs flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Notificação de Sucesso */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border-2 border-emerald-950 text-emerald-950 font-bold text-xs flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Primeiro Nome
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Seu nome"
                  className="neo-input neo-input-icon"
                  disabled={isLoading || !!success}
                />
                <User className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Sobrenome
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Seu sobrenome"
                  className="neo-input neo-input-icon"
                  disabled={isLoading || !!success}
                />
                <User className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                CPF (apenas números)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  className="neo-input neo-input-icon font-mono"
                  disabled={isLoading || !!success}
                />
                <CreditCard className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              E-mail Institucional
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@ifnmg.edu.br"
                className="neo-input neo-input-icon"
                disabled={isLoading || !!success}
              />
              <Mail className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Defina uma Senha
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="neo-input neo-input-icon"
                disabled={isLoading || !!success}
              />
              <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !!success}
            className="w-full neo-btn-primary py-3 font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? 'Cadastrando...' : 'Finalizar Cadastro'}
          </button>
        </form>

        {/* Navegação de Volta */}
        <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 text-center text-xs">
          <p className="text-gray-600">
            Já possui uma conta acadêmica?{' '}
            <Link to="/login" className="font-bold text-neo-brand hover:underline">
              Fazer login
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
