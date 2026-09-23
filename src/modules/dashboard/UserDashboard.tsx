import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  Package, 
  History, 
  ArrowRight, 
  UserCircle, 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  ShieldAlert, 
  FileText, 
  ShoppingBag, 
  HelpCircle, 
  User,
  Printer,
  Copy,
  Clock,
  Building,
  Sparkles,
  Check
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';

interface PurchasedProduct {
  id: string;
  itemId?: string;
  orderId?: string;
  productName: string;
  paidAt: string;
  status: 'PENDING' | 'PAID' | 'EXCHANGED';
}

interface OrderItemResponseDTO {
  id: string;
  productId: string;
  productTitle: string;
  quantity: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'EXCHANGED';
}

interface OrderResponseDTO {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItemResponseDTO[];
}

interface PaymentInvoice {
  id: string;
  contributorName: string;
  contributorCpfCnpj: string;
  amount: number;
  status: 'CRIADO' | 'INICIADO' | 'SUBMETIDO' | 'CONCLUIDO' | 'CANCELADO' | 'CREATED' | 'STARTED' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';
  nextUrl?: string;
  paymentMethod?: string;
  pagtesouroPaymentId?: string;
  pspName?: string;
  paidAt?: string;
  createdAt: string;
}

interface InvoicesPageResponse {
  content: PaymentInvoice[];
  page?: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export function UserDashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Estados dos dados da API
  const [tickets, setTickets] = useState<PurchasedProduct[]>([]);
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aba ativa: 'AVAILABLE' | 'PENDING' | 'INVOICES' | 'EXCHANGED'
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'PENDING' | 'INVOICES' | 'EXCHANGED'>('AVAILABLE');

  // Estados de Modais
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<PurchasedProduct | null>(null);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<PaymentInvoice | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Estados do Modal de Cupom Fiscal
  const [selectedOrderIdForDetails, setSelectedOrderIdForDetails] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderResponseDTO | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [copiedTicketId, setCopiedTicketId] = useState(false);

  // Proteção de rota no lado do cliente
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Carrega tíquetes e faturas do estudante
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Busca os pedidos reais do usuário logado (suporta tanto /orders quanto /orders/my-tickets)
      let orders: OrderResponseDTO[] = [];
      try {
        orders = await api<OrderResponseDTO[]>('/orders');
      } catch {
        orders = await api<OrderResponseDTO[]>('/orders/my-tickets');
      }

