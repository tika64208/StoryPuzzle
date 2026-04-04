const levelRepo = require('../../services/level-repo');
const gameEngine = require('../../utils/game');
const storage = require('../../utils/storage');
const adService = require('../../services/ad');

function formatTime(timeLeft) {
  const safeTime = Math.max(timeLeft, 0);
  const minutes = `${Math.floor(safeTime / 60)}`.padStart(2, '0');
  const seconds = `${safeTime % 60}`.padStart(2, '0');
  return `${minutes}:${seconds}`;
}

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

function countLockedPieces(slots) {
  return (slots || []).filter((item) => item && item.locked).length;
}

Page({
  data: {
    level: null,
    slots: [],
    timeLeft: 0,
    timeText: '00:00',
    moves: 0,
    hintsLeft: 0,
    energy: 0,
    unlockDragTools: 0,
    lockedPiecesCount: 0,
    status: 'loading',
    showRevive: false,
    reviveSeconds: 15,
    previewImageSrc: '',
    successCoins: 0,
    successStars: 0,
    pendingResultUrl: ''
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

    this.level = level;
    this.gameState = gameEngine.createInitialState(level);
    storage.setCurrentLevel(level.levelId);
    const profile = storage.getProfile();

    this.setData({
      level,
      timeLeft: level.timeLimit,
      timeText: formatTime(level.timeLimit),
      energy: profile.energy,
      unlockDragTools: profile.unlockDragTools || 0,
      status: 'playing',
      previewImageSrc: resolvePreviewImage(level)
    });

    this.refreshBoard();
    this.startTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (this.data.status !== 'playing') {
        return;
      }

      const nextTime = this.data.timeLeft - 1;
      if (nextTime <= 0) {
        this.setData({
          timeLeft: 0,
          timeText: '00:00'
        });
        this.handleFail();
        return;
      }

      this.setData({
        timeLeft: nextTime,
        timeText: formatTime(nextTime)
      });
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  refreshBoard() {
    const slots = gameEngine.buildRenderSlots(this.level, this.gameState);
    this.setData({
      slots,
      moves: this.gameState.moves,
      hintsLeft: this.gameState.hintsLeft,
      lockedPiecesCount: countLockedPieces(slots)
    });
  },

  refreshProfileResources() {
    const profile = storage.getProfile();
    this.setData({
      energy: profile.energy,
      unlockDragTools: profile.unlockDragTools || 0
    });
  },

  handleGroupDrop(event) {
    if (this.data.status !== 'playing') {
      return;
    }

    const pieceId = Number(event.detail.pieceId);
    const rowDelta = Number(event.detail.rowDelta || 0);
    const colDelta = Number(event.detail.colDelta || 0);
    if (!pieceId || (!rowDelta && !colDelta)) {
      return;
    }

    const moved = gameEngine.moveGroup(this.level, this.gameState, pieceId, rowDelta, colDelta);
    if (!moved) {
      return;
    }

    this.refreshBoard();

    if (gameEngine.isComplete(this.gameState)) {
      this.handleSuccess();
    }
  },

  handleLockedPieceBlocked() {
    if (this.data.status !== 'playing') {
      return;
    }

    wx.showToast({
      title: '这块碎片已经被定格符固定了',
      icon: 'none'
    });
  },

  handleUseUnlockTool() {
    if (this.data.status !== 'playing') {
      return;
    }

    const lockableIds = gameEngine.getLockableCorrectPieceIds(this.gameState);
    if (lockableIds.length === 0) {
      wx.showToast({
        title: '当前还没有可锁定的正确碎片',
        icon: 'none'
      });
      return;
    }

    const consumeResult = storage.consumeUnlockDragTool(1);
    if (!consumeResult.ok) {
      wx.showToast({
        title: '定格符不足，请先去个人中心补充',
        icon: 'none'
      });
      return;
    }

    const lockedPieceIds = gameEngine.lockCorrectPieces(this.level, this.gameState);
    this.setData({
      unlockDragTools: consumeResult.profile.unlockDragTools || 0
    });
    this.refreshBoard();

    wx.showToast({
      title: `已定格 ${lockedPieceIds.length} 块正确碎片`,
      icon: 'none'
    });
  },

  handleHint() {
    if (this.data.status !== 'playing') {
      return;
    }

    const applyHint = () => {
      const fixedPieceId = gameEngine.autoPlaceOne(this.level, this.gameState);
      if (!fixedPieceId) {
        wx.showToast({
          title: '已经非常接近完成了',
          icon: 'none'
        });
        return;
      }

      this.refreshBoard();
      if (gameEngine.isComplete(this.gameState)) {
        this.handleSuccess();
      }
    };

    if (this.gameState.hintsLeft > 0) {
      this.gameState.hintsLeft -= 1;
      applyHint();
      return;
    }

    adService.showRewardedAction('额外提示').then((granted) => {
      if (!granted) {
        return;
      }
      applyHint();
    });
  },

  handleReset() {
    if (this.data.status !== 'playing') {
      return;
    }

    wx.showModal({
      title: '重置当前关卡',
      content: '重置会回到初始打乱状态，并把倒计时恢复到本关初始值。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        gameEngine.resetBoard(this.level, this.gameState);
        this.setData({
          timeLeft: this.level.timeLimit,
          timeText: formatTime(this.level.timeLimit),
          status: 'playing'
        });
        this.refreshBoard();
      }
    });
  },

  handlePause() {
    if (this.data.status !== 'playing') {
      return;
    }

    this.stopTimer();
    this.setData({
      status: 'paused'
    });

    wx.showActionSheet({
      itemList: ['继续拼图', '重新开始', '返回首页'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({
            status: 'playing'
          });
          this.startTimer();
          return;
        }

        if (res.tapIndex === 1) {
          this.setData({
            status: 'playing'
          });
          gameEngine.resetBoard(this.level, this.gameState);
          this.setData({
            timeLeft: this.level.timeLimit,
            timeText: formatTime(this.level.timeLimit)
          });
          this.refreshBoard();
          this.startTimer();
          return;
        }

        wx.reLaunch({
          url: '/pages/home/index'
        });
      },
      fail: () => {
        this.setData({
          status: 'playing'
        });
        this.startTimer();
      }
    });
  },

  handleFail() {
    this.stopTimer();
    if (!this.gameState.revived) {
      this.setData({
        status: 'revive',
        showRevive: true
      });
      return;
    }

    this.finishLevel(false);
  },

  handleReviveClose() {
    this.setData({
      showRevive: false
    });
    this.finishLevel(false);
  },

  handleReviveConfirm() {
    adService.showRewardedAction(`${this.data.reviveSeconds} 秒加时`).then((granted) => {
      if (!granted) {
        return;
      }

      this.gameState.revived = true;
      const nextTime = this.data.timeLeft + this.data.reviveSeconds;
      this.setData({
        showRevive: false,
        status: 'playing',
        timeLeft: nextTime,
        timeText: formatTime(nextTime)
      });
      this.startTimer();
    });
  },

  handleSuccess() {
    if (this.data.status === 'success') {
      return;
    }

    this.stopTimer();
    const result = storage.updateLevelResult({
      levelId: this.level.levelId,
      success: true,
      moves: this.gameState.moves,
      remainingTime: this.data.timeLeft
    });

    const query = [
      `levelId=${this.level.levelId}`,
      'success=1',
      `moves=${this.gameState.moves}`,
      `timeLeft=${this.data.timeLeft}`,
      `coins=${result.rewards.coins}`,
      `stars=${result.rewards.stars}`,
      `nextLevelId=${result.nextLevelId || ''}`
    ].join('&');

    this.setData({
      status: 'success',
      successCoins: result.rewards.coins,
      successStars: result.rewards.stars,
      pendingResultUrl: `/pages/result/index?${query}`
    });
    this.refreshProfileResources();
  },

  handleOpenResult() {
    if (!this.data.pendingResultUrl) {
      return;
    }

    wx.redirectTo({
      url: this.data.pendingResultUrl
    });
  },

  finishLevel(success) {
    const result = storage.updateLevelResult({
      levelId: this.level.levelId,
      success,
      moves: this.gameState.moves,
      remainingTime: success ? this.data.timeLeft : 0
    });

    const query = [
      `levelId=${this.level.levelId}`,
      `success=${success ? 1 : 0}`,
      `moves=${this.gameState.moves}`,
      `timeLeft=${success ? this.data.timeLeft : 0}`,
      `coins=${result.rewards.coins}`,
      `stars=${result.rewards.stars}`,
      `nextLevelId=${result.nextLevelId || ''}`
    ].join('&');

    wx.redirectTo({
      url: `/pages/result/index?${query}`
    });
  }
});
