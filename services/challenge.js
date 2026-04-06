const levelRepo = require('./level-repo');

const CHAPTER_DIFFICULTY_OPTIONS = [
  { stars: 3, label: '3星 3x3', rows: 3, cols: 3 },
  { stars: 4, label: '4星 4x4', rows: 4, cols: 4 },
  { stars: 5, label: '5星 5x5', rows: 5, cols: 5 }
];
const DEFAULT_CHAPTER_DIFFICULTY_STARS = 4;
const CHAPTER_DIFFICULTY_STARS = CHAPTER_DIFFICULTY_OPTIONS.map((item) => item.stars);
const CHALLENGE_SCORE_CLOUD_KEY = 'challenge_score';
const CHALLENGE_SCORE_UPDATED_KEY = 'challenge_score_updated_at';

function normalizeDisplayName(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function getChallengeScore(profile) {
  return Math.max(0, Number(profile && profile.challengeScore) || 0);
}

function getChapterDifficultyConfig(stars) {
  return (
    CHAPTER_DIFFICULTY_OPTIONS.find((item) => item.stars === Number(stars)) ||
    CHAPTER_DIFFICULTY_OPTIONS.find((item) => item.stars === DEFAULT_CHAPTER_DIFFICULTY_STARS) ||
    CHAPTER_DIFFICULTY_OPTIONS[0]
  );
}

function getChapterDifficultyStars(profile, chapterId) {
  const map =
    profile && profile.chapterDifficultyMap && typeof profile.chapterDifficultyMap === 'object'
      ? profile.chapterDifficultyMap
      : {};
  const stars = Number(map[chapterId]);
  return CHAPTER_DIFFICULTY_STARS.indexOf(stars) !== -1
    ? stars
    : DEFAULT_CHAPTER_DIFFICULTY_STARS;
}

function applyChapterDifficultyToLevel(level, profile) {
  if (!level || level.isCustom) {
    return level;
  }

  const difficulty = getChapterDifficultyConfig(getChapterDifficultyStars(profile, level.chapterId));
  return Object.assign({}, level, {
    baseRows: level.baseRows || level.rows,
    baseCols: level.baseCols || level.cols,
    rows: difficulty.rows,
    cols: difficulty.cols,
    difficultyStars: difficulty.stars,
    difficultyGridLabel: `${difficulty.rows}x${difficulty.cols}`
  });
}

function applyChapterDifficultyToChapter(chapter, profile) {
  if (!chapter) {
    return null;
  }

  const difficulty = getChapterDifficultyConfig(getChapterDifficultyStars(profile, chapter.chapterId));
  return Object.assign({}, chapter, {
    difficultyStars: difficulty.stars,
    difficultyGridLabel: `${difficulty.rows}x${difficulty.cols}`,
    levels: (chapter.levels || []).map((level) => applyChapterDifficultyToLevel(level, profile))
  });
}

function getChaptersWithDifficulty(progress, profile) {
  return levelRepo
    .getChaptersWithProgress(progress)
    .map((chapter) => applyChapterDifficultyToChapter(chapter, profile));
}

function getLevelByIdWithDifficulty(levelId, profile) {
  return applyChapterDifficultyToLevel(levelRepo.getLevelById(levelId), profile);
}

function getCloudStorageValue(list, key) {
  const item = (list || []).find((entry) => entry && entry.key === key);
  return item ? String(item.value || '') : '';
}

function parseCloudStorageNumber(list, key) {
  const value = Number(getCloudStorageValue(list, key));
  return Number.isFinite(value) ? value : 0;
}

function createSelfLeaderboardEntry(profile, now, selfIdentity) {
  const identity = selfIdentity || {};
  return {
    rank: 1,
    nickname: normalizeDisplayName(identity.nickname, '我'),
    avatarUrl: String(identity.avatarUrl || ''),
    score: getChallengeScore(profile),
    isSelf: true,
    source: identity.source || 'fallback',
    updatedAt: now || Date.now()
  };
}

function normalizeLeaderboardEntries(friendData) {
  return (friendData || []).map((item) => ({
    nickname: normalizeDisplayName(item.nickname || item.nickName, '微信好友'),
    avatarUrl: String(item.avatarUrl || ''),
    openid: item.openid || '',
    score: Math.max(0, parseCloudStorageNumber(item.KVDataList, CHALLENGE_SCORE_CLOUD_KEY)),
    updatedAt: parseCloudStorageNumber(item.KVDataList, CHALLENGE_SCORE_UPDATED_KEY)
  }));
}

function rankLeaderboardEntries(entries) {
  return (entries || [])
    .slice()
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return (right.updatedAt || 0) - (left.updatedAt || 0);
    })
    .map((item, index) => Object.assign({}, item, { rank: index + 1 }));
}

function buildLeaderboardEntries(friendData, profile, now, selfIdentity) {
  const fallbackEntry = createSelfLeaderboardEntry(profile, now, selfIdentity);
  const entries = normalizeLeaderboardEntries(friendData);

  if (!entries.some((item) => item.score === fallbackEntry.score && item.nickname === fallbackEntry.nickname)) {
    entries.push(Object.assign({}, fallbackEntry));
  }

  const rankedEntries = rankLeaderboardEntries(entries);
  return rankedEntries.length ? rankedEntries : [fallbackEntry];
}

function buildLeaderboardLoadViewModel(result, profile, now, selfIdentity) {
  const safeNow = now || Date.now();
  const fallbackEntries = [createSelfLeaderboardEntry(profile, safeNow, selfIdentity)];
  const selfHasIdentity = !!(
    selfIdentity &&
    (String(selfIdentity.nickname || '').trim() || String(selfIdentity.avatarUrl || '').trim())
  );
  const identityHint = selfIdentity && selfIdentity.source === 'wx'
    ? '已读取当前微信昵称和头像'
    : selfHasIdentity
      ? '已使用你上传的头像和昵称'
      : '当前环境未返回你的微信头像昵称，可在微信内再试一次';

  if (!result || !result.ok) {
    return {
      entries: fallbackEntries,
      state: {
        loading: false,
        error: result && result.unsupported
          ? '当前环境暂不支持好友排行，请在微信内查看真实好友头像和昵称'
          : '未获取到好友排行数据',
        hint: identityHint,
        updatedAt: safeNow
      }
    };
  }

  const normalizedEntries = normalizeLeaderboardEntries(result.data || []);
  const entries = buildLeaderboardEntries(result.data || [], profile, safeNow, selfIdentity);
  return {
    entries,
    state: {
      loading: false,
      error: normalizedEntries.length ? '' : '还没有好友写入排行数据',
      hint: identityHint,
      updatedAt: safeNow
    }
  };
}

module.exports = {
  CHALLENGE_SCORE_CLOUD_KEY,
  CHALLENGE_SCORE_UPDATED_KEY,
  CHAPTER_DIFFICULTY_OPTIONS,
  CHAPTER_DIFFICULTY_STARS,
  DEFAULT_CHAPTER_DIFFICULTY_STARS,
  applyChapterDifficultyToChapter,
  applyChapterDifficultyToLevel,
  buildLeaderboardEntries,
  buildLeaderboardLoadViewModel,
  createSelfLeaderboardEntry,
  getChallengeScore,
  getChapterDifficultyConfig,
  getChapterDifficultyStars,
  getChaptersWithDifficulty,
  getCloudStorageValue,
  getLevelByIdWithDifficulty,
  normalizeDisplayName,
  normalizeLeaderboardEntries,
  parseCloudStorageNumber,
  rankLeaderboardEntries
};
