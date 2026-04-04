const levelRepo = require('../../services/level-repo');
const storage = require('../../utils/storage');

Page({
  data: {
    level: null,
    profile: null
  },

  onLoad(options) {
    const level = levelRepo.getLevelById(options.levelId || '');
    if (!level) {
      wx.showToast({
        title: '关卡不存在',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }

    this.setData({
      level
    });
  },

  onShow() {
    this.setData({
      profile: storage.getProfile()
    });
  },

  handleStart() {
    const level = this.data.level;
    if (!level) {
      return;
    }

    if (level.energyCost > 0) {
      const result = storage.consumeEnergy(level.energyCost);
      if (!result.ok) {
        wx.showModal({
          title: '体力不足',
          content: '当前体力不够进入这一关，先去个人中心签到或看广告补充体力。',
          confirmText: '去补体力',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/center/index'
              });
            }
          }
        });
        return;
      }
    }

    storage.setCurrentLevel(level.levelId);
    wx.redirectTo({
      url: `/pages/game/index?levelId=${level.levelId}`
    });
  }
});
