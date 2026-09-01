/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  PointCharge, 
  TestPoint, 
  SimulationSettings, 
  LabPreset 
} from './types';
import { LAB_PRESETS } from './utils/presets';
import { computeDetailedCalculations } from './utils/physics';
import { Navbar } from './components/Navbar';
import { Simulator2D } from './components/Simulator2D';
import { Simulator3D } from './components/Simulator3D';
import { ControlPanel } from './components/ControlPanel';
import { CalculationTable } from './components/CalculationTable';
import { AILabTutor } from './components/AILabTutor';

export function App() {
  // Initial state loads Actividad 1 from Lab N° 1
  const initialPreset = LAB_PRESETS[0];

  const [charges, setCharges] = useState<PointCharge[]>(initialPreset.charges);
  const [testPoint, setTestPoint] = useState<TestPoint>(initialPreset.testPoint);
  const [activePresetId, setActivePresetId] = useState<string>(initialPreset.id);
  const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);

  const [settings, setSettings] = useState<SimulationSettings>({
    dimension: initialPreset.dimension,
    showFieldLines: true,
    showVectorGrid: false,
    showEquipotentials: true,
    showIndividualVectors: true,
    showTotalVector: true,
    showGrid: true,
    showLabels: true,
    fieldLinesCount: 18,
    vectorGridDensity: 6,
    vectorScale: 1.0,
    chargeUnit: initialPreset.chargeUnit,
    coordinateRange: initialPreset.coordinateRange || 1.0,
    precisionDigits: 4,
    scientificNotation: false,
  });

  // Calculate detailed physics in real-time
  const calculation = useMemo(() => {
    return computeDetailedCalculations(charges, testPoint);
  }, [charges, testPoint]);

  // Handler to update settings partially
  const handleUpdateSettings = (newSettings: Partial<SimulationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Handler to load presets
  const handleLoadPreset = (preset: LabPreset) => {
    setCharges(preset.charges);
    setTestPoint(preset.testPoint);
    setActivePresetId(preset.id);
    setSelectedChargeId(null);
    setSettings((prev) => ({
      ...prev,
      dimension: preset.dimension,
      chargeUnit: preset.chargeUnit,
      coordinateRange: preset.coordinateRange || 1.0,
    }));
  };

  // Charge manipulation handlers
  const handleAddCharge = (newCharge: PointCharge) => {
    setCharges((prev) => [...prev, newCharge]);
    setActivePresetId('custom');
  };

  const handleUpdateCharge = (updated: PointCharge) => {
    setCharges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setActivePresetId('custom');
  };

  const handleDeleteCharge = (id: string) => {
    setCharges((prev) => prev.filter((c) => c.id !== id));
    if (selectedChargeId === id) setSelectedChargeId(null);
    setActivePresetId('custom');
  };

  const handleUpdateChargePos2D = (id: string, x: number, y: number) => {
    setCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, x, y } : c))
    );
  };

  const handleUpdateTestPointPos2D = (x: number, y: number) => {
    setTestPoint((prev) => ({ ...prev, x, y }));
  };

  const handleUpdateTestPointPos3D = (x: number, y: number, z: number) => {
    setTestPoint({ x, y, z });
  };

  const activePreset = LAB_PRESETS.find((p) => p.id === activePresetId);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Grid: Canvas Simulator + Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-6 items-stretch">
          {/* Simulator Viewport (2D or 3D) */}
          <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-3">
            {settings.dimension === '2D' ? (
              <Simulator2D
                charges={charges}
                testPoint={testPoint}
                settings={settings}
                calculation={calculation}
                onUpdateChargePos={handleUpdateChargePos2D}
                onUpdateTestPointPos={handleUpdateTestPointPos2D}
                onSelectCharge={setSelectedChargeId}
                selectedChargeId={selectedChargeId}
              />
            ) : (
              <Simulator3D
                charges={charges}
                testPoint={testPoint}
                settings={settings}
                calculation={calculation}
                onUpdateTestPointPos={handleUpdateTestPointPos3D}
                onSelectCharge={setSelectedChargeId}
                selectedChargeId={selectedChargeId}
              />
            )}
          </div>

          {/* Control & Configuration Panel */}
          <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3">
            <ControlPanel
              charges={charges}
              testPoint={testPoint}
              settings={settings}
              activePresetId={activePresetId}
              onUpdateCharge={handleUpdateCharge}
              onAddCharge={handleAddCharge}
              onDeleteCharge={handleDeleteCharge}
              onUpdateTestPoint={setTestPoint}
              onUpdateSettings={handleUpdateSettings}
              onLoadPreset={handleLoadPreset}
              selectedChargeId={selectedChargeId}
              onSelectCharge={setSelectedChargeId}
            />
          </div>
        </div>

        {/* Bottom Section: Calculation Table & Mathematical Breakdown */}
        <section>
          <CalculationTable
            calculation={calculation}
            settings={settings}
            activePresetTitle={activePreset?.title}
            onUpdateSettings={handleUpdateSettings}
          />
        </section>
        {/* AI Lab Tutor Floating Assistant */}
        <AILabTutor
          calculation={calculation}
          charges={charges}
          testPoint={testPoint}
          activePresetTitle={activePreset?.title}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-5 text-center text-xs text-slate-500">
        <p>
          Simulador Interactivo de Campo Eléctrico y Potencial Eléctrico • Laboratorio N° 1 de Electromagnetismo
        </p>
      </footer>
    </div>
  );
}

export default App;
