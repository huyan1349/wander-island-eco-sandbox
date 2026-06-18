const PptxGenJS = require("pptxgenjs");
const {
  autoFontSize,
  calcTextBox,
  imageSizingContain,
  warnIfSlideHasOverlaps,
  warnIfSlideElementsOutOfBounds,
} = require("./pptxgenjs_helpers");

// ─── Theme ───────────────────────────────────────────────────────────
const C = {
  bg:        "FAF8F5",   // 米白底
  charcoal:  "1F2937",   // 深炭文字
  terracotta:"B45309",   // 赭红主色
  slate:     "64748B",   // 青灰辅色
  lightGray: "E2E8F0",   // 浅灰分隔
  warmAccent:"D97706",   // 暖色点缀
  white:     "FFFFFF",
  darkRed:   "92400E",   // 深赭
  paleBg:    "FEF3C7",   // 淡暖底
};

const FONT_TITLE  = "Microsoft YaHei";
const FONT_BODY   = "Microsoft YaHei";
const SLIDE_W     = 13.33;
const SLIDE_H     = 7.5;

// ─── Helpers ─────────────────────────────────────────────────────────
function addPageMarker(slide, num) {
  slide.addText(`${num} / 5`, {
    x: 0.4, y: 0.25, w: 0.8, h: 0.35,
    fontSize: 9, color: C.slate, fontFace: FONT_BODY,
    align: "left", valign: "middle",
  });
}

function addAccentBar(slide) {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.4, y: 0.65, w: 0.06, h: 0.55,
    fill: { color: C.terracotta },
    rectRadius: 0.03,
  });
}

function addBottomTakeaway(slide, text) {
  // 底部横线
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.4, y: 6.55, w: 12.53, h: 0.01,
    fill: { color: C.lightGray },
  });
  slide.addText(text, {
    x: 0.4, y: 6.65, w: 10.5, h: 0.45,
    fontSize: 10, color: C.slate, fontFace: FONT_BODY,
    align: "left", valign: "top",
    italic: true,
  });
}

function addSourceNote(slide, text) {
  slide.addText(text, {
    x: 0.4, y: 7.05, w: 10, h: 0.3,
    fontSize: 7, color: C.slate, fontFace: FONT_BODY,
    align: "left", valign: "top",
  });
}

function addTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.65, y: 0.55, w: 11.5, h: 0.65,
    fontSize: 26, color: C.charcoal, fontFace: FONT_TITLE,
    bold: true, align: "left", valign: "middle",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.65, y: 1.2, w: 11.5, h: 0.45,
      fontSize: 13, color: C.slate, fontFace: FONT_BODY,
      align: "left", valign: "top",
    });
  }
}

