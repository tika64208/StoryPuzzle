const levelRepo = require('../../services/level-repo');
const storage = require('../../utils/storage');

const CHAPTER_PRESENTATION = {
  ch04: {
    title: '倩女幽魂',
    summary: '从雨夜古道到幽魂别离，把整章剧情线一点点拼回完整。',
    badge: '剧情主章'
  },
  ch01: {
    title: '深夜旧宅',
    summary: '旧宅里每一处脚印、镜面和台阶，都会慢慢指向同一条线索。',
    badge: '悬疑入门'
  },
  ch02: {
    title: '废弃剧场',
    summary: '幕布、灯控和后台衣箱，把舞台背后的真相重新亮出来。',
    badge: '舞台异闻'
  },
  ch03: {
    title: '雨夜码头',
    summary: '风雨、集装箱和警戒灯塔，让交易现场的轨迹逐渐浮出水面。',
    badge: '港口迷局'
  },
  'custom-local': {
    title: '我的拼图',
    summary: '把相册里的照片切成关卡，保存下来随时继续玩。',
    badge: '自定义'
  },
  'custom-shared': {
    title: '朋友分享',
    summary: '把朋友发来的挑战码导入进来，玩同一张图。',
    badge: '分享关卡'
  }
};

const LEVEL_PRESENTATION = {
  'ch04-lv01': '雨夜古道',
  'ch04-lv02': '横梁倒悬',
  'ch04-lv03': '枯井红衣',
  'ch04-lv04': '利爪试探',
  'ch04-lv05': '金锁书符',
  'ch04-lv06': '树根地劫',
  'ch04-lv07': '幽魂别离',
  'ch01-lv01': '门后的脚印',
  'ch01-lv02': '镜面反光',
  'ch01-lv03': '台阶划痕',
  'ch01-lv04': '窗边残页',
  'ch02-lv01': '红幕背影',
  'ch02-lv02': '旧票根',
  'ch02-lv03': '灯控台编号',
  'ch02-lv04': '后台衣箱',
  'ch03-lv01': '潮湿绳结',
  'ch03-lv02': '集装箱编号',
  'ch03-lv03': '甲板水痕',
  'ch03-lv04': '警戒灯塔'
};

function resolvePreviewImage(level) {
  if (!level) {
    return '';
  }

  if (level.sceneAssetPath) {
    return level.sceneAssetPath;
  }

  if (level.customMeta && level.customMeta.imagePath) {
    return level.customMeta.imagePath;
  }

  const rawStyle = String(level.sceneStyle || '');
  const match = rawStyle.match(/url\(["']?(.*?)["']?\)/i);
  return match ? match[1] : '';
}

function getDisplayChapterTitle(chapterId, fallbackTitle) {
  return (CHAPTER_PRESENTATION[chapterId] && CHAPTER_PRESENTATION[chapterId].title) || fallbackTitle;
}

function getDisplayChapterSummary(chapterId, fallbackSummary) {
  return (CHAPTER_PRESENTATION[chapterId] && CHAPTER_PRESENTATION[chapterId].summary) || fallbackSummary;
}

function getDisplayChapterBadge(chapterId) {
  return (CHAPTER_PRESENTATION[chapterId] && CHAPTER_PRESENTATION[chapterId].badge) || '主题章节';
}

function getDisplayLevelTitle(level) {
  if (!level) {
    return '';
  }
  return LEVEL_PRESENTATION[level.levelId] || level.title || level.sceneName || '当前关卡';
}

function decorateContinueLevel(level) {
  if (!level) {
    return null;
  }

  return Object.assign({}, level, {
    displayTitle: getDisplayLevelTitle(level),
    displayChapterTitle: getDisplayChapterTitle(level.chapterId, level.chapterTitle),
    previewImage: resolvePreviewImage(level)
  });
}

function decorateChapter(chapter) {
  const coverLevel = chapter.levels[0] || null;
  const nextLevel =
    chapter.levels.find((level) => level.unlocked && !level.completed) ||
    chapter.levels.find((level) => level.unlocked) ||
    coverLevel;
  const progressPercent = chapter.totalLevels
    ? Math.round((chapter.completedCount / chapter.totalLevels) * 100)
    : 0;

  return Object.assign({}, chapter, {
    displayTitle: getDisplayChapterTitle(chapter.chapterId, chapter.title),
    displaySummary: getDisplayChapterSummary(chapter.chapterId, chapter.summary),
    displayBadge: getDisplayChapterBadge(chapter.chapterId),
    progressPercent,
    progressText:
      chapter.completedCount === chapter.totalLevels
        ? '已经完整通关'
        : chapter.completedCount === 0
          ? '还没开始调查'
          : `还差 ${chapter.totalLevels - chapter.completedCount} 关解开整章`,
    focusLevelText: nextLevel ? getDisplayLevelTitle(nextLevel) : '等待解锁',
    coverImage: resolvePreviewImage(coverLevel),
    coverStyle: coverLevel ? coverLevel.sceneStyle : '',
    accentColor: (coverLevel && coverLevel.themeColor) || '#7ee0db'
  });
}

Page({
  data: {
    profile: null,
    progress: null,
    continueLevel: null,
    chapterCards: [],
    customSummary: {
      count: 0,
      latest: null
    },
    dashboardStats: {
      completedLevels: 0,
      totalLevels: 0,
      customLevels: 0
    },
    featuredChapter: null,
    energyText: ''
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
    const progress = storage.getProgress();
    const chapters = levelRepo.getChaptersWithProgress(progress).map(decorateChapter);
    const customLevels = levelRepo.getCustomLevelsWithProgress(progress);
    const continueLevel = decorateContinueLevel(
      levelRepo.getLevelById(levelRepo.getContinueLevelId(progress))
    );
    const completedLevels = chapters.reduce((sum, chapter) => sum + chapter.completedCount, 0);
    const totalLevels = chapters.reduce((sum, chapter) => sum + chapter.totalLevels, 0);

    this.setData({
      profile,
      progress,
      continueLevel,
      chapterCards: chapters,
      featuredChapter: chapters[0] || null,
      customSummary: {
        count: customLevels.length,
        latest: customLevels[0]
          ? Object.assign({}, customLevels[0], {
              previewImage: resolvePreviewImage(customLevels[0])
            })
          : null
      },
      dashboardStats: {
        completedLevels,
        totalLevels,
        customLevels: customLevels.length
      },
      energyText: storage.getEnergyCountdownText(profile)
    });
  },

  handleContinue() {
    const level = this.data.continueLevel;
    if (!level) {
      wx.showToast({
        title: '还没有可继续的关卡',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/level-intro/index?levelId=${level.levelId}`
    });
  },

  handleBrowse() {
    wx.navigateTo({
      url: '/pages/chapter/index'
    });
  },

  handleCustom() {
    wx.navigateTo({
      url: '/pages/custom/index'
    });
  },

  handleCenter() {
    wx.navigateTo({
      url: '/pages/center/index'
    });
  },

  handleLatestCustom() {
    const latest = this.data.customSummary.latest;
    if (!latest) {
      this.handleCustom();
      return;
    }

    wx.navigateTo({
      url: `/pages/level-intro/index?levelId=${latest.levelId}`
    });
  }
});
