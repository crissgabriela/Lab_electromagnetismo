# Simulador Interactivo de Campo Eléctrico y Potencial Eléctrico (2D & 3D)

Simulador interactivo para el estudio y visualización del **Campo Eléctrico** ($\vec{E}$) y **Potencial Eléctrico** ($V$) generado por distribuciones de cargas puntuales personalizables en 2D y 3D. Diseñado como material pedagógico de apoyo para el **Laboratorio N° 1 de Electricidad y Magnetismo** (Universidad de Talca).

---

## ⚡ Características Principales

1. **Entornos 2D y 3D**:
   - **Modo 2D**: Canvas interactivo con arrastre fluido de cargas y del punto de prueba $P(r_0)$, líneas de campo eléctrico continuas, mapa de equipotenciales con gradiente de color y flechas vectoriales.
   - **Modo 3D**: Renderizado tridimensional con Three.js, esferas de carga iluminadas (+ rojo, - azul), flechas vectoriales 3D en el punto de prueba y controles de órbita (rotar, zoom, desplazar).
2. **Cálculo Analítico Desglosado Paso a Paso**:
   - Tabla de superposición con desglose por carga: vector posición $\vec{r}_i$, distancia $r_i$, vector unitario $\hat{r}_i$, componentes $(E_{ix}, E_{iy}, E_{iz})$, magnitud $|\vec{E}_i|$ y potencial $V_i$.
   - Fila resumen de superposición total: vector $\vec{E}_{total}$, magnitud $|\vec{E}_{total}|$, ángulo $\theta$ y potencial total $V_{total}$.
   - Exportación de resultados a **CSV** y copiado rápido de resumen.
3. **Presets del Laboratorio N° 1**:
   - **Actividad 1**: Cargas de magnitud $|e|$ en coordenadas de la guía para calcular $\vec{E}_{total}$ en $(0,0)$.
   - **Actividad 2**: Cargas de magnitudes $|e|$, $|2e|$ y $|4e|$ para calcular $V_{total}$ en $(0,0)$.
   - Dipolos, cuadrupolos y configuración libre 3D.
4. **Unidades de Medida Flexibles**:
   - Soporte para carga elemental ($e = 1.602 \times 10^{-19}\text{ C}$), microcoulombs ($\mu\text{C}$), nanocoulombs ($\text{nC}$) y Coulombs ($\text{C}$).
   - Alternancia entre notación científica ($10^n$) y decimal estándar.

---

## 📐 Marco Teórico y Ecuaciones

- **Constante de Coulomb**:
  $$k_e = \frac{1}{4\pi\varepsilon_0} \approx 8.98755 \times 10^9 \text{ N}\cdot\text{m}^2/\text{C}^2$$

- **Campo Eléctrico en el Punto de Prueba $\vec{r}_0$**:
  $$\vec{E}(\vec{r}_0) = \sum_{i=1}^N \frac{1}{4\pi\varepsilon_0} \frac{q_i}{r_i^2} \hat{r}_i = \sum_{i=1}^N k_e \frac{q_i}{r_i^3} (\vec{r}_0 - \vec{r}_i)$$

- **Potencial Eléctrico en el Punto de Prueba $\vec{r}_0$**:
  $$V(\vec{r}_0) = \sum_{i=1}^N \frac{1}{4\pi\varepsilon_0} \frac{q_i}{r_i} = \sum_{i=1}^N k_e \frac{q_i}{r_i}$$

---

## 🚀 Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Compilar para producción:
   ```bash
   npm run build
   ```

---

## 🌐 Despliegue en Vercel

Este proyecto está listo para ser desplegado en **Vercel**:

1. Conecta tu repositorio de GitHub (`crissgabriela/Lab_electromagnetismo`) en [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Haz clic en **Deploy**.

---

## 🛠️ Tecnologías

- **React 19** + **TypeScript**
- **Vite**
- **Three.js** (Renderizado 3D y OrbitControls)
- **HTML5 Canvas** (Trazado de líneas de campo y equipotenciales en 2D)
- **Tailwind CSS**
- **Lucide Icons**
