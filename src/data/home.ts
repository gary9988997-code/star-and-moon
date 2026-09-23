export type HomeSection = {
  id: string;
  title: string;
  description: string;
};

export type HomeContent = {
  heroTitle: string;
  heroSubtitle: string;
  sections: HomeSection[];
};

/** @deprecated 请优先使用 config.ts 中的 homeConfig */
export const homeContent: HomeContent = {
  heroTitle: "星光藏回忆，月光启新序",
  heroSubtitle: "漫天星光之下，封存我们一路走来的所有回忆；",
  sections: [],
};
