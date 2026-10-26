import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import {
  Store,
  Wallet,
  UserCheck,
  ShieldCheck,
  LogIn,
  LogOut,
  ShoppingCart,
  Menu,
  X,
  Building2,
} from 'lucide-react';

interface NavbarProps {
  onOpenCart?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCart }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { items: cartItems, getSubtotal } = useCart();
  const { getConfig } = useSystemConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = getSubtotal();

  const institutionName = getConfig('institution.name', 'IFNMG • CAMPUS SALINAS');
  const portalName = getConfig('institution.portal_name', 'IFNMG.EXPRESS');
  const portalSubtitle = getConfig(
    'institution.portal_subtitle',
    'Portal Institucional de Pagamentos & Tíquetes'
  );
  const systemVersion = getConfig('system.version', 'v3.0');

  const isActive = (path: string) =>
    location.pathname === path || (path === '/admin' && location.pathname.startsWith('/admin'));

  const displayFullName = user
    ? `${user.name}${user.lastName ? ' ' + user.lastName : ''}`
    : 'Usuário';

  const displayInitial = (user?.name?.charAt(0) || 'U').toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white border-b-3 border-neo-dark shadow-neo-sm">
      {/* Barra institucional superior alimentada por GET /config/public */}
      <div className="bg-neo-dark text-white px-4 py-1 text-[11px] font-mono flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="hidden sm:inline font-bold uppercase">{institutionName}</span>
          <span className="text-slate-400">|</span>
          <span className="text-emerald-300 font-bold uppercase tracking-wider">
            Arrecadação Digital STN / PagTesouro
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          <span className="hidden md:inline text-[10px] text-slate-400">
            Segurança HttpOnly & LGPD
          </span>
          <span className="text-[10px] font-bold text-neo-yellow">{systemVersion}</span>
        </div>
      </div>

      {/* Conteúdo principal da Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/store" className="flex items-center gap-3 no-underline group select-none">
          <div className="w-10 h-10 bg-neo-brand border-2 border-neo-dark flex items-center justify-center shadow-neo-xs group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-lg text-neo-dark tracking-tight leading-none">
                {portalName}
              </span>
              <span className="px-1.5 py-0.2 border border-neo-dark text-[9px] font-mono font-bold bg-neo-yellow text-neo-dark uppercase">
                Digital
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 tracking-tight leading-tight mt-0.5 hidden sm:block">
              {portalSubtitle}
            </p>
          </div>
        </Link>

        {/* Links de navegação desktop */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link
            to="/store"
            className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 no-underline ${
              isActive('/store')
                ? 'bg-neo-brand text-white border-neo-dark shadow-neo-xs'
                : 'bg-transparent text-neo-dark border-transparent hover:border-neo-dark hover:bg-slate-100'
            }`}
          >
            <Store className="w-4 h-4" /> Vitrine / Loja
          </Link>

          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 no-underline ${
                isActive('/dashboard')
                  ? 'bg-neo-yellow text-neo-dark border-neo-dark shadow-neo-xs'
                  : 'bg-transparent text-neo-dark border-transparent hover:border-neo-dark hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-4 h-4" /> Minha Carteira
            </Link>
          )}

          {isAuthenticated && user?.role === 'ADMIN' && (
            <>
              <Link
                to="/guiche"
                className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 no-underline ${
                  isActive('/guiche')
                    ? 'bg-neo-yellow text-neo-dark border-neo-dark shadow-neo-xs'
                    : 'bg-transparent text-neo-dark border-transparent hover:border-neo-dark hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4" /> Guichê POS
              </Link>
              <Link
                to="/admin"
                className={`px-3 py-2 text-xs font-heading font-bold uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 no-underline ${
                  isActive('/admin')
                    ? 'bg-neo-accent text-white border-neo-dark shadow-neo-xs'
                    : 'bg-transparent text-neo-dark border-transparent hover:border-neo-dark hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Central Admin
              </Link>
            </>
          )}
        </nav>

        {/* Lado Direito: Carrinho + Perfil de Usuário */}
        <div className="flex items-center gap-2.5">
          {totalCartCount > 0 && (
            <button
              onClick={onOpenCart}
              className="neo-btn bg-neo-yellow text-neo-dark border-neo-dark py-2 px-3 shadow-neo-xs flex items-center gap-2 cursor-pointer"
              title="Abrir carrinho"
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-neo-dark text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center">
                  {totalCartCount}
                </span>
              </div>
              <span className="font-mono font-bold text-xs hidden sm:inline">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  subtotal
                )}
              </span>
            </button>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-slate-100 border-2 border-neo-dark text-xs">
                <div className="w-6 h-6 bg-neo-brand text-white font-mono font-bold text-xs flex items-center justify-center">
                  {displayInitial}
                </div>
                <div className="text-left">
                  <span className="block font-bold text-[11px] text-neo-dark truncate max-w-[150px]">
                    {displayFullName}
                  </span>
                  <span className="inline-block px-1 py-0.1 border border-neo-dark text-[8px] font-mono font-bold uppercase bg-neo-yellow text-neo-dark">
                    {user?.role}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="neo-btn bg-rose-50 text-rose-900 border-rose-950 hover:bg-rose-100 py-2 px-3 shadow-neo-xs flex items-center gap-1.5 cursor-pointer"
                title="Encerrar sessão segura"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="neo-btn-primary py-2 px-3.5 shadow-neo-xs flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 border-2 border-neo-dark bg-white hover:bg-slate-100 cursor-pointer shadow-neo-xs"
            aria-label="Abrir menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu Mobile Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t-3 border-neo-dark bg-white p-4 space-y-3 shadow-neo-lg animate-fade-in">
          {isAuthenticated && (
            <div className="p-3 bg-slate-50 border-2 border-neo-dark mb-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Sessão Autenticada
                </span>
                <span className="font-bold text-xs text-neo-dark">{displayFullName}</span>
              </div>
              <span className="px-2 py-0.5 border border-neo-dark text-[9px] font-mono font-bold uppercase bg-neo-yellow">
                {user?.role}
              </span>
            </div>
          )}

          <Link
            to="/store"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2.5 font-heading font-bold text-xs uppercase border-2 border-neo-dark bg-slate-50 no-underline text-neo-dark"
          >
            <Store className="w-4 h-4 text-neo-brand" /> Vitrine / Loja Pública
          </Link>

          {isAuthenticated && (
            <Link
              to="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2.5 font-heading font-bold text-xs uppercase border-2 border-neo-dark bg-slate-50 no-underline text-neo-dark"
            >
              <Wallet className="w-4 h-4 text-neo-yellow" /> Minha Carteira Acadêmica
            </Link>
          )}

          {isAuthenticated && user?.role === 'ADMIN' && (
            <>
              <Link
                to="/guiche"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 font-heading font-bold text-xs uppercase border-2 border-neo-dark bg-slate-50 no-underline text-neo-dark"
              >
                <UserCheck className="w-4 h-4 text-neo-yellow" /> Guichê de Atendimento POS
              </Link>
              <Link
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 font-heading font-bold text-xs uppercase border-2 border-neo-dark bg-slate-50 no-underline text-neo-dark"
              >
                <ShieldCheck className="w-4 h-4 text-neo-accent" /> Central Administrativa
              </Link>
            </>
          )}

          {isAuthenticated ? (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="w-full neo-btn bg-rose-50 text-rose-900 border-rose-950 py-2.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sair da Conta
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="neo-btn-primary py-2.5 cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/register');
                }}
                className="neo-btn bg-white hover:bg-slate-100 py-2.5 cursor-pointer"
              >
                Cadastrar
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
