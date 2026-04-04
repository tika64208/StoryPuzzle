const customLevels = require('../../services/custom-levels');
const levelRepo = require('../../services/level-repo');
const logger = require('../../services/logger');
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
    logger.trackEvent('result_view', {
      levelId: this.data.level && this.data.level.levelId,
      success: this.data.success
    });
    this.setData({
      profile: storage.getProfile()
    });
  },

  handleRetry() {
    logger.trackEvent('result_retry', {
      levelId: this.data.level.levelId
    });
    wx.redirectTo({
      url: `/pages/level-intro/index?levelId=${this.data.level.levelId}`
    });
  },

  handleNext() {
    if (this.data.nextLevel) {
      logger.trackEvent('result_next', {
        fromLevelId: this.data.level.levelId,
        nextLevelId: this.data.nextLevel.levelId
      });
      wx.redirectTo({
        url: `/pages/level-intro/index?levelId=${this.data.nextLevel.levelId}`
      });
      return;
    }

    logger.trackEvent('result_back_to_list', {
      levelId: this.data.level.levelId,
      custom: !!(this.data.level && this.data.level.isCustom)
    });
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
          logger.trackEvent('result_copy_challenge_code', {
            levelId: this.data.level.levelId
          });
          wx.showModal({
            title: '谜境挑战码已复制',
            content: '把挑战码发给朋友，对方在“自定义中心”粘贴导入后，就能玩同一张图。',
            showCancel: false
          });
        }
      });
    } catch (error) {
      logger.captureError('result_copy_challenge_code', error, {
        levelId: this.data.level && this.data.level.levelId
      });
      wx.showToast({
        title: error.message || '复制失败',
        icon: 'none'
      });
    }
  },

  handleHome() {
    logger.trackEvent('result_back_home', {
      levelId: this.data.level && this.data.level.levelId
    });
    wx.reLaunch({
      url: '/pages/home/index'
    });
  }
});
