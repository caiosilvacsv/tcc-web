import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Package,
  History,
  UserCircle,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShoppingBag,
  User,
  Copy,
  Clock,
  Check,
  X,
  Ban,
  RefreshCw,
  Lock,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import {
  PagTesouroPaymentModal,
  CheckoutGuideItem,
} from '../../components/payment/PagTesouroPaymentModal';
import { formatCpf } from '../../utils/cpf';

interface TicketReadyDTO {
  itemId: string;
  orderId: string;
  productTitle: string;
  quantity: number;
  buyerName: string;
  buyerCpf: string;
  paidAt: string;
}

interface OrderItemDTO {
  id: string;
  productId: string;
  productTitle: string;
  quantity: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'EXCHANGED' | 'CANCELLED' | string;
  paidAt?: string;
  exchangedAt?: string;
  statusDescription?: string;
  productColor?: string;
  categoryDisplayName?: string;
}

interface OrderDTO {
  id: string;
  totalAmount: number;
  status: 'CREATED' | 'PENDING_PAYMENT' | 'PARTIALLY_PAID' | 'COMPLETED' | 'CANCELLED' | string;
  createdAt: string;
  items: OrderItemDTO[];
  buyerName?: string;
  buyerCpf?: string;
  statusDescription?: string;
  canPay?: boolean;
  canCancel?: boolean;
}

