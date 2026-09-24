/** 全局功能配置 — 密码、文案与入口 */

export const gateConfig = {
  title: "月光之门",
  question: "到今天为止，我们认识多久啦？",
  password: "1550",
  errorMessage: "星光暂未通行，请再试一次",
  successMessage: "月色解锁，星河为你敞开。",
  confirmLabel: "确认",
  /** 解锁后跳转 */
  successRedirect: "/home",
} as const;

export const homeConfig = {
  title: "星光藏回忆，月光启新序",
  /** 副标题：分三行显示 */
  subtitleLines: [
    "漫天星光之下，封存我们一路走来的所有回忆；",
    "清辉月光漫过，前方是我们将要一起奔赴的未来。",
    "从相遇的那天起，星河为证，岁岁同行。",
  ],
  entries: [
    { id: "journey", label: "星图航线", href: "/journey" },
    { id: "letters", label: "月光信局", href: "/letters" },
  ],
  music: {
    defaultOn: false,
    playLabel: "播放音乐",
    pauseLabel: "暂停音乐",
  },
} as const;
