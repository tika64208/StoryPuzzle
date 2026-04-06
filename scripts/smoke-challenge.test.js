const test = require('node:test');
const assert = require('node:assert/strict');

function createWxMock() {
  const storage = new Map();

  return {
    getStorageSync(key) {
      return storage.has(key) ? JSON.parse(JSON.stringify(storage.get(key))) : undefined;
    },
    setStorageSync(key, value) {
      storage.set(key, JSON.parse(JSON.stringify(value)));
    },
    getAccountInfoSync() {
      return {
        miniGame: {
          appId: 'test-appid',
          envVersion: 'develop'
        }
      };
    }
  };
}

function clearModuleCache() {
  [
    '../utils/storage',
    '../services/challenge',
    '../services/level-repo',
    '../services/custom-levels',
    '../data/levels',
    '../data/story-art'
  ].forEach((modulePath) => {
    delete require.cache[require.resolve(modulePath)];
  });
}

function loadFreshModules() {
  clearModuleCache();
  return {
    storage: require('../utils/storage'),
    challenge: require('../services/challenge')
  };
}

test('chapter difficulty is saved per chapter and applied to level grid size', () => {
  global.wx = createWxMock();
  const { storage, challenge } = loadFreshModules();

  let profile = storage.saveChapterDifficulty('ch05', 5);
  assert.equal(profile.chapterDifficultyMap.ch05, 5);

  let level = challenge.getLevelByIdWithDifficulty('ch05-lv01', profile);
  assert.equal(level.rows, 5);
  assert.equal(level.cols, 5);
  assert.equal(level.difficultyStars, 5);

  profile = storage.saveChapterDifficulty('ch05', 9);
  assert.equal(profile.chapterDifficultyMap.ch05, challenge.DEFAULT_CHAPTER_DIFFICULTY_STARS);

  level = challenge.getLevelByIdWithDifficulty('ch05-lv01', profile);
  assert.equal(level.rows, 4);
  assert.equal(level.cols, 4);
});

test('level result only adds the delta from the best historical challenge score', () => {
  global.wx = createWxMock();
  const { storage, challenge } = loadFreshModules();

  storage.saveChapterDifficulty('ch05', 4);
  let profile = storage.getProfile();
  let levelMeta = challenge.getLevelByIdWithDifficulty('ch05-lv01', profile);
  let result = storage.updateLevelResult({
    levelId: 'ch05-lv01',
    levelMeta,
    success: true,
    remainingTime: levelMeta.timeLimit,
    moves: 12
  });

  assert.equal(result.rewards.challengeScore, 4);
  assert.equal(result.rewards.totalChallengeScore, 4);

  storage.saveChapterDifficulty('ch05', 3);
  profile = storage.getProfile();
  levelMeta = challenge.getLevelByIdWithDifficulty('ch05-lv01', profile);
  result = storage.updateLevelResult({
    levelId: 'ch05-lv01',
    levelMeta,
    success: true,
    remainingTime: levelMeta.timeLimit,
    moves: 10
  });

  assert.equal(result.rewards.challengeScore, 0);
  assert.equal(result.rewards.totalChallengeScore, 4);

  storage.saveChapterDifficulty('ch05', 5);
  profile = storage.getProfile();
  levelMeta = challenge.getLevelByIdWithDifficulty('ch05-lv01', profile);
  result = storage.updateLevelResult({
    levelId: 'ch05-lv01',
    levelMeta,
    success: true,
    remainingTime: levelMeta.timeLimit,
    moves: 8
  });

  assert.equal(result.rewards.challengeScore, 1);
  assert.equal(result.rewards.totalChallengeScore, 5);
});

test('leaderboard view model sorts by score, keeps self identity, and degrades gracefully', () => {
  const { challenge } = loadFreshModules();

  const selfIdentity = {
    nickname: '阿宁',
    avatarUrl: 'https://example.com/me.png',
    source: 'wx'
  };

  const unsupportedView = challenge.buildLeaderboardLoadViewModel(
    {
      ok: false,
      unsupported: true
    },
    {
      challengeScore: 4
    },
    100,
    selfIdentity
  );

  assert.equal(unsupportedView.entries.length, 1);
  assert.equal(unsupportedView.entries[0].nickname, '阿宁');
  assert.equal(unsupportedView.entries[0].avatarUrl, 'https://example.com/me.png');
  assert.equal(unsupportedView.state.error, '当前环境暂不支持好友排行，请在微信内查看真实好友头像和昵称');
  assert.equal(unsupportedView.state.hint, '已读取当前微信昵称和头像');

  const successView = challenge.buildLeaderboardLoadViewModel(
    {
      ok: true,
      data: [
        {
          nickname: '甲',
          avatarUrl: 'https://example.com/a.png',
          KVDataList: [
            { key: challenge.CHALLENGE_SCORE_CLOUD_KEY, value: '3' },
            { key: challenge.CHALLENGE_SCORE_UPDATED_KEY, value: '80' }
          ]
        },
        {
          nickname: '乙',
          avatarUrl: 'https://example.com/b.png',
          KVDataList: [
            { key: challenge.CHALLENGE_SCORE_CLOUD_KEY, value: '7' },
            { key: challenge.CHALLENGE_SCORE_UPDATED_KEY, value: '60' }
          ]
        }
      ]
    },
    {
      challengeScore: 4
    },
    120,
    selfIdentity
  );

  assert.deepEqual(successView.entries.slice(0, 3).map((item) => item.score), [7, 4, 3]);
  assert.equal(successView.entries[1].nickname, '阿宁');
  assert.equal(successView.entries[1].isSelf, true);
  assert.equal(successView.state.error, '');
  assert.equal(successView.state.hint, '已读取当前微信昵称和头像');

  const emptyView = challenge.buildLeaderboardLoadViewModel(
    {
      ok: true,
      data: []
    },
    {
      challengeScore: 0
    },
    200
  );

  assert.equal(emptyView.entries.length, 1);
  assert.equal(emptyView.entries[0].nickname, '我');
  assert.equal(emptyView.state.error, '还没有好友写入排行数据');
  assert.equal(emptyView.state.hint, '当前环境未返回你的微信头像昵称，可在微信内再试一次');
});
