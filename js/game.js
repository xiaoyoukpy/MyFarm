/**
 * game.js - 核心游戏逻辑
 * Game类、翻页结算、计划执行、作物生长
 */

class Game {
  constructor() {
    this.data = null;
    this.currentSlot = 1;
    this.isFlipping = false;
    this.currentWeather = 'sunny';
    this.todayEvents = [];
    this.todayLogs = [];
    this.pendingCrops = [];
    this.flipLogCount = 0;
  }

  initGame(slot = 1) {
    this.currentSlot = slot;
    this.data = {
      version: CONFIG.VERSION,
      slot: slot,
      day: 1,
      gold: CONFIG.INITIAL_GOLD,
      maxPlans: CONFIG.INITIAL_MAX_PLANS,
      planSlotsBought: 0,
      landsBought: 0,
      farm: {
        crops: JSON.parse(JSON.stringify(INITIAL_CROPS)),
        buildings: [
          { id: 'field_init_1', name: '田地1', type: 'field', level: 1, status: 'built', buildDate: 1 },
          { id: 'field_init_2', name: '田地2', type: 'field', level: 1, status: 'built', buildDate: 1 }
        ],
        landCount: 2,
        cropsPerLand: 2
      },
      plans: [],
      letters: JSON.parse(JSON.stringify(INITIAL_LETTERS)),
      flags: {},
      warehouse: [],
      unlockedCrops: Object.keys(CROP_TYPES).filter(t => !CROP_TYPES[t].unlockCost),
      merchantOrders: [],
      cropStats: {},
      coop: { chickens: 0 },
      shop: { mysteryBought: 0, mysteryMonth: 0 },
      obtained: { lottery: false, trophy: false },
      newArea: { unlocked: false, buildings: [], workshopJobs: [] },
      dailyLogs: []
    };
    this.pendingCrops = [];
    this.flipLogCount = 0;
    this.triggerDayLetters();
    this.save();
    return this.data;
  }

  triggerDayLetters() {
    const today = this.data.day;
    this.data.letters.forEach(letter => {
      if (letter.triggerDay === today && !letter.isTriggered) {
        letter.isTriggered = true;
        letter.isRead = false;
      }
    });
  }

  migrateInitialFields() {
    if (!this.data.farm.buildings) {
      this.data.farm.buildings = [];
    }
    let fieldCount = this.data.farm.buildings.filter(b => b.type === 'field').length;
    const landCount = this.data.farm.landCount || 2;
    while (fieldCount < landCount) {
      fieldCount += 1;
      this.data.farm.buildings.push({
        id: 'field_init_' + fieldCount + '_' + Date.now(),
        name: '田地' + fieldCount,
        type: 'field',
        level: 1,
        status: 'built',
        buildDate: 1
      });
    }
  }

  loadData(slot) {
    if (slot !== undefined) {
      this.currentSlot = slot;
    }
    const saved = storageManager.loadGame(this.currentSlot);
    if (saved && saved.version === CONFIG.VERSION) {
      this.data = saved;
      this.currentSlot = saved.slot || this.currentSlot;
      this.pendingCrops = saved.pendingCrops || [];
      this.todayLogs = [];
      this.todayEvents = [];
      this.flipLogCount = 0;
      if (!this.data.farm.cropsPerLand) {
        this.data.farm.cropsPerLand = 2;
      }
      if (typeof this.data.gold !== 'number' || isNaN(this.data.gold)) {
        this.data.gold = CONFIG.INITIAL_GOLD;
      }
      if (this.data.gold < 0) {
        this.data.gold = 0;
      }
      if (!this.data.maxPlans) {
        this.data.maxPlans = CONFIG.INITIAL_MAX_PLANS;
      }
      if (typeof this.data.planSlotsBought !== 'number') {
        this.data.planSlotsBought = 0;
      }
      if (typeof this.data.landsBought !== 'number') {
        this.data.landsBought = 0;
      }
      if (!Array.isArray(this.data.warehouse)) {
        this.data.warehouse = [];
      }
      if (!Array.isArray(this.data.unlockedCrops)) {
        this.data.unlockedCrops = Object.keys(CROP_TYPES).filter(t => !CROP_TYPES[t].unlockCost);
      }
      if (!Array.isArray(this.data.merchantOrders)) {
        this.data.merchantOrders = [];
      }
      if (typeof this.data.cropStats !== 'object' || this.data.cropStats === null) {
        this.data.cropStats = {};
      }
      if (typeof this.data.coop !== 'object' || this.data.coop === null) {
        this.data.coop = { chickens: 0 };
      }
      if (typeof this.data.coop.chickens !== 'number' || isNaN(this.data.coop.chickens)) {
        this.data.coop.chickens = 0;
      }
      if (typeof this.data.shop !== 'object' || this.data.shop === null) {
        this.data.shop = { mysteryBought: 0, mysteryMonth: 0 };
      }
      if (typeof this.data.obtained !== 'object' || this.data.obtained === null) {
        this.data.obtained = { lottery: false, trophy: false };
      }
      if (typeof this.data.newArea !== 'object' || this.data.newArea === null) {
        this.data.newArea = { unlocked: false, buildings: [], workshopJobs: [] };
      }
      if (!Array.isArray(this.data.newArea.buildings)) {
        this.data.newArea.buildings = [];
      }
      if (!Array.isArray(this.data.newArea.workshopJobs)) {
        this.data.newArea.workshopJobs = [];
      }
      this.migrateInitialFields();
      this.triggerDayLetters();
      return true;
    }
    return false;
  }

  save() {
    if (typeof this.data.gold !== 'number' || isNaN(this.data.gold)) {
      this.data.gold = CONFIG.INITIAL_GOLD;
    }
    this.data.pendingCrops = this.pendingCrops;
    storageManager.saveGame(this.data, this.currentSlot);
  }

  resetGame() {
    storageManager.clearGame(this.currentSlot);
    this.initGame(this.currentSlot);
  }

  switchSlot(slot) {
    this.currentSlot = slot;
    return this.loadData(slot);
  }

  getCropCapacity() {
    return this.data.farm.buildings
      .filter(b => b.type === 'field' && b.status === 'built')
      .reduce((sum, b) => {
        const capacities = BUILDING_TYPES.field.capacityPerLevel || [2, 3, 4];
        return sum + (capacities[b.level - 1] || 2);
      }, 0);
  }

  getBarnBonus() {
    const bonuses = BUILDING_TYPES.barn.incomeBonusPerLevel || [0.08, 0.16, 0.20];
    return this.data.farm.buildings
      .filter(b => b.type === 'barn' && b.status === 'built')
      .reduce((sum, b) => sum + (bonuses[b.level - 1] || 0), 0);
  }

  getWellSpeedBonus() {
    const bonuses = BUILDING_TYPES.well.speedBonusPerLevel || [0.05, 0.10, 0.15];
    return this.data.farm.buildings
      .filter(b => b.type === 'well' && b.status === 'built')
      .reduce((sum, b) => sum + (bonuses[b.level - 1] || 0), 0);
  }

  getCurrentCropCount() {
    return this.data.farm.crops.length;
  }

  getPendingCropCount() {
    return this.pendingCrops.length;
  }

  getTotalCropCount() {
    return this.getCurrentCropCount() + this.getPendingCropCount();
  }

  canPlantCrop() {
    const capacity = this.getCropCapacity();
    const total = this.getTotalCropCount();
    return total < capacity;
  }

