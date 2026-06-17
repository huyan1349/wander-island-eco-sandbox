import React, { useState } from 'react';
import { X, Shield, ChevronDown } from 'lucide-react';
import { AudioSystem } from '../lib/audio';

const PRIVACY_CONTENT = [
  {
    title: '一、我们收集哪些信息',
    items: [
      {
        label: '账号信息',
        desc: '当您注册账号时，我们会收集您的用户名和加密后的密码。用户名将公开展示在社交功能中，密码以 bcrypt 哈希形式存储，我们无法也无法还原您的明文密码。',
      },
      {
        label: '个人资料',
        desc: '您可以自愿设置头像、个性签名、岛屿名称等信息。这些信息在社交场景（好友列表、漂流广场、岛屿橱窗、访客簿）中公开展示。您可随时在「居民证」页面修改或删除这些信息。',
      },
      {
        label: '游戏存档数据',
        desc: '您在岛屿上放置的物体、地形修改、生态配置等游戏进度数据会存储在我们的服务器上，以便您在不同设备间同步游戏进度。',
      },
      {
        label: '聊天与通信内容',
        desc: '您与「辞」（AI 岛灵）的聊天记录、与好友的私信内容、漂流瓶内容会存储在服务器上，用于维持对话连贯性和消息送达。',
      },
      {
        label: '设备与日志信息',
        desc: '我们通过 Cloudflare CDN 提供网站访问服务，CDN 可能自动收集您的 IP 地址、浏览器类型、访问时间等日志信息，用于网络安全防护和流量优化。我们不主动收集设备指纹或其他追踪标识。',
      },
    ],
  },
  {
    title: '二、我们如何使用您的信息',
    items: [
      {
        label: '提供核心服务',
        desc: '账号认证、游戏存档同步、社交功能（好友、私信、漂流瓶、岛屿参观）、AI 对话等核心功能均依赖您提供的信息运行。',
      },
      {
        label: 'AI 对话服务（DeepSeek）',
        desc: '当您与「辞」聊天时，您的消息内容会被发送至 DeepSeek API 进行智能回复生成。DeepSeek 的数据处理受其自身隐私政策约束。我们不会将您的聊天内容用于训练 AI 模型或其他商业用途。您可在 DeepSeek 官方网站查阅其隐私政策。',
      },
      {
        label: '消息通知',
        desc: '我们通过信箱系统向您发送系统公告、好友申请通知、音乐卡片赠送通知等。这些通知仅与游戏功能相关，我们不会发送商业推广信息。',
      },
      {
        label: '安全与防滥用',
        desc: '我们使用收集的信息防止欺诈、滥用和其他违法行为，保障平台和用户的安全。',
      },
    ],
  },
  {
    title: '三、信息共享与披露',
    items: [
      {
        label: '第三方服务提供商',
        desc: '我们将信息共享给以下第三方：\n• DeepSeek（深度求索）—— AI 对话服务\n• Cloudflare —— CDN 与网络安全服务\n• 阿里云 —— 服务器托管服务\n这些服务商受各自隐私政策约束，我们仅共享提供服务所必需的最少信息。',
      },
      {
        label: '用户间可见信息',
        desc: '以下信息对其他用户可见：用户名、头像、岛屿名称、访客簿留言、漂流瓶内容。您应意识到这些信息的公开性，避免在其中包含敏感个人信息。',
      },
      {
        label: '法律要求',
        desc: '在法律法规要求、法律程序、诉讼或政府主管部门强制性要求下，我们可能会披露您的相关信息。',
      },
      {
        label: '我们不会',
        desc: '我们不会向任何第三方出售、出租或交易您的个人信息。我们不会在未经您同意的情况下将您的信息用于与本政策不符的用途。',
      },
    ],
  },
  {
    title: '四、数据存储与安全',
    items: [
      {
        label: '存储位置',
        desc: '您的数据存储在位于中国境内的阿里云服务器上。通过 Cloudflare CDN 提供全球加速访问。',
      },
      {
        label: '存储期限',
        desc: '在您使用我们的服务期间，我们会持续保存您的信息。当您注销账号或要求删除数据时，我们将在 30 个工作日内删除或匿名化处理您的个人信息。',
      },
      {
        label: '安全措施',
        desc: '我们采用 HTTPS 加密传输、bcrypt 密码哈希、访问权限控制等技术手段保护您的数据安全。但请注意，互联网传输并非绝对安全，我们无法保证信息传输的绝对安全性。',
      },
      {
        label: '数据备份',
        desc: '我们定期对服务器数据进行备份，以防止数据丢失。备份数据享有与本政策同等的安全保护措施。',
      },
    ],
  },
  {
    title: '五、您的权利',
    items: [
      {
        label: '查阅与更正',
        desc: '您可随时在游戏内「居民证」页面查阅和修改您的个人资料信息。',
      },
      {
        label: '删除数据',
        desc: '您可以通过游戏内「设置 → 一键清除数据」功能清除本地游戏存档。如需删除服务器端数据或注销账号，请联系我们。',
      },
      {
        label: '导出数据',
        desc: '您可以通过游戏内「设置 → 导出文件」功能导出您的岛屿存档数据。',
      },
      {
        label: '撤回同意',
        desc: '您可以随时停止使用我们的服务。对于 AI 对话功能，您可以选择不与「辞」聊天来避免信息被发送至 DeepSeek API。',
      },
    ],
  },
  {
    title: '六、未成年人保护',
    items: [
      {
        label: '年龄要求',
        desc: '本游戏面向 14 周岁及以上用户。如果您是未满 14 周岁的未成年人，请在法定监护人的陪同下阅读本政策，并在取得监护人同意后使用我们的服务。',
      },
      {
        label: '未成年人信息保护',
        desc: '我们不会主动收集未满 14 周岁未成年人的个人信息。如果我们发现在未取得法定监护人同意的情况下收集了未成年人的个人信息，我们将尽快删除相关信息。',
      },
    ],
  },
  {
    title: '七、Cookie 与本地存储',
    items: [
      {
        label: '本地存储',
        desc: '我们使用浏览器的 localStorage 存储您的游戏存档、登录状态和偏好设置。这些数据存储在您的设备本地，您可以通过浏览器设置或游戏内「一键清除数据」功能清除这些数据。',
      },
      {
        label: 'Cloudflare Cookie',
        desc: 'Cloudflare 可能设置 __cfduid 等 Cookie 用于安全防护和流量管理。这些 Cookie 不包含个人身份信息，您可以通过浏览器设置管理或删除这些 Cookie。',
      },
    ],
  },
  {
    title: '八、政策更新',
    items: [
      {
        label: '更新通知',
        desc: '我们可能会不时更新本隐私政策。重大变更时，我们会通过游戏内信箱公告或弹窗提示的方式通知您。继续使用我们的服务即表示您同意受修订后的隐私政策约束。',
      },
      {
        label: '版本记录',
        desc: '本政策最新版本发布日期：2026 年 6 月 16 日。',
      },
    ],
  },
  {
    title: '九、联系我们',
    items: [
      {
        label: '联系方式',
        desc: '如果您对本隐私政策有任何疑问、建议或需要行使您的数据权利，请通过以下方式联系我们：\n\n• 游戏内信箱：发送邮件给「辞」\n• 电子邮件：huyanxius@gmail.com\n\n我们将在 15 个工作日内回复您的请求。',
      },
    ],
  },
];

