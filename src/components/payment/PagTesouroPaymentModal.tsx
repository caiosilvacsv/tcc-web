import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  RotateCw, 
  ShieldCheck, 
  CreditCard, 
  Sparkles,
  ArrowRight,
  Maximize2,
  FileText
} from 'lucide-react';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { useToast } from '../../contexts/ToastContext';

export interface PagTesouroCallbackPayload {
  idPagamento: string;
  tipoPagamentoEscolhido: string;
  valor: number;
  nomePSP?: string;
  transacaoPSP?: string;
  situacao: {
    codigo: string;
    data: string;
  };
}

export interface PagTesouroResponseObject {
  proximaUrl?: string;
  nextUrl?: string;
  idPagamento?: string;
  paymentId?: string;
  situacao?: {
    codigo?: string;
  };
}

interface PagTesouroPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentUrl?: string;
  respostaPagTesouro?: PagTesouroResponseObject | null;
  paymentId?: string;
  amount?: number;
  contributorCpf?: string;
  isAuthenticated?: boolean;
  onSuccessRedirect?: () => void;
}

export const PagTesouroPaymentModal: React.FC<PagTesouroPaymentModalProps> = ({
  isOpen,
  onClose,
  paymentUrl,
  respostaPagTesouro,
  paymentId,
  amount,
  contributorCpf,
  isAuthenticated = false,
  onSuccessRedirect,
}) => {
  const toast = useToast();
  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [callbackData, setCallbackData] = useState<PagTesouroCallbackPayload | null>(null);

  const effectiveUrl = paymentUrl || respostaPagTesouro?.proximaUrl || respostaPagTesouro?.nextUrl || '';
  const effectivePaymentId = paymentId || respostaPagTesouro?.idPagamento || respostaPagTesouro?.paymentId || '';

  // Monta a URL oficial do PagTesouro com btnConcluir=true e tema=tema-dark
  const iframeSrc = useMemo(() => {
    if (!effectiveUrl) return '';
    let url = effectiveUrl;
    const hasQuery = url.includes('?');
    const paramsToAdd: string[] = [];

    if (!url.includes('btnConcluir=')) {
      paramsToAdd.push('btnConcluir=true');
    }
    if (!url.includes('tema=')) {
      paramsToAdd.push('tema=tema-dark');
    }

    if (paramsToAdd.length > 0) {
      url += (hasQuery ? '&' : '?') + paramsToAdd.join('&');
    }
    return url;
  }, [effectiveUrl]);

  // Escuta reativa do SSE do backend para confirmação automática do pagamento
  const { data: sseData } = usePaymentStatus(effectivePaymentId);

  // Escuta o postMessage emitido pelo iFrame do PagTesouro (ex: 'EPAG_FIM' ou payload JSON)
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        // 1. Sinal oficial padrão do PagTesouro ao concluir ou clicar no botão Concluir
        if (event.data === 'EPAG_FIM') {
          toast.success('Pagamento concluído no PagTesouro!');
          setCallbackData(prev => prev || {
            idPagamento: effectivePaymentId || '',
            tipoPagamentoEscolhido: 'PIX / PAGTESOURO',
            valor: amount || 0,
            nomePSP: 'PagTesouro STN',
            transacaoPSP: 'PAGTESOURO-CONFIRMADO',
            situacao: {
              codigo: 'CONCLUIDO',
              data: new Date().toISOString()
            }
          });
          return;
        }

        // 2. Trata recebimento de dados estruturados em JSON ou Objeto
        let payload = event.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            return;
          }
        }

        if (payload && typeof payload === 'object') {
          // Trata tanto o formato oficial { situacao: { codigo: "CONCLUIDO" } } quanto variações
          const codigo = payload.situacao?.codigo || (typeof payload.situacao === 'string' ? payload.situacao : null);

          if (codigo === 'CONCLUIDO' || codigo === 'COMPLETED' || codigo === 'PAGO' || payload.status === 'CONCLUIDO') {
            toast.success('Pagamento confirmado com sucesso!');
            setCallbackData({
              idPagamento: payload.idPagamento || effectivePaymentId || '',
              tipoPagamentoEscolhido: payload.tipoPagamentoEscolhido || 'PIX',
              valor: typeof payload.valor === 'number' ? payload.valor : (amount || 0),
              nomePSP: payload.nomePSP || 'PagTesouro STN',
              transacaoPSP: payload.transacaoPSP || '',
              situacao: {
                codigo: 'CONCLUIDO',
                data: payload.situacao?.data || new Date().toISOString()
              }
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao processar postMessage do iframe do PagTesouro:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, effectivePaymentId, amount, toast]);

  const isCompleted = sseData?.status === 'COMPLETED' || callbackData?.situacao.codigo === 'CONCLUIDO';

  useEffect(() => {
    if (isOpen) {
      setIsIframeLoading(true);
      setCallbackData(null);
    }
  }, [isOpen, effectiveUrl]);

  if (!isOpen || !effectiveUrl) return null;

  return (
    <div className="fixed inset-0 bg-neo-dark/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="w-full max-w-4xl bg-white border-3 border-neo-dark shadow-neo-xl flex flex-col max-h-[95vh] animate-fade-in relative">
        
        {/* CABEÇALHO DO MODAL DE PAGAMENTO */}
        <div className="bg-neo-dark text-white p-3 sm:p-4 flex justify-between items-center border-b-3 border-neo-dark">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-neo-yellow border-2 border-white flex items-center justify-center text-neo-dark font-bold shadow-neo-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm sm:text-base uppercase tracking-tight text-white">
                  Ambiente de Pagamento PagTesouro (STN)
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.2 border border-emerald-400 bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                  iFrame Oficial
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-300 hidden sm:block">
                Conclua sua operação via Pix, Cartão ou Boleto diretamente no painel seguro abaixo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIframeKey(prev => prev + 1)}
              className="p-1.5 border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Recarregar tela de pagamento"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Abrir em aba cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 border border-rose-600 bg-rose-950/80 hover:bg-rose-900 text-rose-300 cursor-pointer transition-colors ml-1"
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BARRA DE STATUS REATIVO (MONITORAMENTO ATIVO SSE + POSTMESSAGE) */}
        <div className="bg-neo-yellow-light border-b-2 border-neo-dark px-3 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-mono text-neo-dark">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-ping flex-shrink-0" />
            <span>
              <strong>Monitoramento em Tempo Real</strong>: Compensação detectada automaticamente.
            </span>
          </div>
          {(callbackData?.valor || amount) !== undefined && (
            <div className="font-bold text-xs bg-white px-2 py-0.5 border border-neo-dark">
              Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(callbackData?.valor || amount || 0)}
            </div>
          )}
        </div>

        {/* CORPO DO MODAL: IFRAME OU TELA DE SUCESSO COMPLETED */}
        <div className="flex-1 relative overflow-hidden bg-slate-100 flex flex-col min-h-[500px] sm:min-h-[600px]">
          
          {/* Se a compensação bancária já foi detectada (via postMessage do iFrame ou Webhook/SSE) */}
          {isCompleted ? (
            <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in overflow-y-auto">
              <div className="w-16 h-16 bg-emerald-100 border-3 border-emerald-950 rounded-full flex items-center justify-center shadow-neo-md animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-emerald-700" />
              </div>

              <div className="space-y-1 max-w-md">
                <span className="neo-badge bg-emerald-200 text-emerald-950 border-emerald-950">
                  ⚡ Pagamento Confirmado com Sucesso!
                </span>
                <h3 className="font-heading font-bold text-xl text-neo-dark uppercase tracking-tight">
                  Quitação Liquidada no PagTesouro
                </h3>
                <p className="text-xs text-slate-600 font-sans leading-relaxed">
                  A Secretaria do Tesouro Nacional confirmou a transação. Seus créditos e tíquetes já estão liberados!
                </p>
              </div>

              {/* Box de Recibo Detalhado com os Dados da Resposta do PagTesouro */}
              {callbackData && (
                <div className="w-full max-w-md bg-slate-50 border-2 border-neo-dark p-3.5 font-mono text-[11px] text-slate-800 space-y-2 text-left shadow-neo-xs">
                  <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5 font-bold">
                    <span className="text-slate-500 uppercase text-[10px]">Meio Escolhido:</span>
                    <span className="text-neo-brand uppercase">{callbackData.tipoPagamentoEscolhido}</span>
                  </div>
                  {callbackData.nomePSP && (
                    <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5">
                      <span className="text-slate-500 uppercase text-[10px]">Agente Financeiro (PSP):</span>
                      <span className="font-bold text-neo-dark">{callbackData.nomePSP}</span>
                    </div>
                  )}
                  {callbackData.transacaoPSP && (
                    <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5">
                      <span className="text-slate-500 uppercase text-[10px]">Transação PSP:</span>
                      <span className="font-bold text-neo-dark">{callbackData.transacaoPSP}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-0.5 font-bold">
                    <span className="text-slate-600 uppercase text-[10px]">Valor Compensado:</span>
                    <span className="text-emerald-700 text-xs">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(callbackData.valor)}
                    </span>
                  </div>
                </div>
              )}

              {isAuthenticated ? (
                <button
                  onClick={() => {
                    onClose();
                    if (onSuccessRedirect) onSuccessRedirect();
                  }}
                  className="neo-btn-primary py-3 px-6 text-xs flex items-center gap-2 shadow-neo-sm"
                >
                  <span>Acessar Minha Carteira & Tíquetes</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="space-y-3 max-w-sm">
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-950 text-left text-xs font-sans text-emerald-950 leading-relaxed shadow-neo-xs">
                    💡 <strong>Como você comprou sem login</strong>: Apresente o seu <strong>CPF ({contributorCpf || 'informado'})</strong> no balcão do refeitório para retirar a refeição!
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full neo-btn bg-white hover:bg-slate-100 text-xs py-2.5 font-bold"
                  >
                    Concluir e Voltar
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Exibição do iFrame com o PagTesouro
            <>
              {isIframeLoading && (
                <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-neo-brand border-t-transparent rounded-full animate-spin" />
                  <p className="font-heading font-bold text-xs uppercase text-slate-600 tracking-wider">
                    Carregando ambiente seguro do PagTesouro...
                  </p>
                </div>
              )}

              <iframe
                key={iframeKey}
                src={iframeSrc}
                onLoad={() => setIsIframeLoading(false)}
                className="w-full h-full flex-1 border-0 bg-white"
                title="Portal PagTesouro"
                allow="payment; clipboard-read; clipboard-write"
              />
            </>
          )}

        </div>

        {/* RODAPÉ DO MODAL COM INSTRUÇÕES */}
        <div className="bg-slate-50 border-t-2 border-neo-dark p-3 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-neo-brand" />
            <span>Transação processada pelo Tesouro Nacional (STN). Conexão segura ponta a ponta.</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-accent hover:underline flex items-center gap-1 font-bold"
            >
              <span>Abrir em aba cheia</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <button
              onClick={onClose}
              className="font-bold hover:text-neo-dark cursor-pointer text-slate-600"
            >
              Fechar Painel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
