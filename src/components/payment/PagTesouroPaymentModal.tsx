import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  X,
  CheckCircle2,
  Loader2,
  Lock,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  FileText,
  Layers,
} from 'lucide-react';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';

export interface CheckoutGuideItem {
  paymentId: string;
  pagtesouroPaymentId?: string;
  amount: number;
  status?: string;
  nextUrl: string;
  codeService?: string;
  serviceTitle?: string;
  itemsDescription?: string[];
}

export interface PagTesouroSinglePaymentPayload {
  idPagamento: string;
  tipoPagamentoEscolhido: 'PIX' | 'CARTAO_CREDITO' | 'BOLETO' | 'SALDO_CARTEIRA' | string;
  valor: number;
  nomePSP?: string;
  transacaoPSP?: string;
  situacao: {
    codigo: 'CRIADO' | 'INICIADO' | 'SUBMETIDO' | 'CONCLUIDO' | 'REJEITADO' | 'CANCELADO' | string;
    data: string;
  };
}

interface PagTesouroPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Lista de guias geradas pelo Backend (Server-Driven UI) */
  payments?: CheckoutGuideItem[];
  /** ID do pedido (permite gerar nova sessão limpa no backend caso o usuário saia de uma guia) */
  orderId?: string | null;
  /** Props de compatibilidade para guia avulsa (ex: Checkout Direto de Visitante) */
  nextUrl?: string | null;
  paymentId?: string | null;
  amount?: number;
  contributorName?: string;
  onSuccess?: (payload?: PagTesouroSinglePaymentPayload) => void;
}

