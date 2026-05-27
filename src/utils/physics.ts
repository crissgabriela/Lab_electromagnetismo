/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CircuitComponent, Wire } from '../types';

export interface SolvedNode {
  index: number;
  voltage: number;
}

export interface SolvedCircuit {
  componentCurrents: Record<string, number>; // current flowing from primary to secondary terminal
  terminalVoltages: Record<string, number>;  // terminalId -> absolute voltage
  warnings: string[];
  updatedComponents: CircuitComponent[];
}

/**
 * Solves the circuit using standard Nodal Analysis with Norton equivalents.
 * Supports Ohmic/Non-ohmic resistors, voltage sources, binary switches,
 * electrolytic capacitors (with transient companion model), and ammeters.
 */
export function solveCircuit(
  components: CircuitComponent[],
  wires: Wire[],
  dt: number // time step in seconds
): SolvedCircuit {
  const warnings: string[] = [];
  
  // 1. Define terminals for each component
  // Each component has predefined terminals. Let's list their terminal IDs:
  // - source: "comp_pos" (positive, high), "comp_neg" (negative, low)
  // - resistor: "comp_term_a", "comp_term_b"
  // - capacitor: "comp_pos" (positive, has longer leg (+)), "comp_neg" (negative, shorter (-) with grey bar)
  // - switch: "comp_term_a", "comp_term_b"
  // - ammeter: "comp_term_a", "comp_term_b"
  
  const getTerminals = (c: CircuitComponent) => {
    switch (c.type) {
      case 'source':
        return [
          { id: `${c.id}_pos`, componentId: c.id, role: 'pos' },
          { id: `${c.id}_neg`, componentId: c.id, role: 'neg' }
        ];
      case 'capacitor':
        return [
          { id: `${c.id}_pos`, componentId: c.id, role: 'pos' },
          { id: `${c.id}_neg`, componentId: c.id, role: 'neg' }
        ];
      default:
        return [
          { id: `${c.id}_a`, componentId: c.id, role: 'a' },
          { id: `${c.id}_b`, componentId: c.id, role: 'b' }
        ];
    }
  };

  const allTerminals: string[] = [];
  const terminalToComponent: Record<string, string> = {};
  
  components.forEach(c => {
    const terminals = getTerminals(c);
    terminals.forEach(t => {
      allTerminals.push(t.id);
      terminalToComponent[t.id] = c.id;
    });
  });

  // 2. Union-Find or DFS to group terminals into unique electrical nodes
  const parent: Record<string, string> = {};
  allTerminals.forEach(t => {
    parent[t] = t;
  });

  const find = (t: string): string => {
    if (parent[t] === t) return t;
    parent[t] = find(parent[t]);
    return parent[t];
  };

  const union = (t1: string, t2: string) => {
    const root1 = find(t1);
    const root2 = find(t2);
    if (root1 !== root2) {
      parent[root1] = root2;
    }
  };

  // Connect terminals joined by wires
  wires.forEach(w => {
    // Only union if both terminals exist in current active list
    if (allTerminals.includes(w.fromTerminalId) && allTerminals.includes(w.toTerminalId)) {
      union(w.fromTerminalId, w.toTerminalId);
    }
  });

  // Collect unique roots. Each root represents a global electrical node.
  const roots = Array.from(new Set(allTerminals.map(t => find(t))));
  const nodeCount = roots.length;

  if (nodeCount === 0) {
    return {
      componentCurrents: {},
      terminalVoltages: {},
      warnings: [],
      updatedComponents: [...components]
    };
  }

  // Map root node ID -> integer index (0 to nodeCount - 1)
  const nodeToIndex: Record<string, number> = {};
  roots.forEach((root, idx) => {
    nodeToIndex[root] = idx;
  });

  const getTerminalNodeIndex = (terminalId: string): number => {
    const root = find(terminalId);
    return nodeToIndex[root];
  };

  // We need to pick a ground node (reference potential V = 0V).
  // Ideally, the negative terminal of the first active voltage source,
  // or just node index 0 if no sources exist.
  let groundNodeIndex = 0;
  const firstSource = components.find(c => c.type === 'source' && !c.failed);
  if (firstSource) {
    groundNodeIndex = getTerminalNodeIndex(`${firstSource.id}_neg`);
  }

  // 3. Setup Nodal Analysis equations: G_matrix * V = I_vector
  // Since node 0 is fixed at 0V, we keep equations for all nodeCount nodes,
  // but explicitly overwrite equation groundNodeIndex to enforce V[groundNodeIndex] = 0.
  const G = Array.from({ length: nodeCount }, () => new Float64Array(nodeCount));
  const I_vec = new Float64Array(nodeCount);

  // We can add conductances between two node indices
  const addConductance = (node1: number, node2: number, value: number) => {
    if (isNaN(value) || !isFinite(value)) return;
    G[node1][node1] += value;
    G[node2][node2] += value;
    G[node1][node2] -= value;
    G[node2][node1] -= value;
  };

  // We can inject current into node1 and extract it from node2 (current flows node2 -> node1)
  const injectCurrent = (nodeInto: number, nodeFrom: number, amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) return;
    I_vec[nodeInto] += amount;
    I_vec[nodeFrom] -= amount;
  };

  // 4. Fill in equations based on each active component
  // We model components as conductances & parallel current sources (Norton)
  const tempComponents: CircuitComponent[] = components.map(c => ({ ...c }));

  tempComponents.forEach(c => {
    if (c.failed) {
      // Failed component acts as an open circuit (or fuse blown)
      const nA = getTerminalNodeIndex(c.type === 'source' || c.type === 'capacitor' ? `${c.id}_pos` : `${c.id}_a`);
      const nB = getTerminalNodeIndex(c.type === 'source' || c.type === 'capacitor' ? `${c.id}_neg` : `${c.id}_b`);
      if (c.failureType === 'short') {
        addConductance(nA, nB, 1.0); // 1 Ohm leak short
      } else {
        addConductance(nA, nB, 1e-12); // Near perfect open
      }
      return;
    }

    switch (c.type) {
      case 'source': {
        const nPos = getTerminalNodeIndex(`${c.id}_pos`);
        const nNeg = getTerminalNodeIndex(`${c.id}_neg`);
        
        // Voltage source modeled as Rs = 0.1 Ω in series with ideal source.
        // Norton equivalent: Gs = 10 S, current source Is = Vs / Rs flowing Neg -> Pos
        const R_src = 0.1; // Internal resistance
        const G_src = 1 / R_src;
        const V_val = c.voltage ?? 12;
        const I_src = V_val / R_src;
        
        addConductance(nPos, nNeg, G_src);
        injectCurrent(nPos, nNeg, I_src);
        break;
      }

      case 'resistor': {
        const nA = getTerminalNodeIndex(`${c.id}_a`);
        const nB = getTerminalNodeIndex(`${c.id}_b`);
        
        let rVal = c.resistance ?? 100;
        
        if (!c.isOhmic) {
          // Non-ohmic filament: resistance increases with current.
          // We use tempResistance which was initialized or computed in previous step,
          // smoothing is done after finding current.
          rVal = c.tempResistance ?? rVal;
        }

        addConductance(nA, nB, 1 / rVal);
        break;
      }

      case 'capacitor': {
        const nPos = getTerminalNodeIndex(`${c.id}_pos`);
        const nNeg = getTerminalNodeIndex(`${c.id}_neg`);
        
        const C_val = c.capacitance ?? 0.01; // e.g. 10 mF
        
        // Companion Euler Backward model:
        // G_eq = C / dt
        // Current source I_eq = G_eq * V_cap_prev flowing from Pos (+) to Neg (-)
        // Injected Into Neg (+ amount), Extracted from Pos (- amount)
        const G_eq = C_val / dt;
        const V_prev = c.voltageCapacitor ?? 0;
        const I_eq = G_eq * V_prev;

        addConductance(nPos, nNeg, G_eq);
        injectCurrent(nNeg, nPos, I_eq); 
        break;
      }

      case 'switch': {
        const nA = getTerminalNodeIndex(`${c.id}_a`);
        const nB = getTerminalNodeIndex(`${c.id}_b`);
        
        const rSwitch = c.isOpen ? 1e10 : 1e-3; // 10 GΩ (open) vs 1 mΩ (closed)
        addConductance(nA, nB, 1 / rSwitch);
        break;
      }

      case 'ammeter': {
        const nA = getTerminalNodeIndex(`${c.id}_a`);
        const nB = getTerminalNodeIndex(`${c.id}_b`);
        
        // Ammeter modeled as extremely low resistance link: 1 mΩ
        addConductance(nA, nB, 1 / 1e-3);
        break;
      }
    }
  });

  // 5. Impose Ground node constraint (V_ground = 0)
  // We rewrite G[groundNodeIndex] row to: G[ground][ground] = 1, all other columns = 0. And I_vec[ground] = 0.
  for (let col = 0; col < nodeCount; col++) {
    G[groundNodeIndex][col] = (col === groundNodeIndex) ? 1.0 : 0.0;
  }
  I_vec[groundNodeIndex] = 0.0;

  // 6. Realize Linear Solver (Gaussian Elimination with partial pivoting)
  const nodeVoltages = new Float64Array(nodeCount);
  
  // Create augmented matrix [G | I_vec]
  const M = Array.from({ length: nodeCount }, (_, r) => {
    const row = new Float64Array(nodeCount + 1);
    row.set(G[r]);
    row[nodeCount] = I_vec[r];
    return row;
  });

  // Gaussian elimination
  for (let i = 0; i < nodeCount; i++) {
    // Find pivot row
    let maxRow = i;
    for (let r = i + 1; r < nodeCount; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[maxRow][i])) {
        maxRow = r;
      }
    }

    // Swap row
    if (maxRow !== i) {
      const temp = M[i];
      M[i] = M[maxRow];
      M[maxRow] = temp;
    }

    // Check singular
    if (Math.abs(M[i][i]) < 1e-15) {
      // Singular node - isolate it by setting its voltage to 0
      M[i][i] = 1.0;
      for (let j = 0; j < nodeCount; j++) {
        if (j !== i) M[i][j] = 0.0;
      }
      M[i][nodeCount] = 0.0;
    }

    // Eliminate below
    for (let r = i + 1; r < nodeCount; r++) {
      const factor = M[r][i] / M[i][i];
      for (let c = i; c <= nodeCount; c++) {
        M[r][c] -= factor * M[i][c];
      }
    }
  }

  // Back substitution
  for (let i = nodeCount - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < nodeCount; j++) {
      sum += M[i][j] * nodeVoltages[j];
    }
    nodeVoltages[i] = (M[i][nodeCount] - sum) / M[i][i];
  }

  // 7. Calculate terminal absolute voltages
  const terminalVoltages: Record<string, number> = {};
  allTerminals.forEach(tId => {
    const nodeIdx = getTerminalNodeIndex(tId);
    terminalVoltages[tId] = isNaN(nodeVoltages[nodeIdx]) ? 0 : nodeVoltages[nodeIdx];
  });

  // 8. Calculate currents and update transient parameters
  const componentCurrents: Record<string, number> = {};

  const nextComponents: CircuitComponent[] = tempComponents.map(c => {
    if (c.failed) {
      componentCurrents[c.id] = 0;
      return c;
    }

    switch (c.type) {
      case 'source': {
        const vPos = terminalVoltages[`${c.id}_pos`];
        const vNeg = terminalVoltages[`${c.id}_neg`];
        const vSource = c.voltage ?? 12;
        // Current leaving positive terminal
        const R_src = 0.1;
        const current = (vSource - (vPos - vNeg)) / R_src;
        
        componentCurrents[c.id] = current;
        
        // Safety check for overvoltage: Sources themselves rarely fail due to overvoltage in simple DC simulation,
        // but let's check if the source is being short circuited (extremely high current).
        if (Math.abs(current) > 200) {
          warnings.push(`¡Cortocircuito en Fuente de Poder ${c.id}! El fusible de seguridad de la red virtual se disparó.`);
          c.failed = true;
          c.failureType = 'open';
        }
        break;
      }

      case 'resistor': {
        const vA = terminalVoltages[`${c.id}_a`];
        const vB = terminalVoltages[`${c.id}_b`];
        const vDiff = vA - vB;
        
        let rVal = c.resistance ?? 100;
        
        if (!c.isOhmic) {
          // Warm bulb non-ohmic resistance update based on current power.
          // R = R_base * (1 + alpha * I^2)
          const current = vDiff / (c.tempResistance ?? rVal);
          componentCurrents[c.id] = current;
          
          const alpha = 0.8; // Thermal resistance factor
          const targetR = rVal * (1 + alpha * Math.pow(current, 2));
          // Apply heat smoothing (thermal mass inertia)
          const lambda = 0.15; // Speed of thermal transition
          c.tempResistance = (c.tempResistance ?? rVal) + (targetR - (c.tempResistance ?? rVal)) * lambda;
          
          // Overvoltage check
          if (Math.abs(vDiff) > c.nominalVoltage) {
            warnings.push(`¡Falla de componente! Se excedió el voltaje nominal de la ampolleta (${c.nominalVoltage}V). El filamento se fundió.`);
            c.failed = true;
            c.failureType = 'open';
          }
        } else {
          // Standard Ohmic Resistor
          const current = vDiff / rVal;
          componentCurrents[c.id] = current;
          
          // Overvoltage check
          if (Math.abs(vDiff) > c.nominalVoltage) {
            warnings.push(`¡Sobrecarga en Resistencia! El voltaje excedió el voltaje máximo de seguridad (${c.nominalVoltage}V). Resistencia abierta.`);
            c.failed = true;
            c.failureType = 'open';
          }
        }
        break;
      }

      case 'capacitor': {
        const vPos = terminalVoltages[`${c.id}_pos`];
        const vNeg = terminalVoltages[`${c.id}_neg`];
        const vDiff = vPos - vNeg;
        
        const C_val = c.capacitance ?? 0.01;
        const G_eq = C_val / dt;
        const I_eq = G_eq * (c.voltageCapacitor ?? 0);
        
        // Net charging current flowing (+) to (-)
        const current = G_eq * vDiff - I_eq;
        componentCurrents[c.id] = current;
        
        // Save current capacitor voltage for next tick
        c.voltageCapacitor = vDiff;
        // Q = C * V
        c.charge = C_val * vDiff;

        // Rev polarity check warning
        if (vDiff < -0.05) {
          // Reverse bias capacitor risk
          if (!warnings.some(w => w.includes('Daño Grave Electrolítico'))) {
            warnings.push(`* Riesgo de daño en componente real * Condensador electrolítico polarizado de forma inversa (Terminal largo(+) a un potencial menor que el (-)).`);
          }
        }

        // Overvoltage failure check
        if (vDiff > c.nominalVoltage) {
          warnings.push(`¡Ruptura dieléctrica en Capacitor! El voltaje superó el límite de diseño de ${c.nominalVoltage}V. El capacitor explotó.`);
          c.failed = true;
          c.failureType = 'short'; // Fails as a short/leak
          c.voltageCapacitor = 0;
          c.charge = 0;
        }
        break;
      }

      case 'switch': {
        const vA = terminalVoltages[`${c.id}_a`];
        const vB = terminalVoltages[`${c.id}_b`];
        const vDiff = vA - vB;
        const rSwitch = c.isOpen ? 1e10 : 1e-3;
        const current = vDiff / rSwitch;
        componentCurrents[c.id] = current;
        
        // Overvoltage static spark check
        if (c.isOpen && Math.abs(vDiff) > c.nominalVoltage) {
          warnings.push(`¡Arco eléctrico! Voltaje en vacío de ${Math.round(vDiff)}V fundió los terminales de contacto del Interruptor.`);
          c.failed = true;
          c.failureType = 'short'; // Fails short-circuited/welded
        }
        break;
      }

      case 'ammeter': {
        const vA = terminalVoltages[`${c.id}_a`];
        const vB = terminalVoltages[`${c.id}_b`];
        const current = (vA - vB) / 1e-3;
        componentCurrents[c.id] = current;
        
        // Ammeters usually have an internal fuse.
        // If the current exceeds a nominal limit (say 20 Amps), the fuse blows!
        if (Math.abs(current) > c.nominalVoltage) {
          warnings.push(`¡Fusible quemado en Amperímetro! Se superó el límite de medición máximo de ${c.nominalVoltage}A.`);
          c.failed = true;
          c.failureType = 'open';
        }
        break;
      }
    }

    return c;
  });

  return {
    componentCurrents,
    terminalVoltages,
    warnings,
    updatedComponents: nextComponents
  };
}

/**
 * Generates theoretical discharge profile for general RC circuit
 * VC(t) = V0 * e^(-t / RC)
 */
export function calculateTheoreticalDischarge(
  V0: number,
  R: number,
  C: number,
  t: number
): number {
  return V0 * Math.exp(-t / (R * C));
}

/**
 * Generates theoretical charging profile for general RC circuit
 * VC(t) = V0 * (1 - e^(-t / RC))
 */
export function calculateTheoreticalCharge(
  V0: number,
  R: number,
  C: number,
  t: number
): number {
  return V0 * (1 - Math.exp(-t / (R * C)));
}