      const formattedTickets: PurchasedProduct[] = [];
      if (Array.isArray(orders)) {
        orders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              for (let i = 0; i < item.quantity; i++) {
                formattedTickets.push({
                  id: `${item.id}-${i}`,
                  itemId: item.id,
                  orderId: order.id,
                  productName: item.productTitle,
                  paidAt: order.createdAt,
                  status: item.status
                });
              }
            });
          }
        });
      }
      setTickets(formattedTickets);

      // 2. Busca as faturas na rota /payments
      const invoicesResponse = await api<InvoicesPageResponse>('/payments');
      setInvoices(invoicesResponse.content || []);
    } catch (err: any) {
      console.warn("Falha ao sincronizar dados com o backend:", err);
      setError('Servidor local em sincronização ou indisponível.');
      setTickets([]);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  // Busca detalhes do pedido selecionado
  const fetchOrderDetails = async (orderId: string) => {
    setIsLoadingDetails(true);
    setDetailsError(null);
    try {
      const data = await api<OrderResponseDTO>(`/orders/${orderId}`);
      setOrderDetails(data);
    } catch (err: any) {
      setDetailsError(err.message || 'Não foi possível carregar os detalhes desta compra.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedOrderIdForDetails) {
      fetchOrderDetails(selectedOrderIdForDetails);
    } else {
      setOrderDetails(null);
      setDetailsError(null);
    }
  }, [selectedOrderIdForDetails]);

  const handleCopyTicketId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTicketId(true);
    toast.success('Código do tíquete copiado para a área de transferência!');
    setTimeout(() => setCopiedTicketId(false), 2500);
  };

  if (!isAuthenticated) return null;

  const availableTickets = tickets.filter(t => t.status === 'PAID');
  const pendingTickets = tickets.filter(t => t.status === 'PENDING');
  const exchangedTickets = tickets.filter(t => t.status === 'EXCHANGED');

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        
        {/* HERO CARD: PASSAPORTE ACADÊMICO DO ESTUDANTE */}
        <div className="neo-card p-6 md:p-8 bg-white border-3 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            {/* Dados do Usuário */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-neo-yellow border-3 border-neo-dark flex items-center justify-center font-heading font-bold text-2xl text-neo-dark shadow-neo-sm">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-xl text-neo-dark">
                    {user?.name || user?.email?.split('@')[0]}
                  </span>
                  <span className="neo-badge bg-neo-brand-light text-emerald-950 border-neo-dark">
                    Estudante
                  </span>
                </div>
                
                <p className="text-xs font-mono text-slate-600 mt-1">
                  {user?.email} • IFNMG Campus Salinas
                </p>

                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-500">
                  <span>Sessão Ativa (JWT)</span>
                  <span>•</span>
                  <span>Ambiente Homologado</span>
                </div>
              </div>
            </div>

            {/* Ações de Cabeçalho */}
            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              <button
                onClick={() => navigate('/store')}
                className="neo-btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5 flex-1 md:flex-initial"
              >
                <ShoppingBag className="w-4 h-4" /> Comprar Tíquetes
              </button>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="neo-btn bg-white hover:bg-slate-100 text-xs py-2.5 px-3 flex items-center gap-1.5 flex-1 md:flex-initial"
              >
                <User className="w-4 h-4" /> Meu Perfil
              </button>
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="neo-btn bg-white hover:bg-slate-100 text-xs py-2.5 px-3 flex items-center gap-1.5"
                title="Ajuda e Suporte"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* GRID DE KPIS / ESTATÍSTICAS RÁPIDAS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t-2 border-dashed border-slate-300">
            
            <div 
              onClick={() => setActiveTab('AVAILABLE')}
              className="p-4 border-2 border-neo-dark bg-emerald-50 cursor-pointer hover:-translate-y-0.5 transition-transform shadow-neo-xs"
            >
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block">
                Disponíveis para Uso
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-mono font-bold text-emerald-950">
                  {availableTickets.length}
                </span>
                <span className="text-xs font-heading font-bold text-emerald-700 uppercase">
                  Tíquetes
                </span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('PENDING')}
              className="p-4 border-2 border-neo-dark bg-amber-50 cursor-pointer hover:-translate-y-0.5 transition-transform shadow-neo-xs"
            >
              <span className="text-[10px] font-mono uppercase font-bold text-amber-800 block">
                Aguardando Pagamento
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-mono font-bold text-amber-950">
                  {pendingTickets.length}
                </span>
                <span className="text-xs font-heading font-bold text-amber-700 uppercase">
                  Pendentes
                </span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('INVOICES')}
              className="p-4 border-2 border-neo-dark bg-blue-50 cursor-pointer hover:-translate-y-0.5 transition-transform shadow-neo-xs"
            >
              <span className="text-[10px] font-mono uppercase font-bold text-blue-800 block">
                Faturas PagTesouro
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-mono font-bold text-blue-950">
                  {invoices.length}
                </span>
                <span className="text-xs font-heading font-bold text-blue-700 uppercase">
                  Guias
                </span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('EXCHANGED')}
              className="p-4 border-2 border-neo-dark bg-slate-50 cursor-pointer hover:-translate-y-0.5 transition-transform shadow-neo-xs"
            >
              <span className="text-[10px] font-mono uppercase font-bold text-slate-600 block">
                Já Resgatados
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-mono font-bold text-slate-800">
                  {exchangedTickets.length}
                </span>
                <span className="text-xs font-heading font-bold text-slate-500 uppercase">
                  Entregues
                </span>
              </div>
            </div>

          </div>
        </div>

        {error && (
          <div className="p-4 bg-amber-50 border-2 border-amber-950 text-amber-950 text-xs font-mono flex items-center gap-2 shadow-neo-xs">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-700" />
            <span>{error}</span>
          </div>
        )}

        {/* ABAS DE NAVEGAÇÃO NEO-BRUTALISTAS */}
        <div className="flex flex-wrap gap-2 border-b-3 border-neo-dark pb-2">
          <button
            onClick={() => setActiveTab('AVAILABLE')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'AVAILABLE'
                ? 'bg-neo-brand text-white border-neo-dark shadow-neo-xs -translate-y-0.5'
                : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Tíquetes Ativos ({availableTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-neo-yellow text-neo-dark border-neo-dark shadow-neo-xs -translate-y-0.5'
                : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Pendências ({pendingTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'INVOICES'
                ? 'bg-neo-accent text-white border-neo-dark shadow-neo-xs -translate-y-0.5'
                : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Faturas & Cobranças ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('EXCHANGED')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'EXCHANGED'
                ? 'bg-slate-800 text-white border-neo-dark shadow-neo-xs -translate-y-0.5'
                : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Uso ({exchangedTickets.length})</span>
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        
        {/* ABA 1: TÍQUETES DISPONÍVEIS / ATIVOS */}
        {activeTab === 'AVAILABLE' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 neo-card border-3">
              <div>
                <h3 className="font-heading font-bold text-base uppercase text-neo-dark">
                  Créditos Liberados para Refeitório e Serviços
                </h3>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  Apresente o QR Code no guichê do campus ou informe seu CPF para efetuar a retirada.
                </p>
              </div>
              <span className="neo-badge bg-neo-yellow text-neo-dark border-neo-dark">
                {availableTickets.length} créditos ativos
              </span>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-slate-500 font-mono text-xs">
                Carregando carteira de tíquetes...
              </div>
            ) : availableTickets.length === 0 ? (
              <div className="py-12 px-6 text-center bg-white neo-card border-3 max-w-md mx-auto space-y-3">
                <span className="text-4xl block select-none">🎫</span>
                <h4 className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Nenhum tíquete ativo na carteira
                </h4>
                <p className="text-xs text-slate-600 font-sans leading-relaxed">
                  Você não possui tíquetes pagos pendentes de resgate no momento. Acesse a loja para comprar refeições.
                </p>
                <button
                  onClick={() => navigate('/store')}
                  className="neo-btn-primary py-2 px-4 text-xs"
                >
                  Ir para a Vitrine de Tíquetes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="neo-card p-5 border-3 border-neo-dark bg-white flex flex-col justify-between hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="neo-badge bg-emerald-100 text-emerald-900 border-emerald-900">
                          🟢 Pronto para Resgate
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ID #{ticket.itemId ? ticket.itemId.slice(0, 8) : ticket.id.slice(0, 8)}
                        </span>
                      </div>

                      <h4 className="font-heading font-bold text-base text-neo-dark leading-snug mt-1">
                        {ticket.productName}
                      </h4>
                      
                      <p className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Liberado em: {new Date(ticket.paidAt).toLocaleDateString('pt-BR')} às {new Date(ticket.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="pt-4 border-t-2 border-dashed border-slate-200 flex gap-2 mt-4">
                      <button
                        onClick={() => setSelectedTicketForQr(ticket)}
                        className="flex-1 neo-btn-primary py-2 text-xs flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" /> Exibir Código QR
                      </button>
                      {ticket.orderId && (
                        <button
                          onClick={() => setSelectedOrderIdForDetails(ticket.orderId!)}
                          className="neo-btn bg-slate-100 hover:bg-slate-200 text-xs py-2 px-3 flex items-center gap-1"
                          title="Ver cupom fiscal"
                        >
                          <FileText className="w-4 h-4" /> Recibo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: AGUARDANDO PAGAMENTO (PENDING) */}
        {activeTab === 'PENDING' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-4 neo-card border-3">
              <h3 className="font-heading font-bold text-base uppercase text-neo-dark">
                Tíquetes e Pedidos Aguardando Compensação
              </h3>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                Estes itens foram registrados, mas ainda não tiveram sua quitação confirmada pelo PagTesouro.
              </p>
            </div>

            {pendingTickets.length === 0 ? (
              <div className="py-12 px-6 text-center bg-white neo-card border-3 max-w-md mx-auto space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Tudo em dia!
                </h4>
                <p className="text-xs text-slate-600 font-sans">
                  Você não possui nenhuma taxa ou tíquete pendente de pagamento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="neo-card p-5 border-3 border-neo-dark bg-amber-50/60 flex flex-col justify-between"
                  >
                    <div>
                      <span className="neo-badge bg-amber-200 text-amber-950 border-amber-950">
                        ⏳ Aguardando Compensação
                      </span>
                      <h4 className="font-heading font-bold text-base text-neo-dark mt-2">
                        {ticket.productName}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">
                        Registrado em: {new Date(ticket.paidAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div className="pt-4 border-t-2 border-dashed border-amber-300 mt-4 flex gap-2">
                      {ticket.orderId && (
                        <button
                          onClick={() => setSelectedOrderIdForDetails(ticket.orderId!)}
                          className="w-full neo-btn bg-white hover:bg-slate-100 text-xs py-2 flex items-center justify-center gap-1.5"
                        >
                          <FileText className="w-4 h-4" /> Ver Detalhes do Pedido
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: FATURAS & COBRANÇAS PAGTESOURO */}
        {activeTab === 'INVOICES' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-4 neo-card border-3 flex justify-between items-center">
              <div>
                <h3 className="font-heading font-bold text-base uppercase text-neo-dark">
                  Histórico de Faturas Oficiais da STN
                </h3>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  Todas as guias de recolhimento geradas através da API integrada do PagTesouro.
                </p>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="py-12 px-6 text-center bg-white neo-card border-3 max-w-md mx-auto space-y-2">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Nenhuma fatura registrada
                </h4>
                <p className="text-xs text-slate-600 font-sans">
                  Quando você gerar compras na loja, o histórico fiscal completo será consolidado aqui.
                </p>
              </div>
            ) : (
              <div className="neo-card p-6 bg-white border-3 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-3 border-neo-dark text-left bg-slate-100 text-xs font-heading font-bold uppercase">
                      <th className="p-3">Identificador</th>
                      <th className="p-3">Valor Total</th>
                      <th className="p-3">Situação</th>
                      <th className="p-3">Data de Emissão</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const isPending = ['CRIADO', 'INICIADO', 'SUBMETIDO', 'CREATED', 'STARTED', 'SUBMITTED'].includes(inv.status);
                      const isCompleted = ['CONCLUIDO', 'COMPLETED'].includes(inv.status);

                      return (
                        <tr key={inv.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-xs font-bold text-neo-dark">
                            #{inv.id.slice(0, 8)}...
                          </td>
                          <td className="p-3 font-mono font-bold text-sm text-neo-dark">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.amount)}
                          </td>
                          <td className="p-3">
                            <span
                              className={`neo-badge ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-950'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-950 border-amber-950 animate-pulse'
                                  : 'bg-rose-100 text-rose-950 border-rose-950'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-600">
                            {new Date(inv.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3 text-center">
                            {isPending && inv.nextUrl ? (
                              <a
                                href={inv.nextUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="neo-btn bg-neo-yellow hover:bg-neo-yellow-hover text-neo-dark py-1.5 px-3 text-[11px] inline-flex items-center gap-1 no-underline"
                              >
                                Pagar Pix/GRU <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : isCompleted ? (
                              <button
                                onClick={() => setSelectedInvoiceForReceipt(inv)}
                                className="neo-btn bg-white hover:bg-slate-100 py-1.5 px-3 text-[11px] inline-flex items-center gap-1"
                              >
                                Ver Recibo <FileText className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-xs font-mono text-slate-400">Cancelada</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 4: HISTÓRICO DE RESGATES E ENTREGAS */}
        {activeTab === 'EXCHANGED' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-4 neo-card border-3">
              <h3 className="font-heading font-bold text-base uppercase text-neo-dark">
                Histórico de Tíquetes Consumidos
              </h3>
              <p className="text-xs text-slate-600 font-sans mt-0.5">
                Registro de refeições já retiradas e baixadas fisicamente no guichê.
              </p>
            </div>

            {exchangedTickets.length === 0 ? (
              <div className="py-12 px-6 text-center bg-white neo-card border-3 max-w-md mx-auto space-y-2">
                <History className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Sem registros de consumo
                </h4>
                <p className="text-xs text-slate-600 font-sans">
                  Quando você realizar a troca física no refeitório, o histórico de entrega aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exchangedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 border-2 border-slate-300 bg-slate-50 flex justify-between items-center opacity-85"
                  >
                    <div>
                      <span className="px-2 py-0.5 border border-slate-400 text-[10px] font-mono uppercase bg-slate-200 text-slate-700 font-bold">
                        Entregue no Refeitório
                      </span>
                      <h4 className="font-heading font-bold text-sm text-slate-700 mt-1.5">
                        {ticket.productName}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Baixa realizada em: {new Date(ticket.paidAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {ticket.orderId && (
                      <button
                        onClick={() => setSelectedOrderIdForDetails(ticket.orderId!)}
                        className="neo-btn bg-white hover:bg-slate-100 text-[11px] py-1.5 px-3"
                      >
                        Recibo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: QR CODE DINÂMICO PARA RESGATE NO REFEITÓRIO */}
      {selectedTicketForQr && (
        <div className="fixed inset-0 bg-neo-dark/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-white border-3 border-neo-dark p-6 shadow-neo-xl animate-fade-in">
            
            <div className="flex justify-between items-center pb-3 mb-4 border-b-2 border-neo-dark">
              <h3 className="font-heading font-bold text-base uppercase tracking-tight flex items-center gap-2 text-neo-dark">
                <QrCode className="w-5 h-5 text-neo-brand" /> Resgate Presencial
              </h3>
              <button
                onClick={() => setSelectedTicketForQr(null)}
                className="text-slate-400 hover:text-neo-dark font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="p-2.5 bg-neo-yellow border-2 border-neo-dark font-mono text-[11px] font-bold uppercase tracking-wider text-neo-dark">
                Apresente este código no refeitório
              </div>

              {/* QR Code SVG Vetorial Estilo Retro Neo-Brutalista */}
              <div className="bg-slate-50 border-3 border-neo-dark p-6 inline-block mx-auto shadow-neo-xs">
                <svg className="w-44 h-44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="5" width="25" height="25" fill="none" stroke="#0F172A" strokeWidth="6" />
                  <rect x="10" y="10" width="15" height="15" fill="#0F172A" />
                  <rect x="70" y="5" width="25" height="25" fill="none" stroke="#0F172A" strokeWidth="6" />
                  <rect x="75" y="10" width="15" height="15" fill="#0F172A" />
                  <rect x="5" y="70" width="25" height="25" fill="none" stroke="#0F172A" strokeWidth="6" />
                  <rect x="10" y="75" width="15" height="15" fill="#0F172A" />
                  
                  <rect x="40" y="5" width="8" height="8" fill="#0F172A" />
                  <rect x="52" y="15" width="12" height="6" fill="#0F172A" />
                  <rect x="40" y="25" width="20" height="6" fill="#0F172A" />
                  <rect x="5" y="40" width="15" height="8" fill="#0F172A" />
                  <rect x="25" y="45" width="12" height="12" fill="#0F172A" />
                  <rect x="45" y="40" width="8" height="18" fill="#0F172A" />
                  <rect x="60" y="35" width="18" height="8" fill="#0F172A" />
                  <rect x="85" y="40" width="10" height="12" fill="#0F172A" />
                  <rect x="40" y="70" width="12" height="12" fill="#0F172A" />
                  <rect x="60" y="65" width="8" height="24" fill="#0F172A" />
                  <rect x="75" y="75" width="15" height="8" fill="#0F172A" />
                  <rect x="80" y="60" width="8" height="8" fill="#0F172A" />
                  <rect x="20" y="20" width="6" height="6" fill="#059669" />
                  <rect x="74" y="20" width="6" height="6" fill="#059669" />
                  <rect x="20" y="74" width="6" height="6" fill="#059669" />
                </svg>
              </div>

              <div>
                <h4 className="font-heading font-bold text-sm text-neo-dark">
                  {selectedTicketForQr.productName}
                </h4>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold truncate max-w-[200px]">
                    ID: {selectedTicketForQr.itemId || selectedTicketForQr.id}
                  </span>
                  <button
                    onClick={() => handleCopyTicketId(selectedTicketForQr.itemId || selectedTicketForQr.id)}
                    className="p-1 border border-neo-dark hover:bg-slate-100 cursor-pointer"
                    title="Copiar ID"
                  >
                    {copiedTicketId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border-2 border-emerald-950 text-left text-[11px] text-emerald-950 font-sans leading-relaxed">
                💡 <strong>Dica Operacional</strong>: Caso a câmera do guichê esteja indisponível, o atendente pode realizar a baixa direta digitando seu <strong>CPF</strong> no terminal.
              </div>
            </div>

            <button
              onClick={() => setSelectedTicketForQr(null)}
              className="w-full neo-btn bg-slate-100 hover:bg-slate-200 mt-5 text-xs py-2.5 font-bold"
            >
              Fechar Código
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECIBO DE QUITAÇÃO DA FATURA */}
      {selectedInvoiceForReceipt && (
        <div className="fixed inset-0 bg-neo-dark/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white border-3 border-neo-dark p-6 shadow-neo-xl animate-fade-in">
            
            <div className="flex justify-between items-center pb-3 mb-4 border-b-2 border-neo-dark">
              <h3 className="font-heading font-bold text-base uppercase flex items-center gap-2 text-neo-dark">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Comprovante de Pagamento
              </h3>
              <button
                onClick={() => setSelectedInvoiceForReceipt(null)}
                className="text-slate-400 hover:text-neo-dark font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs text-slate-800">
              <div className="p-3 bg-emerald-50 border-2 border-emerald-950 text-emerald-950 text-center font-bold uppercase text-[11px]">
                🏛️ Quitação Oficial PagTesouro / STN
              </div>

              <div className="space-y-2 border-b-2 border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">ID Transação:</span>
                  <span className="font-bold text-neo-dark">{selectedInvoiceForReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Contribuinte:</span>
                  <span className="font-bold text-neo-dark truncate max-w-xs">{selectedInvoiceForReceipt.contributorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">CPF/CNPJ:</span>
                  <span className="font-bold text-neo-dark">{selectedInvoiceForReceipt.contributorCpfCnpj}</span>
                </div>
              </div>

              <div className="space-y-2 border-b-2 border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Meio Utilizado:</span>
                  <span className="font-bold text-neo-dark uppercase">{selectedInvoiceForReceipt.paymentMethod || 'PIX'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Agente Financeiro:</span>
                  <span className="font-bold text-neo-dark uppercase">{selectedInvoiceForReceipt.pspName || 'BANCO DO BRASIL'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase text-[10px]">Data da Quitação:</span>
                  <span className="font-bold text-neo-dark">
                    {selectedInvoiceForReceipt.paidAt ? new Date(selectedInvoiceForReceipt.paidAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex justify-between items-baseline">
                <span className="font-heading font-bold text-xs uppercase text-slate-700">Valor Liquidado:</span>
                <span className="text-2xl font-mono font-bold text-emerald-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedInvoiceForReceipt.amount)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => window.print()}
                className="neo-btn bg-slate-100 hover:bg-slate-200 text-xs py-2.5 px-4 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button
                onClick={() => setSelectedInvoiceForReceipt(null)}
                className="flex-1 neo-btn-primary py-2.5 text-xs font-bold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DETALHES DO PEDIDO / CUPOM FISCAL ACADÊMICO */}
      {selectedOrderIdForDetails && (
        <div className="fixed inset-0 bg-neo-dark/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white border-3 border-neo-dark p-6 shadow-neo-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-3 mb-4 border-b-2 border-neo-dark">
              <h3 className="font-heading font-bold text-base uppercase flex items-center gap-2 text-neo-dark">
                <FileText className="w-5 h-5 text-neo-brand" /> Cupom de Arrecadação
              </h3>
              <button
                onClick={() => setSelectedOrderIdForDetails(null)}
                className="text-slate-400 hover:text-neo-dark font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 text-center font-mono text-xs text-slate-500 animate-pulse">
                Carregando dados fiscais do pedido...
              </div>
            ) : detailsError ? (
              <div className="p-4 bg-rose-50 border-2 border-rose-950 text-rose-950 text-xs font-mono">
                {detailsError}
              </div>
            ) : orderDetails ? (
              <div className="space-y-4">
                
                {/* Visual Estilo Rolo de Papel Térmico */}
                <div className="bg-slate-50 border-2 border-neo-dark p-4 font-mono text-[10px] text-slate-800 leading-relaxed shadow-neo-xs">
                  
                  <div className="text-center font-bold uppercase tracking-widest text-slate-500 border-b border-dashed border-slate-300 pb-2 mb-2">
                    * * * COMPROVANTE DE ARRECADAÇÃO * * *
                  </div>

                  <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                    <h4 className="font-bold text-xs uppercase text-neo-dark">IFNMG - CAMPUS SALINAS</h4>
                    <p className="text-[9px] text-slate-500">CNPJ: 10.749.255/0001-30</p>
                    <p className="text-[9px] text-slate-500">SISTEMA ARRECADAÇÃO EXPRESS MODERN</p>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 uppercase">Pedido:</span>
                      <span className="font-bold">{orderDetails.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 uppercase">Data:</span>
                      <span className="font-bold">{new Date(orderDetails.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 uppercase">Status:</span>
                      <span className="font-bold uppercase text-emerald-800">{orderDetails.status}</span>
                    </div>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-300 space-y-2">
                    <div className="flex justify-between font-bold text-slate-600 border-b border-slate-200 pb-1">
                      <span className="w-1/2">Item</span>
                      <span className="w-1/6 text-center">Qtd</span>
                      <span className="w-1/3 text-right">Total</span>
                    </div>

                    {orderDetails.items?.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="w-1/2 truncate font-bold text-neo-dark" title={item.productTitle}>
                          {item.productTitle}
                        </span>
                        <span className="w-1/6 text-center text-slate-600">x{item.quantity}</span>
                        <span className="w-1/3 text-right font-bold text-neo-dark">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-between items-baseline font-bold">
                    <span className="text-xs uppercase text-slate-700">VALOR TOTAL:</span>
                    <span className="text-base font-mono text-emerald-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderDetails.totalAmount)}
                    </span>
                  </div>

                  <div className="mt-3 text-center text-[8px] text-slate-400 border-t border-dashed border-slate-300 pt-2 leading-tight">
                    ESTE DOCUMENTO REGISTRA O RECOLHIMENTO DA RECEITA PÚBLICA.<br />
                    TCC II - CAIO DA SILVA VIANA - IFNMG 2026
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="neo-btn bg-slate-100 hover:bg-slate-200 text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                  <button
                    onClick={() => setSelectedOrderIdForDetails(null)}
                    className="flex-1 neo-btn-primary py-2 text-xs"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PERFIL ACADÊMICO */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-neo-dark/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white border-3 border-neo-dark p-6 shadow-neo-xl animate-fade-in">
            <div className="flex justify-between items-center pb-3 mb-4 border-b-2 border-neo-dark">
              <h3 className="font-heading font-bold text-base uppercase flex items-center gap-2 text-neo-dark">
                <UserCircle className="w-5 h-5 text-neo-brand" /> Perfil Acadêmico
              </h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-slate-400 hover:text-neo-dark font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center p-4 bg-slate-50 border-2 border-neo-dark">
                <div className="w-16 h-16 bg-neo-yellow border-2 border-neo-dark flex items-center justify-center font-bold text-xl uppercase mx-auto mb-2 text-neo-dark shadow-neo-xs">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <h4 className="font-heading font-bold text-base text-neo-dark">
                  {user?.name || user?.email?.split('@')[0]}
                </h4>
                <span className="neo-badge bg-neo-brand-light text-emerald-950 border-neo-dark mt-1">
                  Perfil: {user?.role}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-700">
                <div className="p-2.5 border border-slate-300 flex justify-between">
                  <span className="text-slate-500 font-bold">E-mail:</span>
                  <span className="font-bold text-neo-dark truncate max-w-xs">{user?.email}</span>
                </div>
                <div className="p-2.5 border border-slate-300 flex justify-between">
                  <span className="text-slate-500 font-bold">Campus:</span>
                  <span className="font-bold text-neo-dark">Salinas - MG</span>
                </div>
                <div className="p-2.5 border border-slate-300 flex justify-between bg-emerald-50 border-emerald-900">
                  <span className="text-emerald-900 font-bold">Segurança:</span>
                  <span className="font-bold text-emerald-900">Autenticação JWT Stateless</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="w-full neo-btn bg-slate-100 hover:bg-slate-200 mt-5 text-xs py-2.5 font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: AJUDA E SUPORTE */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-neo-dark/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg bg-white border-3 border-neo-dark p-6 shadow-neo-xl animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 mb-4 border-b-2 border-neo-dark">
              <h3 className="font-heading font-bold text-base uppercase flex items-center gap-2 text-neo-dark">
                <HelpCircle className="w-5 h-5 text-neo-brand" /> Guia de Uso do Sistema
              </h3>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="text-slate-400 hover:text-neo-dark font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 border-2 border-neo-dark">
                <h4 className="font-heading font-bold text-sm text-neo-dark uppercase mb-1">
                  1. Como funciona a compra e liberação?
                </h4>
                <p>
                  Você escolhe as refeições ou multas na vitrine e clica em pagar via PagTesouro. O pagamento pode ser feito via Pix ou Cartão. Assim que o banco aprova, nosso sistema recebe o webhook e libera seu tíquete instantaneamente.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border-2 border-neo-dark">
                <h4 className="font-heading font-bold text-sm text-neo-dark uppercase mb-1">
                  2. Como retiro a refeição no refeitório?
                </h4>
                <p>
                  Abra esta tela e clique em <strong>"Exibir Código QR"</strong> no tíquete correspondente. Mostre ao atendente ou simplesmente informe seu <strong>CPF</strong> para a conferência no balcão.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border-2 border-neo-dark">
                <h4 className="font-heading font-bold text-sm text-neo-dark uppercase mb-1">
                  3. Os comprovantes possuem validade?
                </h4>
                <p>
                  Sim. Na aba <strong>"Faturas & Cobranças"</strong> você tem acesso a todos os recibos oficiais gerados perante a Secretaria do Tesouro Nacional (STN).
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full neo-btn-primary mt-5 text-xs py-2.5 font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </Layout>
  );
}
