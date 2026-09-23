import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  Trash2, 
  ArrowRight, 
  LogIn, 
  CheckCircle2, 
  ShieldAlert, 
  CreditCard, 
  ExternalLink,
  Search,
  SlidersHorizontal,
  Sparkles,
  QrCode,
  ShieldCheck,
  Building,
  Plus,
  Minus
} from 'lucide-react';
import { isValidCpf, formatCpf, cleanCpf } from '../../utils/cpf';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { Layout } from '../../components/layout/Layout';
import { PagTesouroPaymentModal } from '../../components/payment/PagTesouroPaymentModal';

interface Product {
  id: string;
  title: string;
  price: number;
  active: boolean;
  description?: string;
  codeService: string;
  category: 'TICKET' | 'FINE';
  image?: string;
}

interface CheckoutResponse {
  idPayment?: string;
  paymentId?: string;
  nextUrl?: string;
  proximaUrl?: string;
}

interface OrderResponse {
  id: string;
}

export function ProductStore() {
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, getSubtotal } = useCart();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TICKET' | 'FINE'>('ALL');

  // Estados de Checkout e Carrinho
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [contributorName, setContributorName] = useState('');
  const [contributorCpf, setContributorCpf] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [useAccountDetails, setUseAccountDetails] = useState(true);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastCheckoutAmount, setLastCheckoutAmount] = useState<number>(0);

  // Escuta reativa SSE da liquidação da fatura do PagTesouro
  const { data: sseData } = usePaymentStatus(currentPaymentId || undefined);

  // Busca produtos ativos na API pública (/product)
  const fetchActiveProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api<Product[]>('/product?activeOnly=true');
      setProducts(data);
    } catch (err: any) {
      console.warn("API de produtos não disponível, usando catálogo estático:", err);
      setError(err.message || 'Catálogo sincronizado com dados locais de contingência.');
      // Fallback em caso de API local indisponível
      setProducts([
        {
          id: '1a72d3f4-d02d-4d7a-8f81-54b9de12ab11',
          title: 'Tíquete Refeitório - Almoço Estudante',
          price: 3.50,
          active: true,
          description: 'Crédito individual de refeição balanceada para almoço no refeitório central do IFNMG Campus Salinas.',
          codeService: '101',
          category: 'TICKET',
        },
        {
          id: '2b83e4f5-e13e-5d8b-9f92-65c9ef23cd22',
          title: 'Tíquete Refeitório - Jantar Estudante',
          price: 3.50,
          active: true,
          description: 'Crédito individual de refeição para jantar nutritivo no refeitório acadêmico do campus.',
          codeService: '102',
          category: 'TICKET',
        },
        {
          id: '3c94f5f6-f24f-6e9c-a0a3-76d9ff34de33',
          title: 'Multa Biblioteca - Atraso de Devolução',
          price: 2.00,
          active: true,
          description: 'Taxa regular de ressarcimento por atraso na devolução de exemplares do acervo bibliográfico.',
          codeService: '201',
          category: 'FINE',
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveProducts();
  }, []);

  // Preenchimento inteligente dos dados de faturamento do estudante logado (LGPD-compliant)
  useEffect(() => {
    if (isAuthenticated && user && useAccountDetails) {
      if (user.name) {
        setContributorName(user.name);
      } else {
        const emailPrefix = user.email.split('@')[0];
        const formattedName = emailPrefix
          .split('.')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        setContributorName(formattedName);
      }
      setContributorCpf('123.456.789-00');
      setCpfError(null);
    } else if (isAuthenticated && !useAccountDetails) {
      setContributorName('');
      setContributorCpf('');
      setCpfError(null);
    }
  }, [isAuthenticated, user, useAccountDetails]);

  // Máscara e validação reativa de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCpf(rawValue);
    setContributorCpf(formatted);

    const numericOnly = cleanCpf(rawValue);
    if (numericOnly.length === 11) {
      if (!isValidCpf(numericOnly)) {
        setCpfError('CPF com dígitos verificadores inválidos.');
      } else {
        setCpfError(null);
      }
    } else {
      if (cpfError) setCpfError(null);
    }
  };

  const handleAddToCart = (product: Product) => {
    // Se o usuário for anônimo, limitamos o carrinho a 1 tipo de produto para compatibilidade com o checkout anônimo
    if (!isAuthenticated && cartItems.length > 0 && cartItems[0].id !== product.id) {
      toast.confirm({
        title: 'Substituir Produto do Carrinho?',
        message: 'No checkout rápido para visitantes (sem login), é permitido faturar um tipo de serviço por vez. Deseja substituir seu carrinho pelo item selecionado?',
        confirmText: 'Sim, Substituir',
        cancelText: 'Manter Atual',
        onConfirm: () => {
          clearCart();
          addItem({
            id: product.id,
            name: product.title,
            price: product.price,
          });
          toast.success(`"${product.title}" adicionado ao carrinho!`);
        }
      });
      return;
    }

    addItem({
      id: product.id,
      name: product.title,
      price: product.price,
    });
    toast.success(`"${product.title}" adicionado com sucesso!`);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAuthenticated && user?.role === 'ADMIN') {
      toast.warning(
        'Operadores e Administradores (ADMIN) não realizam pedidos de compra na loja. Para testar o faturamento, utilize uma conta de estudante (USER) ou o fluxo anônimo.'
      );
      return;
    }

    const cpfLimpo = cleanCpf(contributorCpf);

    if (!contributorName) {
      toast.error('Informe o nome completo do pagador.');
      return;
    }

    if (!isAuthenticated || !useAccountDetails) {
      if (!isValidCpf(cpfLimpo)) {
        setCpfError('O CPF informado é matematicamente inválido.');
        toast.error('Informe um CPF válido para a emissão da GRU/Pix.');
        return;
      }
    }

    setIsProcessing(true);
    try {
      if (isAuthenticated) {
        // FLUXO A: Estudante Autenticado (Carrinho com múltiplos itens)
        const orderRequest = {
          itemsList: cartItems.map(item => ({
            productId: item.id,
            product_id: item.id,
            quantity: item.quantity
          })),
          items_list: cartItems.map(item => ({
            productId: item.id,
            product_id: item.id,
            quantity: item.quantity
          }))
        };

        const orderData = await api<OrderResponse>('/orders', {
          method: 'POST',
          body: JSON.stringify(orderRequest)
        });

        // Checkout da ordem criada
        const checkoutResponse = await api<CheckoutResponse | CheckoutResponse[]>(`/payments/checkout/${orderData.id}`, {
          method: 'POST',
          body: JSON.stringify({
            orderId: orderData.id,
            order_id: orderData.id,
            contributorCpfCnpj: useAccountDetails ? undefined : cpfLimpo,
            contributor_cpf_cnpj: useAccountDetails ? undefined : cpfLimpo,
            contributorName: useAccountDetails ? undefined : contributorName,
            contributor_name: useAccountDetails ? undefined : contributorName,
            isMobile: false,
            is_mobile: false
          })
        });

        const mainCheckout = Array.isArray(checkoutResponse) ? checkoutResponse[0] : checkoutResponse;

        setLastCheckoutAmount(getSubtotal());
        setCheckoutUrl(mainCheckout.nextUrl || mainCheckout.proximaUrl || '');
        setCurrentPaymentId(mainCheckout.idPayment || mainCheckout.paymentId || null);
        setIsPaymentModalOpen(true);
        setIsCheckoutMode(false);
        clearCart();
        toast.success('Ambiente oficial do PagTesouro carregado com sucesso!');
      } else {
        // FLUXO B: Visitante Anônimo (Checkout direto simplificado)
        const firstItem = cartItems[0];
        const itemTotal = firstItem.price * firstItem.quantity;
        
        const checkoutResponse = await api<CheckoutResponse>('/payments/anonymous', {
          method: 'POST',
          body: JSON.stringify({
            productId: firstItem.id,
            product_id: firstItem.id,
            productID: firstItem.id,
            quantity: firstItem.quantity,
            contributorCpfCnpj: cpfLimpo,
            contributor_cpf_cnpj: cpfLimpo,
            contributorName: contributorName,
            contributor_name: contributorName,
            isMobile: false,
            is_mobile: false
          })
        });

        setLastCheckoutAmount(itemTotal);
        setCheckoutUrl(checkoutResponse.nextUrl || checkoutResponse.proximaUrl || '');
        setCurrentPaymentId(checkoutResponse.idPayment || checkoutResponse.paymentId || null);
        setIsPaymentModalOpen(true);
        setIsCheckoutMode(false);
        clearCart();
        toast.success('Ambiente oficial do PagTesouro carregado com sucesso!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar checkout com o PagTesouro. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtra produtos de acordo com busca e categoria
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            p.codeService.includes(searchQuery);
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        
        {/* BANNER INSTITUCIONAL HERO */}
        <div className="neo-card p-6 md:p-8 bg-white border-3 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-5 select-none pointer-events-none hidden lg:block">
            <Building className="w-80 h-80" />
          </div>

          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="neo-badge bg-neo-yellow text-neo-dark border-neo-dark">
                🏛️ Portal de Serviços Oficiais
              </span>
              <span className="neo-badge bg-neo-brand-light text-emerald-900 border-neo-dark">
                ⚡ PagTesouro STN
              </span>
              <span className="neo-badge bg-slate-100 text-slate-700 border-neo-dark">
                Campus Salinas - MG
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-heading font-bold text-neo-dark tracking-tight leading-tight">
              Arrecadação Pública Digital & Tíquetes Acadêmicos
            </h1>
            
            <p className="text-sm text-slate-600 font-sans leading-relaxed">
              Adquira refeições para o refeitório institucional ou efetue a quitação de taxas e multas bibliográficas com liquidação em tempo real via <strong>Pix</strong> e <strong>Cartão de Crédito</strong>.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-neo-brand" /> Proteção de Dados LGPD
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-neo-yellow" /> Baixa Imediata no Guichê
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-neo-accent" /> Sem Taxa de Conveniência
              </span>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 neo-card border-3">
          
          {/* Campo de Pesquisa */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por serviço, refeição ou código SISGRU..."
              className="neo-input neo-input-icon text-xs font-sans"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          </div>

          {/* Chips de Categoria */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-neo-dark text-white border-neo-dark shadow-neo-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setSelectedCategory('TICKET')}
              className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                selectedCategory === 'TICKET'
                  ? 'bg-neo-yellow text-neo-dark border-neo-dark shadow-neo-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
              }`}
            >
              🎫 Tíquetes
            </button>
            <button
              onClick={() => setSelectedCategory('FINE')}
              className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                selectedCategory === 'FINE'
                  ? 'bg-neo-accent text-white border-neo-dark shadow-neo-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
              }`}
            >
              💸 Multas & Taxas
            </button>
          </div>

        </div>

        {/* GRID PRINCIPAL: CATÁLOGO (2/3) + CARRINHO (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA DO CATÁLOGO DE PRODUTOS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="neo-card p-6 bg-white border-3">
              
              <div className="flex justify-between items-center mb-6 pb-3 border-b-2 border-neo-dark">
                <div className="flex items-center gap-2">
                  <Package className="w-6 h-6 text-neo-brand" />
                  <h2 className="font-heading font-bold text-lg uppercase text-neo-dark">
                    Serviços Disponíveis para Recolhimento
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  {filteredProducts.length} itens encontrados
                </span>
              </div>

              {isLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-neo-brand border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-heading font-bold text-xs uppercase text-slate-500 tracking-wider">
                    Sincronizando com a base de dados do IFNMG...
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 px-6 text-center bg-slate-50 border-3 border-dashed border-slate-300 max-w-md mx-auto my-4 space-y-3">
                  <span className="text-4xl block select-none">🔍</span>
                  <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                    Nenhum produto correspondente
                  </h3>
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Não localizamos nenhum serviço para o filtro selecionado. Tente alterar os termos da busca.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                    }}
                    className="neo-btn bg-white hover:bg-slate-100 py-1.5 px-3 text-xs"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProducts.map((product) => {
                    const isTicket = product.category === 'TICKET';
                    const inCartItem = cartItems.find((i) => i.id === product.id);

                    return (
                      <div
                        key={product.id}
                        className="neo-card p-5 border-3 border-neo-dark bg-white flex flex-col justify-between hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg transition-all duration-150 relative group"
                      >
                        <div>
                          {/* Cabeçalho do Card */}
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <span
                              className={`neo-badge ${
                                isTicket
                                  ? 'bg-neo-yellow text-neo-dark'
                                  : 'bg-neo-accent-light text-neo-accent border-neo-dark'
                              }`}
                            >
                              {isTicket ? '🎫 Refeição / Tíquete' : '💸 Taxa / Multa'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-300">
                              SISGRU #{product.codeService}
                            </span>
                          </div>

                          {/* Título & Descrição */}
                          <h3 className="font-heading font-bold text-base text-neo-dark leading-snug mb-2 group-hover:text-neo-brand transition-colors">
                            {product.title}
                          </h3>
                          <p className="text-xs text-slate-600 font-sans leading-relaxed mb-4 line-clamp-3">
                            {product.description || 'Liberação digital imediata após confirmação de quitação pelo Tesouro Nacional.'}
                          </p>
                        </div>

                        {/* Rodapé do Card com Preço e Ação */}
                        <div className="pt-4 border-t-2 border-dashed border-slate-200 flex justify-between items-center mt-auto">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                              Valor Unitário
                            </span>
                            <span className="text-xl font-mono font-bold text-neo-dark">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {inCartItem ? (
                              <div className="flex items-center border-2 border-neo-dark bg-slate-50 font-mono text-xs shadow-neo-xs">
                                <button
                                  onClick={() => updateQuantity(product.id, inCartItem.quantity - 1)}
                                  className="px-2 py-1 border-r-2 border-neo-dark hover:bg-slate-200 font-bold cursor-pointer"
                                  title="Diminuir"
                                >
                                  -
                                </button>
                                <span className="px-2 font-bold text-neo-dark">{inCartItem.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(product.id, inCartItem.quantity + 1)}
                                  className="px-2 py-1 border-l-2 border-neo-dark hover:bg-slate-200 font-bold cursor-pointer"
                                  title="Aumentar"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(product)}
                                className="neo-btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5 shadow-neo-xs"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" /> Adicionar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

          {/* COLUNA DO CARRINHO DE COMPRAS E CHECKOUT */}
          <div className="space-y-6">
            <div className="neo-card p-6 bg-white border-3 sticky top-24">
              
              <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-neo-dark">
                <h2 className="font-heading font-bold text-lg uppercase flex items-center gap-2 text-neo-dark">
                  <ShoppingCart className="w-5 h-5 text-neo-accent" /> Seu Carrinho
                </h2>
                {cartItems.length > 0 && !isCheckoutMode && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] font-mono text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    Esvaziar
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="py-12 px-4 text-center bg-slate-50 border-2 border-dashed border-slate-300 space-y-2">
                  <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-heading font-bold text-xs uppercase text-slate-500">
                    Carrinho Vazio
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Selecione produtos na vitrine ao lado para prosseguir com o pagamento.
                  </p>
                </div>
              ) : !isCheckoutMode ? (
                // Modo Lista de Itens do Carrinho
                <div className="space-y-4">
                  <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border-2 border-neo-dark bg-slate-50 flex justify-between items-center shadow-neo-xs"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <h4 className="font-heading font-bold text-xs truncate leading-snug text-neo-dark">
                            {item.name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500 font-bold block mt-0.5">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border-2 border-neo-dark bg-white font-mono text-xs">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-2 py-0.5 border-r-2 border-neo-dark hover:bg-slate-100 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 font-bold text-neo-dark">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2 py-0.5 border-l-2 border-neo-dark hover:bg-slate-100 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 border-2 border-rose-950 bg-rose-100 text-rose-900 hover:bg-rose-200 cursor-pointer transition-colors"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="pt-4 border-t-3 border-neo-dark space-y-2">
                    <div className="flex justify-between text-xs font-mono text-slate-600">
                      <span>Itens no pedido:</span>
                      <span className="font-bold">{cartItems.reduce((acc, i) => acc + i.quantity, 0)} un.</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-slate-600">
                      <span>Tarifa PagTesouro:</span>
                      <span className="font-bold text-emerald-700">R$ 0,00 (Gratuito)</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                      <span className="font-heading font-bold text-xs uppercase tracking-wider text-neo-dark">
                        Total a Pagar:
                      </span>
                      <span className="text-2xl font-mono font-bold text-neo-dark">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getSubtotal())}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCheckoutMode(true)}
                    className="w-full neo-btn-primary py-3.5 flex items-center justify-center gap-2 mt-4 text-xs tracking-wider"
                  >
                    <span>Avançar para Pagamento</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : sseData?.status === 'COMPLETED' ? (
                // Pagamento Confirmado via SSE Reativo
                <div className="text-center p-6 space-y-4 bg-emerald-50 border-3 border-emerald-950 animate-fade-in shadow-neo-md">
                  <div className="w-14 h-14 bg-emerald-100 border-2 border-emerald-950 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-700 animate-bounce" />
                  </div>
                  
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 border border-emerald-900 text-[9px] font-mono font-bold uppercase bg-emerald-200 text-emerald-950 inline-block">
                      ⚡ Sincronizado via SSE
                    </span>
                    <h3 className="font-heading font-bold text-base text-emerald-950 uppercase">
                      Pagamento Aprovado!
                    </h3>
                    <p className="text-xs text-slate-700 font-sans leading-relaxed">
                      O PagTesouro liquidou o valor com sucesso. Seu crédito/tíquete já se encontra disponível no sistema.
                    </p>
                  </div>

                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        setCheckoutUrl(null);
                        setCurrentPaymentId(null);
                        setIsCheckoutMode(false);
                        navigate('/dashboard');
                      }}
                      className="w-full neo-btn-primary py-3 flex items-center justify-center gap-2 text-xs"
                    >
                      <QrCode className="w-4 h-4" /> Acessar Minha Carteira
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-white border-2 border-emerald-950 text-left text-xs text-emerald-950 font-sans leading-relaxed shadow-neo-xs">
                        💡 <strong>Retirada Presencial</strong>: Como você comprou sem login, apresente seu <strong>CPF ({contributorCpf})</strong> no balcão do refeitório para a baixa física.
                      </div>
                      <button
                        onClick={() => {
                          setCheckoutUrl(null);
                          setCurrentPaymentId(null);
                          setIsCheckoutMode(false);
                          clearCart();
                        }}
                        className="w-full neo-btn bg-white hover:bg-slate-100 text-xs py-2.5"
                      >
                        Voltar à Loja
                      </button>
                    </div>
                  )}
                </div>
              ) : checkoutUrl ? (
                // Guia Gerada - Aguardando Pagamento e Escuta SSE com Modal Iframe
                <div className="text-center p-6 space-y-4 bg-emerald-50/70 border-3 border-neo-dark animate-fade-in shadow-neo-md">
                  <div className="w-12 h-12 bg-neo-yellow border-2 border-neo-dark flex items-center justify-center mx-auto shadow-neo-xs">
                    <CreditCard className="w-6 h-6 text-neo-dark" />
                  </div>

                  <div className="space-y-1">
                    <span className="neo-badge bg-emerald-200 text-emerald-950 border-emerald-950">
                      ⚡ Pagamento Ativo
                    </span>
                    <h3 className="font-heading font-bold text-base text-neo-dark uppercase">
                      Ambiente PagTesouro Pronto
                    </h3>
                    <p className="text-xs text-slate-700 font-sans leading-relaxed">
                      O ambiente oficial foi carregado no iFrame para você pagar com Pix ou Cartão.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full neo-btn-primary py-3.5 flex items-center justify-center gap-2 font-bold text-xs tracking-wider"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Abrir Tela de Pagamento (iFrame)</span>
                  </button>

                  {/* Indicador reativo de escuta Server-Sent Events */}
                  <div className="p-3 bg-white border-2 border-neo-dark flex items-center gap-2.5 text-left text-[11px] font-mono text-slate-700 shadow-neo-xs">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-ping flex-shrink-0" />
                    <span>Aguardando liquidação bancária automática em tempo real...</span>
                  </div>

                  <button
                    onClick={() => {
                      setCheckoutUrl(null);
                      setCurrentPaymentId(null);
                      setIsCheckoutMode(false);
                      setIsPaymentModalOpen(false);
                    }}
                    className="w-full neo-btn bg-white hover:bg-slate-100 text-xs py-2"
                  >
                    Cancelar e Voltar à Loja
                  </button>
                </div>
              ) : (
                // Formulário de Identificação do Pagador (Checkout)
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  
                  <div className="p-3 bg-neo-yellow-light border-2 border-neo-dark text-xs font-mono text-neo-dark flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-neo-dark flex-shrink-0" />
                    <span>
                      {isAuthenticated
                        ? 'Checkout integrado com sua conta acadêmica.'
                        : 'Checkout rápido para visitante / anônimo.'}
                    </span>
                  </div>

                  {isAuthenticated && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setUseAccountDetails(true)}
                        className={`text-center py-2 text-[10px] font-heading font-bold uppercase border-2 border-neo-dark transition-all cursor-pointer ${
                          useAccountDetails
                            ? 'bg-neo-yellow text-neo-dark shadow-neo-xs -translate-y-0.5'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        💳 Meus Dados
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseAccountDetails(false)}
                        className={`text-center py-2 text-[10px] font-heading font-bold uppercase border-2 border-neo-dark transition-all cursor-pointer ${
                          !useAccountDetails
                            ? 'bg-neo-yellow text-neo-dark shadow-neo-xs -translate-y-0.5'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        👤 Outro Pagador
                      </button>
                    </div>
                  )}

                  {(!isAuthenticated || !useAccountDetails) ? (
                    <>
                      <div>
                        <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Nome Completo do Pagador
                        </label>
                        <input
                          type="text"
                          required
                          value={contributorName}
                          onChange={(e) => setContributorName(e.target.value)}
                          placeholder="Ex: Caio Silva"
                          className="neo-input text-xs"
                          disabled={isProcessing}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                          CPF do Pagador (Doador da Guia)
                        </label>
                        <input
                          type="text"
                          required
                          value={contributorCpf}
                          onChange={handleCpfChange}
                          maxLength={14}
                          placeholder="000.000.000-00"
                          className="neo-input text-xs font-mono"
                          disabled={isProcessing}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-4 border-2 border-neo-dark bg-emerald-50/60 space-y-2 text-left shadow-neo-xs">
                      <span className="px-2 py-0.5 border border-emerald-950 text-[9px] font-mono font-bold uppercase bg-emerald-200 text-emerald-950 inline-block">
                        🔒 Proteção LGPD Ativa
                      </span>
                      <h4 className="font-heading font-bold text-xs text-emerald-950">
                        Conta: {user?.email}
                      </h4>
                      <p className="text-[11px] font-sans text-slate-700 leading-relaxed">
                        Seus dados cadastrais como CPF e sobrenome estão protegidos contra exposição na tela e serão vinculados internamente pelo servidor.
                      </p>
                    </div>
                  )}

                  {cpfError && (
                    <div className="p-2.5 bg-rose-50 border-2 border-rose-950 text-rose-950 font-mono text-[11px] flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                      <span>{cpfError}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t-2 border-dashed border-slate-300 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutMode(false)}
                      className="flex-1 neo-btn bg-slate-100 hover:bg-slate-200 text-xs py-2.5"
                      disabled={isProcessing}
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 neo-btn-primary text-xs py-2.5"
                      disabled={isProcessing || !!cpfError}
                    >
                      {isProcessing ? 'Gerando...' : 'Confirmar & Pagar'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* MODAL COM IFRAME OFICIAL DO PAGTESOURO (SEM ABRIR ABA EXTERNA) */}
      {checkoutUrl && (
        <PagTesouroPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          paymentUrl={checkoutUrl}
          paymentId={currentPaymentId || undefined}
          amount={lastCheckoutAmount}
          contributorCpf={contributorCpf}
          isAuthenticated={isAuthenticated}
          onSuccessRedirect={() => {
            setIsPaymentModalOpen(false);
            setCheckoutUrl(null);
            setCurrentPaymentId(null);
            navigate('/dashboard');
          }}
        />
      )}
    </Layout>
  );
}
