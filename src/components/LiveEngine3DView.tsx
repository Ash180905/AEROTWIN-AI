import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  EngineTelemetry, 
  PhysicsExpectedModel, 
  EngineSubsystemHealth, 
  FaultDiagnosis,
  FaultPreset 
} from '../types';
import { 
  Eye, 
  RotateCw, 
  Layers, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Crosshair, 
  Flame, 
  Activity,
  Droplets,
  Wind
} from 'lucide-react';

interface LiveEngine3DViewProps {
  telemetry: EngineTelemetry;
  physics: PhysicsExpectedModel;
  health: EngineSubsystemHealth;
  diagnosis: FaultDiagnosis;
  activePreset?: FaultPreset;
  onSelectComponent: (partKey: string) => void;
}

export const LiveEngine3DView: React.FC<LiveEngine3DViewProps> = ({
  telemetry,
  physics,
  health,
  diagnosis,
  activePreset = 'NORMAL',
  onSelectComponent,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // 3D View Controls & Modes
  const [isXrayMode, setIsXrayMode] = useState<boolean>(false);
  const [isThermalMode, setIsThermalMode] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [hoveredPartName, setHoveredPartName] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'side' | 'turbo'>('iso');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Refs for animation & Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const engineGroupRef = useRef<THREE.Group | null>(null);
  const propGroupRef = useRef<THREE.Group | null>(null);
  const turboImpellerRef = useRef<THREE.Mesh | null>(null);
  const pistonsRef = useRef<THREE.Mesh[]>([]);
  const conRodsRef = useRef<THREE.Mesh[]>([]);
  const cylHeadsRef = useRef<THREE.Mesh[]>([]);
  const exhaustPipesRef = useRef<THREE.Mesh[]>([]);
  const crankRef = useRef<THREE.Group | null>(null);
  const combustionLightsRef = useRef<THREE.PointLight[]>([]);
  const housingMeshesRef = useRef<THREE.Mesh[]>([]);
  const bearingMeshesRef = useRef<THREE.Mesh[]>([]);
  const sensorProbeRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Orbit drag state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraDistanceRef = useRef(15);
  const cameraThetaRef = useRef(Math.PI / 4); // azimuth angle
  const cameraPhiRef = useRef(Math.PI / 3);   // polar angle
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0.5, 0));

  // Current values for animation
  const telemetryRef = useRef(telemetry);
  const diagnosisRef = useRef(diagnosis);
  const healthRef = useRef(health);
  const activePresetRef = useRef(activePreset);
  const isXrayModeRef = useRef(isXrayMode);
  const isThermalModeRef = useRef(isThermalMode);

  useEffect(() => {
    telemetryRef.current = telemetry;
    diagnosisRef.current = diagnosis;
    healthRef.current = health;
    activePresetRef.current = activePreset;
    isXrayModeRef.current = isXrayMode;
    isThermalModeRef.current = isThermalMode;
  }, [telemetry, diagnosis, health, activePreset, isXrayMode, isThermalMode]);

  // Update camera position from spherical coords
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const r = cameraDistanceRef.current;
    const theta = cameraThetaRef.current;
    const phi = Math.max(0.05, Math.min(Math.PI - 0.05, cameraPhiRef.current));
    
    cameraRef.current.position.x = r * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.y = r * Math.cos(phi);
    cameraRef.current.position.z = r * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.lookAt(cameraTargetRef.current);
  }, []);

  // Camera presets
  const applyCameraPreset = (preset: 'iso' | 'top' | 'front' | 'side' | 'turbo') => {
    setCameraPreset(preset);
    switch (preset) {
      case 'iso':
        cameraDistanceRef.current = 14;
        cameraThetaRef.current = 0.85;
        cameraPhiRef.current = 1.05;
        cameraTargetRef.current.set(0, 0.5, 0);
        break;
      case 'top':
        cameraDistanceRef.current = 13;
        cameraThetaRef.current = 0;
        cameraPhiRef.current = 0.15;
        cameraTargetRef.current.set(0, 0, 0);
        break;
      case 'front':
        cameraDistanceRef.current = 13;
        cameraThetaRef.current = -Math.PI / 2;
        cameraPhiRef.current = 1.35;
        cameraTargetRef.current.set(0, 0.4, 0);
        break;
      case 'side':
        cameraDistanceRef.current = 13;
        cameraThetaRef.current = 0;
        cameraPhiRef.current = 1.4;
        cameraTargetRef.current.set(0, 0.5, 0);
        break;
      case 'turbo':
        cameraDistanceRef.current = 10;
        cameraThetaRef.current = 2.4;
        cameraPhiRef.current = 1.1;
        cameraTargetRef.current.set(0, 0.8, -1.8);
        break;
    }
    updateCameraPosition();
  };

  // Build the 3D Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f1d); // Sleek cockpit deep slate

    // Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(24, 24, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -2.8;
    scene.add(gridHelper);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(10, 15, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 1.0);
    fillLight.position.set(-10, 5, -8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa5b4fc, 1.4);
    rimLight.position.set(0, -5, -10);
    scene.add(rimLight);

    // Root Engine Group
    const engineGroup = new THREE.Group();
    scene.add(engineGroup);
    engineGroupRef.current = engineGroup;

    // Housing Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.28,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.35,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.3,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.15,
    });

    housingMeshesRef.current = [];

    // 1. Central Crankcase Body (Horizontally Split Boxer Casing)
    const crankcaseGeo = new THREE.BoxGeometry(2.4, 2.0, 4.4);
    const crankcaseMesh = new THREE.Mesh(crankcaseGeo, metalMat);
    crankcaseMesh.position.set(0, 0.4, 0);
    crankcaseMesh.castShadow = true;
    crankcaseMesh.receiveShadow = true;
    crankcaseMesh.name = 'bearing';
    engineGroup.add(crankcaseMesh);
    housingMeshesRef.current.push(crankcaseMesh);

    // Oil Sump pan at bottom
    const oilPanGeo = new THREE.BoxGeometry(2.1, 0.7, 3.8);
    const oilPanMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.4,
    });
    const oilPanMesh = new THREE.Mesh(oilPanGeo, oilPanMat);
    oilPanMesh.position.set(0, -0.85, 0.1);
    oilPanMesh.name = 'lubrication';
    engineGroup.add(oilPanMesh);
    housingMeshesRef.current.push(oilPanMesh);

    // Oil Filter canister on side of crankcase
    const oilFilterGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.0, 16);
    const oilFilterMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.3 });
    const oilFilterMesh = new THREE.Mesh(oilFilterGeo, oilFilterMat);
    oilFilterMesh.rotation.z = Math.PI / 2;
    oilFilterMesh.position.set(-1.4, -0.5, 0.6);
    oilFilterMesh.name = 'lubrication';
    engineGroup.add(oilFilterMesh);

    // 2. 4 Boxer Cylinders (Horizontally Opposed: Cyl 1 & 3 Left, Cyl 2 & 4 Right)
    // In Rotax 912/914/915: Cylinders are paired horizontally opposed along Z axis
    const cylinderPositions = [
      { id: 'cyl-1', num: 1, side: -1, z: 1.1, label: 'Cylinder #1' },
      { id: 'cyl-3', num: 3, side: -1, z: -0.9, label: 'Cylinder #3' },
      { id: 'cyl-2', num: 2, side: 1, z: 0.7, label: 'Cylinder #2' },
      { id: 'cyl-4', num: 4, side: 1, z: -1.3, label: 'Cylinder #4' },
    ];

    cylHeadsRef.current = [];
    pistonsRef.current = [];
    conRodsRef.current = [];
    combustionLightsRef.current = [];
    exhaustPipesRef.current = [];

    // Crankshaft group inside crankcase
    const crankGroup = new THREE.Group();
    crankGroup.position.set(0, 0.4, 0);
    engineGroup.add(crankGroup);
    crankRef.current = crankGroup;

    // Crankshaft main journal bar
    const crankShaftGeo = new THREE.CylinderGeometry(0.25, 0.25, 4.2, 16);
    const crankShaftMesh = new THREE.Mesh(crankShaftGeo, chromeMat);
    crankShaftMesh.rotation.x = Math.PI / 2;
    crankGroup.add(crankShaftMesh);

    // Journal bearings (front, center, rear) with active thermal/friction responsiveness
    bearingMeshesRef.current = [];
    const bearingPositions = [-1.1, 0, 1.1];
    bearingPositions.forEach((bz) => {
      const bGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 20);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.85,
        roughness: 0.25,
        emissive: new THREE.Color(0x000000)
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.rotation.x = Math.PI / 2;
      bMesh.position.set(0, 0, bz);
      bMesh.name = 'bearing';
      crankGroup.add(bMesh);
      bearingMeshesRef.current.push(bMesh);
    });

    cylinderPositions.forEach((pos, idx) => {
      // Cylinder Barrel with cooling fins
      const cylBarrelGroup = new THREE.Group();
      cylBarrelGroup.position.set(pos.side * 1.8, 0.4, pos.z);
      cylBarrelGroup.rotation.z = pos.side * (Math.PI / 2);
      cylBarrelGroup.name = pos.id;
      engineGroup.add(cylBarrelGroup);

      // Main barrel cylinder
      const barrelGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.4, 24);
      const barrelMesh = new THREE.Mesh(barrelGeo, darkMetalMat);
      barrelMesh.castShadow = true;
      barrelMesh.name = pos.id;
      cylBarrelGroup.add(barrelMesh);
      housingMeshesRef.current.push(barrelMesh);

      // Cooling Fins rings
      for (let f = -0.5; f <= 0.5; f += 0.15) {
        const finGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.03, 24);
        const finMesh = new THREE.Mesh(finGeo, metalMat);
        finMesh.position.y = f;
        finMesh.name = pos.id;
        cylBarrelGroup.add(finMesh);
        housingMeshesRef.current.push(finMesh);
      }

      // Cylinder Head (outer extremity)
      const headGeo = new THREE.BoxGeometry(1.6, 0.65, 1.5);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.75,
        roughness: 0.3,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.set(pos.side * 2.8, 0.4, pos.z);
      headMesh.name = pos.id;
      engineGroup.add(headMesh);
      cylHeadsRef.current.push(headMesh);
      housingMeshesRef.current.push(headMesh);

      // Spark plug on top of head
      const sparkGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.45, 12);
      const sparkMesh = new THREE.Mesh(sparkGeo, brassMat);
      sparkMesh.position.set(pos.side * 2.8, 0.95, pos.z);
      sparkMesh.name = pos.id;
      engineGroup.add(sparkMesh);

      // Cylinder 2 CHT Sensor Transducer Probe with diagnostic signal response
      if (pos.id === 'cyl-2') {
        const sensorGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12);
        const sensorMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          metalness: 0.6,
          roughness: 0.25,
          emissive: new THREE.Color(0x000000)
        });
        const sensorMesh = new THREE.Mesh(sensorGeo, sensorMat);
        sensorMesh.position.set(pos.side * 2.8, 0.8, pos.z + 0.3);
        sensorMesh.name = 'cyl-2';
        engineGroup.add(sensorMesh);
        sensorProbeRef.current = sensorMesh;
      }

      // Internal Reciprocating Piston
      const pistonGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.65, 20);
      const pistonMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.15,
      });
      const pistonMesh = new THREE.Mesh(pistonGeo, pistonMat);
      pistonMesh.rotation.z = pos.side * (Math.PI / 2);
      pistonMesh.position.set(pos.side * 1.8, 0.4, pos.z);
      pistonMesh.name = pos.id;
      engineGroup.add(pistonMesh);
      pistonsRef.current.push(pistonMesh);

      // Connecting rod
      const conRodGeo = new THREE.BoxGeometry(0.2, 0.85, 0.2);
      const conRodMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.9,
        roughness: 0.2,
      });
      const conRodMesh = new THREE.Mesh(conRodGeo, conRodMat);
      conRodMesh.rotation.z = -pos.side * (Math.PI / 2);
      conRodMesh.position.set(pos.side * 0.9, 0.4, pos.z);
      engineGroup.add(conRodMesh);
      conRodsRef.current.push(conRodMesh);

      // Combustion flash light inside cylinder head
      const cLight = new THREE.PointLight(0xff6600, 0, 3.5);
      cLight.position.set(pos.side * 2.6, 0.4, pos.z);
      scene.add(cLight);
      combustionLightsRef.current.push(cLight);

      // Exhaust Pipe header curving down and towards turbocharger
      const pipeCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(pos.side * 2.5, 0.1, pos.z),
        new THREE.Vector3(pos.side * 1.5, -0.8, pos.z * 0.5),
        new THREE.Vector3(0, -0.6, -2.0)
      );
      const pipeGeo = new THREE.TubeGeometry(pipeCurve, 20, 0.18, 12, false);
      const pipeMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.85,
        roughness: 0.35,
        emissive: new THREE.Color(0x000000),
      });
      const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
      pipeMesh.name = pos.id;
      engineGroup.add(pipeMesh);
      exhaustPipesRef.current.push(pipeMesh);
    });

    // 3. Turbocharger & Intercooler Assembly (Rear of Engine, Z < -2.2)
    const turboGroup = new THREE.Group();
    turboGroup.position.set(0, 0.8, -2.4);
    turboGroup.name = 'turbo';
    engineGroup.add(turboGroup);

    // Turbine Housing (exhaust side)
    const turbineGeo = new THREE.TorusGeometry(0.65, 0.28, 16, 24);
    const turbineMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.3,
      emissive: new THREE.Color(0x221100),
    });
    const turbineMesh = new THREE.Mesh(turbineGeo, turbineMat);
    turbineMesh.name = 'turbo';
    turboGroup.add(turbineMesh);

    // Compressor Housing (intake side)
    const compGeo = new THREE.TorusGeometry(0.62, 0.25, 16, 24);
    const compMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.6,
      roughness: 0.25,
    });
    const compMesh = new THREE.Mesh(compGeo, compMat);
    compMesh.position.set(0, 0, -0.45);
    compMesh.name = 'turbo';
    turboGroup.add(compMesh);

    // Spinning Impeller blades inside compressor
    const impellerGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 12);
    const impellerMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      metalness: 0.9,
      roughness: 0.1,
    });
    const impellerMesh = new THREE.Mesh(impellerGeo, impellerMat);
    impellerMesh.rotation.x = Math.PI / 2;
    impellerMesh.position.set(0, 0, -0.45);
    impellerMesh.name = 'turbo';
    turboGroup.add(impellerMesh);
    turboImpellerRef.current = impellerMesh;

    // Intercooler radiator core mounted atop crankcase
    const intercoolerGeo = new THREE.BoxGeometry(2.0, 0.3, 1.8);
    const intercoolerMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.3,
    });
    const intercoolerMesh = new THREE.Mesh(intercoolerGeo, intercoolerMat);
    intercoolerMesh.position.set(0, 1.6, -0.2);
    intercoolerMesh.name = 'turbo';
    engineGroup.add(intercoolerMesh);

    // 4. Reduction Gearbox & Spinning 3-Blade Composite Propeller (Front, Z > 2.2)
    const propGroup = new THREE.Group();
    propGroup.position.set(0, 0.5, 3.2);
    propGroup.name = 'propeller';
    engineGroup.add(propGroup);
    propGroupRef.current = propGroup;

    // Gearbox cone housing
    const gearboxGeo = new THREE.ConeGeometry(0.9, 1.3, 20);
    const gearboxMesh = new THREE.Mesh(gearboxGeo, metalMat);
    gearboxMesh.rotation.x = Math.PI / 2;
    gearboxMesh.position.set(0, 0.5, 2.6);
    engineGroup.add(gearboxMesh);
    housingMeshesRef.current.push(gearboxMesh);

    // Propeller Spinner Cone
    const spinnerGeo = new THREE.ConeGeometry(0.65, 1.1, 24);
    const spinnerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.15,
    });
    const spinnerMesh = new THREE.Mesh(spinnerGeo, spinnerMat);
    spinnerMesh.rotation.x = Math.PI / 2;
    spinnerMesh.name = 'propeller';
    propGroup.add(spinnerMesh);

    // 3 Propeller Blades (120 deg apart)
    const bladeGeo = new THREE.BoxGeometry(0.24, 4.4, 0.08);
    // Taper the blade tip
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.5,
      roughness: 0.4,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // High-visibility yellow safety tip
      metalness: 0.3,
      roughness: 0.5,
    });

    for (let b = 0; b < 3; b++) {
      const bladeArm = new THREE.Group();
      bladeArm.rotation.z = (b * Math.PI * 2) / 3;

      const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
      bladeMesh.position.y = 2.2;
      bladeMesh.rotation.y = 0.2; // blade pitch angle
      bladeMesh.name = 'propeller';
      bladeArm.add(bladeMesh);

      // Yellow Tip
      const tipGeo = new THREE.BoxGeometry(0.24, 0.5, 0.085);
      const tipMesh = new THREE.Mesh(tipGeo, tipMat);
      tipMesh.position.y = 4.15;
      tipMesh.rotation.y = 0.2;
      tipMesh.name = 'propeller';
      bladeArm.add(tipMesh);

      propGroup.add(bladeArm);
    }

    // High-speed propeller disc blur effect (appears when RPM > 2400)
    const propDiscGeo = new THREE.RingGeometry(0.8, 4.4, 32);
    const propDiscMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const propDiscMesh = new THREE.Mesh(propDiscGeo, propDiscMat);
    propDiscMesh.position.set(0, 0, -0.05);
    propGroup.add(propDiscMesh);

    // 5. Interaction Event Listeners (Drag / Zoom / Pan / Raycast Click)
    const dom = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      // Normalized coordinates for Raycaster
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        cameraThetaRef.current -= deltaX * 0.008;
        cameraPhiRef.current -= deltaY * 0.008;
        updateCameraPosition();

        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      } else {
        // Raycast hover check
        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const intersects = raycasterRef.current.intersectObjects(engineGroup.children, true);
        if (intersects.length > 0) {
          let obj: THREE.Object3D | null = intersects[0].object;
          let foundName: string | null = null;
          while (obj && obj !== engineGroup) {
            if (obj.name && obj.name.length > 0) {
              foundName = obj.name;
              break;
            }
            obj = obj.parent;
          }
          if (foundName) {
            setHoveredPartName(getPartFriendlyName(foundName));
          } else {
            setHoveredPartName(null);
          }
        } else {
          setHoveredPartName(null);
        }
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistanceRef.current = Math.max(5, Math.min(26, cameraDistanceRef.current + e.deltaY * 0.015));
      updateCameraPosition();
    };

    const onClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(engineGroup.children, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        let foundName: string | null = null;
        while (obj && obj !== engineGroup) {
          if (obj.name && obj.name.length > 0) {
            foundName = obj.name;
            break;
          }
          obj = obj.parent;
        }
        if (foundName) {
          onSelectComponent(foundName);
        }
      }
    };

    // Touch support for mobile / tablets
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        cameraThetaRef.current -= deltaX * 0.008;
        cameraPhiRef.current -= deltaY * 0.008;
        updateCameraPosition();
      }
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('click', onClick);
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 6. Real-Time Animation Loop (Pistons, Propeller, Combustion Flashes, Vibration Jitter)
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let crankAngle = 0;

    const animate = () => {
      const delta = clock.getDelta();
      const telem = telemetryRef.current;
      const diag = diagnosisRef.current;
      const isXray = isXrayModeRef.current;
      const isThermal = isThermalModeRef.current;

      // Auto-rotation around engine if enabled
      if (autoRotate) {
        cameraThetaRef.current += delta * 0.3;
        updateCameraPosition();
      }

      // Angular velocity proportional to RPM (Rotax max ~5800 RPM)
      const rps = (telem.rpm / 60);
      const angleDelta = rps * Math.PI * 2 * delta * 0.4;
      crankAngle += angleDelta;

      // 1. Rotate Crankshaft
      if (crankRef.current) {
        crankRef.current.rotation.z = crankAngle;
      }

      // 2. Rotate Propeller (Rotax reduction ratio approx 2.43:1)
      if (propGroupRef.current) {
        propGroupRef.current.rotation.z += angleDelta / 2.43;
      }

      // 3. Turbocharger Impeller spin (proportional to boost pressure & RPM)
      if (turboImpellerRef.current) {
        turboImpellerRef.current.rotation.z += angleDelta * 6.5;
      }

      // 4. Reciprocating Boxer Pistons (Firing order 1 - 3 - 4 - 2)
      // Cyl 1 (side -1), Cyl 3 (side -1, phase +PI*0.5), Cyl 2 (side 1, phase +PI), Cyl 4 (side 1, phase +PI*1.5)
      const phases = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      const strokeAmp = 0.45; // mm travel in 3D

      pistonsRef.current.forEach((piston, idx) => {
        const side = idx < 2 ? -1 : 1;
        const phase = phases[idx];
        const stroke = Math.sin(crankAngle + phase) * strokeAmp;
        piston.position.x = side * (1.8 + stroke);

        // Connecting rod tilt
        if (conRodsRef.current[idx]) {
          conRodsRef.current[idx].position.x = side * (0.9 + stroke * 0.5);
          conRodsRef.current[idx].rotation.y = Math.cos(crankAngle + phase) * 0.25;
        }

        // Combustion Flash light pulsing at TDC (Top Dead Center)
        if (combustionLightsRef.current[idx]) {
          const light = combustionLightsRef.current[idx];
          const isTdc = Math.cos(crankAngle + phase) > 0.85;
          if (isTdc) {
            // If cylinder 3 has injector fault, flame is hotter / more intense
            if (idx === 1 && diag.faultTitle.includes('Injector')) {
              light.color.setHex(0xff1100);
              light.intensity = 2.8;
            } else {
              light.color.setHex(0xff8800);
              light.intensity = 1.4;
            }
          } else {
            light.intensity = THREE.MathUtils.lerp(light.intensity, 0, delta * 12);
          }
        }
      });

      // 5. Thermal Colors & Exhaust Header Glowing
      exhaustPipesRef.current.forEach((pipe, idx) => {
        const egt = telem.egt[idx];
        const mat = pipe.material as THREE.MeshStandardMaterial;
        if (isThermal) {
          // Heatmap: Blue -> Green -> Amber -> Bright Red
          const tNorm = Math.max(0, Math.min(1, (egt - 650) / 150));
          mat.color.setHSL(0.66 * (1 - tNorm), 0.9, 0.45);
          mat.emissive.setHSL(0.08, 0.9, tNorm * 0.6);
        } else {
          // Realistic metal with high-temperature glowing orange/red
          if (egt > 740) {
            mat.emissive.setHex(0xff3300);
            mat.color.setHex(0x7f1d1d);
          } else if (egt > 700) {
            mat.emissive.setHex(0xaa2200);
            mat.color.setHex(0x475569);
          } else {
            mat.emissive.setHex(0x000000);
            mat.color.setHex(0x475569);
          }
        }
      });

      // 6. Cylinder Head Thermal Colors & Cooling Leak Response
      const isCoolingLeak = activePresetRef.current === 'COOLING_LEAK' || diag.faultTitle.includes('Cooling') || telem.coolantTemp > 105;
      cylHeadsRef.current.forEach((head, idx) => {
        const cht = telem.cylinderTemps[idx];
        const isCyl3Fault = (idx === 1 || idx === 2) && (activePresetRef.current === 'INJECTOR_MISFIRE' || diag.faultTitle.includes('Injector'));
        const isSensorGlitch = idx === 1 && (activePresetRef.current === 'SENSOR_MALFUNCTION' || diag.isSensorFaultOnly);
        const mat = head.material as THREE.MeshStandardMaterial;

        if (isThermal) {
          const tNorm = Math.max(0, Math.min(1, (cht - 160) / 90));
          mat.color.setHSL(0.6 * (1 - tNorm), 0.85, 0.5);
          mat.emissive.setHSL(0.05, 0.9, isCoolingLeak ? 0.5 : tNorm * 0.3);
        } else {
          if (isCoolingLeak) {
            // High thermal overload across entire block
            const pulse = (Math.sin(clock.getElapsedTime() * 5) + 1) * 0.5;
            mat.color.setHex(0xb91c1c);
            mat.emissive.setHex(0x991b1b);
            mat.emissiveIntensity = 0.4 + pulse * 0.4;
          } else if (isCyl3Fault || cht > 225) {
            mat.color.setHex(0x991b1b); // dark red
            mat.emissive.setHex(0x7f1d1d);
            mat.emissiveIntensity = 0.3;
          } else if (isSensorGlitch) {
            mat.color.setHex(0x854d0e); // amber sensor glitch highlight
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          } else if (cht > 210) {
            mat.color.setHex(0xb45309); // amber warm
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          } else {
            mat.color.setHex(0x64748b); // nominal slate
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      });

      // 6b. Dynamic Journal Bearing Friction / Wear Glow
      const isBearingFault = activePresetRef.current === 'BEARING_LUBRICATION' || diag.faultTitle.includes('Bearing') || diag.faultTitle.includes('Lubrication') || telem.vibration > 3.0;
      bearingMeshesRef.current.forEach((bMesh, bIdx) => {
        const bMat = bMesh.material as THREE.MeshStandardMaterial;
        if (isBearingFault) {
          // Center bearing suffers high hydrodynamic shear stress
          const pulse = (Math.sin(clock.getElapsedTime() * 8) + 1) * 0.5;
          bMat.color.setHex(bIdx === 1 ? 0xef4444 : 0xf97316);
          bMat.emissive.setHex(bIdx === 1 ? 0xdc2626 : 0xea580c);
          bMat.emissiveIntensity = 0.8 + pulse * 0.6;
        } else {
          bMat.color.setHex(0xd97706);
          bMat.emissive.setHex(0x000000);
          bMat.emissiveIntensity = 0;
        }
      });

      // 6c. Dynamic Sensor Transducer Glitch Blinking
      if (sensorProbeRef.current) {
        const sMat = sensorProbeRef.current.material as THREE.MeshStandardMaterial;
        if (activePresetRef.current === 'SENSOR_MALFUNCTION' || diag.isSensorFaultOnly) {
          const blink = Math.sin(clock.getElapsedTime() * 10) > 0 ? 1 : 0.2;
          sMat.color.setHex(0xfacc15);
          sMat.emissive.setHex(0xeab308);
          sMat.emissiveIntensity = blink;
        } else {
          sMat.color.setHex(0x64748b);
          sMat.emissive.setHex(0x000000);
          sMat.emissiveIntensity = 0;
        }
      }

      // 7. X-Ray Transparency Control
      housingMeshesRef.current.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (isXray) {
          mat.transparent = true;
          mat.opacity = 0.32;
          mat.roughness = 0.1;
        } else {
          mat.transparent = false;
          mat.opacity = 1.0;
          mat.roughness = 0.3;
        }
      });

      // 8. Mechanical Vibration Shake (Real-time physical displacement)
      if (engineGroupRef.current) {
        const vibFactor = Math.max(0, (telem.vibration - 1.5) * 0.024);
        if (vibFactor > 0) {
          engineGroupRef.current.position.x = (Math.random() - 0.5) * vibFactor;
          engineGroupRef.current.position.y = (Math.random() - 0.5) * vibFactor;
          engineGroupRef.current.position.z = (Math.random() - 0.5) * vibFactor;
        } else {
          engineGroupRef.current.position.set(0, 0, 0);
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);

      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
    };
  }, [onSelectComponent, autoRotate, updateCameraPosition]);

  // Helper for friendly part name
  const getPartFriendlyName = (name: string): string => {
    switch (name) {
      case 'cyl-1': return 'Cylinder Assembly #1 (CHT / EGT)';
      case 'cyl-2': return 'Cylinder Assembly #2 (CHT-02 Transducer)';
      case 'cyl-3': return 'Cylinder Assembly #3 (Combustion / Misfire)';
      case 'cyl-4': return 'Cylinder Assembly #4 (CHT / EGT)';
      case 'bearing': return 'Crankshaft & Main Journal Bearings';
      case 'lubrication': return 'Oil Sump, Pump & Lubrication Loop';
      case 'turbo': return 'Exhaust Turbocharger & Intercooler';
      case 'propeller': return 'Composite Propeller & Reduction Gearbox';
      default: return name;
    }
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 bg-slate-950 flex flex-col' : 'min-h-[440px] h-[520px]'
    }`}>
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing select-none" />

      {/* Top Controls Overlay Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Engine Model & Telemetry Tag */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg text-xs font-mono text-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          <span className="font-bold text-white">LIVE 3D DIGITAL TWIN</span>
          <span className="text-slate-500">|</span>
          <span className="text-indigo-300 font-semibold">{telemetry.rpm} RPM</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-300 font-semibold">{telemetry.throttle}% MCP</span>
        </div>

        {/* Right: Camera Angles & Mode Toggles */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-lg text-xs font-mono">
          {/* Camera Presets */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-slate-700">
            <button
              id="btn-cam-iso"
              onClick={() => applyCameraPreset('iso')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                cameraPreset === 'iso' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Isometric Cockpit Angle"
            >
              ISO
            </button>
            <button
              id="btn-cam-top"
              onClick={() => applyCameraPreset('top')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                cameraPreset === 'top' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Top-Down Boxer Cylinder View"
            >
              BOXER
            </button>
            <button
              id="btn-cam-front"
              onClick={() => applyCameraPreset('front')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                cameraPreset === 'front' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Front Propeller & Reduction Gear"
            >
              PROP
            </button>
            <button
              id="btn-cam-turbo"
              onClick={() => applyCameraPreset('turbo')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                cameraPreset === 'turbo' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Turbocharger & Exhaust Manifold"
            >
              TURBO
            </button>
          </div>

          {/* X-Ray Cutaway Housing Mode */}
          <button
            id="btn-toggle-xray"
            onClick={() => setIsXrayMode(!isXrayMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              isXrayMode ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Transparent Housing to see internal pistons and crankshaft"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>X-RAY</span>
          </button>

          {/* Thermal Heatmap Mode */}
          <button
            id="btn-toggle-thermal"
            onClick={() => setIsThermalMode(!isThermalMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              isThermalMode ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Real-Time Thermal Heatmap gradient across cylinders and exhaust"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>HEATMAP</span>
          </button>

          {/* Orbit Auto-Rotate */}
          <button
            id="btn-toggle-autorotate"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              autoRotate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Auto-rotate 3D scene"
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="btn-toggle-fullscreen"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Hovered Component Tooltip Overlay */}
      {hoveredPartName && (
        <div className="absolute top-16 left-4 z-20 pointer-events-none animate-fadeIn">
          <div className="bg-indigo-950/90 border border-indigo-500/60 backdrop-blur-md px-3.5 py-2 rounded-xl text-white text-xs font-mono shadow-xl flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-indigo-400 animate-spin [animation-duration:6s]" />
            <div>
              <div className="text-[10px] text-indigo-300 font-semibold uppercase">INTERACTIVE COMPONENT</div>
              <div className="font-bold">{hoveredPartName}</div>
            </div>
            <span className="text-[10px] text-slate-400 pl-1">Click to inspect</span>
          </div>
        </div>
      )}

      {/* Bottom Telemetry HUD Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quick Sensor Status Cards */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl text-[11px] font-mono shadow-lg text-slate-300">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-700">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>VIB:</span>
            <span className={`font-bold ${telemetry.vibration > 3.2 ? 'text-rose-400' : 'text-slate-100'}`}>
              {telemetry.vibration} mm/s
            </span>
          </div>
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-700">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span>OIL P:</span>
            <span className={`font-bold ${telemetry.oilPressure < 3.8 ? 'text-amber-400' : 'text-slate-100'}`}>
              {telemetry.oilPressure} bar
            </span>
          </div>
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-700">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>MAP:</span>
            <span className="font-bold text-slate-100">
              {telemetry.manifoldPressure} inHg
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>MAX EGT:</span>
            <span className={`font-bold ${Math.max(...telemetry.egt) > 740 ? 'text-rose-400' : 'text-slate-100'}`}>
              {Math.max(...telemetry.egt)}°C
            </span>
          </div>
        </div>

        {/* Right: Interaction hints */}
        <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl text-[10px] font-mono text-slate-400 shadow-lg flex items-center gap-2">
          <span>🖱️ Click & Drag to Orbit 360°</span>
          <span className="text-slate-600">•</span>
          <span>Scroll to Zoom</span>
          <span className="text-slate-600">•</span>
          <span className="text-indigo-300 font-semibold">Click Any Part for Physics Inspector</span>
        </div>
      </div>
    </div>
  );
};
