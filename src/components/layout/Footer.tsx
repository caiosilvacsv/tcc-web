import React from 'react';
import { ShieldCheck, GraduationCap, Building } from 'lucide-react';
import { useSystemConfig } from '../../contexts/SystemConfigContext';

export const Footer: React.FC = () => {
  const { getConfig } = useSystemConfig();
  const institutionName = getConfig('institution.name', 'IFNMG • Campus Salinas');
  const institutionAddress = getConfig(
    'institution.address',
    'Fazenda Desterro, Rodovia Salinas / Taiobeiras, Km 02 • CEP: 39560-000 • Salinas - MG'
  );

  return (
    <footer className="mt-16 bg-white border-t-3 border-neo-dark">
      {/* Barra superior de conformidade institucional */}
      <div className="bg-neo-bg border-b-2 border-neo-dark py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-slate-600">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-neo-brand-light border border-neo-dark text-emerald-900">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span>
              Conformidade com a <strong>LGPD (Lei nº 13.709/2018)</strong> e Diretrizes de
              Acessibilidade <strong>e-MAG</strong>.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="font-bold text-neo-dark">PagTesouro Online</span>
            </span>
            <span className="text-slate-400">•</span>
            <span>Ambiente Acadêmico de Produção</span>
          </div>
        </div>
      </div>

      {/* Grid principal de links e detalhes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Coluna 1: Identificação Institucional vinda do Backend (/config/public) */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neo-brand border-2 border-neo-dark flex items-center justify-center font-bold text-white text-xs">
                IF
              </div>
              <span className="font-heading font-bold text-base uppercase tracking-tight text-neo-dark">
                {institutionName}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed max-w-md">
              Sistema moderno de arrecadação pública digital e controle logístico de tíquetes de
              alimentação e taxas acadêmicas. Conectado de forma reativa à infraestrutura da
              Secretaria do Tesouro Nacional (STN).
            </p>
            <div className="pt-2 text-[11px] font-mono text-slate-500">
              <p>📍 {institutionAddress}</p>
            </div>
          </div>

          {/* Coluna 2: Informações Acadêmicas do TCC */}
          <div className="space-y-2.5">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-neo-dark flex items-center gap-1.5 border-b-2 border-neo-dark pb-1">
              <GraduationCap className="w-4 h-4 text-neo-brand" /> Monografia TCC II
            </h4>
            <ul className="text-xs font-sans text-slate-600 space-y-1.5">
              <li>
                <strong>Curso:</strong> Bacharelado em Sistemas de Informação
              </li>
              <li>
                <strong>Autor:</strong> Caio da Silva Viana
              </li>
              <li>
                <strong>Instituição:</strong> {institutionName}
              </li>
              <li>
                <strong>Ano:</strong> {new Date().getFullYear()}
              </li>
            </ul>
          </div>

          {/* Coluna 3: Auditoria e Tecnologias */}
          <div className="space-y-2.5">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-neo-dark flex items-center gap-1.5 border-b-2 border-neo-dark pb-1">
              <Building className="w-4 h-4 text-neo-accent" /> Arquitetura
            </h4>
            <div className="space-y-1.5 text-xs font-mono text-slate-600">
              <p>• Java 25 & Spring Boot 4</p>
              <p>• Spring WebFlux Reativo & SSE</p>
              <p>• React 18 & Vite & Tailwind</p>
              <p>• PostgreSQL & Flyway</p>
            </div>
          </div>
        </div>

        {/* Rodapé final com copyright */}
        <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] font-mono text-slate-500">
          <p>
            © {new Date().getFullYear()} {institutionName}. Todos os direitos reservados para fins
            acadêmicos.
          </p>
          <div className="flex items-center gap-1">
            <span>Desenvolvido com excelência técnica para o IFNMG</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
