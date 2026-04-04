const customLevels = require('../../services/custom-levels');
const levelRepo = require('../../services/level-repo');
const storage = require('../../utils/storage');

Page({
  data: {
    success: false,
    level: null,
    nextLevel: null,
    moves: 0,
    timeLeft: 0,
    coins: 0,
    stars: 0,
    profile: null
  },

  onLoad(options) {
    const level = levelRepo.getLevelById(options.levelId || '');
    const nextLevel = levelRepo.getLevelById(options.nextLevelId || '');
    this.setData({
      success: options.success === '1',
      level,
      nextLevel,
      moves: Number(options.moves || 0),
      timeLeft: Number(options.timeLeft || 0),
      coins: Number(options.coins || 0),
      stars: Number(options.stars || 0)
    });
  },

  onShow() {
    this.setData({
      profile: storage.getProfile()
    });
  },

  handleRetry() {
    wx.redirectTo({
      url: `/pages/level-intro/index?levelId=${this.data.level.levelId}`
    });
  },

  handleNext() {
    if (this.data.nextLevel) {
      wx.redirectTo({
        url: `/pages/level-intro/index?levelId=${this.data.nextLevel.levelId}`
      });
      return;
    }

    wx.reLaunch({
      url: this.data.level && this.data.level.isCustom ? '/pages/custom/index' : '/pages/chapter/index'
    });
  },

  handleCopyChallenge() {
    try {
      const code = customLevels.buildChallengeCode(this.data.level.levelId);
      wx.setClipboardData({
        data: code,
        success: () => {
          wx.showModal({
            title: '挑战码已复制',
            content: '把挑战码发给朋友，对方在“自定义中心”粘贴导入后就能玩同一张图。',
            showCancel: false
          });
        }
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '复制失败',
        icon: 'none'
      });
    }
  },

  handleHome() {
    wx.reLaunch({
      url: '/pages/home/index'
    });
  }
});