export const PrivacyPolicyModal: React.FC<{
  onClose: () => void;
  showAgree?: boolean;
  onAgree?: () => void;
}> = ({ onClose, showAgree, onAgree }) => {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="hand-drawn-panel w-[640px] max-w-[92vw] max-h-[85vh] p-0 flex flex-col animate-slide-up ring-1 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-slate-800 px-8 py-6 shrink-0">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-amber-600" />
          <h2 className="text-2xl hand-drawn-title -rotate-1">隐私政策</h2>
        </div>
        <button onClick={() => { AudioSystem.playClose(); onClose(); }} className="hand-drawn-btn p-2 rounded-full flex items-center justify-center border-0 hover:bg-slate-200">
          <X size={24} strokeWidth={3} className="text-slate-800" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="mb-6 text-center">
          <p className="text-slate-500 text-[10px] font-mono tracking-[0.3em] uppercase">PRIVACY POLICY</p>
          <p className="text-slate-400 text-[10px] mt-1">生效日期：2026 年 6 月 16 日 · 最近更新：2026 年 6 月 16 日</p>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            欢迎来到「流浪岛」。我们深知个人信息对您的重要性，并将按照法律法规的规定，保护您的个人信息及隐私安全。我们制定本隐私政策以帮助您了解我们如何收集、使用、存储和保护您的信息。请您在使用我们的服务前，仔细阅读并充分理解本政策的全部内容。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {PRIVACY_CONTENT.map((section, si) => {
            const isExpanded = expandedSection === si;
            return (
              <div
                key={si}
                className="rounded-xl border border-slate-200/80 overflow-hidden transition-all duration-300"
                style={{ background: isExpanded ? 'rgba(254,243,199,0.3)' : 'rgba(255,255,255,0.5)' }}
              >
                <button
                  onClick={() => { setExpandedSection(isExpanded ? null : si); AudioSystem.playTap(); }}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
                >
                  <span className="text-sm font-bold text-slate-800 tracking-wide flex-1">{section.title}</span>
                  <span
                    className="text-slate-400 text-xs transition-transform duration-300"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <ChevronDown size={16} />
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: isExpanded ? 2000 : 0, opacity: isExpanded ? 1 : 0 }}
                >
                  <div className="px-5 pb-4 flex flex-col gap-4">
                    {section.items.map((item, ii) => (
                      <div key={ii} className="flex flex-col gap-1">
                        <p className="text-[12px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md self-start border border-amber-200/50">
                          {item.label}
                        </p>
                        <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap pl-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200/50 text-center">
          <p className="text-slate-400 text-[10px]">流浪岛 · 流浪岛生态沙盒 · 隐私政策 v1.0</p>
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
              我已阅读并同意《流浪岛隐私政策》，了解平台将按照本政策收集、使用和保护我的个人信息。
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
