/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DataPoint } from '../types';
import { Download, Table, Trash2, LineChart, HelpCircle, Check } from 'lucide-react';

interface OscilloscopeProps {
  dataPoints: DataPoint[];
  onClearPoints: () => void;
  capturedTable: DataPoint[];
  onCaptureCurrentPoint: () => void;
  onClearTable: () => void;
  idealCurveType: 'charge' | 'discharge' | 'ohm';
  rcParameters: { R: number; C: number; V0: number };
}

export default function Oscilloscope({
  dataPoints,
  onClearPoints,
  capturedTable,
  onCaptureCurrentPoint,
  onClearTable,
  idealCurveType,
  rcParameters
}: OscilloscopeProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'table'>('graph');

  // Generate continuous theoretical curve coordinates for drawing on the grid
  // Max time in graph is typically 30s
  const maxGraphTime = 30;
  const maxVoltage = 15;

  const getTheoreticalValue = (t: number): number => {
    const { R, C, V0 } = rcParameters;
    const tau = R * C;
    if (tau <= 0) return 0;

    if (idealCurveType === 'charge') {
      return V0 * (1 - Math.exp(-t / tau));
    } else if (idealCurveType === 'discharge') {
      return V0 * Math.exp(-t / tau);
    } else {
      // Ohmic curve (constant V0 as baseline)
      return V0;
    }
  };

  // Build SVG path coordinates for the theoretical curve
  const generateIdealPath = () => {
    if (dataPoints.length === 0) return '';
    const width = 500;
    const height = 150;
    
    let points = [];
    for (let i = 0; i <= 100; i++) {
      const t = (i / 100) * maxGraphTime;
      const v = getTheoreticalValue(t);
      
      const x = (t / maxGraphTime) * width;
      const y = height - (Math.min(v, maxVoltage) / maxVoltage) * height;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${points.join(' L ')}`;
  };

  // Build SVG path for user's actual measured data points
  const generateMeasuredPath = () => {
    if (dataPoints.length === 0) return '';
    const width = 500;
    const height = 150;

    const points = dataPoints.map(p => {
      const x = (p.time / maxGraphTime) * width;
      const y = height - (Math.min(p.measuredV, maxVoltage) / maxVoltage) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  };

  // Render dots for user's captured measurements
  const renderCapturedDots = () => {
    const width = 500;
    const height = 150;

    return capturedTable.map((p, idx) => {
      const x = (p.time / maxGraphTime) * width;
      const y = height - (Math.min(p.measuredV, maxVoltage) / maxVoltage) * height;

      if (x < 0 || x > width || y < 0 || y > height) return null;

      return (
        <g key={idx}>
          <circle
            cx={x}
            cy={y}
            r="4.5"
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="1.5"
            className="animate-pulse"
          />
          <text
            x={x + 6}
            y={y - 6}
            fill="#ffffff"
            className="text-[8px] font-bold font-mono"
          >
            P{idx + 1}
          </text>
        </g>
      );
    });
  };

  // Copy captured table directly to clipboard in Excel-ready Tab-Separated values (TSV)
  const handleCopyTSV = () => {
    if (capturedTable.length === 0) return;

    // Header labels
    let text = "Punto\tTiempo [s]\tVoltaje Exp. [V]\tVoltaje Teór. [V]\tDiscrepancia [%]\n";
    
    capturedTable.forEach((p, idx) => {
      const tVal = getTheoreticalValue(p.time);
      const diffLabel = tVal > 0 
        ? `${Math.abs((p.measuredV - tVal) / tVal * 100).toFixed(1)}%`
        : '0.0%';

      text += `${idx + 1}\t${p.time.toFixed(2)}\t${p.measuredV.toFixed(3)}\t${tVal.toFixed(3)}\t${diffLabel}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="bg-[#0f1117] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 font-sans text-slate-300 select-none shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      
      {/* Scope Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 bg-[#0a0b0e]/30 -mx-5 px-5 -mt-5 pt-4 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-slate-200">
            Osciloscopio y Análisis de Datos
          </h3>
        </div>
        
        {/* Toggle Graph vs Table */}
        <div className="flex bg-[#0a0b0e] border border-slate-800 p-0.5 rounded-lg text-[9px] font-bold text-slate-500">
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'graph' ? 'bg-[#0f1117] text-[#22d3ee] font-black border border-slate-800 shadow' : 'hover:text-slate-300'}`}
          >
            Osciloscopio TR
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'table' ? 'bg-[#0f1117] text-[#22d3ee] font-black border border-slate-800 shadow' : 'hover:text-slate-300'}`}
          >
            Protocolo de Datos ({capturedTable.length})
          </button>
        </div>
      </div>

      {activeTab === 'graph' ? (
        <div className="flex flex-col gap-3">
          
          {/* Bezel view layout */}
          <div className="bg-[#020503] rounded-xl border border-emerald-950/60 p-3.5 relative shadow-inner overflow-hidden shadow-[inset_0_0_25px_rgba(0,0,0,0.9)]">
            {/* Visual scanline raster effect grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)+50%,rgba(0,0,0,0.25)+50%)] bg-[size:100%_4px] pointer-events-none opacity-20" />
            
            {/* Real-time plot */}
            <div className="relative h-[165px] w-full">
              {/* Retro digital graticule grid lines */}
              <div className="absolute inset-0 flex justify-between pointer-events-none opacity-10">
                {Array.from({ length: 11 }).map((_, idx) => (
                  <div key={idx} className="h-full w-[1px] bg-emerald-400" />
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="w-full h-[1px] bg-emerald-400" />
                ))}
              </div>

              {/* Dynamic Coordinate labels on edges */}
              <div className="absolute top-0.5 left-1 text-[8px] font-mono text-emerald-500/80">
                15.0V
              </div>
              <div className="absolute bottom-0.5 left-1 text-[8px] font-mono text-emerald-500/80">
                0V
              </div>
              <div className="absolute bottom-0.5 right-1 text-[8px] font-mono text-emerald-500/80">
                30.0s
              </div>

              {/* Core SVG Render of curves */}
              <svg className="w-full h-full scale-y-100" viewBox="0 0 500 150" fill="none" preserveAspectRatio="none">
                {/* 1. Dashed Green Theoretical Curve line */}
                {generateIdealPath() && (
                  <path
                    d={generateIdealPath()}
                    stroke="#047857"
                    strokeWidth="1.5"
                    strokeDasharray="4, 4"
                    opacity={0.8}
                  />
                )}

                {/* 2. Solid cyan measured curve line */}
                {generateMeasuredPath() && (
                  <path
                    d={generateMeasuredPath()}
                    stroke="#10b981"
                    strokeWidth="2.5"
                    className="drop-shadow-[0_0_4px_rgba(16,185,129,0.8)]"
                  />
                )}

                {/* 3. Captured tabular points overlay */}
                {renderCapturedDots()}
              </svg>

              {dataPoints.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020503]/85 backdrop-blur-[1px]">
                  <span className="text-[10px] text-emerald-500/70 font-mono tracking-widest animate-pulse font-bold">
                    ESPERANDO SEÑAL DE POTENCIAL ...
                  </span>
                  <span className="text-[8px] text-slate-500 mt-1 font-mono">
                    Sujeta las sondas del multímetro o inicia el cronómetro.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Graphical legend markings */}
          <div className="flex justify-between items-center text-[10px] bg-[#0a0b0e]/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-slate-400">
                <span className="w-3.5 h-[2px] bg-emerald-500 inline-block shadow-lg" /> Voltaje Medido [V]
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
                <span className="w-3.5 h-[2px] bg-emerald-700 stroke-dasharray-[2,2] inline-block border-t border-dashed" /> Voltaje Teórico
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Puntos Históricos
              </span>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={onCaptureCurrentPoint}
                className="bg-cyan-600 border border-cyan-500/30 text-[#0a0b0e] font-extrabold hover:bg-cyan-500 px-3 py-1.5 text-[9px] rounded uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(8,145,178,0.3)] cursor-pointer flex items-center gap-1"
              >
                Capturar Punto (P)
              </button>
              <button
                onClick={onClearPoints}
                className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors cursor-pointer"
                title="Limpiar Trazo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          
          {/* Data log output table (Word / Excel spec) */}
          <div className="overflow-x-auto bg-slate-950/70 border border-slate-800 rounded-xl max-h-[175px] scrollbar-thin">
            <table className="w-full text-left border-collapse text-[10px] font-mono text-slate-300">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-sans">
                  <th className="p-2.5 font-black uppercase text-[8.5px]">Pto</th>
                  <th className="p-2.5 font-black uppercase text-[8.5px]">Tiempo [t]</th>
                  <th className="p-2.5 font-black uppercase text-[8.5px]">Voltaje Exp [V]</th>
                  <th className="p-2.5 font-black uppercase text-[8.5px]">Voltaje Teór [V]</th>
                  <th className="p-2.5 font-black uppercase text-[8.5px]">Discrepancia</th>
                </tr>
              </thead>
              <tbody>
                {capturedTable.length > 0 ? (
                  capturedTable.map((p, idx) => {
                    const idealV = getTheoreticalValue(p.time);
                    const discrepancy = idealV > 0 
                      ? `${Math.abs((p.measuredV - idealV) / idealV * 100).toFixed(1)}%`
                      : '0.0%';

                    return (
                      <tr key={idx} className="border-b border-slate-900 hover:bg-slate-900/40">
                        <td className="p-2.5 font-black text-rose-450">P{idx + 1}</td>
                        <td className="p-2.5 text-stone-300">{p.time.toFixed(2)}s</td>
                        <td className="p-2.5 text-emerald-400 font-extrabold">{p.measuredV.toFixed(3)} V</td>
                        <td className="p-2.5 text-emerald-600">{idealV.toFixed(3)} V</td>
                        <td className="p-2.5 text-amber-500 font-bold">{discrepancy}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500 font-sans">
                      Presiona "Capturar Punto" en el osciloscopio para registrar coordenadas de carga/descarga y calibrar tu informe. No hay datos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2.5 pt-1.5 font-sans">
            <button
              disabled={capturedTable.length === 0}
              onClick={handleCopyTSV}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                capturedTable.length === 0
                  ? 'bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                  : 'bg-cyan-600 border border-cyan-500/30 text-[#0a0b0e] hover:bg-cyan-500 cursor-pointer shadow-[0_0_12px_rgba(8,145,178,0.25)]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#0a0b0e]" /> ¡Datos Copiados! (Listo para Excel)
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-[#0a0b0e]" /> Exportar Tabla para Informe (Word/Excel)
                </>
              )}
            </button>
            <button
              disabled={capturedTable.length === 0}
              onClick={onClearTable}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-450 hover:text-red-400 hover:bg-red-950/20 text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Borrar Tabla"
            >
              Borrar Protocolo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
