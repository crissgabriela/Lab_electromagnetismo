/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CircuitComponent, ComponentType, Wire, VoltmeterProbe, DataPoint } from './types';
import { solveCircuit } from './utils/physics';
import SandboxCanvas from './components/SandboxCanvas';
import Sidebar from './components/Sidebar';
import Oscilloscope from './components/Oscilloscope';
import { Zap, Sparkles, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  
  // Navigation & configuration toggles
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [showEField, setShowEField] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const [simulationRunning, setSimulationRunning] = useState<boolean>(true);

  // Voltmeter state
  const [voltmeterRed, setVoltmeterRed] = useState<VoltmeterProbe>({
    x: 80, y: 150, dragging: false, snappedTerminalId: null
  });
  const [voltmeterBlack, setVoltmeterBlack] = useState<VoltmeterProbe>({
    x: 80, y: 190, dragging: false, snappedTerminalId: null
  });

  // Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState<number>(0);
  const [stopwatchRunning, setStopwatchRunning] = useState<boolean>(false);

  // Analysis & Data lists
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [capturedTable, setCapturedTable] = useState<DataPoint[]>([]);
  
  // Real-time calculation references
  const currentVoltagesRef = useRef<Record<string, number>>({});
  const currentCurrentsRef = useRef<Record<string, number>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tickTrigger, setTickTrigger] = useState<number>(0);

  // Curve tracking metadata
  const [idealCurveType, setIdealCurveType] = useState<'charge' | 'discharge' | 'ohm'>('charge');
  const [rcParameters, setRcParameters] = useState<{ R: number; C: number; V0: number }>({
    R: 1000, C: 0.01, V0: 10
  });

  // Initial Scenario loading on component mount
  useEffect(() => {
    loadScenario('preset_ohm');
  }, []);

  const getActiveProbeVoltage = () => {
    const vRedVal = voltmeterRed.snappedTerminalId ? (currentVoltagesRef.current[voltmeterRed.snappedTerminalId] ?? 0) : null;
    const vBlackVal = voltmeterBlack.snappedTerminalId ? (currentVoltagesRef.current[voltmeterBlack.snappedTerminalId] ?? 0) : null;
    
    if (vRedVal !== null && vBlackVal !== null) {
      return vRedVal - vBlackVal;
    }
    
    // Friendly fallback: trace voltage from the first Capacitor found so they see curves instantly!
    const firstCap = components.find(c => c.type === 'capacitor');
    if (firstCap) {
      return firstCap.voltageCapacitor ?? 0;
    }
    
    // Secondary fallback: trace resistor voltage
    const firstRes = components.find(c => c.type === 'resistor');
    if (firstRes) {
      const vA = currentVoltagesRef.current[`${firstRes.id}_a`] ?? 0;
      const vB = currentVoltagesRef.current[`${firstRes.id}_b`] ?? 0;
      return vA - vB;
    }

    return 0;
  };

  const getActiveAmmeterCurrent = () => {
    const firstAmmeter = components.find(c => c.type === 'ammeter');
    if (firstAmmeter) {
      return Math.abs(currentCurrentsRef.current[firstAmmeter.id] ?? 0);
    }
    const firstCap = components.find(c => c.type === 'capacitor');
    if (firstCap) {
      return Math.abs(currentCurrentsRef.current[firstCap.id] ?? 0);
    }
    return 0;
  };

  // Main Interactive Solver Frame Clock Loop
  useEffect(() => {
    let active = true;
    
    const tick = () => {
      if (!active) return;
      
      const dt = 0.05 * simulationSpeed; // Fixed stable dt for Euler backward integration stability
      
      if (simulationRunning && dt > 0) {
        setComponents(prevComponents => {
          if (prevComponents.length === 0) return prevComponents;

          const result = solveCircuit(prevComponents, wires, dt);
          
          currentVoltagesRef.current = result.terminalVoltages;
          currentCurrentsRef.current = result.componentCurrents;

          // Propagate warnings
          setWarnings(result.warnings);

          return result.updatedComponents;
        });

        // Advance stopwatch time
        if (stopwatchRunning) {
          setStopwatchTime(prevTime => {
            const nextTime = prevTime + 0.05 * simulationSpeed;
            
            // Record points in oscilloscope trace
            if (nextTime <= 30) {
              const voltMeter = getActiveProbeVoltage();
              const currentMeter = getActiveAmmeterCurrent();

              setDataPoints(prevPts => [
                ...prevPts, 
                { time: nextTime, measuredV: voltMeter, measuredI: currentMeter }
              ]);
            } else {
              setStopwatchRunning(false); // Clamp at 30 seconds
            }

            return nextTime;
          });
        }
      }

      setTickTrigger(t => t + 1); // Trigger visual redraw
      
      setTimeout(() => {
        requestAnimationFrame(tick);
      }, 50); // Steady 20 frames per second transient integration
    };

    const handle = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(handle);
    };
  }, [simulationRunning, stopwatchRunning, wires, simulationSpeed, components.length]);

  // Spawns a new component in the center of the user's board
  const handleAddComponent = (type: ComponentType, isOhmicResistor = true) => {
    const defaultParams: Partial<CircuitComponent> = {
      source: { voltage: 12, nominalVoltage: 45 },
      resistor: { resistance: 220, tempResistance: 220, isOhmic: isOhmicResistor, nominalVoltage: isOhmicResistor ? 35 : 15 },
      capacitor: { capacitance: 0.01, voltageCapacitor: 0, charge: 0, nominalVoltage: 25 },
      switch: { isOpen: true, nominalVoltage: 50 },
      ammeter: { nominalVoltage: 10 }
    }[type];

    const newComp: CircuitComponent = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      x: 350 + Math.random() * 40,
      y: 200 + Math.random() * 40,
      angle: 0,
      failed: false,
      ...defaultParams
    } as CircuitComponent;

    setComponents([...components, newComp]);
    setSelectedComponentId(newComp.id);
  };

  const handleUpdateComponent = (updated: CircuitComponent) => {
    setComponents(components.map(c => c.id === updated.id ? updated : c));
    
    // Automatically recalculate theoretical baseline values if active component variables shift
    if (updated.type === 'resistor' || updated.type === 'capacitor' || updated.type === 'source') {
      const activeRes = components.find(c => c.type === 'resistor') || updated;
      const activeCap = components.find(c => c.type === 'capacitor') || updated;
      const activeSrc = components.find(c => c.type === 'source') || updated;

      setRcParameters({
        R: activeRes.type === 'resistor' ? (activeRes.resistance ?? 100) : 1000,
        C: activeCap.type === 'capacitor' ? (activeCap.capacitance ?? 0.01) : 0.01,
        V0: activeSrc.type === 'source' ? (activeSrc.voltage ?? 10) : 10
      });
    }
  };

  // Capture current sample into the copyable data Table
  const handleCapturePoint = () => {
    const voltMeter = getActiveProbeVoltage();
    const currentMeter = getActiveAmmeterCurrent();

    const samplePoint: DataPoint = {
      time: stopwatchTime,
      measuredV: voltMeter,
      measuredI: currentMeter
    };

    setCapturedTable(prev => {
      // Allow up to 10-12 points beautifully formatted
      if (prev.length >= 12) {
        return [...prev.slice(1), samplePoint];
      }
      return [...prev, samplePoint];
    });
  };

  const handleClearPoints = () => {
    setDataPoints([]);
  };

  const handleClearTable = () => {
    setCapturedTable([]);
  };

  const handleResetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
    setDataPoints([]);
  };

  const handleClearCanvas = () => {
    setComponents([]);
    setWires([]);
    setSelectedComponentId(null);
    setWarnings([]);
    setDataPoints([]);
    setCapturedTable([]);
    setStopwatchRunning(false);
    setStopwatchTime(0);
    setVoltmeterRed({ x: 80, y: 150, dragging: false, snappedTerminalId: null });
    setVoltmeterBlack({ x: 80, y: 190, dragging: false, snappedTerminalId: null });
  };

  // Preset Laboratory configurations
  const loadScenario = (scenarioId: string) => {
    handleClearCanvas();
    
    if (scenarioId === 'preset_ohm') {
      setIdealCurveType('ohm');
      setRcParameters({ R: 100, C: 1.0, V0: 12 });
      
      const parsedComponents: CircuitComponent[] = [
        { id: 'src_ohm', type: 'source', x: 180, y: 240, angle: 0, voltage: 12, nominalVoltage: 45, failed: false },
        { id: 'sw_ohm', type: 'switch', x: 380, y: 130, angle: 0, isOpen: true, nominalVoltage: 50, failed: false },
        { id: 'res_ohm', type: 'resistor', x: 580, y: 130, angle: 0, resistance: 100, isOhmic: true, nominalVoltage: 30, failed: false },
        { id: 'amm_ohm', type: 'ammeter', x: 580, y: 310, angle: 0, nominalVoltage: 10, failed: false }
      ];

      const parsedWires: Wire[] = [
        { id: 'w1', fromTerminalId: 'src_ohm_pos', toTerminalId: 'sw_ohm_a' },
        { id: 'w2', fromTerminalId: 'sw_ohm_b', toTerminalId: 'res_ohm_a' },
        { id: 'w3', fromTerminalId: 'res_ohm_b', toTerminalId: 'amm_ohm_a' },
        { id: 'w4', fromTerminalId: 'amm_ohm_b', toTerminalId: 'src_ohm_neg' }
      ];

      setComponents(parsedComponents);
      setWires(parsedWires);
      
      // Auto-snap Voltmeter probes onto Resistor terminals for student comfort
      setVoltmeterRed({ x: 520, y: 130, dragging: false, snappedTerminalId: 'res_ohm_a' });
      setVoltmeterBlack({ x: 640, y: 130, dragging: false, snappedTerminalId: 'res_ohm_b' });

    } else if (scenarioId === 'preset_short') {
      setIdealCurveType('ohm');
      setRcParameters({ R: 300, C: 1.0, V0: 9 });

      const parsedComponents: CircuitComponent[] = [
        { id: 'src_sh', type: 'source', x: 180, y: 245, angle: 0, voltage: 9, nominalVoltage: 45, failed: false },
        { id: 'res_sh', type: 'resistor', x: 480, y: 135, angle: 0, resistance: 300, isOhmic: true, nominalVoltage: 20, failed: false },
        { id: 'sw_sh', type: 'switch', x: 480, y: 315, angle: 0, isOpen: true, nominalVoltage: 50, failed: false }
      ];

      // Switch connected parallel directly across load resistor
      const parsedWires: Wire[] = [
        { id: 'w_sh1', fromTerminalId: 'src_sh_pos', toTerminalId: 'res_sh_a' },
        { id: 'w_sh2', fromTerminalId: 'res_sh_b', toTerminalId: 'src_sh_neg' },
        { id: 'w_sh3', fromTerminalId: 'res_sh_a', toTerminalId: 'sw_sh_a' },
        { id: 'w_sh4', fromTerminalId: 'res_sh_b', toTerminalId: 'sw_sh_b' }
      ];

      setComponents(parsedComponents);
      setWires(parsedWires);

      setVoltmeterRed({ x: 420, y: 135, dragging: false, snappedTerminalId: 'res_sh_a' });
      setVoltmeterBlack({ x: 540, y: 135, dragging: false, snappedTerminalId: 'res_sh_b' });

    } else if (scenarioId === 'preset_rc') {
      setIdealCurveType('charge');
      setRcParameters({ R: 1000, C: 0.01, V0: 10 });

      const parsedComponents: CircuitComponent[] = [
        { id: 'src_rc', type: 'source', x: 180, y: 240, angle: 0, voltage: 10, nominalVoltage: 45, failed: false },
        { id: 'sw_rc', type: 'switch', x: 360, y: 130, angle: 0, isOpen: true, nominalVoltage: 50, failed: false },
        { id: 'res_rc', type: 'resistor', x: 550, y: 130, angle: 0, resistance: 1000, isOhmic: true, nominalVoltage: 25, failed: false },
        { id: 'cap_rc', type: 'capacitor', x: 550, y: 310, angle: 0, capacitance: 0.01, voltageCapacitor: 0, charge: 0, nominalVoltage: 16, failed: false }
      ];

      const parsedWires: Wire[] = [
        { id: 'w_rc1', fromTerminalId: 'src_rc_pos', toTerminalId: 'sw_rc_a' },
        { id: 'w_rc2', fromTerminalId: 'sw_rc_b', toTerminalId: 'res_rc_a' },
        { id: 'w_rc3', fromTerminalId: 'res_rc_b', toTerminalId: 'cap_rc_pos' },
        { id: 'w_rc4', fromTerminalId: 'cap_rc_neg', toTerminalId: 'src_rc_neg' }
      ];

      setComponents(parsedComponents);
      setWires(parsedWires);

      // Probe snapped across Capacitor to track dielectric field graph!
      setVoltmeterRed({ x: 490, y: 310, dragging: false, snappedTerminalId: 'cap_rc_pos' });
      setVoltmeterBlack({ x: 610, y: 310, dragging: false, snappedTerminalId: 'cap_rc_neg' });

    } else if (scenarioId === 'preset_nonohmic') {
      setIdealCurveType('ohm');
      setRcParameters({ R: 50, C: 1.0, V0: 12 });

      const parsedComponents: CircuitComponent[] = [
        { id: 'src_no', type: 'source', x: 180, y: 240, angle: 0, voltage: 12, nominalVoltage: 45, failed: false },
        { id: 'sw_no', type: 'switch', x: 380, y: 130, angle: 0, isOpen: true, nominalVoltage: 50, failed: false },
        { id: 'res_no', type: 'resistor', x: 580, y: 130, angle: 0, resistance: 50, tempResistance: 50, isOhmic: false, nominalVoltage: 15, failed: false },
        { id: 'amm_no', type: 'ammeter', x: 580, y: 310, angle: 0, nominalVoltage: 10, failed: false }
      ];

      const parsedWires: Wire[] = [
        { id: 'w_no1', fromTerminalId: 'src_no_pos', toTerminalId: 'sw_no_a' },
        { id: 'w_no2', fromTerminalId: 'sw_no_b', toTerminalId: 'res_no_a' },
        { id: 'w_no3', fromTerminalId: 'res_no_b', toTerminalId: 'amm_no_a' },
        { id: 'w_no4', fromTerminalId: 'amm_no_b', toTerminalId: 'src_no_neg' }
      ];

      setComponents(parsedComponents);
      setWires(parsedWires);

      setVoltmeterRed({ x: 520, y: 130, dragging: false, snappedTerminalId: 'res_no_a' });
      setVoltmeterBlack({ x: 640, y: 130, dragging: false, snappedTerminalId: 'res_no_b' });
    }
  };

  const selectedComp = components.find(c => c.id === selectedComponentId) || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0b0e] text-slate-300 overflow-hidden font-sans selection:bg-cyan-500/30">
      
      {/* 1. Header Toolbar */}
      <header className="h-14 border-b border-slate-800 bg-[#0f1117] flex items-center justify-between px-6 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)] shrink-0">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-bold tracking-tight text-slate-100 uppercase font-sans">
              Laboratorio Virtual de Electricidad DC <span className="text-cyan-400 font-mono text-[10px] ml-1.5">v4.2</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-mono tracking-wide">
              Sandbox Interactivo de Ley de Ohm, Kirchhoff y Transitorios de Condensadores
            </p>
          </div>
        </div>

        {/* Informational helpful cues */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex flex-col items-end text-[9px] font-mono border-r border-slate-800 pr-5">
            <span className="text-slate-500 uppercase tracking-wider">PASOS DE PRUEBA SUGERIDOS:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Cierra el interruptor para ver el flujo convencional
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> SIMULADOR ACTIVO
          </div>
        </div>
      </header>

      {/* 2. Main Layout - Dashboard split */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left sandbox Canvas area + bottom Oscilloscope plotter */}
        <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto block scrollbar-none h-full min-w-0">
          
          {/* Circuit builder sandbox card */}
          <div className="flex-1 min-h-[460px] relative">
            <SandboxCanvas
              components={components}
              wires={wires}
              onUpdateComponents={setComponents}
              onUpdateWires={setWires}
              selectedComponentId={selectedComponentId}
              onSelectComponent={setSelectedComponentId}
              voltmeterRed={voltmeterRed}
              voltmeterBlack={voltmeterBlack}
              onChangeVoltmeterRed={setVoltmeterRed}
              onChangeVoltmeterBlack={setVoltmeterBlack}
              terminalVoltages={currentVoltagesRef.current}
              componentCurrents={currentCurrentsRef.current}
              showEField={showEField}
              warnings={warnings}
              simulationSpeed={simulationSpeed}
            />
          </div>

          {/* Bottom signal oscilloscope analyser card */}
          <div className="shrink-0">
            <Oscilloscope
              dataPoints={dataPoints}
              onClearPoints={handleClearPoints}
              capturedTable={capturedTable}
              onCaptureCurrentPoint={handleCapturePoint}
              onClearTable={handleClearTable}
              idealCurveType={idealCurveType}
              rcParameters={rcParameters}
            />
          </div>
        </div>

        {/* Left side sidebar toolboxes */}
        <Sidebar
          onAddComponent={handleAddComponent}
          selectedComponent={selectedComp}
          onUpdateComponent={handleUpdateComponent}
          onLoadScenario={loadScenario}
          onClearCanvas={handleClearCanvas}
          showEField={showEField}
          onToggleEField={() => setShowEField(!showEField)}
          simulationSpeed={simulationSpeed}
          onSetSimulationSpeed={setSimulationSpeed}
          // Stopwatch
          stopwatchTime={stopwatchTime}
          stopwatchRunning={stopwatchRunning}
          onToggleStopwatch={() => setStopwatchRunning(!stopwatchRunning)}
          onResetStopwatch={handleResetStopwatch}
        />
      </main>
    </div>
  );
}
