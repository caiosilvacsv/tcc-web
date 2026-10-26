import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  Package, 
  CheckCheck,
  QrCode,
  CreditCard
} from 'lucide-react';
import { isValidCpf, formatCpf, cleanCpf } from '../../utils/cpf';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';

interface TicketReadyResponseDTO {
  itemId: string;
  orderId: string;
  productTitle: string;
  quantity: number;
  totalAmount: number;
  buyerName: string;
  buyerCpf: string;
  buyerType: 'STUDENT' | 'GUEST';
  paidAt: string;
}

interface ProductItem {
  id: string;
  orderId?: string;
  productName: string;
  paidAt: string;
  quantity?: number;
  totalAmount?: number;
  status: 'PAID' | 'EXCHANGED';
}

interface StudentExchangeData {
  name: string;
  cpf: string;
  buyerType?: 'STUDENT' | 'GUEST';
  items: ProductItem[];
}

export function GuichePanel() {
  const { user } = useAuth();
  const { getConfig } = useSystemConfig();
  const toast = useToast();
  const navigate = useNavigate();

  const guicheSubtitle = getConfig(
    'institution.guiche_subtitle',
    'Campus Salinas • Refeitório Universitário & Biblioteca Central'
  );

  const [searchMode, setSearchMode] = useState<'CPF' | 'ITEM_ID'>('CPF');
  const [cpfInput, setCpfInput] = useState('');
  const [itemIdInput, setItemIdInput] = useState('');
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

  // Consulta produtos adquiridos pelo CPF (/orders/tickets?cpf=...) ou por UUID individual (/orders/items/{itemId})
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (searchMode === 'CPF') {
      const cpf = cleanCpf(cpfInput);
      if (cpf.length !== 11) {
        setErrorMessage('Digite os 11 dígitos do CPF para consultar.');
        return;
      }
      if (!isValidCpf(cpf)) {
        setErrorMessage('CPF informado possui dígitos verificadores inválidos.');
        return;
      }

      setIsSearching(true);
      try {
        const tickets = await api<TicketReadyResponseDTO[]>(`/orders/tickets?cpf=${cpf}`);

        if (!tickets || tickets.length === 0) {
          setStudentData(null);
          setErrorMessage('Nenhum tíquete pago pendente localizado para este CPF.');
          toast.warning('Nenhum tíquete pago pendente encontrado.');
          return;
        }

        const firstTicket = tickets[0];
        setStudentData({
          name: firstTicket.buyerName || 'Contribuinte / Aluno',
          cpf: firstTicket.buyerCpf || cpf,
          buyerType: firstTicket.buyerType,
          items: tickets.map(t => ({
            id: t.itemId,
            orderId: t.orderId,
            productName: t.productTitle,
            quantity: t.quantity,
            totalAmount: t.totalAmount,
            paidAt: t.paidAt,
            status: 'PAID'
          }))
        });
        toast.success(`${tickets.length} tíquete(s) de ${firstTicket.buyerName || 'Contribuinte'} localizado(s)!`);
      } catch (err: any) {
        setStudentData(null);
        setErrorMessage(err.message || 'Nenhum produto em aberto localizado para este CPF.');
        toast.warning('Nenhum tíquete pago pendente encontrado.');
      } finally {
        setIsSearching(false);
      }
    } else {
      const trimmedId = itemIdInput.trim();
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(trimmedId)) {
        setErrorMessage('Informe um código UUID válido de tíquete (ex: 550e8400-e29b-41d4-a716-446655440000).');
        return;
      }

      setIsSearching(true);
      try {
        const ticket = await api<TicketReadyResponseDTO>(`/orders/items/${trimmedId}`);
        setStudentData({
          name: ticket.buyerName || 'Contribuinte / Aluno',
          cpf: ticket.buyerCpf || '',
          buyerType: ticket.buyerType,
          items: [
            {
              id: ticket.itemId,
              orderId: ticket.orderId,
              productName: ticket.productTitle,
              quantity: ticket.quantity,
              totalAmount: ticket.totalAmount,
              paidAt: ticket.paidAt,
              status: 'PAID'
            }
          ]
        });
        toast.success(`Tíquete #${ticket.itemId.slice(0, 8)} validado para entrega!`);
      } catch (err: any) {
        setStudentData(null);
        setErrorMessage(err.message || 'Tíquete não encontrado ou não está apto para retirada.');
        toast.warning('Tíquete inválido ou já retirado.');
      } finally {
        setIsSearching(false);
      }
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
          await api<any>('/orders/items/exchange', {
            method: 'PUT',
            body: JSON.stringify({ itemIds: paidItems.map(i => i.id) })
          });

          setStudentData({
            ...studentData,
            items: []
          });

          toast.success(`Todos os ${paidItems.length} tíquetes foram baixados com sucesso!`);
        } catch (err: any) {
          toast.error(err.message || 'Falha ao processar entrega em lote no guichê.');
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
                  Operador: {[user?.name, user?.lastName].filter(Boolean).join(' ') || 'Admin'}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                {guicheSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin')}
            className="neo-btn bg-white hover:bg-slate-100 text-xs py-2.5 px-4 flex items-center gap-1.5"
          >
            <Package className="w-4 h-4 text-neo-brand" />
            <span>Central Admin</span>
          </button>
        </div>

        {/* ÁREA DE CONSULTA POR CPF OU UUID DO TÍQUETE */}
        <div className="neo-card p-6 bg-white border-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-heading font-bold text-base uppercase text-neo-dark flex items-center gap-2">
                <Search className="w-5 h-5 text-neo-accent" /> Validação de Tíquetes para Retirada
              </h2>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                Consulte todos os tíquetes pagos pelo CPF do beneficiário ou valide um tíquete individual pelo código UUID/QR Code.
              </p>
            </div>

            <div className="flex border-2 border-neo-dark bg-slate-100 p-0.5 self-start">
              <button
                type="button"
                onClick={() => {
                  setSearchMode('CPF');
                  setErrorMessage('');
                }}
                className={`px-3 py-1.5 text-xs font-heading font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${
                  searchMode === 'CPF' ? 'bg-neo-dark text-white' : 'text-neo-dark hover:bg-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Por CPF
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode('ITEM_ID');
                  setErrorMessage('');
                }}
                className={`px-3 py-1.5 text-xs font-heading font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${
                  searchMode === 'ITEM_ID' ? 'bg-neo-dark text-white' : 'text-neo-dark hover:bg-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" /> Por ID do Tíquete
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              {searchMode === 'CPF' ? (
                <input
                  type="text"
                  value={cpfInput}
                  onChange={handleCpfChange}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  className="neo-input neo-input-icon font-mono text-base font-bold tracking-wider"
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={itemIdInput}
                  onChange={(e) => {
                    setItemIdInput(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="UUID do Item (ex: 550e8400-e29b-41d4-a716-446655440000)"
                  className="neo-input neo-input-icon font-mono text-sm font-bold tracking-wide"
                  autoFocus
                />
              )}
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="neo-btn-primary py-3 px-8 text-xs tracking-wider cursor-pointer"
            >
              {isSearching
                ? 'Localizando...'
                : searchMode === 'CPF'
                  ? 'Consultar CPF'
                  : 'Validar Tíquete'}
            </button>
          </form>

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
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Beneficiário Identificado</span>
                    {studentData.buyerType && (
                      <span className={`px-2 py-0.2 text-[10px] font-mono font-bold uppercase border ${
                        studentData.buyerType === 'STUDENT'
                          ? 'bg-blue-100 text-blue-900 border-blue-950'
                          : 'bg-amber-100 text-amber-900 border-amber-950'
                      }`}>
                        {studentData.buyerType === 'STUDENT' ? '🎓 Aluno / Servidor' : '👤 Convidado / Visitante'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-lg text-neo-dark leading-tight">{studentData.name}</h3>
                  {studentData.cpf && (
                    <span className="text-xs font-mono text-slate-600">CPF: {formatCpf(studentData.cpf)}</span>
                  )}
                </div>
              </div>

              {studentData.items.filter(i => i.status === 'PAID').length > 1 && (
                <button
                  onClick={handleBatchExchange}
                  disabled={isBatchExchanging}
                  className="neo-btn bg-neo-yellow hover:bg-neo-yellow-hover text-neo-dark py-2 px-4 text-xs flex items-center gap-1.5 shadow-neo-xs cursor-pointer"
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
                        <th className="p-3">Código / Produto</th>
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
                              <span className="neo-badge bg-neo-yellow text-neo-dark border-neo-dark mr-2 font-mono">
                                #{item.id.slice(0, 8)}
                              </span>
                              <span className="font-bold text-sm text-neo-dark">{item.productName}</span>
                              {item.quantity && item.quantity > 1 && (
                                <span className="ml-2 font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 border border-slate-300">
                                  {item.quantity}x
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-600">
                              {item.paidAt ? new Date(item.paidAt).toLocaleString('pt-BR') : 'Quitado'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleExchange(item.id, item.productName)}
                                disabled={exchangingId !== null || isBatchExchanging}
                                className="neo-btn-primary py-2 px-4 text-xs inline-flex items-center gap-1.5 shadow-neo-xs cursor-pointer"
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
