import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Package, 
  Check, 
  AlertTriangle, 
  ArrowLeft,
  Edit2,
  Search,
  SlidersHorizontal,
  Eye,
  DollarSign,
  Tag,
  Building
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';

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

export function AdminProducts() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'TICKET' | 'FINE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Estados do Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductCodeService, setNewProductCodeService] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<'TICKET' | 'FINE'>('TICKET');
  const [newProductImage, setNewProductImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados do Modal de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductPrice, setEditProductPrice] = useState('');
  const [editProductDesc, setEditProductDesc] = useState('');
  const [editProductCodeService, setEditProductCodeService] = useState('');
  const [editProductCategory, setEditProductCategory] = useState<'TICKET' | 'FINE'>('TICKET');
  const [editProductImage, setEditProductImage] = useState('');
  const [editProductActive, setEditProductActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Formata preço em tempo real
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const cleanValue = e.target.value.replace(/\D/g, '');
    if (!cleanValue) {
      if (isEdit) setEditProductPrice('');
      else setNewProductPrice('');
      return;
    }
    const numericValue = parseFloat(cleanValue) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);

    if (isEdit) setEditProductPrice(formatted);
    else setNewProductPrice(formatted);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditProductName(product.title);
    setEditProductPrice(new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(product.price));
    setEditProductDesc(product.description || '');
    setEditProductCodeService(product.codeService);
    setEditProductCategory(product.category);
    setEditProductImage(product.image || '');
    setEditProductActive(product.active);
    setIsEditModalOpen(true);
  };

  // Proteção de rota
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Busca catálogo completo
  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api<Product[]>('/product');
      setProducts(data);
    } catch (err: any) {
      console.warn("Catálogo administrativo operando com dados em cache/local:", err);
      setError('Falha ao sincronizar com banco central. Exibindo dados locais.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchProducts();
    }
  }, [isAuthenticated, user]);

  // Cadastra novo produto
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductCodeService) {
      toast.error('Preencha os campos obrigatórios do produto.');
      return;
    }

    const normalizedPrice = newProductPrice.replace(/\./g, '').replace(',', '.');
    const parsedPrice = parseFloat(normalizedPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Informe um valor numérico válido.');
      return;
    }

    setIsSaving(true);
    try {
      await api<Product>('/product', {
        method: 'POST',
        body: JSON.stringify({
          title: newProductName,
          price: parsedPrice,
          description: newProductDesc,
          image: newProductImage || '',
          active: true,
          codeService: newProductCodeService,
          category: newProductCategory,
        }),
      });

      toast.success(`"${newProductName}" cadastrado com sucesso!`);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductDesc('');
      setNewProductCodeService('');
      setNewProductImage('');
      setNewProductCategory('TICKET');
      setIsModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao cadastrar produto.');
    } finally {
      setIsSaving(false);
    }
  };

  // Atualiza produto
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editProductName || !editProductPrice || !editProductCodeService) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const normalizedPrice = editProductPrice.replace(/\./g, '').replace(',', '.');
    const parsedPrice = parseFloat(normalizedPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Informe um valor numérico válido.');
      return;
    }

    setIsUpdating(true);
    try {
      await api<Product>(`/product/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editProductName,
          price: parsedPrice,
          description: editProductDesc,
          image: editProductImage || '',
          active: editProductActive,
          codeService: editProductCodeService,
          category: editProductCategory,
        }),
      });

      toast.success(`"${editProductName}" atualizado com sucesso!`);
      setIsEditModalOpen(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao atualizar produto.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Soft-delete com confirmação customizada
  const handleDeleteProduct = (productId: string, productName: string) => {
    toast.confirm({
      title: 'Desativar Produto?',
      message: `Deseja realmente desativar o produto "${productName}"? O histórico fiscal no banco de dados será preservado, mas novos pedidos não poderão ser emitidos na loja.`,
      confirmText: 'Sim, Desativar',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api<void>(`/product/${productId}`, { method: 'DELETE' });
          toast.success(`"${productName}" desativado com sucesso (Soft-delete).`);
          fetchProducts();
        } catch (err: any) {
          toast.error(err.message || 'Falha ao desativar produto.');
        }
      }
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.codeService.includes(searchQuery);
      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || 
                            (statusFilter === 'ACTIVE' && p.active) || 
                            (statusFilter === 'INACTIVE' && !p.active);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  const totalActive = products.filter(p => p.active).length;
  const totalInactive = products.filter(p => !p.active).length;

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        
        {/* CABEÇALHO ADMINISTRATIVO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 neo-card border-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-2xl text-neo-dark uppercase tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-7 h-7 text-neo-yellow" /> Gestão de Produtos & Taxas
              </h1>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">
              Catálogo oficial de arrecadação do IFNMG Campus Salinas • Integração SISGRU / STN
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/guiche')}
              className="neo-btn bg-white hover:bg-slate-100 text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Ir ao Guichê
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="neo-btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>
        </div>

        {/* CARDS DE KPIS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white border-2 border-neo-dark shadow-neo-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">Total de Itens</span>
            <span className="text-2xl font-mono font-bold text-neo-dark">{products.length}</span>
          </div>

          <div className="p-4 bg-emerald-50 border-2 border-neo-dark shadow-neo-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block">Ativos na Vitrine</span>
            <span className="text-2xl font-mono font-bold text-emerald-950">{totalActive}</span>
          </div>

          <div className="p-4 bg-rose-50 border-2 border-neo-dark shadow-neo-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-rose-800 block">Desativados</span>
            <span className="text-2xl font-mono font-bold text-rose-950">{totalInactive}</span>
          </div>

          <div className="p-4 bg-blue-50 border-2 border-neo-dark shadow-neo-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-blue-800 block">Categorias</span>
            <span className="text-2xl font-mono font-bold text-blue-950">2</span>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 neo-card border-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou código SISGRU..."
              className="neo-input neo-input-icon text-xs font-sans"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="neo-input text-xs font-bold py-2 w-auto"
            >
              <option value="ALL">Todas Categorias</option>
              <option value="TICKET">🎫 Tíquetes</option>
              <option value="FINE">💸 Multas</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="neo-input text-xs font-bold py-2 w-auto"
            >
              <option value="ALL">Todos Status</option>
              <option value="ACTIVE">🟢 Ativos</option>
              <option value="INACTIVE">🔴 Inativos</option>
            </select>
          </div>
        </div>

        {/* TABELA DE PRODUTOS */}
        <div className="neo-card p-6 bg-white border-3">
          <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-neo-dark">
            <h2 className="font-heading font-bold text-base uppercase flex items-center gap-2 text-neo-dark">
              <Package className="w-5 h-5 text-neo-brand" /> Catálogo Cadastrado
            </h2>
            <span className="text-xs font-mono text-slate-500 font-bold">
              {filteredProducts.length} listados
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center font-mono text-xs text-slate-500">
              Carregando produtos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-300">
              <p className="font-heading font-bold text-xs uppercase text-slate-500">
                Nenhum produto encontrado com os filtros atuais.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-3 border-neo-dark text-left bg-slate-100 text-xs font-heading font-bold uppercase">
                    <th className="p-3">Serviço / Produto</th>
                    <th className="p-3">Código SISGRU</th>
                    <th className="p-3">Preço Unitário</th>
                    <th className="p-3">Situação</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`neo-badge ${
                              prod.category === 'TICKET'
                                ? 'bg-neo-yellow text-neo-dark'
                                : 'bg-neo-accent-light text-neo-accent border-neo-dark'
                            }`}
                          >
                            {prod.category === 'TICKET' ? '🎫 Tíquete' : '💸 Multa'}
                          </span>
                          <div>
                            <span className="font-bold text-sm text-neo-dark block">{prod.title}</span>
                            {prod.description && (
                              <span className="text-[11px] text-slate-500 line-clamp-1">{prod.description}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-xs font-bold text-slate-600">
                        #{prod.codeService}
                      </td>

                      <td className="p-3 font-mono font-bold text-sm text-neo-dark">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                      </td>

                      <td className="p-3">
                        <span
                          className={`neo-badge ${
                            prod.active
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-950'
                              : 'bg-rose-100 text-rose-950 border-rose-950'
                          }`}
                        >
                          {prod.active ? '🟢 Ativo' : '🔴 Desativado'}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="neo-btn bg-neo-yellow hover:bg-neo-yellow-hover text-neo-dark py-1.5 px-3 text-xs"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </button>
                          {prod.active && (
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.title)}
                              className="neo-btn bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-950 py-1.5 px-3 text-xs"
                              title="Desativar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL DE CADASTRO COM LIVE PREVIEW */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-neo-dark/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="w-full max-w-2xl bg-white border-3 border-neo-dark p-6 shadow-neo-xl animate-fade-in max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-center pb-3 mb-5 border-b-2 border-neo-dark">
                <h3 className="font-heading font-bold text-lg uppercase flex items-center gap-2 text-neo-dark">
                  <Package className="w-6 h-6 text-neo-brand" /> Cadastrar Novo Produto
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-neo-dark font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Formulário */}
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Título do Serviço / Tíquete *
                    </label>
                    <input
                      type="text"
                      required
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Ex: Tíquete Almoço Estudante"
                      className="neo-input text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Preço em R$ *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProductPrice}
                        onChange={(e) => handlePriceChange(e, false)}
                        placeholder="Ex: 3,50"
                        className="neo-input text-xs font-mono text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Código SISGRU *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProductCodeService}
                        onChange={(e) => setNewProductCodeService(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 101"
                        className="neo-input text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Categoria do Produto
                    </label>
                    <select
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value as any)}
                      className="neo-input text-xs font-bold"
                    >
                      <option value="TICKET">🎫 Tíquete (Refeitório)</option>
                      <option value="FINE">💸 Multa / Taxa (Biblioteca)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Descrição Opcional
                    </label>
                    <textarea
                      value={newProductDesc}
                      onChange={(e) => setNewProductDesc(e.target.value)}
                      placeholder="Informações para o estudante..."
                      className="neo-input text-xs h-20 resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-3 border-t-2 border-dashed border-slate-300">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 neo-btn bg-slate-100 hover:bg-slate-200 text-xs py-2.5"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 neo-btn-primary text-xs py-2.5"
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Produto'}
                    </button>
                  </div>
                </form>

                {/* LIVE PREVIEW CARD */}
                <div className="p-4 bg-slate-50 border-2 border-neo-dark space-y-3">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    👁️ Pré-visualização na Vitrine
                  </span>

                  <div className="neo-card p-4 border-3 border-neo-dark bg-white shadow-neo-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`neo-badge ${newProductCategory === 'TICKET' ? 'bg-neo-yellow text-neo-dark' : 'bg-neo-accent-light text-neo-accent'}`}>
                        {newProductCategory === 'TICKET' ? '🎫 Tíquete' : '💸 Taxa'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        SISGRU #{newProductCodeService || '---'}
                      </span>
                    </div>

                    <h4 className="font-heading font-bold text-sm text-neo-dark mb-1">
                      {newProductName || 'Título do Produto'}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                      {newProductDesc || 'Descrição e instruções de recolhimento no campus.'}
                    </p>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-mono font-bold text-base text-neo-dark">
                        R$ {newProductPrice || '0,00'}
                      </span>
                      <span className="neo-btn-primary py-1 px-2.5 text-[10px] pointer-events-none">
                        Adicionar
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO */}
        {isEditModalOpen && editingProduct && (
          <div className="fixed inset-0 bg-neo-dark/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="w-full max-w-lg bg-white border-3 border-neo-dark p-6 shadow-neo-xl animate-fade-in">
              
              <div className="flex justify-between items-center pb-3 mb-5 border-b-2 border-neo-dark">
                <h3 className="font-heading font-bold text-lg uppercase flex items-center gap-2 text-neo-dark">
                  <Edit2 className="w-5 h-5 text-neo-brand" /> Editar Produto
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-neo-dark font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateProduct} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editProductName}
                    onChange={(e) => setEditProductName(e.target.value)}
                    className="neo-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Preço em R$ *
                    </label>
                    <input
                      type="text"
                      required
                      value={editProductPrice}
                      onChange={(e) => handlePriceChange(e, true)}
                      className="neo-input text-xs font-mono text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Código SISGRU *
                    </label>
                    <input
                      type="text"
                      required
                      value={editProductCodeService}
                      onChange={(e) => setEditProductCodeService(e.target.value.replace(/\D/g, ''))}
                      className="neo-input text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={editProductCategory}
                      onChange={(e) => setEditProductCategory(e.target.value as any)}
                      className="neo-input text-xs font-bold"
                    >
                      <option value="TICKET">🎫 Tíquete</option>
                      <option value="FINE">💸 Multa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Visibilidade
                    </label>
                    <select
                      value={editProductActive ? 'true' : 'false'}
                      onChange={(e) => setEditProductActive(e.target.value === 'true')}
                      className="neo-input text-xs font-bold"
                    >
                      <option value="true">🟢 Ativo na Loja</option>
                      <option value="false">🔴 Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={editProductDesc}
                    onChange={(e) => setEditProductDesc(e.target.value)}
                    className="neo-input text-xs h-20 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t-2 border-dashed border-slate-300">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 neo-btn bg-slate-100 hover:bg-slate-200 text-xs py-2.5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 neo-btn-primary text-xs py-2.5"
                  >
                    {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
