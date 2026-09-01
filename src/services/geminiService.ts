/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { TotalCalculation, PointCharge, TestPoint } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

/**
 * Builds physical context string for the AI prompt
 */
function buildPhysicalContext(
  calculation: TotalCalculation,
  charges: PointCharge[],
  testPoint: TestPoint,
  activePresetTitle?: string
): string {
  const chargesSummary = charges
    .map(
      (c, i) =>
        `- Carga ${c.name || `q${i + 1}`}: valor = ${c.q > 0 ? `+${c.q}` : c.q} ${c.unit}, posición = (${c.x}, ${c.y}, ${c.z || 0}) m`
    )
    .join('\n');

  const detailedRows = calculation.chargesCalculations
    .map(
      (calc, i) =>
        `  * ${calc.charge.name || `q${i + 1}`}: dist r = ${calc.distance.toFixed(4)} m, vector unitario r_hat = (${calc.unitVector.x.toFixed(3)}, ${calc.unitVector.y.toFixed(3)}, ${calc.unitVector.z.toFixed(3)}), campo E = (${calc.electricField.x.toExponential(3)}, ${calc.electricField.y.toExponential(3)}, ${calc.electricField.z.toExponential(3)}) N/C, potencial V = ${calc.potential.toFixed(3)} V`
    )
    .join('\n');

  return `
[ESTADO ACTUAL DEL SIMULADOR]
- Actividad / Preset Activo: ${activePresetTitle || 'Personalizado'}
- Punto de Prueba r₀: (${testPoint.x.toFixed(3)}, ${testPoint.y.toFixed(3)}, ${testPoint.z.toFixed(3)}) m
- Cargas en el sistema:
${chargesSummary}
- Desglose por Carga:
${detailedRows}
- RESULTADOS TOTALES NETOS:
  * Campo Eléctrico Total E_total = (${calculation.totalElectricField.x.toExponential(3)}, ${calculation.totalElectricField.y.toExponential(3)}, ${calculation.totalElectricField.z.toExponential(3)}) N/C
  * Magnitud Total |E_total| = ${calculation.totalFieldMagnitude.toExponential(3)} N/C
  * Ángulo 2D = ${calculation.fieldAngle2D !== undefined ? calculation.fieldAngle2D.toFixed(2) + '°' : 'N/A'}
  * Potencial Eléctrico Total V_total = ${calculation.totalPotential.toFixed(3)} V
`.trim();
}

/**
 * Sends a question to Gemini AI Tutor with physical context injection
 */
export async function askGeminiTutor(
  userQuery: string,
  calculation: TotalCalculation,
  charges: PointCharge[],
  testPoint: TestPoint,
  activePresetTitle?: string,
  apiKeyOverride?: string
): Promise<string> {
  const apiKey =
    apiKeyOverride ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    '';

  const systemInstruction = `
Eres el Profesor y Tutor Virtual de Física del "Laboratorio N° 1: Campo Eléctrico y Potencial Eléctrico" de la Universidad de Talca.
Tu objetivo es guiar pedagógicamente a los estudiantes de ingeniería y ciencias en el análisis de campos eléctricos vectoriales (ley de Coulomb) y potenciales eléctricos escalares.

Directrices pedagógicas:
1. Explica los conceptos con rigor físico y claridad pedagógica (en español).
2. Usa las ecuaciones oficiales del laboratorio:
   - Campo eléctrico: E⃗ = (1 / 4πε₀) · (q / r²) r̂ = kₑ · q / r³ · (r⃗₀ - r⃗ᵢ)
   - Potencial eléctrico: V = (1 / 4πε₀) · (q / r) = kₑ · q / r
   - Superposición: E⃗_total = ∑ E⃗ᵢ, V_total = ∑ Vᵢ
3. Haz referencia explícita a los valores actuales del simulador que te son proporcionados en el contexto (posiciones, distancias, componentes vectoriales y potencial).
4. Sé motivador, conciso y estructurado (usa viñetas o pasos cuando expliques resolución de ejercicios).
`.trim();

  const contextData = buildPhysicalContext(calculation, charges, testPoint, activePresetTitle);
  const prompt = `${contextData}\n\n[PREGUNTA DEL ESTUDIANTE]:\n${userQuery}`;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Return a built-in intelligent physical tutor response if no API key is set yet
    return generateFallbackTutorResponse(userQuery, calculation, charges, testPoint, activePresetTitle);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    if (response && response.text) {
      return response.text;
    }
    return generateFallbackTutorResponse(userQuery, calculation, charges, testPoint, activePresetTitle);
  } catch (error) {
    console.warn('Gemini API call failed, using built-in physics tutor engine:', error);
    return generateFallbackTutorResponse(userQuery, calculation, charges, testPoint, activePresetTitle);
  }
}

/**
 * Intelligent built-in physics explanation generator when offline / no API key configured.
 */
