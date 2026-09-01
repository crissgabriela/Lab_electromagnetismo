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
  formatPhysicsValue,
  chargeToCoulombs,
  COULOMB_CONSTANT
} from '../utils/physics';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Sparkles, Compass, Zap, Layers } from 'lucide-react';

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

  // Hover state (mouse probe)
  const [hoveredCoord, setHoveredCoord] = useState<{ x: number; y: number } | null>(null);
  const [hoveredMetrics, setHoveredMetrics] = useState<{ eMag: number; v: number } | null>(null);

  const coordRange = settings.coordinateRange || 1.0;
  const tpX = testPoint?.x ?? 0;
  const tpY = testPoint?.y ?? 0;

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

  // Prevent Page Scroll when zooming on canvas via native non-passive wheel listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => Math.max(0.35, Math.min(3.5, prev * delta)));
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

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

    // 1. Draw Equipotential Heatmap and Isopotential Contour Curves
    if (settings.showEquipotentials && charges.length > 0) {
      let totalAbsQCoulombs = 0;
      for (const c of charges) {
        totalAbsQCoulombs += Math.abs(chargeToCoulombs(c.q, c.unit));
      }

      const R_ref = Math.max(0.1, coordRange * 0.45);
      const V_ref = totalAbsQCoulombs > 0 ? (COULOMB_CONSTANT * totalAbsQCoulombs) / R_ref : 1.0;

      const sampleStep = 8;
      const cols = Math.ceil(width / sampleStep);
      const rows = Math.ceil(height / sampleStep);

      const gridV: number[][] = [];

      for (let r = 0; r <= rows; r++) {
        gridV[r] = [];
        for (let c = 0; c <= cols; c++) {
          const px = c * sampleStep;
          const py = r * sampleStep;
          const { mx, my } = pixelToMath(px, py, width, height);
          const pot = calculatePotentialAt(charges, { x: mx, y: my, z: 0 });
          gridV[r][c] = pot / V_ref;
        }
      }

      // Draw Colored Heatmap
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const vNorm = gridV[r][c];
          const norm = Math.atan(vNorm * 1.5) / (Math.PI / 2);

          if (Math.abs(norm) > 0.015) {
            let rCol = 0, gCol = 0, bCol = 0, alpha = Math.min(0.35, Math.abs(norm) * 0.45);
            if (norm > 0) {
              rCol = 239;
              gCol = Math.floor(68 + (1 - norm) * 70);
              bCol = Math.floor(68 * (1 - norm));
            } else {
              rCol = Math.floor(59 * (1 - Math.abs(norm)));
              gCol = Math.floor(130 + (1 - Math.abs(norm)) * 70);
              bCol = 246;
            }

            ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha})`;
            ctx.fillRect(c * sampleStep, r * sampleStep, sampleStep, sampleStep);
          }
        }
      }

      // Draw Equipotential Contour Lines
      ctx.lineWidth = 1;
      const contourLevels = [-4.0, -2.0, -1.0, -0.5, -0.25, -0.1, 0.1, 0.25, 0.5, 1.0, 2.0, 4.0];

      for (const level of contourLevels) {
        ctx.strokeStyle = level > 0 ? 'rgba(252, 165, 165, 0.35)' : 'rgba(147, 197, 253, 0.35)';

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const v00 = gridV[r][c] - level;
            const v10 = gridV[r][c + 1] - level;
            const v01 = gridV[r + 1][c] - level;

            if (v00 * v10 < 0) {
              const t = v00 / (v00 - v10);
              const px = (c + t) * sampleStep;
              const py = r * sampleStep;
              ctx.beginPath();
              ctx.arc(px, py, 0.75, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (v00 * v01 < 0) {
              const t = v00 / (v00 - v01);
              const px = c * sampleStep;
              const py = (r + t) * sampleStep;
              ctx.beginPath();
              ctx.arc(px, py, 0.75, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      }
    }

    // 2. Draw Coordinate Grid and Axes (Large, Crisp Numbers)
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

        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }

      // Major axes
      const { px: originX, py: originY } = mathToPixel(0, 0, width, height);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();

      // Axis numeric tick labels (16px bold)
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let val = minVal; val <= maxVal; val += stepMeters) {
        if (Math.abs(val) > coordRange * 1.4) continue;
        const { px } = mathToPixel(val, 0, width, height);
        const { py } = mathToPixel(0, val, width, height);

        if (Math.abs(val) > 1e-5) {
          // X ticks
          ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, originY - 5);
          ctx.lineTo(px, originY + 5);
          ctx.stroke();

          // X label with shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 5;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${val.toFixed(2)}`, px, originY + 9);
          ctx.shadowBlur = 0;

          // Y ticks
          ctx.beginPath();
          ctx.moveTo(originX - 5, py);
          ctx.lineTo(originX + 5, py);
          ctx.stroke();

          // Y label with shadow
          ctx.save();
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 5;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${val.toFixed(2)}`, originX - 10, py);
          ctx.restore();
        }
      }

      // Axis Titles (16px bold)
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('x [m]', width - 20, originY - 20);
      ctx.textAlign = 'left';
      ctx.fillText('y [m]', originX + 20, 24);
    }

    // 3. Draw Vector Grid (Distinct Electric Violet Color, Longer & Prominent)
    if (settings.showVectorGrid && charges.length > 0) {
      const gridSpacing = 52;
      const xCount = Math.floor(width / gridSpacing);
      const yCount = Math.floor(height / gridSpacing);

      for (let i = 0; i <= xCount; i++) {
        for (let j = 0; j <= yCount; j++) {
          const px = i * gridSpacing + (width % gridSpacing) / 2;
          const py = j * gridSpacing + (height % gridSpacing) / 2;
          const { mx, my } = pixelToMath(px, py, width, height);

          let tooClose = false;
          for (const c of charges) {
            const d = Math.sqrt((mx - c.x) ** 2 + (my - c.y) ** 2);
            if (d < 0.09) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;

          const field = calculateElectricFieldAt(charges, { x: mx, y: my, z: 0 });
          const mag = Math.sqrt(field.x * field.x + field.y * field.y);
          if (mag < 1e-12 || !isFinite(mag)) continue;

          const dirX = field.x / mag;
          const dirY = field.y / mag;

          // Longer, highly visible vector arrows (22px to 48px)
          const arrowLen = Math.min(48, Math.max(22, Math.log10(mag + 1) * 7.5));
          const endPx = px + dirX * arrowLen;
          const endPy = py - dirY * arrowLen;

          const intensity = Math.min(1, Math.log10(mag + 1) / 6);
          const alpha = 0.55 + intensity * 0.45;
          // Distinct Electric Violet / Lavender-Purple for Vector Grid
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
          ctx.fillStyle = `rgba(192, 132, 252, ${alpha})`;
          ctx.lineWidth = 2.2;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(endPx, endPy);
          ctx.stroke();

          // Prominent Arrowhead
          const headLen = 8.5;
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

    // 4. Draw Electric Field Lines (Distinct Cyan / Turquoise Streamlines)
    if (settings.showFieldLines && charges.length > 0) {
      const bounds = {
        minX: -coordRange * 1.8,
        maxX: coordRange * 1.8,
        minY: -coordRange * 1.8,
        maxY: coordRange * 1.8,
      };

      const lines = traceFieldLines2D(charges, bounds, settings.fieldLinesCount || 16);

      // Vibrant Electric Cyan / Turquoise Streamlines
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';

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

        if (line.length > 10) {
          const midIdx = Math.floor(line.length / 2);
          const p1 = mathToPixel(line[midIdx - 2].x, line[midIdx - 2].y, width, height);
          const p2 = mathToPixel(line[midIdx + 2].x, line[midIdx + 2].y, width, height);

          const angle = Math.atan2(p2.py - p1.py, p2.px - p1.px);
          const arrowPx = (p1.px + p2.px) / 2;
          const arrowPy = (p1.py + p2.py) / 2;
          const headSize = 6.5;

          ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
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

    // 5. Draw Individual Charge Contribution Field Vectors at Test Point (Longer & Clearer)
    const { px: tpPx, py: tpPy } = mathToPixel(tpX, tpY, width, height);

    if (settings.showIndividualVectors && calculation.chargesCalculations.length > 0) {
      calculation.chargesCalculations.forEach((calc, idx) => {
        if (calc.fieldMagnitude < 1e-12) return;

        const isPos = calc.charge.q > 0;
        const vScale = (settings.vectorScale || 1.0) * 0.00003;
        const arrowDx = calc.electricField.x * vScale;
        const arrowDy = -calc.electricField.y * vScale;

        const displayLen = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
        // Extended prominent length (100px to 260px)
        const clampedLen = Math.min(260, Math.max(100, displayLen * 3.6));
        const dirAngle = Math.atan2(arrowDy, arrowDx);

        const endX = tpPx + Math.cos(dirAngle) * clampedLen;
        const endY = tpPy + Math.sin(dirAngle) * clampedLen;

        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = isPos ? '#f87171' : '#60a5fa';
        ctx.lineWidth = 2.8;

        ctx.beginPath();
        ctx.moveTo(tpPx, tpPy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = isPos ? '#ef4444' : '#3b82f6';
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

        // Vector Label Pill (Positioned cleanly beyond the arrowhead)
        const vecLabel = `E_${calc.charge.name || `q${idx + 1}`}`;
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        const lblW = ctx.measureText(vecLabel).width;

        const lblX = endX + Math.cos(dirAngle) * 16;
        const lblY = endY + Math.sin(dirAngle) * 16;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = isPos ? '#ef4444' : '#3b82f6';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(lblX - lblW / 2 - 6, lblY - 11, lblW + 12, 22, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isPos ? '#fca5a5' : '#93c5fd';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(vecLabel, lblX, lblY);
        ctx.restore();
      });
    }

    // 6. Draw Total Net Electric Field Vector E_total at Test Point (Long & Impressive)
    if (settings.showTotalVector && calculation.totalFieldMagnitude > 1e-12) {
      const vScale = (settings.vectorScale || 1.0) * 0.00003;
      const arrowDx = calculation.totalElectricField.x * vScale;
      const arrowDy = -calculation.totalElectricField.y * vScale;

      const displayLen = Math.sqrt(arrowDx * arrowDx + arrowDy * arrowDy);
      // Extended long net vector (130px to 320px)
      const clampedLen = Math.min(320, Math.max(130, displayLen * 4.2));
      const dirAngle = Math.atan2(arrowDy, arrowDx);

      const endX = tpPx + Math.cos(dirAngle) * clampedLen;
      const endY = tpPy + Math.sin(dirAngle) * clampedLen;

      ctx.save();
      ctx.shadowColor = 'rgba(16, 185, 129, 0.95)';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 5.0;

      ctx.beginPath();
      ctx.moveTo(tpPx, tpPy);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      const headSize = 15;
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

      // Total Vector Label Badge (Beyond the arrowhead)
      ctx.shadowBlur = 0;
      const totLabel = 'E_total';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      const totW = ctx.measureText(totLabel).width;

      const lblX = endX + Math.cos(dirAngle) * 18;
      const lblY = endY + Math.sin(dirAngle) * 18;

      ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(lblX - totW / 2 - 8, lblY - 13, totW + 16, 26, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a7f3d0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(totLabel, lblX, lblY);
      ctx.restore();
    }

    // 7. Draw Test Point Indicator P(r0)
    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.95)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(tpPx, tpPy, 13, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tpPx - 20, tpPy);
    ctx.lineTo(tpPx + 20, tpPy);
    ctx.moveTo(tpPx, tpPy - 20);
    ctx.lineTo(tpPx, tpPy + 20);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(tpPx, tpPy, 5.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Clean Floating Tag Pill for Point P (14px font)
    const pTag = 'P (r₀)';
    ctx.font = 'bold 14px Inter, sans-serif';
    const tagW = ctx.measureText(pTag).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(tpPx - tagW / 2 - 8, tpPy - 36, tagW + 16, 24, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pTag, tpPx, tpPy - 24);
    ctx.restore();

    // 8. Draw Point Charges (15% Smaller Circles: ~14.5px base radius)
    charges.forEach((c) => {
      const { px, py } = mathToPixel(c.x, c.y, width, height);
      const isPos = c.q > 0;
      const isNeg = c.q < 0;
      const isSelected = selectedChargeId === c.id;

      // 15% smaller radius
      const baseRadius = 13.5 + Math.min(5, Math.abs(c.q) * 1.5);

      ctx.save();

      // Halo / Glow
      const gradient = ctx.createRadialGradient(px, py, baseRadius * 0.4, px, py, baseRadius * 1.8);
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
      ctx.arc(px, py, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(px, py, baseRadius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Charge Sphere Body
      ctx.fillStyle = isPos ? '#ef4444' : isNeg ? '#3b82f6' : '#64748b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
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

      // Charge Name & Value Label Card (14px bold font)
      if (settings.showLabels) {
        const cLabel = `${c.name || 'q'}: ${c.q > 0 ? `+${c.q}` : c.q} ${c.unit}`;
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        const cTextWidth = ctx.measureText(cLabel).width;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = isPos ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.7)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.roundRect(px - cTextWidth / 2 - 8, py + baseRadius + 6, cTextWidth + 16, 23, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cLabel, px, py + baseRadius + 17);
      }

      ctx.restore();
    });

    ctx.restore();
  }, [
    charges,
    testPoint,
    tpX,
    tpY,
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

    // Hit-test Test Point P
    const tpDist = Math.sqrt((mx - tpX) ** 2 + (my - tpY) ** 2);
    if (tpDist < 0.1 * (coordRange / zoom)) {
      setDraggedItem({ type: 'testPoint' });
      return;
    }

    // Hit-test Charges
    for (const c of charges) {
      const cDist = Math.sqrt((mx - c.x) ** 2 + (my - c.y) ** 2);
      if (cDist < 0.11 * (coordRange / zoom)) {
        setDraggedItem({ type: 'charge', id: c.id });
        if (onSelectCharge) onSelectCharge(c.id);
        return;
      }
    }

    // Pan viewport
    if (e.button === 1 || e.shiftKey || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else {
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

    const field = calculateElectricFieldAt(charges, { x: mx, y: my, z: 0 });
    const pot = calculatePotentialAt(charges, { x: mx, y: my, z: 0 });
    setHoveredMetrics({
      eMag: Math.sqrt(field.x * field.x + field.y * field.y),
      v: pot,
    });

    if (draggedItem) {
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

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { mx, my } = pixelToMath(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    onUpdateTestPointPos(
      Math.round(mx * 100) / 100,
      Math.round(my * 100) / 100
    );
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const sci = settings.scientificNotation;

  return (
    <div 
      ref={containerRef}
      className="relative w-full flex flex-col gap-4 select-none"
    >
      {/* 2D Canvas Viewport with Expanded Height */}
      <div className="relative w-full h-[560px] md:h-[620px] lg:h-[680px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Floating Canvas Controls Overlay (Top-Left) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800/80 shadow-lg">
          <button
            onClick={() => setZoom((z) => Math.min(3.5, z * 1.15))}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.35, z / 1.15))}
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

        {/* Origin (0,0) Quick Snap Button (Top-Right) */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => onUpdateTestPointPos(0, 0)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold backdrop-blur-md transition shadow-md"
            title="Fijar Punto de Prueba en el Origen (0,0)"
          >
            <Crosshair className="w-4 h-4" />
            Fijar P en (0,0)
          </button>
        </div>

        {/* Cursor Probe Hover Bar (Bottom Overlay) */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800/80 text-xs sm:text-sm text-slate-200 font-mono shadow-xl">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <Sparkles className="w-4 h-4" />
              Sonda Cursor:
            </span>
            {hoveredCoord && (
              <span className="text-slate-100 font-semibold">
                ({hoveredCoord.x.toFixed(2)}, {hoveredCoord.y.toFixed(2)}) m
              </span>
            )}
            {hoveredMetrics && (
              <>
                <span className="text-emerald-400 font-bold">
                  |E|: {formatPhysicsValue(hoveredMetrics.eMag, 'N/C', sci, 2)}
                </span>
                <span className="text-cyan-400 font-bold">
                  V: {formatPhysicsValue(hoveredMetrics.v, 'V', sci, 2)}
                </span>
              </>
            )}
          </div>

          <div className="text-xs text-slate-400 hidden sm:inline">
            Arrastra P o cargas • Doble clic para reubicar P
          </div>
        </div>
      </div>

      {/* Prominent High-Contrast Punto P HUD Display Card */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Position */}
        <div className="flex items-center gap-3.5 bg-slate-950/80 p-4 rounded-xl border border-amber-500/40 shadow-md">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 shadow-inner">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Punto de Prueba (r₀)
            </div>
            <div className="text-lg font-black font-mono text-slate-100 mt-0.5">
              ({tpX.toFixed(2)}, {tpY.toFixed(2)}) m
            </div>
          </div>
        </div>

        {/* Metric 2: Electric Field at P */}
        <div className="flex items-center gap-3.5 bg-slate-950/80 p-4 rounded-xl border border-emerald-500/40 shadow-md">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 shadow-inner">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Campo Eléctrico Total E(r₀)
            </div>
            <div className="text-lg font-black font-mono text-emerald-300 mt-0.5">
              {formatPhysicsValue(calculation.totalFieldMagnitude, 'N/C', sci, 3)}
            </div>
            {calculation.fieldAngle2D !== undefined && (
              <div className="text-xs text-slate-300 font-mono font-medium">
                Dirección θ = {calculation.fieldAngle2D.toFixed(1)}°
              </div>
            )}
          </div>
        </div>

        {/* Metric 3: Electric Potential at P */}
        <div className="flex items-center gap-3.5 bg-slate-950/80 p-4 rounded-xl border border-cyan-500/40 shadow-md">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Potencial Eléctrico Total V(r₀)
            </div>
            <div className="text-lg font-black font-mono text-cyan-300 mt-0.5">
              {formatPhysicsValue(calculation.totalPotential, 'V', sci, 3)}
            </div>
            <div className="text-xs text-slate-300 font-medium">
              {calculation.totalPotential > 0 ? '+ Positivo' : calculation.totalPotential < 0 ? '- Negativo' : '0 Nulo'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
