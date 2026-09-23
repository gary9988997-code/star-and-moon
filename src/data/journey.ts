export type JourneyCityData = {
  city: string;
  title: string;
  description: string;
  photos: string[];
  lat: number;
  lng: number;
};

export type JourneyStop = {
  id: string;
  city: string;
  title: string;
  summary: string;
  photos: string[];
  date?: string;
};

/** 星图航线真实数据源（城市为核心） */
export const journeyData: JourneyCityData[] = [
  // 过去节点（11 个）
  {
    city: "长沙",
    title: "初见与缱绻",
    description: "在一个烟火气的城市遇见了我人生的烟火。",
    photos: [
      "changsha_01.jpg",
      "changsha_02.jpg",
      "changsha_03.jpg",
      "changsha_04.jpg",
      "changsha_05.jpg",
      "changsha_06.jpg",
      "changsha_07.jpg",
    ],
    lat: 28.23,
    lng: 112.94,
  },
  {
    city: "北京",
    title: "京城四季",
    description: "陪我一起走过北京的春夏秋冬",
    photos: [
      "beijing_01.jpg",
      "beijing_02.jpg",
      "beijing_03.jpg",
      "beijing_04.jpg",
      "beijing_05.jpg",
      "beijing_06.jpg",
      "beijing_07.jpg",
      "beijing_08.jpg",
      "beijing_09.jpg",
      "beijing_10.jpg",
      "beijing_11.jpg",
      "beijing_12.jpg",
      "beijing_13.jpg",
      "beijing_14.jpg",
    ],
    lat: 39.9,
    lng: 116.4,
  },
  {
    city: "杭州",
    title: "苏杭·天堂",
    description: "有你的杭州也可以成为我的天堂",
    photos: [
      "hangzhou_01.jpg",
      "hangzhou_02.jpg",
      "hangzhou_03.jpg",
      "hangzhou_04.jpg",
      "hangzhou_05.jpg",
      "hangzhou_06.jpg",
      "hangzhou_07.jpg",
      "hangzhou_08.jpg",
      "hangzhou_09.jpg",
      "hangzhou_10.jpg",
    ],
    lat: 30.27,
    lng: 120.15,
  },
  {
    city: "绍兴",
    title: "江南之忆",
    description: "能不忆江南？",
    photos: [
      "shaoxing_01.jpg",
      "shaoxing_02.jpg",
      "shaoxing_03.jpg",
      "shaoxing_04.jpg",
    ],
    lat: 30.0,
    lng: 120.58,
  },
  {
    city: "日本",
    title: "闯关西",
    description: "霓虹的晚风也比不上你的温柔",
    photos: [
      "japan_01.jpg",
      "japan_02.jpg",
      "japan_03.jpg",
      "japan_04.jpg",
      "japan_05.jpg",
      "japan_06.jpg",
      "japan_07.jpg",
    ],
    lat: 34.69,
    lng: 135.5,
  },
  {
    city: "上海",
    title: "迪士尼初体验",
    description: "给我的公主当骑士",
    photos: [
      "shanghai_01.jpg",
      "shanghai_02.jpg",
      "shanghai_03.jpg",
      "shanghai_04.jpg",
    ],
    lat: 31.23,
    lng: 121.47,
  },
  {
    city: "厦门",
    title: "走走停停",
    description: "车马春山慢慢行",
    photos: [
      "xiamen_01.jpg",
      "xiamen_02.jpg",
      "xiamen_03.jpg",
      "xiamen_04.jpg",
      "xiamen_05.jpg",
    ],
    lat: 24.48,
    lng: 118.09,
  },
  {
    city: "澳门",
    title: "来了澳！",
    description: "富家千金和他的丑男保镖",
    photos: [
      "macao_01.jpg",
      "macao_02.jpg",
      "macao_03.jpg",
      "macao_04.jpg",
      "macao_05.jpg",
    ],
    lat: 22.2,
    lng: 113.54,
  },
  {
    city: "新加坡",
    title: "粉墨狮城",
    description: "赤道的风里，我们写完第一段星图",
    photos: [
      "singapore_01.jpg",
      "singapore_02.jpg",
      "singapore_03.jpg",
      "singapore_04.jpg",
      "singapore_05.jpg",
      "singapore_06.jpg",
      "singapore_07.jpg",
    ],
    lat: 1.35,
    lng: 103.82,
  },
  {
    city: "马尔代夫",
    title: "Yes！",
    description: "至今仍记得果冻海岸上的心跳声",
    photos: [
      "maldives_01.jpg",
      "maldives_02.jpg",
      "maldives_03.jpg",
      "maldives_04.jpg",
      "maldives_05.jpg",
      "maldives_06.jpg",
      "maldives_07.jpg",
      "maldives_08.jpg",
      "maldives_09.jpg",
      "maldives_10.jpg",
    ],
    lat: 3.2,
    lng: 73.22,
  },
  {
    city: "首尔",
    title: "Seoul和我的soul",
    description: "这以后就是我们的后花园了",
    photos: ["seoul_01.jpg", "seoul_02.jpg", "seoul_03.jpg", "seoul_04.jpg"],
    lat: 37.57,
    lng: 126.98,
  },
  // 未来节点（9 个）
  {
    city: "雷克雅未克",
    title: "Þetta reddast.",
    description: "一切都会好起来的",
    photos: ["future_iceland_01.jpg"],
    lat: 64.15,
    lng: -21.94,
  },
  {
    city: "慕尼黑",
    title: "安联球场",
    description: "陪你看你喜欢的球队。",
    photos: ["future_germany_01.jpg"],
    lat: 48.14,
    lng: 11.58,
  },
  {
    city: "肯尼亚马赛马拉",
    title: "野性 Safari",
    description: "We don't talk animal",
    photos: ["future_africa_01.jpg"],
    lat: -1.5,
    lng: 35.14,
  },
  {
    city: "美国加州迪士尼度假区",
    title: "加州迪士尼",
    description: "去最经典的迪士尼乐园，看睡美人城堡。",
    photos: [
      "california_disney_01.jpg",
      "california_disney_02.jpg",
      "california_disney_03.jpg",
      "california_disney_04.jpg",
      "california_disney_05.jpg",
    ],
    lat: 33.81,
    lng: -117.92,
  },
  {
    city: "美国奥兰多华特迪士尼世界",
    title: "奥兰多迪士尼世界",
    description: "全球最大的迪士尼，打卡四个主题乐园。",
    photos: [
      "orlando_disney_01.jpg",
      "orlando_disney_02.jpg",
      "orlando_disney_03.jpg",
      "orlando_disney_04.jpg",
      "orlando_disney_05.jpg",
    ],
    lat: 28.38,
    lng: -81.56,
  },
  {
    city: "日本东京迪士尼度假区",
    title: "东京迪士尼",
    description: "去东京迪士尼海洋，全球唯一的海洋主题。",
    photos: [
      "tokyo_disney_01.jpg",
      "tokyo_disney_02.jpg",
      "tokyo_disney_03.jpg",
      "tokyo_disney_04.jpg",
      "tokyo_disney_05.jpg",
    ],
    lat: 35.63,
    lng: 139.88,
  },
  {
    city: "法国巴黎迪士尼乐园",
    title: "巴黎迪士尼",
    description: "在睡美人城堡前看烟花。",
    photos: [
      "paris_disney_01.jpg",
      "paris_disney_02.jpg",
      "paris_disney_03.jpg",
      "paris_disney_04.jpg",
      "paris_disney_05.jpg",
    ],
    lat: 48.87,
    lng: 2.77,
  },
  {
    city: "美国好莱坞环球影城",
    title: "好莱坞环球影城",
    description: "去好莱坞，走一次真实的片场之旅。",
    photos: [
      "hollywood_universal_01.jpg",
      "hollywood_universal_02.jpg",
      "hollywood_universal_03.jpg",
      "hollywood_universal_04.jpg",
      "hollywood_universal_05.jpg",
    ],
    lat: 34.14,
    lng: -118.35,
  },
  {
    city: "美国奥兰多环球度假区",
    title: "奥兰多环球影城",
    description: "去史诗宇宙，走进哈利波特的魔法世界。",
    photos: [
      "orlando_universal_01.jpg",
      "orlando_universal_02.jpg",
      "orlando_universal_03.jpg",
      "orlando_universal_04.jpg",
      "orlando_universal_05.jpg",
    ],
    lat: 28.47,
    lng: -81.47,
  },
];

/**
 * 供页面使用的站点列表（不改 UI）：
 * description → summary，photos 补全为 /images/journey/ 路径
 */
export const journeyStops: JourneyStop[] = journeyData.map((item, index) => ({
  id: `city-${index + 1}`,
  city: item.city,
  title: item.title,
  summary: item.description,
  photos: item.photos.map((file) => `/images/journey/${file}`),
}));

export const journeyCopy = {
  title: "星图航线",
  hint: "轻点屏幕，去下一站",
  backHome: "返回首页",
  homeHref: "/home",
  closeLabel: "关闭",
  prevPhoto: "← 上一张",
  nextPhoto: "下一张 →",
} as const;
