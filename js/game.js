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
        buildings: [],
        landCount: CONFIG.INITIAL_LAND_COUNT,
        cropsPerLand: 2
      },
      plans: [],
      letters: JSON.parse(JSON.stringify(INITIAL_LETTERS)),
      flags: {},
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
    const perLand = this.data.farm.cropsPerLand || 2;
    const land = this.data.farm.landCount || 1;
    return land * perLand;
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
      .filter(l => l.type === 'harvest' || l.type === 'coop_income')
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

    this.collectBuildingIncome();
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
      goldEarned: this.todayLogs.filter(l => l.type === 'harvest' || l.type === 'coop_income').reduce((sum, l) => sum + (l.data.gold || 0), 0),
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
      this.collectBuildingIncome();
      this.growCrops();
      this.generateWeather();
      this.triggerSpecialEvents();
      this.triggerLetters();
      this.processSeasonEvents();

      this.data.dailyLogs.push({
        day: this.data.day,
        season: this.getSeason(),
        goldEarned: this.todayLogs.filter(l => l.type === 'harvest' || l.type === 'coop_income').reduce((sum, l) => sum + (l.data.gold || 0), 0),
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

    if (this.data.day % CONFIG.SEASON_DAYS === 0) {
      this.generateSeasonReportLetter();
    }
  }

  generateSeasonReportLetter() {
    const days = CONFIG.SEASON_DAYS;
    const startDay = this.data.day - days + 1;
    const recentLogs = this.data.dailyLogs.filter(l => l.day >= startDay && l.day <= this.data.day);

    const totalIncome = recentLogs.reduce((sum, l) => sum + (l.goldEarned || 0), 0)
      + this.todayLogs.filter(l => l.type === 'harvest' || l.type === 'coop_income').reduce((sum, l) => sum + (l.data.gold || 0), 0);
    const totalHarvests = recentLogs.reduce((sum, l) => sum + (l.cropsHarvested || 0), 0)
      + this.todayLogs.filter(l => l.type === 'harvest').length;
    let planCompletions = 0;
    let plantings = 0;
    const scanLogs = (logs) => {
      (logs || []).forEach(log => {
        if (log.type === 'plan_complete') planCompletions += 1;
        if (log.type === 'crop_planted') plantings += 1;
      });
    };
    recentLogs.forEach(l => scanLogs(l.logs));
    scanLogs(this.todayLogs);

    const totalActions = totalHarvests + planCompletions + plantings;

    let title, content;

    if (totalActions === 0) {
      title = '一封沉默的信';
      content = '......\n\n我看不出来你做了什么。\n\n这片土地需要耕耘才会有收获。我把农场交给你，不是让它荒废的。\n\n—— 老农场主';
    } else if (totalIncome >= 200) {
      title = '来自老农场主的夸赞';
      content = `我一直在远处看着这片农场。\n\n这${days}天，你收获了${totalHarvests}次作物，赚到了${totalIncome}金币。干得漂亮！\n\n看来我把农场交给你是对的，继续保持。\n\n—— 老农场主`;
    } else {
      title = '来自老农场主的鼓励';
      content = `我一直在远处看着这片农场。\n\n这${days}天，你收获了${totalHarvests}次作物，赚到了${totalIncome}金币。收入还不太理想，但别灰心。\n\n记住：春季作物长得快，冬季卖价最高。多种多收，农场会慢慢好起来的。\n\n—— 老农场主`;
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

  collectBuildingIncome() {
    const incomes = BUILDING_TYPES.chickenCoop.dailyIncome || [15, 20, 25];
    let total = 0;
    
    this.data.farm.buildings.forEach(building => {
      if (building.type === 'chickenCoop' && building.status === 'built') {
        total += incomes[building.level - 1] || incomes[0];
      }
    });
    
    if (total > 0) {
      this.data.gold = (this.data.gold || 0) + total;
      this.addLog('coop_income', { gold: total });
    }
  }

  getWellCount() {
    return this.data.farm.buildings.filter(b => b.type === 'well' && b.status === 'built').length;
  }

  getEffectiveDaysNeeded(crop) {
    const speedBonus = Math.min(2, this.getWellCount()) * 0.1;
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
        if (event.goldMultiplier) {
          const harvestBonus = this.todayLogs
            .filter(l => l.type === 'harvest')
            .reduce((sum, l) => sum + (l.data.gold || 0), 0);
          const bonus = Math.floor(harvestBonus * (event.goldMultiplier - 1));
          this.data.gold = gold + bonus;
        }
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
    const baseValue = cropType ? cropType.harvestValue : 30;
    let goldEarned = baseValue;
    
    const season = this.getSeasonInfo();
    goldEarned = Math.floor(goldEarned * season.incomeMultiplier);
    
    const hasBarn = this.data.farm.buildings.some(b => b.type === 'barn' && b.status === 'built');
    if (hasBarn) {
      goldEarned = Math.floor(goldEarned * 1.1);
    }
    
    const todayEvent = this.todayEvents.find(e => e.goldMultiplier);
    if (todayEvent) {
      goldEarned = Math.floor(goldEarned * todayEvent.goldMultiplier);
    }
    
    this.data.gold = (this.data.gold || 0) + goldEarned;
    this.data.farm.crops.splice(cropIndex, 1);
    
    this.addLog('harvest', {
      cropName: crop.name,
      gold: goldEarned
    });
    
    this.save();
    
    return {
      cropName: crop.name,
      goldEarned: goldEarned
    };
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
            summary.push(`收获了${log.data.cropName}，获得${log.data.gold}金币`);
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
