export type GateContent = {
  title: string;
  subtitle: string;
  hint: string;
  cta: string;
};

/** @deprecated 请优先使用 config.ts 中的 gateConfig */
export const gateContent: GateContent = {
  title: "月光之门",
  subtitle: "到今天为止，我们认识多久啦？",
  hint: "输入答案以通行",
  cta: "确认",
};
