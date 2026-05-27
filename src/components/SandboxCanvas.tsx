/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CircuitComponent, Terminal, Wire, VoltmeterProbe, ComponentType } from '../types';
import { Trash2, RotateCw, RefreshCw, AlertTriangle, Play, Scissors, HelpCircle } from 'lucide-react';

interface SandboxCanvasProps {
  components: CircuitComponent[];
  wires: Wire[];
  onUpdateComponents: (components: CircuitComponent[]) => void;
  onUpdateWires: (wires: Wire[]) => void;
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  voltmeterRed: VoltmeterProbe;
  voltmeterBlack: VoltmeterProbe;
  onChangeVoltmeterRed: (p: VoltmeterProbe) => void;
  onChangeVoltmeterBlack: (p: VoltmeterProbe) => void;
  terminalVoltages: Record<string, number>;
  componentCurrents: Record<string, number>;
  showEField: boolean;
  warnings: string[];
  simulationSpeed: number;
}

export default function SandboxCanvas({
  components,
  wires,
  onUpdateComponents,
  onUpdateWires,
  selectedComponentId,
  onSelectComponent,
  voltmeterRed,
  voltmeterBlack,
  onChangeVoltmeterRed,
  onChangeVoltmeterBlack,
  terminalVoltages,
  componentCurrents,
  showEField,
  warnings,
  simulationSpeed
}: SandboxCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Dragging states
  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedProbe, setDraggedProbe] = useState<'red' | 'black' | null>(null);
  const [probeOffset, setProbeOffset] = useState({ x: 0, y: 0 });

  // Voltmeter card dragging states
  const [voltmeterPos, setVoltmeterPos] = useState({ x: 30, y: 25 });
  const [isDraggingVoltmeter, setIsDraggingVoltmeter] = useState(false);
  const [voltmeterDragOffset, setVoltmeterDragOffset] = useState({ x: 0, y: 0 });

  // Wiring state
  const [activeWiringStart, setActiveWiringStart] = useState<{
    terminalId: string;
    componentId: string;
    x: number;
    y: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Terminal Position Lookup (used for drawing wires from exact global coordinates)
  const getTerminalGlobalPos = (c: CircuitComponent, termRole: string) => {
    // Determine offset relative to component center base on standard template sizes:
    // Width: 120px, Height: 70px
    let rx = 0;
    let ry = 0;
    
    if (c.type === 'source' || c.type === 'capacitor') {
      // Polar elements: left represents Positive terminal, right represents Negative (or vice versa)
      // For Fuente: Positive (+) is Left (rx = -60), Negative (-) is Right (rx = 60) before rotation
      rx = termRole === 'pos' ? -55 : 55;
      ry = 0;
    } else {
      // Symmetric: left = A, right = B
      rx = termRole === 'a' ? -55 : 55;
      ry = 0;
    }

    // Apply rotation angle (in degrees: 0, 90, 180, 270) around center (c.x, c.y)
    const rad = (c.angle * Math.PI) / 180;
    const gx = c.x + rx * Math.cos(rad) - ry * Math.sin(rad);
    const gy = c.y + rx * Math.sin(rad) + ry * Math.cos(rad);
    
    return { x: gx, y: gy };
  };

  // Resistor Color Bands Helper
  const getResistorBands = (r: number): string[] => {
    if (r <= 0) return ['black', 'black', 'black'];
    // Decodes into: First digit, Second digit, Multiplier power of 10
    const str = r.toString();
    const cleanStr = Math.round(r).toString();
    let d1 = 0;
    let d2 = 0;
    let multiplier = 0;

    if (r < 10) {
      d1 = Math.floor(r);
      d2 = Math.round((r - d1) * 10);
      multiplier = -1; // Gold or Silver
    } else {
      const exp = Math.floor(Math.log10(r)) - 1;
      const base = Math.round(r / Math.pow(10, exp));
      d1 = Math.floor(base / 10);
      d2 = base % 10;
      multiplier = exp;
    }

    const colorMap: Record<number, string> = {
      0: 'bg-black',
      1: 'bg-amber-900', // Brown
      2: 'bg-red-600',
      3: 'bg-orange-500',
      4: 'bg-yellow-400',
      5: 'bg-green-600',
      6: 'bg-blue-600',
      7: 'bg-purple-600',
      8: 'bg-neutral-500', // Gray
      9: 'bg-stone-100', // White
    };

    const b1 = colorMap[d1] || 'bg-neutral-400';
    const b2 = colorMap[d2] || 'bg-neutral-400';
    
    let bMul = 'bg-black';
    if (multiplier === -1) bMul = 'bg-amber-500'; // Gold
    else bMul = colorMap[multiplier] || 'bg-black';

    return [b1, b2, bMul];
  };

  // Convert Terminal IDs of a wire to actual terminal roles
  const parseTerminalName = (tId: string) => {
    const parts = tId.split('_');
    const role = parts[parts.length - 1]; // 'pos', 'neg', 'a', 'b'
    const cId = tId.replace(`_${role}`, '');
    return { cId, role };
  };

  // Vertex dragging state
  const [draggedVertex, setDraggedVertex] = useState<{ wireId: string; index: number } | null>(null);

  // Helper: geometry segment distance calculation
  const getDistanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  };

  // Helper: point and angle interpolator along polyline
  const getPointAtLength = (p1: { x: number; y: number }, p2: { x: number; y: number }, pathPoints: { x: number; y: number }[] | undefined, t: number) => {
    const pts = [p1, ...(pathPoints || []), p2];
    
    // If no intermediate points, use quadratic Bezier spline
    if (!pathPoints || pathPoints.length === 0) {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2 + Math.min(30, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.15);
      const qx = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * mx + t * t * p2.x;
      const qy = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * my + t * t * p2.y;
      const tx = 2 * (1 - t) * (mx - p1.x) + 2 * t * (p2.x - mx);
      const ty = 2 * (1 - t) * (my - p1.y) + 2 * t * (p2.y - my);
      return { x: qx, y: qy, angle: Math.atan2(ty, tx) };
    }
    
    // Polyline length calculations
    let totalLength = 0;
    const lengths: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
      lengths.push(len);
      totalLength += len;
    }
    
    const targetLen = totalLength * t;
    let accumulated = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = lengths[i];
      if (accumulated + len >= targetLen || i === pts.length - 2) {
        const localT = len > 0 ? (targetLen - accumulated) / len : 0;
        const x = pts[i].x + (pts[i+1].x - pts[i].x) * localT;
        const y = pts[i].y + (pts[i+1].y - pts[i].y) * localT;
        const angle = Math.atan2(pts[i+1].y - pts[i].y, pts[i+1].x - pts[i].x);
        return { x, y, angle };
      }
      accumulated += len;
    }
    return { x: p2.x, y: p2.y, angle: 0 };
  };

  // Helper: insert codo (vertex) on wire segment click and trigger drag
  const handleWireMouseDown = (e: React.MouseEvent, w: Wire, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    
    const pts = [p1, ...(w.pathPoints || []), p2];
    
    let minDistance = Infinity;
    let insertIndex = 0;
    
    for (let i = 0; i < pts.length - 1; i++) {
      const dist = getDistanceToSegment(cx, cy, pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
      if (dist < minDistance) {
        minDistance = dist;
        insertIndex = i;
      }
    }
    
    const snapToGrid = (val: number) => Math.round(val / 10) * 10;
    const newPt = { x: snapToGrid(cx), y: snapToGrid(cy) };
    
    const currentPoints = w.pathPoints ? [...w.pathPoints] : [];
    currentPoints.splice(insertIndex, 0, newPt);
    
    const updatedWires = wires.map(item => {
      if (item.id === w.id) {
        return { ...item, pathPoints: currentPoints };
      }
      return item;
    });
    onUpdateWires(updatedWires);
    
    setDraggedVertex({ wireId: w.id, index: insertIndex });
  };

  // Helper: delete codo (vertex)
  const deleteVertex = (wireId: string, index: number) => {
    const updatedWires = wires.map(w => {
      if (w.id === wireId && w.pathPoints) {
        const newPoints = w.pathPoints.filter((_, idx) => idx !== index);
        return { ...w, pathPoints: newPoints };
      }
      return w;
    });
    onUpdateWires(updatedWires);
  };

  // Capture canvas mouse coordinates
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    // Handle component drag
    if (draggedComponentId) {
      const snapToGrid = (val: number) => Math.round(val / 10) * 10;
      const updated = components.map(c => {
        if (c.id === draggedComponentId) {
          return {
            ...c,
            x: Math.max(50, Math.min(800, snapToGrid(x - dragOffset.x))),
            y: Math.max(50, Math.min(430, snapToGrid(y - dragOffset.y)))
          };
        }
        return c;
      });
      onUpdateComponents(updated);
    }

    // Handle voltmeter drag
    if (isDraggingVoltmeter) {
      setVoltmeterPos({
        x: Math.max(10, Math.min(800, x - voltmeterDragOffset.x)),
        y: Math.max(10, Math.min(450, y - voltmeterDragOffset.y))
      });
    }

    // Handle vertex drag
    if (draggedVertex) {
      const snapToGrid = (val: number) => Math.round(val / 10) * 10;
      const updatedWires = wires.map(w => {
        if (w.id === draggedVertex.wireId) {
          const newPoints = w.pathPoints ? [...w.pathPoints] : [];
          if (newPoints[draggedVertex.index]) {
            newPoints[draggedVertex.index] = {
              x: Math.max(20, Math.min(800, snapToGrid(x))),
              y: Math.max(20, Math.min(450, snapToGrid(y)))
            };
          }
          return { ...w, pathPoints: newPoints };
        }
        return w;
      });
      onUpdateWires(updatedWires);
    }

    // Handle probe drag
    if (draggedProbe === 'red') {
      // Find nearest snapped terminal
      let snapTerm: string | null = null;
      let minDist = 25;
      
      components.forEach(c => {
        const terms = c.type === 'source' || c.type === 'capacitor' ? ['pos', 'neg'] : ['a', 'b'];
        terms.forEach(tRole => {
          const tId = `${c.id}_${tRole}`;
          const gPos = getTerminalGlobalPos(c, tRole);
          const dist = Math.hypot(x - gPos.x, y - gPos.y);
          if (dist < minDist) {
            minDist = dist;
            snapTerm = tId;
          }
        });
      });

      onChangeVoltmeterRed({
        x: snapTerm ? getTerminalGlobalPos(components.find(c => c.id === parseTerminalName(snapTerm!).cId)!, parseTerminalName(snapTerm!).role).x : x - probeOffset.x,
        y: snapTerm ? getTerminalGlobalPos(components.find(c => c.id === parseTerminalName(snapTerm!).cId)!, parseTerminalName(snapTerm!).role).y : y - probeOffset.y,
        dragging: true,
        snappedTerminalId: snapTerm
      });
    }

    if (draggedProbe === 'black') {
      let snapTerm: string | null = null;
      let minDist = 25;
      
      components.forEach(c => {
        const terms = c.type === 'source' || c.type === 'capacitor' ? ['pos', 'neg'] : ['a', 'b'];
        terms.forEach(tRole => {
          const tId = `${c.id}_${tRole}`;
          const gPos = getTerminalGlobalPos(c, tRole);
          const dist = Math.hypot(x - gPos.x, y - gPos.y);
          if (dist < minDist) {
            minDist = dist;
            snapTerm = tId;
          }
        });
      });

      onChangeVoltmeterBlack({
        x: snapTerm ? getTerminalGlobalPos(components.find(c => c.id === parseTerminalName(snapTerm!).cId)!, parseTerminalName(snapTerm!).role).x : x - probeOffset.x,
        y: snapTerm ? getTerminalGlobalPos(components.find(c => c.id === parseTerminalName(snapTerm!).cId)!, parseTerminalName(snapTerm!).role).y : y - probeOffset.y,
        dragging: true,
        snappedTerminalId: snapTerm
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedComponentId(null);
    setDraggedProbe(null);
    setIsDraggingVoltmeter(false);
    setDraggedVertex(null);
    
    if (activeWiringStart) {
      // See if we released over a valid terminal
      let snappedTerminalId: string | null = null;
      
      components.forEach(c => {
        const terms = c.type === 'source' || c.type === 'capacitor' ? ['pos', 'neg'] : ['a', 'b'];
        terms.forEach(tRole => {
          const tId = `${c.id}_${tRole}`;
          const gPos = getTerminalGlobalPos(c, tRole);
          const dist = Math.hypot(mousePos.x - gPos.x, mousePos.y - gPos.y);
          if (dist < 25 && tId !== activeWiringStart.terminalId) {
            snappedTerminalId = tId;
          }
        });
      });

      if (snappedTerminalId) {
        // Guard: check if connection already exists
        const exists = wires.some(w => 
          (w.fromTerminalId === activeWiringStart.terminalId && w.toTerminalId === snappedTerminalId) ||
          (w.fromTerminalId === snappedTerminalId && w.toTerminalId === activeWiringStart.terminalId)
        );

        if (!exists) {
          const newWire: Wire = {
            id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            fromTerminalId: activeWiringStart.terminalId,
            toTerminalId: snappedTerminalId!
          };
          onUpdateWires([...wires, newWire]);
        }
      }
      setActiveWiringStart(null);
    }
  };

  const startComponentDrag = (e: React.MouseEvent, c: CircuitComponent) => {
    e.stopPropagation();
    onSelectComponent(c.id);
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDraggedComponentId(c.id);
    setDragOffset({ x: x - c.x, y: y - c.y });
  };

  const startTerminalWiring = (e: React.MouseEvent, c: CircuitComponent, termRole: string) => {
    e.stopPropagation();
    const tId = `${c.id}_${termRole}`;
    const gPos = getTerminalGlobalPos(c, termRole);
    setActiveWiringStart({
      terminalId: tId,
      componentId: c.id,
      x: gPos.x,
      y: gPos.y
    });
  };

  const toggleSwitch = (e: React.MouseEvent, c: CircuitComponent) => {
    e.stopPropagation();
    if (c.failed) return;
    const updated = components.map(item => {
      if (item.id === c.id) {
        return { ...item, isOpen: !item.isOpen };
      }
      return item;
    });
    onUpdateComponents(updated);
  };

  const deleteComponent = (cId: string) => {
    onSelectComponent(null);
    onUpdateComponents(components.filter(c => c.id !== cId));
    onUpdateWires(wires.filter(w => {
      const { cId: fId } = parseTerminalName(w.fromTerminalId);
      const { cId: tId } = parseTerminalName(w.toTerminalId);
      return fId !== cId && tId !== cId;
    }));
  };

  const rotateComponent = (cId: string) => {
    const updated = components.map(c => {
      if (c.id === cId) {
        const nextAngle = (c.angle + 90) % 360;
        return { ...c, angle: nextAngle };
      }
      return c;
    });
    onUpdateComponents(updated);
  };

  const repairComponent = (cId: string) => {
    const updated = components.map(c => {
      if (c.id === cId) {
        return {
          ...c,
          failed: false,
          tempResistance: c.resistance,
          voltageCapacitor: 0,
          charge: 0,
        };
      }
      return c;
    });
    onUpdateComponents(updated);
  };

  const deleteWire = (wireId: string) => {
    onUpdateWires(wires.filter(w => w.id !== wireId));
  };

  // Check snapped terminal voltages for wires to color-code them
  const getWirePotentials = (w: Wire) => {
    const vFrom = terminalVoltages[w.fromTerminalId] ?? 0;
    const vTo = terminalVoltages[w.toTerminalId] ?? 0;
    const vAvg = (vFrom + vTo) / 2;
    return { vFrom, vTo, vAvg };
  };

  return (
    <div 
      id="sandbox-container"
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative flex-1 bg-[#0a0b0e] overflow-hidden h-full rounded-2xl border border-slate-800 shadow-[0_0_25px_rgba(0,0,0,0.5),_inset_0_0_40px_rgba(0,0,0,0.6)] cursor-default select-none"
    >
      {/* Visual background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#1e293b 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Warning Toast Indicator */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5 max-w-sm pointer-events-none font-sans">
        <AnimatePresence>
          {warnings.slice(0, 2).map((warn, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="bg-red-500/10 border border-red-500/50 backdrop-blur-md px-4 py-2.5 rounded-lg flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] shrink-0 animate-pulse"></div>
              <span className="text-xs font-bold text-red-200 tracking-wide uppercase">{warn}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="absolute top-4 right-4 z-20 flex gap-2 text-[10px] bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-lg py-1 px-3 text-slate-300 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 block shadow-inner"></span> Alto Potencial (&gt;=4V)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-950 block border border-slate-700"></span> Bajo Potencial (&lt;0.5V)
        </span>
      </div>

      {/* Main SVG Layout Layer (Wires, Charges, Probes, Connections) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <radialGradient id="electric-field-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="warm-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>

        {/* 1. Draw Static / Dynamic connected Wires */}
        {wires.map(w => {
          const fromComp = components.find(c => c.id === parseTerminalName(w.fromTerminalId).cId);
          const toComp = components.find(c => c.id === parseTerminalName(w.toTerminalId).cId);

          if (!fromComp || !toComp) return null;

          const p1 = getTerminalGlobalPos(fromComp, parseTerminalName(w.fromTerminalId).role);
          const p2 = getTerminalGlobalPos(toComp, parseTerminalName(w.toTerminalId).role);

          // Calculate visual wire coloring base on voltages
          const { vFrom, vTo, vAvg } = getWirePotentials(w);
          
          // Interpolate custom wire color based on average potential
          let wireColor = 'rgb(30,35,45)'; // Off potential
          if (vAvg > 4.0) {
            wireColor = '#e11d48'; // Bright Red/Rose for high voltage
          } else if (vAvg > 1.0) {
            wireColor = '#f59e0b'; // Amber/Orange for medium voltage
          } else if (vAvg >= -0.05) {
            wireColor = '#3b82f6'; // Blue for low/neutral positive potential
          } else {
            wireColor = '#8b5cf6'; // Violet for negative potentials
          }

          // Let's make wires slightly slack/curved for tactile retro feel
          const hasPathPoints = w.pathPoints && w.pathPoints.length > 0;
          let pathString = '';
          if (hasPathPoints) {
            pathString = `M ${p1.x} ${p1.y} ` + w.pathPoints!.map(pt => `L ${pt.x} ${pt.y}`).join(' ') + ` L ${p2.x} ${p2.y}`;
          } else {
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2 + Math.min(30, Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.15); // Sagging wire!
            pathString = `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
          }

          // Calculate current passing along this wire.
          // For visual speed rate, trace component currents on either side
          const curFrom = parseFloat((componentCurrents[fromComp.id] ?? 0).toFixed(4));
          const curTo = parseFloat((componentCurrents[toComp.id] ?? 0).toFixed(4));
          const activeCurrent = Math.max(Math.abs(curFrom), Math.abs(curTo));

          return (
            <g key={w.id} className="pointer-events-auto cursor-pointer">
              {/* Thick transparent wire hitbox for easy clicking */}
              <path
                d={pathString}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
                className="hover:stroke-slate-100/10 cursor-alias"
                onMouseDown={(e) => {
                  handleWireMouseDown(e, w, p1, p2);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  deleteWire(w.id);
                }}
              />
              {/* Outer Wire Insulation jacket */}
              <path
                d={pathString}
                fill="none"
                stroke={wireColor}
                strokeWidth="5"
                strokeLinecap="round"
                opacity={0.95}
                className="transition-all duration-300"
              />
              {/* Inner Wire Core accent */}
              <path
                d={pathString}
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Conventional particles moving: positive charges from higher potential to lower. */}
              {activeCurrent > 0.001 && (
                <path
                  d={pathString}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="8, 32"
                  className="animate-[dash_2s_linear_infinite]"
                  style={{
                    animationDuration: `${Math.max(0.2, 5.0 / (activeCurrent * simulationSpeed))}s`,
                    // If current flows with negative sign relative to orientation, reverse layout
                    animationDirection: curFrom < 0 ? 'reverse' : 'normal',
                  }}
                />
              )}

              {/* Electric Field Vectors overlay */}
              {showEField && (
                <g>
                  {/* Subtle arrows inside wire showing direction of Electric Field (E-field points from + to - potential) */}
                  {[0.25, 0.5, 0.75].map((tIdx, arrI) => {
                    const ptInfo = getPointAtLength(p1, p2, w.pathPoints, tIdx);
                    let angle = ptInfo.angle;

                    if (vFrom < vTo) {
                      angle += Math.PI; // E points high -> low potential
                    }

                    return (
                      <g key={arrI} transform={`translate(${ptInfo.x}, ${ptInfo.y}) rotate(${angle * 180 / Math.PI})`} className="opacity-80">
                        <line x1="-5" y1="0" x2="5" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
                        <polygon points="5,0 1,3 1,-3" fill="#38bdf8" />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Render visual codos (vertices) if they exist */}
              {w.pathPoints && w.pathPoints.map((pt, idx) => (
                <g key={idx} className="pointer-events-auto group/vertex">
                  {/* Outer glow ring on hover */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={9}
                    className="fill-transparent stroke-indigo-400/0 group-hover/vertex:stroke-indigo-400/30 group-hover/vertex:stroke-2 transition-all cursor-grab active:cursor-grabbing"
                  />
                  {/* Main handle dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={5.5}
                    className="fill-indigo-500 stroke-slate-900 stroke-[1.5px] shadow group-hover/vertex:fill-cyan-400 group-hover/vertex:stroke-cyan-200 transition-all cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggedVertex({ wireId: w.id, index: idx });
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      deleteVertex(w.id, idx);
                    }}
                  />
                  <title>Arrastra para mover codo. Doble clic para eliminar codo.</title>
                </g>
              ))}
            </g>
          );
        })}

        {/* 2. Drag-Wiring Visual Cue */}
        {activeWiringStart && (
          <line
            x1={activeWiringStart.x}
            y1={activeWiringStart.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#fb923c"
            strokeWidth="3"
            strokeDasharray="6,4"
            opacity={0.8}
          />
        )}
      </svg>

      {/* Render Voltmeter Cables in foreground */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
        {/* Red cable */}
        <path
          d={`M ${voltmeterPos.x + 50} ${voltmeterPos.y + 135} Q ${(voltmeterPos.x + 50 + voltmeterRed.x)/2} ${(voltmeterPos.y + 135 + voltmeterRed.y)/2 + 80} ${voltmeterRed.x} ${voltmeterRed.y}`}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="3.5"
          opacity={0.85}
        />
        {/* Black cable */}
        <path
          d={`M ${voltmeterPos.x + 142} ${voltmeterPos.y + 135} Q ${(voltmeterPos.x + 142 + voltmeterBlack.x)/2} ${(voltmeterPos.y + 135 + voltmeterBlack.y)/2 + 80} ${voltmeterBlack.x} ${voltmeterBlack.y}`}
          fill="none"
          stroke="#000000"
          strokeWidth="3.5"
          opacity={0.75}
        />
      </svg>

      {/* Components Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {components.map((c) => {
          const isSelected = selectedComponentId === c.id;
          
          // Get terminals to render connection nodes
          const terms = c.type === 'source' || c.type === 'capacitor' ? ['pos', 'neg'] : ['a', 'b'];
          const currentReading = componentCurrents[c.id] ?? 0;

          return (
            <div
              key={c.id}
              style={{
                left: `${c.x}px`,
                top: `${c.y}px`,
                transform: `translate(-50%, -50%) rotate(${c.angle}deg)`,
              }}
              className="absolute w-[130px] h-[80px] pointer-events-auto transition-shadow"
            >
              {/* Main visual housing box */}
              <div
                id={`component-${c.id}`}
                onMouseDown={(e) => startComponentDrag(e, c)}
                className={`w-full h-full flex flex-col items-center justify-between rounded-xl p-2 relative cursor-grab active:cursor-grabbing border text-stone-100 transition-all ${
                  isSelected 
                    ? 'border-indigo-400 bg-slate-800/95 ring-4 ring-indigo-500/20 shadow-indigo-500/10' 
                    : 'border-slate-700 bg-slate-850/90 hover:bg-slate-800/90'
                } ${c.failed ? 'border-red-500 ring-2 ring-red-500/30' : ''}`}
              >
                {/* 1. Component Graphic rendering */}
                {c.type === 'source' && (
                  <div className="flex-1 flex flex-col items-center justify-center w-full relative">
                    {/* Retro Lab Bench DC Supply visual */}
                    <div className="w-11/12 bg-slate-900 border border-slate-700 rounded-md p-1 flex flex-col items-center font-mono relative">
                      <span className="text-[7px] text-sky-400 absolute top-0.5 right-1 animate-pulse font-bold">DC ON</span>
                      <div className="text-[10px] text-emerald-400 font-bold tracking-widest mt-0.5">
                        {c.failed ? 'ERR' : `${(c.voltage ?? 12).toFixed(1)}V`}
                      </div>
                      <span className="text-[6px] text-slate-500">FUENTE DE PODER</span>
                    </div>
                  </div>
                )}

                {c.type === 'resistor' && (
                  <div className="flex-1 flex flex-col items-center justify-center w-full">
                    {!c.isOhmic ? (
                      /* Lightbulb graphic */
                      <div className="relative flex flex-col items-center justify-center">
                        {/* Glow effect if current passes */}
                        {!c.failed && Math.abs(currentReading) > 0.01 && (
                          <div 
                            className="absolute rounded-full pointer-events-none filter blur-md bg-yellow-400/30"
                            style={{
                              width: `${Math.min(70, 20 + Math.abs(currentReading) * 15)}px`,
                              height: `${Math.min(70, 20 + Math.abs(currentReading) * 15)}px`,
                            }}
                          />
                        )}
                        {/* Custom lightbulb SVG */}
                        <svg className="w-8 h-8 relative" viewBox="0 0 24 24" fill="none">
                          <path 
                            d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" 
                            stroke={c.failed ? '#991b1b' : (Math.abs(currentReading) > 0.01 ? '#fbbf24' : '#64748b')} 
                            strokeWidth="1.5"
                            fill={c.failed ? '#1e1b1b' : (Math.abs(currentReading) > 0.01 ? 'rgba(251,191,36,0.3)' : 'transparent')}
                          />
                          <path d="M9 21h6" stroke={c.failed ? '#991b1b' : '#64748b'} strokeWidth="1.5" />
                          {/* Glowing Filament inside */}
                          <path 
                            d="M9.5 12 L11 8 L13 8 L14.5 12" 
                            stroke={c.failed ? '#450a0a' : (Math.abs(currentReading) > 0.01 ? '#fef08a' : '#475569')} 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-[7px] text-slate-400 mt-0.5">AMPOLLETA (NO ÓHM.)</span>
                      </div>
                    ) : (
                      /* Premium Colored Band Resistor */
                      <div className="flex flex-col items-center justify-center w-full relative">
                        <div className="w-16 h-3.5 bg-amber-50 rounded-full border border-slate-700/60 relative flex items-center justify-around px-2 shadow-inner">
                          {getResistorBands(c.resistance ?? 100).map((bColor, bIdx) => (
                            <div key={bIdx} className={`w-1.5 h-full ${bColor} shadow-inner shrink-0`} />
                          ))}
                          {/* Gap & Tolerance Gold band */}
                          <div className="w-1.5 h-full bg-yellow-500 shadow-inner shrink-0" />
                        </div>
                        <span className="text-[8px] text-indigo-400 mt-1 font-mono font-semibold">
                          {c.failed ? 'QUEMADA' : `${c.resistance ?? 100} Ω`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {c.type === 'capacitor' && (
                  <div className="flex-1 flex flex-col items-center justify-center w-full relative">
                    {/* Visual Electrolytic Cylinder Capacitor */}
                    <div className="flex items-center gap-1.5 relative">
                      {/* Cylinder Body */}
                      <div className="w-9 h-12 bg-sky-800 rounded-lg border border-slate-700 relative flex flex-col justify-between p-0.5 overflow-hidden shadow-md">
                        {/* Capacitor Stripe for Negative Polarization */}
                        <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-neutral-300 flex flex-col justify-around py-1 items-center font-mono font-bold text-[7px] text-slate-800 leading-none">
                          <span>-</span><span>-</span><span>-</span>
                        </div>
                        {/* Metallic Cap top */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-stone-300 border-b border-sky-950" />
                        
                        <div className="text-[7px] font-sans font-extrabold text-stone-200 mt-1 rotate-0 self-start max-w-[20px] leading-tight select-none">
                          {Math.round((c.capacitance ?? 0.01) * 1e6)} μF
                        </div>
                      </div>

                      {/* Visual polarity representation legs */}
                      <div className="flex flex-col gap-0.5 text-[6px] font-mono select-none text-sky-400 bg-slate-900 border border-slate-800/60 p-0.5 rounded">
                        <div className="flex items-center gap-0.5 font-bold"><span className="text-red-400">[+]</span> Largo</div>
                        <div className="flex items-center gap-0.5 font-bold"><span className="text-stone-400">[-]</span> Corto</div>
                      </div>
                    </div>
                  </div>
                )}

                {c.type === 'switch' && (
                  <div className="flex-1 flex flex-col items-center justify-center w-full relative">
                    {/* Interruptor de cuchillo / Retro knife switch */}
                    <div 
                      onClick={(e) => toggleSwitch(e, c)}
                      className="w-14 h-8 bg-amber-950/20 rounded border border-amber-900/40 relative flex items-center justify-center cursor-pointer hover:bg-amber-900/10 transition-colors"
                    >
                      <span className="text-[6px] text-yellow-600/60 absolute top-0.5 left-1 font-mono">BASE RC</span>
                      {/* Pivot copper mount */}
                      <div className="w-1.5 h-1.5 bg-orange-700 rounded-full absolute left-2" />
                      
                      {/* Animated Copper arm */}
                      <motion.div 
                        animate={{ 
                          rotate: c.isOpen ? -35 : 0,
                          originX: 0.15,
                          originY: 0.5
                        }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="w-9 h-1 bg-gradient-to-r from-orange-400 to-orange-500 rounded absolute left-2 origin-left flex items-center justify-end"
                      >
                        {/* Little insulated black plastic handle handle */}
                        <div className="w-2.5 h-2.5 bg-stone-900 border border-stone-700 rounded-full shrink-0 -mr-1" />
                      </motion.div>

                      {/* Contact clip */}
                      <div className="w-1 h-2 bg-orange-500 rounded absolute right-2 flex items-center justify-center" />
                    </div>
                  </div>
                )}

                {c.type === 'ammeter' && (
                  <div className="flex-1 flex flex-col items-center justify-center w-full">
                    {/* Modern Digital Series Inline Ammeter */}
                    <div className="w-11/12 bg-slate-900 border border-slate-700/80 rounded-md p-1 flex flex-col items-center font-mono relative">
                      <span className="text-[5px] text-amber-500 absolute top-0.5 left-1 tracking-tighter">IN-SERIES</span>
                      <div className="text-[10px] text-rose-500 font-extrabold tracking-widest mt-0.5">
                        {c.failed ? 'FUSE' : `${Math.abs(currentReading) < 0.001 ? '0.00' : currentReading.toFixed(3)}A`}
                      </div>
                      <span className="text-[6px] text-slate-400">AMPERÍMETRO [A]</span>
                    </div>
                  </div>
                )}

                {/* Overvoltage charred state icon */}
                {c.failed && (
                  <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center p-1 font-sans text-center">
                    <AlertTriangle className="w-4 h-4 text-red-500 mb-0.5 animate-bounce" />
                    <span className="text-[8px] font-bold text-red-400 uppercase tracking-wider">¡Componente Fundido!</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        repairComponent(c.id);
                      }}
                      className="mt-1 bg-red-600 text-[6.5px] text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider hover:bg-red-500"
                    >
                      Reparar S
                    </button>
                  </div>
                )}

                {/* Footer Label */}
                <span className="text-[7.5px] uppercase font-bold tracking-wider text-slate-400 select-none">
                  {c.type === 'source' ? 'Fuente DC' : c.type === 'resistor' ? 'Resistencia' : c.type === 'capacitor' ? 'Condensador' : c.type === 'switch' ? 'Interruptor S' : 'Amperímetro'}
                </span>
              </div>

              {/* 2. Floating quick-action Context Menu if selected */}
              {isSelected && (
                <div 
                  className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/90 border border-slate-700 px-2 py-1 rounded-lg backdrop-blur shadow-xl pointer-events-auto shrink-0 z-40 transform"
                  style={{ transform: `translateX(-50%) rotate(${-c.angle}deg)` }} // Compensate rotation for accessibility
                >
                  <button
                    title="Rotar Componente"
                    onClick={() => rotateComponent(c.id)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    title="Eliminar Componente"
                    onClick={() => deleteComponent(c.id)}
                    className="p-1 rounded bg-slate-850 hover:bg-red-950 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* 3. Terminal connection dots (handles wiring drag triggers) */}
              {terms.map((termRole) => {
                const tId = `${c.id}_${termRole}`;
                // Get terminal local offsets
                let rx = termRole === 'pos' || termRole === 'a' ? -65 : 65;
                let ry = 0;
                
                // Color coding for terminals:
                // Red for polar Positive, Black for Polar Negative, Gray/Blue for standard resistor/ammeter terminals
                let termColor = 'bg-indigo-500 border-indigo-400 hover:scale-125';
                if (c.type === 'source' || c.type === 'capacitor') {
                  termColor = termRole === 'pos' 
                    ? 'bg-rose-600 border-rose-400 hover:bg-rose-500 scale-110 shadow-lg shadow-rose-900/50' 
                    : 'bg-neutral-950 border-neutral-700 hover:bg-stone-800 scale-110 shadow-lg shadow-stone-950/55';
                }

                return (
                  <div
                    key={termRole}
                    style={{
                      left: `calc(50% + ${rx}px)`,
                      top: `calc(50% + ${ry}px)`,
                    }}
                    onMouseDown={(e) => startTerminalWiring(e, c, termRole)}
                    className={`absolute w-4 h-4 rounded-full border-2 cursor-crosshair flex items-center justify-center shrink-0 pointer-events-auto transition-transform ${termColor} group z-30`}
                  >
                    {/* Visual Polarity Leg details for Electrolytic design */}
                    {c.type === 'capacitor' && (
                      <div className={`absolute pointer-events-none -bottom-5 w-4 font-mono font-extrabold text-[8px] flex justify-center ${termRole === 'pos' ? 'text-rose-400' : 'text-slate-400'}`}>
                        {termRole === 'pos' ? '+' : '-'}
                      </div>
                    )}
                    {c.type === 'source' && (
                      <div className={`absolute pointer-events-none -bottom-5 w-4 font-mono font-extrabold text-[8px] flex justify-center ${termRole === 'pos' ? 'text-rose-400' : 'text-slate-400'}`}>
                        {termRole === 'pos' ? '+' : '-'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Floating Voltmeter Station */}
      <div 
        style={{ left: `${voltmeterPos.x}px`, top: `${voltmeterPos.y}px` }}
        className="absolute w-48 bg-slate-900/90 border border-cyan-500/35 backdrop-blur-md rounded-xl p-4 shadow-2xl z-30 font-sans text-slate-300 flex flex-col gap-3 pointer-events-auto shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-fade-in"
      >
        <div 
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingVoltmeter(true);
            if (canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              setVoltmeterDragOffset({ 
                x: e.clientX - rect.left - voltmeterPos.x, 
                y: e.clientY - rect.top - voltmeterPos.y 
              });
            }
          }}
          className="flex items-center gap-2 border-b border-slate-800 pb-2 cursor-grab active:cursor-grabbing hover:bg-slate-800/40 p-1 rounded transition-colors select-none"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 font-mono">Multímetro DC</h4>
          <span className="text-[7px] text-slate-500 font-mono ml-auto tracking-widest">MOVER</span>
        </div>

        {/* Dynamic Voltmeter potential readout screen */}
        <div className="bg-[#0a0b0e] rounded-lg p-2.5 flex flex-col items-center border border-slate-800/80">
          <div className="text-slate-500 text-[7px] font-mono self-start uppercase tracking-wider">Modo: Paralelo ΔV</div>
          <div className="text-xl font-bold font-mono tracking-widest text-[#22d3ee] my-1 text-center font-mono">
            {(() => {
              const vRedVal = voltmeterRed.snappedTerminalId ? (terminalVoltages[voltmeterRed.snappedTerminalId] ?? 0) : null;
              const vBlackVal = voltmeterBlack.snappedTerminalId ? (terminalVoltages[voltmeterBlack.snappedTerminalId] ?? 0) : null;
              
              if (vRedVal === null || vBlackVal === null) {
                return '--- V';
              }
              const val = vRedVal - vBlackVal;
              return `${val >= 0 ? '+' : ''}${val.toFixed(2)}V`;
            })()}
          </div>
          <span className="text-[6.5px] text-slate-500 uppercase tracking-widest">Lectura Diferencial</span>
        </div>

        {/* Informational connection cue */}
        <p className="text-[8px] text-slate-500 leading-normal border-t border-slate-800 pt-2 font-mono">
          Usa los terminales para medir la diferencia de potencial.
        </p>

        {/* Drag handles for physical colored probes */}
        <div className="flex gap-2">
          {/* Red probe tag */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggedProbe('red');
              if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setProbeOffset({ x: e.clientX - rect.left - voltmeterRed.x, y: e.clientY - rect.top - voltmeterRed.y });
              }
            }}
            className="flex-1 py-1.5 rounded-md bg-rose-950/20 border border-rose-900/40 text-rose-400 hover:bg-rose-900/10 text-[8px] text-center font-bold font-mono cursor-grab active:cursor-grabbing transition-colors"
          >
            Sonda Red
          </div>
          {/* Black probe tag */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggedProbe('black');
              if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setProbeOffset({ x: e.clientX - rect.left - voltmeterBlack.x, y: e.clientY - rect.top - voltmeterBlack.y });
              }
            }}
            className="flex-1 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-900 text-[8px] text-center font-bold font-mono cursor-grab active:cursor-grabbing transition-colors"
          >
            Sonda Black
          </div>
        </div>
      </div>

      {/* Render physical probe handles trailing on canvas to allow easy dragging */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          setDraggedProbe('red');
          if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setProbeOffset({ x: e.clientX - rect.left - voltmeterRed.x, y: e.clientY - rect.top - voltmeterRed.y });
          }
        }}
        style={{ left: `${voltmeterRed.x}px`, top: `${voltmeterRed.y}px` }}
        className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 z-40 cursor-grab active:cursor-grabbing shrink-0"
      >
        {/* Visual probe pointer */}
        <div className="w-2.5 h-16 bg-rose-600 rounded-b-md border border-rose-500 absolute -top-12 left-1.5 origin-bottom shadow-md">
          {/* Metal probe tip */}
          <div className="w-1 h-3 bg-stone-100 absolute bottom-full left-0.5 rounded-t-sm" />
        </div>
        {/* Glow point */}
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute top-0.5 left-0.5" />
      </div>

      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          setDraggedProbe('black');
          if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setProbeOffset({ x: e.clientX - rect.left - voltmeterBlack.x, y: e.clientY - rect.top - voltmeterBlack.y });
          }
        }}
        style={{ left: `${voltmeterBlack.x}px`, top: `${voltmeterBlack.y}px` }}
        className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 z-40 cursor-grab active:cursor-grabbing shrink-0"
      >
        {/* Visual probe pointer */}
        <div className="w-2.5 h-16 bg-stone-950 rounded-b-md border border-stone-800 absolute -top-12 left-1.5 origin-bottom shadow-md">
          {/* Metal probe tip */}
          <div className="w-1 h-3 bg-stone-100 absolute bottom-full left-0.5 rounded-t-sm" />
        </div>
        {/* Glow point */}
        <div className="w-2.5 h-2.5 rounded-full bg-stone-200 animate-ping absolute top-0.5 left-0.5" />
      </div>
    </div>
  );
}
