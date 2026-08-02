/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ComponentType = 'source' | 'resistor' | 'capacitor' | 'switch' | 'ammeter';

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  angle: number; // Rotation in degrees (0, 90, 180, 270)
  
  // Electrical Parameters
  voltage?: number;       // For power source [V]
  resistance?: number;    // For resistor [Ω]
  capacitance?: number;   // For capacitor [F]
  isOhmic?: boolean;      // For resistors (Ohmic vs Non-Ohmic Lightbulb)
  isOpen?: boolean;       // For switch (true = Open, false = Closed)
  
  // Thermal/State dynamics
  tempResistance?: number; // Current dynamic resistance of non-ohmic bulb
  charge?: number;        // Current charge of capacitor [Coulombs]
  voltageCapacitor?: number; // Previous capacitor voltage [V] (used for numeric integration)
  
  // Fail-safes
  nominalVoltage: number; // Max safe voltage [V]
  failed: boolean;        // Whether the component has burned out due to overvoltage
  failureType?: 'open' | 'short'; // Failure mode
}

export interface Terminal {
  id: string;
  componentId: string;
  type: 'positive' | 'negative' | 'terminal_a' | 'terminal_b';
  label: string; // '+' or '-' or 'A' or 'B'
  // Relative position to component center (before rotation)
  relX: number;
  relY: number;
}

export interface Wire {
  id: string;
  fromTerminalId: string; // e.g., "comp1_term_a"
  toTerminalId: string;
  pathPoints?: ElementPosition[];
  customColor?: 'auto' | 'red' | 'black' | 'blue' | 'green' | 'yellow';
}

export interface ElementPosition {
  x: number;
  y: number;
}

export interface VoltmeterProbe {
  x: number;
  y: number;
  dragging: boolean;
  snappedTerminalId: string | null;
}

export interface DataPoint {
  time: number;
  measuredV: number;
  measuredI: number;
  theoreticalV?: number;
  theoreticalI?: number;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  setup: () => {
    components: CircuitComponent[];
    wires: Wire[];
  };
}