  getPlantingErrorMessage() {
    const capacity = this.getCropCapacity();
    const current = this.getCurrentCropCount();
    const pending = this.getPendingCropCount();
    
    if (current >= capacity && pending === 0) {
      return '田地已满，请建造新的田地';
    } else if (current + pending >= capacity) {
      return `田地容量不足（${current + pending}/${capacity}），请建造新的田地`;
    }
    return null;
  }

  addPendingCrop(cropData) {
    if (!this.canPlantCrop()) {
      return { success: false, message: this.getPlantingErrorMessage() };
    }

    if (!this.isCropUnlocked(cropData.type)) {
      return { success: false, message: '该作物尚未解锁' };
    }

    const gold = this.data.gold || 0;
    const seedCost = cropData.seedCost || 0;
    if (gold < seedCost) {
      return { success: false, message: '金币不足' };
    }

    this.data.gold = gold - seedCost;

    const pendingCrop = {
      id: 'pending_' + Date.now(),
      name: cropData.name,
      type: cropData.type,
      daysToHarvest: cropData.daysToHarvest,
      plantDay: this.data.day + 1
    };

    this.pendingCrops.push(pendingCrop);
    this.save();

    return { 
      success: true, 
      message: `${cropData.name}将在明天耕种`,
      pendingCrop: pendingCrop
    };
  }

  finalizeCurrentDayLogs() {
    const playerLogs = this.todayLogs.slice(this.flipLogCount || 0);
    if (playerLogs.length === 0) return;

    const dayIncome = playerLogs
      .filter(l => l.type === 'harvest' || l.type === 'sell' || l.type === 'merchant_sell' || l.type === 'coop_income')
      .reduce((sum, l) => sum + (l.data.gold || 0), 0);
    const dayHarvests = playerLogs.filter(l => l.type === 'harvest').length;

    const lastEntry = this.data.dailyLogs[this.data.dailyLogs.length - 1];
    if (lastEntry && lastEntry.day === this.data.day) {
      lastEntry.logs = [...(lastEntry.logs || []), ...playerLogs];
      lastEntry.goldEarned = (lastEntry.goldEarned || 0) + dayIncome;
      lastEntry.cropsHarvested = (lastEntry.cropsHarvested || 0) + dayHarvests;
    } else {
      this.data.dailyLogs.push({
        day: this.data.day,
        season: this.getSeason(),
        goldEarned: dayIncome,
        cropsHarvested: dayHarvests,
        events: this.currentWeather,
        logs: [...playerLogs]
      });
    }
  }

  async flipPage(onProgress) {
    if (this.isFlipping) return false;
    this.isFlipping = true;
    this.finalizeCurrentDayLogs();
    this.todayEvents = [];
    this.todayLogs = [];
    this.flipLogCount = 0;

    if (onProgress) onProgress('validating');
    await this.delay(100);

    if (onProgress) onProgress('flipping');
    await this.delay(800);

    this.data.day += 1;
    if (onProgress) onProgress('dayAdvanced');
    await this.delay(100);

    if (Math.floor((this.data.day - 2) / 30) !== Math.floor((this.data.day - 1) / 30)) {
      this.processWorkshopMaintenance();
    }

    this.plantPendingCrops();
    if (onProgress) onProgress('cropsPlanted');
    await this.delay(100);

    this.executePlans();
    if (onProgress) onProgress('plansExecuted');
    await this.delay(100);

    this.collectEggs();
    if (onProgress) onProgress('incomeCollected');
    await this.delay(100);

    this.growCrops();
    if (onProgress) onProgress('cropsGrown');
    await this.delay(100);

    this.autoHarvest();
    this.processWorkshopJobs();

    this.generateWeather();
    if (onProgress) onProgress('weatherGenerated');
    await this.delay(100);

    this.triggerSpecialEvents();
    if (onProgress) onProgress('eventsTriggered');
    await this.delay(100);

    this.triggerLetters();
    if (onProgress) onProgress('lettersTriggered');
    await this.delay(100);

    this.processSeasonEvents();

    this.data.dailyLogs.push({
      day: this.data.day,
      season: this.getSeason(),
      goldEarned: this.todayLogs.filter(l => l.type === 'harvest' || l.type === 'sell' || l.type === 'merchant_sell' || l.type === 'coop_income').reduce((sum, l) => sum + (l.data.gold || 0), 0),
      cropsHarvested: this.todayLogs.filter(l => l.type === 'harvest').length,
      events: this.currentWeather,
      logs: this.todayLogs.slice()
    });
    this.flipLogCount = this.todayLogs.length;

    this.save();
    if (onProgress) onProgress('saved');
    await this.delay(100);

    this.isFlipping = false;
    if (onProgress) onProgress('complete');
    return true;
  }

  skipDays(count) {
    if (this.isFlipping) return false;
    this.isFlipping = true;

    for (let i = 0; i < count; i++) {
      this.finalizeCurrentDayLogs();
      this.todayEvents = [];
      this.todayLogs = [];
      this.flipLogCount = 0;

      this.data.day += 1;
      if (Math.floor((this.data.day - 2) / 30) !== Math.floor((this.data.day - 1) / 30)) {
        this.processWorkshopMaintenance();
      }
      this.plantPendingCrops();
      this.executePlans();
      this.collectEggs();
      this.growCrops();
      this.autoHarvest();
      this.processWorkshopJobs();
      this.generateWeather();
      this.triggerSpecialEvents();
      this.triggerLetters();
      this.processSeasonEvents();

      this.data.dailyLogs.push({
        day: this.data.day,
        season: this.getSeason(),
        goldEarned: this.todayLogs.filter(l => l.type === 'harvest' || l.type === 'sell' || l.type === 'merchant_sell' || l.type === 'coop_income').reduce((sum, l) => sum + (l.data.gold || 0), 0),
        cropsHarvested: this.todayLogs.filter(l => l.type === 'harvest').length,
        events: this.currentWeather,
        logs: this.todayLogs.slice()
      });
      this.flipLogCount = this.todayLogs.length;
    }

    this.save();
    this.isFlipping = false;
    return true;
  }

  processSeasonEvents() {
    if (this.data.day > 1 && this.getSeasonDay() === 1) {
      this.witherRegrowCrops();
      this.addLog('season_change', {
        seasonName: this.getSeasonInfo().name
      });
    }

    this.processMerchantOrders();

    if (this.data.day % CONFIG.SEASON_DAYS === 0) {
      this.generateSeasonReportLetter();
    }
  }

  witherRegrowCrops() {
    let withered = 0;
    this.data.farm.crops.forEach(crop => {
      const cropType = CROP_TYPES[crop.type];
      if (cropType && cropType.regrowDays && crop.status !== 'withered') {
        crop.status = 'withered';
        withered += 1;
      }
    });
    if (withered > 0) {
      this.addLog('crop_withered', { count: withered });
    }
  }

