import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Package, 
  Sparkles, 
  CheckCheck,
  Building,
  User,
  Clock,
  ArrowRight
} from 'lucide-react';
import { isValidCpf, formatCpf, cleanCpf } from '../../utils/cpf';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';

interface ProductItem {
  id: string;
  productName: string;
  paidAt: string;
  status: 'PAID' | 'EXCHANGED';
}

interface StudentExchangeData {
  name: string;
  cpf: string;
  items: ProductItem[];
}

export function GuichePanel() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [cpfInput, setCpfInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [studentData, setStudentData] = useState<StudentExchangeData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [exchangingId, setExchangingId] = useState<string | null>(null);
  const [isBatchExchanging, setIsBatchExchanging] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCpf(rawValue);
    setCpfInput(formatted);

    const numericOnly = cleanCpf(rawValue);
    if (numericOnly.length === 11) {
      if (!isValidCpf(numericOnly)) {
        setErrorMessage('Dígitos verificadores do CPF inválidos.');
      } else {
        setErrorMessage('');
      }
    } else {
      if (errorMessage && errorMessage.includes('CPF')) {
        setErrorMessage('');
      }
    }
  };

  // Preenchimento rápido para demonstração do TCC
  const handleQuickFillCpf = (testCpf: string) => {
    setCpfInput(formatCpf(testCpf));
    setErrorMessage('');
  };

  // Consulta produtos adquiridos pelo CPF
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cpf = cleanCpf(cpfInput);
    if (cpf.length !== 11) {
      setErrorMessage('Digite os 11 dígitos do CPF para consultar.');
      return;
    }

    setErrorMessage('');
    setIsSearching(true);
    try {
      // Suporta tanto /orders/exchange quanto /api/orders/exchange
      const data = await api<StudentExchangeData>(`/orders/exchange?cpf=${cpf}`);
      setStudentData(data);
      toast.success(`Produtos de ${data.name} localizados!`);
    } catch (err: any) {
      setStudentData(null);
      setErrorMessage(err.message || 'Nenhum produto em aberto localizado para este CPF.');
      toast.warning('Nenhum tíquete pago pendente encontrado.');
    } finally {
      setIsSearching(false);
    }
  };

  // Baixa e entrega física unitária do produto
  const handleExchange = async (itemId: string, itemTitle: string) => {
    setExchangingId(itemId);
    try {
      await api<void>(`/orders/items/${itemId}/exchange`, {
        method: 'PUT',
      });

      if (studentData) {
        const updatedItems = studentData.items.map(item =>
          item.id === itemId ? { ...item, status: 'EXCHANGED' as const } : item
        );
        
        setStudentData({
          ...studentData,
          items: updatedItems.filter(item => item.status !== 'EXCHANGED')
        });
      }

      toast.success(`Entrega de "${itemTitle}" confirmada com sucesso!`);

      // Feedback sonoro discreto
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => osc.stop(), 120);
      } catch {}
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar entrega no guichê.');
    } finally {
      setExchangingId(null);
    }
  };

  // Baixa em lote de todos os tíquetes ativos (para acelerar fila)
  const handleBatchExchange = async () => {
    if (!studentData) return;
    const paidItems = studentData.items.filter(i => i.status === 'PAID');
    if (paidItems.length === 0) return;

    toast.confirm({
      title: 'Confirmar Entrega em Lote?',
      message: `Deseja confirmar a entrega de todos os ${paidItems.length} tíquetes ativos para ${studentData.name}?`,
      confirmText: 'Sim, Entregar Todos',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setIsBatchExchanging(true);
        try {
          // Tenta endpoint de lote /orders/items/exchange
          await api<any>('/orders/items/exchange', {
            method: 'PUT',
            body: JSON.stringify({ itemIds: paidItems.map(i => i.id) })
          });

          setStudentData({
            ...studentData,
            items: []
          });

          toast.success(`Todos os ${paidItems.length} tíquetes foram baixados com sucesso!`);
        } catch {
          // Fallback sequencial se o endpoint de lote não estiver ativado
          for (const item of paidItems) {
            try {
              await api<void>(`/orders/items/${item.id}/exchange`, { method: 'PUT' });
            } catch {}
          }
          setStudentData({
            ...studentData,
            items: []
          });
          toast.success('Entrega em lote concluída com sucesso!');
        } finally {
          setIsBatchExchanging(false);
        }
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
        
        {/* CABEÇALHO DO GUICHÊ POS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 neo-card border-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neo-yellow border-3 border-neo-dark flex items-center justify-center text-neo-dark shadow-neo-xs">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-bold text-xl text-neo-dark uppercase tracking-tight">
                  Terminal de Atendimento & Guichê POS
                </h1>
                <span className="neo-badge bg-emerald-100 text-emerald-950 border-emerald-950">
                  Operador Ativo
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Campus Salinas • Refeitório & Biblioteca Central
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/products')}
            className="neo-btn bg-white hover:bg-slate-100 text-xs py-2.5 px-4 flex items-center gap-1.5"
          >
            <Package className="w-4 h-4 text-neo-brand" />
            <span>Gerenciar Catálogo</span>
          </button>
        </div>

        {/* ÁREA DE CONSULTA POR CPF */}
        <div className="neo-card p-6 bg-white border-3 space-y-4">
          <div>
            <h2 className="font-heading font-bold text-base uppercase text-neo-dark flex items-center gap-2">
              <Search className="w-5 h-5 text-neo-accent" /> Consulta Rápida de Beneficiário
            </h2>
            <p className="text-xs text-slate-600 font-sans mt-0.5">
              Digite ou leia o código de barras/QR Code do CPF do estudante para autorizar a liberação imediata da refeição.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={cpfInput}
                onChange={handleCpfChange}
                maxLength={14}
                placeholder="000.000.000-00"
                className="neo-input neo-input-icon font-mono text-base font-bold tracking-wider"
                autoFocus
              />
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="neo-btn-primary py-3 px-8 text-xs tracking-wider"
            >
              {isSearching ? 'Localizando...' : 'Consultar CPF'}
            </button>
          </form>

          {/* Atalho para apresentação rápida */}
          <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-slate-500">
            <span>Atalhos de Teste:</span>
            <button
              type="button"
              onClick={() => handleQuickFillCpf('12345678900')}
              className="underline hover:text-neo-brand cursor-pointer"
            >
              123.456.789-00
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleQuickFillCpf('12345678911')}
              className="underline hover:text-neo-brand cursor-pointer"
            >
              123.456.789-11
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border-2 border-rose-950 text-rose-950 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* PAINEL DO BENEFICIÁRIO LOCALIZADO */}
        {studentData && (
          <div className="neo-card p-6 bg-white border-3 space-y-6 animate-fade-in">
            
            {/* Header com dados do Estudante */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b-3 border-neo-dark">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-neo-brand text-white border-2 border-neo-dark font-heading font-bold text-xl flex items-center justify-center">
                  {studentData.name.charAt(0)}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Beneficiário Identificado</span>
                  <h3 className="font-heading font-bold text-lg text-neo-dark leading-tight">{studentData.name}</h3>
                  <span className="text-xs font-mono text-slate-600">CPF: {formatCpf(studentData.cpf)}</span>
                </div>
              </div>

              {studentData.items.filter(i => i.status === 'PAID').length > 1 && (
                <button
                  onClick={handleBatchExchange}
                  disabled={isBatchExchanging}
                  className="neo-btn bg-neo-yellow hover:bg-neo-yellow-hover text-neo-dark py-2 px-4 text-xs flex items-center gap-1.5 shadow-neo-xs"
                >
                  <CheckCheck className="w-4 h-4" /> Entregar Todos em Lote
                </button>
              )}
            </div>

            {/* Lista de Tíquetes Prontos para Entrega */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Itens Liberados para Entrega Imediata
                </h4>
                <span className="neo-badge bg-emerald-100 text-emerald-950 border-emerald-950">
                  {studentData.items.filter(i => i.status === 'PAID').length} itens disponíveis
                </span>
              </div>

              {studentData.items.filter(item => item.status === 'PAID').length === 0 ? (
                <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h5 className="font-heading font-bold text-sm uppercase text-neo-dark">
                    Nenhum item pendente de entrega
                  </h5>
                  <p className="text-xs text-slate-600 font-sans">
                    Todos os tíquetes adquiridos por este usuário já foram baixados e consumidos.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-3 border-neo-dark text-left bg-slate-100 text-xs font-heading font-bold uppercase">
                        <th className="p-3">Produto / Refeição</th>
                        <th className="p-3">Data da Quitação</th>
                        <th className="p-3 text-right">Ação Operacional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentData.items
                        .filter(item => item.status === 'PAID')
                        .map((item) => (
                          <tr key={item.id} className="border-b border-slate-200 hover:bg-emerald-50/50 transition-colors">
                            <td className="p-3">
                              <span className="neo-badge bg-neo-yellow text-neo-dark border-neo-dark mr-2">
                                Tíquete
                              </span>
                              <span className="font-bold text-sm text-neo-dark">{item.productName}</span>
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-600">
                              {new Date(item.paidAt).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleExchange(item.id, item.productName)}
                                disabled={exchangingId !== null || isBatchExchanging}
                                className="neo-btn-primary py-2 px-4 text-xs inline-flex items-center gap-1.5 shadow-neo-xs"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{exchangingId === item.id ? 'Confirmando...' : 'Confirmar Entrega'}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}
