import React, { useRef, useState } from 'react';
import { X, Shield, ChevronDown } from 'lucide-react';
import { AudioSystem } from '../lib/audio';

const PRIVACY_CONTENT = [
  {
    title: '前言',
    items: [
      {
        label: '政策效力与适用范围',
        desc: '《流浪岛隐私政策》（以下简称「本政策」）适用于由个人开发者 huyan（以下简称「我们」）开发并运营的「流浪岛」生态沙盒游戏（以下简称「本游戏」）的所有相关服务，包括但不限于：游戏客户端（网页端）、游戏服务器、社交功能、AI 对话功能及相关网站页面。\n\n本政策适用于我们通过上述服务收集和处理您个人信息的所有场景。',
      },
      {
        label: '未成年人特别提示',
        desc: '如果您是未满 18 周岁的未成年人，请在您的法定监护人陪同和指导下阅读本政策，并在取得您的法定监护人明确同意后，方可使用我们的服务。如果您是未满 14 周岁的儿童，我们要求您的法定监护人在您使用本服务前，务必仔细阅读本政策，并在充分理解后代替您作出同意的决定。\n\n我们特别提醒未成年人的法定监护人：请妥善保管您的账号和密码，避免未成年人未经授权使用您的账号进行操作。',
      },
      {
        label: '政策更新',
        desc: '我们可能会适时对本政策进行修订。未经您明确同意，我们不会削减您按照本政策所应享有的权利。政策变更时，我们会通过以下一种或多种方式通知您：\n\n• 在游戏内以弹窗方式提示\n• 通过游戏内信箱发送公告邮件\n• 在登录页面或设置页面展示更新提示\n\n对于重大变更（如收集信息范围的扩大、使用目的的变更等），我们将再次征求您的明确同意。若您在政策变更后继续使用我们的服务，即表示您同意受修订后的政策约束。',
      },
    ],
  },
  {
    title: '一、我们如何收集和使用您的个人信息',
    items: [
      {
        label: '1.1 您主动提供的信息',
        desc: '当您注册账号时，我们需要收集以下信息：\n\n• 用户名：用于账号标识和社交展示，将在好友列表、漂流广场、岛屿橱窗、访客簿等场景中公开展示\n• 密码：以 bcrypt 单向哈希形式存储，我们无法还原您的明文密码\n\n您可自愿补充以下信息（非必填）：\n\n• 头像：用于个人展示，在社交场景中公开展示\n• 个性签名：用于个人展示，在社交场景中公开展示\n• 岛屿名称：用于标识您的岛屿，在岛屿橱窗和社交场景中公开展示\n\n您可随时在游戏内「居民证」页面修改或删除上述自愿提供的信息。',
      },
      {
        label: '1.2 服务自动产生的信息',
        desc: '在您使用我们的服务过程中，我们会自动收集以下信息：\n\n• 游戏存档数据：您在岛屿上放置的物体、地形修改、生态配置、种植记录等游戏进度数据，用于跨设备同步和持久化存储\n• 聊天与通信内容：您与「辞」（AI 岛灵）的聊天记录、与好友的私信内容、漂流瓶内容，用于维持对话连贯性和消息送达\n• 好友关系数据：您的好友列表、好友申请记录，用于社交功能运行\n• 访客记录：谁访问了您的岛屿、您访问了谁的岛屿，用于访客簿功能',
      },
      {
        label: '1.3 设备与网络信息',
        desc: '我们通过 Cloudflare CDN 提供网站访问服务，CDN 在提供服务过程中可能自动收集以下信息：\n\n• IP 地址：用于网络路由和安全防护\n• 浏览器类型和版本：用于页面兼容性适配\n• 操作系统信息：用于功能兼容性判断\n• 访问时间和页面 URL：用于安全分析\n• HTTP Referer：用于来源分析\n\n上述信息由 Cloudflare 在提供 CDN 服务过程中自动收集，我们不主动收集这些信息。我们不主动收集设备唯一标识符（如 IMEI、MAC 地址）、设备指纹或其他持久性追踪标识。我们不使用 Google Analytics 或其他第三方分析工具。',
      },
      {
        label: '1.4 敏感个人信息说明',
        desc: '根据《个人信息保护法》的规定，以下信息属于敏感个人信息：\n\n• 聊天内容：您与「辞」的对话内容会发送至第三方 AI 服务（DeepSeek）进行处理。我们在此单独告知您，您主动向「辞」发送消息即表示您同意我们将该消息内容传输至 DeepSeek API 进行处理。如果您不同意，请不要使用「辞」聊天功能\n• 精确地理位置：我们不收集此信息\n• 生物识别信息：我们不收集此信息\n• 身份证件号码：我们不收集此信息\n• 金融账户信息：我们不收集此信息\n\n我们仅在本政策所述的目的范围内处理您的敏感个人信息，并采取合理的安全保护措施。',
      },
      {
        label: '1.5 无需授权的法定例外情形',
        desc: '根据《个人信息保护法》第十三条，以下情形中，我们处理个人信息无需取得您的授权同意：\n\n（一）为订立、履行个人作为一方当事人的合同所必需\n（二）为履行法定职责或者法定义务所必需\n（三）为应对突发公共卫生事件，或者紧急情况下为保护自然人的生命健康和财产安全所必需\n（四）为公共利益实施新闻报道、舆论监督等行为，在合理的范围内处理个人信息\n（五）依照法律规定在合理的范围内处理个人自行公开或者其他已经合法公开的个人信息\n（六）为公共利益实施统计或学术研究，在合理的范围内处理个人信息\n（七）法律、行政法规规定的其他情形',
      },
    ],
  },
  {
    title: '二、我们如何使用您的信息',
    items: [
      {
        label: '2.1 提供核心服务',
        desc: '我们使用您的信息用于以下核心服务功能的运行：\n\n• 账号注册、登录和身份验证\n• 游戏存档的创建、存储和跨设备同步\n• 社交功能（好友系统、私信、漂流瓶、岛屿参观、访客簿）\n• AI 对话功能（与「辞」聊天）\n• 音乐长廊功能（音乐卡片收藏与播放）\n• 信箱系统（系统公告、好友申请、礼物通知）',
      },
      {
        label: '2.2 AI 对话服务（DeepSeek）',
        desc: '当您与「辞」聊天时，您的消息内容会被发送至 DeepSeek API 进行智能回复生成。具体处理流程如下：\n\n1. 您在聊天窗口输入消息并点击发送\n2. 消息内容通过 HTTPS 加密传输至我们的服务器\n3. 我们的服务器将消息转发至 DeepSeek API\n4. DeepSeek 处理后返回 AI 生成的回复\n5. 回复通过我们的服务器传输至您的客户端\n\n重要说明：\n• DeepSeek 的数据处理受其自身隐私政策（https://www.deepseek.com/privacy）约束，我们无法控制 DeepSeek 如何处理您的消息内容\n• 我们不会主动将您的聊天内容用于训练 AI 模型或其他商业用途\n• 您可以选择不与「辞」聊天来避免信息被发送至 DeepSeek API\n• 聊天记录存储在我们的服务器上，用于维持对话连贯性',
      },
      {
        label: '2.3 消息通知',
        desc: '我们通过游戏内信箱系统向您发送以下类型的通知：\n\n• 系统公告：功能更新、服务变更、活动通知等\n• 好友申请通知：其他用户向您发送好友申请\n• 礼物通知：其他用户向您赠送音乐卡片或岛屿礼物\n• 社交通知：漂流瓶回复、访客留言等\n\n所有通知仅与游戏功能相关，我们不会发送商业推广或营销信息。',
      },
      {
        label: '2.4 安全与防滥用',
        desc: '我们使用收集的信息用于以下安全目的：\n\n• 账号安全：验证登录身份\n• 反滥用：防止垃圾信息、骚扰、恶意攻击等行为\n• 服务稳定性：监控服务器运行状态，排查和修复故障\n• 法律合规：响应法律法规要求的信息披露',
      },
      {
        label: '2.5 信息使用的原则',
        desc: '我们遵循以下原则使用您的信息：\n\n• 最小必要原则：仅收集和使用实现服务功能所必需的最少信息\n• 目的明确原则：仅在本政策声明的目的范围内使用您的信息\n• 安全保障原则：采取合理的技术和管理措施保护您的信息安全\n• 透明公开原则：通过本政策向您明示信息收集和使用的目的、方式和范围\n\n如果我们需要将您的信息用于本政策未载明的其他目的，我们将再次征求您的同意。',
      },
      {
        label: '2.6 自动化决策',
        desc: '我们不会通过自动化决策方式对您的个人信息进行分析或评估，也不会通过自动化决策作出对您的权益造成重大影响的决定。\n\n与「辞」的 AI 对话功能是基于您主动发送的消息内容生成回复，不属于对您个人信息的自动化分析或评估。',
      },
      {
        label: '2.7 个人信息安全影响评估',
        desc: '根据《个人信息保护法》第五十五条的规定，我们在以下情形中开展个人信息安全影响评估：\n\n• 处理敏感个人信息时\n• 利用个人信息进行自动化决策时\n• 委托处理个人信息、向其他个人信息处理者提供个人信息时\n\n评估结果将用于确保我们的个人信息处理活动符合法律法规的要求。作为个人开发者项目，我们通过本政策的制定和公开来履行评估义务。',
      },
    ],
  },
  {
    title: '三、我们如何共享、转让和公开披露您的个人信息',
    items: [
      {
        label: '3.1 第三方服务提供商',
        desc: '我们委托以下第三方服务提供商处理您的部分信息。我们仅共享提供服务所必需的最少信息：\n\n┌──────────┬──────────┬──────────────────┬──────────────────┐\n│ 提供商       │ 服务类型     │ 涉及信息               │ 使用目的             │\n├──────────┼──────────┼──────────────────┼──────────────────┤\n│ DeepSeek     │ AI 对话     │ 聊天消息内容           │ 生成 AI 回复         │\n│（深度求索）   │            │                      │                    │\n├──────────┼──────────┼──────────────────┼──────────────────┤\n│ Cloudflare   │ CDN 与安全  │ IP 地址、浏览器信息     │ 内容加速、安全防护    │\n├──────────┼──────────┼──────────────────┼──────────────────┤\n│ 阿里云       │ 服务器托管  │ 全部游戏数据           │ 数据存储与计算       │\n└──────────┴──────────┴──────────────────┴──────────────────┘\n\n第三方隐私政策链接：\n• DeepSeek：https://www.deepseek.com/privacy\n• Cloudflare：https://www.cloudflare.com/privacypolicy/\n• 阿里云：https://www.aliyun.com/agreement/privacy\n\n请注意：上述第三方的数据处理受其各自隐私政策约束，我们无法控制其数据处理行为。我们建议您仔细阅读上述第三方的隐私政策。',
      },
      {
        label: '3.2 用户间公开信息',
        desc: '以下信息对其他用户可见，请您注意信息的公开性，避免在其中包含敏感个人信息：\n\n• 用户名：在好友列表、漂流广场、岛屿橱窗、访客簿中展示\n• 头像：在社交场景中展示\n• 岛屿名称：在岛屿橱窗和社交场景中展示\n• 访客簿留言：公开可见\n• 漂流瓶内容：被其他用户捡到时可见\n• 好友申请附言：对被申请人可见',
      },
      {
        label: '3.3 转让',
        desc: '我们不会将您的个人信息转让给任何公司、组织或个人，但以下情况除外：\n\n• 在涉及合并、收购或资产转让时，我们将要求新的持有您个人信息的公司、组织继续受本政策的约束\n• 如变更后的使用目的与本政策不符，我们将再次征求您的明确同意',
      },
      {
        label: '3.4 公开披露',
        desc: '我们仅会在以下情况下公开披露您的个人信息：\n\n• 获得您的明确同意后\n• 基于法律法规、法律程序、诉讼或政府主管部门强制性要求\n• 为维护社会公共利益\n• 为保护我们、其他用户或公众的权利、财产或安全所合理必需\n\n我们不会在未经您同意的情况下向任何第三方出售、出租或交易您的个人信息。',
      },
      {
        label: '3.5 无需授权的共享/转让/披露',
        desc: '根据《个人信息保护法》的规定，以下情形中我们共享、转让、公开披露您的个人信息无需取得您的授权同意：\n\n（一）为订立、履行个人作为一方当事人的合同所必需\n（二）为履行法定职责或者法定义务所必需\n（三）为应对突发公共卫生事件所必需\n（四）为保护自然人的生命健康和财产安全所必需\n（五）为公共利益实施新闻报道等行为，在合理的范围内\n（六）处理个人自行公开或其他已经合法公开的个人信息\n（七）法律、行政法规规定的其他情形',
      },
    ],
  },
  {
    title: '四、我们如何保护和存储您的个人信息',
    items: [
      {
        label: '4.1 数据存储地域',
        desc: '您的个人信息存储在中华人民共和国境内的阿里云服务器上。除本政策第八章所述的跨境转移情形外，我们不会将您的个人信息传输至境外。\n\n我们通过 Cloudflare CDN 提供全球加速访问服务，CDN 节点可能分布在全球多个地区。CDN 仅缓存静态资源文件（HTML、CSS、JavaScript、图片），不缓存您的个人信息。CDN 节点可能临时处理您的 HTTP 请求（含 IP 地址），但该处理仅用于请求路由和响应，不会持久化存储。',
      },
      {
        label: '4.2 数据存储期限',
        desc: '我们仅在为您提供服务所必需的期限内保留您的个人信息，具体如下：\n\n• 账号信息：在您使用服务期间持续保留，直至您注销账号\n• 游戏存档数据：在您使用服务期间持续保留，直至您删除或清除\n• 聊天记录：在您使用服务期间持续保留，用于对话连贯性\n• 访客记录：在您使用服务期间持续保留，用于访客簿功能\n• CDN 日志：由 Cloudflare 保留，详见 Cloudflare 隐私政策\n\n当您注销账号或要求删除数据时，我们将在 30 个工作日内删除或匿名化处理您的个人信息。超出上述保留期限后，我们将对您的个人信息进行删除或匿名化处理。',
      },
      {
        label: '4.3 安全技术措施',
        desc: '我们采用以下技术措施保护您的个人信息安全：\n\n• 传输加密：所有客户端与服务器之间的通信均使用 HTTPS/TLS 加密\n• 密码保护：使用 bcrypt 算法对密码进行单向哈希存储，我们无法还原您的明文密码\n• 数据隔离：不同用户的数据在数据库中通过用户 ID 进行逻辑隔离\n• 输入验证：对用户输入进行基本验证，防止常见注入攻击\n• 服务器安全：服务器部署在阿里云平台，依托阿里云的基础安全防护能力\n\n作为个人开发者项目，我们的安全防护能力有限，但我们会尽最大努力保护您的信息安全。如果您发现任何安全漏洞，请通过本政策「联系我们」章节中的方式告知我们，我们将尽快修复。',
      },
      {
        label: '4.4 安全管理',
        desc: '本游戏由个人开发者独立运营，我们采取以下安全管理措施：\n\n• 服务器访问控制：仅开发者本人拥有服务器管理权限\n• 代码审查：对涉及用户数据处理的关键代码进行审查\n• 及时修复：发现安全漏洞后尽快修复\n• 数据最小化：仅收集和存储提供服务所必需的最少数据',
      },
      {
        label: '4.5 安全事件应急',
        desc: '如不幸发生个人信息安全事件，我们将按照法律法规的要求，尽快向您告知安全事件的基本情况和可能的影响、我们已采取或将要采取的处置措施、以及您可自主防范和降低风险的建议。\n\n我们将通过游戏内信箱公告或联系邮箱等方式告知您。同时，我们还将按照监管部门要求，主动上报个人信息安全事件的处置情况。',
      },
    ],
  },
  {
    title: '五、您的权利',
    items: [
      {
        label: '5.1 查阅与访问',
        desc: '您有权访问您的个人信息，法律法规规定的例外情况除外。您可以通过以下方式访问您的信息：\n\n• 个人资料：游戏内「居民证」页面\n• 游戏存档：游戏内「系统菜单 → 导出文件」功能\n• 好友列表：游戏内社交面板\n• 聊天记录：游戏内与「辞」的聊天窗口',
      },
      {
        label: '5.2 更正',
        desc: '当您发现我们处理的您的个人信息有错误时，您有权要求我们更正。您可以通过以下方式自行更正：\n\n• 用户名、头像、签名、岛屿名称：游戏内「居民证」页面直接修改\n• 其他信息：通过本政策「联系我们」章节中的方式联系我们进行更正',
      },
      {
        label: '5.3 删除',
        desc: '在以下情形中，您可以要求我们删除个人信息：\n\n• 处理目的已实现、无法实现或者为实现处理目的不再必要\n• 我们停止提供产品或服务，或者保存期限已届满\n• 您撤回同意\n• 我们违反法律、行政法规或者违反约定处理个人信息\n• 法律法规规定的其他情形\n\n您可以通过以下方式删除信息：\n\n• 本地游戏存档：游戏内「设置 → 一键清除数据」\n• 服务器端数据：通过本政策「联系我们」章节中的方式联系我们\n\n我们将在 15 个工作日内完成删除，并通知您。法律法规另有规定的除外。',
      },
      {
        label: '5.4 撤回同意',
        desc: '您有权撤回您之前给予我们的同意。您可以通过以下方式撤回同意：\n\n• AI 对话功能：选择不与「辞」聊天，即可避免消息被发送至 DeepSeek API\n• 社交功能：删除好友、关闭岛屿公开访问，即可停止相关信息的共享\n• 全部服务：注销账号，即可撤回所有授权同意\n\n请注意，撤回同意不影响之前基于同意已进行的个人信息处理活动的效力。',
      },
      {
        label: '5.5 注销账号',
        desc: '您有权注销您的账号。账号注销后：\n\n• 我们将停止为您提供服务\n• 我们将在 30 个工作日内删除或匿名化处理您的个人信息\n• 您的游戏存档、好友关系、聊天记录等数据将被永久删除且无法恢复\n\n如需注销账号，请通过本政策「联系我们」章节中的方式联系我们，并提供您的用户名和注册信息以便核实身份。',
      },
      {
        label: '5.6 获取个人信息副本',
        desc: '您有权获取您的个人信息副本。您可以通过以下方式获取：\n\n• 游戏存档数据：游戏内「系统菜单 → 导出文件」功能，可导出完整的岛屿存档\n• 其他数据：通过本政策「联系我们」章节中的方式联系我们，我们将在 15 个工作日内提供',
      },
      {
        label: '5.7 响应时限',
        desc: '对于您提出的上述请求，我们将在以下时限内响应：\n\n• 查阅、更正请求：15 个工作日内\n• 删除请求：15 个工作日内\n• 注销账号请求：30 个工作日内\n• 个人信息副本请求：15 个工作日内\n\n如因技术原因无法在上述时限内完成，我们将向您说明原因并告知预计完成时间。',
      },
    ],
  },
  {
    title: '六、未成年人保护',
    items: [
      {
        label: '6.1 年龄要求',
        desc: '本游戏面向 14 周岁及以上用户。如果您是未满 18 周岁的未成年人，请在法定监护人的陪同下阅读本政策，并在取得监护人同意后使用我们的服务。\n\n如果您是未满 14 周岁的儿童，我们要求您的法定监护人在您使用本服务前，务必仔细阅读本政策，并代替您作出同意的决定。',
      },
      {
        label: '6.2 未成年人信息保护',
        desc: '我们不会主动收集未满 14 周岁儿童的个人信息。如果我们发现在未取得法定监护人同意的情况下收集了儿童的个人信息，我们将尽快删除相关信息。\n\n我们对未成年人信息采取以下保护措施：\n\n• 不主动收集未成年人的额外个人信息\n• 不向第三方共享未成年人信息（法律法规要求的除外）\n• 如发现误收集，尽快删除相关信息',
      },
      {
        label: '6.3 监护人权利',
        desc: '未成年人的法定监护人有权：\n\n• 拒绝我们处理未成年人的个人信息\n• 查阅未成年人的个人信息\n• 更正未成年人的个人信息\n• 删除未成年人的个人信息\n• 撤回之前给予的同意\n\n如需行使上述权利，请通过本政策「联系我们」章节中的方式与我们联系。',
      },
    ],
  },
  {
    title: '七、Cookie 与本地存储技术',
    items: [
      {
        label: '7.1 本地存储（localStorage）',
        desc: '我们使用浏览器的 localStorage 技术在您的设备本地存储以下信息：\n\n• 登录状态令牌（token）：用于维持您的登录状态，避免重复登录\n• 游戏存档缓存：用于离线访问和快速加载\n• 用户偏好设置：如音量、主题等个性化设置\n\n这些数据存储在您的设备本地，不会自动发送至我们的服务器。您可以通过以下方式清除这些数据：\n\n• 游戏内「设置 → 一键清除数据」功能\n• 浏览器设置中清除网站数据',
      },
      {
        label: '7.2 Cloudflare Cookie',
        desc: 'Cloudflare 可能设置以下 Cookie：\n\n• __cf_bm：用于 Bot 管理，不包含个人身份信息\n• cf_clearance：用于验证已通过安全检查的访问者\n\n这些 Cookie 是 Cloudflare 安全防护功能的一部分，不包含您的个人身份信息。您可以通过浏览器设置管理或删除这些 Cookie，但删除后可能影响网站的正常访问。',
      },
    ],
  },
  {
    title: '八、个人信息跨境转移',
    items: [
      {
        label: '8.1 境内存储',
        desc: '您的个人信息存储在中华人民共和国境内的阿里云服务器上。除本政策第八章第 8.2 条（CDN 全球加速）和第 8.3 条（DeepSeek API）所述情形外，我们不会将您的个人信息传输至境外。',
      },
      {
        label: '8.2 CDN 全球加速',
        desc: '我们通过 Cloudflare CDN 提供全球加速访问服务。Cloudflare 在全球多个国家和地区设有节点，您的 HTTP 请求可能经过距离您最近的 CDN 节点处理。CDN 节点仅临时处理请求（含 IP 地址），不持久化存储您的个人信息。Cloudflare 的数据处理受其自身隐私政策约束。',
      },
      {
        label: '8.3 DeepSeek API',
        desc: '当您使用「辞」聊天功能时，您的消息内容会被发送至 DeepSeek API。DeepSeek 的服务器可能位于中国境内或境外。DeepSeek 的数据处理受其自身隐私政策（https://www.deepseek.com/privacy）约束。我们无法控制 DeepSeek 对您消息内容的处理方式，建议您在使用「辞」聊天功能前仔细阅读 DeepSeek 的隐私政策。\n\n如您在注册时已同意本隐私政策，且您主动向「辞」发送消息，即表示您同意我们将该消息内容传输至 DeepSeek API 进行处理。如果您不希望消息被发送至 DeepSeek，请不要使用「辞」聊天功能。',
      },
    ],
  },
  {
    title: '九、联系我们',
    items: [
      {
        label: '联系方式',
        desc: '如果您对本隐私政策有任何疑问、建议，或需要行使您的个人信息权利（查阅、更正、删除、撤回同意、注销账号、获取副本等），请通过以下方式联系我们的个人信息保护负责人：\n\n• 电子邮件：huyanxius@gmail.com\n• 游戏内信箱：发送邮件给「辞」\n\n我们将在 15 个工作日内回复您的请求。',
      },
      {
        label: '争议解决',
        desc: '如果您认为我们的个人信息处理行为损害了您的合法权益，您可以向以下机构投诉或举报：\n\n• 网信部门\n• 公安机关\n• 市场监督管理部门\n• 其他依法履行个人信息保护职责的部门',
      },
    ],
  },
];