  generateSeasonReportLetter() {
    const days = CONFIG.SEASON_DAYS;
    const startDay = this.data.day - days + 1;
    const recentLogs = this.data.dailyLogs.filter(l => l.day >= startDay && l.day <= this.data.day);

    const totalIncome = recentLogs.reduce((sum, l) => sum + (l.goldEarned || 0), 0)
      + this.todayLogs.filter(l => l.type === 'harvest' || l.type === 'sell' || l.type === 'merchant_sell' || l.type === 'coop_income').reduce((sum, l) => sum + (l.data.gold || 0), 0);
    const totalHarvests = recentLogs.reduce((sum, l) => sum + (l.cropsHarvested || 0), 0)
      + this.todayLogs.filter(l => l.type === 'harvest').length;
    let planCompletions = 0;
    let plantings = 0;
    let chickenBuys = 0;
    let totalEggs = 0;
    let totalLargeEggs = 0;
    const scanLogs = (logs) => {
      (logs || []).forEach(log => {
        if (log.type === 'plan_complete') planCompletions += 1;
        if (log.type === 'crop_planted') plantings += 1;
        if (log.type === 'chicken_buy') chickenBuys += (log.data.count || 1);
        if (log.type === 'egg_collect') {
          totalEggs += (log.data.eggs || 0);
          totalLargeEggs += (log.data.largeEggs || 0);
        }
      });
    };
    recentLogs.forEach(l => scanLogs(l.logs));
    scanLogs(this.todayLogs);

    const totalActions = totalHarvests + planCompletions + plantings + chickenBuys;
    const totalEggCount = totalEggs + totalLargeEggs;

    const eggComment = (() => {
      if (totalEggCount > 0) {
        return `听说你的母鸡们这${days}天下了${totalEggs}个鸡蛋和${totalLargeEggs}个大鸡蛋，养鸡有方！\n\n`;
      }
      if (chickenBuys > 0) {
        return `母鸡刚买回来，等它们下蛋吧。\n\n`;
      }
      return `对了，还没开始养鸡？去建座鸡舍，母鸡的蛋可是笔稳定收入。\n\n`;
    })();

    let title, content;
    const perfectIncome = CONFIG.PERFECT_SEASON_INCOME || 2500;

    if (totalActions === 0) {
      title = '一封沉默的信';
      content = '......\n\n我看不出来你做了什么。\n\n这片土地需要耕耘才会有收获。我把农场交给你，不是让它荒废的。\n\n—— 老农场主';
    } else if (totalIncome >= perfectIncome) {
      title = '来自老农场主的震惊';
      content = `这......这真的是我的农场吗？\n\n短短${days}天，你收获了${totalHarvests}次作物，赚到了${totalIncome}金币！我经营这片土地大半辈子，也从没见过这样的收成。\n\n居然能把农场经营得如此完美......每一块地、每一天都没有浪费。我没什么可教你的了，期待你的下一份成绩单。\n\n—— 老农场主`;
    } else if (totalIncome >= 500) {
      title = '来自老农场主的夸赞';
      content = `我一直在远处看着这片农场。\n\n这${days}天，你收获了${totalHarvests}次作物，赚到了${totalIncome}金币。干得漂亮！\n\n${eggComment}看来我把农场交给你是对的，继续保持。\n\n—— 老农场主`;
    } else {
      title = '来自老农场主的鼓励';
      content = `我一直在远处看着这片农场。\n\n这${days}天，你收获了${totalHarvests}次作物，赚到了${totalIncome}金币。收入还不太理想，但别灰心。\n\n${eggComment}记住：春季作物长得快，冬季卖价最高。多种多收，农场会慢慢好起来的。\n\n—— 老农场主`;
    }

    const letter = {
      id: 'letter_season_' + this.data.day + '_' + Date.now(),
      from: '👴 老农场主',
      title: title,
      content: content,
      isRead: false,
      triggerDay: this.data.day,
      hasReply: false,
      replyOptions: [],
      isTriggered: true
    };

    this.data.letters.push(letter);
    this.addLog('letter', {
      from: letter.from,
      title: letter.title
    });
  }

  plantPendingCrops() {
    const cropsToPlant = [...this.pendingCrops];
    this.pendingCrops = [];
    const season = this.getSeasonInfo();

    cropsToPlant.forEach(pendingCrop => {
      const effectiveDays = pendingCrop.type === 'mysterySeed'
        ? (CONFIG.MYSTERY_SEED_GROWTH_DAYS || 5)
        : Math.max(1, Math.ceil(pendingCrop.daysToHarvest * season.growthMultiplier));
      const crop = {
        id: 'crop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: pendingCrop.name,
        type: pendingCrop.type,
        plantDate: this.data.day,
        daysToHarvest: effectiveDays,
        status: 'growing'
      };
      this.data.farm.crops.push(crop);
      
      this.addLog('crop_planted', {
        cropName: crop.name,
        cropId: crop.id
      });
    });
  }

  executePlans() {
    const completedPlans = [];
    
    this.data.plans.forEach(plan => {
      if (!plan.isActive) return;
      
      plan.daysRemaining -= 1;
      
      if (plan.daysRemaining <= 0) {
        plan.isActive = false;
        completedPlans.push(plan);
        this.executePlanCallback(plan);
      }
    });

    this.data.plans = this.data.plans.filter(p => p.isActive || p.daysRemaining > 0);
    
    completedPlans.forEach(plan => {
      this.addLog('plan_complete', {
        planName: plan.target,
        planType: plan.type
      });
    });
  }

  executePlanCallback(plan) {
    const gold = this.data.gold || 0;
    switch (plan.type) {
      case 'build':
        this.addBuilding(plan.onComplete.buildingData);
        if (plan.onComplete.buildingData.type === 'field') {
          this.data.farm.landCount += 1;
        }
        break;
      case 'upgrade':
        this.upgradeBuilding(plan.onComplete.buildingId);
        break;
      case 'purchase':
        this.data.gold = gold + (plan.onComplete.goldAmount || 0);
        break;
    }
  }

  getCoopCapacity() {
    const capacityPer = BUILDING_TYPES.chickenCoop.capacityPer || 5;
    const coops = this.data.farm.buildings.filter(b => b.type === 'chickenCoop' && b.status === 'built').length;
    return coops * capacityPer;
  }

  getChickenCount() {
    return (this.data.coop && typeof this.data.coop.chickens === 'number') ? this.data.coop.chickens : 0;
  }

  buyChicken() {
    const capacity = this.getCoopCapacity();
    if (capacity <= 0) {
      return { success: false, message: '还没有鸡舍，请先在计划项目中建造鸡舍' };
    }
    const chickens = this.getChickenCount();
    if (chickens >= capacity) {
      return { success: false, message: `鸡舍容量已满（${chickens}/${capacity}），请建造更多鸡舍` };
    }
    const price = CONFIG.CHICKEN_PRICE || 50;
    const gold = this.data.gold || 0;
    if (gold < price) {
      return { success: false, message: '金币不足' };
    }
    this.data.gold = gold - price;
    this.data.coop.chickens = chickens + 1;
    this.addLog('chicken_buy', {
      count: 1,
      cost: price
    });
    this.save();
    return { success: true, chickens: this.data.coop.chickens, capacity: capacity };
  }

  collectEggs() {
    const chickens = this.getChickenCount();
    if (chickens <= 0) return;
    
    const layChance = CONFIG.EGG_LAY_CHANCE || 0.6;
    const largeChance = CONFIG.LARGE_EGG_CHANCE || 0.1;
    let eggs = 0;
    let largeEggs = 0;
    
    for (let i = 0; i < chickens; i++) {
      if (Math.random() < layChance) {
        if (Math.random() < largeChance) {
          largeEggs += 1;
        } else {
          eggs += 1;
        }
      }
    }
    
    if (!Array.isArray(this.data.warehouse)) {
      this.data.warehouse = [];
    }
    
    const addEggs = (type, count) => {
      if (count <= 0) return;
      const entry = this.data.warehouse.find(w => w.type === type);
      if (entry) {
        entry.count += count;
      } else {
        this.data.warehouse.push({ type: type, count: count });
      }
    };
    
    addEggs('egg', eggs);
    addEggs('largeEgg', largeEggs);
    
    if (eggs + largeEggs > 0) {
      this.addLog('egg_collect', {
        eggs: eggs,
        largeEggs: largeEggs
      });
    }
  }