export const PagTesouroPaymentModal: React.FC<PagTesouroPaymentModalProps> = ({
  isOpen,
  onClose,
  payments,
  orderId,
  nextUrl,
  paymentId,
  amount,
  contributorName,
  onSuccess,
}) => {
  const toast = useToast();

  // Lista interna de guias do pedido (atualizável caso o usuário gere nova sessão para uma guia abandonada)
  const [guides, setGuides] = useState<CheckoutGuideItem[]>([]);
  // Modo de visualização: 'LIST' (seleção de guias) | 'IFRAME' (pagamento ativo) | 'ALL_COMPLETED'
  const [viewMode, setViewMode] = useState<'LIST' | 'IFRAME' | 'ALL_COMPLETED'>('LIST');
  // ID da guia atualmente aberta no iFrame
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  // IDs das guias já quitadas e confirmadas via SSE / postMessage
  const [paidIds, setPaidIds] = useState<string[]>([]);
  // IDs das guias cuja sessão única já foi aberta e deixada pelo usuário
  const [consumedSessionIds, setConsumedSessionIds] = useState<string[]>([]);
  // Controle de carregamento do iFrame atual
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  // Controle de regeneração de sessão junto ao backend
  const [isRegeneratingSession, setIsRegeneratingSession] = useState<boolean>(false);
  // Box de aviso antes de sair do pagamento ativo ('LIST' = voltar p/ lista, 'CLOSE' = fechar modal)
  const [exitPromptTarget, setExitPromptTarget] = useState<'LIST' | 'CLOSE' | null>(null);
  // Payload opcional retornado pelo postMessage da STN
  const [lastPaymentPayload, setLastPaymentPayload] = useState<PagTesouroSinglePaymentPayload | null>(
    null
  );

  // Inicializa a lista de guias a partir de `payments` ou das props singulares
  useEffect(() => {
    if (!isOpen) return;

    let initialGuides: CheckoutGuideItem[] = [];
    if (payments && payments.length > 0) {
      initialGuides = payments.map((p) => ({
        paymentId: p.paymentId || (p as any).idPayment || '',
        pagtesouroPaymentId: p.pagtesouroPaymentId,
        amount: Number(p.amount || 0),
        status: p.status || 'CREATED',
        nextUrl: p.nextUrl || (p as any).proximaUrl || '',
        codeService: p.codeService,
        serviceTitle:
          p.serviceTitle ||
          (p.codeService ? `Guia SISGRU #${p.codeService}` : 'Guia Oficial PagTesouro (STN)'),
        itemsDescription: p.itemsDescription || [],
      }));
    } else if (nextUrl) {
      initialGuides = [
        {
          paymentId: paymentId || 'single-guide',
          amount: Number(amount || 0),
          status: 'CREATED',
          nextUrl,
          serviceTitle: 'Guia Oficial PagTesouro (STN)',
          itemsDescription: [],
        },
      ];
    }

    setGuides(initialGuides);
    setPaidIds([]);
    setConsumedSessionIds([]);
    setActivePaymentId(null);
    setExitPromptTarget(null);
    setLastPaymentPayload(null);
    // Sempre inicia na lista explicativa para que o usuário veja o aviso de Entrada Única e escolha a guia
    setViewMode('LIST');
  }, [isOpen, payments, nextUrl, paymentId, amount]);

  const activeGuide = useMemo(
    () => guides.find((g) => g.paymentId === activePaymentId) || null,
    [guides, activePaymentId]
  );

  // Escuta reativa SSE para a guia atualmente aberta no iFrame
  const { data: sseData } = usePaymentStatus(
    isOpen && viewMode === 'IFRAME' && activeGuide && activeGuide.paymentId !== 'single-guide'
      ? activeGuide.paymentId
      : undefined
  );

  // Marca a guia ativa como paga e retorna à lista (ou finaliza se todas foram pagas)
  const markActiveGuideAsPaid = useCallback(
    (payload?: PagTesouroSinglePaymentPayload) => {
      if (!activeGuide) return;
      if (payload) {
        setLastPaymentPayload(payload);
      }

      setPaidIds((prev) => {
        const updated = prev.includes(activeGuide.paymentId)
          ? prev
          : [...prev, activeGuide.paymentId];

        const allPaid = guides.every((g) => updated.includes(g.paymentId));
        if (allPaid) {
          setViewMode('ALL_COMPLETED');
          toast.success('Todos os pagamentos foram confirmados com sucesso!');
          if (onSuccess) {
            onSuccess(payload);
          }
        } else {
          setViewMode('LIST');
          setActivePaymentId(null);
          toast.success(
            `${activeGuide.serviceTitle} confirmada! Selecione o próximo pagamento disponível.`
          );
        }
        return updated;
      });
      setExitPromptTarget(null);
    },
    [activeGuide, guides, onSuccess, toast]
  );

  // Dispara quando o SSE do backend confirma PAYMENT_PAID / COMPLETED
  useEffect(() => {
    if (sseData?.status === 'COMPLETED' && viewMode === 'IFRAME' && activeGuide) {
      markActiveGuideAsPaid();
    }
  }, [sseData?.status, viewMode, activeGuide, markActiveGuideAsPaid]);

  // Escuta os eventos postMessage enviados pelo iFrame do PagTesouro ("EPAG_FIM" ou JSON)
  useEffect(() => {
    if (!isOpen || viewMode !== 'IFRAME') return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'EPAG_FIM') {
        markActiveGuideAsPaid();
        return;
      }

      try {
        const parsed = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (parsed && typeof parsed === 'object') {
          if (parsed.evento === 'EPAG_FIM' || parsed.type === 'EPAG_FIM') {
            markActiveGuideAsPaid();
            return;
          }
          if (parsed.idPagamento && parsed.situacao?.codigo) {
            const singlePayload = parsed as PagTesouroSinglePaymentPayload;
            setLastPaymentPayload(singlePayload);
            if (singlePayload.situacao.codigo === 'CONCLUIDO') {
              markActiveGuideAsPaid(singlePayload);
            }
          }
        }
      } catch {
        // Ignora mensagens de extensões do navegador
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, viewMode, markActiveGuideAsPaid]);

  // Inicia o pagamento de uma guia selecionada na lista
  const handleSelectGuideToPay = (guide: CheckoutGuideItem) => {
    if (paidIds.includes(guide.paymentId)) return;
    setActivePaymentId(guide.paymentId);
    setIsIframeLoading(true);
    setExitPromptTarget(null);
    setViewMode('IFRAME');
  };

  // Solicita nova sessão limpa ao backend (POST /payments/checkout/{orderId}) caso o usuário tenha abandonado uma guia
  const handleRegenerateOrderSessions = async () => {
    if (!orderId) {
      toast.error('Para visitantes sem pedido vinculado, inicie um novo checkout na vitrine.');
      return;
    }

    setIsRegeneratingSession(true);
    try {
      const freshGuides = await api<CheckoutGuideItem[]>(`/payments/checkout/${orderId}`, {
        method: 'POST',
        body: JSON.stringify({ isMobile: false }),
      });

      if (Array.isArray(freshGuides) && freshGuides.length > 0) {
        const normalized = freshGuides.map((p) => ({
          paymentId: p.paymentId || (p as any).idPayment || '',
          pagtesouroPaymentId: p.pagtesouroPaymentId,
          amount: Number(p.amount || 0),
          status: p.status || 'CREATED',
          nextUrl: p.nextUrl || (p as any).proximaUrl || '',
          codeService: p.codeService,
          serviceTitle:
            p.serviceTitle ||
            (p.codeService ? `Guia SISGRU #${p.codeService}` : 'Guia Oficial PagTesouro (STN)'),
          itemsDescription: p.itemsDescription || [],
        }));
        setGuides(normalized);
        setConsumedSessionIds([]);
        toast.success(
          'Sessões anteriores canceladas e novas guias geradas com sucesso junto à STN!'
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível gerar uma nova sessão para o pedido.');
    } finally {
      setIsRegeneratingSession(false);
    }
  };

  // Tentativa de sair do iFrame ativo -> Abre a Box de Aviso sem desmontar o iFrame!
  const handleRequestLeaveIframe = (target: 'LIST' | 'CLOSE') => {
    if (viewMode === 'IFRAME' && activeGuide && !paidIds.includes(activeGuide.paymentId)) {
      setExitPromptTarget(target);
      return;
    }
    if (target === 'LIST') {
      setViewMode('LIST');
      setActivePaymentId(null);
    } else {
      onClose();
    }
  };

  // Confirma a saída na Box de Aviso (marca a sessão da guia atual como utilizada/encerrada)
  const handleConfirmLeaveIframe = () => {
    if (activeGuide && !paidIds.includes(activeGuide.paymentId)) {
      setConsumedSessionIds((prev) =>
        prev.includes(activeGuide.paymentId) ? prev : [...prev, activeGuide.paymentId]
      );
    }
    const target = exitPromptTarget;
    setExitPromptTarget(null);
    setActivePaymentId(null);

    if (target === 'CLOSE') {
      if (paidIds.length > 0 && onSuccess) {
        onSuccess();
      }
      onClose();
    } else {
      setViewMode('LIST');
    }
  };

  if (!isOpen || guides.length === 0) return null;

  const iframeSrc = activeGuide?.nextUrl
    ? `${activeGuide.nextUrl}${activeGuide.nextUrl.includes('?') ? '&' : '?'}btnConcluir=true&tema=tema-dark`
    : '';

  const totalAmount = guides.reduce((acc, g) => acc + Number(g.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white border-3 border-neo-dark shadow-neo-lg w-full max-w-4xl flex flex-col max-h-[95vh] overflow-hidden relative">
        {/* CABEÇALHO OFICIAL NEO-BRUTALISTA */}
        <div className="p-3.5 sm:p-4 bg-neo-dark text-white border-b-3 border-neo-dark flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-neo-yellow text-neo-dark border-2 border-white flex items-center justify-center font-heading font-bold text-base shadow-neo-xs flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading font-bold text-xs sm:text-sm uppercase tracking-wider text-white">
                  Checkout Oficial • PagTesouro STN
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500 text-neo-dark font-mono font-bold text-[10px] uppercase border border-white">
                  Sessão de Entrada Única
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                {contributorName ? `Contribuinte: ${contributorName} • ` : ''}
                {guides.length} {guides.length === 1 ? 'guia gerada' : 'guias SISGRU geradas'} •
                Total:{' '}
                <strong className="text-neo-yellow">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalAmount
                  )}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'IFRAME' && (
              <button
                type="button"
                onClick={() => handleRequestLeaveIframe('LIST')}
                className="px-3 py-1.5 border-2 border-white bg-slate-800 hover:bg-neo-yellow hover:text-neo-dark text-white font-heading font-bold text-[11px] uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lista de Guias ({paidIds.length}/{guides.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (viewMode === 'IFRAME') {
                  handleRequestLeaveIframe('CLOSE');
                } else {
                  if (paidIds.length > 0 && onSuccess) onSuccess();
                  onClose();
                }
              }}
              className="p-1.5 border-2 border-white bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
              title="Fechar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            VISÃO 1: LISTA DE GUIAS DISPONÍVEIS E AVISO DE REGRA DE ENTRADA ÚNICA
           ===================================================================== */}
        {viewMode === 'LIST' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
            {/* Banner Explicativo da Regra de Entrada Única */}
            <div className="p-4 bg-neo-yellow border-3 border-neo-dark shadow-neo-sm space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-neo-dark flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-xs sm:text-sm uppercase text-neo-dark">
                    Aviso Importante: Regra de Entrada Única do PagTesouro (STN)
                  </h3>
                  <p className="text-xs text-neo-dark font-sans leading-relaxed">
                    Por determinação de segurança da <strong>Secretaria do Tesouro Nacional</strong>,
                    cada guia abaixo possui uma <strong>sessão de acesso único</strong>. Ao abrir uma
                    guia, <strong>conclua o pagamento antes de sair ou atualizar a página</strong>.
                    Caso precise deixar o pagamento atual para pagar outro item, o sistema exibirá
                    uma confirmação e, ao concluir qualquer guia, você retornará automaticamente para
                    esta lista.
                  </p>
                </div>
              </div>
            </div>

            {/* Cabeçalho da Lista */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-neo-dark">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-neo-brand" />
                <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                  Selecione Qual Guia Deseja Pagar Agora ({paidIds.length} de {guides.length}{' '}
                  concluídas)
                </h3>
              </div>

              {consumedSessionIds.length > 0 && orderId && (
                <button
                  type="button"
                  onClick={handleRegenerateOrderSessions}
                  disabled={isRegeneratingSession}
                  className="neo-btn bg-white hover:bg-neo-yellow text-neo-dark border-2 border-neo-dark py-1.5 px-3 text-[11px] font-heading font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRegeneratingSession ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {isRegeneratingSession
                      ? 'Gerando Nova Sessão STN...'
                      : 'Renovar Sessões Encerradas'}
                  </span>
                </button>
              )}
            </div>

            {/* Cards das Guias vindas do Backend */}
            <div className="space-y-3">
              {guides.map((guide, index) => {
                const isPaid = paidIds.includes(guide.paymentId);
                const isConsumed = consumedSessionIds.includes(guide.paymentId) && !isPaid;

                return (
                  <div
                    key={guide.paymentId || index}
                    className={`p-4 border-3 border-neo-dark transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isPaid
                        ? 'bg-emerald-50 shadow-none'
                        : isConsumed
                          ? 'bg-amber-50'
                          : 'bg-white shadow-neo-sm'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-neo-dark text-white font-mono font-bold text-[10px] uppercase">
                          Guia {index + 1} de {guides.length}
                        </span>
                        {guide.codeService && (
                          <span className="px-2 py-0.5 bg-slate-100 border border-neo-dark font-mono font-bold text-[10px] text-neo-dark">
                            SISGRU #{guide.codeService}
                          </span>
                        )}
                        {isPaid && (
                          <span className="px-2 py-0.5 bg-emerald-300 border border-neo-dark font-mono font-bold text-[10px] text-neo-dark uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Confirmado via SSE
                          </span>
                        )}
                        {isConsumed && (
                          <span className="px-2 py-0.5 bg-amber-300 border border-neo-dark font-mono font-bold text-[10px] text-neo-dark uppercase">
                            Sessão Única Utilizada
                          </span>
                        )}
                      </div>

                      <h4 className="font-heading font-bold text-sm text-neo-dark">
                        {guide.serviceTitle || `Guia Oficial PagTesouro #${index + 1}`}
                      </h4>

                      {guide.itemsDescription && guide.itemsDescription.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {guide.itemsDescription.map((desc, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 border border-slate-300 text-slate-700 flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-slate-500" />
                              {desc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-slate-300">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">
                          Valor da Guia
                        </span>
                        <span className="font-mono font-bold text-lg text-neo-dark">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(guide.amount)}
                        </span>
                      </div>

                      {isPaid ? (
                        <div className="px-3 py-2 bg-emerald-500 text-white border-2 border-neo-dark font-heading font-bold text-xs uppercase flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Guia Quitada</span>
                        </div>
                      ) : isConsumed ? (
                        <button
                          type="button"
                          onClick={handleRegenerateOrderSessions}
                          disabled={isRegeneratingSession || !orderId}
                          className="neo-btn bg-neo-yellow text-neo-dark border-2 border-neo-dark py-2 px-3.5 text-xs font-heading font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isRegeneratingSession ? 'animate-spin' : ''}`}
                          />
                          <span>Emitir Nova Sessão</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectGuideToPay(guide)}
                          className="neo-btn-primary py-2.5 px-4 text-xs font-heading font-bold uppercase flex items-center gap-1.5 shadow-neo-xs cursor-pointer"
                        >
                          <span>Pagar esta Guia</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            VISÃO 2: IFRAME ATIVO DO PAGTESOURO (COM PROTEÇÃO DE ENTRADA ÚNICA)
           ===================================================================== */}
        {viewMode === 'IFRAME' && activeGuide && (
          <div className="relative flex-1 bg-slate-900 min-h-[540px] sm:min-h-[630px] flex flex-col">
            {/* Faixa de aviso de Sessão de Entrada Única no topo do iFrame */}
            <div className="px-4 py-2 bg-amber-300 border-b-2 border-neo-dark text-neo-dark flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono font-bold">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                SESSÃO ÚNICA STN ATIVA ({activeGuide.serviceTitle}): Não recarregue a página até
                concluir o PIX/Cartão/GRU.
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-neo-dark text-[10px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Escuta SSE em Tempo Real Ativa
              </span>
            </div>

            {isIframeLoading && (
              <div className="absolute inset-0 z-10 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Loader2 className="w-10 h-10 text-neo-yellow animate-spin" />
                <p className="font-heading font-bold text-sm uppercase tracking-wider text-white">
                  Iniciando Sessão Única no PagTesouro (STN)...
                </p>
                <p className="text-xs font-mono text-slate-400 max-w-md">
                  Aguarde o carregamento do QR Code PIX, Cartão ou GRU. Não feche esta janela.
                </p>
              </div>
            )}

            <iframe
              src={iframeSrc}
              title="Checkout Oficial PagTesouro STN"
              width="100%"
              height="610px"
              onLoad={() => setIsIframeLoading(false)}
              className="w-full flex-1 border-none bg-slate-900"
              allow="clipboard-write; payment"
            />

            {/* BOX DE AVISO SOBREPOSTA ANTES DE SAIR DO PAGAMENTO ATUAL (Sem desmontar o iFrame!) */}
            {exitPromptTarget && (
              <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                <div className="max-w-md w-full neo-card bg-white border-3 border-neo-dark p-6 shadow-neo-lg space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-neo-yellow border-2 border-neo-dark">
                      <AlertTriangle className="w-6 h-6 text-neo-dark" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm uppercase text-neo-dark">
                        Atenção: Sessão de Entrada Única!
                      </h3>
                      <p className="text-[11px] font-mono text-slate-500">
                        {activeGuide.serviceTitle}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-sans leading-relaxed">
                    O <strong>PagTesouro (STN)</strong> permite entrar apenas{' '}
                    <strong>uma única vez</strong> em cada link de sessão. Se você deixar este
                    pagamento agora sem concluí-lo, esta sessão será invalidada e será necessário
                    gerar uma nova sessão caso deseje pagá-lo depois.
                  </p>

                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setExitPromptTarget(null)}
                      className="w-full neo-btn-primary py-3 text-xs font-heading font-bold uppercase flex items-center justify-center gap-2 shadow-neo-xs cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Retornar para o Pagamento Atual</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmLeaveIframe}
                      className="w-full neo-btn bg-rose-50 hover:bg-rose-100 text-rose-950 border-2 border-rose-950 py-2.5 text-xs font-heading font-bold uppercase cursor-pointer"
                    >
                      {exitPromptTarget === 'LIST'
                        ? 'Deixar Pagamento Atual e Ir para a Lista de Guias'
                        : 'Encerrar Sessão e Fechar Modal'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISÃO 3: TODOS OS PAGAMENTOS DO PEDIDO CONCLUÍDOS COM SUCESSO
           ===================================================================== */}
        {viewMode === 'ALL_COMPLETED' && (
          <div className="p-8 sm:p-10 bg-emerald-50 flex-1 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
            <div className="w-20 h-20 bg-emerald-400 border-3 border-neo-dark shadow-neo flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-neo-dark" />
            </div>

            <div className="space-y-2 max-w-md">
              <span className="neo-badge bg-neo-yellow text-neo-dark border-neo-dark">
                <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Compensação Confirmada pela STN
              </span>
              <h3 className="text-2xl font-heading font-bold text-neo-dark uppercase">
                Pagamento Concluído!
              </h3>
              <p className="text-xs text-slate-700 font-sans leading-relaxed">
                Todas as guias selecionadas foram liquidadas e validadas em tempo real via SSE. Seus
                tíquetes e comprovantes já estão liberados na sua Carteira Acadêmica!
              </p>

              {lastPaymentPayload && (
                <div className="mt-4 p-3 bg-white border-2 border-neo-dark text-left font-mono text-[11px] space-y-1 shadow-neo-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID PagTesouro:</span>
                    <span className="font-bold text-neo-dark">
                      {lastPaymentPayload.idPagamento}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Meio Escolhido:</span>
                    <span className="font-bold text-emerald-700">
                      {lastPaymentPayload.tipoPagamentoEscolhido}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="neo-btn-primary py-3 px-8 text-xs font-heading font-bold uppercase tracking-wider cursor-pointer"
            >
              Concluir e Acessar Meus Tíquetes
            </button>
          </div>
        )}

        {/* RODAPÉ DE SEGURANÇA */}
        <div className="p-3 bg-slate-100 border-t-3 border-neo-dark flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-600">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-neo-brand" />
            <span>
              Ambiente Criptografado STN • Escuta Reativa SSE (/payments/:id/sse) & postMessage
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase text-slate-500">
            Proibido recarregar sessão ativa (Regra STN)
          </span>
        </div>
      </div>
    </div>
  );
};
