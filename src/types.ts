/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChargeUnit = 'e' | 'uC' | 'nC' | 'C';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PointCharge {
  id: string;
  name: string; // e.g. "q1", "q2"
  x: number; // in meters [m]
  y: number; // in meters [m]
  z: number; // in meters [m] (0 for 2D mode)
  q: number; // charge magnitude in selected display unit (e.g. +1, -1, +2, etc.)
  unit: ChargeUnit; // unit of charge ('e' = elementary charge, 'uC' = microcoulomb, etc.)
  color?: string; // custom display color if needed
  locked?: boolean;
}

export interface TestPoint {
  x: number; // in meters [m]
  y: number; // in meters [m]
  z: number; // in meters [m]
}

export interface ChargeCalculation {
  charge: PointCharge;
  qInCoulombs: number;
  relPos: Vector3D; // r_0 - r_i
  distance: number; // ||r_0 - r_i|| in meters
  unitVector: Vector3D; // r_hat
  electricField: Vector3D; // E_i in N/C or V/m
  fieldMagnitude: number; // ||E_i|| in N/C
  potential: number; // V_i in Volts [V]
}

export interface TotalCalculation {
  testPoint: TestPoint;
  chargesCalculations: ChargeCalculation[];
  totalElectricField: Vector3D; // E_total in N/C
  totalFieldMagnitude: number; // ||E_total|| in N/C
  fieldAngle2D?: number; // angle in degrees for 2D
  totalPotential: number; // V_total in Volts [V]
}

export interface SimulationSettings {
  dimension: '2D' | '3D';
  showFieldLines: boolean;
  showVectorGrid: boolean;
  showEquipotentials: boolean;
  showIndividualVectors: boolean;
  showTotalVector: boolean;
  showGrid: boolean;
  showLabels: boolean;
  fieldLinesCount: number;
  vectorGridDensity: number;
  vectorScale: number;
  chargeUnit: ChargeUnit;
  coordinateRange: number; // Default 1.0 meter (range -1.0 to +1.0)
  precisionDigits: number; // Default 4 significant/decimal digits
  scientificNotation: boolean;
}

export interface LabPreset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  activityNumber?: number;
  dimension: '2D' | '3D';
  charges: PointCharge[];
  testPoint: TestPoint;
  chargeUnit: ChargeUnit;
  coordinateRange: number;
}
