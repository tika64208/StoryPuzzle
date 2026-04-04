const legal = require('../../config/legal');
const release = require('../../services/release');
const logger = require('../../services/logger');

function buildTabs() {
  return [
    { key: 'privacy', label: '隐私政策' },
    { key: 'agreement', label: '用户协议' },
    { key: 'release', label: '发布检查' }
  ];
}

Page({
  data: {
    tabs: buildTabs(),
    activeType: 'privacy',
    title: '隐私政策',
    appName: legal.appName,
    companyName: legal.companyName,
    effectiveDate: legal.effectiveDate,
    contactEmail: legal.contactEmail,
    supportWechat: legal.supportWechat,
    sections: [],
    releaseSummary: null,
    releaseReadyItems: [],
    releasePendingItems: [],
    releaseTips: []
  },

  onLoad(options) {
    this.switchType(options.type || 'privacy');
  },

  handleTabChange(event) {
    const type = event.currentTarget.dataset.type || 'privacy';
    this.switchType(type);
  },

  switchType(type) {
    const safeType = ['privacy', 'agreement', 'release'].indexOf(type) > -1 ? type : 'privacy';
    const titleMap = {
      privacy: '隐私政策',
      agreement: '用户协议',
      release: '发布检查'
    };

    const nextData = {
      activeType: safeType,
      title: titleMap[safeType],
      sections: [],
      releaseSummary: null,
      releaseReadyItems: [],
      releasePendingItems: [],
      releaseTips: []
    };

    if (safeType === 'privacy') {
      nextData.sections = legal.privacyPolicy;
    } else if (safeType === 'agreement') {
      nextData.sections = legal.userAgreement;
    } else {
      const checklist = release.getReleaseChecklist();
      nextData.releaseSummary = checklist.summary;
      nextData.releaseReadyItems = checklist.readyItems;
      nextData.releasePendingItems = checklist.pendingItems;
      nextData.releaseTips = checklist.tips;
    }

    wx.setNavigationBarTitle({
      title: titleMap[safeType]
    });

    this.setData(nextData);
    logger.trackEvent('legal_page_view', {
      type: safeType
    });
  },

  handleCopyContact() {
    const contact = `主体：${legal.companyName}\n邮箱：${legal.contactEmail}\n客服：${legal.supportWechat}`;
    wx.setClipboardData({
      data: contact
    });
  }
});
