/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointCharge, TestPoint, SimulationSettings, TotalCalculation } from '../types';
import { calculateElectricFieldAt, formatPhysicsValue } from '../utils/physics';
import { RotateCcw, Box, Eye, Sparkles, Crosshair } from 'lucide-react';

interface Simulator3DProps {
  charges: PointCharge[];
  testPoint: TestPoint;
  settings: SimulationSettings;
  calculation: TotalCalculation;
  onUpdateTestPointPos: (x: number, y: number, z: number) => void;
  onSelectCharge?: (id: string | null) => void;
  selectedChargeId?: string | null;
}

export const Simulator3D: React.FC<Simulator3DProps> = ({
  charges,
  testPoint,
  settings,
  calculation,
  onUpdateTestPointPos,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e); // Sleek dark slate

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.8, 2.4, 3.2);
    cameraRef.current = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 12;
    controls.minDistance = 0.8;
    controlsRef.current = controls;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-5, -3, -5);
    scene.add(dirLight2);

    // 5. Grid Helper & Axes
    if (settings.showGrid) {
      const gridHelper = new THREE.GridHelper(4, 16, 0x475569, 0x1e293b);
      gridHelper.position.y = -0.001;
      scene.add(gridHelper);

      // Coordinate axes
      const axesHelper = new THREE.AxesHelper(1.5);
      scene.add(axesHelper);
    }

    // 6. Charge Meshes & Lights
    const chargeGroup = new THREE.Group();
    charges.forEach((c) => {
      const isPos = c.q > 0;
      const isNeg = c.q < 0;
      const color = isPos ? 0xef4444 : isNeg ? 0x3b82f6 : 0x64748b;
      const emissive = isPos ? 0xdc2626 : isNeg ? 0x2563eb : 0x334155;

      const radius = 0.09 + Math.min(0.06, Math.abs(c.q) * 0.02);

      // Sphere Geometry
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: emissive,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.4,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(c.x, c.y, c.z || 0);
      chargeGroup.add(mesh);

      // Outer glow shell
      const glowGeo = new THREE.SphereGeometry(radius * 1.35, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.set(c.x, c.y, c.z || 0);
      chargeGroup.add(glowMesh);

      // Small point light for physical illumination
      const pLight = new THREE.PointLight(color, 0.8, 1.8);
      pLight.position.set(c.x, c.y, c.z || 0);
      chargeGroup.add(pLight);
    });
    scene.add(chargeGroup);

    // 7. Test Point Mesh
    const testPointGroup = new THREE.Group();
    const tpPos = new THREE.Vector3(testPoint.x, testPoint.y, testPoint.z || 0);

    const tpGeo = new THREE.SphereGeometry(0.065, 24, 24);
    const tpMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.1,
      metalness: 0.8,
    });
    const tpMesh = new THREE.Mesh(tpGeo, tpMat);
    tpMesh.position.copy(tpPos);
    testPointGroup.add(tpMesh);

    // Orbiting target ring around test point
    const ringGeo = new THREE.TorusGeometry(0.12, 0.008, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(tpPos);
    ringMesh.rotation.x = Math.PI / 2;
    testPointGroup.add(ringMesh);

    scene.add(testPointGroup);

    // 8. Total Electric Field 3D Vector Arrow at Test Point
    if (settings.showTotalVector && calculation.totalFieldMagnitude > 1e-12) {
      const totE = calculation.totalElectricField;
      const dir = new THREE.Vector3(totE.x, totE.y, totE.z).normalize();
      const length = Math.min(1.4, Math.max(0.35, Math.log10(calculation.totalFieldMagnitude + 1) * 0.25));

      const arrowHelper = new THREE.ArrowHelper(
        dir,
        tpPos,
        length,
        0x10b981, // Emerald Green
        0.18,
        0.09
      );
      arrowHelper.line.material.linewidth = 4;
      scene.add(arrowHelper);
    }

    // 9. Individual Vectors at Test Point
    if (settings.showIndividualVectors && calculation.chargesCalculations.length > 0) {
      calculation.chargesCalculations.forEach((calc) => {
        if (calc.fieldMagnitude < 1e-12) return;
        const eVec = calc.electricField;
        const dir = new THREE.Vector3(eVec.x, eVec.y, eVec.z).normalize();
        const length = Math.min(1.0, Math.max(0.2, Math.log10(calc.fieldMagnitude + 1) * 0.18));
        const col = calc.charge.q > 0 ? 0xef4444 : 0x3b82f6;

        const arrow = new THREE.ArrowHelper(dir, tpPos, length, col, 0.12, 0.06);
        scene.add(arrow);
      });
    }

    // 10. 3D Vector Field Grid (Space lattice of field arrows)
    if (settings.showVectorGrid && charges.length > 0) {
      const density = 6;
      const span = 1.2;
      const step = (span * 2) / density;

      for (let x = -span; x <= span; x += step) {
        for (let y = -span; y <= span; y += step) {
          for (let z = -span; z <= span; z += step) {
            // Avoid drawing near charges
            let close = false;
            for (const c of charges) {
              const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2 + (z - (c.z || 0)) ** 2);
              if (d < 0.22) {
                close = true;
                break;
              }
            }
            if (close) continue;

            const pField = calculateElectricFieldAt(charges, { x, y, z });
            const mag = Math.sqrt(pField.x * pField.x + pField.y * pField.y + pField.z * pField.z);
            if (mag < 1e-6) continue;

            const dir = new THREE.Vector3(pField.x, pField.y, pField.z).normalize();
            const origin = new THREE.Vector3(x, y, z);
            const len = Math.min(0.22, Math.max(0.06, Math.log10(mag + 1) * 0.04));

            // Intensity color
            const arrowCol = 0x38bdf8; // Sky blue
            const miniArrow = new THREE.ArrowHelper(dir, origin, len, arrowCol, len * 0.35, len * 0.2);
            scene.add(miniArrow);
          }
        }
      }
    }

    // 11. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      ringMesh.rotation.z += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    // 12. Resize Handler
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [charges, testPoint, settings, calculation]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(2.8, 2.4, 3.2);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handlePresetView = (view: 'xy' | 'xz' | 'iso') => {
    if (!cameraRef.current || !controlsRef.current) return;
    if (view === 'xy') {
      cameraRef.current.position.set(0, 0, 3.5);
    } else if (view === 'xz') {
      cameraRef.current.position.set(0, 3.5, 0.001);
    } else {
      cameraRef.current.position.set(2.8, 2.4, 3.2);
    }
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-[540px] md:h-[600px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Controls (Top Left) */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800/80 shadow-lg">
        <button
          onClick={handleResetCamera}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Restablecer Cámara 3D"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => handlePresetView('xy')}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono font-bold transition"
          title="Vista Frontal (Plano XY)"
        >
          XY
        </button>
        <button
          onClick={() => handlePresetView('xz')}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono font-bold transition"
          title="Vista Superior (Plano XZ)"
        >
          XZ
        </button>
        <button
          onClick={() => handlePresetView('iso')}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Vista Isométrica 3D"
        >
          <Box className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Origin Button (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => onUpdateTestPointPos(0, 0, 0)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md transition shadow-md"
          title="Fijar Punto de Prueba en el Origen (0,0,0)"
        >
          <Crosshair className="w-3.5 h-3.5" />
          Fijar P en (0,0,0)
        </button>
      </div>

      {/* Legend & 3D Hints Bar (Bottom) */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-xs text-slate-300 shadow-xl font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Espacio 3D:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> Carga (+)
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 ml-2" /> Carga (-)
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" /> Punto P (r₀)
            <span className="inline-block w-3.5 h-1.5 rounded bg-emerald-500 ml-2" /> Vector E⃗_total
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Clic izquierdo: Rotar • Clic derecho: Mover • Rueda: Zoom
        </div>
      </div>
    </div>
  );
};
