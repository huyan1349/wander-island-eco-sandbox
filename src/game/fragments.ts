// 叶笺（向远古神树祈愿时，从落叶中自己挑出的一片）。纯数据 + 纯函数。
// 立意：神树是被森林吞没的图书馆，没写完的句子顺着叶脉生长。每片叶笺，是神明送你的
// 一句话 + 一小段岛屿故事。风格对齐音乐长廊：手绘纸卡 + 满幅纹理，零 emoji。

export type FortuneTier = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶';

export interface NarrativeFragment {
  id: string;
  tier: FortuneTier;
  tierColor: string;
  /** 卡面渐变底 */
  bg: string;
  /** 签名（叶笺之名） */
  title: string;
  /** 神谕：神明送你的一句话 */
  oracle: string;
  /** 故事：一小段岛屿叙事 */
  story: string;
  /** 背面印记：一个意象关键词 */
  keyword: string;
  good: string;
  avoid: string;
  motif: 'sprout' | 'wave' | 'lantern' | 'leaf' | 'star' | 'petal' | 'moon' | 'bare' | 'wind' | 'ripple';
  weight: number;
}

export const NARRATIVE_FRAGMENTS: NarrativeFragment[] = [
  {
    id: 'f_wanmu', tier: '大吉', tierColor: '#f59e0b', motif: 'sprout', weight: 1, keyword: '生长',
    bg: 'radial-gradient(ellipse at 50% 120%, rgba(132,204,22,0.5), transparent 62%), linear-gradient(160deg, rgba(245,158,11,0.22), rgba(22,101,52,0.1))',
    title: '万木生', oracle: '「你种下的，我都记着。」',
    story: '很久以前，这座岛光秃秃的。是一个不肯离开的人，一粒一粒把它种成了森林。他走后，神树替他守着——所以你今天埋下的每一颗种子，都会有谁，在你看不见的某个清晨，替你看着它抽芽。',
    good: '广植林木 · 引一道活水', avoid: '急于求成',
  },
  {
    id: 'f_chaoxin', tier: '中吉', tierColor: '#d97706', motif: 'wave', weight: 3, keyword: '时机',
    bg: 'radial-gradient(ellipse at 30% 120%, rgba(180,83,9,0.46), transparent 60%), linear-gradient(160deg, rgba(217,119,6,0.2), rgba(120,53,15,0.08))',
    title: '潮信', oracle: '「该来的，会按时来。」',
    story: '潮水是岛写给远方的信，一天两次，从不耽搁。它记得每一艘驶离的船，也记得每一句没说出口的「等你」——你想等的那件事，正随着某一次涨潮，慢慢靠岸。',
    good: '出海远航 · 静候海鸥', avoid: '在退潮时下结论',
  },
  {
    id: 'f_chuying', tier: '中吉', tierColor: '#ec4899', motif: 'petal', weight: 3, keyword: '告别',
    bg: 'radial-gradient(ellipse at 50% 0%, rgba(251,207,232,0.6), transparent 64%), linear-gradient(160deg, rgba(244,114,182,0.2), rgba(219,39,119,0.08))',
    title: '初樱', oracle: '「落下，也是一种圆满。」',
    story: '这座岛只在有人离开时开花。樱是它学会的唯一一种告别：开得越盛，落得越多，便记得那个人越久。所以别舍不得——飘落的不是失去，是岛在替你，把这段时光好好收藏。',
    good: '种一棵樱 · 道别要温柔', avoid: '舍不得已落下的',
  },
  {
    id: 'f_fengxin', tier: '中吉', tierColor: '#0ea5e9', motif: 'wind', weight: 3, keyword: '转机',
    bg: 'radial-gradient(ellipse at 20% 10%, rgba(125,211,252,0.46), transparent 60%), linear-gradient(160deg, rgba(14,165,233,0.18), rgba(15,23,42,0.1))',
    title: '风信', oracle: '「风转了，先动的人走得最远。」',
    story: '岛上的风从不空手而来。它掠过沉船的桅、捎走灯塔的光，把远方的消息一路抖落在叶尖。神树说，听见风换了方向的人很多，敢在那一刻先扬帆的人，却很少。',
    good: '主动出击 · 接住一次邀约', avoid: '原地观望太久',
  },
  {
    id: 'f_dengxia', tier: '小吉', tierColor: '#f59e0b', motif: 'lantern', weight: 4, keyword: '微光',
    bg: 'radial-gradient(circle at 50% 18%, rgba(254,240,138,0.55), transparent 62%), linear-gradient(180deg, rgba(254,243,199,0.22), rgba(120,53,15,0.1))',
    title: '灯下', oracle: '「先点亮脚下就好。」',
    story: '雾最浓的那夜，最后的守岛人把自己变成了一盏灯。他照不到整片海，只照亮船头到礁石那一小段——可正是那一小段，让无数迷路的人，平安靠了岸。',
    good: '夜里点一盏灯 · 修缮旧物', avoid: '独自走得太远',
  },
  {
    id: 'f_yueluo', tier: '小吉', tierColor: '#60a5fa', motif: 'moon', weight: 4, keyword: '留白',
    bg: 'radial-gradient(circle at 50% 14%, rgba(186,230,253,0.55), transparent 60%), linear-gradient(180deg, rgba(148,163,184,0.16), rgba(30,58,138,0.18))',
    title: '月落', oracle: '「缺一角，光才进得来。」',
    story: '月亮把照不到的那一面，悄悄留给了这座岛。岛从不觉得遗憾——它说，正因为有照不亮的角落，星星才有地方住下，梦才有地方落脚。圆满太挤了，留点缺口吧。',
    good: '早些歇息 · 学会留白', avoid: '事事求圆满',
  },
  {
    id: 'f_yemai', tier: '吉', tierColor: '#10b981', motif: 'leaf', weight: 4, keyword: '顺势',
    bg: 'radial-gradient(ellipse at 72% 8%, rgba(132,204,22,0.46), transparent 60%), linear-gradient(160deg, rgba(22,101,52,0.2), rgba(20,83,45,0.08))',
    title: '叶脉', oracle: '「顺着光长，别和风争。」',
    story: '这里曾是云海中最大的图书馆，后来被森林温柔地吞没。那些没写完的句子，如今顺着叶脉继续生长——它们从不争论该往哪写，只是顺着光，一寸一寸，把自己舒展成想要的样子。',
    good: '顺其自然 · 听一首旧歌', avoid: '与风争辩',
  },
  {
    id: 'f_nianlun', tier: '吉', tierColor: '#a16207', motif: 'ripple', weight: 4, keyword: '沉淀',
    bg: 'radial-gradient(circle at 50% 50%, rgba(202,138,4,0.38), transparent 62%), linear-gradient(160deg, rgba(120,53,15,0.2), rgba(41,37,36,0.1))',
    title: '年轮', oracle: '「慢，是岛给你的天赋。」',
    story: '神树的身体里，藏着这座岛所有的年份。你以为荒废的那些日子，其实都被它悄悄收进了年轮——一圈挨着一圈，看似什么都没发生，却在你看不见的地方，长成了日后撑住你的那一部分。',
    good: '复盘旧事 · 打磨手艺', avoid: '与人比快',
  },
  {
    id: 'f_xingtu', tier: '末吉', tierColor: '#818cf8', motif: 'star', weight: 3, keyword: '指引',
    bg: 'radial-gradient(circle at 50% 16%, rgba(129,140,248,0.46), transparent 62%), linear-gradient(180deg, rgba(99,102,241,0.16), rgba(30,27,75,0.22))',
    title: '星图', oracle: '「缺的那一角，等你抬头。」',
    story: '观星台的石面上刻着一张星图，缺了一角，没人补得上。神树说那不是残缺——是岛特意留白，等某个愿意抬头的人，用自己的目光把它接完。今夜的那个人，也许就是你。',
    good: '登观星台 · 记下一个心愿', avoid: '低头太久',
  },
  {
    id: 'f_kurong', tier: '凶', tierColor: '#64748b', motif: 'bare', weight: 2, keyword: '蛰伏',
    bg: 'radial-gradient(ellipse at 50% 110%, rgba(100,116,139,0.4), transparent 62%), linear-gradient(160deg, rgba(71,85,105,0.2), rgba(15,23,42,0.14))',
    title: '枯荣', oracle: '「枯，是荣的另一种写法。」',
    story: '这座岛枯过一次。那年海水退得很远，草木尽数低伏，连神树都落光了叶。可它把根扎得更深，默默等了整整一个季节——再抬头时，绿意已漫过了整座岛。它记得那段暗，所以更舍得等你。',
    good: '守住根 · 耐心等待', avoid: '此刻远行 · 轻言放弃',
  },
];

/** 加权随机抽一签（测试期不限次数，可重复）。玩家挑哪张牌都揭示这一签。 */
export function pickFragment(_collected: string[]): NarrativeFragment {
  const total = NARRATIVE_FRAGMENTS.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of NARRATIVE_FRAGMENTS) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return NARRATIVE_FRAGMENTS[0];
}

export function getFragmentById(id: string): NarrativeFragment | undefined {
  return NARRATIVE_FRAGMENTS.find(f => f.id === id);
}
