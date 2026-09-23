export type GateContent = {
  title: string;
  subtitle: string;
  hint: string;
  cta: string;
};

/** @deprecated 请优先使用 config.ts 中的 gateConfig */
export const gateContent: GateContent = {
  title: "月光之门",
  subtitle: "初次相识的星光落下，至今多少晨昏？",
  hint: "输入答案以通行",
  cta: "确认",
};
