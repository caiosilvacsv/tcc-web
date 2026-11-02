import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
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
  Search,
  Sparkles,
  QrCode,
  ShieldCheck,
  Building,
  AlertTriangle,
  X,
  Clock,
} from 'lucide-react';
import { isValidCpf, formatCpf, cleanCpf } from '../../utils/cpf';
import { Layout } from '../../components/layout/Layout';
import {
  PagTesouroPaymentModal,
  CheckoutGuideItem,
} from '../../components/payment/PagTesouroPaymentModal';

interface Product {
  id: string;
  title: string;
  price: number;
  active: boolean;
  description?: string;
  codeService: string;
  category: string;
  imageUrl?: string;
  color?: string;
}

interface ProductCategoryDTO {
  key: string;
  value: string;
  displayName: string;
}

interface OrderResponse {
  id: string;
}



export function ProductStore() {
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, getSubtotal } =
    useCart();
  const { user, isAuthenticated } = useAuth();
  const { getConfig } = useSystemConfig();
  const toast = useToast();
  const navigate = useNavigate();

  const institutionName = getConfig('institution.name', 'IFNMG • Campus Salinas');
  const heroTitle = getConfig(
    'institution.hero_title',
    'Arrecadação Pública Digital & Tíquetes Acadêmicos'
  );
  const heroDescription = getConfig(
    'institution.hero_description',
    'Adquira refeições para o refeitório institucional ou efetue a quitação de taxas com liquidação em tempo real via PIX, Cartão ou GRU diretamente pelo PagTesouro.'
  );

  // Catálogo e Categorias vindos 100% do Backend
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Estados de Checkout e Carrinho
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [paymentTiming, setPaymentTiming] = useState<'IMMEDIATE' | 'LATER'>('IMMEDIATE');
  const [contributorName, setContributorName] = useState('');
  const [contributorCpf, setContributorCpf] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados do Modal Multi-Guia do PagTesouro
  const [checkoutGuides, setCheckoutGuides] = useState<CheckoutGuideItem[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Busca categorias e produtos ativos direto do Backend (sem dados estáticos chumbados)
  const fetchStoreData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsData, categoriesData] = await Promise.all([
        api<Product[]>('/product?activeOnly=true', { skipAuthRedirect: true }),
        api<ProductCategoryDTO[]>('/product/categories', { skipAuthRedirect: true }).catch(
          () => []
        ),
      ]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err: any) {
      setError(
        err.message || 'Não foi possível carregar o catálogo oficial no momento. Tente novamente.'
      );
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);



  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCpf(rawValue);
    setContributorCpf(formatted);

    const numericOnly = cleanCpf(rawValue);
    if (numericOnly.length === 11) {
      if (!isValidCpf(numericOnly)) {
        setCpfError('O CPF informado possui dígitos verificadores inválidos.');
      } else {
        setCpfError(null);
      }
    } else {
      setCpfError(null);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!isAuthenticated && cartItems.length > 0 && cartItems[0].id !== product.id) {
      toast.info(
        'No modo Visitante Anônimo, o checkout direto é realizado para um serviço por vez. Faça login para usar o carrinho multi-itens!'
      );
      clearCart();
    }

    addItem({
      id: product.id,
      name: product.title,
      price: product.price,
    });
    toast.success(`"${product.title}" adicionado ao carrinho!`);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setIsProcessing(true);
    try {
      if (isAuthenticated) {
        // Submissão unificada do carrinho: única requisição POST /orders com itens e quantidades (sem CPF)
        const orderPayload = {
          itemsList: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        };

        const orderData = await api<OrderResponse>('/orders', {
          method: 'POST',
          body: JSON.stringify(orderPayload),
        });

        clearCart();
        setIsCheckoutMode(false);

        if (paymentTiming === 'LATER') {
          toast.success(
            `Pedido #${orderData.id.slice(0, 8)} realizado com sucesso! Você pode realizar o pagamento quando desejar pelo painel "Minha Carteira".`
          );
        } else {
          // Opção de geração imediata da guia (zero CPF no payload)
          const checkoutResponse = await api<CheckoutGuideItem | CheckoutGuideItem[]>(
            `/payments/checkout/${orderData.id}`,
            {
              method: 'POST',
              body: JSON.stringify({ isMobile: false }),
            }
          );

          const guidesList = Array.isArray(checkoutResponse)
            ? checkoutResponse
            : [checkoutResponse];

          setCurrentOrderId(orderData.id);
          setCheckoutGuides(guidesList);
          setIsPaymentModalOpen(true);
          toast.success(
            `${guidesList.length} ${guidesList.length === 1 ? 'guia gerada' : 'guias SISGRU geradas'} com sucesso!`
          );
        }
      } else {
        // Visitante Anônimo: valida dados e submete checkout direto
        const cpfLimpo = cleanCpf(contributorCpf);
        if (!contributorName.trim()) {
          toast.error('Informe o nome completo do contribuinte (máx. 45 caracteres).');
          setIsProcessing(false);
          return;
        }
        if (cpfLimpo.length !== 11 || !isValidCpf(cpfLimpo)) {
          setCpfError('O CPF informado é inválido.');
          toast.error('Informe um CPF válido para emissão da guia no PagTesouro.');
          setIsProcessing(false);
          return;
        }

        const firstItem = cartItems[0];
        const directGuide = await api<CheckoutGuideItem>('/payments/checkout/direct', {
          method: 'POST',
          skipAuthRedirect: true,
          body: JSON.stringify({
            productId: firstItem.id,
            quantity: firstItem.quantity,
            contributorCpfCnpj: cpfLimpo,
            contributorName: contributorName.trim().slice(0, 45),
            isMobile: false,
          }),
        });

        setCurrentOrderId(null);
        setCheckoutGuides([directGuide]);
        setIsPaymentModalOpen(true);
        setIsCheckoutMode(false);
        clearCart();
        toast.success('Guia avulsa do PagTesouro gerada com sucesso!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryDisplayName = (categoryKey: string) => {
    const found = categories.find(
      (c) =>
        c.key.toUpperCase() === categoryKey?.toUpperCase() ||
        c.value.toUpperCase() === categoryKey?.toUpperCase()
    );
    return found ? found.displayName : categoryKey;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.codeService.includes(searchQuery);
      const matchesCategory =
        selectedCategory === 'ALL' ||
        p.category?.toUpperCase() === selectedCategory.toUpperCase();
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

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="neo-badge bg-neo-yellow text-neo-dark border-neo-dark">
                  🏛️ Portal de Serviços Oficiais
                </span>
                <span className="neo-badge bg-neo-brand-light text-emerald-900 border-neo-dark">
                  ⚡ PagTesouro STN
                </span>
                <span className="neo-badge bg-slate-100 text-slate-700 border-neo-dark">
                  {institutionName}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-heading font-bold text-neo-dark tracking-tight leading-tight">
                {heroTitle}
              </h1>

              <p className="text-sm text-slate-600 font-sans leading-relaxed">
                {heroDescription}
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-neo-brand" /> Cookies HttpOnly & LGPD
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-neo-yellow" /> Compensação Instantânea SSE
                </span>
              </div>
            </div>


          </div>
        </div>

        {/* BARRA DE FILTROS E CATEGORIAS DINÂMICAS DO BACKEND (GET /product/categories) */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 neo-card border-3">
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-neo-dark text-white border-neo-dark shadow-neo-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
              }`}
            >
              Todos ({products.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
                  selectedCategory === cat.key
                    ? 'bg-neo-yellow text-neo-dark border-neo-dark shadow-neo-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-neo-dark'
                }`}
              >
                {cat.displayName}
              </button>
            ))}
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
                    Catálogo Oficial de Serviços (SISGRU)
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  {filteredProducts.length} itens ativos
                </span>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border-2 border-rose-950 text-rose-900 text-xs font-mono flex items-center justify-between gap-2">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={fetchStoreData}
                    className="px-2.5 py-1 bg-white border border-rose-950 font-bold uppercase cursor-pointer"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-neo-brand border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-heading font-bold text-xs uppercase text-slate-500 tracking-wider">
                    Consultando catálogo no servidor do IFNMG...
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 px-6 text-center bg-slate-50 border-3 border-dashed border-slate-300 max-w-md mx-auto my-4 space-y-3">
                  <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                    Nenhum serviço encontrado
                  </h3>
                  <p className="text-xs text-slate-600 font-sans leading-relaxed">
                    Não localizamos serviços ativos para o filtro selecionado.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                    }}
                    className="neo-btn bg-white hover:bg-slate-100 py-1.5 px-3 text-xs cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProducts.map((product) => {
                    const inCartItem = cartItems.find((i) => i.id === product.id);
                    const accentColor = product.color || '#10B981';

                    return (
                      <div
                        key={product.id}
                        className="neo-card border-3 border-neo-dark bg-white flex flex-col justify-between hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg transition-all duration-150 relative overflow-hidden group"
                      >
                        {/* Faixa superior com a cor vinda direto do Backend (product.color) */}
                        <div
                          className="h-2.5 w-full border-b-2 border-neo-dark"
                          style={{ backgroundColor: accentColor }}
                        />

                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-3 gap-2">
                              <span
                                className="neo-badge text-neo-dark border-neo-dark"
                                style={{ backgroundColor: `${accentColor}33` }}
                              >
                                {getCategoryDisplayName(product.category)}
                              </span>
                              <span className="text-[10px] font-mono text-slate-600 font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-300">
                                SISGRU #{product.codeService}
                              </span>
                            </div>

                            {product.imageUrl && (
                              <div className="mb-3 h-32 w-full border-2 border-neo-dark overflow-hidden bg-slate-100">
                                <img
                                  src={product.imageUrl}
                                  alt={product.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}

                            <h3 className="font-heading font-bold text-base text-neo-dark leading-snug mb-2 group-hover:text-neo-brand transition-colors">
                              {product.title}
                            </h3>
                            <p className="text-xs text-slate-600 font-sans leading-relaxed mb-4 line-clamp-3">
                              {product.description ||
                                'Liberação digital imediata após confirmação de quitação pelo Tesouro Nacional.'}
                            </p>
                          </div>

                          <div className="pt-4 border-t-2 border-dashed border-slate-200 flex justify-between items-center mt-auto">
                            <div>
                              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                                Valor Unitário
                              </span>
                              <span className="text-xl font-mono font-bold text-neo-dark">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(product.price)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {inCartItem ? (
                                <div className="flex items-center border-2 border-neo-dark bg-slate-50 font-mono text-xs shadow-neo-xs">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(product.id, inCartItem.quantity - 1)
                                    }
                                    className="px-2 py-1 border-r-2 border-neo-dark hover:bg-slate-200 font-bold cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 font-bold text-neo-dark">
                                    {inCartItem.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(product.id, inCartItem.quantity + 1)
                                    }
                                    className="px-2 py-1 border-l-2 border-neo-dark hover:bg-slate-200 font-bold cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(product)}
                                  className="neo-btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5 shadow-neo-xs cursor-pointer"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" /> Adicionar
                                </button>
                              )}
                            </div>
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
                    type="button"
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
                    Selecione itens no catálogo ao lado para gerar sua guia oficial do PagTesouro.
                  </p>
                </div>
              ) : !isCheckoutMode ? (
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
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(item.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center border-2 border-neo-dark bg-white font-mono text-xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="px-2 py-0.5 border-r-2 border-neo-dark hover:bg-slate-100 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 font-bold text-neo-dark">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2 py-0.5 border-l-2 border-neo-dark hover:bg-slate-100 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 border-2 border-rose-950 bg-rose-100 text-rose-900 hover:bg-rose-200 cursor-pointer"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t-3 border-neo-dark space-y-2">
                    <div className="flex justify-between text-xs font-mono text-slate-600">
                      <span>Unidades selecionadas:</span>
                      <span className="font-bold">
                        {cartItems.reduce((acc, i) => acc + i.quantity, 0)} un.
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                      <span className="font-heading font-bold text-xs uppercase tracking-wider text-neo-dark">
                        Total a Pagar:
                      </span>
                      <span className="text-2xl font-mono font-bold text-neo-dark">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(getSubtotal())}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCheckoutMode(true)}
                    className="w-full neo-btn-primary py-3.5 flex items-center justify-center gap-2 mt-4 text-xs tracking-wider cursor-pointer"
                  >
                    <span>Avançar para Identificação</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Formulário de Identificação Fiscal + Aviso de Regra de Entrada Única */
                <form onSubmit={handleCheckout} className="space-y-4 animate-fade-in">
                  <div className="p-3 bg-neo-yellow border-2 border-neo-dark text-[11px] font-sans text-neo-dark space-y-1">
                    <div className="font-heading font-bold uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Regra de Entrada Única (PagTesouro)</span>
                    </div>
                    <p className="leading-snug">
                      Cada guia gerada na STN possui sessão única. Caso haja mais de um serviço
                      SISGRU no carrinho, você poderá escolher qual guia pagar primeiro na janela a
                      seguir.
                    </p>
                  </div>

                  {isAuthenticated ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-emerald-50 border-2 border-neo-dark space-y-1">
                        <span className="text-[11px] font-heading font-bold uppercase text-emerald-950 block">
                          Titular da Compra
                        </span>
                        <p className="text-xs font-sans text-slate-800">
                          Identificação vinculada com segurança à conta de{' '}
                          <strong>
                            {user?.name} {user?.lastName || ''}
                          </strong>
                          .
                        </p>
                        <span className="text-[10px] font-mono text-emerald-800 block">
                          🛡️ Emissão fiscal automatizada via credencial institucional (sem exposição de CPF).
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-heading font-bold uppercase text-neo-dark">
                          Como deseja prosseguir com o pagamento?
                        </label>
                        
                        <div
                          onClick={() => setPaymentTiming('IMMEDIATE')}
                          className={`p-3 border-2 cursor-pointer transition-all ${
                            paymentTiming === 'IMMEDIATE'
                              ? 'bg-amber-50 border-neo-dark shadow-neo-xs'
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="paymentTiming"
                              value="IMMEDIATE"
                              checked={paymentTiming === 'IMMEDIATE'}
                              onChange={() => setPaymentTiming('IMMEDIATE')}
                              className="mt-0.5 accent-neo-dark"
                            />
                            <div>
                              <span className="font-heading font-bold text-xs uppercase text-neo-dark block">
                                ⚡ Gerar Guia PagTesouro Agora
                              </span>
                              <p className="text-[11px] text-slate-600 mt-0.5 font-sans leading-snug">
                                Abre instantaneamente o ambiente oficial do PagTesouro (PIX, Cartão ou Boleto GRU) para quitação imediata.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          onClick={() => setPaymentTiming('LATER')}
                          className={`p-3 border-2 cursor-pointer transition-all ${
                            paymentTiming === 'LATER'
                              ? 'bg-sky-50 border-neo-dark shadow-neo-xs'
                              : 'bg-white border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="paymentTiming"
                              value="LATER"
                              checked={paymentTiming === 'LATER'}
                              onChange={() => setPaymentTiming('LATER')}
                              className="mt-0.5 accent-neo-dark"
                            />
                            <div>
                              <span className="font-heading font-bold text-xs uppercase text-neo-dark block">
                                🕒 Salvar Pedido e Pagar Depois
                              </span>
                              <p className="text-[11px] text-slate-600 mt-0.5 font-sans leading-snug">
                                Registra o pedido na sua conta. Você poderá emitir a guia a qualquer momento acessando "Minha Carteira".
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-slate-50 border-2 border-neo-dark text-xs space-y-2">
                        <p className="font-sans text-slate-600">
                          Você está comprando como <strong>Visitante</strong>. Informe o CPF onde o
                          tíquete ficará disponível para retirada no refeitório:
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate('/login')}
                          className="text-[11px] font-mono font-bold text-neo-brand hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5" /> Prefere entrar na sua conta acadêmica?
                        </button>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                          <span>Nome do Contribuinte *</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {contributorName.length}/45
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={45}
                          value={contributorName}
                          onChange={(e) => setContributorName(e.target.value.slice(0, 45))}
                          placeholder="Nome completo para a guia STN"
                          className="neo-input text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                          CPF do Contribuinte *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={14}
                          value={contributorCpf}
                          onChange={handleCpfChange}
                          placeholder="000.000.000-00"
                          className="neo-input font-mono text-xs"
                        />
                        {cpfError && (
                          <p className="text-[11px] font-mono text-rose-600 mt-1 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> {cpfError}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutMode(false)}
                      disabled={isProcessing}
                      className="neo-btn bg-white py-3 px-4 text-xs cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 neo-btn-primary py-3 text-xs font-heading font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isAuthenticated && paymentTiming === 'LATER' ? (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>{isProcessing ? 'Registrando Pedido...' : 'Salvar Pedido e Pagar Depois'}</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>{isProcessing ? 'Emitindo Guia STN...' : 'Gerar Guia PagTesouro'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MULTI-GUIA OFICIAL DO PAGTESOURO (COM REGRA DE ENTRADA ÚNICA E SSE) */}
      <PagTesouroPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        payments={checkoutGuides}
        orderId={currentOrderId}
        contributorName={contributorName || (user ? `${user.name} ${user.lastName || ''}`.trim() : undefined)}
        onSuccess={() => {
          toast.success('Pagamento confirmado! Consulte seus tíquetes na Minha Carteira.');
        }}
      />
    </Layout>
  );
}
