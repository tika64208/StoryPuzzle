const legal = require('../config/legal');
const logger = require('../services/logger');
const storage = require('../utils/storage');

function drawSupplyPanel(app, helpers) {
  const { drawGlassCard, drawText, getTodayKey } = helpers;
  const ctx = app.ctx;
  const energyText = storage.getEnergyCountdownText(app.profile);
  const logStats = logger.getLogStats();
  const todaySigned = app.profile.lastSignInDate === getTodayKey();
  const firstActionY = app.supplyButtons.length ? app.supplyButtons[0].y : 314;
  const toolsAction = app.supplyButtons.find((button) => button.key === 'privacy');
  const toolsY = toolsAction ? toolsAction.y : firstActionY + 156;
  const infoY = app.viewHeight - 38;

  drawText(ctx, '谜境补给站', app.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
  drawText(ctx, '集中补体力、道具、设置与提审需要的工具入口', app.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

  drawGlassCard(ctx, 18, 106, app.viewWidth - 36, 168, 28);
  drawText(ctx, '当前补给', 34, 126, 18, '#eafcff', 'left', 'bold');
  drawText(ctx, `${app.profile.coins} 金币`, app.viewWidth - 34, 128, 14, '#aef7ff', 'right');

  const stats = [
    { label: '体力', value: `${app.profile.energy} / ${app.profile.maxEnergy}` },
    { label: '定格符', value: `${app.profile.unlockDragTools}` },
    { label: '引路符', value: `${app.profile.guideHintTools}` },
    { label: '音效', value: app.profile.soundEnabled ? '开启' : '关闭' }
  ];

  stats.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cellX = 34 + col * ((app.viewWidth - 92) / 2);
    const cellY = 152 + row * 40;
    drawText(ctx, item.label, cellX, cellY, 12, 'rgba(230,251,255,0.56)');
    drawText(ctx, item.value, cellX, cellY + 18, 20, '#f3ffff', 'left', 'bold');
  });

  drawGlassCard(ctx, 22, 238, app.viewWidth - 44, 34, 16);
  drawText(ctx, '恢复倒计时', 34, 248, 12, 'rgba(230,251,255,0.56)');
  drawText(ctx, energyText, 116, 248, 12, '#b8fff7');
  drawText(ctx, todaySigned ? '今日签到已领取' : '今日签到可领取', app.viewWidth - 34, 248, 12, todaySigned ? '#b9ffd9' : '#ffd79a', 'right');

  drawText(ctx, '即时补给', 24, firstActionY - 20, 12, '#ffdca4', 'left', 'bold');
  drawText(ctx, '签到与广告补给会直接增加资源', app.viewWidth - 24, firstActionY - 20, 11, 'rgba(255,220,164,0.72)', 'right');

  drawText(ctx, '更多工具', 24, toolsY - 20, 12, '#aef7ff', 'left', 'bold');
  drawText(ctx, '协议、发布检查与运行日志工具', app.viewWidth - 24, toolsY - 20, 11, 'rgba(174,247,255,0.72)', 'right');

  app.supplyButtons.forEach((button) => {
    const primary = ['signin', 'energy-ad', 'unlock-ad', 'guide-ad'].includes(button.key);
    app.drawButton(button, primary, true);
  });

  drawText(ctx, `日志 ${logStats.total} 条 · 错误 ${logStats.errors} 条`, 24, infoY - 18, 12, 'rgba(230,251,255,0.56)');
  drawText(ctx, `主体：${legal.companyName}`, 24, infoY, 12, 'rgba(230,251,255,0.52)');
  drawText(ctx, `联系：${legal.contactEmail}`, app.viewWidth - 24, infoY, 12, 'rgba(230,251,255,0.52)', 'right');
}

