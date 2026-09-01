/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PointCharge, 
  TestPoint, 
  SimulationSettings, 
  ChargeUnit 
} from '../types';
import { 
  Plus, 
  Trash2, 
  Sliders, 
  Eye, 
  Compass, 
  Zap, 
  RotateCcw,
  Globe2,
  Box
} from 'lucide-react';

interface ControlPanelProps {
  charges: PointCharge[];
  testPoint: TestPoint;
  settings: SimulationSettings;
  activePresetId?: string;
  onUpdateCharge: (updated: PointCharge) => void;
  onAddCharge: (charge: PointCharge) => void;
  onDeleteCharge: (id: string) => void;
  onUpdateTestPoint: (testPoint: TestPoint) => void;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
  onLoadPreset?: (preset: any) => void;
  selectedChargeId?: string | null;
  onSelectCharge?: (id: string | null) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  charges,
  testPoint,
  settings,
  onUpdateCharge,
  onAddCharge,
  onDeleteCharge,
  onUpdateTestPoint,
  onUpdateSettings,
  selectedChargeId,
  onSelectCharge,
}) => {
  const [activeTab, setActiveTab] = useState<'charges' | 'testpoint' | 'visuals'>('charges');

  const is3D = settings.dimension === '3D';

  const handleAddNewCharge = (isPositive: boolean) => {
    const nextIdx = charges.length + 1;
    const newCharge: PointCharge = {
      id: `charge_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `q${nextIdx}`,
      x: Math.round((Math.random() * 0.8 - 0.4) * 100) / 100,
      y: Math.round((Math.random() * 0.8 - 0.4) * 100) / 100,
      z: is3D ? Math.round((Math.random() * 0.8 - 0.4) * 100) / 100 : 0,
      q: isPositive ? 1 : -1,
      unit: settings.chargeUnit || 'e',
      color: isPositive ? '#ef4444' : '#3b82f6',
    };
    onAddCharge(newCharge);
    if (onSelectCharge) onSelectCharge(newCharge.id);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-5">
      {/* Top Bar: Dimension Selector 2D vs 3D */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-slate-100">Configuración del Entorno</span>
        </div>

        {/* 2D / 3D Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onUpdateSettings({ dimension: '2D' })}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              !is3D
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            2D Plano
          </button>
          <button
            onClick={() => onUpdateSettings({ dimension: '3D' })}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              is3D
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D Espacio
          </button>
        </div>
      </div>

      {/* Tabs Selector: 3 Dedicated Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800/80 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('charges')}
          className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg transition ${
            activeTab === 'charges'
              ? 'bg-slate-800 text-emerald-400 shadow font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Cargas ({charges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('testpoint')}
          className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg transition ${
            activeTab === 'testpoint'
              ? 'bg-slate-800 text-amber-400 shadow font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Punto P</span>
        </button>

        <button
          onClick={() => setActiveTab('visuals')}
          className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg transition ${
            activeTab === 'visuals'
              ? 'bg-slate-800 text-cyan-400 shadow font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Visuales</span>
        </button>
      </div>

      {/* Tab 1: Charges Management */}
      {activeTab === 'charges' && (
        <div className="space-y-4">
          {/* Add charge buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAddNewCharge(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar Carga (+q)
            </button>
            <button
              onClick={() => handleAddNewCharge(false)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar Carga (-q)
            </button>
          </div>

          {/* Unit selector */}
          <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-medium">
            <span>Unidad de Carga:</span>
            <select
              value={settings.chargeUnit}
              onChange={(e) => onUpdateSettings({ chargeUnit: e.target.value as ChargeUnit })}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono font-semibold"
            >
              <option value="e">Carga elemental (e = 1.602×10⁻¹⁹ C)</option>
              <option value="uC">Microcoulombs (µC = 10⁻⁶ C)</option>
              <option value="nC">Nanocoulombs (nC = 10⁻⁹ C)</option>
              <option value="C">Coulombs (C)</option>
            </select>
          </div>

          {/* Charges List */}
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {charges.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No hay cargas añadidas. Haz clic en "Agregar Carga" para comenzar.
              </div>
            ) : (
              charges.map((c) => {
                const isPos = c.q > 0;
                const isNeg = c.q < 0;
                const isSelected = selectedChargeId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCharge && onSelectCharge(c.id)}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 ${
                      isSelected
                        ? 'bg-slate-800/80 border-indigo-500/70 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block shrink-0 shadow"
                          style={{ backgroundColor: isPos ? '#ef4444' : isNeg ? '#3b82f6' : '#94a3b8' }}
                        />
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => onUpdateCharge({ ...c, name: e.target.value })}
                          className="bg-transparent text-xs font-bold text-slate-100 w-16 focus:outline-none border-b border-transparent focus:border-slate-500 font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Magnitude Input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-mono">q =</span>
                          <input
                            type="number"
                            step="0.5"
                            value={c.q}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateCharge({ ...c, q: val });
                            }}
                            className="w-14 bg-slate-800 text-slate-100 text-xs px-2 py-1 rounded-lg border border-slate-700 text-center font-mono font-bold"
                          />
                          <span className="text-xs text-slate-400 font-mono">{c.unit}</span>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCharge(c.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition"
                          title="Eliminar Carga"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Coordinates Row */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-xs">x:</span>
                        <input
                          type="number"
                          step="0.05"
                          value={c.x}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onUpdateCharge({ ...c, x: val });
                          }}
                          className="w-full bg-slate-800 text-slate-100 px-1.5 py-1 rounded border border-slate-700 text-center font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-xs">y:</span>
                        <input
                          type="number"
                          step="0.05"
                          value={c.y}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onUpdateCharge({ ...c, y: val });
                          }}
                          className="w-full bg-slate-800 text-slate-100 px-1.5 py-1 rounded border border-slate-700 text-center font-semibold"
                        />
                      </div>

                      {is3D ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-xs">z:</span>
                          <input
                            type="number"
                            step="0.05"
                            value={c.z || 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateCharge({ ...c, z: val });
                            }}
                            className="w-full bg-slate-800 text-slate-100 px-1.5 py-1 rounded border border-slate-700 text-center font-semibold"
                          />
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 flex items-center justify-center font-mono">
                          (z = 0 m)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Test Point Position */}
      {activeTab === 'testpoint' && (
        <div className="space-y-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                <Compass className="w-4 h-4" />
                Coordenadas del Punto P (r₀)
              </span>
              <button
                onClick={() => onUpdateTestPoint({ x: 0, y: 0, z: 0 })}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Origen (0,0)
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Define la posición exacta en metros donde se evalúan el campo eléctrico resultante $\vec{E}$ y el potencial escalar $V$.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block text-xs font-semibold">x₀ [metros]</label>
                <input
                  type="number"
                  step="0.05"
                  value={testPoint?.x ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateTestPoint({
                      x: isNaN(val) ? 0 : val,
                      y: testPoint?.y ?? 0,
                      z: testPoint?.z ?? 0,
                    });
                  }}
                  className="w-full bg-slate-800 text-slate-100 px-2 py-1.5 rounded-lg border border-slate-700 text-center font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block text-xs font-semibold">y₀ [metros]</label>
                <input
                  type="number"
                  step="0.05"
                  value={testPoint?.y ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateTestPoint({
                      x: testPoint?.x ?? 0,
                      y: isNaN(val) ? 0 : val,
                      z: testPoint?.z ?? 0,
                    });
                  }}
                  className="w-full bg-slate-800 text-slate-100 px-2 py-1.5 rounded-lg border border-slate-700 text-center font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              {is3D ? (
                <div className="space-y-1">
                  <label className="text-slate-400 block text-xs font-semibold">z₀ [metros]</label>
                  <input
                    type="number"
                    step="0.05"
                    value={testPoint?.z ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onUpdateTestPoint({
                        x: testPoint?.x ?? 0,
                        y: testPoint?.y ?? 0,
                        z: isNaN(val) ? 0 : val,
                      });
                    }}
                    className="w-full bg-slate-800 text-slate-100 px-2 py-1.5 rounded-lg border border-slate-700 text-center font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1 opacity-50">
                  <label className="text-slate-400 block text-xs font-semibold">z₀ [metros]</label>
                  <div className="w-full bg-slate-800/40 text-slate-500 px-2 py-1.5 rounded-lg border border-slate-800 text-center font-bold">
                    0.00 (2D)
                  </div>
                </div>
              )}
            </div>

            {/* Quick Position Chips */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <span className="text-xs text-slate-400 font-semibold block">Atajos de posición rápida:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onUpdateTestPoint({ x: 0, y: 0, z: 0 })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700"
                >
                  (0.00, 0.00)
                </button>
                <button
                  onClick={() => onUpdateTestPoint({ x: 0, y: 0.5, z: is3D ? testPoint?.z ?? 0 : 0 })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700"
                >
                  (0.00, 0.50)
                </button>
                <button
                  onClick={() => onUpdateTestPoint({ x: 0.5, y: 0, z: is3D ? testPoint?.z ?? 0 : 0 })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700"
                >
                  (0.50, 0.00)
                </button>
                <button
                  onClick={() => onUpdateTestPoint({ x: 0.25, y: 0.25, z: is3D ? 0.25 : 0 })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700"
                >
                  (0.25, 0.25)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Visuals and Toggles */}
      {activeTab === 'visuals' && (
        <div className="space-y-3.5 text-xs text-slate-300">
          {/* 2D Specific Toggles */}
          {!is3D && (
            <>
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-500/50" />
                  Líneas de Campo Eléctrico (Cian)
                </span>
                <input
                  type="checkbox"
                  checked={settings.showFieldLines}
                  onChange={(e) => onUpdateSettings({ showFieldLines: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <span className="font-medium">Mapa de Potenciales Equipotenciales</span>
                <input
                  type="checkbox"
                  checked={settings.showEquipotentials}
                  onChange={(e) => onUpdateSettings({ showEquipotentials: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>
            </>
          )}

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block shadow-sm shadow-purple-500/50" />
              Malla Vectorial del Campo (Violeta)
            </span>
            <input
              type="checkbox"
              checked={settings.showVectorGrid}
              onChange={(e) => onUpdateSettings({ showVectorGrid: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-500/50" />
              Vector Campo Total E (Verde)
            </span>
            <input
              type="checkbox"
              checked={settings.showTotalVector}
              onChange={(e) => onUpdateSettings({ showTotalVector: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block shadow-sm shadow-blue-500/50" />
              Vectores Individuales E_i (Rojo/Azul)
            </span>
            <input
              type="checkbox"
              checked={settings.showIndividualVectors}
              onChange={(e) => onUpdateSettings({ showIndividualVectors: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="font-medium">Grilla y Ejes Coordenados</span>
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={(e) => onUpdateSettings({ showGrid: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="font-medium">Etiquetas y Nombres de Cargas</span>
            <input
              type="checkbox"
              checked={settings.showLabels}
              onChange={(e) => onUpdateSettings({ showLabels: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>
        </div>
      )}
    </div>
  );
};
