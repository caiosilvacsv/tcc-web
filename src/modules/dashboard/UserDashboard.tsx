import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Package, History, LogOut, ArrowRight, UserCircle, QrCode, 
  CreditCard, CheckCircle2, AlertTriangle, ExternalLink, ShieldAlert, 
  FileText, ShoppingBag, HelpCircle, User
} from 'lucide-react';

interface PurchasedProduct {
  id: string;
  itemId?: string; // ID real do item no banco do backend para a troca no guichê
  orderId?: string; // ID do pedido original correspondente
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
  const navigate = useNavigate();

  // Estados dos dados da API
  const [tickets, setTickets] = useState<PurchasedProduct[]>([]);
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Modais Auxiliares
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<PurchasedProduct | null>(null);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<PaymentInvoice | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Estados do Modal de Detalhes do Pedido (Cupom Fiscal)
  const [selectedOrderIdForDetails, setSelectedOrderIdForDetails] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderResponseDTO | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Proteção de rota no lado do cliente
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Carrega tíquetes e faturas do estudante vindos do backend Java
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Busca os pedidos reais do usuário logado
      const orders = await api<OrderResponseDTO[]>('/api/orders/my-tickets');
      
      // Mapeia e achata a estrutura de pedidos e itens individuais
      const formattedTickets: PurchasedProduct[] = [];
      