interface PaymentInvoiceDTO {
  id: string;
  referenceNumber?: number;
  pagtesouroPaymentId?: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  contributorName: string;
  contributorCpfCnpj: string;
  nextUrl?: string;
  createdAt: string;
  paidAt?: string;
  orderId?: string;
  statusDescription?: string;
  paymentMethodDescription?: string;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export function UserDashboard() {
  const { user, logout, isAuthenticated, refreshProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Estados vindos 100% do Backend
  const [readyTickets, setReadyTickets] = useState<TicketReadyDTO[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [invoices, setInvoices] = useState<PaymentInvoiceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Abas: 'TICKETS' (Carteira pronta) | 'ORDERS' (Meus Pedidos) | 'INVOICES' (Histórico STN) | 'EXCHANGED' (Consumidos)
  const [activeTab, setActiveTab] = useState<'TICKETS' | 'ORDERS' | 'INVOICES' | 'EXCHANGED'>(
    'TICKETS'
  );

  // Estados do Modal Multi-Guia do PagTesouro
  const [checkoutGuides, setCheckoutGuides] = useState<CheckoutGuideItem[]>([]);
  const [activeCheckoutOrderId, setActiveCheckoutOrderId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Estados de Modais de Detalhes e QR Code
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<TicketReadyDTO | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderDTO | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Estados do Modal de Perfil & Direitos LGPD (PATCH /auth/me e PATCH /auth/me/password)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'INFO' | 'PASSWORD'>('INFO');
  const [profileName, setProfileName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      // Garante que temos o CPF autenticado vindo de GET /auth/me
      const currentProfile = user?.cpf ? user : await refreshProfile();
      const userCpf = currentProfile?.cpf;

      const [ordersData, invoicesPage, ticketsData] = await Promise.all([
        api<OrderDTO[]>('/orders').catch(() => []),
        api<PageResponse<PaymentInvoiceDTO>>('/payments').catch(() => ({
          content: [],
          page: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        })),
        userCpf
          ? api<TicketReadyDTO[]>(`/orders/tickets?cpf=${userCpf}`).catch(() => [])
          : Promise.resolve([]),
      ]);

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setInvoices(Array.isArray(invoicesPage?.content) ? invoicesPage.content : []);
      setReadyTickets(Array.isArray(ticketsData) ? ticketsData : []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dados da sua carteira.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, refreshProfile, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Abre o modal de Perfil LGPD preenchendo com os dados de GET /auth/me
  const handleOpenProfileModal = async () => {
    const latest = await refreshProfile();
    const target = latest || user;
    if (target) {
      setProfileName(target.name || '');
      setProfileLastName(target.lastName || '');
      setProfileEmail(target.email || '');
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setProfileTab('INFO');
    setIsProfileModalOpen(true);
  };

  // Salva retificação de dados cadastrais (PATCH /auth/me - LGPD Art. 18)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileLastName.trim() || !profileEmail.trim()) {
      toast.error('Preencha nome, sobrenome e e-mail.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileName.trim(),
          lastName: profileLastName.trim(),
          email: profileEmail.trim(),
        }),
      });
      await refreshProfile();
      toast.success('Dados cadastrais atualizados com sucesso!');
      setIsProfileModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Falha ao atualizar perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Altera a senha do titular (PATCH /auth/me/password)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('A confirmação da nova senha não confere.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await api('/auth/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      toast.success('Senha alterada com sucesso!');
      setIsProfileModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Senha atual incorreta ou falha ao alterar senha.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Emite nova guia de pagamento para um pedido pendente (POST /payments/checkout/{orderId})
  // O backend cancela sessões anteriores (CANCELLED) e gera uma nova proximaUrl única na STN!
  const handleIssueNewCheckoutForOrder = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      const response = await api<CheckoutGuideItem | CheckoutGuideItem[]>(
        `/payments/checkout/${orderId}`,
        {
          method: 'POST',
          body: JSON.stringify({ isMobile: false }),
        }
      );
      const guides = Array.isArray(response) ? response : [response];
      setActiveCheckoutOrderId(orderId);
      setCheckoutGuides(guides);
      setIsPaymentModalOpen(true);
      toast.success('Nova sessão única gerada junto ao PagTesouro (STN)!');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível emitir nova guia para este pedido.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Cancela um pedido pendente (PATCH /orders/{id}/cancel)
  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      await api(`/orders/${orderId}/cancel`, {
        method: 'PATCH',
      });
      toast.success('Pedido cancelado com sucesso!');
      await fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível cancelar este pedido.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Itens já trocados/consumidos no refeitório (extraídos dos pedidos do servidor)
  const exchangedItems = orders.flatMap((o) =>
    (o.items || [])
      .filter((i) => i.status === 'EXCHANGED')
      .map((i) => ({ ...i, orderId: o.id, orderCreatedAt: o.createdAt }))
  );

  const pendingOrdersCount = orders.filter((o) => o.canPay).length;

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* CABEÇALHO DO PAINEL DO ALUNO */}
        <div className="neo-card p-6 bg-white border-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-neo-yellow border-3 border-neo-dark shadow-neo-xs flex items-center justify-center font-heading font-bold text-2xl text-neo-dark">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-heading font-bold text-neo-dark">
                  Olá, {user?.name} {user?.lastName}
                </h1>
                <span className="neo-badge bg-emerald-100 text-emerald-950 border-neo-dark">
                  <ShieldCheck className="w-3.5 h-3.5 inline mr-1" /> Titular Verificado
                </span>
              </div>
              <p className="text-xs font-mono text-slate-600 mt-1">
                CPF: {user?.cpf ? formatCpf(user.cpf) : 'Protegido'} • E-mail:{' '}
                {user?.email || 'Autenticado via Cookie HttpOnly'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="neo-btn bg-white hover:bg-slate-100 py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              onClick={handleOpenProfileModal}
              className="neo-btn bg-neo-yellow text-neo-dark py-2 px-3.5 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserCircle className="w-4 h-4" />
              <span>Meu Perfil & LGPD</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/store')}
              className="neo-btn-primary py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Comprar Tíquetes</span>
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO RÁPIDO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="neo-card p-4 bg-emerald-50 border-3 border-neo-dark flex items-center justify-between">
            <div>
              <span className="text-[11px] font-heading font-bold uppercase text-emerald-900 block">
                Tíquetes Prontos p/ Uso
              </span>
              <span className="text-3xl font-mono font-bold text-neo-dark">
                {readyTickets.reduce((acc, t) => acc + (t.quantity || 1), 0)}
              </span>
            </div>
            <div className="p-3 bg-emerald-400 border-2 border-neo-dark">
              <QrCode className="w-6 h-6 text-neo-dark" />
            </div>
          </div>

          <div className="neo-card p-4 bg-amber-50 border-3 border-neo-dark flex items-center justify-between">
            <div>
              <span className="text-[11px] font-heading font-bold uppercase text-amber-900 block">
                Pedidos Aguardando Pagamento
              </span>
              <span className="text-3xl font-mono font-bold text-neo-dark">
                {pendingOrdersCount}
              </span>
            </div>
            <div className="p-3 bg-neo-yellow border-2 border-neo-dark">
              <Clock className="w-6 h-6 text-neo-dark" />
            </div>
          </div>

          <div className="neo-card p-4 bg-white border-3 border-neo-dark flex items-center justify-between">
            <div>
              <span className="text-[11px] font-heading font-bold uppercase text-slate-600 block">
                Refeições Já Retiradas
              </span>
              <span className="text-3xl font-mono font-bold text-neo-dark">
                {exchangedItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
              </span>
            </div>
            <div className="p-3 bg-slate-200 border-2 border-neo-dark">
              <CheckCircle2 className="w-6 h-6 text-neo-dark" />
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex flex-wrap gap-2 border-b-3 border-neo-dark pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('TICKETS')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase border-2 border-neo-dark transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'TICKETS'
                ? 'bg-neo-brand text-white shadow-neo-xs'
                : 'bg-white text-neo-dark hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Tíquetes Disponíveis ({readyTickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ORDERS')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase border-2 border-neo-dark transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ORDERS'
                ? 'bg-neo-yellow text-neo-dark shadow-neo-xs'
                : 'bg-white text-neo-dark hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Meus Pedidos ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase border-2 border-neo-dark transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'INVOICES'
                ? 'bg-neo-accent text-white shadow-neo-xs'
                : 'bg-white text-neo-dark hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Histórico de Faturas STN ({invoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXCHANGED')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase border-2 border-neo-dark transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'EXCHANGED'
                ? 'bg-neo-dark text-white shadow-neo-xs'
                : 'bg-white text-neo-dark hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Já Utilizados ({exchangedItems.length})</span>
          </button>
        </div>

        {/* =====================================================================
            ABA 1: CARTEIRA DE TÍQUETES DISPONÍVEIS (GET /orders/tickets?cpf=)
           ===================================================================== */}
        {activeTab === 'TICKETS' && (
          <div className="neo-card p-6 bg-white border-3">
            <h2 className="font-heading font-bold text-base uppercase text-neo-dark mb-4 pb-2 border-b-2 border-neo-dark">
              🎫 Seus Tíquetes Quitados e Prontos para Retirada no Guichê
            </h2>

            {readyTickets.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-300 space-y-3">
                <QrCode className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Nenhum tíquete disponível no momento
                </p>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Se você possui um pedido aguardando pagamento, acesse a aba{' '}
                  <strong>Meus Pedidos</strong> para emitir sua guia oficial do PagTesouro.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyTickets.map((ticket) => (
                  <div
                    key={ticket.itemId}
                    className="neo-card p-4 bg-emerald-50 border-3 border-neo-dark flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 bg-emerald-400 border border-neo-dark font-mono font-bold text-[10px] uppercase">
                          LIBERADO ({ticket.quantity}x)
                        </span>
                        <span className="font-mono text-[10px] text-slate-600">
                          ID #{ticket.itemId.slice(0, 8)}
                        </span>
                      </div>
                      <h3 className="font-heading font-bold text-base text-neo-dark">
                        {ticket.productTitle}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-600">
                        Quitado em:{' '}
                        {ticket.paidAt
                          ? new Date(ticket.paidAt).toLocaleString('pt-BR')
                          : 'Confirmado pela STN'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTicketForQr(ticket)}
                      className="w-full neo-btn-primary py-2.5 text-xs font-heading font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Exibir Código p/ Guichê</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            ABA 2: MEUS PEDIDOS (ORIENTADO POR order.canPay e order.canCancel)
           ===================================================================== */}
        {activeTab === 'ORDERS' && (
          <div className="neo-card p-6 bg-white border-3 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-neo-dark">
              <h2 className="font-heading font-bold text-base uppercase text-neo-dark">
                📦 Histórico de Pedidos e Emissão de Guias
              </h2>
              <span className="text-[11px] font-mono text-slate-600">
                Ao clicar em <strong>Emitir Nova Guia / Pagar</strong>, sessões anteriores são
                canceladas e uma nova URL exclusiva é gerada na STN.
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-300">
                <p className="font-heading font-bold text-sm uppercase text-slate-500">
                  Você ainda não realizou nenhum pedido.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border-3 border-neo-dark bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-neo-xs"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-neo-dark text-white font-mono font-bold text-[10px]">
                          PEDIDO #{order.id.slice(0, 8)}
                        </span>
                        <span
                          className={`px-2 py-0.5 border border-neo-dark font-mono font-bold text-[10px] uppercase ${
                            order.status === 'COMPLETED'
                              ? 'bg-emerald-300 text-neo-dark'
                              : order.status === 'CANCELLED'
                                ? 'bg-rose-200 text-rose-950'
                                : 'bg-neo-yellow text-neo-dark'
                          }`}
                        >
                          {order.statusDescription || order.status}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {order.items?.map((item) => (
                          <span
                            key={item.id}
                            className="px-2.5 py-1 bg-white border-2 border-neo-dark text-xs font-mono flex items-center gap-1.5"
                          >
                            {item.productColor && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-neo-dark inline-block"
                                style={{ backgroundColor: item.productColor }}
                              />
                            )}
                            <strong>{item.quantity}x</strong> {item.productTitle}
                            <span className="text-[10px] text-slate-500">
                              ({item.statusDescription || item.status})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Botões controlados 100% pelas flags vindas do Backend (order.canPay & order.canCancel) */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-dashed border-slate-300">
                      <div className="mr-2">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          Total do Pedido
                        </span>
                        <span className="font-mono font-bold text-lg text-neo-dark">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(order.totalAmount)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderDetails(order)}
                        className="neo-btn bg-white hover:bg-slate-100 py-2 px-3 text-xs cursor-pointer"
                      >
                        <FileText className="w-4 h-4 inline mr-1" /> Detalhes
                      </button>

                      {order.canPay && (
                        <button
                          type="button"
                          onClick={() => handleIssueNewCheckoutForOrder(order.id)}
                          disabled={processingOrderId === order.id}
                          className="neo-btn-primary py-2.5 px-4 text-xs font-heading font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>
                            {processingOrderId === order.id
                              ? 'Gerando Sessão STN...'
                              : 'Emitir Nova Guia / Pagar'}
                          </span>
                        </button>
                      )}

                      {order.canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrderId === order.id}
                          className="neo-btn bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-950 py-2.5 px-3 text-xs font-heading font-bold uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>
                            {cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            ABA 3: HISTÓRICO DE FATURAS PAGTESOURO (SEM REABRIR nextUrl ANTIGA)
           ===================================================================== */}
        {activeTab === 'INVOICES' && (
          <div className="neo-card p-6 bg-white border-3 space-y-4">
            <div className="p-3.5 bg-neo-yellow border-2 border-neo-dark text-xs text-neo-dark flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Política de Sessão Única do PagTesouro (STN):</strong> As faturas listadas
                abaixo são registros de auditoria das sessões criadas. Caso uma sessão não tenha
                sido concluída, clique em <strong>Emitir Nova Guia pelo Pedido</strong> para gerar
                uma nova URL válida sem erro de sessão expirada.
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-300">
                <p className="font-heading font-bold text-sm uppercase text-slate-500">
                  Nenhuma fatura gerada até o momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => {
                  const isCompleted =
                    inv.status === 'COMPLETED' || inv.status === 'CONCLUIDO';
                  const isCancelled =
                    inv.status === 'CANCELLED' || inv.status === 'CANCELADO';

                  return (
                    <div
                      key={inv.id}
                      className="p-4 border-2 border-neo-dark bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-neo-dark">
                            Ref. #{inv.referenceNumber || inv.id.slice(0, 8)}
                          </span>
                          <span
                            className={`px-2 py-0.5 border border-neo-dark font-mono font-bold text-[10px] uppercase ${
                              isCompleted
                                ? 'bg-emerald-300 text-neo-dark'
                                : isCancelled
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-amber-200 text-neo-dark'
                            }`}
                          >
                            {inv.statusDescription || inv.status}
                          </span>
                          <span className="text-[11px] font-mono text-slate-600">
                            {inv.paymentMethodDescription || inv.paymentMethod || 'PagTesouro STN'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500">
                          ID STN: {inv.pagtesouroPaymentId || 'N/A'} • Emitida em:{' '}
                          {new Date(inv.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-base text-neo-dark">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(inv.amount)}
                        </span>

                        {!isCompleted && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => {
                              if (inv.orderId) {
                                handleIssueNewCheckoutForOrder(inv.orderId);
                              } else {
                                setActiveTab('ORDERS');
                              }
                            }}
                            className="neo-btn bg-neo-yellow text-neo-dark py-2 px-3 text-[11px] font-heading font-bold uppercase cursor-pointer"
                          >
                            Emitir Nova Guia pelo Pedido
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            ABA 4: HISTÓRICO DE TÍQUETES JÁ UTILIZADOS (EXCHANGED)
           ===================================================================== */}
        {activeTab === 'EXCHANGED' && (
          <div className="neo-card p-6 bg-white border-3">
            <h2 className="font-heading font-bold text-base uppercase text-neo-dark mb-4 pb-2 border-b-2 border-neo-dark">
              🍽️ Histórico de Tíquetes Já Retirados no Refeitório
            </h2>
            {exchangedItems.length === 0 ? (
              <p className="text-xs font-mono text-slate-500 py-8 text-center">
                Nenhum tíquete foi baixado no guichê ainda.
              </p>
            ) : (
              <div className="space-y-2.5">
                {exchangedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 border-2 border-neo-dark bg-slate-50 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-heading font-bold text-neo-dark">
                        {item.quantity}x {item.productTitle}
                      </span>
                      <p className="font-mono text-[11px] text-slate-500">
                        Baixado no Guichê em:{' '}
                        {item.exchangedAt
                          ? new Date(item.exchangedAt).toLocaleString('pt-BR')
                          : 'Confirmado'}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-slate-200 border border-neo-dark font-mono font-bold text-[10px] uppercase">
                      {item.statusDescription || 'Retirado no Guichê'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL MULTI-GUIA DO PAGTESOURO */}
      <PagTesouroPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          fetchDashboardData();
        }}
        payments={checkoutGuides}
        orderId={activeCheckoutOrderId}
        contributorName={`${user?.name || ''} ${user?.lastName || ''}`.trim()}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />

      {/* MODAL DE CÓDIGO DO TÍQUETE PARA O GUICHÊ */}
      {selectedTicketForQr && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md neo-card bg-white border-3 border-neo-dark p-6 space-y-4 text-center">
            <div className="flex justify-between items-center border-b-2 border-neo-dark pb-3">
              <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                Comprovante de Retirada no Guichê
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTicketForQr(null)}
                className="p-1 border-2 border-neo-dark bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 border-2 border-neo-dark space-y-2">
              <span className="px-2 py-0.5 bg-emerald-400 border border-neo-dark font-mono font-bold text-[10px]">
                VÁLIDO PARA {selectedTicketForQr.quantity} UNIDADE(S)
              </span>
              <h4 className="font-heading font-bold text-base text-neo-dark">
                {selectedTicketForQr.productTitle}
              </h4>
              <p className="text-xs font-mono text-slate-600">
                Titular: {selectedTicketForQr.buyerName} ({formatCpf(selectedTicketForQr.buyerCpf)})
              </p>
            </div>

            <div className="p-3 bg-slate-100 border-2 border-neo-dark font-mono text-xs break-all flex items-center justify-between gap-2">
              <span>{selectedTicketForQr.itemId}</span>
              <button
                type="button"
                onClick={() => handleCopyText(selectedTicketForQr.itemId)}
                className="p-1.5 bg-white border border-neo-dark cursor-pointer flex-shrink-0"
                title="Copiar ID do Item"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-sans">
              Apresente seu CPF ou este código identificador ao operador no Guichê do Restaurante
              Universitário para retirar sua refeição.
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO PEDIDO */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg neo-card bg-white border-3 border-neo-dark p-6 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-neo-dark pb-3">
              <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                Detalhes do Pedido #{selectedOrderDetails.id.slice(0, 8)}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1 border-2 border-neo-dark bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Status Consolidado:</span>
                <span className="font-bold">
                  {selectedOrderDetails.statusDescription || selectedOrderDetails.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data de Criação:</span>
                <span>{new Date(selectedOrderDetails.createdAt).toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <div className="space-y-2 border-t-2 border-neo-dark pt-3">
              <span className="text-[11px] font-heading font-bold uppercase text-slate-700 block">
                Itens do Pedido:
              </span>
              {selectedOrderDetails.items?.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-50 border border-neo-dark flex justify-between items-center text-xs font-mono"
                >
                  <div>
                    <strong>{item.quantity}x</strong> {item.productTitle}
                    <span className="block text-[10px] text-slate-500">
                      Status: {item.statusDescription || item.status}
                    </span>
                  </div>
                  <span className="font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(item.totalAmount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="neo-btn bg-white py-2 px-4 text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PERFIL & DIREITOS LGPD (PATCH /auth/me & PATCH /auth/me/password) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg neo-card bg-white border-3 border-neo-dark overflow-hidden">
            <div className="p-4 bg-neo-yellow border-b-3 border-neo-dark flex justify-between items-center">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-neo-dark" />
                <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Meu Perfil & Direitos do Titular (LGPD Art. 18)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 border-2 border-neo-dark bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b-2 border-neo-dark bg-slate-100">
              <button
                type="button"
                onClick={() => setProfileTab('INFO')}
                className={`flex-1 py-2.5 text-xs font-heading font-bold uppercase cursor-pointer ${
                  profileTab === 'INFO' ? 'bg-white text-neo-dark border-b-2 border-neo-brand' : 'text-slate-600'
                }`}
              >
                Retificar Dados Cadastrais
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('PASSWORD')}
                className={`flex-1 py-2.5 text-xs font-heading font-bold uppercase cursor-pointer ${
                  profileTab === 'PASSWORD' ? 'bg-white text-neo-dark border-b-2 border-neo-brand' : 'text-slate-600'
                }`}
              >
                Alterar Senha de Acesso
              </button>
            </div>

            <div className="p-6">
              {profileTab === 'INFO' ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                        Nome *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="neo-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                        Sobrenome *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileLastName}
                        onChange={(e) => setProfileLastName(e.target.value)}
                        className="neo-input text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                      E-mail Institucional *
                    </label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="neo-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase text-slate-500 mb-1">
                      CPF Fiscal (Imutável p/ Auditoria STN)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.cpf ? formatCpf(user.cpf) : ''}
                      className="neo-input font-mono text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="neo-btn bg-white py-2 px-4 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="neo-btn-primary py-2 px-5 text-xs font-heading font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                      Senha Atual *
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="neo-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                      Nova Senha (mín. 6 caracteres) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="neo-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                      Confirmar Nova Senha *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="neo-input text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="neo-btn bg-white py-2 px-4 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="neo-btn-primary py-2 px-5 text-xs font-heading font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isSavingPassword ? 'Alterando...' : 'Atualizar Senha'}</span>
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
