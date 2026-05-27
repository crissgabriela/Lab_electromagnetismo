/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CircuitComponent, ComponentType } from '../types';
import { Zap, Play, Pause, RotateCcw, Sliders, Layers, Info, Trash2, Eye, HelpCircle } from 'lucide-react';

interface SidebarProps {
  onAddComponent: (type: ComponentType, isOhmicResistor?: boolean) => void;
  selectedComponent: CircuitComponent | null;
  onUpdateComponent: (updated: CircuitComponent) => void;
  onLoadScenario: (scenarioId: string) => void;
  onClearCanvas: () => void;
  showEField: boolean;
  onToggleEField: () => void;
  simulationSpeed: number;
  onSetSimulationSpeed: (spd: number) => void;
  // Stopwatch
  stopwatchTime: number;
  stopwatchRunning: boolean;
  onToggleStopwatch: () => void;
  onResetStopwatch: () => void;
}

export default function Sidebar({
  onAddComponent,
  selectedComponent,
  onUpdateComponent,
  onLoadScenario,
  onClearCanvas,
  showEField,
  onToggleEField,
  simulationSpeed,
  onSetSimulationSpeed,
  stopwatchTime,
  stopwatchRunning,
  onToggleStopwatch,
  onResetStopwatch
}: SidebarProps) {
  return (
    <div className="w-[320px] bg-[#0f1117] border-l border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto h-full scrollbar-none select-none text-slate-300">
      
      {/* Simulation Controllers (Time controls & Stopwatch) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold tracking-widest text-slate-500 flex items-center gap-1.5 uppercase">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> Control de Entorno
          </h3>
          <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/20 active-state">STABLE</span>
        </div>

        {/* Stopwatch Chronometer */}
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold tracking-widest text-slate-500">Cronómetro (RC)</span>
            <span className="text-xl font-mono text-cyan-400 font-extrabold tracking-widest">
              {stopwatchTime.toFixed(2)}s
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onToggleStopwatch}
              className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                stopwatchRunning
                  ? 'bg-red-950/40 border-red-800 text-red-400'
                  : 'bg-cyan-950/40 border-cyan-800 text-cyan-400 hover:bg-cyan-900/30'
              }`}
            >
              {stopwatchRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onResetStopwatch}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Physics toggles */}
        <div className="flex flex-col gap-2.5 pt-1.5 border-t border-slate-800/50 text-xs">
          <label className="flex items-center justify-between cursor-pointer hover:text-cyan-400 transition-colors">
            <span className="text-[11px] font-semibold text-slate-400">Visualizar Campo Eléctrico (E)</span>
            <input
              type="checkbox"
              checked={showEField}
              onChange={onToggleEField}
              className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-cyan-500 accent-cyan-500"
            />
          </label>
          
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span className="uppercase tracking-wide">Flujo de Partículas</span>
              <span className="font-mono text-cyan-400 font-semibold">{simulationSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={simulationSpeed}
              onChange={(e) => onSetSimulationSpeed(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg cursor-pointer appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Component Spawner Toolbox */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Bibliotecas de Componentes</div>
        <p className="text-[9px] text-slate-500 leading-normal mb-2">
          Haz clic en cualquier componente para insertarlo en el panel de física experimental.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onAddComponent('source')}
            className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer group transition-colors flex flex-col items-center gap-1 text-xs"
          >
            <div className="h-8 flex items-center justify-center">
              <div className="w-10 h-5 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded flex items-center justify-center font-bold text-[8px] tracking-widest text-[#0a0b0e] shadow-[0_0_10px_rgba(6,182,212,0.3)]">DC</div>
            </div>
            <div className="text-[10px] text-center font-medium group-hover:text-cyan-400">Fuente de Poder</div>
          </button>

          <button
            onClick={() => onAddComponent('resistor', true)}
            className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer group transition-colors flex flex-col items-center gap-1 text-xs"
          >
            <div className="h-8 flex items-center justify-center">
              <div className="w-8 h-2.5 bg-amber-200/90 rounded border border-amber-800/60 relative">
                <div className="absolute top-0 bottom-0 left-2 w-1 bg-red-650"></div>
                <div className="absolute top-0 bottom-0 left-4 w-1 bg-indigo-650"></div>
              </div>
            </div>
            <div className="text-[10px] text-center font-medium group-hover:text-cyan-400">Resistencia</div>
          </button>

          <button
            onClick={() => onAddComponent('resistor', false)}
            className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer group transition-colors flex flex-col items-center gap-1 text-xs"
          >
            <div className="h-8 flex items-center justify-center">
              <div className="w-5 h-5 bg-yellow-500/25 border border-yellow-500/45 rounded-full flex items-center justify-center text-[10px] text-yellow-300 font-bold shadow-[0_0_8px_rgba(234,179,8,0.2)]">💡</div>
            </div>
            <div className="text-[10px] text-center font-medium group-hover:text-cyan-400">Ampolleta</div>
          </button>

          <button
            onClick={() => onAddComponent('capacitor')}
            className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer group transition-colors flex flex-col items-center gap-1 text-xs"
          >
            <div className="h-8 flex items-center justify-center">
              <div className="w-4 h-6 bg-emerald-600/30 rounded border border-emerald-500/40 flex items-center justify-center text-[8px] text-emerald-400 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.2)]">- -</div>
            </div>
            <div className="text-[10px] text-center font-medium group-hover:text-cyan-400">Condensador</div>
          </button>

          <button
            onClick={() => onAddComponent('switch')}
            className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer group transition-colors flex flex-col items-center gap-1 text-xs"
          >
            <div className="h-8 flex items-center justify-center">
              <div className="w-7 h-3 bg-orange-600/30 border border-orange-550/40 rounded rotate-12 relative flex items-center justify-center">
                <span className="text-[7.5px] font-bold text-orange-400 font-mono">S</span>
              </div>
            </div>
            <div className="text-[10px] text-center font-medium group-hover:text-cyan-400">Interruptor [S]</div>
          </button>

          <button
            onClick={() => onAddComponent('ammeter')}
            className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer group transition-colors flex flex-col items-center gap-1 text-xs"
          >
            <div className="h-8 flex items-center justify-center">
              <div className="w-10 h-5 bg-slate-800 rounded border border-slate-700 text-[8px] font-mono text-cyan-400 font-bold text-center flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.1)]">0.00A</div>
            </div>
            <div className="text-[10px] text-center font-medium group-hover:text-cyan-400">Amperímetro</div>
          </button>
        </div>
      </div>

      {/* Selected Component Editor Details */}
      <div className="flex-1 flex flex-col gap-2.5 min-h-[220px]">
        <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Componente Seleccionado</div>

        {selectedComponent ? (
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 flex flex-col gap-3.5 shadow-lg">
            {/* Component type header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase text-slate-100">
                {selectedComponent.type === 'source' ? 'Fuente DC' : selectedComponent.type === 'resistor' ? 'Resistencia' : selectedComponent.type === 'capacitor' ? 'Condensador' : selectedComponent.type === 'switch' ? 'Interruptor' : 'Amperímetro'}
              </span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-700/50">
                ID: {selectedComponent.id.substring(0,6).toUpperCase()}
              </span>
            </div>

            {/* Voltage slider for power source */}
            {selectedComponent.type === 'source' && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Voltaje (V)</span>
                  <span className="text-cyan-400 font-bold font-mono">{(selectedComponent.voltage ?? 12).toFixed(1)}V</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="0.5"
                  value={selectedComponent.voltage ?? 12}
                  onChange={(e) => onUpdateComponent({
                    ...selectedComponent,
                    voltage: parseFloat(e.target.value)
                  })}
                  className="w-full h-1 bg-slate-700 rounded-lg cursor-pointer appearance-none accent-cyan-500"
                />
              </div>
            )}

            {/* Resistance slider (for Ohmic and Non-ohmic resistors) */}
            {selectedComponent.type === 'resistor' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline text-xs font-mono">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Resistencia (R)</span>
                    <span className="text-cyan-400 font-bold font-mono">{(selectedComponent.resistance ?? 100)}Ω</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2000"
                    step="5"
                    value={selectedComponent.resistance ?? 100}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onUpdateComponent({
                        ...selectedComponent,
                        resistance: val,
                        tempResistance: val,
                      });
                    }}
                    className="w-full h-1 bg-slate-700 rounded-lg cursor-pointer appearance-none accent-cyan-500"
                  />
                </div>

                {/* Ohmic / Non ohmic lightbulb toggle toggle */}
                <div className="flex items-center justify-between bg-[#0a0b0e]/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-300">Resistor No-Óhmico</span>
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider">Efecto Térmico (Foco)</span>
                  </div>
                  <div 
                    onClick={() => onUpdateComponent({
                      ...selectedComponent,
                      isOhmic: !selectedComponent.isOhmic,
                      tempResistance: selectedComponent.resistance
                    })}
                    className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${!selectedComponent.isOhmic ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${!selectedComponent.isOhmic ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            )}

            {/* Capacitance slider for capacitor */}
            {selectedComponent.type === 'capacitor' && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Capacitancia (C)</span>
                  <span className="text-cyan-400 font-bold font-mono">
                    {Math.round((selectedComponent.capacitance ?? 0.01) * 1e6)} μF
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="50000"
                  step="100"
                  value={(selectedComponent.capacitance ?? 0.01) * 1e6}
                  onChange={(e) => {
                    const parsedF = parseFloat(e.target.value) / 1e6;
                    onUpdateComponent({
                      ...selectedComponent,
                      capacitance: parsedF
                    });
                  }}
                  className="w-full h-1 bg-slate-700 rounded-lg cursor-pointer appearance-none accent-cyan-500"
                />
              </div>
            )}

            {/* Switch on/off state */}
            {selectedComponent.type === 'switch' && (
              <div className="flex items-center justify-between bg-[#0a0b0e]/80 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wide">Estado:</span>
                <button
                  onClick={() => onUpdateComponent({
                    ...selectedComponent,
                    isOpen: !selectedComponent.isOpen
                  })}
                  className={`text-[9px] font-bold uppercase px-3 py-1 rounded tracking-wider transition-colors shadow-inner ${
                    selectedComponent.isOpen
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : 'bg-cyan-600 text-[#0a0b0e] font-extrabold shadow-[0_0_10px_rgba(8,145,178,0.4)]'
                  }`}
                >
                  {selectedComponent.isOpen ? 'Abierto (OFF)' : 'Cerrado (ON)'}
                </button>
              </div>
            )}

            {/* Fail-safe adjusters (Nominal voltage safety limit) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between items-baseline text-xs font-mono">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Umbral Máximo de Daño</span>
                <span className="text-red-400 font-bold font-mono">{selectedComponent.nominalVoltage}V</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={selectedComponent.nominalVoltage}
                onChange={(e) => onUpdateComponent({
                  ...selectedComponent,
                  nominalVoltage: parseInt(e.target.value)
                })}
                className="w-full h-1 bg-slate-700 rounded-lg cursor-pointer appearance-none accent-red-500"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-5 text-center shadow-inner">
            <Info className="w-5 h-5 text-slate-600 mb-2" />
            <p className="text-[10px] text-slate-500 leading-relaxed max-w-[190px]">
              Toca cualquier resistor, fuente o condensador para calibrar sus parámetros eléctricos.
            </p>
          </div>
        )}
      </div>

      {/* Experimental Preset Scenarios Dropdown / Quick Links */}
      <div className="flex flex-col gap-2 bg-slate-900/50 border border-slate-800 p-3 rounded-xl mt-auto">
        <h4 className="text-[9px] font-bold text-cyan-500 tracking-wider uppercase">ESCENARIOS PREDEFINIDOS</h4>
        <div className="flex flex-col gap-1.5 text-xs text-left">
          <button
            onClick={() => onLoadScenario('preset_ohm')}
            className="px-2.5 py-1.5 rounded bg-[#0a0b0e] border border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-[#0f1117] text-left transition-all cursor-pointer"
          >
            🔌 Ley de Ohm (Básico)
          </button>
          <button
            onClick={() => onLoadScenario('preset_short')}
            className="px-2.5 py-1.5 rounded bg-[#0a0b0e] border border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-[#0f1117] text-left transition-all cursor-pointer"
          >
            ⚠️ Estudio de Cortocircuito
          </button>
          <button
            onClick={() => onLoadScenario('preset_rc')}
            className="px-2.5 py-1.5 rounded bg-[#0a0b0e] border border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-[#0f1117] text-left transition-all cursor-pointer"
          >
            ⏳ Carga/Descarga RC (Transitorio)
          </button>
          <button
            onClick={() => onLoadScenario('preset_nonohmic')}
            className="px-2.5 py-1.5 rounded bg-[#0a0b0e] border border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-[#0f1117] text-left transition-all cursor-pointer"
          >
            💡 Lámpara No Óhmica
          </button>
        </div>

        <button
          onClick={onClearCanvas}
          className="mt-2 text-center text-[9px] font-bold text-red-400 uppercase tracking-widest bg-red-950/20 border border-red-900/40 rounded py-1.5 hover:bg-red-900/20 hover:text-red-300 transition-colors cursor-pointer"
        >
          Limpiar Lienzo
        </button>
      </div>
    </div>
  );
}