      if (Array.isArray(orders)) {
        orders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              // Se a quantidade for maior que 1, criamos múltiplos tíquetes individuais na carteira
              for (let i = 0; i < item.quantity; i++) {
                formattedTickets.push({
                  id: `${item.id}-${i}`, // ID exclusivo para a chave do React
                  itemId: item.id, // ID real do item de pedido no banco do backend
                  orderId: order.id, // ID do pedido original correspondente
                  productName: item.productTitle,
                  paidAt: order.createdAt, // Data em que o pedido foi registrado
                  status: item.status
                });
              }
            });
          }
        });
      }
      
      setTickets(formattedTickets);

      // 2. Busca o histórico de faturas/pagamentos na rota /api/payments (com paginação do Spring Data)
      const invoicesResponse = await api<InvoicesPageResponse>('/api/payments');
      setInvoices(invoicesResponse.content || []);
    } catch (err: any) {
      console.error("Falha ao sincronizar dados reais com o backend:", err);
      setError(err.message || 'Falha ao sincronizar dados com o servidor acadêmico local. Verifique se o backend está ativo.');
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
      const data = await api<OrderResponseDTO>(`/api/orders/${orderId}`);
      setOrderDetails(data);
    } catch (err: any) {
      console.error("Falha ao buscar detalhes do pedido:", err);
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

  if (!isAuthenticated) return null;

  // Filtragem dos Tíquetes por Status
  const availableTickets = tickets.filter(t => t.status === 'PAID');
  const pendingTickets = tickets.filter(t => t.status === 'PENDING');
  const exchangedTickets = tickets.filter(t => t.status === 'EXCHANGED');

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in space-y-8">
      
      {/* Barra de Navegação Superior */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-3 border-neo-dark pb-4 bg-white p-5 neo-card border-3 gap-4">
        <div className="flex items-center gap-3">
          <UserCircle className="w-10 h-10 text-neo-brand" />
          <div>
            <h2 className="text-xl font-bold leading-tight">Área do Estudante IFNMG</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono bg-neo-bg border border-neo-dark px-1.5 py-0.2 font-bold uppercase">
                {user?.role || 'ESTUDANTE'}
              </span>
              <span className="text-xs font-mono text-gray-500">{user?.email}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={logout}
          className="neo-btn bg-red-100 text-red-900 border-red-900 hover:bg-red-200 text-xs py-2 px-4 flex items-center gap-1.5 shadow-none self-end sm:self-auto"
        >
          <LogOut className="w-4 h-4" /> Sair da Conta
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border-2 border-red-950 text-red-950 font-bold text-xs flex items-center gap-2 neo-card">
          <ShieldAlert className="w-5 h-5 text-red-950 flex-shrink-0 animate-pulse" />
          <span>{error}</span>
        </div>
      )}

      {/* SEÇÃO SUPERIOR: TÍQUETES DISPONÍVEIS PARA TROCA (status === 'PAID') */}
      <div className="neo-card p-6 bg-white border-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b-2 border-neo-dark pb-3">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="w-7 h-7 text-neo-brand animate-pulse" /> 
              Disponíveis para Troca e Consumo
            </h3>
            <p className="text-xs text-gray-600 mt-1 font-mono">
              Estes produtos foram pagos e estão liberados. Clique no botão de QR Code para realizar o resgate rápido no guichê do campus Salinas.
            </p>
          </div>
          <span className="px-3 py-1.5 border-2 border-neo-dark font-mono font-bold text-xs uppercase bg-neo-yellow">
            {availableTickets.length} Tíquetes Ativos
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center font-bold text-gray-500">
            Sincronizando carteira acadêmica com o banco de dados...
          </div>
        ) : availableTickets.length === 0 ? (
          <div className="p-8 text-center bg-neo-bg border-3 border-dashed border-gray-400 max-w-xl mx-auto my-2">
            <span className="text-3xl block mb-2 select-none">🎫</span>
            <h4 className="text-base font-bold text-neo-dark">Nenhum Tíquete Ativo na Carteira</h4>
            <p className="text-xs text-gray-600 font-mono mt-1 leading-relaxed">
              Você não possui créditos para refeitório nem multas quitadas em aberto. Use os atalhos rápidos ou acesse a loja para adquirir novos tíquetes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableTickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className="neo-card p-4 border-2 border-neo-dark bg-emerald-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:translate-y-[-2px] transition-transform"
              >
                <div>
                  <span className="px-2 py-0.5 border-2 border-emerald-950 text-[9px] font-bold uppercase bg-emerald-200 text-emerald-950 rounded-none">
                    Liberado para Uso
                  </span>
                  <h4 className="font-bold text-base mt-2 leading-tight">{ticket.productName}</h4>
                  <p className="text-[10px] font-mono text-gray-500 mt-1">
                    Compensado em: {new Date(ticket.paidAt).toLocaleDateString('pt-BR')} às {new Date(ticket.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedTicketForQr(ticket)}
                    className="neo-btn bg-white hover:bg-neo-bg border-neo-dark text-xs py-2 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center font-bold shadow-none"
                  >
                    <QrCode className="w-4 h-4 text-neo-dark" /> Exibir Código
                  </button>
                  {ticket.orderId && (
                    <button
                      onClick={() => setSelectedOrderIdForDetails(ticket.orderId!)}
                      className="neo-btn bg-neo-bg hover:bg-gray-200 border-neo-dark text-xs py-2 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center font-bold shadow-none"
                      title="Ver detalhes da compra"
                    >
                      <FileText className="w-4 h-4 text-neo-dark" /> Detalhes
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO CENTRAL: GRID DE ITENS PENDENTES (PENDING) E FATURAS / COBRANÇAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Coluna Esquerda: Itens Aguardando Pagamento (status === 'PENDING') */}
        <div className="neo-card p-6 bg-white border-3 space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 border-b-2 border-neo-dark pb-2">
            <AlertTriangle className="w-5 h-5 text-neo-yellow" /> Aguardando Pagamento
          </h3>
          
          {isLoading ? (
            <div className="p-8 text-center text-xs font-mono text-gray-500">Buscando pendências...</div>
          ) : pendingTickets.length === 0 ? (
            <div className="p-6 bg-neo-bg border-2 border-dashed border-gray-300 text-center text-xs text-gray-500 font-mono">
              Nenhuma taxa ou tíquete pendente de pagamento no momento.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="p-4 border-2 border-neo-dark bg-yellow-50/50 flex flex-col justify-between gap-3"
                >
                  <div>
                    <span className="px-2 py-0.5 border border-neo-dark text-[9px] font-bold uppercase bg-neo-yellow text-neo-dark">
                      Aguardando Compensação
                    </span>
                    <h4 className="font-bold text-sm mt-2">{ticket.productName}</h4>
                    <p className="text-[9px] font-mono text-gray-500 mt-1">
                      Registrado em: {new Date(ticket.paidAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-white border border-neo-dark text-[10px] text-gray-600 font-mono">
                    <ShieldAlert className="w-4 h-4 text-neo-accent flex-shrink-0" />
                    <span>A GRU/Pix foi gerada. Pague a cobrança na seção ao lado para liberação instantânea.</span>
                  </div>
                  
                  {ticket.orderId && (
                    <button
                      onClick={() => setSelectedOrderIdForDetails(ticket.orderId!)}
                      className="neo-btn bg-white hover:bg-gray-100 border-neo-dark text-[10px] py-1.5 px-3 flex items-center justify-center gap-1.5 font-bold shadow-none w-full"
                    >
                      <FileText className="w-3.5 h-3.5" /> Ver Detalhes da Compra
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita: Faturas e Cobranças (Histórico Geral da rota /api/payments) */}
        <div className="neo-card p-6 bg-white border-3 space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 border-b-2 border-neo-dark pb-2">
            <CreditCard className="w-5 h-5 text-neo-accent" /> Faturas e Cobranças (PagTesouro)
          </h3>

          {isLoading ? (
            <div className="p-8 text-center text-xs font-mono text-gray-500">Carregando faturas...</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 bg-neo-bg border-2 border-dashed border-gray-300 text-center text-xs text-gray-500 font-mono">
              Nenhuma fatura registrada no sistema.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {invoices.map((invoice) => {
                const isPending = ['CRIADO', 'INICIADO', 'SUBMETIDO', 'CREATED', 'STARTED', 'SUBMITTED'].includes(invoice.status);
                const isCompleted = ['CONCLUIDO', 'COMPLETED'].includes(invoice.status);
                
                return (
                  <div 
                    key={invoice.id} 
                    className="p-3 border-2 border-neo-dark bg-neo-bg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.2 border text-[8px] font-bold font-mono uppercase ${
                          isCompleted 
                            ? 'bg-emerald-100 border-emerald-900 text-emerald-900' 
                            : isPending 
                            ? 'bg-amber-100 border-amber-900 text-amber-900 animate-pulse'
                            : 'bg-red-100 border-red-900 text-red-900'
                        }`}>
                          {invoice.status}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-500">
                          ID: {invoice.id.slice(0, 8)}...
                        </span>
                      </div>
                      <h4 className="font-bold text-xs mt-1.5">
                        Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}
                      </h4>
                      <p className="text-[9px] font-mono text-gray-500">
                        Gerada em: {new Date(invoice.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {isPending && invoice.nextUrl ? (
                      <a 
                        href={invoice.nextUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="neo-btn bg-neo-yellow border-neo-dark text-[10px] py-1 px-2.5 font-bold flex items-center gap-1 w-full sm:w-auto justify-center no-underline text-neo-dark"
                      >
                        Pagar GRU/Pix <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : isCompleted ? (
                      <button
                        onClick={() => setSelectedInvoiceForReceipt(invoice)}
                        className="neo-btn bg-white hover:bg-gray-100 border-neo-dark text-[10px] py-1 px-2.5 font-bold flex items-center gap-1 w-full sm:w-auto justify-center shadow-none text-neo-dark"
                      >
                        Ver Recibo <FileText className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-gray-400">Expirada</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* SEÇÃO CENTRAL INFERIOR: HISTÓRICO DE RESGATES E ENTREGAS (status === 'EXCHANGED') */}
      <div className="neo-card p-6 bg-white border-3">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-2 border-neo-dark pb-2">
          <History className="w-6 h-6 text-neo-accent" /> Histórico de Resgates e Entregas (Consumidos)
        </h3>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-gray-500">Buscando histórico de uso...</div>
        ) : exchangedTickets.length === 0 ? (
          <div className="p-8 bg-neo-bg border-2 border-dashed border-gray-300 text-center text-xs font-mono text-gray-400">
            Você não possui nenhum tíquete consumido ou retirado no guichê até o momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exchangedTickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className="p-3 border border-neo-dark bg-gray-50/50 flex justify-between items-center opacity-75"
              >
                <div>
                  <span className="px-2 py-0.5 border border-gray-400 text-[9px] font-bold uppercase bg-gray-100 text-gray-500">
                    Consumido no Guichê
                  </span>
                  <h4 className="font-bold text-sm text-gray-600 mt-2 leading-tight">{ticket.productName}</h4>
                  <p className="text-[9px] font-mono text-gray-400 mt-1">
                    Entregue em: {new Date(ticket.paidAt).toLocaleDateString('pt-BR')} às {new Date(ticket.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right flex flex-col sm:flex-row items-center gap-2">
                  {ticket.orderId && (
                    <button
                      onClick={() => setSelectedOrderIdForDetails(ticket.orderId!)}
                      className="neo-btn bg-white hover:bg-gray-100 border-neo-dark text-[9px] py-1 px-2 font-bold shadow-none"
                    >
                      Detalhes
                    </button>
                  )}
                  <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wide border border-gray-300 px-2 py-0.5 block">
                    Entregue
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO DE AÇÕES RÁPIDAS (RODAPÉ DO DASHBOARD) */}
      <div className="neo-card p-6 bg-neo-yellow border-3">
        <h4 className="text-sm font-bold uppercase tracking-wider text-neo-dark mb-4 border-b-2 border-neo-dark pb-2">
          ⚡ Ações e Serviços Rápidos Acadêmicos
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <button 
            onClick={() => navigate('/store')}
            className="neo-btn bg-white hover:bg-neo-bg text-left p-4 flex flex-col justify-between border-2 border-neo-dark shadow-neo-sm hover:translate-y-[-2px] transition-all group"
          >
            <ShoppingBag className="w-6 h-6 text-neo-brand group-hover:scale-110 transition-transform mb-3" />
            <div>
              <span className="block font-bold text-xs uppercase text-neo-dark">Comprar Tíquetes</span>
              <span className="block text-[9px] font-mono text-gray-600 mt-1">Adquirir créditos ou pagar multas</span>
            </div>
          </button>

          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="neo-btn bg-white hover:bg-neo-bg text-left p-4 flex flex-col justify-between border-2 border-neo-dark shadow-neo-sm hover:translate-y-[-2px] transition-all group"
          >
            <User className="w-6 h-6 text-neo-brand group-hover:scale-110 transition-transform mb-3" />
            <div>
              <span className="block font-bold text-xs uppercase text-neo-dark">Meu Perfil</span>
              <span className="block text-[9px] font-mono text-gray-600 mt-1">Ver dados de registro e CPF</span>
            </div>
          </button>

          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="neo-btn bg-white hover:bg-neo-bg text-left p-4 flex flex-col justify-between border-2 border-neo-dark shadow-neo-sm hover:translate-y-[-2px] transition-all group"
          >
            <HelpCircle className="w-6 h-6 text-neo-brand group-hover:scale-110 transition-transform mb-3" />
            <div>
              <span className="block font-bold text-xs uppercase text-neo-dark">Suporte e Ajuda</span>
              <span className="block text-[9px] font-mono text-gray-600 mt-1">Instruções de resgate e regras</span>
            </div>
          </button>

          <button 
            onClick={logout}
            className="neo-btn bg-red-100 hover:bg-red-200 text-left p-4 flex flex-col justify-between border-2 border-red-950 shadow-neo-sm hover:translate-y-[-2px] transition-all group"
          >
            <LogOut className="w-6 h-6 text-red-900 group-hover:scale-110 transition-transform mb-3" />
            <div>
              <span className="block font-bold text-xs uppercase text-red-900">Sair com Segurança</span>
              <span className="block text-[9px] font-mono text-red-800/80 mt-1">Encerrar sessão de forma limpa</span>
            </div>
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EXIBIÇÃO DE QR CODE DINÂMICO PARA RESGATE (TÍQUETES PAID) */}
      {selectedTicketForQr && (
        <div className="fixed inset-0 bg-neo-dark bg-opacity-65 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm neo-card p-6 bg-white border-3 animate-slide-up shadow-neo-xl">
            
            <div className="flex justify-between items-center border-b-3 border-neo-dark pb-3 mb-4">
              <h3 className="text-base font-bold uppercase tracking-tight flex items-center gap-1.5">
                <QrCode className="w-5 h-5 text-neo-brand" /> Resgate via CPF
              </h3>
              <button 
                onClick={() => setSelectedTicketForQr(null)}
                className="text-gray-500 hover:text-neo-dark font-bold text-base cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="p-3 bg-neo-yellow border-2 border-neo-dark inline-block font-mono text-[9px] font-bold uppercase tracking-wider text-neo-dark">
                Apresente este código no refeitório
              </div>

              {/* QR Code Fake Neo-Brutalista desenhado puramente em SVG/CSS */}
              <div className="bg-neo-bg border-3 border-neo-dark p-6 inline-block mx-auto">
                <svg className="w-40 h-40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  {/* Bordas externas de posicionamento de QR Code */}
                  <rect x="5" y="5" width="25" height="25" fill="none" stroke="#1A1A1A" strokeWidth="6" />
                  <rect x="10" y="10" width="15" height="15" fill="#1A1A1A" />
                  <rect x="70" y="5" width="25" height="25" fill="none" stroke="#1A1A1A" strokeWidth="6" />
                  <rect x="75" y="10" width="15" height="15" fill="#1A1A1A" />
                  <rect x="5" y="70" width="25" height="25" fill="none" stroke="#1A1A1A" strokeWidth="6" />
                  <rect x="10" y="75" width="15" height="15" fill="#1A1A1A" />
                  
                  {/* Linhas e pontos de dados aleatórios e expressivos estilo retro-grid */}
                  <rect x="40" y="5" width="8" height="8" fill="#1A1A1A" />
                  <rect x="52" y="15" width="12" height="6" fill="#1A1A1A" />
                  <rect x="40" y="25" width="20" height="6" fill="#1A1A1A" />
                  <rect x="5" y="40" width="15" height="8" fill="#1A1A1A" />
                  <rect x="25" y="45" width="12" height="12" fill="#1A1A1A" />
                  <rect x="45" y="40" width="8" height="18" fill="#1A1A1A" />
                  <rect x="60" y="35" width="18" height="8" fill="#1A1A1A" />
                  <rect x="85" y="40" width="10" height="12" fill="#1A1A1A" />
                  <rect x="40" y="70" width="12" height="12" fill="#1A1A1A" />
                  <rect x="60" y="65" width="8" height="24" fill="#1A1A1A" />
                  <rect x="75" y="75" width="15" height="8" fill="#1A1A1A" />
                  <rect x="80" y="60" width="8" height="8" fill="#1A1A1A" />
                  <rect x="20" y="20" width="6" height="6" fill="#00b469" />
                  <rect x="74" y="20" width="6" height="6" fill="#00b469" />
                  <rect x="20" y="74" width="6" height="6" fill="#00b469" />
                </svg>
              </div>

              <div>
                <h4 className="font-bold text-sm leading-tight text-neo-dark">{selectedTicketForQr.productName}</h4>
                <p className="text-[9px] font-mono text-gray-500 mt-1">ID Tíquete: {selectedTicketForQr.itemId || selectedTicketForQr.id}</p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-950 text-left">
                <p className="text-[10px] text-emerald-950 font-mono leading-relaxed">
                  💡 **Dica de Resgate**: O operador do guichê também pode realizar a liberação física consultando diretamente o seu CPF no sistema, dispensando a leitura do QR Code se necessário!
                </p>
              </div>
            </div>

            <button 
              onClick={() => setSelectedTicketForQr(null)}
              className="w-full neo-btn bg-gray-100 hover:bg-gray-200 mt-5 font-bold text-xs py-2"
            >
              Fechar Código
            </button>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECIBO DE QUITAÇÃO DE FATURA COMPENSADA (CONCLUIDO) */}
      {selectedInvoiceForReceipt && (
        <div className="fixed inset-0 bg-neo-dark bg-opacity-65 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md neo-card p-6 bg-white border-3 animate-slide-up shadow-neo-xl">
            
            <div className="flex justify-between items-center border-b-3 border-neo-dark pb-3 mb-4">
              <h3 className="text-base font-bold uppercase tracking-tight flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Recibo de Liberação Digital
              </h3>
              <button 
                onClick={() => setSelectedInvoiceForReceipt(null)}
                className="text-gray-500 hover:text-neo-dark font-bold text-base cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs text-gray-800">
              <div className="p-3 bg-emerald-50 border-2 border-emerald-950 text-emerald-950 text-center font-bold text-[10px] uppercase">
                🏛️ Comprovante de Pagamento PagTesouro - IFNMG
              </div>

              <div className="border-b-2 border-dashed border-gray-300 pb-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[9px]">ID Pagamento:</span>
                  <span className="font-bold text-neo-dark">{selectedInvoiceForReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[9px]">Pagador:</span>
                  <span className="font-bold text-neo-dark truncate max-w-xs">{selectedInvoiceForReceipt.contributorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[9px]">CPF/CNPJ:</span>
                  <span className="font-bold text-neo-dark">{selectedInvoiceForReceipt.contributorCpfCnpj}</span>
                </div>
              </div>

              <div className="border-b-2 border-dashed border-gray-300 pb-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[9px]">Meio Utilizado:</span>
                  <span className="font-bold text-neo-dark uppercase">{selectedInvoiceForReceipt.paymentMethod || 'PIX'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[9px]">Agente Fin.:</span>
                  <span className="font-bold text-neo-dark uppercase truncate max-w-xs">{selectedInvoiceForReceipt.pspName || 'BANCO DO BRASIL'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[9px]">Data da Quitação:</span>
                  <span className="font-bold text-neo-dark">
                    {selectedInvoiceForReceipt.paidAt ? new Date(selectedInvoiceForReceipt.paidAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-sm">
                <span className="font-bold uppercase text-xs text-gray-700">Valor Pago:</span>
                <span className="font-bold text-neo-brand font-mono text-base">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedInvoiceForReceipt.amount)}
                </span>
              </div>

              <div className="p-3 bg-neo-bg border border-neo-dark text-[10px] text-gray-600 leading-relaxed font-sans">
                💡 **Efeito Legal**: Este recibo comprova a quitação de débitos perante o Tesouro Nacional (STN) e a liberação de créditos acadêmicos de tíquetes no sistema interno do IFNMG.
              </div>
            </div>

            <button 
              onClick={() => setSelectedInvoiceForReceipt(null)}
              className="w-full neo-btn bg-gray-100 hover:bg-gray-200 mt-5 font-bold text-xs py-2"
            >
              Fechar Recibo
            </button>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PERFIL DO ESTUDANTE ACADÊMICO */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-neo-dark bg-opacity-65 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md neo-card p-6 bg-white border-3 animate-slide-up shadow-neo-xl">
            
            <div className="flex justify-between items-center border-b-3 border-neo-dark pb-3 mb-4">
              <h3 className="text-base font-bold uppercase tracking-tight flex items-center gap-1.5">
                <UserCircle className="w-5 h-5 text-neo-brand" /> Perfil Acadêmico
              </h3>
              <button 
                onClick={() => setIsProfileModalOpen(false)}
                className="text-gray-500 hover:text-neo-dark font-bold text-base cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center p-4 bg-neo-bg border-2 border-neo-dark">
                <div className="w-16 h-16 bg-neo-yellow border-2 border-neo-dark flex items-center justify-center font-bold text-xl uppercase tracking-wider mx-auto mb-2 text-neo-dark shadow-neo-sm">
                  {user?.email ? user.email.slice(0, 2) : 'AC'}
                </div>
                <h4 className="font-bold text-base mt-1 text-neo-dark">Dados de Acesso Acadêmico</h4>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-2 border border-gray-300 flex justify-between">
                  <span className="text-gray-500 font-bold">Identificação (E-mail):</span>
                  <span className="font-bold text-neo-dark text-right truncate max-w-xs">{user?.email}</span>
                </div>
                <div className="p-2 border border-gray-300 flex justify-between">
                  <span className="text-gray-500 font-bold">Perfil do Usuário:</span>
                  <span className="font-bold text-neo-dark uppercase">{user?.role || 'ESTUDANTE'}</span>
                </div>
                <div className="p-2 border border-gray-300 flex justify-between">
                  <span className="text-gray-500 font-bold">Localidade:</span>
                  <span className="font-bold text-neo-dark">Salinas - MG</span>
                </div>
                <div className="p-2 border border-gray-300 flex justify-between bg-neo-bg border-neo-dark">
                  <span className="text-neo-brand font-bold">Autenticação JWT:</span>
                  <span className="font-bold text-emerald-700 uppercase">Ativa / Stateless</span>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-neo-dark text-[10px] text-gray-600 leading-relaxed">
                💡 **Segurança de Acesso**: A sua carteira acadêmica está vinculada às credenciais criptografadas via token JWT contido no navegador. Não compartilhe sua senha.
              </div>
            </div>

            <button 
              onClick={() => setIsProfileModalOpen(false)}
              className="w-full neo-btn bg-gray-100 hover:bg-gray-200 mt-5 font-bold text-xs py-2"
            >
              Fechar Perfil
            </button>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SUPORTE E MANUAL DE AJUDA DO USUÁRIO */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-neo-dark bg-opacity-65 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg neo-card p-6 bg-white border-3 animate-slide-up shadow-neo-xl">
            
            <div className="flex justify-between items-center border-b-3 border-neo-dark pb-3 mb-4">
              <h3 className="text-base font-bold uppercase tracking-tight flex items-center gap-1.5">
                <HelpCircle className="w-5 h-5 text-neo-brand" /> Instruções e Suporte
              </h3>
              <button 
                onClick={() => setIsHelpModalOpen(false)}
                className="text-gray-500 hover:text-neo-dark font-bold text-base cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-gray-700">
              
              <div>
                <h4 className="font-bold text-sm text-neo-dark uppercase border-l-3 border-neo-brand pl-2 mb-2">
                  1. Como funciona a liberação do tíquete?
                </h4>
                <p className="font-mono pl-3">
                  Ao escolher um tíquete ou quitação de multa na loja e realizar o pagamento (Pix ou GRU via PagTesouro), o webhook do PagTesouro notifica o Spring Boot em tempo real. O backend muda o status do seu item de <strong className="text-amber-700">PENDING</strong> para <strong className="text-emerald-700">PAID</strong> instantaneamente.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-neo-dark uppercase border-l-3 border-neo-brand pl-2 mb-2">
                  2. Como resgatar o tíquete no refeitório?
                </h4>
                <p className="font-mono pl-3">
                  No refeitório ou guichê administrativo, você pode clicar no botão **"Exibir Código"** de qualquer tíquete com status ativo. Mostre o QR Code gerado para o operador fazer a leitura, ou simplesmente informe o seu **CPF**. Ele confirmará a liberação no sistema e efetuará a baixa física.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-neo-dark uppercase border-l-3 border-neo-brand pl-2 mb-2">
                  3. Onde consulto os recibos legais de GRU/Pix?
                </h4>
                <p className="font-mono pl-3">
                  Na seção **"Faturas e Cobranças"**, todas as suas faturas processadas ficam arquivadas. Para faturas compensadas (<strong className="text-emerald-700">CONCLUIDO</strong>), clique em **"Ver Recibo"** para visualizar a transação, incluindo data de pagamento, PSP (banco parceiro) e método de transação.
                </p>
              </div>

              <div className="p-3 bg-neo-bg border border-neo-dark text-[10px] text-gray-500 font-mono">
                📌 **Sobre o Projeto**: Este é o portal de arrecadação digital IFNMG Express Moderno integrado à rede de testes do PagTesouro (STN).
              </div>
            </div>

            <button 
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full neo-btn bg-gray-100 hover:bg-gray-200 mt-5 font-bold text-xs py-2"
            >
              Entendido
            </button>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DETALHES DO PEDIDO (CUPOM FISCAL ACADÊMICO NEO-BRUTALISTA) */}
      {selectedOrderIdForDetails && (
        <div className="fixed inset-0 bg-neo-dark bg-opacity-65 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md neo-card p-6 bg-white border-3 animate-slide-up shadow-neo-xl">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b-3 border-neo-dark pb-3 mb-4">
              <h3 className="text-base font-bold uppercase tracking-tight flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-neo-brand" /> Detalhes do Pedido
              </h3>
              <button 
                onClick={() => setSelectedOrderIdForDetails(null)}
                className="text-gray-500 hover:text-neo-dark font-bold text-base cursor-pointer select-none"
              >
                ✕
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 text-center font-bold text-gray-500 animate-pulse font-mono">
                Consultando dados do pedido na API...
              </div>
            ) : detailsError ? (
              <div className="p-4 bg-red-100 border-2 border-red-950 text-red-950 font-bold text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{detailsError}</span>
              </div>
            ) : orderDetails ? (
              <div className="space-y-4">
                
                {/* Visual de Cupom Fiscal Impresso */}
                <div className="bg-neo-bg border-2 border-neo-dark p-4 font-mono text-[10px] text-gray-800 leading-relaxed shadow-neo-sm relative overflow-hidden">
                  
                  {/* Detalhes de picotado na borda superior e inferior */}
                  <div className="text-center font-bold uppercase text-[9px] tracking-widest text-gray-600 mb-2">
                    * * * CUPOM FISCAL DE ARRECADAÇÃO * * *
                  </div>
                  
                  <div className="text-center space-y-0.5 border-b-2 border-dashed border-gray-400 pb-3">
                    <h4 className="font-bold text-xs uppercase text-neo-dark">IFNMG - CAMPUS SALINAS</h4>
                    <p className="text-[8px] text-gray-500">CNPJ: 10.749.255/0001-30</p>
                    <p className="text-[8px] text-gray-500">RODOVIA SALINAS / TAIOBEIRAS, KM 02</p>
                    <p className="text-[8px] text-gray-500">SISTEMA IFNMG EXPRESS DIGITAL</p>
                  </div>

                  {/* Informações básicas do cupom */}
                  <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-1 text-[9px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500 uppercase">ID Compra:</span>
                      <span className="font-bold text-neo-dark select-all">{orderDetails.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 uppercase">Data/Hora:</span>
                      <span className="font-bold text-neo-dark">
                        {new Date(orderDetails.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 uppercase">Situação:</span>
                      <span className={`font-bold px-1.5 border border-neo-dark text-[8px] uppercase ${
                        orderDetails.status === 'PAID' || orderDetails.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-900'
                          : orderDetails.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-900 animate-pulse'
                          : 'bg-red-100 text-red-900'
                      }`}>
                        {orderDetails.status}
                      </span>
                    </div>
                  </div>

                  {/* Tabela de Itens em formato de fita de caixa */}
                  <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-2">
                    <div className="flex justify-between text-[9px] font-bold text-gray-600 border-b border-gray-300 pb-1">
                      <span className="w-1/2 uppercase">Descrição do Item</span>
                      <span className="w-1/12 text-center uppercase">Qtd</span>
                      <span className="w-1/4 text-right uppercase">Unit.</span>
                      <span className="w-1/4 text-right uppercase">Total</span>
                    </div>
                    
                    {orderDetails.items && orderDetails.items.map((item) => (
                      <div key={item.id} className="flex justify-between font-mono text-[9px] leading-tight">
                        <span className="w-1/2 truncate font-bold text-neo-dark" title={item.productTitle}>
                          {item.productTitle}
                        </span>
                        <span className="w-1/12 text-center text-gray-600">x{item.quantity}</span>
                        <span className="w-1/4 text-right text-gray-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalAmount / item.quantity)}
                        </span>
                        <span className="w-1/4 text-right font-bold text-neo-dark">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totais do cupom fiscal */}
                  <div className="pt-3 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold border-2 border-neo-dark p-2 bg-white">
                      <span className="text-gray-700">VALOR TOTAL:</span>
                      <span className="text-neo-brand font-mono text-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderDetails.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Auditoria Governamental */}
                  <div className="mt-4 text-center text-[7px] text-gray-500 border-t border-dashed border-gray-300 pt-2 leading-relaxed">
                    ESTE DOCUMENTO NÃO POSSUI VALOR FISCAL DE VENDA COMERCIAL.<br />
                    COMPROVANTE PARA FINS ACADÊMICOS E DE AUDITORIA TRANSACIONAL DE RECEITA PÚBLICA.<br />
                    INTEGRADO À INFRAESTRUTURA PAGTESOURO / TESOURO NACIONAL (STN).<br />
                    <span className="font-bold text-neo-dark mt-1 block">TCC II - CAIO DA SILVA VIANA - IFNMG 2026</span>
                  </div>

                </div>

                <div className="p-3 bg-blue-50 border border-blue-900 text-[10px] text-blue-950 leading-relaxed font-sans">
                  💡 **Resgate Físico**: Para os tíquetes ativos contidos nesta compra, o resgate pode ser realizado item a item no refeitório apresentando o QR Code individual ou informando seu CPF.
                </div>

              </div>
            ) : null}

            <button 
              onClick={() => setSelectedOrderIdForDetails(null)}
              className="w-full neo-btn bg-gray-100 hover:bg-gray-200 mt-5 font-bold text-xs py-2 shadow-none"
            >
              Fechar Cupom Fiscal
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
