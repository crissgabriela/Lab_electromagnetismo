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
    <header className="bg-slate-900/95 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 shadow-2xl">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4 sm:gap-6">
        {/* Left: Prominent Simulator Icon & Title */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-xl shadow-indigo-500/30 ring-1 ring-white/20 shrink-0">
            <Zap className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-100 tracking-tight">
                Simulador de Campo y Potencial Eléctrico
              </h1>
              <span className="text-xs uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm">
                2D & 3D
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 mt-1 font-medium">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              Laboratorio N° 1 de Electromagnetismo • Universidad de Talca
            </p>
          </div>
        </div>

        {/* Right: Transparent Official Faculty Logo (Taller and Seamless) */}
        <div className="flex items-center">
          <img 
            src={facultadLogo} 
            alt="Facultad de Ingeniería - Universidad de Talca" 
            className="h-12 sm:h-14 md:h-16 w-auto object-contain drop-shadow-md"
          />
        </div>
      </div>
    </header>
  );
};
