import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  onOpenCart?: () => void;
  hideFooter?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenCart, hideFooter = false }) => {
  return (
    <div className="min-h-screen flex flex-col bg-neo-bg">
      <Navbar onOpenCart={onOpenCart} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};
