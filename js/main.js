/**
 * main.js - 入口文件
 * 页面加载、实例化、事件绑定
 */

(function() {
  'use strict';

  let isInitialized = false;

  function init() {
    if (isInitialized) return;
    
    setupUI();
    setupEventHandlers();
    
    ui.init();
    
    isInitialized = true;
    
    console.log('我的农场已初始化');
  }

  function setupUI() {
    ui.onFlipPage = handleFlipPage;
    ui.onHarvest = handleHarvest;
    ui.onAddPlan = handleAddPlan;
    ui.onReadLetter = handleReadLetter;
    ui.onReplyLetter = handleReplyLetter;
    ui.onResetGame = handleResetGame;
    ui.onCreateGame = handleCreateGame;
    ui.onLoadGame = handleLoadGame;
    ui.onBackToMenu = handleBackToMenu;
  }

  function setupEventHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ui.hideModal();
      }
    });
    
    window.addEventListener('beforeunload', (e) => {
      if (game.isFlipping) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  function handleCreateGame(slot) {
    game.initGame(slot);
    ui.showGame();
    ui.showToast(`存档 ${slot} 已创建`);
  }

  function handleLoadGame(slot) {
    const loaded = game.loadData(slot);
    if (loaded) {
      ui.showGame();
      ui.showToast(`已加载存档 ${slot}`);
    } else {
      ui.showToast('存档加载失败', 'error');
    }
  }

  function handleBackToMenu() {
    game.save();
    ui.showMenu();
  }

  async function handleFlipPage() {
    if (game.isFlipping) return;
    
    ui.setFlippingState(true);
    
    const notebook = document.querySelector('.notebook:not(.hidden)');
    const content = document.querySelector('.notebook:not(.hidden) .tab-content.active');

    notebook?.classList.remove('scening-left', 'scening-right');
    notebook?.classList.add('flipping');
    content?.classList.add('flipping');

    await game.flipPage((stage) => {
      switch (stage) {
        case 'dayAdvanced':
          ui.showToast(`第 ${game.data.day} 天开始了`);
          break;
        case 'complete':
          notebook?.classList.remove('flipping', 'scening-left', 'scening-right');
          content?.classList.remove('flipping');
          ui.setFlippingState(false);
          ui.render();
          break;
      }
    });
  }

  function handleHarvest(cropId) {
    const result = game.harvestCrop(cropId);
    if (result) {
      ui.showToast(`收获了${result.cropName}，已存入仓库`);
      ui.render();
    }
  }

  function handleAddPlan(planData) {
    return game.addPlan(planData);
  }

  function handleReadLetter(letterId) {
    return game.readLetter(letterId);
  }

  function handleReplyLetter(letterId, replyIndex) {
    return game.replyLetter(letterId, replyIndex);
  }

  function handleResetGame() {
    game.resetGame();
    ui.render();
    ui.showToast('游戏已重置');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
