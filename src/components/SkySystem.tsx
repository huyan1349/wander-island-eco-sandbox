import { useGameStore } from '../store';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars, Clouds, Cloud } from '@react-three/drei';

export function SkySystem() {
    const timeOfDay = useGameStore(state => state.timeOfDay); // 0 to 24
    
    // Calculate sun position based on time of day
    // 6am (6) is sunrise, 12pm is noon, 6pm (18) is sunset
    const inclination = useMemo(() => {
        return (timeOfDay - 6) / 24; 
    }, [timeOfDay]);
    
    // Calculate colors based on time
    const { ambientColor, ambientIntensity, sunColor, isNight, fogColor, cloudColor, sunIntensity } = useMemo(() => {
        let ambCol = new THREE.Color('#ffffff');
        let ambInt = 0.5;
        let sunCol = new THREE.Color('#ffffff');
        let sunInt = 1.0;
        let night = false;
        let fogCol = new THREE.Color('#bae6fd');
        let cloudCol = new THREE.Color('#ffffff');
        
        // Deep Night (20 to 4)
        if (timeOfDay >= 20 || timeOfDay < 4) {
            ambCol = new THREE.Color('#080b14'); // Very dark deep blue
            ambInt = 0.3;
            sunCol = new THREE.Color('#38bdf8'); // Cold moon light
            sunInt = 0.2; // Dim moon
            night = true;
            fogCol = new THREE.Color('#020617');
            cloudCol = new THREE.Color('#1e293b');
        } 
        // Dawn / Sunrise (4 to 7)
        else if (timeOfDay >= 4 && timeOfDay < 7) {
            const progress = (timeOfDay - 4) / 3; // 0 to 1
            ambCol = new THREE.Color('#080b14').lerp(new THREE.Color('#fb923c'), progress);
            ambInt = 0.3 + (progress * 0.2);
            sunCol = new THREE.Color('#38bdf8').lerp(new THREE.Color('#fcd34d'), progress);
            sunInt = 0.2 + (progress * 0.8);
            fogCol = new THREE.Color('#020617').lerp(new THREE.Color('#fed7aa'), progress);
            cloudCol = new THREE.Color('#1e293b').lerp(new THREE.Color('#ffedd5'), progress);
            if (timeOfDay < 5) night = true;
        }
        // Day (7 to 16)
        else if (timeOfDay >= 7 && timeOfDay < 16) {
            ambCol = new THREE.Color('#e2e8f0');
            ambInt = 0.6;
            sunCol = new THREE.Color('#ffffff');
            sunInt = 1.2;
            fogCol = new THREE.Color('#bae6fd');
            cloudCol = new THREE.Color('#ffffff');
        }
        // Golden Hour / Sunset (16 to 20)
        else {
            const progress = (timeOfDay - 16) / 4; // 0 to 1
            ambCol = new THREE.Color('#e2e8f0').lerp(new THREE.Color('#4c1d95'), progress); // Fades to deep purple
            ambInt = 0.6 - (progress * 0.3);
            sunCol = new THREE.Color('#ffffff').lerp(new THREE.Color('#f97316'), progress); // Turns bright orange/red
            sunInt = 1.2 - (progress * 0.8);
            fogCol = new THREE.Color('#bae6fd').lerp(new THREE.Color('#f43f5e'), progress); // Pink/Rose fog
            cloudCol = new THREE.Color('#ffffff').lerp(new THREE.Color('#fda4af'), progress); // Pink clouds
            if (timeOfDay > 19) night = true;
        }
        
        return { ambientColor: ambCol, ambientIntensity: ambInt, sunColor: sunCol, isNight: night, fogColor: fogCol, cloudColor: cloudCol, sunIntensity: sunInt };
    }, [timeOfDay]);

    const weather = useGameStore(state => state.weather);
    let sceneFogColor: string = fogColor.getStyle();
    let finalCloudColor = cloudColor.getStyle();
    let fogDensity = 0.012;

    if (weather === 'rainy') { sceneFogColor = '#64748b'; finalCloudColor = '#475569'; fogDensity = 0.025; }
    else if (weather === 'stormy') { sceneFogColor = '#334155'; finalCloudColor = '#1e293b'; fogDensity = 0.035; }
    else if (weather === 'foggy') { sceneFogColor = '#cbd5e1'; finalCloudColor = '#f1f5f9'; fogDensity = 0.06; }
    else if (weather === 'cloudy') { finalCloudColor = '#94a3b8'; }
    else if (weather === 'snowy') { sceneFogColor = '#e2e8f0'; finalCloudColor = '#ffffff'; fogDensity = 0.02; }

    // Position of the sun/moon directional light
    const theta = Math.PI * (timeOfDay / 24) * 2 - Math.PI / 2;
    const sunX = Math.cos(theta) * 50;
    const sunY = Math.sin(theta) * 50;
    const sunZ = 20;

    return (
        <>
           <fogExp2 attach="fog" color={sceneFogColor} density={fogDensity} />
           <Sky 
              distance={450000} 
              sunPosition={[sunX, sunY, sunZ]} 
              inclination={inclination} 
              azimuth={0.25} 
           />
           {isNight && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
           <ambientLight color={ambientColor} intensity={ambientIntensity} />
           
           {/* Primary Sun Light */}
           {sunY > -10 && (
               <directionalLight 
                  position={[sunX, sunY, sunZ]} 
                  intensity={sunIntensity} 
                  color={sunColor}
                  castShadow 
                  shadow-mapSize-width={2048} 
                  shadow-mapSize-height={2048}
                  shadow-camera-far={150}
                  shadow-camera-left={-40}
                  shadow-camera-right={40}
                  shadow-camera-top={40}
                  shadow-camera-bottom={-40}
                  shadow-bias={-0.0005}
               />
           )}
        </>
    );
}

export function FirefliesSystem() {
    const timeOfDay = useGameStore(state => state.timeOfDay);
    const isNight = timeOfDay > 18 || timeOfDay < 6;
    const count = 60;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const fireflies = useMemo(() => {
        const arr = [];
        for (let i = 0; i < count; i++) {
            arr.push({
                x: (Math.random() - 0.5) * 30,
                y: Math.random() * 2 + 0.5,
                z: (Math.random() - 0.5) * 30,
                offset: Math.random() * 100,
                speed: 0.5 + Math.random() * 0.5,
                wanderRadius: 1 + Math.random() * 1.5
            });
        }
        return arr;
    }, []);

    useFrame(({ clock }, delta) => {
        if (!meshRef.current) return;
        
        const targetOpacity = isNight ? 1 : 0;
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOpacity, 2, delta);
        if (mat.opacity < 0.01) {
            meshRef.current.visible = false;
            return;
        } else {
            meshRef.current.visible = true;
        }

        const time = clock.elapsedTime;
        fireflies.forEach((f, i) => {
            const t = time * f.speed + f.offset;
            const x = f.x + Math.sin(t * 0.5) * f.wanderRadius;
            const y = f.y + Math.sin(t * 0.2) * 0.5;
            const z = f.z + Math.cos(t * 0.4) * f.wanderRadius;

            dummy.position.set(x, y, z);
            const pulse = (Math.sin(time * 3 + f.offset) + 1) / 2; // 0 to 1
            const s = 0.5 + pulse * 1.5;
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
             <sphereGeometry args={[0.08, 8, 8]} />
             <meshStandardMaterial color="#bef264" emissive="#bef264" emissiveIntensity={2} transparent opacity={0} toneMapped={false} />
        </instancedMesh>
    );
}

export function RainSystem() {
    const weather = useGameStore(state => state.weather);
    const rainCount = 5000;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const rainDrops = useMemo(() => {
        const drops = [];
        for (let i = 0; i < rainCount; i++) {
            drops.push({
                x: (Math.random() - 0.5) * 80,
                y: Math.random() * 50,
                z: (Math.random() - 0.5) * 80,
                speed: 1.5 + Math.random() * 1.0
            });
        }
        return drops;
    }, []);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const targetOpacity = weather === 'stormy' ? 1.0 : (weather === 'rainy' ? 0.6 : 0);
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOpacity, 4, delta);
        if (mat.opacity < 0.01) {
            meshRef.current.visible = false;
            return;
        } else {
            meshRef.current.visible = true;
        }

        rainDrops.forEach((drop, i) => {
            drop.y -= drop.speed * delta * 40;
            drop.x -= 0.2 * delta * 40; // wind
            if (drop.y < 0) {
                 drop.y = 50;
                 drop.x = (Math.random() - 0.5) * 80;
            }
            dummy.position.set(drop.x, drop.y, drop.z);
            dummy.rotation.z = 0.15;
            dummy.scale.set(0.1, 2.5, 0.1);
            dummy.updateMatrix();
            meshRef.current?.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, rainCount]}>
             <boxGeometry args={[0.1, 1, 0.1]} />
             <meshBasicMaterial color="#94a3b8" transparent opacity={0} depthWrite={false} />
        </instancedMesh>
    );
}

export function SnowSystem() {
    const weather = useGameStore(state => state.weather);
    const snowCount = 4000;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const snowflakes = useMemo(() => {
        const flakes = [];
        for (let i = 0; i < snowCount; i++) {
            flakes.push({
                x: (Math.random() - 0.5) * 80,
                y: Math.random() * 40,
                z: (Math.random() - 0.5) * 80,
                speed: 0.2 + Math.random() * 0.2,
                offset: Math.random() * 100
            });
        }
        return flakes;
    }, []);

    useFrame(({ clock }, delta) => {
        if (!meshRef.current) return;
        const targetOpacity = weather === 'snowy' ? 0.8 : 0;
        const mat = meshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, targetOpacity, 2, delta);
        if (mat.opacity < 0.01) {
            meshRef.current.visible = false;
            return;
        } else {
            meshRef.current.visible = true;
        }

        const t = clock.elapsedTime;
        snowflakes.forEach((flake, i) => {
            flake.y -= flake.speed * delta * 15;
            if (flake.y < 0) {
                 flake.y = 40;
                 flake.x = (Math.random() - 0.5) * 80;
            }
            const wobbleX = Math.sin(t + flake.offset) * 0.5;
            const wobbleZ = Math.cos(t * 0.8 + flake.offset) * 0.5;
            
            dummy.position.set(flake.x + wobbleX, flake.y, flake.z + wobbleZ);
            dummy.scale.setScalar(0.06);
            dummy.updateMatrix();
            meshRef.current?.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, snowCount]}>
             <sphereGeometry args={[1, 4, 4]} />
             <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </instancedMesh>
    );
}

export function WeatherSystem() {
    return (
        <>
           <RainSystem />
           <SnowSystem />
        </>
    );
}