  getEffectiveDaysNeeded(crop) {
    const speedBonus = this.getWellSpeedBonus();
    return Math.max(1, Math.ceil(crop.daysToHarvest * (1 - speedBonus)));
  }

  growCrops() {
    const today = this.data.day;
    
    this.data.farm.crops.forEach(crop => {
      if (crop.status !== 'growing') return;
      
      const daysGrown = today - crop.plantDate;
      const daysNeeded = this.getEffectiveDaysNeeded(crop);
      if (daysGrown >= daysNeeded) {
        crop.status = 'harvestable';
        this.addLog('crop_ready', {
          cropName: crop.name,
          cropId: crop.id
        });
      }
    });
  }
  autoHarvest() {
    const harvesters = this.data.farm.buildings.filter(b => b.type === 'harvester' && b.status === 'built');
    if (harvesters.length === 0) return;

    const cap = harvesters.length * (CONFIG.HARVESTER_CAPACITY || 16);
    const harvestable = this.data.farm.crops.filter(c => c.status === 'harvestable');
    let harvested = 0;
    for (const crop of harvestable) {
      if (harvested >= cap) break;
      this.harvestCrop(crop.id);
      harvested += 1;
    }
  }

  generateWeather() {
    const season = this.getSeason();
    const isWinter = season === 'winter';
    const base = CONFIG.WEATHER_PROBABILITIES;

    const weathers = isWinter
      ? Object.entries(base)
      : Object.entries(base).filter(([weather]) => weather !== 'snowy');
    const total = weathers.reduce((sum, [, prob]) => sum + prob, 0);

    const rand = Math.random();
    let cumulative = 0;
    this.currentWeather = weathers[weathers.length - 1][0];

    for (const [weather, prob] of weathers) {
      cumulative += prob / total;
      if (rand <= cumulative) {
        this.currentWeather = weather;
        break;
      }
    }

    if (this.currentWeather === 'snowy') {
      this.applySnowEffect();
    }
  }

  applySnowEffect() {
    this.data.farm.crops.forEach(crop => {
      if (crop.status === 'growing') {
        crop.daysToHarvest += 1;
      }
    });

    const freezeChance = CONFIG.SNOW_FREEZE_CHANCE || 0.3;
    if (Math.random() < freezeChance) {
      const crops = this.data.farm.crops;
      if (crops.length > 0) {
        const victim = crops[Math.floor(Math.random() * crops.length)];
        this.data.farm.crops = crops.filter(c => c.id !== victim.id);
        this.addLog('crop_frozen', { cropName: victim.name });
      } else {
        this.addLog('snow_safe', {});
      }
    } else {
      this.addLog('snow_safe', {});
    }
  }

  triggerSpecialEvents() {
    if (Math.random() > CONFIG.SPECIAL_EVENT_CHANCE) return;
    
    const event = SPECIAL_EVENTS[Math.floor(Math.random() * SPECIAL_EVENTS.length)];
    this.todayEvents.push(event);
    
    const gold = this.data.gold || 0;
    let goldLost = 0;
    switch (event.type) {
      case 'positive':
        if (event.goldGain) {
          this.data.gold = (this.data.gold || 0) + event.goldGain;
        }
        if (event.freeSeed) {
          this.data.flags.freeSeedAvailable = true;
        }
        break;
      case 'negative':
        if (event.goldLoss) {
          this.data.gold = Math.max(0, (this.data.gold || 0) - event.goldLoss);
          goldLost = event.goldLoss;
        }
        if (event.goldLossPercent) {
          const cur = this.data.gold || 0;
          const lost = Math.floor(cur * event.goldLossPercent);
          this.data.gold = Math.max(0, cur - lost);
          goldLost = lost;
        }
        if (event.delayGrowth) {
          this.data.farm.crops.forEach(crop => {
            if (crop.status === 'growing') {
              crop.daysToHarvest += event.delayGrowth;
            }
          });
        }
        break;
    }
    
    this.addLog('event', {
      eventName: event.name,
      eventDesc: event.description,
      eventType: event.type,
      goldLost: goldLost
    });
  }

  triggerLetters() {
    const today = this.data.day;
    
    this.data.letters.forEach(letter => {
      if (letter.triggerDay === today && !letter.isTriggered) {
        letter.isTriggered = true;
        letter.isRead = false;
        
        this.addLog('letter', {
          from: letter.from,
          title: letter.title
        });
      }
    });
  }

  addBuilding(buildingData) {
    const def = BUILDING_TYPES[buildingData.type] || {};
    const sameTypeCount = this.data.farm.buildings.filter(b => b.type === buildingData.type).length;
    const baseName = def.name || buildingData.name || '建筑';
    const building = {
      id: buildingData.type + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: `${baseName}${sameTypeCount + 1}`,
      type: buildingData.type,
      level: 1,
      status: 'built',
      buildDate: this.data.day
    };
    this.data.farm.buildings.push(building);
    return building;
  }

  upgradeBuilding(buildingId) {
    const building = this.data.farm.buildings.find(b => b.id === buildingId);
    const maxLevel = CONFIG.MAX_BUILDING_LEVEL || 3;
    if (building && building.level < maxLevel) {
      building.level += 1;
    }
  }

  demolishBuilding(buildingId) {
    const index = this.data.farm.buildings.findIndex(b => b.id === buildingId);
    if (index === -1) {
      return { success: false, message: '建筑不存在' };
    }
    const building = this.data.farm.buildings[index];
    this.data.farm.buildings.splice(index, 1);
    if (building.type === 'field') {
      this.data.farm.landCount = Math.max(0, (this.data.farm.landCount || 0) - 1);
    }
    this.addLog('building_demolish', { buildingName: building.name });
    this.save();
    return { success: true, name: building.name };
  }

  removeCrop(cropId) {
    const index = this.data.farm.crops.findIndex(c => c.id === cropId);
    if (index === -1) {
      return { success: false, message: '作物不存在' };
    }
    const crop = this.data.farm.crops[index];
    this.data.farm.crops.splice(index, 1);
    this.addLog('crop_cleared', { cropName: crop.name });
    this.save();
    return { success: true, name: crop.name };
  }

  // ===== 新区 / 加工坊 / 娱乐厅 =====

  getNewAreaBuilding(type) {
    return this.data.newArea.buildings.find(b => b.type === type);
  }

  isNewAreaBuildingBuilt(type) {
    const b = this.getNewAreaBuilding(type);
    return !!(b && b.status === 'built');
  }

  unlockNewArea() {
    const cost = CONFIG.NEW_AREA_UNLOCK_COST || 45000;
    if (this.data.newArea.unlocked) {
      return { success: false, message: '新区已解锁' };
    }
    const month = Math.floor((this.data.day - 1) / 30);
    if (month < 1) {
      return { success: false, message: '需在第二个月（第 31 天起）才能开通新区' };
    }
    if ((this.data.gold || 0) < cost) {
      return { success: false, message: '金币不足' };
    }
    this.data.gold -= cost;
    this.data.newArea.unlocked = true;
    this.addLog('new_area_unlock', {});
    this.save();
    return { success: true };
  }

