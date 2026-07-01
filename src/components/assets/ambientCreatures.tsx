import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore, type PlacedAsset } from '../../store';

export function Dolphin(props: any) {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);

    const [params] = useState(() => ({
        radius: 8 + Math.random() * 8,
        speed: 0.8 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
    }));

    const jumpState = useRef({
        isJumping: false,
        jumpTime: 0,
        nextJumpDelay: 5 + Math.random() * 10
    });

    useFrame(({ clock }, delta) => {
        if (!groupRef.current || !bodyRef.current) return;
        const t = clock.elapsedTime;

        const angle = t * params.speed + params.offset;
        groupRef.current.position.x = props.position.x + Math.cos(angle) * params.radius;
        groupRef.current.position.z = props.position.z + Math.sin(angle) * params.radius;
        groupRef.current.rotation.y = -angle + Math.PI;

        const state = jumpState.current;
        state.nextJumpDelay -= delta;

        if (!state.isJumping && state.nextJumpDelay <= 0) {
            state.isJumping = true;
            state.jumpTime = 0;
            useGameStore.getState().spawnVFX('splash', groupRef.current.position);
        }

        if (state.isJumping) {
            state.jumpTime += delta * 1.2;
            const x = (state.jumpTime / 1.0) * 2 - 1;

            if (x >= 1) {
                state.isJumping = false;
                state.nextJumpDelay = 5 + Math.random() * 10;
                bodyRef.current.position.y = -0.5;
                bodyRef.current.rotation.x = 0;
                useGameStore.getState().spawnVFX('splash', groupRef.current.position);
            } else {
                bodyRef.current.position.y = -0.5 + (1 - x * x) * 4;
                bodyRef.current.rotation.x = -x * Math.PI * 0.4;
            }
        } else {
            bodyRef.current.position.y = -0.5 + Math.sin(t * 3) * 0.2;
            bodyRef.current.rotation.x = Math.cos(t * 3) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            <group ref={bodyRef}>
                <mesh castShadow rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.2, 0.4, 1.5, 8]} />
                    <meshStandardMaterial color="#64748b" roughness={0.3} />
                </mesh>
                <mesh castShadow position={[0, 0, 0.75]} rotation={[Math.PI/2, 0, 0]}>
                    <coneGeometry args={[0.2, 0.5, 8]} />
                    <meshStandardMaterial color="#64748b" roughness={0.3} />
                </mesh>
                <mesh castShadow position={[0, 0.3, 0]} rotation={[Math.PI/4, 0, 0]}>
                    <coneGeometry args={[0.1, 0.5, 4]} />
                    <meshStandardMaterial color="#475569" roughness={0.3} />
                </mesh>
                <mesh castShadow position={[0, 0, -0.8]}>
                    <boxGeometry args={[0.6, 0.05, 0.4]} />
                    <meshStandardMaterial color="#475569" roughness={0.3} />
                </mesh>
            </group>
        </group>
    );
}

