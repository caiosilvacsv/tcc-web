import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Package,
  Edit2,
  Search,
  BarChart3,
  Users,
  Settings,
  RefreshCw,
  Activity,
  DollarSign,
  Ticket,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  UserX,
  Save,
  X,
  Palette,
  Image as ImageIcon,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { formatCpf } from '../../utils/cpf';

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

interface AdminDashboardMetrics {
  totalRevenue: number;
  totalTicketsBought: number;
  totalTicketsExchanged: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  ordersByStatusDescriptions?: Record<string, string>;
}

interface AdminUserDTO {
  id: string;
  name: string;
  lastName: string;
  email: string;
  cpf: string;
  role: 'USER' | 'ADMIN';
  active: boolean;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
}

interface SystemConfigItem {
  configKey: string;
  configValue: string;
  description?: string;
  updatedAt?: string;
}

export function AdminProducts() {
  const { user, isAuthenticated } = useAuth();
  const { getConfig, refreshConfigs } = useSystemConfig();
  const toast = useToast();
  const navigate = useNavigate();

  const presetColors = useMemo(() => {
    const raw = getConfig(
      'ui.product_preset_colors',
      '#10B981,#F59E0B,#3B82F6,#EF4444,#8B5CF6,#EC4899'
    );
    return raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }, [getConfig]);

  // Aba ativa da Central Administrativa
  const [activeAdminTab, setActiveAdminTab] = useState<
    'DASHBOARD' | 'PRODUCTS' | 'USERS' | 'CONFIG'
  >('DASHBOARD');

  // Monitor de Saúde (/actuator/health)
  const [healthStatus, setHealthStatus] = useState<'UP' | 'DOWN' | 'CHECKING'>('CHECKING');

  // =========================================================================
  // ESTADOS ABA 1: DASHBOARD & SYNC STN
  // =========================================================================
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [syncPaymentId, setSyncPaymentId] = useState('');
  const [isSyncingPayment, setIsSyncingPayment] = useState(false);

  // =========================================================================
  // ESTADOS ABA 2: CATÁLOGO DE PRODUTOS (GET /product?activeOnly=false)
  // =========================================================================
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategoryDTO[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal de Produto (Criar / Editar)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCodeService, setProdCodeService] = useState('');
  const [prodCategory, setProdCategory] = useState('TICKET');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodColor, setProdColor] = useState('#10B981');
  const [prodActive, setProdActive] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // =========================================================================
  // ESTADOS ABA 3: GESTÃO DE USUÁRIOS (GET /users)
  // =========================================================================
  const [usersList, setUsersList] = useState<AdminUserDTO[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalElements, setUserTotalElements] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // =========================================================================
  // ESTADOS ABA 4: CONFIGURAÇÕES DINÂMICAS (GET /config & PUT /config/{key})
  // =========================================================================
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [editedConfigs, setEditedConfigs] = useState<Record<string, string>>({});
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({});
  const [revealedSecretKeys, setRevealedSecretKeys] = useState<Record<string, boolean>>({});
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
  const [savingConfigKey, setSavingConfigKey] = useState<string | null>(null);
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigValue, setNewConfigValue] = useState('');
  const [newConfigDescription, setNewConfigDescription] = useState('');
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Checa saúde do servidor (/actuator/health)
  const checkHealth = useCallback(async () => {
    try {
      const res = await api<{ status: string }>('/actuator/health', { skipAuthRedirect: true });
      setHealthStatus(res?.status === 'UP' ? 'UP' : 'DOWN');
    } catch {
      setHealthStatus('DOWN');
    }
  }, []);

  // Carrega métricas do Dashboard (/admin/dashboard)
  const fetchDashboardMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const data = await api<AdminDashboardMetrics>('/admin/dashboard');
      setMetrics(data);
    } catch (err: any) {
      toast.error(err.message || 'Falha ao carregar métricas do dashboard.');
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [toast]);

  // Carrega produtos (incluindo inativos) e categorias dinâmicas
  const fetchProductsAndCategories = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const [prods, cats] = await Promise.all([
        api<Product[]>('/product?activeOnly=false'),
        api<ProductCategoryDTO[]>('/product/categories').catch(() => []),
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar catálogo administrativo.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [toast]);

  // Carrega usuários paginados (/users)
  const fetchUsers = useCallback(
    async (search = userSearch, page = userPage) => {
      setIsLoadingUsers(true);
      try {
        const res = await api<PageResponse<AdminUserDTO>>('/users', {
          params: {
            search: search.trim(),
            page: String(page),
            size: '10',
          },
        });
        setUsersList(Array.isArray(res?.content) ? res.content : []);
        setUserTotalPages(res?.totalPages || 1);
        setUserTotalElements(res?.totalElements || 0);
      } catch (err: any) {
        toast.error(err.message || 'Erro ao listar usuários.');
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [userSearch, userPage, toast]
  );

  // Carrega configurações dinâmicas (/config)
  const fetchConfigs = useCallback(async () => {
    setIsLoadingConfigs(true);
    try {
      const data = await api<SystemConfigItem[]>('/config');
      const list = Array.isArray(data) ? data : [];
      setConfigs(list);
      const initialMap: Record<string, string> = {};
      const initialDescMap: Record<string, string> = {};
      list.forEach((c) => {
        initialMap[c.configKey] = c.configValue;
        initialDescMap[c.configKey] = c.description || '';
      });
      setEditedConfigs(initialMap);
      setEditedDescriptions(initialDescMap);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar configurações dinâmicas.');
    } finally {
      setIsLoadingConfigs(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') return;
    checkHealth();
    fetchDashboardMetrics();
    fetchProductsAndCategories();
  }, [isAuthenticated, user, checkHealth, fetchDashboardMetrics, fetchProductsAndCategories]);

  useEffect(() => {
    if (activeAdminTab === 'USERS') {
      fetchUsers(userSearch, userPage);
    } else if (activeAdminTab === 'CONFIG') {
      fetchConfigs();
    }
  }, [activeAdminTab, userPage, fetchUsers, fetchConfigs, userSearch]);

  // Sincronização manual de pagamento com a STN (POST /admin/payments/{paymentId}/sync)
  const handleSyncPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncPaymentId.trim()) {
      toast.error('Informe o UUID interno do pagamento.');
      return;
    }

    setIsSyncingPayment(true);
    try {
      const res = await api<{ message: string }>(`/admin/payments/${syncPaymentId.trim()}/sync`, {
        method: 'POST',
      });
      toast.success(res?.message || 'Sincronização com a STN disparada com sucesso!');
      setSyncPaymentId('');
      fetchDashboardMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao sincronizar pagamento com a STN.');
    } finally {
      setIsSyncingPayment(false);
    }
  };

  // Abre modal de criação ou edição de produto
  const handleOpenProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProdTitle(product.title);
      setProdPrice(
        new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(product.price)
      );
      setProdDesc(product.description || '');
      setProdCodeService(product.codeService);
      setProdCategory(product.category || 'TICKET');
      setProdImageUrl(product.imageUrl || '');
      setProdColor(product.color || '#10B981');
      setProdActive(product.active);
    } else {
      setEditingProduct(null);
      setProdTitle('');
      setProdPrice('');
      setProdDesc('');
      setProdCodeService('');
      setProdCategory(categories[0]?.key || 'TICKET');
      setProdImageUrl('');
      setProdColor('#10B981');
      setProdActive(true);
    }
    setIsProductModalOpen(true);
  };

  const handlePriceInput = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setProdPrice('');
      return;
    }
    const num = parseFloat(clean) / 100;
    setProdPrice(
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num)
    );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(prodPrice.replace(/\./g, '').replace(',', '.'));
    if (!prodTitle.trim() || isNaN(parsedPrice) || parsedPrice <= 0 || !prodCodeService.trim()) {
      toast.error('Preencha título, preço válido e código SISGRU.');
      return;
    }

    setIsSavingProduct(true);
    try {
      const payload = {
        title: prodTitle.trim(),
        description: prodDesc.trim(),
        price: parsedPrice,
        codeService: prodCodeService.trim(),
        category: prodCategory,
        imageUrl: prodImageUrl.trim() || null,
        color: prodColor,
        active: prodActive,
      };

      if (editingProduct) {
        await api(`/product/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Produto atualizado com sucesso!');
      } else {
        await api('/product', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Novo produto cadastrado no catálogo SISGRU!');
      }

      setIsProductModalOpen(false);
      fetchProductsAndCategories();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar produto.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleToggleProductActive = async (product: Product) => {
    try {
      if (product.active) {
        await api(`/product/${product.id}`, { method: 'DELETE' });
        toast.success(`"${product.title}" desativado logicamente.`);
      } else {
        await api(`/product/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: product.title,
            description: product.description || '',
            price: product.price,
            codeService: product.codeService,
            category: product.category,
            imageUrl: product.imageUrl || null,
            color: product.color || '#10B981',
            active: true,
          }),
        });
        toast.success(`"${product.title}" reativado no catálogo!`);
      }
      fetchProductsAndCategories();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao alterar status do produto.');
    }
  };

  // Alterar Role de Usuário (PATCH /users/{id}/role)
  const handleToggleUserRole = async (u: AdminUserDTO) => {
    const nextRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setUpdatingUserId(u.id);
    try {
      await api(`/users/${u.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      toast.success(`Perfil de ${u.name} alterado para ${nextRole}!`);
      fetchUsers(userSearch, userPage);
    } catch (err: any) {
      toast.error(err.message || 'Operação bloqueada pelas regras de segurança.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Alterar Status Ativo/Inativo de Usuário (PATCH /users/{id}/status)
  const handleToggleUserStatus = async (u: AdminUserDTO) => {
    const nextActive = !u.active;
    setUpdatingUserId(u.id);
    try {
      await api(`/users/${u.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active: nextActive }),
      });
      toast.success(`Conta de ${u.name} ${nextActive ? 'ativada' : 'desativada'}!`);
      fetchUsers(userSearch, userPage);
    } catch (err: any) {
      toast.error(err.message || 'Operação bloqueada pelas regras de segurança.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Salvar Configuração Dinâmica (PUT /config/{key})
  const handleSaveConfig = async (key: string) => {
    const value = editedConfigs[key] ?? '';
    const description = editedDescriptions[key];
    setSavingConfigKey(key);
    try {
      await api(`/config/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value, description }),
      });
      await refreshConfigs();
      toast.success(`Parâmetro "${key}" atualizado em tempo real!`);
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar configuração.');
    } finally {
      setSavingConfigKey(null);
    }
  };

  // Criar Novo Parâmetro de Configuração Dinâmica (PUT /config/{key})
  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = newConfigKey.trim();
    if (!key) {
      toast.error('Informe a chave do parâmetro (ex: order.abandoned_days).');
      return;
    }
    setIsCreatingConfig(true);
    try {
      await api(`/config/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({
          value: newConfigValue.trim(),
          description: newConfigDescription.trim() || 'Configuração dinâmica',
        }),
      });
      await refreshConfigs();
      toast.success(`Parâmetro "${key}" registrado com sucesso!`);
      setNewConfigKey('');
      setNewConfigValue('');
      setNewConfigDescription('');
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar parâmetro de configuração.');
    } finally {
      setIsCreatingConfig(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.codeService.includes(searchQuery);
      const matchesCategory =
        categoryFilter === 'ALL' || p.category?.toUpperCase() === categoryFilter.toUpperCase();
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && p.active) ||
        (statusFilter === 'INACTIVE' && !p.active);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const exchangeRatePercent =
    metrics && metrics.totalTicketsBought > 0
      ? Math.min(
          100,
          Math.round((metrics.totalTicketsExchanged / metrics.totalTicketsBought) * 100)
        )
      : 0;

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* CABEÇALHO DA CENTRAL ADMINISTRATIVA + MONITOR DE SAÚDE (/actuator/health) */}
        <div className="neo-card p-6 bg-white border-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="neo-badge bg-neo-accent text-white border-neo-dark">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1" /> Central Administrativa IFNMG
              </span>
              <span
                className={`px-2.5 py-0.5 border-2 border-neo-dark font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 ${
                  healthStatus === 'UP'
                    ? 'bg-emerald-300 text-neo-dark'
                    : healthStatus === 'CHECKING'
                      ? 'bg-amber-200 text-neo-dark'
                      : 'bg-rose-300 text-rose-950'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                API & Banco: {healthStatus === 'UP' ? 'ONLINE (UP)' : healthStatus}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-neo-dark">
              Governança Financeira, Catálogo SISGRU & Operações
            </h1>
            <p className="text-xs text-slate-600 font-sans">
              Gerencie indicadores de arrecadação da STN, produtos, permissões de usuários e
              parâmetros em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/guiche')}
              className="neo-btn bg-neo-yellow text-neo-dark py-2.5 px-4 text-xs font-heading font-bold uppercase cursor-pointer"
            >
              Ir para Guichê POS
            </button>
          </div>
        </div>

        {/* BARRA DE ABAS DA CENTRAL ADMINISTRATIVA */}
        <div className="flex flex-wrap gap-2 border-b-3 border-neo-dark pb-3">
          <button
            type="button"
            onClick={() => setActiveAdminTab('DASHBOARD')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase border-2 border-neo-dark flex items-center gap-2 cursor-pointer transition-all ${
              activeAdminTab === 'DASHBOARD'
                ? 'bg-neo-brand text-white shadow-neo-xs'
                : 'bg-white text-neo-dark hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Dashboard & Sync STN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('PRODUCTS')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase border-2 border-neo-dark flex items-center gap-2 cursor-pointer transition-all ${
              activeAdminTab === 'PRODUCTS'
                ? 'bg-neo-yellow text-neo-dark shadow-neo-xs'
                : 'bg-white text-neo-dark hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>2. Catálogo de Produtos ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('USERS')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase border-2 border-neo-dark flex items-center gap-2 cursor-pointer transition-all ${
              activeAdminTab === 'USERS'
                ? 'bg-neo-accent text-white shadow-neo-xs'
                : 'bg-white text-neo-dark hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Gestão de Usuários</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminTab('CONFIG')}
            className={`px-4 py-2.5 text-xs font-heading font-bold uppercase border-2 border-neo-dark flex items-center gap-2 cursor-pointer transition-all ${
              activeAdminTab === 'CONFIG'
                ? 'bg-neo-dark text-white shadow-neo-xs'
                : 'bg-white text-neo-dark hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>4. Configurações Dinâmicas</span>
          </button>
        </div>

        {/* =====================================================================
            ABA 1: DASHBOARD ANALÍTICO & CONCILIAÇÃO FORÇADA STN
           ===================================================================== */}
        {activeAdminTab === 'DASHBOARD' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="neo-card p-5 bg-emerald-50 border-3 border-neo-dark">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-heading font-bold uppercase text-emerald-900">
                    Receita Confirmada (STN)
                  </span>
                  <DollarSign className="w-5 h-5 text-neo-brand" />
                </div>
                <p className="text-2xl font-mono font-bold text-neo-dark mt-2">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(metrics?.totalRevenue || 0)}
                </p>
              </div>

              <div className="neo-card p-5 bg-amber-50 border-3 border-neo-dark">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-heading font-bold uppercase text-amber-900">
                    Tíquetes Comprados
                  </span>
                  <Ticket className="w-5 h-5 text-neo-dark" />
                </div>
                <p className="text-2xl font-mono font-bold text-neo-dark mt-2">
                  {metrics?.totalTicketsBought ?? 0} un.
                </p>
              </div>

              <div className="neo-card p-5 bg-blue-50 border-3 border-neo-dark">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-heading font-bold uppercase text-blue-900">
                    Tíquetes Trocados no Guichê
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-blue-700" />
                </div>
                <p className="text-2xl font-mono font-bold text-neo-dark mt-2">
                  {metrics?.totalTicketsExchanged ?? 0} un. ({exchangeRatePercent}%)
                </p>
              </div>

              <div className="neo-card p-5 bg-white border-3 border-neo-dark">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-heading font-bold uppercase text-slate-600">
                    Total de Pedidos
                  </span>
                  <Package className="w-5 h-5 text-neo-dark" />
                </div>
                <p className="text-2xl font-mono font-bold text-neo-dark mt-2">
                  {metrics?.totalOrders ?? 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição de Pedidos por Status */}
              <div className="neo-card p-6 bg-white border-3 space-y-4">
                <div className="flex justify-between items-center border-b-2 border-neo-dark pb-2">
                  <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                    Distribuição de Pedidos por Status
                  </h3>
                  <button
                    type="button"
                    onClick={fetchDashboardMetrics}
                    disabled={isLoadingMetrics}
                    className="text-xs font-mono font-bold text-neo-brand hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>

                <div className="space-y-2.5">
                  {metrics?.ordersByStatus &&
                    Object.entries(metrics.ordersByStatus).map(([statusKey, count]) => {
                      const desc = metrics.ordersByStatusDescriptions?.[statusKey];
                      return (
                        <div
                          key={statusKey}
                          className="p-3 bg-slate-50 border-2 border-neo-dark flex justify-between items-center font-mono text-xs"
                        >
                          <div>
                            <span className="font-bold text-neo-dark uppercase">
                              {desc || statusKey}
                            </span>
                            {desc && (
                              <span className="ml-2 text-[10px] text-slate-500">({statusKey})</span>
                            )}
                          </div>
                          <span className="px-2.5 py-0.5 bg-neo-yellow border border-neo-dark font-bold">
                            {count} pedido(s)
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Ferramenta de Sincronização Forçada com a STN */}
              <div className="neo-card p-6 bg-white border-3 space-y-4">
                <h3 className="font-heading font-bold text-sm uppercase text-neo-dark border-b-2 border-neo-dark pb-2">
                  ⚡ Conciliação Bancária Forçada com a STN (POST /admin/payments/:id/sync)
                </h3>
                <p className="text-xs text-slate-600 font-sans leading-relaxed">
                  Caso um contribuinte tenha acabado de pagar uma guia e o webhook governamental
                  sofra atraso de rede, informe o <strong>UUID interno da fatura</strong> abaixo
                  para consultar diretamente a API da Secretaria do Tesouro Nacional e liberar os
                  tíquetes na hora.
                </p>

                <form onSubmit={handleSyncPayment} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                      UUID do Pagamento Local *
                    </label>
                    <input
                      type="text"
                      required
                      value={syncPaymentId}
                      onChange={(e) => setSyncPaymentId(e.target.value)}
                      placeholder="Ex: c8a5a544-d886-4f40-8bcf-543cbda15b71"
                      className="neo-input font-mono text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSyncingPayment}
                    className="w-full neo-btn-primary py-3 text-xs font-heading font-bold uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingPayment ? 'animate-spin' : ''}`} />
                    <span>
                      {isSyncingPayment
                        ? 'Consultando PagTesouro STN...'
                        : 'Forçar Sincronização com a STN'}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ABA 2: CATÁLOGO DE PRODUTOS (COM INATIVOS, COLOR E IMAGEURL)
           ===================================================================== */}
        {activeAdminTab === 'PRODUCTS' && (
          <div className="neo-card p-6 bg-white border-3 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b-2 border-neo-dark">
              <div>
                <h2 className="font-heading font-bold text-base uppercase text-neo-dark">
                  Gestão Completa do Catálogo SISGRU (Ativos e Inativos)
                </h2>
                <p className="text-xs text-slate-500 font-sans">
                  Configure título, código de serviço SISGRU, cor visual do card e imagem.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenProductModal()}
                className="neo-btn-primary py-2.5 px-4 text-xs font-heading font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Produto / Taxa</span>
              </button>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou código SISGRU..."
                  className="neo-input neo-input-icon text-xs"
                />
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="neo-input text-xs font-mono"
              >
                <option value="ALL">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.displayName} ({c.key})
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="neo-input text-xs font-mono"
              >
                <option value="ALL">Todos os Status (Ativos + Inativos)</option>
                <option value="ACTIVE">Apenas Ativos</option>
                <option value="INACTIVE">Apenas Inativos (Desativados)</option>
              </select>
            </div>

            {isLoadingProducts ? (
              <p className="py-12 text-center font-mono text-xs text-slate-500">
                Carregando catálogo completo...
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className={`neo-card border-3 border-neo-dark overflow-hidden flex flex-col justify-between ${
                      prod.active ? 'bg-white' : 'bg-slate-100 opacity-80'
                    }`}
                  >
                    <div>
                      <div
                        className="h-3 w-full border-b-2 border-neo-dark"
                        style={{ backgroundColor: prod.color || '#10B981' }}
                      />
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span
                            className={`px-2 py-0.5 border border-neo-dark font-mono font-bold text-[10px] uppercase ${
                              prod.active ? 'bg-emerald-300 text-neo-dark' : 'bg-rose-200 text-rose-950'
                            }`}
                          >
                            {prod.active ? 'ATIVO' : 'INATIVO'}
                          </span>
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 border border-slate-300">
                            SISGRU #{prod.codeService}
                          </span>
                        </div>

                        <h3 className="font-heading font-bold text-sm text-neo-dark">
                          {prod.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {prod.description || 'Sem descrição.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-3 border-t-2 border-dashed border-slate-200 flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-neo-dark">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(prod.price)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenProductModal(prod)}
                          className="p-2 border-2 border-neo-dark bg-neo-yellow hover:bg-amber-300 cursor-pointer"
                          title="Editar produto"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-neo-dark" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleProductActive(prod)}
                          className={`p-2 border-2 border-neo-dark cursor-pointer ${
                            prod.active
                              ? 'bg-rose-100 text-rose-900 hover:bg-rose-200'
                              : 'bg-emerald-200 text-emerald-950 hover:bg-emerald-300'
                          }`}
                          title={prod.active ? 'Desativar produto' : 'Reativar produto'}
                        >
                          {prod.active ? (
                            <Trash2 className="w-3.5 h-3.5" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            ABA 3: GESTÃO DE USUÁRIOS E PERMISSÕES (GET /users, PATCH role/status)
           ===================================================================== */}
        {activeAdminTab === 'USERS' && (
          <div className="neo-card p-6 bg-white border-3 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-3 border-b-2 border-neo-dark">
              <div>
                <h2 className="font-heading font-bold text-base uppercase text-neo-dark">
                  Controle de Usuários e Permissões ({userTotalElements} cadastrados)
                </h2>
                <p className="text-xs text-slate-500">
                  O sistema bloqueia automaticamente auto-rebaixamento ou desativação do último
                  administrador ativo.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setUserPage(0);
                  fetchUsers(userSearch, 0);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nome, CPF ou e-mail..."
                  className="neo-input text-xs w-64"
                />
                <button
                  type="submit"
                  className="neo-btn-primary py-2 px-4 text-xs font-heading font-bold uppercase cursor-pointer"
                >
                  Buscar
                </button>
              </form>
            </div>

            {isLoadingUsers ? (
              <p className="py-10 text-center font-mono text-xs text-slate-500">
                Consultando base de usuários...
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="bg-neo-dark text-white uppercase text-[11px]">
                      <th className="p-3 border border-neo-dark">Nome Completo</th>
                      <th className="p-3 border border-neo-dark">CPF</th>
                      <th className="p-3 border border-neo-dark">E-mail</th>
                      <th className="p-3 border border-neo-dark">Perfil</th>
                      <th className="p-3 border border-neo-dark">Status</th>
                      <th className="p-3 border border-neo-dark text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.id} className="border-b-2 border-neo-dark hover:bg-slate-50">
                        <td className="p-3 font-bold text-neo-dark">
                          {u.name} {u.lastName}
                        </td>
                        <td className="p-3">{formatCpf(u.cpf)}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 border border-neo-dark font-bold text-[10px] ${
                              u.role === 'ADMIN' ? 'bg-neo-yellow text-neo-dark' : 'bg-slate-100'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 border border-neo-dark font-bold text-[10px] ${
                              u.active ? 'bg-emerald-300 text-neo-dark' : 'bg-rose-200 text-rose-950'
                            }`}
                          >
                            {u.active ? 'ATIVO' : 'BLOQUEADO'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            disabled={updatingUserId === u.id}
                            onClick={() => handleToggleUserRole(u)}
                            className="px-2.5 py-1 border-2 border-neo-dark bg-white hover:bg-neo-yellow font-bold text-[10px] uppercase cursor-pointer"
                          >
                            {u.role === 'ADMIN' ? 'Tornar USER' : 'Promover ADMIN'}
                          </button>
                          <button
                            type="button"
                            disabled={updatingUserId === u.id}
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2.5 py-1 border-2 border-neo-dark font-bold text-[10px] uppercase cursor-pointer ${
                              u.active
                                ? 'bg-rose-100 text-rose-950 hover:bg-rose-200'
                                : 'bg-emerald-200 text-emerald-950 hover:bg-emerald-300'
                            }`}
                          >
                            {u.active ? (
                              <>
                                <UserX className="w-3 h-3 inline mr-1" /> Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3 inline mr-1" /> Ativar
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação de Usuários */}
            <div className="flex justify-between items-center pt-2 text-xs font-mono">
              <span>
                Página {userPage + 1} de {Math.max(1, userTotalPages)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={userPage <= 0}
                  onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                  className="neo-btn bg-white py-1.5 px-3 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={userPage + 1 >= userTotalPages}
                  onClick={() => setUserPage((p) => p + 1)}
                  className="neo-btn bg-white py-1.5 px-3 text-xs disabled:opacity-50 cursor-pointer"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            ABA 4: CONFIGURAÇÕES DINÂMICAS DO SISTEMA (GET /config & PUT /config/:key)
           ===================================================================== */}
        {activeAdminTab === 'CONFIG' && (
          <div className="space-y-6">
            {/* Formulário para Adicionar / Cadastrar Novo Parâmetro Dinâmico */}
            <div className="neo-card p-6 bg-white border-3 space-y-4">
              <div className="pb-3 border-b-2 border-neo-dark flex justify-between items-center">
                <div>
                  <h2 className="font-heading font-bold text-base uppercase text-neo-dark flex items-center gap-2">
                    <Plus className="w-4 h-4 text-neo-brand" /> Adicionar Novo Parâmetro de
                    Configuração
                  </h2>
                  <p className="text-xs text-slate-600 font-sans">
                    Registre uma nova chave operacional ou institucional diretamente no banco de
                    dados e no cache da API.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleCreateConfig}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
              >
                <div>
                  <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                    Chave (configKey) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newConfigKey}
                    onChange={(e) => setNewConfigKey(e.target.value)}
                    placeholder="Ex: institution.phone"
                    className="neo-input font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                    Valor (configValue) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newConfigValue}
                    onChange={(e) => setNewConfigValue(e.target.value)}
                    placeholder="Valor da configuração"
                    className="neo-input font-mono text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={newConfigDescription}
                      onChange={(e) => setNewConfigDescription(e.target.value)}
                      placeholder="Finalidade do parâmetro"
                      className="neo-input text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingConfig}
                    className="neo-btn-primary py-2.5 px-4 text-xs font-heading font-bold uppercase self-end cursor-pointer"
                  >
                    {isCreatingConfig ? 'Criando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Parâmetros Ativos vindos de GET /config */}
            <div className="neo-card p-6 bg-white border-3 space-y-4">
              <div className="pb-3 border-b-2 border-neo-dark flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="font-heading font-bold text-base uppercase text-neo-dark">
                    ⚙️ Parâmetros Operacionais & Institucionais ({configs.length} ativos)
                  </h2>
                  <p className="text-xs text-slate-600 font-sans">
                    Qualquer alteração salva aqui atualiza imediatamente o banco PostgreSQL, os
                    serviços do Back-end e a interface do portal sem reiniciar o servidor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchConfigs}
                  disabled={isLoadingConfigs}
                  className="neo-btn bg-white hover:bg-slate-100 py-1.5 px-3 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingConfigs ? 'animate-spin' : ''}`} />
                  <span>Recarregar</span>
                </button>
              </div>

              {isLoadingConfigs ? (
                <p className="py-10 text-center font-mono text-xs text-slate-500">
                  Carregando parâmetros do sistema...
                </p>
              ) : (
                <div className="space-y-4">
                  {configs.map((cfg) => {
                    const isSensitive = cfg.configKey.toLowerCase().includes('token');
                    const isRevealed = !!revealedSecretKeys[cfg.configKey];

                    return (
                      <div
                        key={cfg.configKey}
                        className="p-4 bg-slate-50 border-2 border-neo-dark space-y-2.5"
                      >
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-neo-dark text-neo-yellow font-mono font-bold text-xs">
                              {cfg.configKey}
                            </span>
                            {isSensitive && (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 border border-rose-950 font-mono text-[10px] font-bold uppercase">
                                Sensível / Protegido
                              </span>
                            )}
                          </div>
                          {cfg.updatedAt && (
                            <span className="text-[10px] font-mono text-slate-500">
                              Última atualização: {new Date(cfg.updatedAt).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 pt-1 items-end">
                          <div className="lg:col-span-5">
                            <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                              Descrição do Parâmetro
                            </label>
                            <input
                              type="text"
                              value={editedDescriptions[cfg.configKey] ?? cfg.description ?? ''}
                              onChange={(e) =>
                                setEditedDescriptions((prev) => ({
                                  ...prev,
                                  [cfg.configKey]: e.target.value,
                                }))
                              }
                              className="neo-input text-xs bg-white"
                            />
                          </div>

                          <div className="lg:col-span-5 relative">
                            <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                              Valor em Tempo de Execução
                            </label>
                            <input
                              type={isSensitive && !isRevealed ? 'password' : 'text'}
                              value={editedConfigs[cfg.configKey] ?? cfg.configValue}
                              onChange={(e) =>
                                setEditedConfigs((prev) => ({
                                  ...prev,
                                  [cfg.configKey]: e.target.value,
                                }))
                              }
                              placeholder={
                                isSensitive ? 'Deixe vazio para usar o token do ambiente (.env)' : ''
                              }
                              className="neo-input font-mono text-xs bg-white pr-9"
                            />
                            {isSensitive && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedSecretKeys((prev) => ({
                                    ...prev,
                                    [cfg.configKey]: !prev[cfg.configKey],
                                  }))
                                }
                                className="absolute right-2.5 bottom-2.5 text-slate-500 hover:text-neo-dark cursor-pointer"
                                title={isRevealed ? 'Ocultar token' : 'Exibir token'}
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>

                          <div className="lg:col-span-2">
                            <button
                              type="button"
                              disabled={savingConfigKey === cfg.configKey}
                              onClick={() => handleSaveConfig(cfg.configKey)}
                              className="w-full neo-btn-primary py-2.5 px-3 text-xs font-heading font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                              <span>
                                {savingConfigKey === cfg.configKey ? 'Salvando...' : 'Salvar'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE PRODUTO (COM COLOR E IMAGEURL) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg neo-card bg-white border-3 border-neo-dark overflow-hidden">
            <div className="p-4 bg-neo-yellow border-b-3 border-neo-dark flex justify-between items-center">
              <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                {editingProduct ? 'Editar Produto SISGRU' : 'Cadastrar Novo Produto SISGRU'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 border-2 border-neo-dark bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                  Título Comercial *
                </label>
                <input
                  type="text"
                  required
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  placeholder="Ex: Almoço - Restaurante Universitário"
                  className="neo-input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodPrice}
                    onChange={(e) => handlePriceInput(e.target.value)}
                    placeholder="2,50"
                    className="neo-input font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                    Código Serviço SISGRU *
                  </label>
                  <input
                    type="text"
                    required
                    value={prodCodeService}
                    onChange={(e) => setProdCodeService(e.target.value)}
                    placeholder="Ex: 028031"
                    className="neo-input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                    Categoria Oficial *
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="neo-input text-xs font-mono"
                  >
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.displayName} ({c.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                    <Palette className="w-3.5 h-3.5 inline mr-1" /> Cor Visual do Card
                  </label>
                  <div className="flex items-center gap-1.5">
                    {presetColors.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setProdColor(hex)}
                        className={`w-6 h-6 border-2 cursor-pointer ${
                          prodColor === hex ? 'border-neo-dark scale-110' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <input
                      type="color"
                      value={prodColor}
                      onChange={(e) => setProdColor(e.target.value)}
                      className="w-7 h-7 border border-neo-dark cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                  <ImageIcon className="w-3.5 h-3.5 inline mr-1" /> URL da Imagem (Opcional)
                </label>
                <input
                  type="url"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  placeholder="https://meuservidor.edu.br/imagens/almoco.png"
                  className="neo-input font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold uppercase text-slate-700 mb-1">
                  Descrição Comercial
                </label>
                <textarea
                  rows={3}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Detalhes sobre o serviço ou refeição..."
                  className="neo-input text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodActive}
                  onChange={(e) => setProdActive(e.target.checked)}
                  className="accent-neo-brand w-4 h-4"
                />
                <span>Produto ativo e visível na vitrine pública</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t-2 border-neo-dark">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="neo-btn bg-white py-2 px-4 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="neo-btn-primary py-2 px-5 text-xs font-heading font-bold uppercase cursor-pointer"
                >
                  {isSavingProduct ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
