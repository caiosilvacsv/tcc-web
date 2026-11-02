import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  confirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmOptions | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, title, message, duration };
    
    setToasts((prev) => {
      if (prev.some((t) => t.type === type && t.message === message)) {
        return prev;
      }
      return [...prev.slice(-3), newToast];
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => {
    showToast('success', message, title || 'Sucesso!');
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast('error', message, title || 'Atenção');
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast('warning', message, title || 'Aviso');
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast('info', message, title || 'Informação');
  }, [showToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmDialog(options);
  }, []);

  const contextValue = useMemo(
    () => ({ showToast, success, error, warning, info, confirm }),
    [showToast, success, error, warning, info, confirm]
  );

  const handleConfirmClose = (accepted: boolean) => {
    if (!confirmDialog) return;
    if (accepted) {
      confirmDialog.onConfirm();
    } else if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    setConfirmDialog(null);
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Container de Toasts Flutuantes */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let bgClass = 'bg-white';
          let borderClass = 'border-neo-dark';
          let Icon = Info;
          let iconColor = 'text-neo-accent';

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-50';
            borderClass = 'border-emerald-950';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-600';
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-50';
            borderClass = 'border-rose-950';
            Icon = AlertCircle;
            iconColor = 'text-rose-600';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-50';
            borderClass = 'border-amber-950';
            Icon = AlertTriangle;
            iconColor = 'text-amber-600';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 border-3 ${borderClass} ${bgClass} shadow-neo-md animate-fade-in flex items-start gap-3`}
            >
              <Icon className={`w-6 h-6 flex-shrink-0 ${iconColor} mt-0.5`} />
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h5 className="font-heading font-bold text-xs uppercase tracking-tight text-neo-dark mb-0.5">
                    {toast.title}
                  </h5>
                )}
                <p className="text-xs text-slate-700 font-sans leading-snug break-words">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-neo-dark cursor-pointer p-0.5 transition-colors"
                aria-label="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de Confirmação Customizado (Substitui window.confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-neo-dark/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white border-3 border-neo-dark p-6 shadow-neo-xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-neo-dark">
              {confirmDialog.isDanger ? (
                <div className="p-2 bg-rose-100 border-2 border-rose-950 text-rose-700">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 bg-neo-yellow-light border-2 border-neo-dark text-neo-dark">
                  <Info className="w-5 h-5" />
                </div>
              )}
              <h3 className="font-heading font-bold text-base uppercase tracking-tight text-neo-dark">
                {confirmDialog.title}
              </h3>
            </div>

            <p className="text-sm text-slate-700 font-sans leading-relaxed mb-6">
              {confirmDialog.message}
            </p>

            <div className="flex gap-3 justify-end pt-3 border-t-2 border-dashed border-slate-300">
              <button
                onClick={() => handleConfirmClose(false)}
                className="neo-btn bg-white hover:bg-slate-100 text-slate-700 py-2 px-4"
              >
                {confirmDialog.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => handleConfirmClose(true)}
                className={
                  confirmDialog.isDanger
                    ? 'neo-btn bg-rose-600 hover:bg-rose-700 text-white border-rose-950 py-2 px-4'
                    : 'neo-btn-primary py-2 px-4'
                }
              >
                {confirmDialog.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};
