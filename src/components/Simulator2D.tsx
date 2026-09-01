/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PointCharge, TestPoint, SimulationSettings, TotalCalculation } from '../types';
import { 
  calculateElectricFieldAt, 
  calculatePotentialAt, 
  traceFieldLines2D, 
  formatPhysicsValue 
} from '../utils/physics';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Sparkles } from 'lucide-react';

interface Simulator2DProps {
  charges: PointCharge[];
  testPoint: TestPoint;
  settings: SimulationSettings;
  calculation: TotalCalculation;
  onUpdateChargePos: (id: string, x: number, y: number) => void;
  onUpdateTestPointPos: (x: number, y: number) => void;
  onSelectCharge?: (id: string | null) => void;
  selectedChargeId?: string | null;
}

export const Simulator2D: React.FC<Simulator2DProps> = ({
  charges,
  testPoint,
  settings,
  calculation,
  onUpdateChargePos,
  onUpdateTestPointPos,
  onSelectCharge,
  selectedChargeId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport / pan & zoom state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging state for charges and test point
  const [draggedItem, setDraggedItem] = useState<{
    type: 'charge' | 'testPoint';
    id?: string;
  } | null>(null);

  // Hover state
  const [hoveredCoord, setHoveredCoord] = useState<{ x: number; y: number } | null>(null);
  const [hoveredMetrics, setHoveredMetrics] = useState<{ eMag: number; v: number } | null>(null);

  const coordRange = settings.coordinateRange || 1.0;

  // Convert Math coords (meters) to Canvas Pixel coords
  const mathToPixel = useCallback(
    (mx: number, my: number, width: number, height: number) => {
      const baseScale = Math.min(width, height) / (coordRange * 2.2);
      const scale = baseScale * zoom;
      const px = width / 2 + pan.x + mx * scale;
      const py = height / 2 + pan.y - my * scale;
      return { px, py, scale };
    },
    [coordRange, zoom, pan]
  );

  // Convert Canvas Pixel coords to Math coords (meters)
  const pixelToMath = useCallback(
    (px: number, py: number, width: number, height: number) => {
      const baseScale = Math.min(width, height) / (coordRange * 2.2);
      const scale = baseScale * zoom;
      const mx = (px - (width / 2 + pan.x)) / scale;
      const my = ((height / 2 + pan.y) - py) / scale;
      return { mx, my };
    },
    [coordRange, zoom, pan]
  );

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const { scale } = mathToPixel(0, 0, width, height);

    // 1. Draw Equipotential Heatmap if enabled
    if (settings.showEquipotentials && charges.length > 0) {
      const sampleStep = 8; // step in pixels for smooth rendering
      const cols = Math.ceil(width / sampleStep);
      const rows = Math.ceil(height / sampleStep);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = c * sampleStep + sampleStep / 2;
          const py = r * sampleStep + sampleStep / 2;
          const { mx, my } = pixelToMath(px, py, width, height);

          const pot = calculatePotentialAt(charges, { x: mx, y: my, z: 0 });
          // Normalize potential using soft non-linear arctan mapping
          const norm = Math.atan(pot * 0.0001) / (Math.PI / 2); // range -1 to 1

          if (Math.abs(norm) > 0.02) {
            let rCol = 0, gCol = 0, bCol = 0, alpha = Math.min(0.25, Math.abs(norm) * 0.35);
            if (norm > 0) {
              // Positive potential -> Red/Amber
              rCol = 239;
              gCol = Math.floor(68 + (1 - norm) * 50);
              bCol = 68;
            } else {
              // Negative potential -> Blue/Cyan
              rCol = 59;
              gCol = Math.floor(130 + (1 - Math.abs(norm)) * 50);
              bCol = 246;
            }

            ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha})`;
            ctx.fillRect(c * sampleStep, r * sampleStep, sampleStep, sampleStep);
          }
        }
      }
    }

    // 2. Draw Coordinate Grid and Axes
    if (settings.showGrid) {
      ctx.lineWidth = 1;
      const stepMeters = coordRange <= 1.0 ? 0.25 : coordRange <= 2.0 ? 0.5 : 1.0;
      const minVal = -Math.ceil(coordRange * 1.5);
      const maxVal = Math.ceil(coordRange * 1.5);

      // Sub-grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      for (let val = minVal; val <= maxVal; val += stepMeters) {
        if (Math.abs(val) < 1e-6) continue;
        const { px } = mathToPixel(val, 0, width, height);
        const { py } = mathToPixel(0, val, width, height);

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }

      // Major X and Y Axes
      const { px: originX, py: originY } = mathToPixel(0, 0, width, height);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1.5;

      // X Axis
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();

      // Y Axis
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();

      // Axis numeric tick labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let val = minVal; val <= maxVal; val += stepMeters) {
        if (Math.abs(val) > coordRange * 1.4) continue;
        const { px } = mathToPixel(val, 0, width, height);
        const { py } = mathToPixel(0, val, width, height);

        if (Math.abs(val) > 1e-5) {
          // X ticks
          ctx.beginPath();
          ctx.moveTo(px, originY - 3);
          ctx.lineTo(px, originY + 3);
          ctx.stroke();
          ctx.fillText(`${val.toFixed(2)}`, px, originY + 6);

          // Y ticks
          ctx.beginPath();
          ctx.moveTo(originX - 3, py);
          ctx.lineTo(originX + 3, py);
          ctx.stroke();
          ctx.save();
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${val.toFixed(2)}`, originX - 6, py);
          ctx.restore();
        }
      }

      // Axis labels
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('x [m]', width - 25, originY - 14);
      ctx.fillText('y [m]', originX + 16, 16);
    }

    // 3. Draw Vector Grid (mini field arrows across space)
    if (settings.showVectorGrid && charges.length > 0) {
      const gridSpacing = 42; // pixels
      const xCount = Math.floor(width / gridSpacing);
      const yCount = Math.floor(height / gridSpacing);

      for (let i = 0; i <= xCount; i++) {
        for (let j = 0; j <= yCount; j++) {
          const px = i * gridSpacing + (width % gridSpacing) / 2;
          const py = j * gridSpacing + (height % gridSpacing) / 2;
          const { mx, my } = pixelToMath(px, py, width, height);

          // Check distance to charges to avoid drawing inside charges
          let tooClose = false;
          for (const c of charges) {
            const d = Math.sqrt((mx - c.x) ** 2 + (my - c.y) ** 2);
            if (d < 0.08) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;

          const field = calculateElectricFieldAt(charges, { x: mx, y: my, z: 0 });
          const mag = Math.sqrt(field.x * field.x + field.y * field.y);
          if (mag < 1e-9) continue;

          const dirX = field.x / mag;
          const dirY = field.y / mag;

          // Normalized arrow length with logarithmic scaling
          const arrowLen = Math.min(18, Math.max(6, Math.log10(mag + 1) * 3));
          const endPx = px + dirX * arrowLen;
          const endPy = py - dirY * arrowLen;

          // Color based on field strength
          const intensity = Math.min(1, Math.log10(mag + 1) / 6);
          const alpha = 0.25 + intensity * 0.45;
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
          ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
          ctx.lineWidth = 1.2;

          // Draw small arrow
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(endPx, endPy);
          ctx.stroke();

          // Arrow head
          const headLen = 4;
          const angle = Math.atan2(-(endPy - py), endPx - px);
          ctx.beginPath();
          ctx.moveTo(endPx, endPy);
          ctx.lineTo(
            endPx - headLen * Math.cos(angle - Math.PI / 6),
            endPy + headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endPx - headLen * Math.cos(angle + Math.PI / 6),
            endPy + headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 4. Draw Electric Field Lines
    if (settings.showFieldLines && charges.length > 0) {
      const bounds = {
        minX: -coordRange * 1.8,
        maxX: coordRange * 1.8,
        minY: -coordRange * 1.8,
        maxY: coordRange * 1.8,
      };

      const lines = traceFieldLines2D(charges, bounds, settings.fieldLinesCount || 16);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)'; // Cyan/Blue field lines

      lines.forEach((line) => {
        if (line.length < 2) return;
        ctx.beginPath();
        const startPt = mathToPixel(line[0].x, line[0].y, width, height);
        ctx.moveTo(startPt.px, startPt.py);

        for (let i = 1; i < line.length; i++) {
          const pt = mathToPixel(line[i].x, line[i].y, width, height);
          ctx.lineTo(pt.px, pt.py);
        }
        ctx.stroke();

        // Draw directional arrows along the field line (midway)
        if (line.length > 10) {
          const midIdx = Math.floor(line.length / 2);
          const p1 = mathToPixel(line[midIdx - 2].x, line[midIdx - 2].y, width, height);
          const p2 = mathToPixel(line[midIdx + 2].x, line[midIdx + 2].y, width, height);

          const angle = Math.atan2(p2.py - p1.py, p2.px - p1.px);
          const arrowPx = (p1.px + p2.px) / 2;
          const arrowPy = (p1.py + p2.py) / 2;
          const headSize = 5;

          ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.beginPath();
          ctx.moveTo(arrowPx, arrowPy);
          ctx.lineTo(
            arrowPx - headSize * Math.cos(angle - Math.PI / 6),
            arrowPy - headSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            arrowPx - headSize * Math.cos(angle + Math.PI / 6),
            arrowPy - headSize * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      });
    }

    // 5. Draw Individual Charge Contribution Field Vectors at Test Point
    const { px: tpPx, py: tpPy } = mathToPixel(testPoint.x, testPoint.y, width, height);

    if (settings.showIndividualVectors && calculation.chargesCalculations.length > 0) {
      calculation.chargesCalculations.forEach((calc, idx) => {
        if (calc.fieldMagnitude < 1e-12) return;

        const isPos = calc.charge.q > 0;
        // Vector scaling for clear visibility on screen
        const vScale = (settings.vectorScale || 1.0) * 0.00003;
        const arrowDx = calc.electricField.x * vScale;
        const arrowDy = -calc.electricField.y * vScale; // invert y for canvas

        // Cap arrow display length
        const displayLen = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
        const clampedLen = Math.min(120, Math.max(15, displayLen));
        const dirAngle = Math.atan2(arrowDy, arrowDx);

        const endX = tpPx + Math.cos(dirAngle) * clampedLen;
        const endY = tpPy + Math.sin(dirAngle) * clampedLen;

        // Dashed line from test point
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isPos ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.moveTo(tpPx, tpPy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrowhead
        ctx.setLineDash([]);
        ctx.fillStyle = isPos ? '#ef4444' : '#3b82f6';
        const headSize = 6;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headSize * Math.cos(dirAngle - Math.PI / 6),
          endY - headSize * Math.sin(dirAngle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - headSize * Math.cos(dirAngle + Math.PI / 6),
          endY - headSize * Math.sin(dirAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.fillStyle = isPos ? '#fca5a5' : '#93c5fd';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`E⃗_${calc.charge.name || idx + 1}`, endX + 6, endY + 4);
        ctx.restore();
      });
    }

    // 6. Draw Total Net Electric Field Vector E_total at Test Point
    if (settings.showTotalVector && calculation.totalFieldMagnitude > 1e-12) {
      const vScale = (settings.vectorScale || 1.0) * 0.00003;
      const arrowDx = calculation.totalElectricField.x * vScale;
      const arrowDy = -calculation.totalElectricField.y * vScale;

      const displayLen = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
      const clampedLen = Math.min(160, Math.max(25, displayLen));
      const dirAngle = Math.atan2(arrowDy, arrowDx);

      const endX = tpPx + Math.cos(dirAngle) * clampedLen;
      const endY = tpPy + Math.sin(dirAngle) * clampedLen;

      // Glow effect for total vector
      ctx.save();
      ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#10b981'; // Emerald Green
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      ctx.moveTo(tpPx, tpPy);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Bold Arrowhead
      ctx.fillStyle = '#10b981';
      const headSize = 10;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headSize * Math.cos(dirAngle - Math.PI / 6),
        endY - headSize * Math.sin(dirAngle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - headSize * Math.cos(dirAngle + Math.PI / 6),
        endY - headSize * Math.sin(dirAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Vector Label badge
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(`E⃗_total`, endX + 8, endY - 6);
    }

    // 7. Draw Test Point Indicator (Target Reticle)
    ctx.save();
    // Test point outer ring
    ctx.strokeStyle = '#f59e0b'; // Amber
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tpPx, tpPy, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(tpPx - 13, tpPy);
    ctx.lineTo(tpPx + 13, tpPy);
    ctx.moveTo(tpPx, tpPy - 13);
    ctx.lineTo(tpPx, tpPy + 13);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(tpPx, tpPy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Test point text tag
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('P (r₀)', tpPx + 12, tpPy - 12);
    ctx.restore();

    // 8. Draw Point Charges
    charges.forEach((c) => {
      const { px, py } = mathToPixel(c.x, c.y, width, height);
      const isPos = c.q > 0;
      const isNeg = c.q < 0;
      const isSelected = selectedChargeId === c.id;

      const baseRadius = 14 + Math.min(8, Math.abs(c.q) * 2);

      ctx.save();

      // Halo / Glow
      const gradient = ctx.createRadialGradient(px, py, baseRadius * 0.4, px, py, baseRadius * 2);
      if (isPos) {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (isNeg) {
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(148, 163, 184, 0.4)');
        gradient.addColorStop(1, 'rgba(148, 163, 184, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, baseRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Charge Sphere Body
      ctx.fillStyle = isPos ? '#ef4444' : isNeg ? '#3b82f6' : '#64748b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Charge Sign Symbol (+ / -)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isPos ? '+' : isNeg ? '−' : '0', px, py);

      // Charge Name & Value Label
      if (settings.showLabels) {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${c.name || 'q'}: ${c.q > 0 ? `+${c.q}` : c.q} ${c.unit}`,
          px,
          py + baseRadius + 14
        );
      }

      ctx.restore();
    });

    ctx.restore();
  }, [
    charges,
    testPoint,
    settings,
    calculation,
    zoom,
    pan,
    selectedChargeId,
    mathToPixel,
    pixelToMath,
    coordRange,
  ]);

  // Mouse & Touch Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const { mx, my } = pixelToMath(px, py, rect.width, rect.height);

    // Hit-test Test Point
    const tpDist = Math.sqrt((mx - testPoint.x) ** 2 + (my - testPoint.y) ** 2);
    if (tpDist < 0.08 * (coordRange / zoom)) {
      setDraggedItem({ type: 'testPoint' });
      return;
    }

    // Hit-test Charges
    for (const c of charges) {
      const cDist = Math.sqrt((mx - c.x) ** 2 + (my - c.y) ** 2);
      if (cDist < 0.1 * (coordRange / zoom)) {
        setDraggedItem({ type: 'charge', id: c.id });
        if (onSelectCharge) onSelectCharge(c.id);
        return;
      }
    }

    // If middle click or empty space drag -> Pan
    if (e.button === 1 || e.shiftKey || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else {
      // Deselect
      if (onSelectCharge) onSelectCharge(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const { mx, my } = pixelToMath(px, py, rect.width, rect.height);
    setHoveredCoord({ x: mx, y: my });

    // Calculate metrics at cursor for live probe
    const field = calculateElectricFieldAt(charges, { x: mx, y: my, z: 0 });
    const pot = calculatePotentialAt(charges, { x: mx, y: my, z: 0 });
    setHoveredMetrics({
      eMag: Math.sqrt(field.x * field.x + field.y * field.y),
      v: pot,
    });

    if (draggedItem) {
      // Clamp to reasonable boundaries
      const clampedX = Math.max(-coordRange * 1.5, Math.min(coordRange * 1.5, mx));
      const clampedY = Math.max(-coordRange * 1.5, Math.min(coordRange * 1.5, my));

      if (draggedItem.type === 'testPoint') {
        onUpdateTestPointPos(
          Math.round(clampedX * 100) / 100,
          Math.round(clampedY * 100) / 100
        );
      } else if (draggedItem.type === 'charge' && draggedItem.id) {
        onUpdateChargePos(
          draggedItem.id,
          Math.round(clampedX * 100) / 100,
          Math.round(clampedY * 100) / 100
        );
      }
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedItem(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.4, Math.min(3.0, prev * delta)));
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { mx, my } = pixelToMath(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    // Double click moves test point to cursor position
    onUpdateTestPointPos(
      Math.round(mx * 100) / 100,
      Math.round(my * 100) / 100
    );
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[540px] md:h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
    >
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full cursor-crosshair touch-none"
      />

      {/* Floating Canvas Controls Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800/80 shadow-lg">
        <button
          onClick={() => setZoom((z) => Math.min(3.0, z * 1.15))}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Acercar (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z / 1.15))}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Alejar (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Centrar y reajustar vista"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Origin (0,0) Quick Snap Button */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => onUpdateTestPointPos(0, 0)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md transition shadow-md"
          title="Fijar Punto de Prueba en el Origen (0,0)"
        >
          <Crosshair className="w-3.5 h-3.5" />
          Fijar P en (0,0)
        </button>
      </div>

      {/* Live Probe Hover Bar (Bottom) */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-xs text-slate-300 shadow-xl font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sonda en Cursor:</span>
          </div>
          {hoveredCoord && (
            <span className="text-slate-200">
              ({hoveredCoord.x.toFixed(2)}, {hoveredCoord.y.toFixed(2)}) m
            </span>
          )}
          {hoveredMetrics && (
            <>
              <span className="text-emerald-400">
                |E⃗|: {formatPhysicsValue(hoveredMetrics.eMag, 'N/C', settings.scientificNotation, 2)}
              </span>
              <span className="text-cyan-400">
                V: {formatPhysicsValue(hoveredMetrics.v, 'V', settings.scientificNotation, 2)}
              </span>
            </>
          )}
        </div>

        <div className="text-[11px] text-slate-500">
          Arrastra cargas o el punto P (r₀) • Doble clic para reubicar P
        </div>
      </div>
    </div>
  );
};
