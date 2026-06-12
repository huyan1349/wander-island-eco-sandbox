import { useGameStore } from '../store';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars, Clouds, Cloud } from '@react-three/drei';

function CloudShadows({ baseColor }: { baseColor: string }) {
    const timeOfDay = useGameStore(state => state.timeOfDay);
    const weather = useGameStore(state => state.weather);
    
    // We use a slow group rotation to simulate wind carrying the clouds across the island
    const groupRef = useRef<THREE.Group>(null);
    const clouds = useMemo(() => {
        const arr = [];
        const numClouds = 8;
        for (let i = 0; i < numClouds; i++) {
            const radius = Math.random() * 25;
            const angle = Math.random() * Math.PI * 2;
            arr.push({
                x: Math.cos(angle) * radius,
                y: 28 + Math.random() * 4, 
                z: Math.sin(angle) * radius,
                scale: 1.2 + Math.random() * 1.5,
                speed: 0.003 + Math.random() * 0.005,
                seed: Math.random() * 100 // for bobbing offset
            });
        }
        return arr;
    }, []);

    // We store refs to individual sphere meshes to animate them breathing
    const puffRefs = useRef<(THREE.Mesh | null)[]>([]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;
        
        // Move entire clouds
        groupRef.current.children.forEach((c, i) => {
            const data = clouds[i];
            c.position.x += data.speed * delta * 15;
            
            // Gentle floating
            c.position.y = data.y + Math.sin(time * 0.5 + data.seed) * 1.5;

            // Wrap around seamlessly
            if (c.position.x > 30) {
                c.position.x = -30;
                c.position.z = (Math.random() - 0.5) * 40; 
            }
        });

        // Make individual puffs breathe and morph so it's not "dead"
        puffRefs.current.forEach((mesh, idx) => {
            if (mesh) {
                const baseScale = mesh.userData.baseScale || 1;
                // Soft, non-uniform breathing per puff
                const breathing = Math.sin(time * 1.2 + idx * 0.8) * 0.08;
                mesh.scale.setScalar(baseScale + breathing);
            }
        });
    });

    const isRainy = weather === 'rainy';
    const targetColor = new THREE.Color(baseColor);

    // Use Lambert for softer, powdery shading without hard specular highlights
    const cloudMaterial = new THREE.MeshLambertMaterial({ color: targetColor });

    return (
        <group ref={groupRef}>
            {clouds.map((c, i) => (
                <group key={i} position={[c.x, c.y, c.z]} scale={c.scale}>
                    {/* Perfectly smooth high-poly spheres for soft, pristine cartoon look */}
                    <mesh 
                       ref={el => { puffRefs.current[i*5 + 0] = el; if(el) el.userData.baseScale = 1; }} 
                       castShadow receiveShadow position={[0, 0, 0]}>
                        <sphereGeometry args={[1.5, 32, 32]} />
                        <primitive object={cloudMaterial} attach="material" />
                    </mesh>
                    <mesh 
                       ref={el => { puffRefs.current[i*5 + 1] = el; if(el) el.userData.baseScale = 0.8; }} 
                       castShadow receiveShadow position={[1.4, -0.2, 0.2]} scale={0.8}>
                        <sphereGeometry args={[1.5, 32, 32]} />
                        <primitive object={cloudMaterial} attach="material" />
                    </mesh>
                    <mesh 
                       ref={el => { puffRefs.current[i*5 + 2] = el; if(el) el.userData.baseScale = 0.9; }} 
                       castShadow receiveShadow position={[-1.4, -0.3, -0.3]} scale={0.9}>
                        <sphereGeometry args={[1.5, 32, 32]} />
                        <primitive object={cloudMaterial} attach="material" />
                    </mesh>
                    <mesh 
                       ref={el => { puffRefs.current[i*5 + 3] = el; if(el) el.userData.baseScale = 0.7; }} 
                       castShadow receiveShadow position={[0.7, 0.9, -0.5]} scale={0.7}>
                        <sphereGeometry args={[1.5, 32, 32]} />
                        <primitive object={cloudMaterial} attach="material" />
                    </mesh>
                    <mesh 
                       ref={el => { puffRefs.current[i*5 + 4] = el; if(el) el.userData.baseScale = 0.65; }} 
                       castShadow receiveShadow position={[-0.8, 0.7, 0.6]} scale={0.65}>
                        <sphereGeometry args={[1.5, 32, 32]} />
                        <primitive object={cloudMaterial} attach="material" />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

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
    const sceneFogColor = weather === 'rainy' ? '#64748b' : fogColor;
    const finalCloudColor = weather === 'rainy' ? '#475569' : cloudColor.getStyle();

    // Position of the sun/moon directional light
    const theta = Math.PI * (timeOfDay / 24) * 2 - Math.PI / 2;
    const sunX = Math.cos(theta) * 50;
    const sunY = Math.sin(theta) * 50;
    const sunZ = 20;

    return (
        <>
           <fogExp2 attach="fog" color={sceneFogColor} density={weather === 'rainy' ? 0.025 : 0.012} />
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
           <CloudShadows baseColor={finalCloudColor} />
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
        const targetOpacity = weather === 'rainy' ? 0.6 : 0;
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
