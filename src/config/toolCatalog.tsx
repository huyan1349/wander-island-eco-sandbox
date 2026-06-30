import type { LucideIcon } from "lucide-react";
import {
  AlignEndHorizontal,
  Anchor,
  Armchair,
  ArrowDown,
  ArrowUp,
  Castle,
  Carrot,
  Clover,
  Cloud,
  Columns,
  Dog,
  Droplet,
  Droplets,
  Eraser,
  Fence,
  Fish,
  Flame,
  Flower2,
  Globe,
  Hammer,
  Home,
  Lamp,
  LifeBuoy,
  Link,
  Mailbox,
  Maximize2,
  Mountain,
  MountainSnow,
  MousePointer2,
  Rabbit,
  Route,
  Shovel,
  Ship,
  Signpost,
  Sprout,
  Star,
  Telescope,
  Tent,
  TowerControl,
  TreeDeciduous,
  TreePalm,
  TreePine,
  Waves,
  Wheat,
  Wind,
  Bird,
  Train,
} from "lucide-react";
import type { ToolType, WeatherType } from "../store";

export interface ToolDefinition {
  id: ToolType;
  icon: LucideIcon;
  label: string;
  cost: number;
}

export interface ToolCategory {
  name: string;
  icon: LucideIcon;
  tools: ToolDefinition[];
}