const AccordionItem: React.FC<{
  isExpanded: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isExpanded, onToggle, title, children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const contentHeight = contentRef.current?.scrollHeight ?? 0;

  return (
    <div
      className="rounded-xl border border-slate-200/80 overflow-hidden"
      style={{ background: isExpanded ? 'rgba(254,243,199,0.3)' : 'rgba(255,255,255,0.5)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        <span className="text-sm font-bold text-slate-800 tracking-wide flex-1">{title}</span>
        <span
          className="text-slate-400 text-xs transition-transform duration-300"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronDown size={16} />
        </span>
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? contentHeight : 0 }}
      >
        <div ref={contentRef} className="px-5 pb-4 flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export const PrivacyPolicyModal: React.FC<{
  onClose: () => void;
  showAgree?: boolean;
  onAgree?: () => void;
}> = ({ onClose, showAgree, onAgree }) => {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="hand-drawn-panel w-[680px] max-w-[94vw] max-h-[88vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-slate-800 px-8 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-amber-600" />
          <div>
            <h2 className="text-2xl hand-drawn-title -rotate-1">流浪岛隐私政策</h2>
            <p className="text-slate-400 text-[9px] font-mono tracking-[0.25em] uppercase mt-0.5">PRIVACY POLICY · WANDER ISLAND</p>
          </div>
        </div>
        <button onClick={() => { AudioSystem.playClose(); onClose(); }} className="hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200">
          <X size={24} strokeWidth={3} className="text-slate-800" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="mb-6 text-center">
          <p className="text-slate-400 text-[10px]">生效日期：2026 年 6 月 17 日 · 最近更新：2026 年 6 月 17 日 · 版本：v1.0</p>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            欢迎来到「流浪岛」。我们深知个人信息对您的重要性，并将按照法律法规的规定，保护您的个人信息及隐私安全。我们依据《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》《中华人民共和国数据安全法》及 GB/T 35273-2020《信息安全技术 个人信息安全规范》等法律法规和标准，制定本隐私政策，以帮助您了解我们如何收集、使用、存储和保护您的信息。请您在使用我们的服务前，仔细阅读并充分理解本政策的全部内容。
          </p>
          <p className="text-xs text-red-600/70 mt-2 font-bold">
            特别提示：如果您是未满 18 周岁的未成年人，请在法定监护人的陪同下阅读本政策。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {PRIVACY_CONTENT.map((section, si) => (
            <AccordionItem
              key={si}
              isExpanded={expandedSection === si}
              onToggle={() => { setExpandedSection(expandedSection === si ? null : si); AudioSystem.playTap(); }}
              title={section.title}
            >
              {section.items.map((item, ii) => (
                <div key={ii} className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-md self-start border border-amber-200/50">
                    {item.label}
                  </p>
                  <p className="text-[12px] text-slate-600 leading-[1.8] whitespace-pre-wrap pl-1">{item.desc}</p>
                </div>
              ))}
            </AccordionItem>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200/50 text-center">
          <p className="text-slate-400 text-[10px]">流浪岛 · 流浪岛生态沙盒 · 隐私政策 v1.0 · huyan</p>
        </div>
      </div>

      {/* Agree Footer */}
      {showAgree && (
        <div className="border-t-2 border-slate-800 px-8 py-5 shrink-0 flex flex-col gap-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); AudioSystem.playToggle(); }}
              className="mt-1 w-4 h-4 accent-amber-700"
            />
            <span className="text-sm text-slate-700 leading-relaxed">
              我已阅读并同意《流浪岛隐私政策》，了解平台将按照本政策收集、使用和保护我的个人信息。我理解并同意，使用「辞」聊天功能时，我的消息内容将被发送至 DeepSeek API 进行处理。
            </span>
          </label>
          <button
            disabled={!agreed}
            onClick={() => { AudioSystem.playConfirm(); onAgree?.(); }}
            className="hand-drawn-btn w-full py-3 text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            同意并继续
          </button>
        </div>
      )}
    </div>
  );
};
