// Todas as requisições trafegam na mesma origem (Same-Origin):
// - Em desenvolvimento (DEV): via proxy reverso do Vite (vite.config.ts -> http://localhost:8080)
// - Em produção (OCI / Docker): via proxy reverso do Nginx (nginx.conf -> http://server:8080)
// Isso garante o tráfego transparente do Cookie seguro HttpOnly ("accessToken", SameSite=Lax).
const BASE_URL = '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  skipAuthRedirect?: boolean;
}

/**
 * Cliente HTTP oficial baseado em Fetch API nativa, estruturado sob a norma estrita
 * de segurança HttpOnly Cookie (proteção total contra exfiltração XSS) e LGPD.
 * Nenhum token JWT é lido ou armazenado via JavaScript.
 */
export async function api<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, skipAuthRedirect, ...restOptions } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...restOptions,
      // Obrigatório para receber e enviar automaticamente o Cookie HttpOnly "accessToken"
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });

    if (response.status === 401) {
      sessionStorage.removeItem('auth-session');
      localStorage.removeItem('auth-data');

      const pathname = window.location.pathname;
      const isPublicPage =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/store') ||
        pathname === '/';

      if (!skipAuthRedirect && !isPublicPage) {
        window.location.href = '/login';
      }
      throw new Error('Sessão expirada ou credenciais inválidas. Faça login novamente.');
    }

    if (!response.ok) {
      let errorMessage = 'Ocorreu um erro na comunicação com o servidor.';
      try {
        const errorData = await response.json();
        errorMessage = errorData?.message || errorData?.error || errorMessage;
      } catch {
        // Resposta não-JSON
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return null as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (error: any) {
    throw new Error(error?.message || 'Falha na conexão de rede com o servidor.');
  }
}
