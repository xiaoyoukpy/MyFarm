/**
 * data.js - 数据配置
 * 包含初始数据模板、天气概率、作物/建筑配置
 */

const CONFIG = {
  VERSION: '1.0.1',
  STORAGE_KEY: 'myFarmData',
  
  INITIAL_GOLD: 100,
  INITIAL_MAX_PLANS: 3,
  INITIAL_LAND_COUNT: 2,
  
  WEATHER_PROBABILITIES: {
    sunny: 0.5,
    rainy: 0.25,
    cloudy: 0.15,
    snowy: 0.1
  },
  
  SPECIAL_EVENT_CHANCE: 0.1,
  MAX_BUILDING_LEVEL: 3
};

const WEATHER_TYPES = {
  sunny: { name: '晴', icon: 'sunny' },
  rainy: { name: '雨', icon: 'rainy' },
  cloudy: { name: '阴', icon: 'cloudy' },
  snowy: { name: '雪', icon: 'snowy' }
};

const CROP_TYPES = {
  carrot: {
    name: '胡萝卜',
    daysToHarvest: 3,
    harvestValue: 30,
    seedCost: 10
  },
  tomato: {
    name: '番茄',
    daysToHarvest: 5,
    harvestValue: 50,
    seedCost: 20
  },
  corn: {
    name: '玉米',
    daysToHarvest: 4,
    harvestValue: 40,
    seedCost: 15
  },
  potato: {
    name: '土豆',
    daysToHarvest: 6,
    harvestValue: 60,
    seedCost: 25
  }
};

const BUILDING_TYPES = {
  field: {
    name: '田地',
    baseCost: 50,
    baseBuildDays: 3,
    description: '增加一块可用田地，每块田地可种植2个作物。扩建田地是扩大农场规模的基础。'
  },
  barn: {
    name: '谷仓',
    baseCost: 100,
    baseBuildDays: 4,
    description: '存储和加工农产品，建成后所有作物收获收益永久提升10%。性价比最高的长期投资。'
  },
  chickenCoop: {
    name: '鸡舍',
    baseCost: 80,
    baseBuildDays: 5,
    description: '饲养家禽的场所，每天产出金币（Lv1：15/Lv2：20/Lv3：25），稳定的被动收入来源。',
    dailyIncome: [15, 20, 25]
  },
  well: {
    name: '水井',
    baseCost: 60,
    baseBuildDays: 3,
    maxCount: 2,
    description: '提供灌溉水源，每座使作物成熟速度提升10%（最多建造2座）。'
  }
};

const INITIAL_CROPS = [
  { id: 'crop_1', name: '胡萝卜', type: 'carrot', plantDate: 1, daysToHarvest: 3, status: 'growing' },
  { id: 'crop_2', name: '胡萝卜', type: 'carrot', plantDate: 1, daysToHarvest: 3, status: 'growing' }
];

