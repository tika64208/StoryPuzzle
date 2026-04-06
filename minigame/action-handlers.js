const legal = require('../config/legal');
const audioService = require('../services/audio');
const adService = require('../services/ad');
const logger = require('../services/logger');
const release = require('../services/release');
const gameEngine = require('../utils/game');
const storage = require('../utils/storage');

function buildReleaseSummaryText() {
  const checklist = release.getReleaseChecklist();
  return [
    checklist.summary.canRelease
      ? `发布检查 可提审 ${checklist.summary.ready}/${checklist.summary.total}`
      : `发布检查 阻塞 ${checklist.summary.blocking} 项`,
    '',
    '阻塞项',
    ...(checklist.blockingItems.length
      ? checklist.blockingItems.map((item) => `- ${item.label}: ${item.detail}`)
      : ['- 当前没有阻塞项']),
    '',
    '待补齐',
    ...(checklist.pendingItems.length
      ? checklist.pendingItems.map((item) => `- ${item.label}: ${item.detail}`)
      : ['- 当前没有待补齐项']),
    '',
    '提醒',
    ...checklist.tips.map((item) => `- ${item}`)
  ].join('\n');
}

function buildLegalContactText() {
  return [
    `品牌：${legal.appName}`,
    `主体：${legal.companyName}`,
    `邮箱：${legal.contactEmail}`,
    `客服：${legal.supportWechat}`,
    `生效日期：${legal.effectiveDate}`
  ].join('\n');
}

function handleSupplyTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  const button = app.supplyButtons.find((item) => hitButton(item, x, y));
  if (!button) {
    return;
  }

  if (button.key === 'signin') {
    const result = storage.claimDailySignIn();
    app.refreshProfile();
    app.buildSupplyLayout();
    if (!result.ok) {
      app.showToast('今天已经签到过了');
    } else {
      logger.trackEvent('minigame_supply_sign_in');
      app.playFeedbackCue('guide', { hapticType: '' });
      app.showToast('体力 +3 · 定格符 +1 · 引路符 +1');
    }
    return;
  }

  if (button.key === 'sound') {
    const profile = storage.saveSoundEnabled(!app.profile.soundEnabled);
    app.profile = profile;
    app.buildSupplyLayout();
    logger.trackEvent('minigame_supply_toggle_sound', {
      enabled: !!profile.soundEnabled
    });
    if (profile.soundEnabled) {
      app.syncScreenAudio();
      app.playFeedbackCue('guide', { hapticType: '' });
      app.showToast('音效与氛围音已开启');
    } else {
      audioService.stopAll();
      app.showToast('音效与氛围音已关闭');
    }
    return;
  }

  if (button.key === 'energy-ad') {
    adService.showRewardedAction('2 点体力').then((granted) => {
      if (!granted) {
        app.showToast('没有获得体力奖励');
        return;
      }
      storage.addEnergy(2);
      app.refreshProfile();
      app.buildSupplyLayout();
      logger.trackEvent('minigame_supply_energy_reward');
      app.playFeedbackCue('guide', { hapticType: '' });
      app.showToast('体力 +2');
    });
    return;
  }

  if (button.key === 'unlock-ad') {
    adService.showRewardedAction('1 个定格符').then((granted) => {
      if (!granted) {
        app.showToast('没有获得定格符');
        return;
      }
      storage.addUnlockDragTools(1);
      app.refreshProfile();
      app.buildSupplyLayout();
      logger.trackEvent('minigame_supply_unlock_reward');
      app.playFeedbackCue('lock', { hapticType: '' });
      app.showToast('定格符 +1');
    });
    return;
  }

  if (button.key === 'guide-ad') {
    adService.showRewardedAction('1 个引路符').then((granted) => {
      if (!granted) {
        app.showToast('没有获得引路符');
        return;
      }
      storage.addGuideHintTools(1);
      app.refreshProfile();
      app.buildSupplyLayout();
      logger.trackEvent('minigame_supply_guide_reward');
      app.playFeedbackCue('guide', { hapticType: '' });
      app.showToast('引路符 +1');
    });
    return;
  }

  if (button.key === 'custom') {
    app.switchToCustom();
    return;
  }

  if (button.key === 'privacy') {
    app.switchToLegal('privacy');
    return;
  }

  if (button.key === 'agreement') {
    app.switchToLegal('agreement');
    return;
  }

  if (button.key === 'release') {
    app.switchToLegal('release');
    return;
  }

  if (button.key === 'copy-logs') {
    wx.setClipboardData({
      data: logger.buildExportText(80),
      success: () => {
        logger.trackEvent('minigame_supply_copy_logs');
        app.showToast('运行日志已复制');
      }
    });
    return;
  }

  if (button.key === 'clear-logs') {
    wx.showModal({
      title: '清空运行日志',
      content: '清空后会移除本地事件和错误记录，适合重新开始排查。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        logger.clearLogs();
        logger.trackEvent('minigame_supply_clear_logs');
        app.showToast('运行日志已清空');
      }
    });
    return;
  }

  if (button.key === 'back-home') {
    app.switchToHome();
  }
}

function handleSettingsTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  const button = app.settingsButtons.find((item) => hitButton(item, x, y));
  if (!button) {
    return;
  }

  if (button.key === 'sound') {
    const profile = storage.saveSoundEnabled(!app.profile.soundEnabled);
    app.profile = profile;
    app.buildSettingsLayout();
    logger.trackEvent('minigame_settings_toggle_sound', {
      enabled: !!profile.soundEnabled
    });
    if (profile.soundEnabled) {
      app.syncScreenAudio();
      app.showToast('音效与氛围音已开启');
    } else {
      audioService.stopAll();
      app.showToast('音效与氛围音已关闭');
    }
    return;
  }

  if (button.key === 'vibration') {
    const nextEnabled = app.profile.vibrationEnabled === false;
    const profile = storage.saveVibrationEnabled(nextEnabled);
    app.profile = profile;
    app.buildSettingsLayout();
    logger.trackEvent('minigame_settings_toggle_vibration', {
      enabled: !!profile.vibrationEnabled
    });
    app.showToast(profile.vibrationEnabled === false ? '震动反馈已关闭' : '震动反馈已开启');
    return;
  }

  if (button.key === 'supply') {
    app.switchToSupply();
    return;
  }

  if (button.key === 'back-home') {
    app.switchToHome();
  }
}

function handleLeaderboardTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  const button = app.leaderboardButtons.find((item) => hitButton(item, x, y));
  if (!button) {
    return;
  }

  if (button.key === 'refresh') {
    logger.trackEvent('minigame_refresh_leaderboard');
    app.loadFriendLeaderboard();
    return;
  }

  if (button.key === 'back-home') {
    app.switchToHome();
  }
}

function handleLegalTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  const tabButton = app.legalTabButtons.find((item) => hitButton(item, x, y));
  if (tabButton) {
    if (tabButton.key !== app.legalState.type) {
      logger.trackEvent('minigame_legal_switch_tab', {
        type: tabButton.key
      });
    }
    app.buildLegalLayout(tabButton.key, 0);
    return;
  }

  const actionButton = app.legalButtons.find((item) => hitButton(item, x, y));
  if (!actionButton) {
    return;
  }

  if (actionButton.key === 'prev') {
    if (app.legalState.pageIndex > 0) {
      app.buildLegalLayout(app.legalState.type, app.legalState.pageIndex - 1);
    } else {
      app.showToast('已经是第一页');
    }
    return;
  }

  if (actionButton.key === 'next') {
    if (app.legalState.pageIndex < app.legalState.pages.length - 1) {
      app.buildLegalLayout(app.legalState.type, app.legalState.pageIndex + 1);
    } else {
      app.showToast('已经是最后一页');
    }
    return;
  }

  if (actionButton.key === 'copy') {
    wx.setClipboardData({
      data: app.legalState.type === 'release' ? buildReleaseSummaryText() : buildLegalContactText(),
      success: () => app.showToast(app.legalState.type === 'release' ? '发布摘要已复制' : '联系信息已复制')
    });
    return;
  }

  if (actionButton.key === 'back') {
    app.switchToSupply();
  }
}

