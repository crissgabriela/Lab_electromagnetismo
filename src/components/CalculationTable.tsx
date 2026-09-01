/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TotalCalculation, SimulationSettings } from '../types';
import { formatPhysicsValue } from '../utils/physics';
import { 
  Calculator, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Zap, 
  Compass, 
  BookOpen, 
  CheckCircle2, 
  Copy, 
  Check
} from 'lucide-react';

interface CalculationTableProps {
  calculation: TotalCalculation;
  settings: SimulationSettings;
  activePresetTitle?: string;
  onUpdateSettings: (newSettings: Partial<SimulationSettings>) => void;
}

export const CalculationTable: React.FC<CalculationTableProps> = ({
  calculation,
  settings,
  activePresetTitle,
  onUpdateSettings,
}) => {
  const [showFormulas, setShowFormulas] = useState(true);
  const [copied, setCopied] = useState(false);

  const { testPoint, chargesCalculations, totalElectricField, totalFieldMagnitude, fieldAngle2D, totalPotential } = calculation;

  const is3D = settings.dimension === '3D';
  const precision = settings.precisionDigits || 4;
  const sci = settings.scientificNotation;

  const tpX = testPoint?.x ?? 0;
  const tpY = testPoint?.y ?? 0;
  const tpZ = testPoint?.z ?? 0;

  const handleExportCSV = () => {
    const headers = is3D
      ? ['Carga', 'q_valor', 'Unidad', 'x_m', 'y_m', 'z_m', 'Rx_m', 'Ry_m', 'Rz_m', 'Distancia_m', 'u_x', 'u_y', 'u_z', 'Ex_NC', 'Ey_NC', 'Ez_NC', 'E_magnitud_NC', 'V_Volts']
      : ['Carga', 'q_valor', 'Unidad', 'x_m', 'y_m', 'Rx_m', 'Ry_m', 'Distancia_m', 'u_x', 'u_y', 'Ex_NC', 'Ey_NC', 'E_magnitud_NC', 'V_Volts'];

    const rows = chargesCalculations.map((calc) => {
      const c = calc.charge;
      if (is3D) {
        return [
          c.name,
          c.q,
          c.unit,
          c.x.toFixed(4),
          c.y.toFixed(4),
          (c.z || 0).toFixed(4),
          calc.relPos.x.toFixed(4),
          calc.relPos.y.toFixed(4),
          calc.relPos.z.toFixed(4),
          calc.distance.toFixed(4),
          calc.unitVector.x.toFixed(4),
          calc.unitVector.y.toFixed(4),
          calc.unitVector.z.toFixed(4),
          calc.electricField.x.toExponential(4),
          calc.electricField.y.toExponential(4),
          calc.electricField.z.toExponential(4),
          calc.fieldMagnitude.toExponential(4),
          calc.potential.toFixed(4),
        ];
      }
      return [
        c.name,
        c.q,
        c.unit,
        c.x.toFixed(4),
        c.y.toFixed(4),
        calc.relPos.x.toFixed(4),
        calc.relPos.y.toFixed(4),
        calc.distance.toFixed(4),
        calc.unitVector.x.toFixed(4),
        calc.unitVector.y.toFixed(4),
        calc.electricField.x.toExponential(4),
        calc.electricField.y.toExponential(4),
        calc.fieldMagnitude.toExponential(4),
        calc.potential.toFixed(4),
      ];
    });

    if (is3D) {
      rows.push([
        'TOTAL_NETO',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalElectricField.x.toExponential(4),
        totalElectricField.y.toExponential(4),
        totalElectricField.z.toExponential(4),
        totalFieldMagnitude.toExponential(4),
        totalPotential.toFixed(4),
      ]);
    } else {
      rows.push([
        'TOTAL_NETO',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalElectricField.x.toExponential(4),
        totalElectricField.y.toExponential(4),
        totalFieldMagnitude.toExponential(4),
        totalPotential.toFixed(4),
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laboratorio_campo_potencial_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    const pointStr = is3D 
      ? `(${tpX.toFixed(3)}, ${tpY.toFixed(3)}, ${tpZ.toFixed(3)}) m`
      : `(${tpX.toFixed(3)}, ${tpY.toFixed(3)}) m`;
    
    const fieldVecStr = is3D
      ? `(${formatPhysicsValue(totalElectricField.x, '', sci, precision)}, ${formatPhysicsValue(totalElectricField.y, '', sci, precision)}, ${formatPhysicsValue(totalElectricField.z, '', sci, precision)}) N/C`
      : `(${formatPhysicsValue(totalElectricField.x, '', sci, precision)}, ${formatPhysicsValue(totalElectricField.y, '', sci, precision)}) N/C`;

    const summaryText = `--- RESULTADOS LABORATORIO N° 1 ---
Configuración: ${activePresetTitle || 'Personalizada'}
Punto de Prueba r₀ = ${pointStr}
Campo Eléctrico Total E = ${fieldVecStr}
Magnitud |E| = ${formatPhysicsValue(totalFieldMagnitude, 'N/C', sci, precision)}
${!is3D && fieldAngle2D !== undefined ? `Dirección θ = ${fieldAngle2D.toFixed(2)}°\n` : ''}Potencial Eléctrico Total V = ${formatPhysicsValue(totalPotential, 'V', sci, precision)}
Número de Cargas: ${chargesCalculations.length}
-------------------------------------`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Header with Title and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 shadow-inner">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-slate-100">
                Resultados Analíticos y Desglose Paso a Paso
              </h3>
              {activePresetTitle && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  {activePresetTitle}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluación en el Punto de Prueba{' '}
              <span className="text-amber-300 font-mono font-bold">
                r₀ = ({tpX.toFixed(2)}, {tpY.toFixed(2)}{is3D ? `, ${tpZ.toFixed(2)}` : ''}) m
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scientific notation switch */}
          <button
            onClick={() => onUpdateSettings({ scientificNotation: !sci })}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all border ${
              sci
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Alternar entre notación científica y decimal"
          >
            {sci ? 'Notación: Científica (10ⁿ)' : 'Notación: Estándar'}
          </button>

          {/* Copy summary button */}
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-medium"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Resumen</span>
              </>
            )}
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          {/* Toggle theoretical formulas */}
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
            title={showFormulas ? 'Ocultar fórmulas teóricas' : 'Mostrar fórmulas teóricas'}
          >
            {showFormulas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Theoretical Formulas Reference Accordion */}
      {showFormulas && (
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 text-xs space-y-3">
          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800 pb-2 flex-wrap gap-2">
            <span className="flex items-center gap-2 text-indigo-400">
              <BookOpen className="w-4 h-4" />
              Marco Teórico y Ecuaciones del Laboratorio N° 1
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              k_e = 1 / (4πε₀) ≈ 8.98755 × 10⁹ N·m²/C²
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                Campo Eléctrico (Superposición Vectorial)
              </div>
              <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                E(r₀) = ∑ E_i = ∑ [ 1 / (4πε₀) · ( q_i / r_i² ) ] u_i = ∑ [ k_e · q_i / r_i³ ] (r₀ - r_i)
              </p>
              <p className="text-[11px] text-slate-400">
                Las líneas de campo divergen radialmente de cargas (+) y convergen en cargas (-).
              </p>
            </div>

            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                Potencial Eléctrico (Superposición Escalar)
              </div>
              <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                V(r₀) = ∑ V_i = ∑ [ 1 / (4πε₀) · ( q_i / r_i ) ] = ∑ [ k_e · q_i / r_i ]
              </p>
              <p className="text-[11px] text-slate-400">
                Superposición escalar algebraica directa considerando el signo de cada carga (+ ó -).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Electric Field Card */}
        <div className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Campo Eléctrico Total E
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              [N/C] ó [V/m]
            </span>
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-300">
            {formatPhysicsValue(totalFieldMagnitude, 'N/C', sci, precision)}
          </div>
          <div className="text-xs font-mono text-slate-300 space-y-1 pt-1.5 border-t border-emerald-500/20">
            <div>
              <span className="text-emerald-400/90 font-bold">E_x:</span> {formatPhysicsValue(totalElectricField.x, '', sci, precision)}
            </div>
            <div>
              <span className="text-emerald-400/90 font-bold">E_y:</span> {formatPhysicsValue(totalElectricField.y, '', sci, precision)}
            </div>
            {is3D && (
              <div>
                <span className="text-emerald-400/90 font-bold">E_z:</span> {formatPhysicsValue(totalElectricField.z, '', sci, precision)}
              </div>
            )}
            {!is3D && fieldAngle2D !== undefined && (
              <div className="text-amber-300 pt-0.5 font-semibold">
                <span className="text-slate-400 font-normal">Dirección θ:</span> {fieldAngle2D.toFixed(2)}°
              </div>
            )}
          </div>
        </div>

        {/* Total Electric Potential Card */}
        <div className="bg-gradient-to-br from-cyan-950/50 to-slate-900 border border-cyan-500/40 rounded-xl p-4 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> Potencial Eléctrico Total V
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
              [Voltios V]
            </span>
          </div>
          <div className="text-xl font-extrabold font-mono text-cyan-300">
            {formatPhysicsValue(totalPotential, 'V', sci, precision)}
          </div>
          <div className="text-xs text-slate-300 pt-1.5 border-t border-cyan-500/20 flex items-center gap-2">
            <span className="text-slate-400">Estado:</span>
            <span className={`font-semibold ${totalPotential > 0 ? 'text-rose-400' : totalPotential < 0 ? 'text-blue-400' : 'text-slate-300'}`}>
              {totalPotential > 0 ? '+ Potencial Positivo' : totalPotential < 0 ? '- Potencial Negativo' : '0 Potencial Nulo'}
            </span>
          </div>
        </div>

        {/* Test Point & System Configuration Card */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-xl p-4 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> Punto de Prueba y Cargas
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
              {chargesCalculations.length} Carga{chargesCalculations.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-base font-bold font-mono text-slate-100">
            r₀ = ({tpX.toFixed(3)}, {tpY.toFixed(3)}{is3D ? `, ${tpZ.toFixed(3)}` : ''}) m
          </div>
          <div className="text-xs text-slate-300 pt-1.5 border-t border-indigo-500/20 space-y-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Dimensión:</span>
              <span className="text-indigo-300 font-bold">{settings.dimension}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Unidad base:</span>
              <span className="text-indigo-300 font-bold">
                {settings.chargeUnit === 'e' ? 'Carga elemental (e)' : settings.chargeUnit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Calculation Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 text-slate-300 uppercase tracking-wider font-bold border-b border-slate-800">
            <tr>
              <th className="py-3 px-3.5">Carga</th>
              <th className="py-3 px-3">Posición r_i [m]</th>
              <th className="py-3 px-3">Distancia r_i [m]</th>
              <th className="py-3 px-3">Vector Dirección u_i</th>
              <th className="py-3 px-3">Vector Campo E_i [N/C]</th>
              <th className="py-3 px-3">Magnitud |E_i| [N/C]</th>
              <th className="py-3 px-3">Potencial V_i [V]</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {chargesCalculations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No hay cargas en el sistema. Agrega una carga desde el panel de control o selecciona una actividad.
                </td>
              </tr>
            ) : (
              chargesCalculations.map((calc, idx) => {
                const c = calc.charge;
                const isPos = c.q > 0;
                const isNeg = c.q < 0;

                return (
                  <tr 
                    key={c.id || idx}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Charge Name and Value */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow"
                          style={{ backgroundColor: isPos ? '#ef4444' : isNeg ? '#3b82f6' : '#94a3b8' }}
                        />
                        <span className="font-bold text-slate-200">
                          {c.name || `q${idx + 1}`}
                        </span>
                        <span className={`px-2 py-0.5 text-[11px] rounded-md font-bold ${
                          isPos ? 'bg-red-500/20 text-red-300 border border-red-500/30' : isNeg ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {c.q > 0 ? `+${c.q}` : c.q} {c.unit}
                        </span>
                      </div>
                    </td>

                    {/* Position Vector */}
                    <td className="py-3 px-3 text-slate-200">
                      ({c.x.toFixed(2)}, {c.y.toFixed(2)}{is3D ? `, ${(c.z || 0).toFixed(2)}` : ''})
                    </td>

                    {/* Distance r_i */}
                    <td className="py-3 px-3 text-slate-100 font-bold">
                      {calc.distance.toFixed(4)}
                    </td>

                    {/* Unit Direction Vector */}
                    <td className="py-3 px-3 text-slate-300">
                      ({calc.unitVector.x.toFixed(3)}, {calc.unitVector.y.toFixed(3)}{is3D ? `, ${calc.unitVector.z.toFixed(3)}` : ''})
                    </td>

                    {/* Electric Field Vector */}
                    <td className="py-3 px-3 text-emerald-400 font-medium">
                      ({formatPhysicsValue(calc.electricField.x, '', sci, precision)}, {formatPhysicsValue(calc.electricField.y, '', sci, precision)}{is3D ? `, ${formatPhysicsValue(calc.electricField.z, '', sci, precision)}` : ''})
                    </td>

                    {/* Electric Field Magnitude */}
                    <td className="py-3 px-3 font-bold text-emerald-300">
                      {formatPhysicsValue(calc.fieldMagnitude, '', sci, precision)}
                    </td>

                    {/* Electric Potential */}
                    <td className={`py-3 px-3 font-bold ${
                      calc.potential > 0 ? 'text-rose-400' : calc.potential < 0 ? 'text-cyan-400' : 'text-slate-300'
                    }`}>
                      {formatPhysicsValue(calc.potential, '', sci, precision)}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Total Superposition Summary Row */}
            {chargesCalculations.length > 0 && (
              <tr className="bg-slate-950 font-bold border-t-2 border-indigo-500/50 text-slate-100">
                <td className="py-3.5 px-3.5 flex items-center gap-1.5 text-indigo-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  TOTAL NETO (∑)
                </td>
                <td className="py-3.5 px-3 text-slate-500">—</td>
                <td className="py-3.5 px-3 text-slate-500">—</td>
                <td className="py-3.5 px-3 text-slate-500">—</td>
                <td className="py-3.5 px-3 text-emerald-300">
                  ({formatPhysicsValue(totalElectricField.x, '', sci, precision)}, {formatPhysicsValue(totalElectricField.y, '', sci, precision)}{is3D ? `, ${formatPhysicsValue(totalElectricField.z, '', sci, precision)}` : ''})
                </td>
                <td className="py-3.5 px-3 text-emerald-200 text-sm">
                  {formatPhysicsValue(totalFieldMagnitude, 'N/C', sci, precision)}
                </td>
                <td className={`py-3.5 px-3 text-sm ${
                  totalPotential > 0 ? 'text-rose-300' : totalPotential < 0 ? 'text-cyan-300' : 'text-slate-300'
                }`}>
                  {formatPhysicsValue(totalPotential, 'V', sci, precision)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
