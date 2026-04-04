const levelRepo = require('../../services/level-repo');
const storage = require('../../utils/storage');

Page({
  data: {
    chapters: [],
    customCount: 0
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const progress = storage.getProgress();
    this.setData({
      chapters: levelRepo.getChaptersWithProgress(progress),
      customCount: levelRepo.getCustomLevelsWithProgress(progress).length
    });
  },

  handleLevelTap(event) {
    const levelId = event.currentTarget.dataset.levelId;
    const rawUnlocked = event.currentTarget.dataset.unlocked;
    const unlocked = rawUnlocked === true || rawUnlocked === 'true';
    if (!unlocked) {
      wx.showToast({
        title: '先解开前一关谜境',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/level-intro/index?levelId=${levelId}`
    });
  },

  handleCustom() {
    wx.navigateTo({
      url: '/pages/custom/index'
    });
  }
});
