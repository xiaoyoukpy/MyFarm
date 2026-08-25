/**
 * ui.js - 界面渲染
 * UIManager类、DOM操作、事件处理
 */

class UIManager {
  constructor() {
    this.currentTab = 'letters';
    this.currentView = 'menu';
    this.currentMenuMode = 'continue';
    this.modal = null;
    this.toast = null;
    this.onTabChange = null;
    this.onFlipPage = null;
    this.onHarvest = null;
    this.onAddPlan = null;
    this.onReadLetter = null;
    this.onReplyLetter = null;
    this.onResetGame = null;
    this.onCreateGame = null;
    this.onLoadGame = null;
    this.onBackToMenu = null;
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.bindMenuEvents();
    this.showMenu();
  }

  cacheElements() {
    this.elements = {
      app: document.getElementById('app'),
      menuScreen: document.getElementById('menu-screen'),
      gameScreen: document.getElementById('game-screen'),
      dayDisplay: document.getElementById('day-display'),
      goldDisplay: document.getElementById('gold-display'),
      navItems: document.querySelectorAll('.nav-item'),
      tabContents: document.querySelectorAll('.tab-content'),
      flipButton: document.getElementById('flip-button'),
      resetButton: document.getElementById('reset-button'),
      menuButton: document.getElementById('menu-button'),
      debugButton: document.getElementById('debug-button'),
      modal: document.getElementById('modal'),
      modalTitle: document.getElementById('modal-title'),
      modalContent: document.getElementById('modal-content'),
      modalActions: document.getElementById('modal-actions'),
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toast-message')
    };
  }

  bindEvents() {
    this.elements.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = item.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    this.elements.flipButton?.addEventListener('click', () => {
      if (this.onFlipPage) this.onFlipPage();
    });

    this.elements.resetButton?.addEventListener('click', () => {
      this.showConfirm('重置游戏', '确定要重置当前存档吗？所有进度将丢失。', () => {
        if (this.onResetGame) this.onResetGame();
      });
    });

    this.elements.menuButton?.addEventListener('click', () => {
      this.showConfirm('返回主菜单', '返回主菜单前会自动保存当前进度。', () => {
        if (this.onBackToMenu) this.onBackToMenu();
      });
    });

    if (CONFIG.DEBUG_MODE) {
      this.elements.debugButton?.classList.remove('hidden');
      this.elements.debugButton?.addEventListener('click', () => {
        this.showDebugModal();
      });
    }
  }

  showMenu() {
    this.currentView = 'menu';
    this.elements.menuScreen?.classList.remove('hidden');
    this.elements.gameScreen?.classList.add('hidden');
    this.showMainMenu();
  }

  showMainMenu() {
    document.getElementById('menu-main-buttons')?.classList.remove('hidden');
    document.getElementById('menu-save-selection')?.classList.add('hidden');
  }

  showSaveSelection(mode = 'continue') {
    this.currentMenuMode = mode;
    document.getElementById('menu-main-buttons')?.classList.add('hidden');
    document.getElementById('menu-save-selection')?.classList.remove('hidden');
    this.renderMenu(mode);
  }