async function handleMoreTools(app, helpers) {
  const { actionSheetPromise } = helpers;
  try {
    const result = await actionSheetPromise(['转发给朋友', '发布检查', '复制运行日志']);
    if (result.tapIndex === 0) {
      app.triggerShare('home');
      return;
    }

    if (result.tapIndex === 1) {
      logger.trackEvent('minigame_open_release_check');
      const checklist = release.getReleaseChecklist();
      const pendingText = checklist.blockingItems
        .slice(0, 4)
        .map((item) => `- ${item.label}`)
        .join('\n');
      wx.showModal({
        title: checklist.summary.canRelease
          ? `发布检查 可提审 ${checklist.summary.ready}/${checklist.summary.total}`
          : `发布检查 阻塞 ${checklist.summary.blocking} 项`,
        content: pendingText || '当前没有阻塞项，发布配置看起来已经齐了。',
        showCancel: false
      });
      return;
    }

    logger.trackEvent('minigame_copy_logs');
    wx.setClipboardData({
      data: logger.buildExportText(80),
      success: () => {
        app.showToast('运行日志已复制');
      }
    });
  } catch (error) {
    if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
      return;
    }
    logger.captureError('minigame_more_tools', error);
  }
}

function useHint(app) {
  const applyHint = () => {
    const fixedPieceId = gameEngine.autoPlaceOne(app.currentLevel, app.gameState);
    if (!fixedPieceId) {
      app.showToast('已经非常接近揭晓了');
      return;
    }

    app.guideHint = null;
    logger.trackEvent('minigame_use_hint', {
      levelId: app.currentLevel.levelId,
      pieceId: fixedPieceId
    });

    if (gameEngine.isComplete(app.gameState)) {
      app.playSuccessCelebration();
      app.openSuccessOverlay();
    } else {
      app.playFeedbackCue('improve', { hapticType: '' });
      app.showToast('系统帮你归位了一块碎片');
    }
  };

  if (app.gameState.hintsLeft > 0) {
    app.gameState.hintsLeft -= 1;
    applyHint();
    return;
  }

  adService.showRewardedAction('额外提示').then((granted) => {
    if (!granted) {
      app.showToast('没有获得额外提示');
      return;
    }
    applyHint();
  });
}

function useLockTool(app) {
  const lockableIds = gameEngine.getLockableCorrectPieceIds(app.gameState);
  if (lockableIds.length === 0) {
    app.showToast('当前没有可定格的正确碎片');
    return;
  }

  const consumeResult = storage.consumeUnlockDragTool(1);
  if (!consumeResult.ok) {
    app.refreshProfile();
    app.showToast('定格符不足');
    return;
  }

  const lockedIds = gameEngine.lockCorrectPieces(app.currentLevel, app.gameState);
  app.refreshProfile();
  app.playFeedbackCue('lock');
  logger.trackEvent('minigame_use_lock_tool', {
    levelId: app.currentLevel.levelId,
    lockedCount: lockedIds.length
  });
  app.showToast(`已定格 ${lockedIds.length} 块碎片`);
}

function useGuideTool(app) {
  const hint = gameEngine.getGuideHint(app.currentLevel, app.gameState);
  if (!hint) {
    app.showToast('当前没有合适的引路提示');
    return;
  }

  const consumeResult = storage.consumeGuideHintTool(1);
  if (!consumeResult.ok) {
    app.refreshProfile();
    app.showToast('引路符不足');
    return;
  }

  app.guideHint = hint;
  app.refreshProfile();
  logger.trackEvent('minigame_use_guide_tool', {
    levelId: app.currentLevel.levelId,
    pieceId: hint.pieceId,
    targetSlot: hint.targetSlot
  });
  app.playFeedbackCue('guide');
  app.showToast('已标出下一块可接边碎片');
}

module.exports = {
  handleSupplyTap,
  handleSettingsTap,
  handleLeaderboardTap,
  handleLegalTap,
  handleMoreTools,
  useHint,
  useLockTool,
  useGuideTool
};
