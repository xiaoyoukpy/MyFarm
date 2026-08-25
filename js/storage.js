/**
 * storage.js - 存储管理
 * 负责localStorage的读写操作，支持三个存档槽位
 */

class StorageManager {
  constructor() {
    this.storagePrefix = CONFIG.STORAGE_KEY;
    this.maxSlots = 3;
  }

  getSlotKey(slot) {
    return `${this.storagePrefix}_slot${slot}`;
  }

  getSlotInfoKey() {
    return `${this.storagePrefix}_slots_info`;
  }

  saveGame(gameData, slot = 1) {
    try {
      const dataString = JSON.stringify(gameData);
      localStorage.setItem(this.getSlotKey(slot), dataString);
      this.updateSlotInfo(slot, gameData);
      return true;
    } catch (error) {
      console.error('保存游戏数据失败:', error);
      return false;
    }
  }

  loadGame(slot = 1) {
    try {
      const dataString = localStorage.getItem(this.getSlotKey(slot));
      if (!dataString) {
        return null;
      }
      const gameData = JSON.parse(dataString);
      return gameData;
    } catch (error) {
      console.error('加载游戏数据失败:', error);
      return null;
    }
  }

  clearGame(slot = 1) {
    try {
      localStorage.removeItem(this.getSlotKey(slot));
      this.removeSlotInfo(slot);
      return true;
    } catch (error) {
      console.error('清除游戏数据失败:', error);
      return false;
    }
  }

  hasGameData(slot = 1) {
    try {
      return localStorage.getItem(this.getSlotKey(slot)) !== null;
    } catch (error) {
      console.error('检查游戏数据失败:', error);
      return false;
    }
  }

  getSlotInfo() {
    try {
      const info = localStorage.getItem(this.getSlotInfoKey());
      return info ? JSON.parse(info) : {};
    } catch (error) {
      return {};
    }
  }

  updateSlotInfo(slot, gameData) {
    try {
      const info = this.getSlotInfo();
      info[slot] = {
        day: gameData.day,
        gold: gameData.gold,
        lastPlayed: new Date().toISOString()
      };
      localStorage.setItem(this.getSlotInfoKey(), JSON.stringify(info));
    } catch (error) {
      console.error('更新存档信息失败:', error);
    }
  }

  removeSlotInfo(slot) {
    try {
      const info = this.getSlotInfo();
      delete info[slot];
      localStorage.setItem(this.getSlotInfoKey(), JSON.stringify(info));
    } catch (error) {
      console.error('删除存档信息失败:', error);
    }
  }

  getAllSlots() {
    const slots = [];
    for (let i = 1; i <= this.maxSlots; i++) {
      const hasData = this.hasGameData(i);
      const info = this.getSlotInfo()[i] || null;
      slots.push({
        slot: i,
        hasData: hasData,
        info: info
      });
    }
    return slots;
  }

  clearAllSlots() {
    for (let i = 1; i <= this.maxSlots; i++) {
      this.clearGame(i);
    }
  }

  getGameDataSize(slot = 1) {
    try {
      const dataString = localStorage.getItem(this.getSlotKey(slot));
      return dataString ? dataString.length : 0;
    } catch (error) {
      console.error('获取游戏数据大小失败:', error);
      return 0;
    }
  }
}

const storageManager = new StorageManager();
