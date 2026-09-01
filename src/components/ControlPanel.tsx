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
  onUpdateCharge: (updated: PointCharge) => void;
  onAddCharge: (charge: PointCharge) => void;
  onDeleteCharge: (id: string) => void;
  onUpdateTestPoint: (testPoint: TestPoint) => void;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
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

  const tpX = testPoint?.x ?? 0;
  const tpY = testPoint?.y ?? 0;
  const tpZ = testPoint?.z ?? 0;

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

  const handleTestPointCoordChange = (axis: 'x' | 'y' | 'z', strVal: string) => {
    const parsed = parseFloat(strVal);
    const validVal = isNaN(parsed) ? 0 : parsed;
    onUpdateTestPoint({
      x: axis === 'x' ? validVal : tpX,
      y: axis === 'y' ? validVal : tpY,
      z: axis === 'z' ? validVal : tpZ,
    });
  };

  return (
    <div className="h-full bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-5 justify-start">
      {/* Top Bar: Dimension Selector 2D vs 3D */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-100">Configuración del Entorno</span>
        </div>

        {/* 2D / 3D Toggle */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => onUpdateSettings({ dimension: '2D' })}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              !is3D
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            2D Plano
          </button>
          <button
            onClick={() => onUpdateSettings({ dimension: '3D' })}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              is3D
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-4 h-4" />
            3D Espacio
          </button>
        </div>
      </div>

      {/* Tabs Selector: 3 Dedicated Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800/80 text-xs font-semibold shrink-0">
        <button
          onClick={() => setActiveTab('charges')}
          className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl transition ${
            activeTab === 'charges'
              ? 'bg-slate-800 text-emerald-400 shadow-md font-bold ring-1 ring-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Cargas ({charges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('testpoint')}
          className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl transition ${
            activeTab === 'testpoint'
              ? 'bg-slate-800 text-amber-400 shadow-md font-bold ring-1 ring-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Punto P</span>
        </button>

        <button
          onClick={() => setActiveTab('visuals')}
          className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl transition ${
            activeTab === 'visuals'
              ? 'bg-slate-800 text-cyan-400 shadow-md font-bold ring-1 ring-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Visuales</span>
        </button>
      </div>

      {/* Tab 1: Charges Management */}
      {activeTab === 'charges' && (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Add charge buttons */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0">
            <button
              onClick={() => handleAddNewCharge(true)}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/40 text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar Carga (+q)
            </button>
            <button
              onClick={() => handleAddNewCharge(false)}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/40 text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar Carga (-q)
            </button>
          </div>

          {/* Unit selector with single-line label on top */}
          <div className="space-y-1.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shrink-0">
            <label className="text-xs font-bold text-slate-200 block">
              Unidad de Carga:
            </label>
            <select
              value={settings.chargeUnit}
              onChange={(e) => onUpdateSettings({ chargeUnit: e.target.value as ChargeUnit })}
              className="w-full bg-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono font-bold"
            >
              <option value="e">Carga elemental (e = 1.602×10⁻¹⁹ C)</option>
              <option value="uC">Microcoulombs (µC = 10⁻⁶ C)</option>
              <option value="nC">Nanocoulombs (nC = 10⁻⁹ C)</option>
              <option value="C">Coulombs (C)</option>
            </select>
          </div>

          {/* Charges List */}
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {charges.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No hay cargas en el sistema. Haz clic en "Agregar Carga" para comenzar.
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
                    className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-indigo-500/80 ring-2 ring-indigo-500/40 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row: Name, Value q, Delete */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow-md"
                          style={{ backgroundColor: isPos ? '#ef4444' : isNeg ? '#3b82f6' : '#94a3b8' }}
                        />
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => onUpdateCharge({ ...c, name: e.target.value })}
                          className="bg-slate-800/80 text-sm font-bold text-slate-100 w-24 px-2.5 py-1.5 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none font-mono"
                          placeholder="Nombre"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Magnitude Input */}
                        <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-700">
                          <span className="text-xs text-slate-400 font-mono font-bold">q =</span>
                          <input
                            type="number"
                            step="0.5"
                            value={c.q}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              onUpdateCharge({ ...c, q: isNaN(val) ? 0 : val });
                            }}
                            className="w-16 bg-slate-800 text-slate-100 text-sm font-mono font-bold text-center px-1.5 py-1 rounded border border-slate-600 focus:border-indigo-500 focus:outline-none"
                          />
                          <span className="text-xs text-slate-400 font-mono font-semibold">{c.unit}</span>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCharge(c.id);
                          }}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Eliminar Carga"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Coordinates Row: Large X, Y, Z Controls */}
                    <div className="grid grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-800/80 text-xs font-mono">
                      {/* X Coordinate */}
                      <div className="space-y-1">
                        <span className="text-slate-400 text-[11px] font-bold block text-center">x [m]</span>
                        <input
                          type="number"
                          step="0.05"
                          value={c.x}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateCharge({ ...c, x: isNaN(val) ? 0 : val });
                          }}
                          className="w-full bg-slate-800 text-slate-100 text-sm font-bold px-2 py-1.5 rounded-lg border border-slate-700 text-center focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Y Coordinate */}
                      <div className="space-y-1">
                        <span className="text-slate-400 text-[11px] font-bold block text-center">y [m]</span>
                        <input
                          type="number"
                          step="0.05"
                          value={c.y}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateCharge({ ...c, y: isNaN(val) ? 0 : val });
                          }}
                          className="w-full bg-slate-800 text-slate-100 text-sm font-bold px-2 py-1.5 rounded-lg border border-slate-700 text-center focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Z Coordinate (if 3D) */}
                      {is3D ? (
                        <div className="space-y-1">
                          <span className="text-slate-400 text-[11px] font-bold block text-center">z [m]</span>
                          <input
                            type="number"
                            step="0.05"
                            value={c.z || 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              onUpdateCharge({ ...c, z: isNaN(val) ? 0 : val });
                            }}
                            className="w-full bg-slate-800 text-slate-100 text-sm font-bold px-2 py-1.5 rounded-lg border border-slate-700 text-center focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-3 text-[11px] text-slate-500 font-semibold">
                          <span>z = 0 m</span>
                          <span className="text-[10px] text-slate-600">(Plano 2D)</span>
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

      {/* Tab 2: Test Point Position (Clean, Spacious, No LaTeX syntax, No Step Buttons, No Position Chips) */}
      {activeTab === 'testpoint' && (
        <div className="space-y-5 flex-1 flex flex-col">
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-extrabold text-amber-400 flex items-center gap-2 uppercase tracking-wider">
                <Compass className="w-4 h-4" />
                Coordenadas del Punto P (r₀)
              </span>
              <button
                onClick={() => onUpdateTestPoint({ x: 0, y: 0, z: 0 })}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Origen (0,0)
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Modifica las coordenadas en metros del punto de evaluación P (r₀) para calcular el campo eléctrico y potencial eléctrico en tiempo real.
            </p>

            {/* Clean, Large Coordinate Inputs */}
            <div className="grid grid-cols-3 gap-3 font-mono pt-2">
              {/* X0 Coordinate */}
              <div className="space-y-1.5">
                <label className="text-slate-400 block text-xs font-bold text-center">x₀ [metros]</label>
                <input
                  type="number"
                  step="0.05"
                  value={tpX}
                  onChange={(e) => handleTestPointCoordChange('x', e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 text-lg font-black px-2 py-3 rounded-xl border border-slate-700 text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Y0 Coordinate */}
              <div className="space-y-1.5">
                <label className="text-slate-400 block text-xs font-bold text-center">y₀ [metros]</label>
                <input
                  type="number"
                  step="0.05"
                  value={tpY}
                  onChange={(e) => handleTestPointCoordChange('y', e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 text-lg font-black px-2 py-3 rounded-xl border border-slate-700 text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Z0 Coordinate */}
              {is3D ? (
                <div className="space-y-1.5">
                  <label className="text-slate-400 block text-xs font-bold text-center">z₀ [metros]</label>
                  <input
                    type="number"
                    step="0.05"
                    value={tpZ}
                    onChange={(e) => handleTestPointCoordChange('z', e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 text-lg font-black px-2 py-3 rounded-xl border border-slate-700 text-center focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 opacity-60">
                  <label className="text-slate-400 block text-xs font-bold text-center">z₀ [metros]</label>
                  <div className="w-full bg-slate-800/40 text-slate-400 text-lg font-black py-3 px-2 rounded-xl border border-slate-800 text-center">
                    0.00
                  </div>
                  <div className="text-[10px] text-center text-slate-500 font-semibold">
                    (Plano 2D)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Visuals and Toggles */}
      {activeTab === 'visuals' && (
        <div className="space-y-3.5 text-xs text-slate-300 flex-1">
          {/* 2D Specific Toggles */}
          {!is3D && (
            <>
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <span className="flex items-center gap-2.5 font-semibold text-slate-200">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-500/50" />
                  Líneas de Campo Eléctrico (Cian)
                </span>
                <input
                  type="checkbox"
                  checked={settings.showFieldLines}
                  onChange={(e) => onUpdateSettings({ showFieldLines: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <span className="font-semibold text-slate-200">Mapa de Potenciales Equipotenciales</span>
                <input
                  type="checkbox"
                  checked={settings.showEquipotentials}
                  onChange={(e) => onUpdateSettings({ showEquipotentials: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </label>
            </>
          )}

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="flex items-center gap-2.5 font-semibold text-slate-200">
              <span className="w-3 h-3 rounded-full bg-purple-400 inline-block shadow-sm shadow-purple-500/50" />
              Malla Vectorial del Campo (Violeta)
            </span>
            <input
              type="checkbox"
              checked={settings.showVectorGrid}
              onChange={(e) => onUpdateSettings({ showVectorGrid: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="flex items-center gap-2.5 font-semibold text-slate-200">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-500/50" />
              Vector Campo Total E (Verde)
            </span>
            <input
              type="checkbox"
              checked={settings.showTotalVector}
              onChange={(e) => onUpdateSettings({ showTotalVector: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="flex items-center gap-2.5 font-semibold text-slate-200">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block shadow-sm shadow-blue-500/50" />
              Vectores Individuales E_i (Rojo/Azul)
            </span>
            <input
              type="checkbox"
              checked={settings.showIndividualVectors}
              onChange={(e) => onUpdateSettings({ showIndividualVectors: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="font-semibold text-slate-200">Grilla y Ejes Coordenados</span>
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={(e) => onUpdateSettings({ showGrid: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
            <span className="font-semibold text-slate-200">Etiquetas y Nombres de Cargas</span>
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