// 提灯少女专属图标：手绘风的提灯小人，不复用路灯图标。
export const LanternGirlIcon = ((props: any) => (
  <svg
    viewBox="0 0 24 24"
    width={props.size ?? 24}
    height={props.size ?? 24}
    fill="none"
    stroke="currentColor"
    strokeWidth={props.strokeWidth ?? 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <circle cx="9" cy="4.5" r="2" />
    <path d="M9 6.5v5.5" />
    <path d="M6.5 8.5h5" />
    <path d="M6.8 19l2.2-7 2.2 7" />
    <path d="M14 8.5h2.6" />
    <path d="M15.3 8.5v2.4" />
    <rect x="13.6" y="11" width="3.4" height="4.2" rx="0.6" />
    <path d="M15.3 15.2v3.4" />
  </svg>
)) as unknown as LucideIcon;

export const MODE_TOOLS: Array<{ id: "none" | "eraser"; icon: LucideIcon; label: string }> = [
  { id: "none", icon: MousePointer2, label: "选择 / 观察" },
  { id: "eraser", icon: Eraser, label: "橡皮擦" },
];

export const BUILD_CATEGORIES: ToolCategory[] = [
  {
    name: "自然",
    icon: TreePine,
    tools: [
      { id: "treeA", icon: TreePine, label: "松树", cost: 0 },
      { id: "treeB", icon: TreeDeciduous, label: "秋季树", cost: 0 },
      { id: "cherry_tree", icon: Flower2, label: "樱花树", cost: 200 },
      { id: "willow_tree", icon: TreeDeciduous, label: "垂柳", cost: 180 },
      { id: "pine_tree", icon: TreePine, label: "云杉", cost: 150 },
      { id: "bamboo", icon: Sprout, label: "竹子", cost: 100 },
      { id: "bush", icon: Clover, label: "灌木丛", cost: 50 },
      { id: "spirit_tree", icon: Star, label: "远古神树", cost: 1000 },
      { id: "rock", icon: Mountain, label: "岩石", cost: 0 },
      { id: "spring", icon: Droplets, label: "生命之泉", cost: 1500 },
    ],
  },
  {
    name: "生物",
    icon: Rabbit,
    tools: [
      { id: "deer", icon: Rabbit, label: "鹿", cost: 300 },
      { id: "wolf", icon: Dog, label: "狼", cost: 800 },
      { id: "seagull", icon: Bird, label: "海鸥", cost: 100 },
      { id: "dolphin", icon: Waves, label: "海豚", cost: 500 },
      { id: "fish", icon: Fish, label: "荧光鱼群", cost: 150 },
    ],
  },
  {
    name: "地形",
    icon: Mountain,
    tools: [
      { id: "terrainUp", icon: ArrowUp, label: "隆起地形", cost: 0 },
      { id: "terrainDown", icon: ArrowDown, label: "降低地形（可挖谷）", cost: 0 },
      { id: "pond", icon: Waves, label: "水塘 / 湖泊", cost: 100 },
      { id: "water_flow", icon: Waves, label: "河流（拖绘）", cost: 0 },
      { id: "waterfall", icon: Waves, label: "瀑布（点两下 · 高→低）", cost: 0 },
      { id: "pave", icon: Hammer, label: "铺设石板路", cost: 0 },
    ],
  },
  {
    name: "建筑",
    icon: Home,
    tools: [
      { id: "house", icon: Home, label: "温馨小屋", cost: 500 },
      { id: "windmill", icon: Wind, label: "风车", cost: 1000 },
      { id: "lighthouse", icon: TowerControl, label: "灯塔", cost: 2000 },
      { id: "tent", icon: Tent, label: "帐篷", cost: 100 },
      { id: "campfire", icon: Flame, label: "营火", cost: 50 },
      { id: "fence", icon: Fence, label: "木栅栏", cost: 20 },
      { id: "well", icon: Droplet, label: "水井", cost: 150 },
      { id: "bench", icon: Armchair, label: "长椅", cost: 40 },
      { id: "sign", icon: Signpost, label: "牌子（可写字）", cost: 0 },
      { id: "mailbox", icon: Mailbox, label: "信箱（点击查看）", cost: 0 },
      { id: "streetlamp", icon: Lamp, label: "路灯", cost: 200 },
      { id: "lantern_girl", icon: LanternGirlIcon, label: "提灯石像", cost: 0 },
      { id: "observatory", icon: Telescope, label: "观星台", cost: 1500 },
      { id: "ruins_arch", icon: Castle, label: "遗迹石门", cost: 2000 },
      { id: "waterwheel", icon: LifeBuoy, label: "巨型水车", cost: 1800 },
    ],
  },
  {
    name: "农业",
    icon: Wheat,
    tools: [
      { id: "hoe", icon: Shovel, label: "开垦农田", cost: 10 },
      { id: "seed_wheat", icon: Wheat, label: "播种小麦", cost: 5 },
      { id: "seed_carrot", icon: Carrot, label: "播种胡萝卜", cost: 5 },
    ],
  },
  {
    name: "海洋",
    icon: Waves,
    tools: [
      { id: "platform", icon: Anchor, label: "海上浮板", cost: 50 },
      { id: "pier", icon: AlignEndHorizontal, label: "固定码头", cost: 60 },
      { id: "sub_island", icon: MountainSnow, label: "人造副岛", cost: 3000 },
      { id: "boat", icon: Ship, label: "小船", cost: 80 },
      { id: "raft", icon: TreePalm, label: "木筏", cost: 40 },
      { id: "bridge_pillar", icon: Columns, label: "打桩/地基", cost: 100 },
      { id: "bridge", icon: Route, label: "架设悬索桥", cost: 150 },
      { id: "rope", icon: Link, label: "小船系绳", cost: 30 },
      { id: "birdhouse", icon: Mailbox, label: "海鸥亭", cost: 50 },
    ],
  },
  {
    name: "天空",
    icon: Cloud,
    tools: [
      { id: "balloon", icon: Cloud, label: "热气球(系绳)", cost: 120 },
      { id: "balloon_ladder", icon: Cloud, label: "热气球(软梯)", cost: 150 },
      { id: "balloon_bridge", icon: Cloud, label: "热气球(吊桥)", cost: 200 },
    ],
  },
  {
    name: "交通",
    icon: Train,
    tools: [
      { id: "track", icon: Route, label: "铁轨(拖绘)", cost: 0 },
      { id: "train", icon: Train, label: "蒸汽火车", cost: 1000 },
    ],
  },
];

export const WEATHER_OPTIONS: Array<[WeatherType, string]> = [
  ["sunny", "晴天"],
  ["rainy", "雨天"],
  ["snowy", "雪天"],
  ["cloudy", "多云"],
  ["foggy", "浓雾"],
  ["stormy", "雷暴"],
];
