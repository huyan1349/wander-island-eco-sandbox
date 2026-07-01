import { useGameStore, PlacedAsset } from '../store';
import { memo } from 'react';
import {
  Balloon as MarineBalloon,
  Boat as MarineBoat,
  BridgePillar as MarineBridgePillar,
  BridgeRenderer as MarineBridgeRenderer,
  MarineAssetIndexProvider,
  Pier as MarinePier,
  Platform as MarinePlatform,
  RopeRenderer as MarineRopeRenderer,
} from './assets/marine';
import { RaftAsset } from './assets/RaftAsset';
import { SelectableAssetWrapper } from './assets/interactions';
import { TreeA, TreeB, Rock, CherryTree, Bamboo, PineTree, WillowTree, Bush } from './assets/Plants';
import { Crop, Farmland } from './assets/crops';
import { Fence, Tent, Well } from './assets/rusticProps';
import { Pond, Spring, Stream, WaterfallStroke } from './assets/waterAssets';
import { Observatory, RuinsArch, SpiritTree, Waterwheel } from './assets/landmarks';
import { Deer, Wolf } from './assets/creatures';
import { Dolphin, FishSchool, Seagull } from './assets/ambientCreatures';
import { House, LanternGirl, Lighthouse, Streetlamp, Windmill } from './assets/buildings';
import { SubIsland } from './assets/SubIsland';
import { Bench, Birdhouse, Campfire, Mailbox, Sign } from './assets/interactiveProps';
import { VFXSystem } from './effects/AmbientParticles';
import { TrackAsset, TrainAsset } from './assets/TrainSystem';

const AssetInstance = memo(function AssetInstance({ asset }: { asset: PlacedAsset }) {
  let content: React.ReactNode = null;

  switch (asset.type) {
    case 'treeA': content = <TreeA {...asset} />; break;
    case 'treeB': content = <TreeB {...asset} />; break;
    case 'rock': content = <Rock {...asset} />; break;
    case 'deer': content = <Deer {...asset} />; break;
    case 'wolf': content = <Wolf {...asset} />; break;
    case 'seagull': content = <Seagull {...asset} />; break;
    case 'dolphin': content = <Dolphin {...asset} />; break;
    case 'fish': content = <FishSchool {...asset} />; break;
    case 'spring': content = <Spring {...asset} />; break;
    case 'pond': content = <Pond {...asset} />; break;
    case 'water_flow': content = <Stream {...asset} />; break;
    case 'waterfall': content = <WaterfallStroke {...asset} />; break;
    case 'streetlamp': content = <Streetlamp {...asset} />; break;
    case 'lantern_girl': content = <LanternGirl {...asset} />; break;
    case 'house': content = <House {...asset} />; break;
    case 'windmill': content = <Windmill {...asset} />; break;
    case 'lighthouse': content = <Lighthouse {...asset} />; break;
    case 'platform': content = <MarinePlatform {...asset} />; break;
    case 'pier': content = <MarinePier {...asset} />; break;
    case 'bridge_pillar': content = <MarineBridgePillar {...asset} assetId={asset.id} />; break;
    case 'boat': content = <MarineBoat {...asset} />; break;
    case 'raft': content = <RaftAsset {...asset} />; break;
    case 'balloon':
    case 'balloon_ladder':
    case 'balloon_bridge': content = <MarineBalloon {...asset} />; break;
    case 'sub_island': content = <SubIsland {...asset} />; break;
    case 'birdhouse': content = <Birdhouse {...asset} />; break;
    case 'hoe':
    case 'farmland': content = <Farmland {...asset} />; break;
    case 'crop_wheat':
    case 'crop_carrot': content = <Crop {...asset} />; break;
    case 'tent': content = <Tent {...asset} />; break;
    case 'campfire': content = <Campfire {...asset} />; break;
    case 'fence': content = <Fence {...asset} />; break;
    case 'well': content = <Well {...asset} />; break;
    case 'bench': content = <Bench {...asset} />; break;
    case 'spirit_tree': content = <SpiritTree {...asset} />; break;
    case 'observatory': content = <Observatory {...asset} />; break;
    case 'ruins_arch': content = <RuinsArch {...asset} />; break;
    case 'waterwheel': content = <Waterwheel {...asset} />; break;
    case 'cherry_tree': content = <CherryTree {...asset} />; break;
    case 'bamboo': content = <Bamboo {...asset} />; break;
    case 'pine_tree': content = <PineTree {...asset} />; break;
    case 'willow_tree': content = <WillowTree {...asset} />; break;
    case 'bush': content = <Bush {...asset} />; break;
    case 'sign': content = <Sign {...asset} assetId={asset.id} />; break;
    case 'mailbox': content = <Mailbox {...asset} assetId={asset.id} />; break;
    case 'track': content = <TrackAsset asset={asset} />; break;
    case 'train': content = <TrainAsset asset={asset} />; break;
    default: content = null;
  }

  if (!content) return null;
  return (
    <SelectableAssetWrapper assetId={asset.id}>
      {content}
    </SelectableAssetWrapper>
  );
});

export function Assets() {
  const assets = useGameStore(state => state.assets);

  return (
    <MarineAssetIndexProvider assets={assets}>
      <VFXSystem />
      <MarineRopeRenderer />
      <MarineBridgeRenderer />
      {assets.map(asset => <AssetInstance key={asset.id} asset={asset} />)}
    </MarineAssetIndexProvider>
  );
}