  buildNewAreaBuilding(type) {
    const def = NEW_AREA_BUILDINGS[type];
    if (!def) {
      return { success: false, message: '未知建筑' };
    }
    if (this.isNewAreaBuildingBuilt(type)) {
      return { success: false, message: '已经建造过了' };
    }
    if (!this.data.newArea.unlocked) {
      return { success: false, message: '请先解锁新区' };
    }
    if ((this.data.gold || 0) < def.buildCost) {
      return { success: false, message: '金币不足' };
    }
    this.data.gold -= def.buildCost;
    this.data.newArea.buildings.push({
      id: type + '_' + Date.now(),
      name: def.name,
      type: type,
      level: 1,
      status: 'built',
      buildDate: this.data.day,
      active: true,
      pendingMaintenance: false
    });
    this.addLog('new_area_build', { buildingName: def.name });
    this.save();
    return { success: true, name: def.name };
  }

  buyPlanSlot() {
    const costs = CONFIG.PLAN_SLOT_COSTS || [5000, 10000];
    const maxSlots = costs.length;
    const bought = this.data.planSlotsBought || 0;
    if (bought >= maxSlots) {
      return { success: false, message: '扩容计划已达上限' };
    }
    const cost = costs[bought];
    if ((this.data.gold || 0) < cost) {
      return { success: false, message: '金币不足' };
    }
    this.data.gold -= cost;
    this.data.planSlotsBought = bought + 1;
    this.data.maxPlans = (this.data.maxPlans || CONFIG.INITIAL_MAX_PLANS) + 1;
    this.addLog('plan_slot_buy', { cost: cost, maxPlans: this.data.maxPlans });
    this.save();
    return { success: true, cost: cost, maxPlans: this.data.maxPlans };
  }

  getBuildingCost(type) {
    const def = BUILDING_TYPES[type];
    if (!def) return 0;
    if (type === 'harvester') {
      const owned = this.data.farm.buildings.filter(b => b.type === 'harvester').length;
      const queued = this.data.plans.filter(p => p.isActive && p.type === 'build' && p.onComplete?.buildingData?.type === 'harvester').length;
      const count = owned + queued;
      return Math.round(def.baseCost * Math.pow(CONFIG.HARVESTER_COST_FACTOR || 1.5, count));
    }
    return def.baseCost;
  }

  buyLand() {
    const cost = CONFIG.LAND_COST || 25000;
    if ((this.data.gold || 0) < cost) {
      return { success: false, message: '金币不足' };
    }
    this.data.gold -= cost;
    this.data.landsBought = (this.data.landsBought || 0) + 1;
    this.addLog('land_buy', { landsBought: this.data.landsBought });
    this.save();
    return { success: true, cost: cost, landsBought: this.data.landsBought };
  }

  getProductType(cropType) {
    return 'product_' + cropType;
  }

  getProductName(cropType) {
    return PRODUCT_RECIPES[cropType] || ((CROP_TYPES[cropType] && CROP_TYPES[cropType].name) || cropType) + '制品';
  }

  getProductValue(cropType) {
    const base = CROP_TYPES[cropType] ? CROP_TYPES[cropType].harvestValue : 0;
    const workshop = this.getNewAreaBuilding('workshop');
    const levelBonus = workshop ? (1 + (workshop.level - 1) * 0.15) : 1;
    return Math.round(base * (CONFIG.PRODUCT_MULTIPLIER || 2.5) * levelBonus);
  }

  startProcessing(cropType, amount) {
    amount = parseInt(amount) || 0;
    if (amount < 1) {
      return { success: false, message: '数量无效' };
    }
    const workshop = this.getNewAreaBuilding('workshop');
    if (!workshop || workshop.status !== 'built') {
      return { success: false, message: '加工坊尚未建造' };
    }
    if (workshop.pendingMaintenance) {
      return { success: false, message: '加工坊已停用，请先补缴维护费' };
    }
    if (!CROP_TYPES[cropType] || CROP_TYPES[cropType].animalProduct) {
      return { success: false, message: '该物品无法加工' };
    }
    const stock = this.getWarehouseCount(cropType);
    if (stock < amount) {
      return { success: false, message: `仓库中${this.getItemDisplayName(cropType)}不足（需 ${amount}，现有 ${stock}）` };
    }
    // 扣除原料
    const entry = this.data.warehouse.find(w => w.type === cropType);
    entry.count -= amount;
    if (entry.count <= 0) {
      this.data.warehouse = this.data.warehouse.filter(w => w.type !== cropType);
    }
    const days = CONFIG.WORKSHOP_PROCESS_DAYS || 2;
    this.data.newArea.workshopJobs.push({
      id: 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      cropType: cropType,
      amount: amount,
      finishDay: this.data.day + days
    });
    this.save();
    return { success: true, message: `已开始加工 ${amount} 份${this.getProductName(cropType)}，约 ${days} 天后完成` };
  }

  processWorkshopJobs() {
    if (!this.data.newArea.workshopJobs || this.data.newArea.workshopJobs.length === 0) return;
    const remaining = [];
    let produced = 0;
    this.data.newArea.workshopJobs.forEach(job => {
      if (this.data.day >= job.finishDay) {
        this.addToWarehouse(this.getProductType(job.cropType), job.amount);
        produced += job.amount;
        this.addLog('workshop_done', { productName: this.getProductName(job.cropType), amount: job.amount });
      } else {
        remaining.push(job);
      }
    });
    this.data.newArea.workshopJobs = remaining;
    if (produced > 0) {
      this.save();
    }
  }

  processWorkshopMaintenance() {
    const workshop = this.getNewAreaBuilding('workshop');
    if (!workshop || workshop.status !== 'built') return;
    const fee = CONFIG.WORKSHOP_MAINTENANCE || 2500;
    if (workshop.pendingMaintenance) return; // 等待手动补缴
    if ((this.data.gold || 0) >= fee) {
      this.data.gold -= fee;
      this.addLog('workshop_maintenance', { fee: fee });
    } else {
      workshop.active = false;
      workshop.pendingMaintenance = true;
      this.addLog('workshop_disabled', { fee: fee });
    }
  }

  payWorkshopMaintenance() {
    const workshop = this.getNewAreaBuilding('workshop');
    if (!workshop || !workshop.pendingMaintenance) {
      return { success: false, message: '当前无需补缴维护费' };
    }
    const fee = CONFIG.WORKSHOP_MAINTENANCE || 2500;
    if ((this.data.gold || 0) < fee) {
      return { success: false, message: '金币不足，无法补缴' };
    }
    this.data.gold -= fee;
    workshop.active = true;
    workshop.pendingMaintenance = false;
    this.addLog('workshop_maintenance', { fee: fee });
    this.save();
    return { success: true };
  }

  spinWheel(betType, color, customAmount) {
    const wheel = CONFIG.WHEEL || { green: 1, red: 18, black: 18, redPayout: 2, greenPayout: 20 };
    const total = wheel.green + wheel.red + wheel.black;
    if (!this.isNewAreaBuildingBuilt('arcade')) {
      return { success: false, message: '娱乐厅尚未建造' };
    }
    if (!['red', 'black', 'green'].includes(color)) {
      return { success: false, message: '请选择颜色' };
    }

    let bet = 0;
    const gold = this.data.gold || 0;
    if (betType === 'allin') {
      bet = gold;
    } else if (betType === 'half') {
      bet = Math.floor(gold / 2);
    } else {
      bet = parseInt(customAmount) || 0;
    }
    bet = Math.floor(bet);
    if (bet <= 0) {
      return { success: false, message: '下注金额无效' };
    }
    if (bet > gold) {
      return { success: false, message: '金币不足' };
    }

    this.data.gold = gold - bet;

    const roll = Math.random() * total;
    let outcomeColor;
    if (roll < wheel.green) {
      outcomeColor = 'green';
    } else if (roll < wheel.green + wheel.red) {
      outcomeColor = 'red';
    } else {
      outcomeColor = 'black';
    }

    let payout = 0;
    let win = false;
    if (outcomeColor === color) {
      win = true;
      if (color === 'green') {
        payout = bet * (wheel.greenPayout || 20);
      } else {
        payout = bet * (wheel.redPayout || 2);
      }
      this.data.gold = (this.data.gold || 0) + payout;
    }

    this.addLog('wheel', {
      color: color,
      outcome: outcomeColor,
      bet: bet,
      payout: payout,
      win: win,
      allIn: (betType === 'allin')
    });

    this.save();
    const colorName = { red: '红', black: '黑', green: '绿' }[outcomeColor];
    const message = win
      ? `轮盘转出${colorName}色，押${color}命中！投入 ${bet} 金币，赢得 ${payout} 金币`
      : `轮盘转出${colorName}色，未命中。投入 ${bet} 金币，损失 ${bet} 金币`;
    return {
      success: true,
      win: win,
      outcome: outcomeColor,
      bet: bet,
      payout: payout,
      message: message
    };
  }

