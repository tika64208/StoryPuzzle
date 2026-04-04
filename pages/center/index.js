const runtime = require('../../config/runtime');
const storage = require('../../utils/storage');
const adService = require('../../services/ad');

Page({
  data: {
    profile: null,
    energyText: '',
    hasRealAdUnit: false
  },

  onShow() {
    this.refresh();
    this.startEnergyTicker();
  },

  onHide() {
    this.stopEnergyTicker();
  },

  onUnload() {
    this.stopEnergyTicker();
  },

  startEnergyTicker() {
    this.stopEnergyTicker();
    this.energyTimer = setInterval(() => {
      const profile = storage.getProfile();
      this.setData({
        profile,
        energyText: storage.getEnergyCountdownText(profile)
      });
    }, 1000);
  },

  stopEnergyTicker() {
    if (this.energyTimer) {
      clearInterval(this.energyTimer);
      this.energyTimer = null;
    }
  },

  refresh() {
    const profile = storage.getProfile();
    this.setData({
      profile,
      energyText: storage.getEnergyCountdownText(profile),
      hasRealAdUnit:
        !!runtime.rewardedVideoAdUnitId &&
        runtime.rewardedVideoAdUnitId.indexOf('replace-with-your') !== 0
    });
  },

  handleSignIn() {
    const result = storage.claimDailySignIn();
    if (!result.ok) {
      wx.showToast({
        title: '今天已经签到过了',
        icon: 'none'
      });
      return;
    }

    this.refresh();
    wx.showToast({
      title: '+3 体力 +1 定格符',
      icon: 'none'
    });
  },

  handleWatchAd() {
    adService.showRewardedAction('2 点体力').then((granted) => {
      if (!granted) {
        return;
      }
      storage.addEnergy(2);
      this.refresh();
      wx.showToast({
        title: '体力 +2',
        icon: 'none'
      });
    });
  },

  handleWatchUnlockAd() {
    adService.showRewardedAction('1 个定格符').then((granted) => {
      if (!granted) {
        return;
      }
      storage.addUnlockDragTools(1);
      this.refresh();
      wx.showToast({
        title: '定格符 +1',
        icon: 'none'
      });
    });
  },

  handleToggleSound(event) {
    storage.saveSoundEnabled(event.detail.value);
    this.refresh();
  },

  handleCustom() {
    wx.navigateTo({
      url: '/pages/custom/index'
    });
  }
});
