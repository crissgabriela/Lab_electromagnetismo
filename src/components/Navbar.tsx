/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Zap, 
  HelpCircle, 
  Github, 
  BookOpen, 
  CheckCircle2, 
  X,
  ExternalLink,
  GraduationCap
} from 'lucide-react';

interface NavbarProps {
  onOpenLabGuide?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [showGuideModal, setShowGuideModal] = useState(false);

  return (
    <>
      <header className="bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 shadow-lg">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Lab Title */}
          <div className="flex items-center gap-3">
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
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                Laboratorio N° 1 • Universidad de Talca
              </p>
            </div>
          </div>

          {/* Action Links & Lab Guide Help */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Guía del Laboratorio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Lab Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
                <BookOpen className="w-5 h-5" />
                <span>Instrucciones: Laboratorio N° 1</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Objetivos de Aprendizaje
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Identificar cargas y su polaridad (positiva / negativa).</li>
                  <li>Determinar el vector del campo eléctrico resultante $\vec{E}_{total}$ por superposición.</li>
                  <li>Determinar el potencial eléctrico escalar $V_{total}$.</li>
                  <li>Comprender la distribución espacial y patrones en 2D y 3D.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-100 text-sm">Procedimientos en la Guía Oficial</h4>

                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-indigo-300">Actividad 1: Campo Eléctrico en el origen (0,0)</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Indicar las cargas y su polaridad (magnitud $|e|$).</li>
                    <li>Indicar el vector posición $\vec{r}_i$ de las cargas.</li>
                    <li>Calcular la distancia $r_i$ entre cada carga y el punto $(0,0)$.</li>
                    <li>Determinar el vector unitario de dirección $\hat{r}_i$.</li>
                    <li>Calcular el vector $\vec{E}_i$ de cada carga en $(0,0)$.</li>
                    <li>Calcular el vector $\vec{E}_{total}$ sumando las componentes vectoriales.</li>
                  </ol>
                </div>

                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-cyan-300">Actividad 2: Potencial Eléctrico en el origen (0,0)</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Indicar las cargas y polaridad (magnitudes $|e|, |2e|, |4e|$).</li>
                    <li>Indicar el vector posición $\vec{r}_i$ de las cargas.</li>
                    <li>Calcular la distancia $r_i$ al punto $(0,0)$.</li>
                    <li>Calcular el potencial eléctrico escalar $V_i = k_e q_i / r_i$.</li>
                    <li>Calcular el potencial eléctrico total $V_{total} = \sum V_i$.</li>
                  </ol>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-indigo-300">
                <strong>Consejo:</strong> Usa los botones de <em>"Guía Lab"</em> en el panel de control para cargar automáticamente los sistemas exactos de los Gráficos 1 y 2.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