export function FishSchool(props: any) {
    const groupRef = useRef<THREE.Group>(null);
    const timeOfDay = useGameStore(state => state.timeOfDay);
    const isNight = timeOfDay > 18 || timeOfDay < 6;

    const FISH_COUNT = 6;
    const [fishData] = useState(() => {
        const arr: {
            pos: THREE.Vector3;
            vel: THREE.Vector3;
            phase: number;
        }[] = [];
        for (let i = 0; i < FISH_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 1.5;
            arr.push({
                pos: new THREE.Vector3(
                    props.position.x + Math.cos(angle) * r,
                    -0.5,
                    props.position.z + Math.sin(angle) * r
                ),
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    0,
                    (Math.random() - 0.5) * 0.5
                ),
                phase: Math.random() * Math.PI * 2,
            });
        }
        return arr;
    });

    // Boids 参数
    const BOID_SEP_DIST = 0.6;
    const BOID_ALI_DIST = 2.0;
    const BOID_COH_DIST = 2.5;
    const BOID_MAX_SPEED = 0.8;
    const BOID_CENTER_PULL = 0.3;

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;

        // ── Boids 群游算法 ──────────────────────────────
        const center = new THREE.Vector3(props.position.x, -0.5, props.position.z);

        for (let i = 0; i < fishData.length; i++) {
            const fish = fishData[i];
            const sep = new THREE.Vector3();
            const ali = new THREE.Vector3();
            const coh = new THREE.Vector3();
            let sepCount = 0, aliCount = 0, cohCount = 0;

            for (let j = 0; j < fishData.length; j++) {
                if (i === j) continue;
                const other = fishData[j];
                const dist = fish.pos.distanceTo(other.pos);

                // 分离
                if (dist < BOID_SEP_DIST && dist > 0) {
                    const diff = new THREE.Vector3().subVectors(fish.pos, other.pos).normalize().divideScalar(dist);
                    sep.add(diff);
                    sepCount++;
                }
                // 对齐
                if (dist < BOID_ALI_DIST) {
                    ali.add(other.vel);
                    aliCount++;
                }
                // 聚合
                if (dist < BOID_COH_DIST) {
                    coh.add(other.pos);
                    cohCount++;
                }
            }

            // 应用规则
            if (sepCount > 0) {
                sep.divideScalar(sepCount).normalize().multiplyScalar(0.05);
                fish.vel.add(sep);
            }
            if (aliCount > 0) {
                ali.divideScalar(aliCount).normalize().multiplyScalar(0.02);
                fish.vel.add(ali);
            }
            if (cohCount > 0) {
                coh.divideScalar(cohCount);
                const toCoh = new THREE.Vector3().subVectors(coh, fish.pos).normalize().multiplyScalar(0.03);
                fish.vel.add(toCoh);
            }

            // 朝中心拉回 (防止游太远)
            const toCenter = new THREE.Vector3().subVectors(center, fish.pos);
            if (toCenter.length() > 3) {
                fish.vel.add(toCenter.normalize().multiplyScalar(BOID_CENTER_PULL * delta));
            }

            // 限速
            if (fish.vel.length() > BOID_MAX_SPEED) {
                fish.vel.normalize().multiplyScalar(BOID_MAX_SPEED);
            }

            // 更新位置
            fish.pos.add(fish.vel.clone().multiplyScalar(delta * 2));
            // 保持在水下
            fish.pos.y = -0.5 + Math.sin(t * 2 + fish.phase) * 0.15;
        }

        // ── 更新 mesh ──────────────────────────────────
        groupRef.current.children.forEach((fishGroup, i) => {
            if (i >= fishData.length) return;
            const data = fishData[i];
            fishGroup.position.copy(data.pos);
            // 朝向运动方向
            if (data.vel.lengthSq() > 0.001) {
                const angle = Math.atan2(data.vel.x, data.vel.z);
                fishGroup.rotation.y = angle;
            }
            // 飘尾动画
            const tail = fishGroup.children[1]; // tail mesh
            if (tail) {
                tail.rotation.y = Math.sin(t * 8 + data.phase) * 0.4;
            }
        });
    });

    const bodyColor = isNight ? "#38bdf8" : "#f97316";
    const bellyColor = isNight ? "#0ea5e9" : "#fef3c7";
    const tailColor = isNight ? "#7dd3fc" : "#ea580c";
    const emissiveProps = isNight
        ? { emissive: "#0ea5e9", emissiveIntensity: 4.0, toneMapped: false }
        : {};

    return (
        <group ref={groupRef}>
            {fishData.map((_, i) => (
                <group key={i}>
                    {/* 鱼身 - 纺锤体 */}
                    <mesh rotation={[0, Math.PI / 2, 0]}>
                        <sphereGeometry args={[0.12, 6, 4]} />
                        <meshStandardMaterial color={bodyColor} flatShading {...emissiveProps} />
                    </mesh>
                    {/* 鱼腹 */}
                    <mesh position={[0, -0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <sphereGeometry args={[0.1, 6, 3]} />
                        <meshStandardMaterial color={bellyColor} flatShading {...emissiveProps} />
                    </mesh>
                    {/* 鱼尾 - 飘动 */}
                    <mesh position={[0, 0, -0.15]} rotation={[0, Math.PI, 0]}>
                        <coneGeometry args={[0.1, 0.15, 4]} />
                        <meshStandardMaterial color={tailColor} flatShading {...emissiveProps} />
                    </mesh>
                    {/* 背鳍 */}
                    <mesh position={[0, 0.1, -0.02]} rotation={[0.3, 0, 0]}>
                        <boxGeometry args={[0.02, 0.06, 0.1]} />
                        <meshStandardMaterial color={tailColor} flatShading {...emissiveProps} />
                    </mesh>
                    {/* 眼睛 */}
                    <mesh position={[-0.06, 0.02, 0.08]}>
                        <sphereGeometry args={[0.02, 4, 4]} />
                        <meshStandardMaterial color="#1c1917" />
                    </mesh>
                    <mesh position={[0.06, 0.02, 0.08]}>
                        <sphereGeometry args={[0.02, 4, 4]} />
                        <meshStandardMaterial color="#1c1917" />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

export function Seagull(props: any) {
    const groupRef = useRef<THREE.Group>(null);
    const leftWing = useRef<THREE.Mesh>(null);
    const rightWing = useRef<THREE.Mesh>(null);
    const searchTickRef = useRef(0);

    const flightParams = useMemo(() => ({
        radius: 10 + Math.random() * 20,
        speed: 0.2 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
        baseY: 15 + Math.random() * 10,
        flapSpeed: 10 + Math.random() * 5
    }), []);

    const currentCenter = useRef(new THREE.Vector3(props.position.x, flightParams.baseY, props.position.z));
    const currentRadius = useRef(flightParams.radius);
    const targetCenterRef = useRef(new THREE.Vector3(props.position.x, flightParams.baseY, props.position.z));
    const targetRadiusRef = useRef(flightParams.radius);
    const isGatheringRef = useRef(false);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;
        searchTickRef.current += delta;

        if (searchTickRef.current >= 0.35) {
            searchTickRef.current = 0;
            const assets = useGameStore.getState().assets;
            let nearest: PlacedAsset | null = null;
            let minDistSq = Infinity;

            for (let i = 0; i < assets.length; i++) {
                const asset = assets[i];
                if (asset.type !== 'birdhouse' || asset.customState !== 'gather') continue;
                const dx = asset.position.x - props.position.x;
                const dz = asset.position.z - props.position.z;
                const dSq = dx * dx + dz * dz;
                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    nearest = asset;
                }
            }

            if (nearest) {
                targetCenterRef.current.set(
                    nearest.position.x,
                    nearest.position.y + 2.5 + Math.random(),
                    nearest.position.z
                );
                targetRadiusRef.current = 1.5 + Math.random() * 2;
                isGatheringRef.current = true;
            } else {
                targetCenterRef.current.set(props.position.x, flightParams.baseY, props.position.z);
                targetRadiusRef.current = flightParams.radius;
                isGatheringRef.current = false;
            }
        }

        // Smoothly interpolate current center and radius towards target
        currentCenter.current.lerp(targetCenterRef.current, delta * 1.5);
        currentRadius.current += (targetRadiusRef.current - currentRadius.current) * delta * 1.5;

        const currentSpeedMultiplier = isGatheringRef.current ? 3 : 1;
        const angle = t * flightParams.speed * currentSpeedMultiplier + flightParams.offset;

        groupRef.current.position.x = currentCenter.current.x + Math.cos(angle) * currentRadius.current;
        groupRef.current.position.z = currentCenter.current.z + Math.sin(angle) * currentRadius.current;
        groupRef.current.position.y = currentCenter.current.y + Math.sin(t * 2) * 1.5;

        groupRef.current.rotation.y = -angle + Math.PI;

        const flap = Math.sin(t * flightParams.flapSpeed) * 0.5;
        if (leftWing.current) leftWing.current.rotation.z = -flap;
        if (rightWing.current) rightWing.current.rotation.z = flap;
    });

    return (
        <group ref={groupRef} scale={0.5}>
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.3, 0.3, 0.8]} />
                <meshStandardMaterial color="#f8fafc" />
            </mesh>
            <mesh position={[0, 0.1, 0.5]} rotation={[Math.PI/2, 0, 0]} castShadow>
                <coneGeometry args={[0.08, 0.3, 4]} />
                <meshStandardMaterial color="#facc15" />
            </mesh>
            <group position={[-0.15, 0.1, 0]} ref={leftWing}>
                <mesh position={[-0.4, 0, 0]} castShadow>
                    <boxGeometry args={[0.8, 0.05, 0.3]} />
                    <meshStandardMaterial color="#e2e8f0" />
                </mesh>
            </group>
            <group position={[0.15, 0.1, 0]} ref={rightWing}>
                <mesh position={[0.4, 0, 0]} castShadow>
                    <boxGeometry args={[0.8, 0.05, 0.3]} />
                    <meshStandardMaterial color="#e2e8f0" />
                </mesh>
            </group>
        </group>
    );
}