  harvestCrop(cropId) {
    const cropIndex = this.data.farm.crops.findIndex(c => c.id === cropId);
    if (cropIndex === -1) return null;

    const crop = this.data.farm.crops[cropIndex];
    if (crop.status !== 'harvestable') return null;

    if (crop.type === 'mysterySeed') {
      return this.resolveMysterySeed(crop, cropIndex);
    }

    const cropType = CROP_TYPES[crop.type];

    this.trackCropStat(crop.type, 'harvested');

    if (cropType && cropType.regrowDays) {
      crop.harvestCount = (crop.harvestCount || 0) + 1;
      crop.status = 'growing';
      crop.plantDate = this.data.day;
      crop.daysToHarvest = Math.max(1, cropType.regrowDays);
    } else {
      this.data.farm.crops.splice(cropIndex, 1);
    }

    if (!Array.isArray(this.data.warehouse)) {
      this.data.warehouse = [];
    }
    const entry = this.data.warehouse.find(w => w.type === crop.type);
    if (entry) {
      entry.count += 1;
    } else {
      this.data.warehouse.push({ type: crop.type, count: 1 });
    }

    this.addLog('harvest', {
      cropName: crop.name,
      cropId: crop.id
    });

    this.save();

    return {
      cropName: crop.name,
      regrew: !!(cropType && cropType.regrowDays)
    };
  }

  resolveMysterySeed(crop, cropIndex) {
    this.trackCropStat('mysterySeed', 'harvested');

    const roll = Math.random();
    let outcome = 'crop';
    let cropType = null;

    if (roll < 0.05) {
      this.addToWarehouse('lottery', 1);
      this.data.obtained.lottery = true;
      outcome = 'lottery';
    } else if (roll < 0.10) {
      this.addToWarehouse('trophy', 1);
      this.data.obtained.trophy = true;
      outcome = 'trophy';
    } else {
      const types = Object.keys(CROP_TYPES).filter(t => !CROP_TYPES[t].animalProduct);
      cropType = types[Math.floor(Math.random() * types.length)];
      this.addToWarehouse(cropType, 1);
      outcome = 'crop';
    }

    this.data.farm.crops.splice(cropIndex, 1);

    this.addLog('mystery_harvest', { outcome: outcome, cropType: cropType });
    this.save();

    return {
      cropName: '神秘种子',
      regrew: false,
      outcome: outcome,
      cropType: cropType
    };
  }

  isCropUnlocked(type) {
    return (this.data.unlockedCrops || []).includes(type);
  }

  unlockCrop(type) {
    const cropType = CROP_TYPES[type];
    if (!cropType || !cropType.unlockCost) {
      return { success: false, message: '该作物无需解锁' };
    }
    if (this.isCropUnlocked(type)) {
      return { success: false, message: '该作物已解锁' };
    }
    const gold = this.data.gold || 0;
    if (gold < cropType.unlockCost) {
      return { success: false, message: '金币不足' };
    }
    this.data.gold = gold - cropType.unlockCost;
    this.data.unlockedCrops.push(type);
    this.addLog('crop_unlock', {
      cropName: cropType.name,
      cost: cropType.unlockCost
    });
    this.save();
    return { success: true, cropName: cropType.name };
  }

  buyMysterySeed() {
    const cost = CONFIG.MYSTERY_SEED_COST || 100;
    const limit = CONFIG.MYSTERY_SEED_MONTHLY_LIMIT || 3;
    const gold = this.data.gold || 0;

    if (gold < cost) {
      return { success: false, message: '金币不足' };
    }

    const month = Math.floor((this.data.day - 1) / 30);
    if (this.data.shop.mysteryMonth !== month) {
      this.data.shop.mysteryMonth = month;
      this.data.shop.mysteryBought = 0;
    }
    if (this.data.shop.mysteryBought >= limit) {
      return { success: false, message: `本月神秘种子已售罄（每月限购 ${limit} 次）` };
    }

    this.data.gold = gold - cost;
    this.data.shop.mysteryBought += 1;

    this.addToWarehouse('mysterySeed', 1);
    this.addLog('mystery_seed', {});
    this.save();

    return { success: true };
  }

  addToWarehouse(type, count = 1) {
    if (!Array.isArray(this.data.warehouse)) {
      this.data.warehouse = [];
    }
    const entry = this.data.warehouse.find(w => w.type === type);
    if (entry) {
      entry.count += count;
    } else {
      this.data.warehouse.push({ type: type, count: count });
    }
  }

  plantMysterySeed() {
    if (!this.canPlantCrop()) {
      return { success: false, message: '田地已满' };
    }
    const seedCount = this.getWarehouseCount('mysterySeed');
    if (seedCount < 1) {
      return { success: false, message: '仓库中没有神秘种子' };
    }

    const entry = this.data.warehouse.find(w => w.type === 'mysterySeed');
    entry.count -= 1;
    if (entry.count <= 0) {
      this.data.warehouse = this.data.warehouse.filter(w => w.type !== 'mysterySeed');
    }

    const growth = CONFIG.MYSTERY_SEED_GROWTH_DAYS || 5;
    this.pendingCrops.push({
      id: 'pending_' + Date.now(),
      name: '神秘种子',
      type: 'mysterySeed',
      daysToHarvest: growth,
      plantDay: this.data.day + 1
    });
    this.save();

    return { success: true, message: '神秘种子已安排种植，明天开始生长' };
  }

  trackCropStat(type, field, amount = 1) {
    if (!this.data.cropStats[type]) {
      this.data.cropStats[type] = { harvested: 0, sold: 0 };
    }
    this.data.cropStats[type][field] = (this.data.cropStats[type][field] || 0) + amount;
  }

  getSellPrice(type) {
    if (SPECIAL_ITEM_VALUES[type] !== undefined) {
      return SPECIAL_ITEM_VALUES[type];
    }

    if (typeof type === 'string' && type.indexOf('product_') === 0) {
      const cropType = type.slice('product_'.length);
      return this.getProductValue(cropType);
    }

    const cropType = CROP_TYPES[type];
    if (!cropType) return 0;

    let price = cropType.harvestValue;
    const season = this.getSeasonInfo();
    price = Math.floor(price * season.incomeMultiplier);

    const barnBonus = this.getBarnBonus();
    if (barnBonus > 0) {
      price = Math.floor(price * (1 + barnBonus));
    }

    const todayEvent = this.todayEvents.find(e => e.goldMultiplier);
    if (todayEvent) {
      price = Math.floor(price * todayEvent.goldMultiplier);
    }

    return price;
  }

