export type ConstellationNode = {
  id: string;
  title: string;
  summary: string;
  year?: string;
};

export type ConstellationContent = {
  title: string;
  subtitle: string;
  nodes: ConstellationNode[];
};

/** 星图航线 — 占位节点，后续替换真实内容 */
export const constellationContent: ConstellationContent = {
  title: "星图航线",
  subtitle: "此处将放置时间线 / 星座航线说明",
  nodes: [
    { id: "n1", title: "第一颗星", summary: "占位事件描述", year: "——" },
    { id: "n2", title: "第二颗星", summary: "占位事件描述", year: "——" },
    { id: "n3", title: "第三颗星", summary: "占位事件描述", year: "——" },
    { id: "n4", title: "第四颗星", summary: "占位事件描述", year: "——" },
  ],
};
