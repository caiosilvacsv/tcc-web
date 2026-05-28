import React, { useState } from 'react';
import { api } from '../../services/api';
import { Search, CheckCircle2, AlertTriangle, UserCheck, Package } from 'lucide-react';
import { isValidCpf, formatCpf, cleanCpf } from '../../utils/cpf';
import { useNavigate } from 'react-router-dom';

interface ProductItem {
  id: string;
  productName: string;
  paidAt: string;
  status: 'PAID' | 'EXCHANGED'; // PAID = Pago/Disponível, EXCHANGED = Entregue/Resgatado
}

interface StudentExchangeData {
  name: string;
  cpf: string;
  items: ProductItem[];
}

export function GuichePanel() {
  const navigate = useNavigate();
  const [cpfInput, setCpfInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [studentData, setStudentData] = useState<StudentExchangeData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [exchangingId, setExchangingId] = useState<string | null>(null);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCpf(rawValue);
    setCpfInput(formatted);

    const numericOnly = cleanCpf(rawValue);
    
    // Feedback instantâneo reativo: se digitou os 11 dígitos, faz a validação matemática oficial
    if (numericOnly.length === 11) {
      if (!isValidCpf(numericOnly)) {
        setErrorMessage('O CPF informado está incorreto na validação dos dígitos verificadores.');
      } else {
        setErrorMessage('');
      }
    } else {
      // Limpa o aviso de erro do CPF caso o usuário apague ou continue digitando
      if (errorMessage && errorMessage.includes('CPF')) {
        setErrorMessage('');
      }
    }
  };

  // Consulta produtos adquiridos pelo CPF usando o endpoint mapeado em /api/orders
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpf = cleanCpf(cpfInput);
    if (cpf.length !== 11) {
      setErrorMessage('CPF inválido. Digite os 11 dígitos.');
      return;
    }

    setErrorMessage('');
    setIsSearching(true);
    try {
      // Endpoint exato mapeado pelo Spring Boot em @RequestMapping("/api/orders")
      const data = await api<StudentExchangeData>(`/api/orders/exchange?cpf=${cpf}`);
      setStudentData(data);
    } catch (err: any) {
      setStudentData(null);
      setErrorMessage(err.message || 'Nenhum produto em aberto encontrado para este CPF.');
    } finally {
      setIsSearching(false);
    }
  };

  // Processa o resgate (baixa/entrega) do produto usando o endpoint mapeado em /api/orders
  const handleExchange = async (itemId: string) => {
    setExchangingId(itemId);
    try {
      // Faz a chamada de PUT ao endpoint exato de baixa do item do pedido
      await api<void>(`/api/orders/items/${itemId}/exchange`, {
        method: 'PUT',
      });

      // Atualiza localmente a lista de itens no estado
      if (studentData) {
        const updatedItems = studentData.items.map(item =>
          item.id === itemId ? { ...item, status: 'EXCHANGED' as const } : item
        );
        
        // Remove o item entregue da tabela imediatamente para agilizar a operação do guichê
        setStudentData({
          ...studentData,
          items: updatedItems.filter(item => item.status !== 'EXCHANGED')
        });
      }

      // Toca um feedback sonoro de sucesso (bipe discreto)
      const audio = new Audio('/success-beep.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Falha ao processar a entrega do produto.');
    } finally {
      setExchangingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      
      {/* Barra Superior de Ações Rápidas do Operador */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 neo-card border-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-8 h-8 text-neo-brand" />
          <div>
            <h2 className="text-lg font-bold leading-tight">Painel do Operador</h2>
            <span className="text-xs font-mono text-gray-500">Guichê Salinas</span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/admin/products')}
          className="neo-btn bg-neo-yellow hover:bg-yellow-200 text-xs py-2.5 px-4 flex items-center gap-1.5 font-bold text-neo-dark transition-all cursor-pointer"
        >
          <Package className="w-4 h-4 text-neo-dark" /> Cadastrar / Gerenciar Produtos
        </button>
      </div>

      <div className="neo-card p-6 bg-neo-paper border-3 mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <UserCheck className="w-7 h-7 text-neo-brand" /> Guichê de Resgate e Entrega
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Consulte as compras de produtos ou taxas quitadas informando o CPF do beneficiário para autorizar a entrega ou baixa do item.
        </p>

        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={cpfInput}
              onChange={handleCpfChange}
              maxLength={14}
              placeholder="000.000.000-00"
              className="neo-input neo-input-icon animate-fade-in"
            />
            <Search className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="neo-btn-primary py-3 w-32"
          >
            {isSearching ? 'Buscando...' : 'Consultar'}
          </button>
        </form>

        {errorMessage && (
          <div className="mt-4 p-4 bg-red-100 border-2 border-red-900 text-red-900 flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 animate-pulse" /> {errorMessage}
          </div>
        )}
      </div>

      {studentData && (
        <div className="neo-card p-6 bg-neo-paper border-3">
          <div className="border-b-3 border-neo-dark pb-4 mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Beneficiário</span>
            <h3 className="text-xl font-bold">{studentData.name}</h3>
            <span className="text-sm font-mono text-gray-600">CPF: {cpfInput}</span>
          </div>

          <h4 className="text-lg font-bold mb-4">Produtos Disponíveis para Resgate / Entrega</h4>

          {studentData.items.filter(item => item.status === 'PAID').length === 0 ? (
            <div className="p-6 bg-yellow-50 border-2 border-neo-dark text-center font-bold">
              Nenhum produto pago pendente de entrega encontrado para este usuário.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-3 border-neo-dark text-left bg-neo-bg">
                    <th className="p-3 font-bold text-sm">Produto / Serviço</th>
                    <th className="p-3 font-bold text-sm">Data do Pagamento</th>
                    <th className="p-3 font-bold text-sm">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {studentData.items
                    .filter(item => item.status === 'PAID')
                    .map((item) => (
                      <tr key={item.id} className="border-b-2 border-gray-300 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold">
                          <span className="px-2 py-1 border-2 border-neo-dark text-xs uppercase bg-neo-yellow mr-2">
                            Item
                          </span>
                          {item.productName}
                        </td>
                        <td className="p-3 font-mono text-sm">
                          {new Date(item.paidAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleExchange(item.id)}
                            disabled={exchangingId !== null}
                            className="neo-btn bg-neo-brand text-neo-paper hover:bg-emerald-700 text-xs py-1.5 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" /> 
                            {exchangingId === item.id ? 'Baixando...' : 'Confirmar Entrega'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
