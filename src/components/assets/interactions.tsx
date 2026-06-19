import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AudioSystem } from '../../lib/audio';
import { useGameStore } from '../../store';

export function useHoverInteraction() {
  const [showHover, setShowHover] = useState(false);
  const [isHoverLeaving, setIsHoverLeaving] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keepHoverAlive = () => {
    setShowHover(true);
    setIsHoverLeaving(false);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setIsHoverLeaving(true);
      hoverTimeout.current = setTimeout(() => {
        setShowHover(false);
        setIsHoverLeaving(false);
      }, 500);
    }, 2000);
  };

  const forceClose = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setShowHover(false);
    setIsHoverLeaving(false);
  };

  return { showHover, isHoverLeaving, keepHoverAlive, forceClose };
}

export function HoverButton({ showHover, isHoverLeaving, keepHoverAlive, onClick, iconSvg, yOffset = 1.4 }: any) {
  if (!showHover && !isHoverLeaving) return null;
  return (
    <Html position={[0, yOffset, 0]} center zIndexRange={[100, 0]}>
      <div
        style={{ padding: '60px', cursor: 'pointer' }}
        onPointerEnter={() => { keepHoverAlive(); }}
        onPointerLeave={() => { keepHoverAlive(); }}
        onClick={onClick}
      >
        <div style={{ animation: 'boatHoverFloat 3s ease-in-out infinite' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(12px)',
              border: '2px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '50%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.2) inset',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              animation: isHoverLeaving ? 'bubblePopOut 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards' : 'bubblePopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              color: '#334155',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15) translateY(-5px)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 1)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255,255,255,0.4) inset'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) translateY(0px)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.2) inset'; }}
          >
            {iconSvg}
          </div>
        </div>
      </div>
    </Html>
  );
}

export function SelectableAssetWrapper({
  assetId,
  children,
}: {
  assetId: string;
  children: ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const helperRef = useRef<THREE.Box3Helper | null>(null);
  const scene = useThree(state => state.scene);
  const selectedTool = useGameStore(state => state.selectedTool);
  const selectedEntityId = useGameStore(state => state.selectedEntityId);
  const setSelectedEntityId = useGameStore(state => state.setSelectedEntityId);
  const isSelected = selectedTool === 'eraser' && selectedEntityId === assetId;

  useEffect(() => {
    if (!isSelected || !groupRef.current) {
      if (helperRef.current) {
        scene.remove(helperRef.current);
        helperRef.current.geometry.dispose();
        (helperRef.current.material as THREE.Material).dispose();
        helperRef.current = null;
      }
      return;
    }

    const helper = new THREE.Box3Helper(new THREE.Box3().setFromObject(groupRef.current), new THREE.Color('#facc15'));
    const material = helper.material as THREE.LineBasicMaterial;
    material.depthTest = false;
    material.transparent = true;
    material.opacity = 0.95;
    helper.renderOrder = 999;
    helperRef.current = helper;
    scene.add(helper);

    return () => {
      scene.remove(helper);
      helper.geometry.dispose();
      material.dispose();
      if (helperRef.current === helper) helperRef.current = null;
    };
  }, [isSelected, scene]);

  useFrame(() => {
    if (isSelected && helperRef.current && groupRef.current) {
      helperRef.current.box.setFromObject(groupRef.current);
      helperRef.current.updateMatrixWorld(true);
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={(e) => {
        if (selectedTool !== 'eraser') return;
        e.stopPropagation();
        const store = useGameStore.getState();
        if (store.selectedEntityId === assetId) {
          store.removeAsset(assetId);
          store.setSelectedEntityId(null);
          AudioSystem.playDig();
        } else {
          setSelectedEntityId(assetId);
        }
      }}
    >
      {children}
    </group>
  );
}