  getWarehouseCount(type) {
    const entry = (this.data.warehouse || []).find(w => w.type === type);
    return entry ? entry.count : 0;
  }

  getItemDisplayName(type) {
    if (type === 'mysterySeed') return '神秘种子';
    if (type === 'lottery') return '未兑奖的彩票';
    if (type === 'trophy') return '农场奖杯';
    if (typeof type === 'string' && type.indexOf('product_') === 0) {
      return this.getProductName(type.slice('product_'.length));
    }
    const cropType = CROP_TYPES[type];
    return cropType ? cropType.name : type;
  }

  sellCrops(type, count) {
    if (!Array.isArray(this.data.warehouse)) {
      this.data.warehouse = [];
    }
    const entry = this.data.warehouse.find(w => w.type === type);
    if (!entry || entry.count < count || count < 1) {
      return { success: false, message: '仓库中作物数量不足' };
    }
    
    const unitPrice = this.getSellPrice(type);
    const gold = unitPrice * count;
    
    entry.count -= count;
    if (entry.count <= 0) {
      this.data.warehouse = this.data.warehouse.filter(w => w.type !== type);
    }
    
    this.data.gold = (this.data.gold || 0) + gold;
    this.trackCropStat(type, 'sold', count);
    
    const cropName = this.getItemDisplayName(type);
    this.addLog('sell', {
      cropName: cropName,
      count: count,
      gold: gold
    });
    
    this.save();
    
    return {
      success: true,
      cropName: cropName,
      count: count,
      gold: gold
    };
  }

  sellAllCrops() {
    if (!Array.isArray(this.data.warehouse) || this.data.warehouse.length === 0) {
      return { success: false, message: '仓库是空的' };
    }
    
    let totalGold = 0;
    let totalCount = 0;
    const items = [...this.data.warehouse];
    
    items.forEach(w => {
      const unitPrice = this.getSellPrice(w.type);
      const gold = unitPrice * w.count;
      const cropName = this.getItemDisplayName(w.type);
      this.data.gold = (this.data.gold || 0) + gold;
      this.trackCropStat(w.type, 'sold', w.count);
      this.addLog('sell', {
        cropName: cropName,
        count: w.count,
        gold: gold
      });
      totalGold += gold;
      totalCount += w.count;
    });
    
    this.data.warehouse = [];
    this.save();
    
    return {
      success: true,
      count: totalCount,
      gold: totalGold
    };
  }

  getActiveMerchantOrders() {
    const today = this.data.day;
    return (this.data.merchantOrders || []).filter(o => !o.completed && o.expireDay >= today);
  }

  sellToMerchant(orderId) {
    const order = (this.data.merchantOrders || []).find(o => o.id === orderId);
    if (!order || order.completed) {
      return { success: false, message: '订单不存在或已完成' };
    }
    if (order.expireDay < this.data.day) {
      return { success: false, message: '订单已过期' };
    }
    
    const stock = this.getWarehouseCount(order.type);
    if (stock < order.count) {
      return { success: false, message: `仓库存量不足（${stock}/${order.count}）` };
    }
    
    const entry = this.data.warehouse.find(w => w.type === order.type);
    entry.count -= order.count;
    if (entry.count <= 0) {
      this.data.warehouse = this.data.warehouse.filter(w => w.type !== order.type);
    }
    
    const gold = order.unitPrice * order.count;
    this.data.gold = (this.data.gold || 0) + gold;
    this.trackCropStat(order.type, 'sold', order.count);
    order.completed = true;
    
    const cropType = CROP_TYPES[order.type];
    this.addLog('merchant_sell', {
      cropName: cropType ? cropType.name : order.type,
      count: order.count,
      gold: gold
    });
    
    this.save();
    
    return {
      success: true,
      cropName: cropType ? cropType.name : order.type,
      count: order.count,
      gold: gold
    };
  }

  processMerchantOrders() {
    if (!Array.isArray(this.data.merchantOrders)) {
      this.data.merchantOrders = [];
    }
    
    const expired = this.data.merchantOrders.filter(o => !o.completed && o.expireDay < this.data.day);
    expired.forEach(o => {
      const cropType = CROP_TYPES[o.type];
      this.addLog('merchant_expire', {
        cropName: cropType ? cropType.name : o.type
      });
    });
    this.data.merchantOrders = this.data.merchantOrders.filter(o => !o.completed && o.expireDay >= this.data.day);
    
    const activeCount = this.data.merchantOrders.length;
    const maxActive = CONFIG.MERCHANT_MAX_ACTIVE || 2;
    if (activeCount < maxActive && Math.random() < (CONFIG.MERCHANT_ORDER_CHANCE || 0.25)) {
      const pool = Object.keys(CROP_TYPES).filter(t => this.isCropUnlocked(t));
      if (pool.length === 0) return;
      
      const type = pool[Math.floor(Math.random() * pool.length)];
      const count = 3 + Math.floor(Math.random() * 8);
      const premium = (CONFIG.MERCHANT_PREMIUM_MIN || 1.4) + Math.random() * ((CONFIG.MERCHANT_PREMIUM_MAX || 1.7) - (CONFIG.MERCHANT_PREMIUM_MIN || 1.4));
      const seasonPrice = Math.floor(CROP_TYPES[type].harvestValue * this.getSeasonInfo().incomeMultiplier);
      const unitPrice = Math.max(1, Math.floor(seasonPrice * premium));
      const duration = CONFIG.MERCHANT_ORDER_DAYS || 5;
      
      const order = {
        id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: type,
        count: count,
        unitPrice: unitPrice,
        startDay: this.data.day,
        expireDay: this.data.day + duration
      };
      this.data.merchantOrders.push(order);
      
      const cropType = CROP_TYPES[type];
      this.addLog('merchant_order', {
        cropName: cropType ? cropType.name : type,
        count: count,
        unitPrice: unitPrice
      });
    }
  }

  addPlan(planData) {
    if (planData.type === 'plant') {
      return this.addPendingCrop(planData.onComplete.cropData);
    }

    const activePlans = this.data.plans.filter(p => p.isActive).length;
    if (activePlans >= this.data.maxPlans) {
      return { success: false, message: '计划队列已满' };
    }
    
    if (planData.type === 'build') {
      const buildingType = planData.onComplete?.buildingData?.type;
      const def = buildingType ? BUILDING_TYPES[buildingType] : null;
      if (def && def.maxCount) {
        const owned = this.data.farm.buildings.filter(b => b.type === buildingType).length;
        const queued = this.data.plans.filter(p => p.isActive && p.type === 'build' && p.onComplete?.buildingData?.type === buildingType).length;
        if (owned + queued >= def.maxCount) {
          return { success: false, message: `${def.name}建造数量已达上限（${def.maxCount}个）` };
        }
      }
      if (buildingType === 'field') {
        const maxFields = (CONFIG.MAX_FIELDS || 10) + (this.data.landsBought || 0);
        const landCount = this.data.farm.landCount || 0;
        const queuedFields = this.data.plans.filter(p => p.isActive && p.type === 'build' && p.onComplete?.buildingData?.type === 'field').length;
        if (landCount + queuedFields >= maxFields) {
          return { success: false, message: `田地数量已达上限（最多 ${maxFields} 块，可在商店买地扩充）` };
        }
      }
    }
    
    if (planData.type === 'upgrade') {
      const building = this.getBuildingById(planData.onComplete?.buildingId);
      const maxLevel = CONFIG.MAX_BUILDING_LEVEL || 3;
      if (!building) {
        return { success: false, message: '建筑不存在' };
      }
      if (building.level >= maxLevel) {
        return { success: false, message: `${building.name}已达最高等级` };
      }
      const upgrading = this.data.plans.some(p => p.isActive && p.type === 'upgrade' && p.onComplete?.buildingId === building.id);
      if (upgrading) {
        return { success: false, message: `${building.name}正在升级中，请等待完成` };
      }
    }
    
    const gold = this.data.gold || 0;
    if (gold < (planData.cost || 0)) {
      return { success: false, message: '金币不足' };
    }
    
    if (planData.cost) {
      this.data.gold = gold - planData.cost;
    }
    
    const plan = {
      id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: planData.type,
      target: planData.target,
      daysRemaining: planData.days,
      daysTotal: planData.days,
      onComplete: planData.onComplete || {},
      isActive: true,
      startDate: this.data.day
    };
    
    this.data.plans.push(plan);
    this.save();
    
    return { success: true, plan: plan };
  }

