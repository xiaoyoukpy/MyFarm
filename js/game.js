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
      if (!this.data.maxPlans) {
        this.data.maxPlans = CONFIG.INITIAL_MAX_PLANS;
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
      this.plantPendingCrops();
      this.executePlans();
      this.collectEggs();
      this.growCrops();
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
      this.addLog('season_change', {
        seasonName: this.getSeasonInfo().name
      });
    }

    this.processMerchantOrders();

    if (this.data.day % CONFIG.SEASON_DAYS === 0) {
      this.generateSeasonReportLetter();
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
      const crop = {
        id: 'crop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: pendingCrop.name,
        type: pendingCrop.type,
        plantDate: this.data.day,
        daysToHarvest: Math.max(1, Math.round(pendingCrop.daysToHarvest * season.growthMultiplier)),
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

  generateWeather() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [weather, prob] of Object.entries(CONFIG.WEATHER_PROBABILITIES)) {
      cumulative += prob;
      if (rand <= cumulative) {
        this.currentWeather = weather;
        break;
      }
    }
    
    this.data.farm.crops.forEach(crop => {
      if (crop.status === 'growing' && this.currentWeather === 'snowy') {
        crop.daysToHarvest += 1;
      }
    });
  }

  triggerSpecialEvents() {
    if (Math.random() > CONFIG.SPECIAL_EVENT_CHANCE) return;
    
    const event = SPECIAL_EVENTS[Math.floor(Math.random() * SPECIAL_EVENTS.length)];
    this.todayEvents.push(event);
    
    const gold = this.data.gold || 0;
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
      eventType: event.type
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

  harvestCrop(cropId) {
    const cropIndex = this.data.farm.crops.findIndex(c => c.id === cropId);
    if (cropIndex === -1) return null;
    
    const crop = this.data.farm.crops[cropIndex];
    if (crop.status !== 'harvestable') return null;
    
    const cropType = CROP_TYPES[crop.type];
    
    this.trackCropStat(crop.type, 'harvested');
    
    if (cropType && cropType.regrowDays) {
      crop.harvestCount = (crop.harvestCount || 0) + 1;
      crop.status = 'growing';
      crop.plantDate = this.data.day;
      crop.daysToHarvest = Math.max(1, Math.round(cropType.regrowDays * this.getSeasonInfo().growthMultiplier));
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

  trackCropStat(type, field, amount = 1) {
    if (!this.data.cropStats[type]) {
      this.data.cropStats[type] = { harvested: 0, sold: 0 };
    }
    this.data.cropStats[type][field] = (this.data.cropStats[type][field] || 0) + amount;
  }

  getSellPrice(type) {
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
    
    const cropType = CROP_TYPES[type];
    this.addLog('sell', {
      cropName: cropType ? cropType.name : type,
      count: count,
      gold: gold
    });
    
    this.save();
    
    return {
      success: true,
      cropName: cropType ? cropType.name : type,
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
      const cropType = CROP_TYPES[w.type];
      const unitPrice = this.getSellPrice(w.type);
      const gold = unitPrice * w.count;
      this.data.gold = (this.data.gold || 0) + gold;
      this.trackCropStat(w.type, 'sold', w.count);
      this.addLog('sell', {
        cropName: cropType ? cropType.name : w.type,
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
    if (planData.type === 'build' && gold < (planData.cost || 0)) {
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
            summary.push(`${log.data.eventName} - ${log.data.eventDesc}`);
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