function drawSettingsPanel(app, helpers) {
  const { drawGlassCard, drawText, fillRoundRect } = helpers;
  const ctx = app.ctx;
  const enabledCount = (app.profile.soundEnabled ? 1 : 0) + (app.profile.vibrationEnabled === false ? 0 : 1);
  const firstActionY = app.settingsButtons.length ? app.settingsButtons[0].y : 404;

  drawText(ctx, '设置系统', app.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
  drawText(ctx, '管理音效、震动等基础体验开关', app.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

  drawGlassCard(ctx, 18, 106, app.viewWidth - 36, 104, 28);
  drawText(ctx, '基础设置总览', 34, 126, 18, '#eafcff', 'left', 'bold');
  drawText(ctx, `当前已开启 ${enabledCount} / 2 项`, app.viewWidth - 34, 128, 14, '#aef7ff', 'right');
  drawText(ctx, '声音与震动会立即生效，适合直接用于设置系统截图。', 34, 154, 13, '#b8fff7');

  const statusCards = [
    {
      label: '音效状态',
      value: app.profile.soundEnabled ? '已开启' : '已关闭',
      x: 18,
      y: 226,
      w: app.viewWidth - 36,
      h: 62,
      accent: app.profile.soundEnabled ? '#98f4ff' : '#8ea7b5'
    },
    {
      label: '震动状态',
      value: app.profile.vibrationEnabled === false ? '已关闭' : '已开启',
      x: 18,
      y: 298,
      w: app.viewWidth - 36,
      h: 62,
      accent: app.profile.vibrationEnabled === false ? '#8ea7b5' : '#ffd99a'
    }
  ];

  statusCards.forEach((item) => {
    drawGlassCard(ctx, item.x, item.y, item.w, item.h, 22);
    fillRoundRect(ctx, item.x + 14, item.y + 14, 10, 10, 5, item.accent);
    drawText(ctx, item.label, item.x + 34, item.y + 14, 12, 'rgba(230,251,255,0.56)');
    drawText(ctx, item.value, item.x + 34, item.y + 32, 20, '#f3ffff', 'left', 'bold');
    drawText(
      ctx,
      item.label === '音效状态' ? '点击下方按钮切换声音反馈' : '点击下方按钮切换震动反馈',
      item.x + item.w - 16,
      item.y + 22,
      11,
      'rgba(230,251,255,0.56)',
      'right'
    );
  });

  drawText(ctx, '快捷操作', 24, firstActionY - 20, 12, '#aef7ff', 'left', 'bold');
  drawText(ctx, `${app.profile.energy} / ${app.profile.maxEnergy} 体力 · 设置立即生效`, app.viewWidth - 24, firstActionY - 20, 11, 'rgba(174,247,255,0.72)', 'right');

  app.settingsButtons.forEach((button) => {
    const primary = button.key === 'sound' || button.key === 'vibration';
    app.drawButton(button, primary, true);
  });
}

function drawLegalPanel(app, helpers) {
  const { drawGlassCard, drawText, wrapText } = helpers;
  const ctx = app.ctx;
  const state = app.legalState;
  const page = state.pages[state.pageIndex] || { heading: '', lines: [] };
  const cardX = 18;
  const cardY = 164;
  const cardW = app.viewWidth - 36;
  const cardH = app.viewHeight - 290;

  drawText(ctx, state.title, app.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
  drawText(ctx, `${legal.appName} 的法务与发布信息`, app.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

  app.legalTabButtons.forEach((button) => {
    const active = button.key === state.type;
    app.drawButton(button, active, true);
  });

  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 28);
  drawText(ctx, page.heading || state.title, cardX + 18, cardY + 18, 20, '#f3ffff', 'left', 'bold');
  drawText(ctx, `${state.pageIndex + 1} / ${Math.max(1, state.pages.length)}`, cardX + cardW - 18, cardY + 20, 12, 'rgba(230,251,255,0.62)', 'right');

  let cursorY = cardY + 58;
  page.lines.forEach((line, index) => {
    const lines = wrapText(ctx, line, cardW - 36, 14);
    lines.forEach((wrapped) => {
      drawText(ctx, wrapped, cardX + 18, cursorY, 14, 'rgba(230,251,255,0.76)');
      cursorY += 20;
    });
    if (index !== page.lines.length - 1) {
      cursorY += 12;
    }
  });

  if (state.type !== 'release') {
    drawText(ctx, `主体：${legal.companyName}`, cardX + 18, cardY + cardH - 48, 12, 'rgba(230,251,255,0.52)');
    drawText(ctx, `联系：${legal.contactEmail}`, cardX + 18, cardY + cardH - 28, 12, 'rgba(230,251,255,0.52)');
  }

  app.legalButtons.forEach((button) => {
    let primary = false;
    if (button.key === 'next' && state.pageIndex < state.pages.length - 1) {
      primary = true;
    }
    if (button.key === 'copy') {
      primary = state.type === 'release';
    }
    app.drawButton(button, primary, true);
  });
}

function drawLeaderboardPanel(app, helpers) {
  const { drawGlassCard, drawImageCover, drawText, fillRoundRect } = helpers;
  const ctx = app.ctx;
  const totalScore = Math.max(0, Number(app.profile.challengeScore) || 0);
  const topEntry = app.leaderboardEntries[0] || null;
  const topEntries = app.leaderboardEntries.slice(0, 3);
  const listEntries = app.leaderboardEntries.slice(3, 8);
  const identity = app.playerIdentity || { nickname: '我', avatarUrl: '', source: 'fallback' };
  const stateText = app.leaderboardState.loading
    ? '正在同步好友排行榜...'
    : app.leaderboardState.error || '按挑战分高低展示微信好友排行';
  const hintText = app.leaderboardState.hint || '当前环境未返回你的微信头像昵称，可在微信内再试一次';
  const hasRealIdentity = identity.source === 'wx' || !!String(identity.avatarUrl || '').trim();

  const drawLeaderboardAvatar = (entry, x, y, size, fallbackColor) => {
    const avatarImage = app.getResolvedImage(entry.avatarUrl);
    fillRoundRect(ctx, x, y, size, size, size / 2, 'rgba(8, 29, 44, 0.78)', 'rgba(145, 235, 255, 0.14)');
    if (avatarImage) {
      drawImageCover(ctx, avatarImage, x, y, size, size, size / 2);
      return;
    }
    const initial = String(entry.nickname || '友').trim().slice(0, 1) || '友';
    drawText(ctx, initial, x + size / 2, y + size * 0.25, Math.max(14, Math.floor(size * 0.42)), fallbackColor || '#eafcff', 'center', 'bold');
  };

  const drawStatChip = (x, y, w, label, value, accent) => {
    fillRoundRect(ctx, x, y, w, 42, 18, 'rgba(9, 28, 42, 0.72)', 'rgba(145, 235, 255, 0.14)');
    drawText(ctx, label, x + 14, y + 8, 11, 'rgba(230,251,255,0.54)');
    drawText(ctx, value, x + 14, y + 22, 16, accent || '#f3ffff', 'left', 'bold');
  };

  drawText(ctx, '好友排行', app.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
  drawText(ctx, '挑战 3 星得 3 分，4 星得 4 分，5 星得 5 分', app.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

  drawGlassCard(ctx, 18, 106, app.viewWidth - 36, 150, 28);
  drawText(ctx, '我的挑战名片', 34, 126, 18, '#eafcff', 'left', 'bold');
  drawText(ctx, hasRealIdentity ? '微信资料已读取' : '当前环境未返回微信头像昵称', app.viewWidth - 34, 128, 12, hasRealIdentity ? '#b9ffd9' : '#ffd79a', 'right');

  drawLeaderboardAvatar({ nickname: identity.nickname || '我', avatarUrl: identity.avatarUrl || '' }, 34, 156, 52, '#aef7ff');
  drawText(ctx, identity.nickname || '我', 100, 160, 18, '#f3ffff', 'left', 'bold');
  drawText(ctx, hasRealIdentity ? '你的当前微信资料' : '当前使用本地上传身份', 100, 184, 12, 'rgba(230,251,255,0.62)');
  drawText(ctx, `${totalScore} 分`, app.viewWidth - 34, 166, 28, '#aef7ff', 'right', 'bold');
  drawText(ctx, hintText, 34, 220, 12, hasRealIdentity ? '#b8fff7' : '#ffd79a');

  const statWidth = Math.floor((app.viewWidth - 60) / 2);
  drawStatChip(22, 268, statWidth, '我的挑战分', `${totalScore}`, '#aef7ff');
  drawStatChip(30 + statWidth, 268, statWidth, '榜首分数', `${topEntry ? topEntry.score : totalScore}`, '#ffe7a1');
  drawStatChip(22, 318, statWidth, '好友人数', `${Math.max(app.leaderboardEntries.length, 1)}`, '#f3ffff');
  drawStatChip(30 + statWidth, 318, statWidth, '记分规则', '3 / 4 / 5', '#b9ffd9');

  drawText(ctx, stateText, 24, 374, 13, app.leaderboardState.error ? '#ffd79a' : '#b8fff7');

  const podiumY = 400;
  if (topEntries.length) {
    drawGlassCard(ctx, 18, podiumY, app.viewWidth - 36, 136, 28);
    drawText(ctx, '前三席位', 34, podiumY + 18, 16, '#eafcff', 'left', 'bold');
    drawText(ctx, '榜单优先显示挑战分最高的三位', app.viewWidth - 34, podiumY + 18, 11, 'rgba(230,251,255,0.58)', 'right');

    const podiumConfigs = [
      topEntries[1]
        ? {
            entry: topEntries[1],
            x: 28,
            y: podiumY + 50,
            w: 92,
            h: 72,
            rank: '#2',
            accentFill: 'rgba(216, 233, 255, 0.14)',
            accentStroke: 'rgba(216, 233, 255, 0.28)',
            accentText: '#e7f1ff',
            avatarSize: 34
          }
        : null,
      topEntries[0]
        ? {
            entry: topEntries[0],
            x: Math.floor(app.viewWidth / 2 - 64),
            y: podiumY + 36,
            w: 128,
            h: 92,
            rank: '#1',
            accentFill: 'rgba(255, 221, 118, 0.18)',
            accentStroke: 'rgba(255, 221, 118, 0.36)',
            accentText: '#ffe7a1',
            avatarSize: 42
          }
        : null,
      topEntries[2]
        ? {
            entry: topEntries[2],
            x: app.viewWidth - 28 - 92,
            y: podiumY + 58,
            w: 92,
            h: 66,
            rank: '#3',
            accentFill: 'rgba(255, 188, 140, 0.16)',
            accentStroke: 'rgba(255, 188, 140, 0.3)',
            accentText: '#ffd0b1',
            avatarSize: 32
          }
        : null
    ].filter(Boolean);

    podiumConfigs.forEach((config) => {
      const isSelf = !!config.entry.isSelf;
      fillRoundRect(
        ctx,
        config.x,
        config.y,
        config.w,
        config.h,
        24,
        isSelf ? 'rgba(22, 64, 82, 0.78)' : config.accentFill,
        isSelf ? 'rgba(145, 235, 255, 0.34)' : config.accentStroke
      );
      fillRoundRect(
        ctx,
        config.x + Math.floor(config.w / 2) - 18,
        config.y - 12,
        36,
        24,
        12,
        isSelf ? 'rgba(84, 217, 239, 0.24)' : config.accentFill,
        isSelf ? 'rgba(145, 235, 255, 0.34)' : config.accentStroke
      );
      drawText(ctx, config.rank, config.x + config.w / 2, config.y - 7, 12, config.accentText, 'center', 'bold');
      drawLeaderboardAvatar(config.entry, config.x + Math.floor((config.w - config.avatarSize) / 2), config.y + 12, config.avatarSize, config.accentText);
      drawText(ctx, String(config.entry.nickname || '微信好友').slice(0, config.w > 100 ? 6 : 4), config.x + config.w / 2, config.y + config.avatarSize + 18, config.w > 100 ? 14 : 12, '#f3ffff', 'center', 'bold');
      drawText(ctx, `${config.entry.score} 分`, config.x + config.w / 2, config.y + config.h - 22, config.w > 100 ? 18 : 16, isSelf ? '#b8fff7' : config.accentText, 'center', 'bold');
    });
  }

  const listY = topEntries.length ? podiumY + 154 : podiumY;
  const rowH = 58;
  const rowGap = 10;

  if (listEntries.length) {
    drawText(ctx, '更多好友', 24, listY - 18, 12, 'rgba(230,251,255,0.58)');
  } else if (app.leaderboardState.loading) {
    drawText(ctx, '正在读取好友排行，请稍候...', app.viewWidth / 2, listY + 20, 14, 'rgba(230,251,255,0.72)', 'center');
  } else {
    drawText(ctx, '当前没有更多可展示的好友排行', app.viewWidth / 2, listY + 20, 13, 'rgba(230,251,255,0.58)', 'center');
  }

  listEntries.forEach((entry, index) => {
    const y = listY + index * (rowH + rowGap);
    const isSelf = !!entry.isSelf;

    fillRoundRect(
      ctx,
      22,
      y,
      app.viewWidth - 44,
      rowH,
      22,
      isSelf ? 'rgba(22, 64, 82, 0.74)' : 'rgba(11, 30, 46, 0.62)',
      isSelf ? 'rgba(145, 235, 255, 0.3)' : 'rgba(145, 235, 255, 0.16)'
    );

    fillRoundRect(ctx, 32, y + 12, 32, 32, 16, 'rgba(8, 29, 44, 0.74)', 'rgba(145, 235, 255, 0.14)');
    drawText(ctx, `${entry.rank}`, 48, y + 19, 14, '#dffcff', 'center', 'bold');

    drawLeaderboardAvatar(entry, 74, y + 10, 38, '#eafcff');
    drawText(ctx, entry.nickname || '微信好友', 124, y + 12, 15, '#f3ffff', 'left', 'bold');
    drawText(ctx, isSelf ? '我的当前成绩' : '好友挑战分', 124, y + 32, 11, 'rgba(230,251,255,0.56)');
    drawText(ctx, `${entry.score} 分`, app.viewWidth - 36, y + 16, 18, '#aef7ff', 'right', 'bold');
  });

  app.leaderboardButtons.forEach((button) => {
    app.drawButton(button, button.key === 'refresh', true);
  });
}

module.exports = {
  drawSupplyPanel,
  drawSettingsPanel,
  drawLegalPanel,
  drawLeaderboardPanel
};
