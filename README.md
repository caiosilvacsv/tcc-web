# 🏛️ IFNMG Express Moderno - Frontend Web (`tcc-web`)

Interface web SPA (React 18 + TypeScript + Vite + Tailwind CSS) do sistema de arrecadação de receitas públicas e carteira digital de tíquetes integrado ao **PagTesouro (STN)**.

## Arquitetura de Implantação (Same-Origin em Container)

O frontend opera em modo **Same-Origin** junto ao backend (`tcc-server`):

- **Em Produção (OCI / Docker Compose):** O [`Dockerfile`](./Dockerfile) compila o bundle estático e o serve via **Nginx Alpine** ([`nginx.conf`](./nginx.conf)), que atua simultaneamente como servidor da SPA (`try_files $uri $uri/ /index.html`) e Proxy Reverso interno para `http://server:8080` (incluindo suporte sem buffer para Server-Sent Events em `/payments/{id}/sse`).
- **Em Desenvolvimento Local (`npm run dev`):** O [`vite.config.ts`](./vite.config.ts) faz o proxy reverso automático de todas as rotas da API para `http://localhost:8080`.
- **Segurança de Sessão:** Autenticação baseada exclusivamente em cookies `HttpOnly` (`SameSite=Lax`), sem exposição de tokens JWT ao JavaScript e sem necessidade de variáveis `.env` no frontend.
