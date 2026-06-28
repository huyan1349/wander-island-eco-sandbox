// 星图数据：散布在天穹球面上的星座，用望远镜摆动 + 缩放观测。纯数据，加星座只改这里。
// 卡面风格对齐叶笺（fragments.ts）：手绘纸卡 + 神谕一句话 + 一段岛屿留白故事，零 emoji。

export interface StarCard {
  title: string;   // 星座中文名
  latin: string;   // 拉丁名
  oracle: string;  // 神谕：一句话
  story: string;   // 一小段岛屿叙事（占位 lore，可后续润色）
  keyword: string; // 背面意象
  bg: string;      // 卡面渐变底（深夜 + 暖星光）
}

export interface Constellation {
  id: string;
  card: StarCard;
  /** 星座中心朝向：[方位角°, 仰角°]（0°方位看向 -Z，仰角越大越接近天顶） */
  dir: [number, number];
  /** 主星相对中心的偏移，单位「度」：[Δ方位, Δ仰角] */
  nodes: [number, number][];
  /** 连线（节点下标对） */
  edges: [number, number][];
}

// 天穹半径。星穹以「本地原点」为中心生成，再由 ConstellationGame 整体平移到观星台。
// EYE 即本地原点（眼点），TelescopeControls 会把相机放到观星台世界坐标上。
export const EYE: [number, number, number] = [0, 0, 0];
export const EYE_HEIGHT = 5; // 相对观星台基座的目镜高度
export const SKY_R = 300;

/** 球面方向 → 本地坐标（以原点为心、SKY_R 为半径的天穹上） */
export function skyPoint(azDeg: number, altDeg: number): [number, number, number] {
  const az = (azDeg * Math.PI) / 180;
  const alt = (altDeg * Math.PI) / 180;
  const ca = Math.cos(alt);
  return [SKY_R * ca * Math.sin(az), SKY_R * Math.sin(alt), -SKY_R * ca * Math.cos(az)];
}

