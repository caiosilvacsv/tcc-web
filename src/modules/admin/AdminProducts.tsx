import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShieldAlert, Package, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

interface Product {
  id: string;
  title: string; // Corrigido de name para title conforme o DTO do backend
  price: number;
  active: boolean;
  description?: string;
  codeService: string;
  category: 'TICKET' | 'FINE';
  image?: string;
}

export function AdminProducts() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductCodeService, setNewProductCodeService] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<'TICKET' | 'FINE'>('TICKET');
  const [newProductImage, setNewProductImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);

  // Formata o preço em tempo real com máscara de moeda nacional (cadastro)
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/\D/g, '');
    if (!cleanValue) {
      setNewProductPrice('');
      return;
    }
    const numericValue = parseFloat(cleanValue) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    setNewProductPrice(formatted);
  };

  // Formata o preço em tempo real com máscara de moeda nacional (edição)
  const handleEditPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value.replace(/\D/g, '');
    if (!cleanValue) {
      setEditProductPrice('');
      return;
    }
    const numericValue = parseFloat(cleanValue) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    setEditProductPrice(formatted);
  };

  // Abre o modal de edição pré-preenchido com os dados do produto real
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
    setEditSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  // Atualiza um produto existente (PUT /product/{id})
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editProductName || !editProductPrice || !editProductCodeService || !editProductCategory) {
      alert('Nome, Preço, Código de Serviço e Categoria são obrigatórios.');
      return;
    }

    // Limpa os pontos de milhar e substitui a vírgula decimal por ponto antes de converter para float
    const normalizedPrice = editProductPrice.replace(/\./g, '').replace(',', '.');
    const parsedPrice = parseFloat(normalizedPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Por favor, informe um preço numérico válido maior que zero.');
      return;
    }

    // Validação estrita do código de serviço (apenas números)
    if (!/^\d+$/.test(editProductCodeService)) {
      alert('O código de serviço deve conter apenas números.');
      return;
    }

    setIsUpdating(true);
    setEditSuccessMessage(null);

    try {
      // Chamada PUT estritamente restrita à ROLE_ADMIN no Spring Boot
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

      setEditSuccessMessage('Produto atualizado com sucesso!');
      
      // Recarrega a tabela
      await fetchProducts();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccessMessage(null);
        setEditingProduct(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Falha ao atualizar produto. Apenas administradores autorizados.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 1. Proteção de Segurança no Lado do Cliente
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // 2. Busca produtos cadastrados (ativos e inativos) ao carregar a tela
  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Faz a chamada de GET ao endpoint /product.
      // Nota técnica: A listagem pública traz apenas os ativos. 
      // Em uma rota administrativa, pode-se listar todos ou filtrar.
      const data = await api<Product[]>('/product');
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar catálogo de produtos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchProducts();
    }
  }, [isAuthenticated, user]);

  // 3. Cadastra um novo produto (POST /product)
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductCodeService || !newProductCategory) {
      alert('Nome, Preço, Código de Serviço e Categoria são obrigatórios.');
      return;
    }

    // Limpa os pontos de milhar e substitui a vírgula decimal por ponto antes de converter para float
    const normalizedPrice = newProductPrice.replace(/\./g, '').replace(',', '.');
    const parsedPrice = parseFloat(normalizedPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Por favor, informe um preço numérico válido maior que zero.');
      return;
    }

    // Validação estrita do código de serviço (apenas números)
    if (!/^\d+$/.test(newProductCodeService)) {
      alert('O código de serviço deve conter apenas números.');
      return;
    }

    setIsSaving(true);
    setSuccessMessage(null);

    try {
      // Chamada POST estritamente restrita à ROLE_ADMIN no Spring Boot
      await api<Product>('/product', {
        method: 'POST',
        body: JSON.stringify({
          title: newProductName, // Ajustado para 'title' conforme o DTO do backend
          price: parsedPrice,
          description: newProductDesc,
          image: newProductImage || '',
          active: true,
          codeService: newProductCodeService, // Adicionado conforme o DTO
          category: newProductCategory, // Adicionado conforme o DTO
        }),
      });

      setSuccessMessage('Produto cadastrado com sucesso!');
      
      // Limpa formulário
      setNewProductName('');
      setNewProductPrice('');
      setNewProductDesc('');
      setNewProductCodeService('');
      setNewProductImage('');
      setNewProductCategory('TICKET');
      
      // Recarrega a tabela e fecha o modal
      await fetchProducts();
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Falha ao cadastrar produto. Apenas administradores autorizados.');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Soft-delete de produto (DELETE /product/{id})
  const handleDeleteProduct = async (productId: string, productName: string) => {
    const confirmDelete = window.confirm(
      `Deseja realmente desativar o produto "${productName}"?\nNota: Em conformidade financeira, o registro será mantido historicamente no banco, mas não estará disponível para novas compras.`
    );
    
    if (!confirmDelete) return;

    try {
      // Faz o delete lógico no backend
      await api<void>(`/product/${productId}`, {
        method: 'DELETE',
      });
      
      alert('Produto desativado com sucesso (Soft-delete ativado).');
      fetchProducts(); // Recarrega listagem
    } catch (err: any) {
      alert(err.message || 'Falha ao desativar produto.');
    }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in">
      
      {/* Cabeçalho do Admin */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <button 
            onClick={() => navigate('/guiche')}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-neo-dark uppercase tracking-wider mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Guichê
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-neo-yellow" /> Painel de Controle Administrativo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gerenciamento oficial e cadastramento de produtos do catálogo de débitos do IFNMG.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="neo-btn-primary py-3 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Adicionar Produto
        </button>
      </div>

      {/* Exibição de Erros */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border-2 border-red-900 text-red-900 flex items-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabela de Produtos */}
      <div className="neo-card p-6 bg-white border-3">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-2 border-neo-dark pb-2">
          <Package className="w-6 h-6 text-neo-brand" /> Catálogo Geral de Produtos
        </h2>

        {isLoading ? (
          <div className="p-12 text-center font-bold text-gray-500">
            Carregando catálogo de produtos...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center font-bold text-gray-500 bg-neo-bg border-2 border-dashed border-gray-400">
            Nenhum produto cadastrado no catálogo. Clique em "Adicionar Produto" para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-3 border-neo-dark text-left bg-neo-bg">
                  <th className="p-3 font-bold text-sm">ID</th>
                  <th className="p-3 font-bold text-sm">Nome do Produto</th>
                  <th className="p-3 font-bold text-sm">Preço Unitário</th>
                  <th className="p-3 font-bold text-sm">Código SISGRU</th>
                  <th className="p-3 font-bold text-sm">Status</th>
                  <th className="p-3 font-bold text-sm text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b-2 border-gray-300 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono text-xs text-gray-500">{product.id.slice(0, 8)}...</td>
                    <td className="p-3 font-bold">
                      <span className={`px-2 py-1 border-2 border-neo-dark text-xs uppercase mr-2 ${
                        product.category === 'TICKET' ? 'bg-neo-yellow' : 'bg-sky-200'
                      }`}>
                        {product.category === 'TICKET' ? '🎫 Tíquete' : '💸 Taxa/Multa'}
                      </span>
                      {product.title}
                      {product.description && (
                        <span className="block text-xs font-normal text-gray-500 mt-0.5">
                          {product.description}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                    </td>
                    <td className="p-3 font-mono text-xs font-bold text-gray-600">
                      {product.codeService}
                    </td>
                    <td className="p-3">
                      <span 
                        className={`neo-badge text-[10px] py-0.5 px-2 border-2 ${
                          product.active 
                            ? 'bg-emerald-100 border-emerald-900 text-emerald-900' 
                            : 'bg-red-100 border-red-900 text-red-900'
                        }`}
                      >
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(product)}
                          className="neo-btn bg-neo-yellow text-neo-dark border-neo-dark hover:bg-yellow-300 text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-none font-bold"
                          title="Editar produto"
                        >
                          Editar
                        </button>
                        {product.active && (
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.title)}
                            className="neo-btn bg-red-100 text-red-900 border-red-900 hover:bg-red-200 text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-none"
                            title="Desativar produto"
                          >
                            <Trash2 className="w-4 h-4" /> Desativar
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

      {/* Modal Neo-Brutalista de Cadastro de Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neo-dark bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg neo-card p-6 bg-white border-3 animate-slide-up shadow-neo-xl">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b-3 border-neo-dark pb-3 mb-5">
              <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                <Package className="w-6 h-6 text-neo-brand" /> Cadastrar Novo Produto
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-neo-dark font-bold text-lg select-none cursor-pointer"
                disabled={isSaving}
              >
                ✕
              </button>
            </div>

            {/* Sucesso no Modal */}
            {successMessage && (
              <div className="mb-4 p-4 bg-emerald-100 border-2 border-emerald-950 text-emerald-950 font-bold text-xs flex items-center gap-2">
                <Check className="w-5 h-5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Formulário do Modal */}
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Nome do Produto / Serviço
                </label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ex: Tíquete de Almoço Estudante"
                  className="neo-input"
                  disabled={isSaving || !!successMessage}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Preço em Reais (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductPrice}
                    onChange={handlePriceChange}
                    placeholder="Ex: 2,50 (Preenchimento automático)"
                    className="neo-input font-mono text-right pr-4"
                    disabled={isSaving || !!successMessage}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Código de Serviço (SISGRU)
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductCodeService}
                    onChange={(e) => {
                      // Permite digitar apenas números
                      const value = e.target.value.replace(/\D/g, '');
                      setNewProductCodeService(value);
                    }}
                    placeholder="Ex: 101 (Apenas números)"
                    className="neo-input font-mono"
                    disabled={isSaving || !!successMessage}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Categoria do Produto
                </label>
                <select
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value as 'TICKET' | 'FINE')}
                  className="neo-input font-bold"
                  disabled={isSaving || !!successMessage}
                >
                  <option value="TICKET">🎫 TÍQUETE (Refeitório / Alimentação)</option>
                  <option value="FINE">💸 MULTA / TAXA (Biblioteca / Outros)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  URL da Imagem (Opcional)
                </label>
                <input
                  type="text"
                  value={newProductImage}
                  onChange={(e) => setNewProductImage(e.target.value)}
                  placeholder="Ex: https://link-da-imagem.com/foto.png"
                  className="neo-input"
                  disabled={isSaving || !!successMessage}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Descrição / Informações Adicionais (Opcional)
                </label>
                <textarea
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                  placeholder="Ex: Válido exclusivamente para o almoço do refeitório central."
                  className="neo-input h-24 resize-none"
                  disabled={isSaving || !!successMessage}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t-2 border-dashed border-gray-300">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 neo-btn bg-gray-100 hover:bg-gray-200"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 neo-btn-primary"
                  disabled={isSaving || !!successMessage}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal Neo-Brutalista de Edição de Produto */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-neo-dark bg-opacity-65 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg neo-card p-6 bg-white border-3 animate-slide-up shadow-neo-xl">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b-3 border-neo-dark pb-3 mb-5">
              <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                <Package className="w-6 h-6 text-neo-brand" /> Editar Produto
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-gray-500 hover:text-neo-dark font-bold text-lg select-none cursor-pointer"
                disabled={isUpdating}
              >
                ✕
              </button>
            </div>

            {/* Sucesso no Modal */}
            {editSuccessMessage && (
              <div className="mb-4 p-4 bg-emerald-100 border-2 border-emerald-950 text-emerald-950 font-bold text-xs flex items-center gap-2">
                <Check className="w-5 h-5 flex-shrink-0" />
                <span>{editSuccessMessage}</span>
              </div>
            )}

            {/* Formulário do Modal */}
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Nome do Produto / Serviço
                </label>
                <input
                  type="text"
                  required
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                  placeholder="Ex: Tíquete de Almoço Estudante"
                  className="neo-input"
                  disabled={isUpdating || !!editSuccessMessage}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Preço em Reais (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={editProductPrice}
                    onChange={handleEditPriceChange}
                    placeholder="Ex: 2,50 (Preenchimento automático)"
                    className="neo-input font-mono text-right pr-4"
                    disabled={isUpdating || !!editSuccessMessage}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Código de Serviço (SISGRU)
                  </label>
                  <input
                    type="text"
                    required
                    value={editProductCodeService}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setEditProductCodeService(value);
                    }}
                    placeholder="Ex: 101 (Apenas números)"
                    className="neo-input font-mono"
                    disabled={isUpdating || !!editSuccessMessage}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Categoria do Produto
                  </label>
                  <select
                    value={editProductCategory}
                    onChange={(e) => setEditProductCategory(e.target.value as 'TICKET' | 'FINE')}
                    className="neo-input font-bold"
                    disabled={isUpdating || !!editSuccessMessage}
                  >
                    <option value="TICKET">🎫 TÍQUETE (Refeitório)</option>
                    <option value="FINE">💸 MULTA / TAXA (Biblioteca)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Status do Produto
                  </label>
                  <select
                    value={editProductActive ? 'true' : 'false'}
                    onChange={(e) => setEditProductActive(e.target.value === 'true')}
                    className="neo-input font-bold"
                    disabled={isUpdating || !!editSuccessMessage}
                  >
                    <option value="true">🟢 ATIVO (Visível)</option>
                    <option value="false">🔴 INATIVO (Ocultado)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  URL da Imagem (Opcional)
                </label>
                <input
                  type="text"
                  value={editProductImage}
                  onChange={(e) => setEditProductImage(e.target.value)}
                  placeholder="Ex: https://link-da-imagem.com/foto.png"
                  className="neo-input"
                  disabled={isUpdating || !!editSuccessMessage}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Descrição / Informações Adicionais (Opcional)
                </label>
                <textarea
                  value={editProductDesc}
                  onChange={(e) => setEditProductDesc(e.target.value)}
                  placeholder="Ex: Válido exclusivamente para o almoço do refeitório central."
                  className="neo-input h-24 resize-none"
                  disabled={isUpdating || !!editSuccessMessage}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t-2 border-dashed border-gray-300">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 neo-btn bg-gray-100 hover:bg-gray-200"
                  disabled={isUpdating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 neo-btn-primary bg-neo-yellow text-neo-dark border-neo-dark hover:bg-yellow-300"
                  disabled={isUpdating || !!editSuccessMessage}
                >
                  {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      
    </div>
  );
}
