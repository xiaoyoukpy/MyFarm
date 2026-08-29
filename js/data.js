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
  SNOW_FREEZE_CHANCE: 0.3,
  MYSTERY_SEED_COST: 100,
  MYSTERY_SEED_MONTHLY_LIMIT: 3,
  MYSTERY_SEED_GROWTH_DAYS: 5,
  MAX_BUILDING_LEVEL: 3,
  SEASON_DAYS: 30,

  NEW_AREA_UNLOCK_COST: 45000,
  WORKSHOP_BUILD_COST: 20000,
  ARCADE_BUILD_COST: 15000,
  WORKSHOP_MAINTENANCE: 2500,
  WORKSHOP_PROCESS_DAYS: 2,
  PRODUCT_MULTIPLIER: 2.5,
  WHEEL: { green: 1, red: 18, black: 18, redPayout: 2, greenPayout: 20 },
  PERFECT_SEASON_INCOME: 2500,
  
  MERCHANT_ORDER_CHANCE: 0.25,
  MERCHANT_ORDER_DAYS: 5,
  MERCHANT_MAX_ACTIVE: 2,
  MERCHANT_PREMIUM_MIN: 1.4,
  MERCHANT_PREMIUM_MAX: 1.7,
  
  EGG_LAY_CHANCE: 0.6,
  LARGE_EGG_CHANCE: 0.1,
  CHICKEN_PRICE: 50,
  COOP_CAPACITY_PER: 5,
  
  DEBUG_MODE: false,

  SPONSOR: {
    wechatId: '',
    wechatUrl: '',
    tiers: [
      { price: 2, gold: 2000 },
      { price: 5, gold: 5000 },
      { price: 10, gold: 12000 }
    ]
  }
};

const WEATHER_TYPES = {
  sunny: { name: '晴', icon: 'sunny' },
  rainy: { name: '雨', icon: 'rainy' },
  cloudy: { name: '阴', icon: 'cloudy' },
  snowy: { name: '雪', icon: 'snowy' }
};

const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

const SEASONS = {
  spring: {
    name: '春',
    growthMultiplier: 0.8,
    incomeMultiplier: 0.8,
    description: '万物复苏，作物生长最快，但收购价较低。'
  },
  summer: {
    name: '夏',
    growthMultiplier: 1.0,
    incomeMultiplier: 0.7,
    description: '烈日炎炎，作物正常生长，收购价是一年中最低的。'
  },
  autumn: {
    name: '秋',
    growthMultiplier: 1.2,
    incomeMultiplier: 1.2,
    description: '秋高气爽，作物生长变慢，但收购价更高。'
  },
  winter: {
    name: '冬',
    growthMultiplier: 1.5,
    incomeMultiplier: 1.5,
    description: '严寒漫长，作物生长最慢，但收购价是一年中最高的。'
  }
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
  },
  cabbage: {
    name: '卷心菜',
    daysToHarvest: 5,
    harvestValue: 45,
    seedCost: 20
  },
  pumpkin: {
    name: '南瓜',
    daysToHarvest: 7,
    harvestValue: 90,
    seedCost: 45
  },
  watermelon: {
    name: '西瓜',
    daysToHarvest: 6,
    harvestValue: 85,
    seedCost: 35,
    unlockCost: 200
  },
  eggplant: {
    name: '茄子',
    daysToHarvest: 5,
    harvestValue: 55,
    seedCost: 22,
    unlockCost: 320
  },
  grape: {
    name: '葡萄',
    daysToHarvest: 7,
    harvestValue: 95,
    seedCost: 40,
    unlockCost: 550
  },
  spinach: {
    name: '菠菜',
    daysToHarvest: 3,
    harvestValue: 35,
    seedCost: 12,
    unlockCost: 90
  },
  apple: {
    name: '苹果',
    daysToHarvest: 5,
    harvestValue: 45,
    seedCost: 20,
    unlockCost: 180
  },
  strawberry: {
    name: '草莓',
    daysToHarvest: 4,
    harvestValue: 20,
    seedCost: 40,
    regrowDays: 2,
    unlockCost: 150
  },
  blueberry: {
    name: '蓝莓',
    daysToHarvest: 5,
    harvestValue: 30,
    seedCost: 60,
    regrowDays: 2,
    unlockCost: 350
  },
  pepper: {
    name: '辣椒',
    daysToHarvest: 5,
    harvestValue: 25,
    seedCost: 50,
    regrowDays: 2,
    unlockCost: 250
  },
  tomato: {
    name: '番茄',
    daysToHarvest: 5,
    harvestValue: 28,
    seedCost: 45,
    regrowDays: 2,
    unlockCost: 300
  },
  egg: {
    name: '鸡蛋',
    harvestValue: 15,
    seedCost: 0,
    animalProduct: true
  },
  largeEgg: {
    name: '大鸡蛋',
    harvestValue: 22,
    seedCost: 0,
    animalProduct: true
  }
};

