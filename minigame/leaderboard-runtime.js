const logger = require('../services/logger');
const imageUtils = require('../utils/image');
const storage = require('../utils/storage');

function showModalPromise(options) {
  return new Promise((resolve) => {
    wx.showModal(
      Object.assign(
        {
          showCancel: true
        },
        options,
        {
          success: resolve,
          fail: () => resolve({ confirm: false, cancel: true })
        }
      )
    );
  });
}

function chooseAvatarImage() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: resolve,
      fail: reject
    });
  });
}

function getStoredPlayerIdentity(profile) {
  const currentProfile = profile || storage.getProfile();
  return {
    nickname: String(currentProfile.playerNickname || '').trim(),
    avatarUrl: String(currentProfile.playerAvatarPath || '').trim(),
    source: currentProfile.playerNickname || currentProfile.playerAvatarPath ? 'upload' : 'fallback'
  };
}

function hasCompleteIdentity(identity) {
  return !!(
    identity &&
    String(identity.nickname || '').trim() &&
    String(identity.avatarUrl || '').trim()
  );
}

function promptNicknameInput(app, defaultValue) {
  return new Promise((resolve, reject) => {
    if (!wx.showKeyboard || !wx.onKeyboardConfirm) {
      reject(new Error('keyboard_unsupported'));
      return;
    }

    let settled = false;
    let latestValue = String(defaultValue || '').trim();

    const cleanup = () => {
      if (wx.offKeyboardInput) {
        wx.offKeyboardInput(handleInput);
      }
      if (wx.offKeyboardConfirm) {
        wx.offKeyboardConfirm(handleConfirm);
      }
      if (wx.offKeyboardComplete) {
        wx.offKeyboardComplete(handleComplete);
      }
    };

    const finish = (error, value) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (wx.hideKeyboard) {
        try {
          wx.hideKeyboard({});
        } catch (hideError) {
          // Ignore keyboard cleanup errors.
        }
      }
      if (error) {
        reject(error);
        return;
      }
      resolve(value);
    };

    const handleInput = (res) => {
      latestValue = String((res && res.value) || '').trim();
    };
    const handleConfirm = (res) => {
      const value = String((res && res.value) || latestValue).trim();
      if (!value) {
        finish(new Error('nickname_empty'));
        return;
      }
      finish(null, value);
    };
    const handleComplete = (res) => {
      const value = String((res && res.value) || latestValue).trim();
      if (value) {
        finish(null, value);
      }
    };

    if (wx.onKeyboardInput) {
      wx.onKeyboardInput(handleInput);
    }
    wx.onKeyboardConfirm(handleConfirm);
    if (wx.onKeyboardComplete) {
      wx.onKeyboardComplete(handleComplete);
    }

    wx.showKeyboard({
      defaultValue: latestValue,
      maxLength: 12,
      multiple: false,
      confirmHold: false,
      confirmType: 'done',
      success: () => {
        app.showToast('请输入昵称后点击完成');
      },
      fail: (error) => finish(error || new Error('show_keyboard_failed'))
    });
  });
}

async function promptManualIdentitySetup(app) {
  const currentIdentity = app.playerIdentity || getStoredPlayerIdentity(app.profile);
  const modalResult = await showModalPromise({
    title: '完善排行资料',
    content: '当前没有获取到微信头像和昵称，需要先上传头像并输入昵称后再查看好友排行。',
    confirmText: '立即上传',
    cancelText: '稍后再说'
  });

  if (!modalResult.confirm) {
    return currentIdentity;
  }

  let avatarUrl = String(currentIdentity.avatarUrl || '').trim();
  let nickname = String(currentIdentity.nickname || '').trim();

  if (!avatarUrl) {
    const imageResult = await chooseAvatarImage();
    const tempFilePath =
      (imageResult && imageResult.tempFilePaths && imageResult.tempFilePaths[0]) ||
      (imageResult && imageResult.tempFilePath) ||
      '';
    if (!tempFilePath) {
      throw new Error('avatar_missing');
    }
    avatarUrl = await imageUtils.persistTempFile(tempFilePath, 'leaderboard-avatar');
  }

  if (!nickname) {
    nickname = await promptNicknameInput(app, '');
  }

  if (!nickname || !avatarUrl) {
    throw new Error('identity_incomplete');
  }

  const profile = storage.savePlayerIdentity({
    nickname,
    avatarUrl
  });
  app.profile = profile;
  app.playerIdentity = {
    nickname,
    avatarUrl,
    source: 'upload'
  };
  return app.playerIdentity;
}

