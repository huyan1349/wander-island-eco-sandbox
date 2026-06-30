import type { BiomeType, PlacedAsset, SeasonType, WeatherType } from './types';

export interface GameStats {
  playtime: number;
  itemsPlaced: number;
}

export interface TerrainSnapshot {
  positions?: Float32Array | number[] | null;
  types?: Uint8Array | number[] | null;
}

export interface IslandSavePayload {
  timeOfDay: number;
  weather: WeatherType;
  season: SeasonType;
  biome: BiomeType;
  assets: PlacedAsset[];
  grassHealth: number;
  deerCount: number;
  wolfCount: number;
  playerName: string;
  playerAvatar: string;
  playerXP: number;
  playerLevel: number;
  ecoPoints: number;
  awakening: number;
  unlockedAssets?: string[];
  stats: GameStats;
  terrainPositions: number[] | null;
  terrainTypes: number[] | null;
}

export interface IslandExportPayload extends IslandSavePayload {
  format: 'wander-island';
  version: 2;
  name: string;
  savedAt: number;
}

interface SaveSource extends Omit<Partial<IslandSavePayload>, 'stats'> {
  islandName?: string;
  name?: string;
  terrainData?: TerrainSnapshot;
  stats?: Partial<GameStats>;
}

interface SaveDefaults {
  playerName?: string;
  playerAvatar?: string;
  season?: SeasonType;
  biome?: BiomeType;
  statsItemsPlacedFallback?: number;
  now?: number;
}

const WEATHER_TYPES: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'foggy', 'snowy', 'stormy'];
const SEASON_TYPES: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];
const BIOME_TYPES: BiomeType[] = ['default', 'forest', 'desert', 'tundra', 'volcanic'];

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function coerceEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function coerceNumberArray(value: unknown): number[] | null {
  if (!value) return null;
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) return null;
  const numbers = Array.from(value as ArrayLike<number>)
    .map(Number)
    .filter(Number.isFinite);
  return numbers;
}

function coerceUnlockedAssets(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((id): id is string => typeof id === 'string');
}

export function buildIslandSavePayload(source: SaveSource, defaults: SaveDefaults = {}): IslandSavePayload {
  const assets = Array.isArray(source.assets) ? source.assets : [];
  const stats = source.stats || {};
  const terrainPositions = source.terrainData?.positions ?? source.terrainPositions;
  const terrainTypes = source.terrainData?.types ?? source.terrainTypes;

  return {
    timeOfDay: coerceNumber(source.timeOfDay, 6),
    weather: coerceEnum(source.weather, WEATHER_TYPES, 'sunny'),
    season: coerceEnum(source.season, SEASON_TYPES, defaults.season ?? 'summer'),
    biome: coerceEnum(source.biome, BIOME_TYPES, defaults.biome ?? 'default'),
    assets,
    grassHealth: coerceNumber(source.grassHealth, 100),
    deerCount: coerceNumber(source.deerCount, 0),
    wolfCount: coerceNumber(source.wolfCount, 0),
    playerName: coerceString(source.playerName, defaults.playerName ?? 'wander'),
    playerAvatar: coerceString(source.playerAvatar, defaults.playerAvatar ?? ''),
    playerXP: coerceNumber(source.playerXP, 0),
    playerLevel: coerceNumber(source.playerLevel, 1),
    ecoPoints: coerceNumber(source.ecoPoints, 200),
    awakening: coerceNumber(source.awakening, 0),
    unlockedAssets: coerceUnlockedAssets(source.unlockedAssets),
    stats: {
      playtime: coerceNumber(stats.playtime, 0),
      itemsPlaced: coerceNumber(stats.itemsPlaced, defaults.statsItemsPlacedFallback ?? assets.length),
    },
    terrainPositions: coerceNumberArray(terrainPositions),
    terrainTypes: coerceNumberArray(terrainTypes),
  };
}

export function buildIslandExportPayload(source: SaveSource, defaults: SaveDefaults = {}): IslandExportPayload {
  return {
    format: 'wander-island',
    version: 2,
    name: coerceString(source.name, coerceString(source.islandName, 'Wander Island')),
    savedAt: defaults.now ?? Date.now(),
    ...buildIslandSavePayload(source, defaults),
  };
}

export function normalizeIslandSavePayload(data: unknown, defaults: SaveDefaults = {}): IslandSavePayload {
  return buildIslandSavePayload((data && typeof data === 'object' ? data : {}) as SaveSource, defaults);
}