const INITIAL_LETTERS = [
  {
    id: 'letter_1',
    from: '🏡 农场协会',
    title: '欢迎来到你的农场！',
    content: '亲爱的农场主，欢迎！让我先为你介绍这本笔记本的各个区域：\n\n📬 通讯：接收农场协会的信件和通知\n\n🌾 农场情况：查看今日天气、作物生长状态、建筑列表和今日小结\n\n📋 计划项目：在这里安排种植作物、建造建筑、升级建筑等计划，同时最多进行3个计划\n\n📊 日志：查看每日的收支记录和事件\n\n底部的"翻到下一页"按钮会推进一天，自动结算所有计划和作物生长。\n\n现在，请点击下方各个标签熟悉一下吧！',
    isRead: false,
    triggerDay: 1,
    hasReply: false,
    replyOptions: [],
    isTriggered: false
  },
  {
    id: 'letter_2',
    from: '🏡 农场协会',
    title: '开始你的第一个计划',
    content: '你已经熟悉了农场，是时候开始新的种植了！\n\n点击"📋 计划项目"，你可以同时进行最多3个计划。\n\n选择"种植胡萝卜"，消耗10金币，作物会在第二天开始生长，3天后就能收获！',
    isRead: false,
    triggerDay: 3,
    hasReply: false,
    replyOptions: [],
    isTriggered: false
  },
  {
    id: 'letter_3',
    from: '🏡 农场协会',
    title: '收获与建筑',
    content: '你的胡萝卜应该快成熟了！\n\n当作物状态显示"可收获"时，点击"收获"按钮就能获得金币。\n\n在"📋 计划项目"中可以建造建筑（每种最高3级）：\n• 田地（50金币）- 增加一块田地，每块可种2个作物\n• 谷仓（100金币）- 收获收益永久+10%\n• 鸡舍（80金币）- 每天产出金币，升级提高产量\n• 水井（60金币）- 每座成熟速度+10%，最多建2座',
    isRead: false,
    triggerDay: 5,
    hasReply: false,
    replyOptions: [],
    isTriggered: false
  },
  {
    id: 'letter_4',
    from: '🏡 农场协会',
    title: '升级与天气',
    content: '建筑可以升级来提升效果，每种建筑最高3级！在"升级建筑"区域选择已建造的建筑即可。\n\n另外，农场天气每天变化：\n☀️🌧️☁️ 正常生长\n❄️ 雪天 - 生长延迟1天\n\n偶尔会触发特殊事件，留意"今日小结"！',
    isRead: false,
    triggerDay: 7,
    hasReply: false,
    replyOptions: [],
    isTriggered: false
  },
  {
    id: 'letter_5',
    from: '🏡 农场协会',
    title: '经营进阶指南',
    content: '农场主，你的农场已经初具规模了！\n\n以下是一些进阶建议：\n• 合理安排多个计划，提高效率\n• 建造谷仓能永久提升10%收获收益\n• 注意天气变化，雪天会影响作物生长\n• 积累金币扩建更多田地',
    isRead: false,
    triggerDay: 9,
    hasReply: false,
    replyOptions: [],
    isTriggered: false
  },
  {
    id: 'letter_6',
    from: '🏡 农场协会',
    title: '农场发展回顾',
    content: '亲爱的农场主，你已经经营了11天！\n\n回顾这段时间，你已经掌握了农场经营的要诀。继续努力，打造属于你的理想农场吧！\n\n记住：\n• 持续种植收获，积累财富\n• 升级建筑提升效率\n• 应对天气和事件的挑战',
    isRead: false,
    triggerDay: 11,
    hasReply: false,
    replyOptions: [],
    isTriggered: false
  }
];

const SPECIAL_EVENTS = [
  {
    id: 'market_promotion',
    name: '市集促销！',
    description: '今日收获金币+20%',
    type: 'positive',
    goldMultiplier: 1.2
  },
  {
    id: 'storm',
    name: '暴风雨来袭！',
    description: '损失了10金币',
    type: 'negative',
    goldLoss: 10
  },
  {
    id: 'lucky_find',
    name: '幸运发现！',
    description: '在田地里发现了15金币',
    type: 'positive',
    goldGain: 15
  },
  {
    id: 'pest_attack',
    name: '害虫侵袭！',
    description: '部分作物生长延迟1天',
    type: 'negative',
    delayGrowth: 1
  },
  {
    id: 'traveling_merchant',
    name: '旅行商人！',
    description: '获得了免费种子',
    type: 'positive',
    freeSeed: true
  }
];

const DAILY_LOG_TEMPLATES = {
  sunny: '天气晴朗，作物茁壮成长。',
  rainy: '下起了小雨，作物得到了滋润。',
  cloudy: '阴天，适合农作。',
  snowy: '下雪了，作物生长减缓。',
  plan_complete: '计划"{planName}"已完成！',
  crop_harvested: '收获了{cropName}，获得{gold}金币。',
  event_occurred: '发生了事件：{eventName}',
  letter_received: '收到了来自{from}的信件：{title}'
};