const BUILDING_TYPES = {
  field: {
    name: '田地',
    baseCost: 50,
    baseBuildDays: 3,
    description: '增加一块可用田地。每升1级增加1个种植位（Lv1：2个/Lv2：3个/Lv3：4个作物）。',
    capacityPerLevel: [2, 3, 4]
  },
  barn: {
    name: '谷仓',
    baseCost: 100,
    baseBuildDays: 4,
    maxCount: 3,
    description: '提升作物售价，可建造多座叠加。每座加成：Lv1 +8% / Lv2 +16% / Lv3 +20%。',
    incomeBonusPerLevel: [0.08, 0.16, 0.20]
  },
  chickenCoop: {
    name: '鸡舍',
    baseCost: 80,
    baseBuildDays: 5,
    description: '饲养家禽的场所，可容纳5只母鸡。母鸡每天有几率产蛋，大鸡蛋更值钱。请在「鸡舍」页购买母鸡。',
    capacityPer: 5
  },
  well: {
    name: '水井',
    baseCost: 60,
    baseBuildDays: 3,
    maxCount: 2,
    description: '缩短作物成熟时间，最多建造2座，效果可叠加。每座加速：Lv1 5% / Lv2 10% / Lv3 15%。',
    speedBonusPerLevel: [0.05, 0.10, 0.15]
  },
  harvester: {
    name: '收割机',
    baseCost: 2000,
    baseBuildDays: 5,
    maxCount: 1,
    description: '作物成熟后自动收割并存入仓库，无需手动操作。每座都生效，最多1座。'
  }
};

const NEW_AREA_BUILDINGS = {
  workshop: {
    name: '加工坊',
    buildCost: 20000,
    description: '把仓库里的作物加工成更高价的制品（例：苹果→苹果酱、土豆→土豆泥）。每月需缴纳 2500 金币机器维护费，欠费会停用，需手动补缴。',
    maxLevel: 3
  },
  arcade: {
    name: '娱乐厅',
    buildCost: 15000,
    description: '提供休闲娱乐设施。已开放项目：幸运轮盘——把金币押在红/黑/绿上，红黑中奖翻 2 倍、绿色翻 20 倍，猜错本金全无。',
    maxLevel: 3
  }
};

const PRODUCT_RECIPES = {
  apple: '苹果酱',
  potato: '土豆泥',
  carrot: '胡萝卜泥',
  tomato: '番茄酱',
  corn: '玉米罐头',
  cabbage: '酸菜',
  pumpkin: '南瓜派',
  watermelon: '西瓜汁',
  eggplant: '茄子酱',
  grape: '葡萄酒',
  spinach: '菠菜汁',
  strawberry: '草莓酱',
  blueberry: '蓝莓酱',
  pepper: '辣椒酱'
};

const INITIAL_CROPS = [
  { id: 'crop_1', name: '胡萝卜', type: 'carrot', plantDate: 1, daysToHarvest: 3, status: 'growing' },
  { id: 'crop_2', name: '胡萝卜', type: 'carrot', plantDate: 1, daysToHarvest: 3, status: 'growing' }
];

const SPECIAL_ITEM_VALUES = {
  mysterySeed: 50,
  lottery: 100000,
  trophy: 1000
};

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
    content: '你的胡萝卜应该快成熟了！\n\n当作物状态显示"可收获"时，点击"收获"，作物会存入「📦 农场仓库」，在仓库里选择数量、看准价格再出售。\n\n「📋 计划项目」中可以建造建筑（每种最高3级）：\n• 田地（50金币）- 增加一块田地，升级可增加种植位\n• 谷仓（100金币）- 提升售价，可建3座叠加\n• 鸡舍（80金币）- 建好后到「🐔 鸡舍」页购买母鸡产蛋\n• 水井（60金币）- 缩短成熟时间，最多2座叠加\n\n另外，「📬 通讯」里偶尔会出现合作商人的高价收购订单，记得备货！',
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
  },
  {
    id: 'letter_7',
    from: '🏡 农场协会',
    title: '农场另一侧的新区',
    content: '农场主，你是否好奇农场另一头那片尚未开发的土地？\n\n那里被称为「小镇」，藏着更多营生的门路。等到第二个月（第 31 天起），你可以支付 45000 金币开通这片新区。\n\n开通后，右侧会多出「下一区域」的入口，点进去就能看到两座设施：\n• 🏭 加工坊：把仓库里的作物加工成更高价的制品（例：苹果→苹果酱、土豆→土豆泥），每月需缴纳维护费，欠费会停用\n• 🎡 娱乐厅：里面有幸运轮盘，押红/黑/绿碰碰运气\n\n先安心经营，攒够金币，第二个月再来探索吧！',
    isRead: false,
    triggerDay: 13,
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
    description: '损失了当前金币的10%',
    type: 'negative',
    goldLossPercent: 0.1
  },
  {
    id: 'lucky_find',
    name: '幸运发现！',
    description: '在田地里发现了30金币',
    type: 'positive',
    goldGain: 15
  },
  {
    id: 'pest_attack',
    name: '害虫侵袭！',
    description: '部分作物生长延迟1天',
    type: 'negative',
    delayGrowth: 1
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
