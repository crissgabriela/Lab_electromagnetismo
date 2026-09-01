/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Zap, 
  GraduationCap
} from 'lucide-react';
import facultadLogo from '../assets/logo-facultad-ingenieria.png';

export const Navbar: React.FC = () => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-2.5 shadow-lg">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Logo & Lab Title */}
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                Simulador de Campo y Potencial Eléctrico
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                2D & 3D
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              Laboratorio N° 1 • Universidad de Talca
            </p>
          </div>
        </div>

        {/* Right: Official Faculty Logo Badge */}
        <div className="flex items-center">
          <div className="bg-white/95 hover:bg-white px-3.5 py-1 rounded-xl shadow-md border border-slate-200/20 transition-all flex items-center">
            <img 
              src={facultadLogo} 
              alt="Facultad de Ingeniería - Universidad de Talca" 
              className="h-10 sm:h-11 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
