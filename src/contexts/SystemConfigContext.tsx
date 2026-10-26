import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface SystemConfigContextType {
  configs: Record<string, string>;
  isLoadingConfigs: boolean;
  getConfig: (key: string, fallback?: string) => string;
  refreshConfigs: () => Promise<void>;
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

export const SystemConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [isLoadingConfigs, setIsLoadingConfigs] = useState<boolean>(true);

  const refreshConfigs = useCallback(async () => {
    try {
      const data = await api<Record<string, string>>('/config/public', {
        skipAuthRedirect: true,
      });
      if (data && typeof data === 'object') {
        setConfigs(data);
      }
    } catch {
      // Caso o servidor esteja iniciando, mantém o estado atual sem interromper a renderização
    } finally {
      setIsLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    refreshConfigs();
  }, [refreshConfigs]);

  const getConfig = useCallback(
    (key: string, fallback = ''): string => {
      const val = configs[key];
      return val !== undefined && val !== '' ? val : fallback;
    },
    [configs]
  );

  return (
    <SystemConfigContext.Provider
      value={{
        configs,
        isLoadingConfigs,
        getConfig,
        refreshConfigs,
      }}
    >
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = (): SystemConfigContextType => {
  const ctx = useContext(SystemConfigContext);
  if (!ctx) {
    throw new Error('useSystemConfig deve ser utilizado dentro de um SystemConfigProvider');
  }
  return ctx;
};