function loadCurrentPlayerIdentity(app) {
  app.playerIdentity = Object.assign({}, getStoredPlayerIdentity(app.profile), app.playerIdentity || {});
  if (!wx.getUserInfo) {
    return Promise.resolve(app.playerIdentity);
  }

  return new Promise((resolve) => {
    wx.getUserInfo({
      lang: 'zh_CN',
      success: (res) => {
        const userInfo = (res && res.userInfo) || {};
        const nickname = String(userInfo.nickName || userInfo.nickname || '').trim();
        const avatarUrl = String(userInfo.avatarUrl || '').trim();

        if (nickname || avatarUrl) {
          app.playerIdentity = {
            nickname: nickname || (app.playerIdentity && app.playerIdentity.nickname) || '我',
            avatarUrl: avatarUrl || '',
            source: 'wx'
          };
        }
        resolve(app.playerIdentity);
      },
      fail: () => {
        resolve(app.playerIdentity);
      }
    });
  });
}

function syncChallengeScoreToCloud(app, options, helpers) {
  const {
    CHALLENGE_SCORE_CLOUD_KEY,
    CHALLENGE_SCORE_UPDATED_KEY,
    getChallengeScore
  } = helpers;
  const silent = !options || options.silent !== false;
  const score = getChallengeScore(app.profile);

  if (!wx.setUserCloudStorage) {
    return Promise.resolve({
      ok: false,
      unsupported: true,
      score
    });
  }

  return new Promise((resolve) => {
    wx.setUserCloudStorage({
      KVDataList: [
        { key: CHALLENGE_SCORE_CLOUD_KEY, value: String(score) },
        { key: CHALLENGE_SCORE_UPDATED_KEY, value: String(Date.now()) }
      ],
      success: () => {
        resolve({
          ok: true,
          score
        });
      },
      fail: (error) => {
        logger.captureError('minigame_sync_challenge_score', error, {
          score
        });
        if (!silent) {
          app.showToast('挑战分同步失败');
        }
        resolve({
          ok: false,
          score,
          error
        });
      }
    });
  });
}

function loadFriendLeaderboard(app, helpers) {
  const {
    CHALLENGE_SCORE_CLOUD_KEY,
    CHALLENGE_SCORE_UPDATED_KEY,
    buildLeaderboardLoadViewModel
  } = helpers;

  app.refreshProfile();
  app.leaderboardState = {
    loading: true,
    error: '',
    hint: '',
    updatedAt: app.leaderboardState.updatedAt || 0
  };

  const fetchFriends = () =>
    new Promise((resolve) => {
      if (!wx.getFriendCloudStorage) {
        resolve({
          ok: false,
          unsupported: true
        });
        return;
      }

      wx.getFriendCloudStorage({
        keyList: [CHALLENGE_SCORE_CLOUD_KEY, CHALLENGE_SCORE_UPDATED_KEY],
        success: (res) => resolve({
          ok: true,
          data: Array.isArray(res.data) ? res.data : []
        }),
        fail: (error) => resolve({
          ok: false,
          error
        })
      });
    });

  return loadCurrentPlayerIdentity(app)
    .then((identity) => {
      if (hasCompleteIdentity(identity)) {
        return identity;
      }
      return promptManualIdentitySetup(app)
        .catch((error) => {
          if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
            return app.playerIdentity;
          }
          if (error && error.message === 'nickname_empty') {
            app.showToast('昵称不能为空');
            return app.playerIdentity;
          }
          if (error && error.message === 'keyboard_unsupported') {
            app.showToast('当前环境不支持输入昵称，请在微信内再试');
            return app.playerIdentity;
          }
          if (error && error.message !== 'show_keyboard_failed') {
            logger.captureError('minigame_prompt_identity_setup', error);
          }
          return app.playerIdentity;
        });
    })
    .then(() => app.syncChallengeScoreToCloud({ silent: true }))
    .then(() => fetchFriends())
    .then((result) => {
      if (result.error) {
        logger.captureError('minigame_load_friend_leaderboard', result.error);
      }

      const viewModel = buildLeaderboardLoadViewModel(
        result,
        app.profile,
        Date.now(),
        app.playerIdentity
      );
      app.leaderboardEntries = viewModel.entries;
      app.leaderboardState = viewModel.state;
      return viewModel;
    });
}

module.exports = {
  loadFriendLeaderboard,
  syncChallengeScoreToCloud
};