/** 取某星座某节点的世界坐标 */
export function nodeWorld(c: Constellation, i: number): [number, number, number] {
  return skyPoint(c.dir[0] + c.nodes[i][0], c.dir[1] + c.nodes[i][1]);
}

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'orion', dir: [-40, 55],
    nodes: [[-4, 6], [4, 5], [-2, -1], [0, -2], [2, -3], [-5, -9], [5, -8]],
    edges: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]],
    card: {
      title: '猎户', latin: 'Orion',
      oracle: '「腰间三颗星，是岛替你系紧的行囊。」',
      story: '老人们说，猎户每年冬天都来岛上一次，从不上岸，只在海平面上站一会儿就走。他不是来打猎的——他是来看看，那个等他的人今年还在不在。',
      keyword: '远行', bg: 'radial-gradient(ellipse at 50% 120%, rgba(96,130,255,0.4), transparent 62%), linear-gradient(160deg, rgba(99,102,241,0.18), rgba(15,23,42,0.6))',
    },
  },
  {
    id: 'dipper', dir: [30, 65],
    nodes: [[-8, 3], [-8, -1], [-3, -2], [-1, 1], [3, 1], [7, 0], [11, 2]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
    card: {
      title: '北斗', latin: 'Ursa Major',
      oracle: '「迷路的人抬头，斗柄就指向家。」',
      story: '岛没有名字，也不在任何海图上。可只要北斗还在，回来的人就总能找到它——勺柄一路扫过去的尽头，那点最暗的光，就是这里。',
      keyword: '指引', bg: 'radial-gradient(ellipse at 50% 120%, rgba(250,204,21,0.34), transparent 62%), linear-gradient(160deg, rgba(217,119,6,0.16), rgba(15,23,42,0.6))',
    },
  },
  {
    id: 'cassiopeia', dir: [78, 50],
    nodes: [[-8, -1], [-4, 3], [0, -1], [4, 3], [8, -1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
    card: {
      title: '仙后', latin: 'Cassiopeia',
      oracle: '「她坐在天上，只为多看这座岛一眼。」',
      story: '一个写成 W 的字，没人读得懂。神树说那是某位王后留下的，她把岛托付给星空时太匆忙，话没说完，就被升上去了——所以那道折线，永远缺最后一笔。',
      keyword: '守望', bg: 'radial-gradient(ellipse at 50% 120%, rgba(244,114,182,0.32), transparent 62%), linear-gradient(160deg, rgba(190,24,93,0.16), rgba(15,23,42,0.6))',
    },
  },
  {
    id: 'scorpius', dir: [-78, 45],
    nodes: [[-7, 6], [-4, 4], [-1, 2], [1, 0], [2, -3], [1, -6], [-2, -8]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
    card: {
      title: '天蝎', latin: 'Scorpius',
      oracle: '「最红的那颗心，是岛没说出口的火。」',
      story: '蝎子的心是一颗将熄未熄的红星。渔民忌讳它，说它一升起，夏天就要走了。可岛偏爱它——一年里总得有一颗星，敢替所有人，把不舍明明白白地烧出来。',
      keyword: '炽热', bg: 'radial-gradient(ellipse at 50% 120%, rgba(248,113,113,0.36), transparent 62%), linear-gradient(160deg, rgba(185,28,28,0.18), rgba(15,23,42,0.6))',
    },
  },
  {
    id: 'cygnus', dir: [0, 78],
    nodes: [[0, 8], [0, 0], [0, -8], [-7, 1], [7, -1]],
    edges: [[0, 1], [1, 2], [3, 1], [1, 4]],
    card: {
      title: '天鹅', latin: 'Cygnus',
      oracle: '「它一路向南，把夏天驮在背上。」',
      story: '天鹅沿着银河飞，翅膀正好搭成一个十字。岛上有人说，那是所有从这里离开、却再没回来的船，最后都变成了它的羽毛——所以它飞得那么慢，舍不得。',
      keyword: '归途', bg: 'radial-gradient(ellipse at 50% 120%, rgba(125,211,252,0.34), transparent 62%), linear-gradient(160deg, rgba(2,132,199,0.16), rgba(15,23,42,0.6))',
    },
  },
  {
    id: 'leo', dir: [125, 48],
    nodes: [[-6, -2], [-3, 1], [-5, 4], [-8, 3], [5, -3], [1, -5]],
    edges: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 0]],
    card: {
      title: '狮子', latin: 'Leo',
      oracle: '「春天回来时，先派它来探路。」',
      story: '狮子的鬃毛是一把倒挂的镰刀。它一出现在东边的天上，岛就知道：冰要化了，草要绿了，那个说过「开春再来」的人，也快了。',
      keyword: '回春', bg: 'radial-gradient(ellipse at 50% 120%, rgba(251,191,36,0.34), transparent 62%), linear-gradient(160deg, rgba(202,138,4,0.16), rgba(15,23,42,0.6))',
    },
  },
  {
    id: 'lyra', dir: [-125, 58],
    nodes: [[-3, 3], [0, 3], [3, 2], [2, -2], [-2, -1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]],
    card: {
      title: '天琴', latin: 'Lyra',
      oracle: '「织女把弦留在天上，等人来弹。」',
      story: '一架没有琴身的琴，只剩五根星做的弦。夜深时若你听见岛在哼一支没听过的调子，别回头——那是织女在试音，她已经等这座岛，弹了很久很久了。',
      keyword: '余音', bg: 'radial-gradient(ellipse at 50% 120%, rgba(167,139,250,0.34), transparent 62%), linear-gradient(160deg, rgba(124,58,237,0.16), rgba(15,23,42,0.6))',
    },
  },
];

const STORE_KEY = 'wander_unlocked_constellations';

export function loadUnlocked(): string[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveUnlocked(ids: string[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}