  cancelPlan(planId) {
    const planIndex = this.data.plans.findIndex(p => p.id === planId);
    if (planIndex === -1) return false;
    
    const plan = this.data.plans[planIndex];
    if (!plan.isActive) return false;
    
    if (plan.cost) {
      this.data.gold = (this.data.gold || 0) + Math.floor(plan.cost * 0.5);
    }
    
    this.data.plans.splice(planIndex, 1);
    this.save();
    return true;
  }

  cancelPendingCrop(pendingId) {
    const index = this.pendingCrops.findIndex(p => p.id === pendingId);
    if (index === -1) return false;
    
    const pending = this.pendingCrops[index];
    const cropType = CROP_TYPES[pending.type];
    if (cropType) {
      this.data.gold = (this.data.gold || 0) + cropType.seedCost;
    }
    
    this.pendingCrops.splice(index, 1);
    this.save();
    return true;
  }

  readLetter(letterId) {
    const letter = this.data.letters.find(l => l.id === letterId);
    if (letter) {
      letter.isRead = true;
      this.save();
    }
    return letter;
  }

  replyLetter(letterId, replyIndex) {
    const letter = this.data.letters.find(l => l.id === letterId);
    if (!letter || !letter.hasReply || !letter.replyOptions[replyIndex]) {
      return false;
    }
    
    const reply = letter.replyOptions[replyIndex];
    if (reply.flag) {
      this.data.flags[reply.flag] = true;
    }
    
    letter.hasReply = false;
    letter.replyOptions = [];
    this.save();
    return true;
  }

  addLog(type, data) {
    this.todayLogs.push({
      type: type,
      data: data,
      day: this.data.day
    });
  }

  getUnreadLetterCount() {
    return this.data.letters.filter(l => l.isTriggered && !l.isRead).length;
  }

  getActivePlansCount() {
    return this.data.plans.filter(p => p.isActive).length;
  }

  getCropById(cropId) {
    return this.data.farm.crops.find(c => c.id === cropId);
  }

  getBuildingById(buildingId) {
    return this.data.farm.buildings.find(b => b.id === buildingId);
  }

  getWeatherName() {
    return WEATHER_TYPES[this.currentWeather]?.name || '晴';
  }

  getSeason() {
    const index = Math.floor((this.data.day - 1) / CONFIG.SEASON_DAYS) % SEASON_ORDER.length;
    return SEASON_ORDER[index];
  }

  getSeasonInfo() {
    return SEASONS[this.getSeason()] || SEASONS.spring;
  }

  getSeasonDay() {
    return ((this.data.day - 1) % CONFIG.SEASON_DAYS) + 1;
  }

  getTodaySummary() {
    const summary = [];
    
    if (this.todayLogs.length > 0) {
      this.todayLogs.forEach(log => {
        switch (log.type) {
          case 'plan_complete':
            summary.push(`计划"${log.data.planName}"已完成`);
            break;
          case 'crop_planted':
            summary.push(`${log.data.cropName}已种下`);
            break;
          case 'crop_ready':
            summary.push(`${log.data.cropName}已成熟，可以收获`);
            break;
          case 'harvest':
            summary.push(`收获了${log.data.cropName}，已存入仓库`);
            break;
          case 'sell':
            summary.push(`出售${log.data.cropName}×${log.data.count}，获得${log.data.gold}金币`);
            break;
          case 'crop_unlock':
            summary.push(`解锁了新作物：${log.data.cropName}（花费${log.data.cost}金币）`);
            break;
          case 'merchant_order':
            summary.push(`合作商人收购${log.data.cropName}×${log.data.count}，单价${log.data.unitPrice}金币`);
            break;
          case 'merchant_sell':
            summary.push(`向合作商人出售${log.data.cropName}×${log.data.count}，获得${log.data.gold}金币`);
            break;
          case 'merchant_expire':
            summary.push(`合作商人的${log.data.cropName}收购订单过期了`);
            break;
          case 'event':
            summary.push(`${log.data.eventName}${log.data.goldLost ? `，损失了 ${log.data.goldLost} 金币` : ''}`);
            break;
          case 'snow_safe':
            summary.push('❄️ 植物平安无事');
            break;
          case 'mystery_seed':
            summary.push(`🎁 购买了神秘种子，已进入仓库`);
            break;
          case 'mystery_harvest':
            summary.push(`🌱 神秘种子收获了${log.data.outcome === 'lottery' ? '未兑奖的彩票' : log.data.outcome === 'trophy' ? '农场奖杯' : `随机作物（${CROP_TYPES[log.data.cropType] ? CROP_TYPES[log.data.cropType].name : '作物'}）`}`);
            break;
          case 'new_area_unlock':
            summary.push(`🌄 解锁了神秘新区`);
            break;
          case 'new_area_build':
            summary.push(`🏗️ 建造了${log.data.buildingName}`);
            break;
          case 'workshop_maintenance':
            summary.push(`🏭 缴纳加工坊维护费 ${log.data.fee} 金币`);
            break;
          case 'workshop_disabled':
            summary.push(`⚠️ 加工坊因欠维护费停用，需手动补缴`);
            break;
          case 'workshop_done':
            summary.push(`🥫 加工完成：${log.data.amount} 份${log.data.productName}`);
            break;
          case 'wheel':
            summary.push(`🎡 轮盘押${log.data.color}，${log.data.win ? `中${log.data.outcome}赢 ${log.data.payout} 金币` : `开${log.data.outcome}输 ${log.data.bet} 金币`}`);
            break;
          case 'letter':
            summary.push(`收到${log.data.from}的信件：${log.data.title}`);
            break;
          case 'coop_income':
            summary.push(`鸡舍产出，获得${log.data.gold}金币`);
            break;
          case 'egg_collect':
            summary.push(`母鸡们产下了${log.data.eggs}个鸡蛋和${log.data.largeEggs}个大鸡蛋`);
            break;
          case 'chicken_buy':
            summary.push(`购买了一只母鸡（花费${log.data.cost}金币）`);
            break;
          case 'crop_cleared':
            summary.push(`铲除了${log.data.cropName}`);
            break;
          case 'crop_withered':
            summary.push(`季节更替，${log.data.count} 株持续收获作物枯萎了，记得铲除`);
            break;
          case 'building_demolish':
            summary.push(`拆除了${log.data.buildingName}`);
            break;
          case 'crop_frozen':
            summary.push(`寒流冻死了${log.data.cropName}`);
            break;
          case 'season_change':
            summary.push(`季节变换，进入了${log.data.seasonName}季`);
            break;
        }
      });
    }
    
    if (summary.length === 0) {
      summary.push('今天平静地度过了。');
    }
    
    return summary;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const game = new Game();