function generateFallbackTutorResponse(
  query: string,
  calculation: TotalCalculation,
  charges: PointCharge[],
  testPoint: TestPoint,
  activePresetTitle?: string
): string {
  const qLower = query.toLowerCase();

  if (qLower.includes('actividad 1') || qLower.includes('campo') || qLower.includes('vector')) {
    return `### ⚡ Explicación del Campo Eléctrico (Actividad 1)

En el punto de prueba **r₀ = (${testPoint.x.toFixed(2)}, ${testPoint.y.toFixed(2)}) m**, el campo eléctrico total se calcula aplicando el **Principio de Superposición Vectorial**:

$$\\vec{E}_{total} = \\sum_{i=1}^{N} \\vec{E}_i = \\sum_{i=1}^{N} \\frac{1}{4\\pi\\varepsilon_0} \\frac{q_i}{r_i^2} \\hat{r}_i$$

1. **Distancia y Dirección**: Para cada carga $q_i$, calculamos la distancia $r_i = ||\\vec{r}_0 - \\vec{r}_i||$ y el vector unitario $\\hat{r}_i = \\frac{\\vec{r}_0 - \\vec{r}_i}{r_i}$.
2. **Cargas Positivas vs Negativas**:
   - Para cargas positivas ($+q$), $\\vec{E}$ apunta **alejándose** de la carga.
   - Para cargas negativas ($-q$), $\\vec{E}$ apunta **hacia** la carga.
3. **Resultado Actual**:
   - $\\vec{E}_{total} = (${calculation.totalElectricField.x.toExponential(3)}, ${calculation.totalElectricField.y.toExponential(3)})\\text{ N/C}$
   - Magnitud: **${calculation.totalFieldMagnitude.toExponential(3)} N/C**
   - Ángulo: **${calculation.fieldAngle2D?.toFixed(2)}°**`;
  }

  if (qLower.includes('actividad 2') || qLower.includes('potencial') || qLower.includes('volt')) {
    return `### 🌐 Explicación del Potencial Eléctrico (Actividad 2)

El potencial eléctrico $V$ es una **magnitud escalar** (no tiene dirección, solo magnitud con signo algebraico):

$$V(\\vec{r}_0) = \\sum_{i=1}^{N} V_i = \\sum_{i=1}^{N} \\frac{1}{4\\pi\\varepsilon_0} \\frac{q_i}{r_i}$$

1. **Suma Escalar Directa**: No requiere descomposición en componentes $x, y, z$. Se suman directamente los valores considerando el signo de cada carga (+ ó -).
2. **Resultado en el punto r₀ = (${testPoint.x.toFixed(2)}, ${testPoint.y.toFixed(2)}) m**:
   - Potencial total: **${calculation.totalPotential.toFixed(4)} Voltios [V]**
   - Estado: ${
     calculation.totalPotential > 0
       ? 'Predominan las cargas positivas (energía potencial positiva para carga de prueba positiva).'
       : calculation.totalPotential < 0
       ? 'Predominan las cargas negativas (trabajo positivo para alejar una carga positiva).'
       : 'Potencial nulo (equilibrio escalar).'
   }`;
  }

  if (qLower.includes('linea') || qLower.includes('lineas') || qLower.includes('equipotencial')) {
    return `### 🌀 Líneas de Campo y Superficies Equipotenciales

1. **Líneas de Campo Eléctrico**:
   - Representan la trayectoria tangente al vector campo $\\vec{E}$ en cada punto del espacio.
   - Nacen en las cargas positivas ($+$) y mueren en las cargas negativas ($-$) o en el infinito.
   - Su densidad visual indica la intensidad del campo: donde están más juntas, el campo es más intenso.
2. **Superficies Equipotenciales**:
   - Son los lugares geométricos donde el potencial $V$ tiene el mismo valor constante.
   - **Propiedad fundamental**: Las líneas de campo siempre son **perpendiculares (ortogonales)** a las superficies equipotenciales.`;
  }

  // General response
  return `### 👨‍🏫 Tutor de Laboratorio N° 1

Actualmente en el sistema tienes **${charges.length} cargas** evaluadas en **r₀ = (${testPoint.x.toFixed(2)}, ${testPoint.y.toFixed(2)}) m**:

- **Campo Eléctrico Neto**: $|\\vec{E}| = ${calculation.totalFieldMagnitude.toExponential(3)}\\text{ N/C}$
- **Potencial Eléctrico Neto**: $V = ${calculation.totalPotential.toFixed(3)}\\text{ V}$

Puedes preguntarme:
- *"¿Cómo desgloso el vector unitario $\\hat{r}$ de $q_1$?"*
- *"¿Por qué el campo eléctrico es inversamente proporcional a $r^2$ y el potencial a $r$?"*
- *"Explica la Actividad 1 o Actividad 2 de la guía"*`;
}