// ─── Deck ────────────────────────────────────────────────────────────
const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "重庆民间文学课堂作业";
pptx.title  = "巴渝文脉·口头传承——重庆民间文学概览";

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 1: 封面 / 概览
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  slide.background = { fill: C.bg };

  // 大标题
  slide.addText("巴渝文脉 · 口头传承", {
    x: 0.8, y: 1.2, w: 11.73, h: 1.2,
    fontSize: 40, color: C.charcoal, fontFace: FONT_TITLE,
    bold: true, align: "left", valign: "middle",
  });

  // 副标题
  slide.addText("重庆民间文学以三大形态系统性承载巴渝文化记忆", {
    x: 0.8, y: 2.5, w: 11.73, h: 0.6,
    fontSize: 16, color: C.slate, fontFace: FONT_BODY,
    align: "left", valign: "top",
  });

  // 赭红装饰线
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 3.3, w: 2.0, h: 0.05,
    fill: { color: C.terracotta },
  });

  // 三支柱卡片
  const pillars = [
    { label: "口头叙事", sub: "走马镇民间故事", detail: "万余则故事\n国家级非遗", icon: "📖" },
    { label: "劳动歌谣", sub: "川江号子 · 木洞山歌", detail: "两千年声腔传统\n国家级非遗", icon: "🎵" },
    { label: "信仰传说", sub: "丰都鬼城 · 土家啰儿调", detail: "唯一鬼文化叙事\n国家级非遗", icon: "🏔" },
  ];

  pillars.forEach((p, i) => {
    const xBase = 0.8 + i * 4.1;
    // 卡片背景
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xBase, y: 3.8, w: 3.7, h: 2.6,
      fill: { color: C.white },
      shadow: { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.08 },
      rectRadius: 0.15,
    });
    // 顶部色条
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: xBase, y: 3.8, w: 3.7, h: 0.08,
      fill: { color: C.terracotta },
      rectRadius: 0.04,
    });
    // 图标
    slide.addText(p.icon, {
      x: xBase + 0.3, y: 4.1, w: 0.6, h: 0.6,
      fontSize: 24, align: "center", valign: "middle",
    });
    // 标签
    slide.addText(p.label, {
      x: xBase + 0.9, y: 4.1, w: 2.5, h: 0.35,
      fontSize: 16, color: C.terracotta, fontFace: FONT_TITLE,
      bold: true, align: "left", valign: "middle",
    });
    // 副标签
    slide.addText(p.sub, {
      x: xBase + 0.9, y: 4.45, w: 2.5, h: 0.3,
      fontSize: 11, color: C.slate, fontFace: FONT_BODY,
      align: "left", valign: "top",
    });
    // 详情
    slide.addText(p.detail, {
      x: xBase + 0.3, y: 5.0, w: 3.1, h: 1.0,
      fontSize: 11, color: C.charcoal, fontFace: FONT_BODY,
      align: "left", valign: "top", lineSpacingMultiple: 1.4,
    });
  });

  // 底部基座
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 6.5, w: 11.73, h: 0.04,
    fill: { color: C.slate },
  });
  slide.addText("巴渝口头传统", {
    x: 0.8, y: 6.55, w: 3, h: 0.35,
    fontSize: 10, color: C.slate, fontFace: FONT_BODY,
    bold: true, align: "left", valign: "top",
  });
  slide.addText("2006年第一批国家级非物质文化遗产", {
    x: 4, y: 6.55, w: 5, h: 0.35,
    fontSize: 9, color: C.slate, fontFace: FONT_BODY,
    align: "left", valign: "top",
  });

  addPageMarker(slide, 1);
  addSourceNote(slide, "数据来源：国务院《第一批国家级非物质文化遗产名录》（2006）");
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 2: 走马镇民间故事
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  slide.background = { fill: C.bg };
  addPageMarker(slide, 2);
  addAccentBar(slide);
  addTitle(slide, "走马镇民间故事——古驿道上的口头叙事宝库", '万余则故事记录巴渝千年社会生活，唯一以\u201C镇\u201D为单位入选国家级非遗');

  // 左侧：故事生态图
  // 驿道→赶马人→故事类型→传承谱系
  const stages = [
    { title: "古驿道", desc: "成渝东大路驿站\n明末清初建场", color: C.terracotta },
    { title: "赶马人", desc: '以\u201C走马\u201D为业\n口头创作与传承', color: C.darkRed },
    { title: "故事类型", desc: "神话·传说·生活故事\n笑话·寓言·歇后语", color: C.warmAccent },
    { title: "传承谱系", desc: "传承人朱伟\n坚守四十余载", color: C.slate },
  ];

  stages.forEach((s, i) => {
    const yBase = 2.0 + i * 1.15;
    // 节点
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8, y: yBase, w: 5.2, h: 0.9,
      fill: { color: C.white },
      shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.06 },
      rectRadius: 0.1,
    });
    // 左侧色块
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0.8, y: yBase, w: 0.08, h: 0.9,
      fill: { color: s.color },
    });
    slide.addText(s.title, {
      x: 1.1, y: yBase + 0.05, w: 1.8, h: 0.35,
      fontSize: 13, color: s.color, fontFace: FONT_TITLE,
      bold: true, align: "left", valign: "middle",
    });
    slide.addText(s.desc, {
      x: 1.1, y: yBase + 0.38, w: 4.5, h: 0.5,
      fontSize: 10, color: C.charcoal, fontFace: FONT_BODY,
      align: "left", valign: "top", lineSpacingMultiple: 1.3,
    });
    // 箭头（非最后一个）
    if (i < stages.length - 1) {
      slide.addText("▼", {
        x: 3.0, y: yBase + 0.85, w: 0.6, h: 0.3,
        fontSize: 12, color: C.lightGray, align: "center", valign: "middle",
      });
    }
  });

  // 右侧：关键数据
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.6, y: 2.0, w: 6.13, h: 4.3,
    fill: { color: C.white },
    shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.06 },
    rectRadius: 0.12,
  });
  slide.addText("核心数据", {
    x: 6.9, y: 2.15, w: 3, h: 0.4,
    fontSize: 14, color: C.terracotta, fontFace: FONT_TITLE,
    bold: true, align: "left", valign: "middle",
  });

  const data = [
    ["故事总量", "逾万则", "全国乡镇级之最"],
    ["入选时间", "2006年", "第一批国家级非遗"],
    ["故事类型", "6大类", "神话/传说/生活/笑话/寓言/歇后语"],
    ["UNESCO关注", "是", "联合国教科文组织考察"],
    ["传承人", "朱伟", "四十余载坚守记录"],
    ["地理位置", "九龙坡区", "成渝古驿道核心驿站"],
  ];

  data.forEach((d, i) => {
    const yRow = 2.65 + i * 0.55;
    // 交替底色
    if (i % 2 === 0) {
      slide.addShape(pptx.shapes.RECTANGLE, {
        x: 6.8, y: yRow, w: 5.73, h: 0.5,
        fill: { color: C.paleBg },
      });
    }
    slide.addText(d[0], {
      x: 6.9, y: yRow, w: 1.5, h: 0.5,
      fontSize: 10, color: C.slate, fontFace: FONT_BODY,
      bold: true, align: "left", valign: "middle",
    });
    slide.addText(d[1], {
      x: 8.4, y: yRow, w: 1.5, h: 0.5,
      fontSize: 11, color: C.terracotta, fontFace: FONT_TITLE,
      bold: true, align: "left", valign: "middle",
    });
    slide.addText(d[2], {
      x: 9.9, y: yRow, w: 2.6, h: 0.5,
      fontSize: 9, color: C.charcoal, fontFace: FONT_BODY,
      align: "left", valign: "middle",
    });
  });

  addBottomTakeaway(slide, "走马故事证明：口头叙事是地方历史最鲜活的载体");
  addSourceNote(slide, "来源：国务院《第一批国家级非物质文化遗产名录》（2006）；个人调查走访记录");
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 3: 川江号子与木洞山歌
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  slide.background = { fill: C.bg };
  addPageMarker(slide, 3);
  addAccentBar(slide);
  addTitle(slide, "川江号子与木洞山歌——长江水系的声腔遗产", '从\u201C下里巴人\u201D到川江号子，长江水系孕育了延续两千年的声腔传统');

  // 时间线
  const timeline = [
    { era: "战国", event: "下里巴人", desc: '宋玉《对楚王问》\n\u201C国中属而和者数千人\u201D', color: C.terracotta },
    { era: "汉代", event: "巴子讴歌", desc: "巴人歌谣入史\n民间传唱成风", color: C.darkRed },
    { era: "唐代", event: "竹枝词", desc: '刘禹锡改编入诗\n\u201C杨柳青青江水平\u201D', color: C.warmAccent },
    { era: "明清", event: "号子·山歌", desc: "川江号子定型\n木洞山歌成熟", color: C.slate },
    { era: "2006", event: "国家级非遗", desc: "双双入选第一批\n国家级非遗名录", color: C.terracotta },
  ];

  // 时间线横轴
  const tlY = 2.5;
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: tlY + 0.35, w: 11.73, h: 0.03,
    fill: { color: C.lightGray },
  });

  timeline.forEach((t, i) => {
    const xBase = 0.8 + i * 2.4;
    // 节点圆
    slide.addShape(pptx.shapes.OVAL, {
      x: xBase + 0.85, y: tlY + 0.2, w: 0.35, h: 0.35,
      fill: { color: t.color },
    });
    // 时代标签
    slide.addText(t.era, {
      x: xBase + 0.3, y: tlY - 0.4, w: 1.4, h: 0.35,
      fontSize: 12, color: t.color, fontFace: FONT_TITLE,
      bold: true, align: "center", valign: "middle",
    });
    // 事件
    slide.addText(t.event, {
      x: xBase + 0.1, y: tlY + 0.7, w: 1.8, h: 0.35,
      fontSize: 11, color: C.charcoal, fontFace: FONT_TITLE,
      bold: true, align: "center", valign: "middle",
    });
    // 描述
    slide.addText(t.desc, {
      x: xBase, y: tlY + 1.1, w: 2.0, h: 0.8,
      fontSize: 9, color: C.slate, fontFace: FONT_BODY,
      align: "center", valign: "top", lineSpacingMultiple: 1.3,
    });
  });

  // 下半部分：双栏对照
  // 川江号子
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: 4.6, w: 5.7, h: 1.7,
    fill: { color: C.white },
    shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.06 },
    rectRadius: 0.1,
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 4.6, w: 5.7, h: 0.06,
    fill: { color: C.terracotta },
  });
  slide.addText("川江号子  ·  水上活化石", {
    x: 1.1, y: 4.7, w: 5.0, h: 0.35,
    fontSize: 13, color: C.terracotta, fontFace: FONT_TITLE,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText("长江三峡船工为统一动作和节奏创造的劳动号歌\n类型：推桡号子 / 拖杠号子 / 扳艄号子 / 打扛号子\n特点：一领众和，节奏随滩险变化，无乐器伴奏", {
    x: 1.1, y: 5.1, w: 5.0, h: 1.0,
    fontSize: 10, color: C.charcoal, fontFace: FONT_BODY,
    align: "left", valign: "top", lineSpacingMultiple: 1.4,
  });

  // 木洞山歌
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.83, y: 4.6, w: 5.7, h: 1.7,
    fill: { color: C.white },
    shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.06 },
    rectRadius: 0.1,
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 6.83, y: 4.6, w: 5.7, h: 0.06,
    fill: { color: C.warmAccent },
  });
  slide.addText("木洞山歌  ·  山野之声", {
    x: 7.13, y: 4.7, w: 5.0, h: 0.35,
    fontSize: 13, color: C.warmAccent, fontFace: FONT_TITLE,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText('巴南区木洞镇，源流追溯至战国\u201C下里巴人\u201D\n分类：禾籁 / 神歌 / 盘歌 / 劳动号子 / 小调\n特点：即兴编唱，题材涵盖劳动、爱情、时政', {
    x: 7.13, y: 5.1, w: 5.0, h: 1.0,
    fontSize: 10, color: C.charcoal, fontFace: FONT_BODY,
    align: "left", valign: "top", lineSpacingMultiple: 1.4,
  });

  addBottomTakeaway(slide, "水陆双线歌谣体系是巴渝最悠久的活态声音遗产");
  addSourceNote(slide, "来源：宋玉《对楚王问》；国务院《第一批国家级非物质文化遗产名录》（2006）；个人调查采集木洞山歌录音");
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 4: 丰都鬼城传说与土家啰儿调
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  slide.background = { fill: C.bg };
  addPageMarker(slide, 4);
  addAccentBar(slide);
  addTitle(slide, "丰都鬼城传说与土家啰儿调——信仰叙事与民族歌谣", "鬼文化叙事构建中国唯一系统化冥界想象，啰儿调以歌谣承载土家族精神世界");

  // 左半：丰都鬼城
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: 1.9, w: 5.7, h: 4.4,
    fill: { color: C.white },
    shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.06 },
    rectRadius: 0.12,
  });
  // 顶部色条
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8, y: 1.9, w: 5.7, h: 0.07,
    fill: { color: C.terracotta },
  });
  slide.addText("丰都鬼城传说", {
    x: 1.1, y: 2.05, w: 5.0, h: 0.4,
    fontSize: 15, color: C.terracotta, fontFace: FONT_TITLE,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText("中国唯一的系统化鬼文化叙事体系", {
    x: 1.1, y: 2.45, w: 5.0, h: 0.3,
    fontSize: 10, color: C.slate, fontFace: FONT_BODY,
    italic: true, align: "left", valign: "top",
  });

  const ghostItems = [
    ["历史积淀", "两千余年，始于东汉，盛于唐宋"],
    ["核心传说", '王方平、阴长生平都山修道成仙\n\u201C阴王\u201D讹传为\u201C阴间之王\u201D'],
    ["叙事体系", "奈何桥→鬼门关→黄泉路→望乡台→十八层地狱\n完整的冥界审判与轮回叙事"],
    ["文化价值", "民间信仰研究的独特样本\n儒释道三教融合的民间表达"],
    ["个人调查", "访谈丰都当地居民，口述传统仍在延续\n年轻一代认知度下降"],
  ];

  ghostItems.forEach((item, i) => {
    const yRow = 2.9 + i * 0.65;
    slide.addText(item[0], {
      x: 1.1, y: yRow, w: 1.3, h: 0.55,
      fontSize: 10, color: C.terracotta, fontFace: FONT_BODY,
      bold: true, align: "left", valign: "top",
    });
    slide.addText(item[1], {
      x: 2.4, y: yRow, w: 3.8, h: 0.55,
      fontSize: 9, color: C.charcoal, fontFace: FONT_BODY,
      align: "left", valign: "top", lineSpacingMultiple: 1.25,
    });
  });

  // 右半：土家啰儿调
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.83, y: 1.9, w: 5.7, h: 4.4,
    fill: { color: C.white },
    shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.06 },
    rectRadius: 0.12,
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 6.83, y: 1.9, w: 5.7, h: 0.07,
    fill: { color: C.warmAccent },
  });
  slide.addText("石柱土家啰儿调", {
    x: 7.13, y: 2.05, w: 5.0, h: 0.4,
    fontSize: 15, color: C.warmAccent, fontFace: FONT_TITLE,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText("以歌谣承载土家族精神世界", {
    x: 7.13, y: 2.45, w: 5.0, h: 0.3,
    fontSize: 10, color: C.slate, fontFace: FONT_BODY,
    italic: true, align: "left", valign: "top",
  });

  const luoItems = [
    ["地理位置", "重庆石柱土家族自治县"],
    ["代表作品", '《太阳出来喜洋洋》——传唱全国的啰儿调经典\n\u201C太阳出来喜洋洋，挑起扁担上山岗\u201D'],
    ["音乐特征", "调式：徵调式为主，旋律高亢嘹亮\n形式：一领众和，即兴编词"],
    ["文化内涵", "土家族劳动生活的艺术化表达\n融合巴人古歌与土家民歌传统"],
    ["非遗保护", "2006年第一批国家级非遗\n传承人：黄代书等"],
  ];

  luoItems.forEach((item, i) => {
    const yRow = 2.9 + i * 0.65;
    slide.addText(item[0], {
      x: 7.13, y: yRow, w: 1.3, h: 0.55,
      fontSize: 10, color: C.warmAccent, fontFace: FONT_BODY,
      bold: true, align: "left", valign: "top",
    });
    slide.addText(item[1], {
      x: 8.43, y: yRow, w: 3.8, h: 0.55,
      fontSize: 9, color: C.charcoal, fontFace: FONT_BODY,
      align: "left", valign: "top", lineSpacingMultiple: 1.25,
    });
  });

  addBottomTakeaway(slide, "信仰叙事与民族歌谣是巴渝民间文学中最具辨识度的文化符号");
  addSourceNote(slide, "来源：《丰都县志》；国务院《第一批国家级非物质文化遗产名录》（2006）；个人调查访谈丰都当地居民");
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 5: 传承与思考
// ═══════════════════════════════════════════════════════════════════════
{
  const slide = pptx.addSlide();
  slide.background = { fill: C.bg };
  addPageMarker(slide, 5);
  addAccentBar(slide);
  addTitle(slide, "传承与思考——非遗保护下的活态延续", "国家级非遗保护提供制度保障，但活态传承仍面临代际断层挑战");

  // 三阶路径图
  const pathStages = [
    {
      title: "保护",
      subtitle: "制度保障",
      items: [
        "三批国家级非遗名录覆盖",
        "传承人认定与补贴制度",
        "数字化记录与存档工程",
      ],
      color: C.terracotta,
    },
    {
      title: "传承",
      subtitle: "活态延续",
      items: [
        "非遗进课堂（梁平木版年画案例）",
        "传承人驻校授课",
        "社区传习所建设",
      ],
      color: C.warmAccent,
    },
    {
      title: "活化",
      subtitle: "融入当代",
      items: [
        "文创产品开发",
        "文旅融合（丰都鬼城景区）",
        "新媒体传播与年轻化表达",
      ],
      color: C.slate,
    },
  ];

  pathStages.forEach((s, i) => {
    const xBase = 0.8 + i * 4.1;
    // 卡片
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: xBase, y: 1.9, w: 3.7, h: 3.0,
      fill: { color: C.white },
      shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.06 },
      rectRadius: 0.12,
    });
    // 顶部色块
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: xBase, y: 1.9, w: 3.7, h: 0.06,
      fill: { color: s.color },
    });
    // 序号圆
    slide.addShape(pptx.shapes.OVAL, {
      x: xBase + 0.25, y: 2.15, w: 0.5, h: 0.5,
      fill: { color: s.color },
    });
    slide.addText(`${i + 1}`, {
      x: xBase + 0.25, y: 2.15, w: 0.5, h: 0.5,
      fontSize: 16, color: C.white, fontFace: FONT_TITLE,
      bold: true, align: "center", valign: "middle",
    });
    // 标题
    slide.addText(s.title, {
      x: xBase + 0.9, y: 2.15, w: 2.5, h: 0.3,
      fontSize: 16, color: s.color, fontFace: FONT_TITLE,
      bold: true, align: "left", valign: "middle",
    });
    slide.addText(s.subtitle, {
      x: xBase + 0.9, y: 2.45, w: 2.5, h: 0.25,
      fontSize: 10, color: C.slate, fontFace: FONT_BODY,
      align: "left", valign: "top",
    });
    // 列表
    s.items.forEach((item, j) => {
      slide.addText(`• ${item}`, {
        x: xBase + 0.3, y: 2.9 + j * 0.55, w: 3.1, h: 0.5,
        fontSize: 10, color: C.charcoal, fontFace: FONT_BODY,
        align: "left", valign: "top", lineSpacingMultiple: 1.2,
      });
    });

    // 箭头
    if (i < 2) {
      slide.addText("→", {
        x: xBase + 3.7, y: 3.1, w: 0.4, h: 0.5,
        fontSize: 20, color: C.lightGray, align: "center", valign: "middle",
      });
    }
  });

  // 个人调查发现
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: 5.15, w: 11.73, h: 1.2,
    fill: { color: C.paleBg },
    rectRadius: 0.1,
  });
  slide.addText("个人调查发现", {
    x: 1.1, y: 5.2, w: 3, h: 0.35,
    fontSize: 12, color: C.terracotta, fontFace: FONT_TITLE,
    bold: true, align: "left", valign: "middle",
  });
  slide.addText('通过走访重庆九龙坡走马镇、巴南木洞镇、丰都县及石柱县，访谈当地居民与非遗传承人，发现：\n1. 老一辈居民对民间文学仍有丰富记忆，但年轻一代认知度明显偏低\n2. 非遗进课堂成效初显，但覆盖面有限，多集中在城区\n3. 民间文学的生命力在于\u201C用\u201D而非\u201C存\u201D——只有融入日常生活，才能真正延续', {
    x: 1.1, y: 5.55, w: 11.0, h: 0.75,
    fontSize: 9, color: C.charcoal, fontFace: FONT_BODY,
    align: "left", valign: "top", lineSpacingMultiple: 1.35,
  });

  addBottomTakeaway(slide, '民间文学的生命力在于\u201C用\u201D而非\u201C存\u201D——融入当代生活才是真正的传承');
  addSourceNote(slide, "来源：文化和旅游部非遗司；个人调查走访（2025-2026）");
}

// ─── Save ────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: "重庆民间文学概览.pptx" })
  .then(() => console.log("PPTX saved successfully"))
  .catch(err => console.error("Error:", err));