  bindMenuEvents() {
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.showSaveSelection('start');
    });

    document.getElementById('btn-continue-game')?.addEventListener('click', () => {
      this.showSaveSelection('continue');
    });

    document.getElementById('btn-exit-game')?.addEventListener('click', () => {
      this.showConfirm('退出游戏', '确定要退出游戏吗？当前进度已自动保存。', () => {
        window.close();
        this.showToast('请关闭浏览器标签页');
      });
    });

    document.getElementById('btn-back-to-menu')?.addEventListener('click', () => {
      this.showMainMenu();
    });
  }

  showGame() {
    this.currentView = 'game';
    this.elements.menuScreen?.classList.add('hidden');
    this.elements.gameScreen?.classList.remove('hidden');
    this.render();
  }

  renderMenu(mode = 'continue') {
    const slots = storageManager.getAllSlots();
    const slotsContainer = document.getElementById('save-slots');
    
    if (slotsContainer) {
      slotsContainer.innerHTML = slots.map(slot => {
        const info = slot.info;
        const slotText = slot.hasData 
          ? `存档 ${slot.slot} - 第${info.day}天 | ${info.gold}金币`
          : `存档 ${slot.slot} - 空`;
        const lastPlayed = info?.lastPlayed 
          ? new Date(info.lastPlayed).toLocaleDateString('zh-CN')
          : '';
        
        let actionsHtml = '';
        if (mode === 'start') {
          if (slot.hasData) {
            actionsHtml = `
              <button class="btn btn-slot-create" data-slot="${slot.slot}">覆盖创建</button>
              <button class="btn btn-slot-delete" data-slot="${slot.slot}">删除</button>
            `;
          } else {
            actionsHtml = `
              <button class="btn btn-slot-create" data-slot="${slot.slot}">创建游戏</button>
            `;
          }
        } else {
          if (slot.hasData) {
            actionsHtml = `
              <button class="btn btn-slot-load" data-slot="${slot.slot}">继续游戏</button>
              <button class="btn btn-slot-delete" data-slot="${slot.slot}">删除</button>
            `;
          } else {
            actionsHtml = `
              <button class="btn btn-slot-create" data-slot="${slot.slot}">创建游戏</button>
            `;
          }
        }
        
        return `
          <div class="save-slot ${slot.hasData ? 'has-data' : 'empty'}" data-slot="${slot.slot}">
            <div class="slot-info">
              <div class="slot-main">${slotText}</div>
              ${lastPlayed ? `<div class="slot-date">上次游玩：${lastPlayed}</div>` : ''}
            </div>
            <div class="slot-actions">
              ${actionsHtml}
            </div>
          </div>
        `;
      }).join('');

      slotsContainer.querySelectorAll('.btn-slot-create').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const slot = parseInt(btn.dataset.slot);
          this.handleCreateGame(slot);
        });
      });

      slotsContainer.querySelectorAll('.btn-slot-load').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const slot = parseInt(btn.dataset.slot);
          this.handleLoadGame(slot);
        });
      });

      slotsContainer.querySelectorAll('.btn-slot-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const slot = parseInt(btn.dataset.slot);
          this.handleDeleteSlot(slot);
        });
      });
    }
  }

  handleDeleteSlot(slot) {
    this.showConfirm('删除存档', `确定要删除存档 ${slot} 吗？此操作不可撤销。`, () => {
      storageManager.clearGame(slot);
      this.renderMenu(this.currentMenuMode);
      this.showToast(`存档 ${slot} 已删除`);
    });
  }

  handleCreateGame(slot) {
    const hasData = storageManager.hasGameData(slot);
    if (hasData) {
      this.showConfirm('覆盖存档', `确定要覆盖存档 ${slot} 吗？当前存档数据将被清除。`, () => {
        if (this.onCreateGame) this.onCreateGame(slot);
      });
    } else {
      if (this.onCreateGame) this.onCreateGame(slot);
    }
  }

  handleLoadGame(slot) {
    if (this.onLoadGame) this.onLoadGame(slot);
  }

  render() {
    this.updateHeader();
    this.renderCurrentTab();
    this.updateNavBadges();
  }

  updateHeader() {
    if (this.elements.dayDisplay) {
      const seasonName = game.getSeasonInfo ? game.getSeasonInfo().name : '';
      this.elements.dayDisplay.textContent = `第 ${game.data.day} 天 · ${seasonName}季`;
    }
    if (this.elements.goldDisplay) {
      const gold = Number(game.data.gold);
      this.elements.goldDisplay.textContent = isNaN(gold) ? 0 : gold;
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    this.elements.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    this.elements.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    this.renderCurrentTab();
    
    if (this.onTabChange) this.onTabChange(tabName);
  }

  renderCurrentTab() {
    switch (this.currentTab) {
      case 'letters':
        this.renderLetters();
        break;
      case 'farm':
        this.renderFarm();
        break;
      case 'warehouse':
        this.renderWarehouse();
        break;
      case 'ranch':
        this.renderRanch();
        break;
      case 'plans':
        this.renderPlans();
        break;
      case 'logs':
        this.renderLogs();
        break;
      case 'collection':
        this.renderCollection();
        break;
    }
  }

  renderRanch() {
    const container = document.getElementById('tab-ranch');
    if (!container) return;
    
    const coops = game.data.farm.buildings.filter(b => b.type === 'chickenCoop' && b.status === 'built');
    const capacity = game.getCoopCapacity();
    const chickens = game.getChickenCount();
    const price = CONFIG.CHICKEN_PRICE || 50;
    const full = chickens >= capacity;
    
    const todayEggs = game.todayLogs
      .filter(l => l.type === 'egg_collect')
      .reduce((acc, l) => ({ eggs: acc.eggs + l.data.eggs, largeEggs: acc.largeEggs + l.data.largeEggs }), { eggs: 0, largeEggs: 0 });
    
    const eggPrice = game.getSellPrice('egg');
    const largeEggPrice = game.getSellPrice('largeEgg');
    const layChance = Math.round((CONFIG.EGG_LAY_CHANCE || 0.6) * 100);
    const largeChance = Math.round((CONFIG.LARGE_EGG_CHANCE || 0.1) * 100);
    
    let coopSection;
    if (coops.length === 0) {
      coopSection = `
        <div class="empty-state">
          <div class="empty-state-icon">🏠</div>
          <div class="empty-state-text">还没有鸡舍，请先在「计划项目」中建造</div>
        </div>
      `;
    } else {
      coopSection = `
        <div class="ranch-coop">
          <div class="ranch-coop-info">
            <div class="ranch-chickens">
              ${Array.from({ length: chickens }, (_, i) => '<span class="inline-icon"><span class="icon-chick"></span></span>').join('')}
              ${Array.from({ length: Math.max(0, capacity - chickens) }, () => '<span class="ranch-empty-slot"></span>').join('')}
            </div>
            <div class="ranch-count">母鸡 ${chickens}/${capacity}（${coops.length} 座鸡舍）</div>
          </div>
          <button class="btn btn-primary btn-buy-chicken" ${full ? 'disabled' : ''}>
            ${full ? '容量已满' : `购买母鸡（${price}金币）`}
          </button>
        </div>
        <div class="ranch-tip">
          每只母鸡每天有 ${layChance}% 概率产蛋，产下的蛋有 ${largeChance}% 概率是大鸡蛋。<br>
          产出的蛋自动存入仓库，可在「农场仓库」中出售。
        </div>
      `;
    }
    
    container.innerHTML = `
      <div class="content-section">
        <h3 class="content-section-title">🐔 鸡舍</h3>
        ${coopSection}
      </div>
      <div class="content-section">
        <h3 class="content-section-title">🥚 蛋类产出</h3>
        <div class="ranch-production">
          <div class="ranch-production-item">
            <span class="inline-icon"><span class="crop-icon crop-egg"></span></span>
            <div class="ranch-production-info">
              <div class="ranch-production-name">鸡蛋</div>
              <div class="ranch-production-price">当前售价 ${eggPrice} 金币</div>
            </div>
            <div class="ranch-production-today">今日 +${todayEggs.eggs}</div>
          </div>
          <div class="ranch-production-item">
            <span class="inline-icon"><span class="crop-icon crop-largeEgg"></span></span>
            <div class="ranch-production-info">
              <div class="ranch-production-name">大鸡蛋</div>
              <div class="ranch-production-price">当前售价 ${largeEggPrice} 金币</div>
            </div>
            <div class="ranch-production-today">今日 +${todayEggs.largeEggs}</div>
          </div>
        </div>
      </div>
    `;
    
    const buyBtn = container.querySelector('.btn-buy-chicken');
    buyBtn?.addEventListener('click', () => {
      const result = game.buyChicken();
      if (result.success) {
        this.showToast(`购买了一只母鸡（${chickens + 1}/${result.capacity}）`);
        this.render();
      } else {
        this.showToast(result.message, 'error');
      }
    });
  }

  renderCollection() {
    const container = document.getElementById('tab-collection');
    if (!container) return;
    
    const stats = game.data.cropStats || {};
    const unlocked = game.data.unlockedCrops || [];
    const plantableTypes = Object.keys(CROP_TYPES).filter(t => !CROP_TYPES[t].animalProduct);
    const animalProducts = Object.keys(CROP_TYPES).filter(t => CROP_TYPES[t].animalProduct);
    
    const renderCollectionItem = (type, crop, isAnimal) => {
      const isUnlocked = unlocked.includes(type);
      const s = stats[type] || { harvested: 0, sold: 0 };
      const known = isUnlocked || s.harvested > 0 || s.sold > 0;
      
      let detail;
      if (!known) {
        detail = '<div class="collection-detail">尚未发现</div>';
      } else if (isAnimal) {
        detail = `<div class="collection-detail">鸡舍产出</div>
          <div class="collection-stats">累计出售 ${s.sold} 个</div>`;
      } else {
        detail = `
          <div class="collection-detail">
            生长${crop.daysToHarvest}天${crop.regrowDays ? ` | 再生${crop.regrowDays}天` : ''} | 售价${crop.harvestValue} | 种子${crop.seedCost}
          </div>
          <div class="collection-stats">
            累计收获 ${s.harvested} 次 | 累计出售 ${s.sold} 个
          </div>`;
      }
      
      return `
        <div class="collection-item ${known ? '' : 'unknown'}">
          <div class="collection-icon">
            ${known ? `<span class="inline-icon"><span class="crop-icon crop-mature crop-${type}"></span></span>` : '<span class="collection-mystery">？</span>'}
          </div>
          <div class="collection-info">
            <div class="collection-name">
              ${known ? crop.name : '？？？'}
              ${isUnlocked || isAnimal ? '' : '<span class="collection-lock">🔒</span>'}
              ${crop.regrowDays ? '<span class="collection-tag">复种</span>' : ''}
              ${isAnimal ? '<span class="collection-tag">养殖</span>' : ''}
            </div>
            ${detail}
          </div>
        </div>
      `;
    };
    
    const cropItems = plantableTypes.map(type => renderCollectionItem(type, CROP_TYPES[type], false)).join('');
    const animalItems = animalProducts.map(type => renderCollectionItem(type, CROP_TYPES[type], true)).join('');
    
    const buildingItems = Object.entries(BUILDING_TYPES).map(([type, building]) => {
      const owned = game.data.farm.buildings.filter(b => b.type === type);
      const known = owned.length > 0;
      const maxLevel = CONFIG.MAX_BUILDING_LEVEL || 3;
      const topLevel = owned.reduce((m, b) => Math.max(m, b.level), 0);
      
      return `
        <div class="collection-item ${known ? '' : 'unknown'}">
          <div class="collection-icon">
            ${known ? `<span class="inline-icon"><span class="building-icon ${this.getBuildingIconClass(type)}"></span></span>` : '<span class="collection-mystery">？</span>'}
          </div>
          <div class="collection-info">
            <div class="collection-name">
              ${known ? building.name : '？？？'}
              ${topLevel >= maxLevel ? '<span class="collection-tag">满级</span>' : ''}
            </div>
            ${known ? `
              <div class="collection-detail">${building.description}</div>
              <div class="collection-stats">已建造 ${owned.length} 座${topLevel > 0 ? ` | 最高 Lv${topLevel}` : ''}</div>
            ` : '<div class="collection-detail">尚未建造</div>'}
          </div>
        </div>
      `;
    }).join('');
    
    const totalHarvests = Object.values(stats).reduce((sum, s) => sum + (s.harvested || 0), 0);
    const totalSold = Object.values(stats).reduce((sum, s) => sum + (s.sold || 0), 0);
    const unlockedPlantable = plantableTypes.filter(t => unlocked.includes(t)).length;
    
    container.innerHTML = `
      <div class="content-section">
        <h3 class="content-section-title">📖 图鉴总览</h3>
        <div class="collection-summary">累计收获 ${totalHarvests} 次作物 | 累计出售 ${totalSold} 个 | 已解锁作物 ${unlockedPlantable}/${plantableTypes.length}</div>
      </div>
      <div class="content-section">
        <h3 class="content-section-title">作物图鉴</h3>
        <div class="collection-grid">
          ${cropItems}
        </div>
      </div>
      <div class="content-section">
        <h3 class="content-section-title">养殖产物</h3>
        <div class="collection-grid">
          ${animalItems}
        </div>
      </div>
      <div class="content-section">
        <h3 class="content-section-title">建筑图鉴</h3>
        <div class="collection-grid">
          ${buildingItems}
        </div>
      </div>
    `;
  }

  renderLetters() {
    const container = document.getElementById('tab-letters');
    if (!container) return;
    
    const letters = game.data.letters
      .filter(l => l.isTriggered)
      .sort((a, b) => b.triggerDay - a.triggerDay);
    
    const merchantHtml = this.renderMerchantSection();
    
    if (letters.length === 0) {
      container.innerHTML = `
        ${merchantHtml}
        <div class="empty-state">
          <div class="empty-state-icon">📬</div>
          <div class="empty-state-text">暂无信件</div>
        </div>
      `;
      this.bindMerchantEvents(container);
      return;
    }
    
    container.innerHTML = `
      ${merchantHtml}
      <div class="content-section">
        <h3 class="content-section-title">信件</h3>
        <div class="card-list">
          ${letters.map(letter => this.renderLetterCard(letter)).join('')}
        </div>
      </div>
    `;
    
    container.querySelectorAll('.letter-card').forEach(card => {
      card.addEventListener('click', () => {
        const letterId = card.dataset.letterId;
        this.showLetterDetail(letterId);
      });
    });
    
    this.bindMerchantEvents(container);
  }

  renderMerchantSection() {
    const orders = game.getActiveMerchantOrders();
    
    if (orders.length === 0) {
      return `
        <div class="content-section">
          <h3 class="content-section-title">🤝 合作商人</h3>
          <div class="merchant-empty">商人正在各地奔波，有收购需求时会在这里出现（高价收购，限时完成）</div>
        </div>
      `;
    }
    
    return `
      <div class="content-section">
        <h3 class="content-section-title">🤝 合作商人</h3>
        <div class="card-list">
          ${orders.map(order => this.renderMerchantOrder(order)).join('')}
        </div>
      </div>
    `;
  }

  renderMerchantOrder(order) {
    const cropType = CROP_TYPES[order.type] || {};
    const stock = game.getWarehouseCount(order.type);
    const enough = stock >= order.count;
    const daysLeft = order.expireDay - game.data.day;
    
    return `
      <div class="merchant-card ${enough ? '' : 'insufficient'}">
        <div class="merchant-main">
          <span class="inline-icon"><span class="crop-icon crop-mature crop-${order.type}"></span></span>
          <div class="merchant-info">
            <div class="merchant-title">高价收购 ${cropType.name || order.type} × ${order.count}</div>
            <div class="merchant-detail">单价 ${order.unitPrice} 金币（市价 ${game.getSellPrice(order.type)}）| 总价 ${order.unitPrice * order.count} 金币</div>
            <div class="merchant-stock ${enough ? '' : 'lack'}">仓库存量：${stock}/${order.count} | 剩余 ${daysLeft} 天</div>
          </div>
        </div>
        <button class="btn btn-action btn-merchant-sell" data-order-id="${order.id}" ${enough ? '' : 'disabled'}>
          ${enough ? '出售' : '存货不足'}
        </button>
      </div>
    `;
  }

  bindMerchantEvents(container) {
    container.querySelectorAll('.btn-merchant-sell').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderId = btn.dataset.orderId;
        const result = game.sellToMerchant(orderId);
        if (result.success) {
          this.showToast(`向商人出售${result.cropName}×${result.count}，获得${result.gold}金币`);
          this.render();
        } else {
          this.showToast(result.message, 'error');
        }
      });
    });
  }

  renderLetterCard(letter) {
    const unreadClass = !letter.isRead ? 'unread' : '';
    return `
      <div class="letter-card ${unreadClass}" data-letter-id="${letter.id}">
        <div class="letter-card-header">
          <span class="letter-from">${letter.from}</span>
          <span class="letter-day">第${letter.triggerDay}天</span>
        </div>
        <div class="letter-title">${letter.title}</div>
        ${!letter.isRead ? '<span class="letter-unread-badge">新</span>' : ''}
      </div>
    `;
  }

  showLetterDetail(letterId) {
    const letter = game.readLetter(letterId);
    if (!letter) return;
    
    this.render();
    
    let replyHtml = '';
    if (letter.hasReply && letter.replyOptions.length > 0) {
      replyHtml = `
        <div class="letter-reply-section">
          <p>回复选项：</p>
          <div class="letter-reply-options">
            ${letter.replyOptions.map((option, index) => `
              <button class="btn btn-reply" data-letter-id="${letter.id}" data-reply-index="${index}">
                ${option.text}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    this.showModal(letter.title, `
      <div class="letter-detail">
        <div class="letter-detail-header">
          <span class="letter-detail-from">${letter.from}</span>
          <span class="letter-detail-day">第${letter.triggerDay}天</span>
        </div>
        <div class="letter-detail-content">
          ${letter.content.replace(/\n/g, '<br>')}
        </div>
        ${replyHtml}
      </div>
    `);
    
    if (letter.hasReply) {
      this.elements.modalActions.querySelectorAll('.btn-reply').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const replyIndex = parseInt(btn.dataset.replyIndex);
          if (this.onReplyLetter) {
            this.onReplyLetter(letterId, replyIndex);
          }
          this.hideModal();
          this.render();
          this.showToast('回复已发送');
        });
      });
    }
  }

  renderFarm() {
    const container = document.getElementById('tab-farm');
    if (!container) return;
    
    const weatherName = game.getWeatherName();
    const seasonInfo = game.getSeasonInfo();
    const seasonDay = game.getSeasonDay();
    
    container.innerHTML = `
      <div class="content-section">
        <h3 class="content-section-title">
          今日天气
          <span class="title-weather">
            <span class="inline-icon"><span class="weather-icon weather-icon-${game.currentWeather}"></span></span>
            <span class="weather-name">${weatherName}</span>
          </span>
        </h3>
        <div class="season-info">
          <span class="season-name">${seasonInfo.name}季 第${seasonDay}/${CONFIG.SEASON_DAYS}天</span>
          <span class="season-desc">${seasonInfo.description}（生长时间×${seasonInfo.growthMultiplier}，收益×${seasonInfo.incomeMultiplier}）</span>
        </div>
      </div>
      
      <div class="content-section">
        <h3 class="content-section-title">作物情况</h3>
        ${this.renderCropsSection()}
      </div>
      
      <div class="content-section">
        <h3 class="content-section-title">建筑</h3>
        ${this.renderBuildingsSection()}
      </div>
      
      <div class="content-section">
        <h3 class="content-section-title">今日小结</h3>
        ${this.renderTodaySummary()}
      </div>
    `;
    
    container.querySelectorAll('.btn-harvest').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cropId = btn.dataset.cropId;
        this.handleHarvest(cropId);
      });
    });
  }

  renderCropsSection() {
    const crops = game.data.farm.crops;
    const pendingCrops = game.pendingCrops || [];
    const capacity = game.getCropCapacity();
    const current = game.getCurrentCropCount();
    
    let header = `当前 ${current}/${capacity} 个作物`;
    if (pendingCrops.length > 0) {
      header += ` (明天将种 ${pendingCrops.length} 个)`;
    }
    
    if (crops.length === 0) {
      return `
        <div class="capacity-info">${header}</div>
        <div class="empty-state">
          <div class="empty-state-icon">🌱</div>
          <div class="empty-state-text">暂无作物</div>
        </div>
      `;
    }
    
    return `
      <div class="capacity-info">${header}</div>
      <div class="card-grid">
        ${crops.map(crop => this.renderCropCard(crop)).join('')}
      </div>
    `;
  }

  renderCropCard(crop) {
    const daysGrown = game.data.day - crop.plantDate;
    const daysNeeded = game.getEffectiveDaysNeeded ? game.getEffectiveDaysNeeded(crop) : crop.daysToHarvest;
    const progress = Math.min(100, Math.floor((daysGrown / daysNeeded) * 100));
    
    let statusText = '';
    let statusClass = '';
    let actionHtml = '';
    
    switch (crop.status) {
      case 'growing':
        statusText = `生长中 (${daysGrown}/${daysNeeded}天)`;
        statusClass = 'growing';
        break;
      case 'harvestable':
        statusText = '可收获';
        statusClass = 'harvestable';
        actionHtml = `<button class="btn btn-harvest btn-sm" data-crop-id="${crop.id}">收获</button>`;
        break;
      case 'empty':
        statusText = '空置';
        statusClass = 'empty';
        break;
    }
    
    return `
      <div class="crop-card ${statusClass}">
        <div class="crop-icon crop-mature crop-${crop.type}"></div>
        <div class="crop-info">
          <div class="crop-name">${crop.name}</div>
          <div class="crop-status">${statusText}</div>
          ${crop.status === 'growing' ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          ` : ''}
        </div>
        ${actionHtml}
      </div>
    `;
  }

  renderBuildingsSection() {
    const buildings = game.data.farm.buildings;
    
    if (buildings.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">🏗️</div>
          <div class="empty-state-text">暂无建筑</div>
        </div>
      `;
    }
    
    const typeOrder = Object.keys(BUILDING_TYPES);
    const sorted = buildings
      .map((b, i) => ({ b, i }))
      .sort((x, y) => {
        const diff = typeOrder.indexOf(x.b.type) - typeOrder.indexOf(y.b.type);
        return diff !== 0 ? diff : x.i - y.i;
      })
      .map(x => x.b);
    
    return `
      <div class="card-grid">
        ${sorted.map(building => this.renderBuildingCard(building)).join('')}
      </div>
    `;
  }

  getBuildingIconClass(type) {
    switch (type) {
      case 'field': return 'building-field';
      case 'barn': return 'building-barn';
      case 'chickenCoop': return 'building-coop';
      case 'well': return 'building-well';
      default: return '';
    }
  }

  getBuildingStatText(building) {
    switch (building.type) {
      case 'field': {
        const capacities = BUILDING_TYPES.field.capacityPerLevel || [2, 3, 4];
        return `当前种植位：${capacities[building.level - 1] || 2} 个作物`;
      }
      case 'barn': {
        const bonuses = BUILDING_TYPES.barn.incomeBonusPerLevel || [];
        return `当前加成：售价 +${Math.round((bonuses[building.level - 1] || 0) * 100)}%`;
      }
      case 'chickenCoop': {
        const chickens = game.getChickenCount();
        const capacity = game.getCoopCapacity();
        return `当前母鸡：${chickens}/${capacity} 只`;
      }
      case 'well': {
        const bonuses = BUILDING_TYPES.well.speedBonusPerLevel || [];
        return `当前加速：成熟时间 -${Math.round((bonuses[building.level - 1] || 0) * 100)}%`;
      }
      default:
        return '';
    }
  }

  getUpgradePreview(building) {
    const next = building.level + 1;
    switch (building.type) {
      case 'field': {
        const capacities = BUILDING_TYPES.field.capacityPerLevel || [2, 3, 4];
        return `种植位 ${capacities[building.level - 1] || 2} → ${capacities[next - 1] || 3}`;
      }
      case 'barn': {
        const bonuses = BUILDING_TYPES.barn.incomeBonusPerLevel || [];
        return `+${Math.round((bonuses[building.level - 1] || 0) * 100)}% → +${Math.round((bonuses[next - 1] || 0) * 100)}%`;
      }
      case 'chickenCoop':
        return '';
      case 'well': {
        const bonuses = BUILDING_TYPES.well.speedBonusPerLevel || [];
        return `-${Math.round((bonuses[building.level - 1] || 0) * 100)}% → -${Math.round((bonuses[next - 1] || 0) * 100)}%`;
      }
      default:
        return '';
    }
  }

  renderBuildingCard(building) {
    const buildingType = BUILDING_TYPES[building.type] || {};
    const iconClass = this.getBuildingIconClass(building.type);
    const maxLevel = CONFIG.MAX_BUILDING_LEVEL || 3;
    const statText = this.getBuildingStatText(building);
    
    return `
      <div class="building-card">
        <div class="building-header">
          <span class="inline-icon"><span class="building-icon ${iconClass}"></span></span>
          <span class="building-name">${building.name}</span>
          <span class="building-level">Lv${building.level}${building.level >= maxLevel ? '（满级）' : ''}</span>
        </div>
        <div class="building-desc">${buildingType.description || ''}</div>
        ${statText ? `<div class="building-stat">${statText}</div>` : ''}
      </div>
    `;
  }

  renderTodaySummary() {
    const summary = game.getTodaySummary();
    
    return `
      <div class="today-summary">
        <ul class="summary-list">
          ${summary.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  renderWarehouse() {
    const container = document.getElementById('tab-warehouse');
    if (!container) return;
    
    const warehouse = game.data.warehouse || [];
    const totalValue = warehouse.reduce((sum, w) => sum + game.getSellPrice(w.type) * w.count, 0);
    
    let listHtml;
    if (warehouse.length === 0) {
      listHtml = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-text">仓库空空如也，去收获一些作物吧</div>
        </div>
      `;
    } else {
      listHtml = `
        <div class="card-list">
          ${warehouse.map(w => this.renderWarehouseItem(w)).join('')}
        </div>
      `;
    }
    
    container.innerHTML = `
      <div class="content-section">
        <h3 class="content-section-title">仓库存货${warehouse.length > 0 ? `（总价值约 ${totalValue} 金币）` : ''}</h3>
        ${listHtml}
      </div>
    `;
    
    container.querySelectorAll('.btn-sell').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSellModal(btn.dataset.cropType);
      });
    });
  }

  renderWarehouseItem(item) {
    const cropType = CROP_TYPES[item.type] || {};
    const unitPrice = game.getSellPrice(item.type);
    
    return `
      <div class="warehouse-item">
        <span class="inline-icon"><span class="crop-icon crop-mature crop-${item.type}"></span></span>
        <div class="warehouse-info">
          <span class="warehouse-name">${cropType.name || item.type} × ${item.count}</span>
          <span class="warehouse-price">单价 ${unitPrice} 金币 | 合计 ${unitPrice * item.count} 金币</span>
        </div>
        <button class="btn btn-action btn-sell" data-crop-type="${item.type}">出售</button>
      </div>
    `;
  }

  showSellModal(type) {
    const cropType = CROP_TYPES[type];
    if (!cropType) return;
    
    const count = game.getWarehouseCount(type);
    if (count < 1) {
      this.showToast('仓库中没有该作物', 'error');
      return;
    }
    
    const unitPrice = game.getSellPrice(type);
    
    this.showModal(`出售 ${cropType.name}`, `
      <div class="sell-panel">
        <p class="sell-info">仓库存量：<strong>${count}</strong> 个 | 当前单价：<strong>${unitPrice} 金币</strong></p>
        <div class="sell-row">
          <button class="btn btn-action" id="sell-minus">−</button>
          <input type="number" id="sell-count" value="1" min="1" max="${count}">
          <button class="btn btn-action" id="sell-plus">＋</button>
          <button class="btn btn-action" id="sell-max">全部</button>
        </div>
        <div class="sell-preview" id="sell-preview"></div>
      </div>
    `, `
      <button class="btn btn-cancel" id="sell-cancel">取消</button>
      <button class="btn btn-primary" id="sell-confirm">确认出售</button>
    `);
    
    const input = document.getElementById('sell-count');
    const preview = document.getElementById('sell-preview');
    
    const updatePreview = () => {
      let n = parseInt(input.value);
      if (isNaN(n) || n < 1) n = 1;
      if (n > count) n = count;
      input.value = n;
      preview.textContent = `出售 ${n} 个 × ${unitPrice} 金币 = ${n * unitPrice} 金币`;
    };
    
    input.addEventListener('input', updatePreview);
    document.getElementById('sell-minus')?.addEventListener('click', () => {
      input.value = Math.max(1, (parseInt(input.value) || 1) - 1);
      updatePreview();
    });
    document.getElementById('sell-plus')?.addEventListener('click', () => {
      input.value = Math.min(count, (parseInt(input.value) || 1) + 1);
      updatePreview();
    });
    document.getElementById('sell-max')?.addEventListener('click', () => {
      input.value = count;
      updatePreview();
    });
    document.getElementById('sell-cancel')?.addEventListener('click', () => {
      this.hideModal();
    });
    document.getElementById('sell-confirm')?.addEventListener('click', () => {
      const n = parseInt(input.value);
      if (isNaN(n) || n < 1 || n > count) {
        this.showToast('请输入有效的出售数量', 'error');
        return;
      }
      const result = game.sellCrops(type, n);
      if (result.success) {
        this.hideModal();
        this.showToast(`出售${result.cropName}×${result.count}，获得${result.gold}金币`);
        this.render();
      } else {
        this.showToast(result.message, 'error');
      }
    });
    
    updatePreview();
  }

  renderPlans() {
    const container = document.getElementById('tab-plans');
    if (!container) return;
    
    const activePlans = game.data.plans.filter(p => p.isActive);
    const activeCount = activePlans.length;
    const maxPlans = game.data.maxPlans;
    const pendingCrops = game.pendingCrops || [];
    const cropCapacity = game.getCropCapacity();
    const currentCrops = game.getCurrentCropCount();
    
    container.innerHTML = `
      <div class="content-section">
        <h3 class="content-section-title">田地容量 (${currentCrops + pendingCrops.length}/${cropCapacity})</h3>
        ${this.renderPendingCrops(pendingCrops)}
      </div>
      
      <div class="content-section">
        <h3 class="content-section-title">进行中的计划 (${activeCount}/${maxPlans})</h3>
        ${this.renderActivePlans(activePlans)}
      </div>
      
      <div class="content-section">
        <h3 class="content-section-title">可执行操作</h3>
        ${this.renderAvailableActions()}
      </div>
    `;
    
    this.bindPlanEvents();
  }

  renderPendingCrops(pendingCrops) {
    if (pendingCrops.length === 0) {
      return `
        <div class="empty-state small">
          <div class="empty-state-text">暂无待种植作物</div>
        </div>
      `;
    }
    
    return `
      <div class="card-list">
        ${pendingCrops.map(crop => this.renderPendingCropCard(crop)).join('')}
      </div>
    `;
  }

  renderPendingCropCard(crop) {
    return `
      <div class="plan-card pending-crop">
        <div class="plan-header">
          <span class="plan-icon">🌱</span>
          <span class="plan-target">${crop.name}</span>
        </div>
        <div class="plan-progress">
          <div class="plan-days">将在明天种植</div>
          <button class="btn btn-cancel-pending btn-sm" data-pending-id="${crop.id}">取消</button>
        </div>
      </div>
    `;
  }

  renderActivePlans(plans) {
    if (plans.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">暂无进行中的计划</div>
        </div>
      `;
    }
    
    return `
      <div class="card-list">
        ${plans.map(plan => this.renderPlanCard(plan)).join('')}
      </div>
    `;
  }

  renderPlanCard(plan) {
    const progress = Math.floor(((plan.daysTotal - plan.daysRemaining) / plan.daysTotal) * 100);
    
    let typeIcon = '';
    switch (plan.type) {
      case 'plant': typeIcon = '🌱'; break;
      case 'build': typeIcon = '🏗️'; break;
      case 'upgrade': typeIcon = '⬆️'; break;
      case 'purchase': typeIcon = '🛒'; break;
    }
    
    return `
      <div class="plan-card">
        <div class="plan-header">
          <span class="plan-icon">${typeIcon}</span>
          <span class="plan-target">${plan.target}</span>
        </div>
        <div class="plan-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="plan-days">剩余 ${plan.daysRemaining} 天</div>
        </div>
      </div>
    `;
  }

  renderAvailableActions() {
    return `
      <div class="actions-grid">
        <div class="action-group">
          <h4 class="action-group-title">种植作物</h4>
          ${this.renderPlantActions()}
        </div>
        
        <div class="action-group">
          <h4 class="action-group-title">建造建筑</h4>
          ${this.renderBuildActions()}
        </div>
        
        <div class="action-group">
          <h4 class="action-group-title">升级建筑</h4>
          ${this.renderUpgradeActions()}
        </div>
      </div>
    `;
  }

  renderPlantActions() {
    return Object.entries(CROP_TYPES)
      .filter(([type, crop]) => !crop.animalProduct)
      .map(([type, crop]) => {
      const unlocked = game.isCropUnlocked(type);
      const regrowText = crop.regrowDays ? ` | 收获后再生${crop.regrowDays}天` : '';
      
      if (!unlocked) {
        return `
          <div class="action-item locked-crop">
            <div class="action-info">
              <span class="action-name">${crop.name} 🔒</span>
              <span class="action-detail">${crop.daysToHarvest}天 | 解锁费 ${crop.unlockCost}金币${regrowText}</span>
            </div>
            <button class="btn btn-action btn-unlock-crop" data-crop-type="${type}" data-cost="${crop.unlockCost}">
              解锁
            </button>
          </div>
        `;
      }
      
      return `
        <div class="action-item">
          <div class="action-info">
            <span class="action-name">${crop.name}</span>
            <span class="action-detail">${crop.daysToHarvest}天 | ${crop.seedCost}金币${regrowText}</span>
          </div>
          <button class="btn btn-action btn-plant" data-crop-type="${type}" data-cost="${crop.seedCost}">
            种植
          </button>
        </div>
      `;
    }).join('');
  }

  renderBuildActions() {
    return Object.entries(BUILDING_TYPES).map(([type, building]) => {
      let countInfo = '';
      let btnText = '建造';
      if (building.maxCount) {
        const owned = game.data.farm.buildings.filter(b => b.type === type).length;
        const queued = game.data.plans.filter(p => p.isActive && p.type === 'build' && p.onComplete?.buildingData?.type === type).length;
        countInfo = ` | ${owned + queued}/${building.maxCount}`;
        if (owned + queued >= building.maxCount) {
          btnText = '已满';
        }
      }
      return `
        <div class="action-item">
          <div class="action-info">
            <span class="action-name">${building.name}</span>
            <span class="action-detail">${building.baseBuildDays}天 | ${building.baseCost}金币${countInfo}</span>
          </div>
          <button class="btn btn-action btn-build" data-building-type="${type}" data-cost="${building.baseCost}">
            ${btnText}
          </button>
        </div>
      `;
    }).join('');
  }

  renderUpgradeActions() {
    const maxLevel = CONFIG.MAX_BUILDING_LEVEL || 3;
    const built = game.data.farm.buildings.filter(b => b.status === 'built' && b.type !== 'chickenCoop');
    
    if (built.length === 0) {
      return `
        <div class="empty-state small">
          <div class="empty-state-text">暂无可升级的建筑（先建造一些建筑吧）</div>
        </div>
      `;
    }
    
    return built.map(building => {
      const maxed = building.level >= maxLevel;
      const upgrading = game.data.plans.some(p => p.isActive && p.type === 'upgrade' && p.onComplete?.buildingId === building.id);
      
      let btnHtml = '';
      let detailText = '';
      let nameText = building.name;
      
      if (maxed) {
        nameText += ` Lv${building.level}（满级）`;
        btnHtml = `<button class="btn btn-action" disabled>已满级</button>`;
      } else if (upgrading) {
        nameText += ` Lv${building.level}`;
        btnHtml = `<button class="btn btn-action" disabled>升级中</button>`;
      } else {
        const upgradeCost = Math.floor(building.level * 50);
        const upgradeDays = building.level + 2;
        nameText += ` Lv${building.level} → Lv${building.level + 1}`;
        const preview = this.getUpgradePreview(building);
        detailText = `${upgradeDays}天 | ${upgradeCost}金币${preview ? ' | ' + preview : ''}`;
        btnHtml = `<button class="btn btn-action btn-upgrade" data-building-id="${building.id}" data-cost="${upgradeCost}">升级</button>`;
      }
      
      return `
        <div class="action-item">
          <div class="action-info">
            <span class="action-name">${nameText}</span>
            ${detailText ? `<span class="action-detail">${detailText}</span>` : ''}
          </div>
          ${btnHtml}
        </div>
      `;
    }).join('');
  }

  bindPlanEvents() {
    document.querySelectorAll('.btn-plant').forEach(btn => {
      btn.addEventListener('click', () => {
        const cropType = btn.dataset.cropType;
        const cost = parseInt(btn.dataset.cost);
        this.handlePlant(cropType, cost);
      });
    });

    document.querySelectorAll('.btn-unlock-crop').forEach(btn => {
      btn.addEventListener('click', () => {
        const cropType = btn.dataset.cropType;
        const cost = parseInt(btn.dataset.cost);
        this.handleUnlockCrop(cropType, cost);
      });
    });
    
    document.querySelectorAll('.btn-build').forEach(btn => {
      btn.addEventListener('click', () => {
        const buildingType = btn.dataset.buildingType;
        const cost = parseInt(btn.dataset.cost);
        this.handleBuild(buildingType, cost);
      });
    });
    
    document.querySelectorAll('.btn-upgrade').forEach(btn => {
      btn.addEventListener('click', () => {
        const buildingId = btn.dataset.buildingId;
        const cost = parseInt(btn.dataset.cost);
        this.handleUpgrade(buildingId, cost);
      });
    });

    document.querySelectorAll('.btn-cancel-pending').forEach(btn => {
      btn.addEventListener('click', () => {
        const pendingId = btn.dataset.pendingId;
        this.handleCancelPendingCrop(pendingId);
      });
    });
  }

  handleCancelPendingCrop(pendingId) {
    if (game.cancelPendingCrop(pendingId)) {
      this.showToast('已取消待种植作物');
      this.render();
    }
  }

  handleUnlockCrop(cropType, cost) {
    const crop = CROP_TYPES[cropType];
    if (!crop) return;
    
    this.showConfirm(
      '解锁作物',
      `确定要花 ${cost} 金币解锁「${crop.name}」吗？\n解锁后可永久种植${crop.regrowDays ? `，收获后每${crop.regrowDays}天重新结果` : ''}。`,
      () => {
        const result = game.unlockCrop(cropType);
        if (result.success) {
          this.showToast(`已解锁「${result.cropName}」`);
          this.render();
        } else {
          this.showToast(result.message, 'error');
        }
      }
    );
  }

  handlePlant(cropType, cost) {
    const crop = CROP_TYPES[cropType];
    if (!crop) return;
    
    if (!game.canPlantCrop()) {
      this.showToast(game.getPlantingErrorMessage(), 'error');
      return;
    }
    
    if (this.onAddPlan) {
      const result = this.onAddPlan({
        type: 'plant',
        target: crop.name,
        days: 0,
        cost: cost,
        onComplete: {
          cropData: {
            name: crop.name,
            type: cropType,
            daysToHarvest: crop.daysToHarvest,
            seedCost: cost
          }
        }
      });
      
      if (result.success) {
        this.showToast(result.message);
        this.render();
      } else {
        this.showToast(result.message, 'error');
      }
    }
  }

  handleBuild(buildingType, cost) {
    const building = BUILDING_TYPES[buildingType];
    if (!building) return;
    
    if (building.maxCount) {
      const owned = game.data.farm.buildings.filter(b => b.type === buildingType).length;
      const queued = game.data.plans.filter(p => p.isActive && p.type === 'build' && p.onComplete?.buildingData?.type === buildingType).length;
      if (owned + queued >= building.maxCount) {
        this.showToast(`${building.name}建造数量已达上限（${building.maxCount}个）`, 'error');
        return;
      }
    }
    
    this.showConfirm(
      '建造建筑',
      `确定要建造${building.name}吗？\n消耗：${cost}金币\n工期：${building.baseBuildDays}天`,
      () => {
        if (this.onAddPlan) {
          const result = this.onAddPlan({
            type: 'build',
            target: building.name,
            days: building.baseBuildDays,
            cost: cost,
            onComplete: {
              buildingData: {
                name: building.name,
                type: buildingType
              }
            }
          });
          
          if (result.success) {
            this.showToast(`已开始建造${building.name}`);
            this.render();
          } else {
            this.showToast(result.message, 'error');
          }
        }
      }
    );
  }

  handleUpgrade(buildingId, cost) {
    const building = game.getBuildingById(buildingId);
    if (!building) return;
    
    const maxLevel = CONFIG.MAX_BUILDING_LEVEL || 3;
    if (building.level >= maxLevel) {
      this.showToast(`${building.name}已达最高等级（${maxLevel}级）`, 'error');
      return;
    }
    
    const upgrading = game.data.plans.some(p => p.isActive && p.type === 'upgrade' && p.onComplete?.buildingId === buildingId);
    if (upgrading) {
      this.showToast(`${building.name}正在升级中，请等待完成`, 'error');
      return;
    }
    
    const upgradeDays = building.level + 2;
    
    if (this.onAddPlan) {
      const result = this.onAddPlan({
        type: 'upgrade',
        target: `${building.name} Lv${building.level} → Lv${building.level + 1}`,
        days: upgradeDays,
        cost: cost,
        onComplete: {
          buildingId: buildingId
        }
      });
      
      if (result.success) {
        this.showToast(`已开始升级${building.name}`);
        this.render();
      } else {
        this.showToast(result.message, 'error');
      }
    }
  }

  handleHarvest(cropId) {
    const result = game.harvestCrop(cropId);
    if (result) {
      this.showToast(`收获了${result.cropName}，已存入仓库`);
      this.render();
    }
  }

  renderLogs() {
    const container = document.getElementById('tab-logs');
    if (!container) return;
    
    const logs = game.data.dailyLogs.sort((a, b) => b.day - a.day);
    
    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">暂无日志记录</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="content-section">
        <h3 class="content-section-title">日志记录</h3>
        <div class="logs-timeline">
          ${logs.map(log => this.renderLogEntry(log)).join('')}
        </div>
      </div>
    `;
  }

  renderLogEntry(log) {
    const weatherIcon = this.getWeatherIcon(log.events);
    const weatherName = WEATHER_TYPES[log.events]?.name || '晴';
    const seasonName = log.season && SEASONS[log.season] ? SEASONS[log.season].name + '季 · ' : '';
    
    return `
      <div class="log-entry">
        <div class="log-header">
          <span class="log-day">第${log.day}天</span>
          <span class="log-weather">${seasonName}${weatherIcon} ${weatherName}</span>
        </div>
        <div class="log-stats">
          <span class="log-gold">收入：${log.goldEarned}金币</span>
          <span class="log-crops">收获：${log.cropsHarvested}次</span>
        </div>
        ${log.logs && log.logs.length > 0 ? `
          <div class="log-details">
            ${log.logs.map(l => `<div class="log-detail-item">${this.formatLogItem(l)}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  formatLogItem(logItem) {
    switch (logItem.type) {
      case 'plan_complete':
        return `计划"${logItem.data.planName}"已完成`;
      case 'crop_planted':
        return `${logItem.data.cropName}已种下`;
      case 'crop_ready':
        return `${logItem.data.cropName}已成熟`;
      case 'harvest':
        return `收获${logItem.data.cropName}，存入仓库`;
      case 'sell':
        return `出售${logItem.data.cropName}×${logItem.data.count}，+${logItem.data.gold}金币`;
      case 'event':
        return `${logItem.data.eventName}`;
      case 'letter':
        return `收到${logItem.data.from}的信件`;
      case 'coop_income':
        return `鸡舍产出，+${logItem.data.gold}金币`;
      case 'season_change':
        return `季节变换，进入了${logItem.data.seasonName}季`;
      case 'egg_collect':
        return `母鸡产下了${logItem.data.eggs}个鸡蛋和${logItem.data.largeEggs}个大鸡蛋`;
      case 'chicken_buy':
        return `购买了一只母鸡，-${logItem.data.cost}金币`;
      default:
        return '';
    }
  }

  updateNavBadges() {
    const unreadCount = game.getUnreadLetterCount();
    const badge = document.querySelector('.nav-item[data-tab="letters"] .nav-badge');
    
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  setFlippingState(isFlipping) {
    if (this.elements.flipButton) {
      this.elements.flipButton.disabled = isFlipping;
      this.elements.flipButton.classList.toggle('flipping', isFlipping);
    }
  }

  showModal(title, content, actions = '') {
    if (this.elements.modalTitle) {
      this.elements.modalTitle.textContent = title;
    }
    if (this.elements.modalContent) {
      this.elements.modalContent.innerHTML = content;
    }
    if (this.elements.modalActions) {
      this.elements.modalActions.innerHTML = actions || '<button class="btn btn-close-modal">关闭</button>';
    }
    
    this.elements.modal?.classList.add('active');
    
    const closeBtn = this.elements.modal?.querySelector('.modal-close');
    const closeModalBtn = this.elements.modalActions?.querySelector('.btn-close-modal');
    
    const closeHandler = () => this.hideModal();
    
    if (closeBtn) {
      closeBtn.onclick = closeHandler;
    }
    if (closeModalBtn) {
      closeModalBtn.onclick = closeHandler;
    }
    
    if (this.elements.modal) {
      this.elements.modal.onclick = (e) => {
        if (e.target === this.elements.modal) {
          this.hideModal();
        }
      };
    }
  }

  hideModal() {
    this.elements.modal?.classList.remove('active');
  }

  showConfirm(title, message, onConfirm) {
    this.showModal(title, `<p>${message}</p>`, `
      <button class="btn btn-cancel">取消</button>
      <button class="btn btn-confirm">确定</button>
    `);
    
    this.elements.modalActions?.querySelector('.btn-cancel')?.addEventListener('click', () => {
      this.hideModal();
    });
    
    this.elements.modalActions?.querySelector('.btn-confirm')?.addEventListener('click', () => {
      this.hideModal();
      if (onConfirm) onConfirm();
    });
  }

  showToast(message, type = 'info') {
    if (this.elements.toastMessage) {
      this.elements.toastMessage.textContent = message;
    }
    
    this.elements.toast?.classList.remove('success', 'error', 'info');
    this.elements.toast?.classList.add(type);
    this.elements.toast?.classList.add('active');
    
    setTimeout(() => {
      this.elements.toast?.classList.remove('active');
    }, 3000);
  }

  showDebugModal() {
    const gold = Number(game.data.gold) || 0;
    
    this.showModal('调试工具', `
      <div class="debug-panel">
        <div class="debug-section">
          <h4 class="debug-title">修改金币</h4>
          <div class="debug-row">
            <input type="number" id="debug-gold-input" value="${gold}" min="0">
            <button class="btn btn-primary" id="debug-set-gold">设置金币</button>
          </div>
        </div>
        <div class="debug-section">
          <h4 class="debug-title">跳过天数</h4>
          <div class="debug-row">
            <input type="number" id="debug-days-input" value="1" min="1" max="365">
            <button class="btn btn-primary" id="debug-skip-days">跳过</button>
          </div>
          <p class="debug-tip">当前第 ${game.data.day} 天，跳过会自动结算计划、作物、天气和事件</p>
        </div>
      </div>
    `);
    
    document.getElementById('debug-set-gold')?.addEventListener('click', () => {
      const value = parseInt(document.getElementById('debug-gold-input').value);
      if (isNaN(value) || value < 0) {
        this.showToast('请输入有效的金币数量', 'error');
        return;
      }
      game.data.gold = value;
      game.save();
      this.render();
      this.showToast(`金币已设置为 ${value}`);
    });
    
    document.getElementById('debug-skip-days')?.addEventListener('click', () => {
      const count = parseInt(document.getElementById('debug-days-input').value);
      if (isNaN(count) || count < 1 || count > 365) {
        this.showToast('请输入1-365之间的天数', 'error');
        return;
      }
      this.hideModal();
      game.skipDays(count);
      this.render();
      this.showToast(`已跳过 ${count} 天，当前第 ${game.data.day} 天`);
    });
  }

  getWeatherIcon(weather) {
    switch (weather) {
      case 'sunny': return '☀️';
      case 'rainy': return '🌧️';
      case 'cloudy': return '☁️';
      case 'snowy': return '❄️';
      default: return '☀️';
    }
  }
}

const ui = new UIManager();
