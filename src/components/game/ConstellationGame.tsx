import { useGameStore } from '../../store';
import { CONSTELLATIONS } from '../../game/constellations';
import { StarField } from './StarField';
import { ConstellationBoard, UnlockedConstellation } from './ConstellationBoard';

// 观星编排：仰视星空 + 散布的星座。未解锁的可连线，连成解锁星卡；已解锁的永久点亮。
export function ConstellationGame() {
  const isObservatoryMode = useGameStore((s) => s.isObservatoryMode);
  const unlocked = useGameStore((s) => s.unlockedConstellations);
  const unlockConstellation = useGameStore((s) => s.unlockConstellation);
  const obs = useGameStore((s) => s.observatoryPos);

  if (!isObservatoryMode) return null;

  // 整座星穹以观星台为中心
  return (
    <group position={obs ?? [0, 0, 0]}>
      <StarField />
      {CONSTELLATIONS.map((c) =>
        unlocked.includes(c.id)
          ? <UnlockedConstellation key={c.id} c={c} />
          : <ConstellationBoard key={c.id} c={c} onComplete={unlockConstellation} />,
      )}
    </group>
  );
}
