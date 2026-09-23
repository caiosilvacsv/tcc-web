// Se estivermos em modo de desenvolvimento (DEV), usamos a string vazia '' por padrão.
// Isso força as requisições a passarem pelo proxy do Vite (/api, /auth, /product) configurado
// em vite.config.ts, contornando erros de CORS no navegador local de forma limpa.
const rawBaseUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Utilitário robusto baseado em Fetch API nativa do navegador
 * para realizar requisições assíncronas ao backend Java do TCC.
 */
export async function api<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  // 1. Constrói a URL com parâmetros de busca, se houver
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // 2. Monta os cabeçalhos padrão e lê o token JWT do localStorage
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authData = localStorage.getItem('auth-data');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      const token = parsed?.token;
      if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Erro ao ler token do localStorage', e);
    }
  }

  // 3. Executa a requisição nativa usando o window.fetch
  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });

    // 4. Trata expiração de sessão ou erro de credenciais (401)
    if (response.status === 401) {
      localStorage.removeItem('auth-data');
      
      const isAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register');
      
      // Só redireciona se não estiver nas páginas públicas de loja ou nas próprias telas de login/registro
      if (!isAuthPage && !window.location.pathname.startsWith('/store') && !window.location.pathname.startsWith('/checkout/guest')) {
        window.location.href = '/login';
      }
      throw new Error('E-mail ou senha incorretos. Por favor, tente novamente.');
    }

    // 5. Trata respostas de erro (4xx, 5xx) normalizando com o DTO de erro do Spring Boot
    if (!response.ok) {
      let errorMessage = 'Ocorreu um erro na comunicação com o servidor.';
      try {
        const errorData = await response.json();
        errorMessage = errorData?.message || errorMessage;
      } catch {
        // Fallback se a resposta não for um JSON válido
      }
      throw new Error(errorMessage);
    }

    // 6. Retorna o JSON convertido se a requisição foi bem sucedida
    if (response.status === 204) {
      return null as unknown as T;
    }

    return await response.json() as T;
  } catch (error: any) {
    // Repassa o erro com a mensagem normalizada
    throw new Error(error?.message || 'Falha na conexão de rede.');
  }
}
