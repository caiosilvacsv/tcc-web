import { useState, useEffect } from 'react';

interface PaymentStatusResponse {
  paymentId: string;
  referenceNumber: string;
  status: 'CREATED' | 'STARTED' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';
  paidAt: string | null;
}

/**
 * Hook customizado do React baseado em Server-Sent Events (SSE) nativo
 * para monitoramento em tempo real de compensação de faturas de pagamento.
 * <p>
 * **Conceito no TCC (Eficiência e Baixa Latência):**
 * Elimina o tráfego excessivo de requisições periódicas de polling de rede (HTTP Polling)
 * estabelecendo um canal de escuta contínuo e persistente de baixo consumo. O backend
 * "empurra" o status do pagamento reativamente assim que o webhook do PagTesouro aprovar.
 * </p>
 */
export function usePaymentStatus(paymentId: string | undefined) {
  const [data, setData] = useState<PaymentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Se não houver paymentId, interrompe a execução
    if (!paymentId) return;

    setIsLoading(true);
    setError(null);

    // 2. Instancia o EventSource nativo apontando para a rota de SSE do backend Java
    // O proxy do Vite (/api) encaminha de forma transparente e segura para o Spring Boot
    const eventSource = new EventSource(`/api/payments/${paymentId}/sse`);

    // 3. Escuta o evento reativo específico disparado pelo Spring Boot (PAYMENT_PAID)
    eventSource.addEventListener('PAYMENT_PAID', (event) => {
      const statusValue = event.data; // Recebe "COMPLETED" do Spring Boot
      
      setData({
        paymentId: paymentId,
        referenceNumber: '',
        status: statusValue as 'COMPLETED',
        paidAt: new Date().toISOString(),
      });
      setIsLoading(false);
      setError(null);

      // Como a transação foi liquidada com sucesso, encerra o canal SSE para liberar o socket
      eventSource.close();
    });

    // 4. Trata falhas na conexão de eventos (Ex: Timeout de rede)
    eventSource.onerror = (err) => {
      console.error('Erro na conexão reativa SSE:', err);
      // O EventSource nativo se reconecta automaticamente em instabilidades de rede.
      // Reportamos um status de espera resiliente para o usuário final
      setError('Aguardando compensação do pagamento pela STN/PagTesouro...');
    };

    // 5. Função de limpeza (cleanup) do React para fechar a conexão SSE ao desmontar o componente
    return () => {
      eventSource.close();
    };
  }, [paymentId]);

  return { data, isLoading, error };
}
