import { useThree } from '@react-three/fiber';
import { Bloom, BrightnessContrast, DepthOfField, EffectComposer, HueSaturation, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

interface PhotoSettings {
  focusTarget?: [number, number, number] | null;
  focusDistance: number;
  focusRange?: number;
  focalLength: number;
  bokehScale: number;
}

interface PostProcessingEffectsProps {
  isPhotoMode: boolean;
  photoSettings: PhotoSettings;
  hue: number;
  saturation: number;
  brightness: number;
  contrast: number;
}

function DynamicDOF({ photoSettings }: { photoSettings: PhotoSettings }) {
  const { camera } = useThree();
  const targetVec = photoSettings.focusTarget ? new THREE.Vector3(...photoSettings.focusTarget) : undefined;
  let worldDist = photoSettings.focusDistance * (camera.far - camera.near);
  if (targetVec) worldDist = camera.position.distanceTo(targetVec);

  return (
    <DepthOfField
      worldFocusDistance={worldDist}
      worldFocusRange={photoSettings.focusRange ?? 14}
      focalLength={photoSettings.focalLength}
      bokehScale={photoSettings.bokehScale}
      height={480}
    />
  );
}

export function PostProcessingEffects({
  isPhotoMode,
  photoSettings,
  hue,
  saturation,
  brightness,
  contrast,
}: PostProcessingEffectsProps) {
  return (
    <EffectComposer multisampling={0}>
      {isPhotoMode && <DynamicDOF photoSettings={photoSettings} />}
      <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.8} intensity={1.5} mipmapBlur />
      <HueSaturation saturation={saturation} hue={hue} />
      {isPhotoMode && <BrightnessContrast brightness={brightness} contrast={contrast} />}
      <Vignette eskil={false} offset={0.15} darkness={0.8} />
    </EffectComposer>
  );
}
