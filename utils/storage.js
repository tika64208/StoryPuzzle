const runtime = require('../config/runtime');
const levelRepo = require('../services/level-repo');

const PROFILE_KEY = 'mystery_profile_v1';
const PROGRESS_KEY = 'mystery_progress_v1';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextResetTime() {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

function getEnvVersion() {
  try {
    if (!wx.getAccountInfoSync) {
      return 'develop';
    }
    const accountInfo = wx.getAccountInfoSync();
    const runtimeInfo =
      (accountInfo && (accountInfo.miniProgram || accountInfo.miniGame)) || {};
    return runtimeInfo.envVersion || 'develop';
  } catch (error) {
    return 'develop';
  }
}

function isDevelopEnv() {
  return getEnvVersion() === 'develop';
}

function getDebugRecoverIntervalMs() {
  return Math.max(1, Number(runtime.debugEnergyRecoverMinutes || 1)) * 60 * 1000;
}

function createDefaultProfile() {
  return {
    maxEnergy: runtime.defaultEnergy,
    energy: runtime.defaultEnergy,
    energyRecoverAt: 0,
    energyResetDate: formatDateKey(new Date()),
    unlockDragTools: runtime.defaultUnlockDragTools,
    guideHintTools: runtime.defaultGuideHintTools,
    coins: 0,
    soundEnabled: true,
    currentLevelId: levelRepo.getFirstLevelId(),
    lastSignInDate: ''
  };
}

function createDefaultProgress() {
  return {
    unlockedLevels: [levelRepo.getFirstLevelId()],
    levelRecords: {},
    lastPlayedLevelId: levelRepo.getFirstLevelId()
  };
}

function normalizeProfile(profile) {
  const fallback = createDefaultProfile();
  const normalized = Object.assign({}, fallback, profile || {});
  const firstLevelId = levelRepo.getFirstLevelId();

  normalized.maxEnergy = runtime.defaultEnergy;
  if (typeof normalized.energy !== 'number' || Number.isNaN(normalized.energy)) {
    normalized.energy = runtime.defaultEnergy;
  }
  normalized.energy = Math.max(0, Math.min(normalized.energy, normalized.maxEnergy));
  if (typeof normalized.unlockDragTools !== 'number' || Number.isNaN(normalized.unlockDragTools)) {
    normalized.unlockDragTools = runtime.defaultUnlockDragTools;
  }
  normalized.unlockDragTools = Math.max(0, Math.floor(normalized.unlockDragTools));
  if (typeof normalized.guideHintTools !== 'number' || Number.isNaN(normalized.guideHintTools)) {
    normalized.guideHintTools = runtime.defaultGuideHintTools;
  }
  normalized.guideHintTools = Math.max(0, Math.floor(normalized.guideHintTools));

  if (typeof normalized.energyRecoverAt !== 'number' || Number.isNaN(normalized.energyRecoverAt)) {
    normalized.energyRecoverAt = 0;
  }
  normalized.energyRecoverAt = Math.max(0, normalized.energyRecoverAt);
  normalized.energyResetDate =
    typeof normalized.energyResetDate === 'string' ? normalized.energyResetDate : '';

  if (!levelRepo.getLevelById(normalized.currentLevelId)) {
    normalized.currentLevelId = firstLevelId;
  }

  return normalized;
}

function normalizeProgress(progress) {
  const fallback = createDefaultProgress();
  const normalized = Object.assign({}, fallback, progress || {});
  const firstLevelId = levelRepo.getFirstLevelId();

  if (!Array.isArray(normalized.unlockedLevels) || normalized.unlockedLevels.length === 0) {
    normalized.unlockedLevels = [firstLevelId];
  } else if (normalized.unlockedLevels.indexOf(firstLevelId) === -1) {
    normalized.unlockedLevels.unshift(firstLevelId);
  }

  if (!normalized.levelRecords) {
    normalized.levelRecords = {};
  }

  if (!levelRepo.getLevelById(normalized.lastPlayedLevelId)) {
    normalized.lastPlayedLevelId = firstLevelId;
  }

  return normalized;
}

function saveProfile(profile) {
  wx.setStorageSync(PROFILE_KEY, profile);
  return clone(profile);
}

function saveProgress(progress) {
  wx.setStorageSync(PROGRESS_KEY, progress);
  return clone(progress);
}

function syncDailyEnergyInPlace(profile) {
  const today = formatDateKey(new Date());
  if (profile.energyResetDate !== today) {
    profile.energy = profile.maxEnergy;
    profile.energyResetDate = today;
    profile.energyRecoverAt = 0;
  }
  return profile;
}

function syncDebugEnergyInPlace(profile) {
  if (!isDevelopEnv()) {
    profile.energyRecoverAt = 0;
    return profile;
  }

  if (profile.energy >= profile.maxEnergy) {
    profile.energy = profile.maxEnergy;
    profile.energyRecoverAt = 0;
    return profile;
  }

  const interval = getDebugRecoverIntervalMs();
  if (!profile.energyRecoverAt) {
    profile.energyRecoverAt = Date.now();
    return profile;
  }

  const elapsed = Date.now() - profile.energyRecoverAt;
  const gain = Math.floor(elapsed / interval);

  if (gain > 0) {
    profile.energy = Math.min(profile.maxEnergy, profile.energy + gain);
    if (profile.energy >= profile.maxEnergy) {
      profile.energyRecoverAt = 0;
    } else {
      profile.energyRecoverAt += gain * interval;
    }
  }

  return profile;
}

function syncEnergyInPlace(profile) {
  syncDailyEnergyInPlace(profile);
  syncDebugEnergyInPlace(profile);
  return profile;
}

function getProfile() {
  const cached = wx.getStorageSync(PROFILE_KEY);
  const profile = normalizeProfile(cached);
  syncEnergyInPlace(profile);
  saveProfile(profile);
  return clone(profile);
}

function getProgress() {
  const cached = wx.getStorageSync(PROGRESS_KEY);
  const progress = normalizeProgress(cached);
  saveProgress(progress);
  return clone(progress);
}

function bootstrap() {
  getProfile();
  getProgress();
}

function getDebugCountdownText(profile) {
  if (profile.energy >= profile.maxEnergy) {
    return `今日体力 ${profile.maxEnergy} / ${profile.maxEnergy}`;
  }

  const interval = getDebugRecoverIntervalMs();
  const anchor = profile.energyRecoverAt || Date.now();
  const remain = Math.max(interval - (Date.now() - anchor), 0);
  const minutes = `${Math.floor(remain / 60000)}`.padStart(2, '0');
  const seconds = `${Math.floor((remain % 60000) / 1000)}`.padStart(2, '0');
  return `调试版 ${minutes}:${seconds} 后恢复 1 点`;
}

function getReleaseCountdownText(profile) {
  if (profile.energy >= profile.maxEnergy) {
    return `今日体力 ${profile.maxEnergy} / ${profile.maxEnergy}`;
  }

  const remain = Math.max(getNextResetTime() - Date.now(), 0);
  const hours = `${Math.floor(remain / 3600000)}`.padStart(2, '0');
  const minutes = `${Math.floor((remain % 3600000) / 60000)}`.padStart(2, '0');
  const seconds = `${Math.floor((remain % 60000) / 1000)}`.padStart(2, '0');
  return `${hours}:${minutes}:${seconds} 后恢复到 ${profile.maxEnergy} 点`;
}

function getEnergyCountdownText(profile) {
  const current = normalizeProfile(profile);
  syncEnergyInPlace(current);
  return isDevelopEnv() ? getDebugCountdownText(current) : getReleaseCountdownText(current);
}

function consumeEnergy(cost) {
  const profile = getProfile();
  if (profile.energy < cost) {
    return {
      ok: false,
      profile
    };
  }

  profile.energy -= cost;
  if (isDevelopEnv()) {
    if (profile.energy < profile.maxEnergy && !profile.energyRecoverAt) {
      profile.energyRecoverAt = Date.now();
    }
  } else {
    profile.energyRecoverAt = 0;
  }
  saveProfile(profile);

  return {
    ok: true,
    profile
  };
}

function addEnergy(amount) {
  const profile = getProfile();
  profile.energy = Math.min(profile.maxEnergy, profile.energy + amount);

  if (profile.energy >= profile.maxEnergy) {
    profile.energyRecoverAt = 0;
  } else if (isDevelopEnv() && !profile.energyRecoverAt) {
    profile.energyRecoverAt = Date.now();
  } else if (!isDevelopEnv()) {
    profile.energyRecoverAt = 0;
  }

  saveProfile(profile);
  return clone(profile);
}

function addCoins(amount) {
  const profile = getProfile();
  profile.coins += amount;
  saveProfile(profile);
  return clone(profile);
}

function addUnlockDragTools(amount) {
  const profile = getProfile();
  profile.unlockDragTools = Math.max(0, profile.unlockDragTools + Math.max(0, Math.floor(amount || 0)));
  saveProfile(profile);
  return clone(profile);
}

function addGuideHintTools(amount) {
  const profile = getProfile();
  profile.guideHintTools = Math.max(0, profile.guideHintTools + Math.max(0, Math.floor(amount || 0)));
  saveProfile(profile);
  return clone(profile);
}

function consumeUnlockDragTool(amount) {
  const cost = Math.max(1, Math.floor(amount || 1));
  const profile = getProfile();
  if (profile.unlockDragTools < cost) {
    return {
      ok: false,
      profile
    };
  }

  profile.unlockDragTools -= cost;
  saveProfile(profile);
  return {
    ok: true,
    profile: clone(profile)
  };
}

function consumeGuideHintTool(amount) {
  const cost = Math.max(1, Math.floor(amount || 1));
  const profile = getProfile();
  if (profile.guideHintTools < cost) {
    return {
      ok: false,
      profile
    };
  }

  profile.guideHintTools -= cost;
  saveProfile(profile);
  return {
    ok: true,
    profile: clone(profile)
  };
}

function setCurrentLevel(levelId) {
  const profile = getProfile();
  const progress = getProgress();
  profile.currentLevelId = levelId;
  progress.lastPlayedLevelId = levelId;
  saveProfile(profile);
  saveProgress(progress);
}

function saveSoundEnabled(enabled) {
  const profile = getProfile();
  profile.soundEnabled = !!enabled;
  saveProfile(profile);
  return clone(profile);
}

function updateLevelResult(options) {
  const level = levelRepo.getLevelById(options.levelId);
  const progress = getProgress();
  const profile = getProfile();
  const currentRecord = progress.levelRecords[options.levelId] || {
    completed: false,
    stars: 0,
    bestTime: 0,
    bestMoves: 0,
    failCount: 0
  };

  let nextLevelId = '';
  let rewardCoins = 0;
  let stars = 0;

  if (options.success && level) {
    stars =
      options.remainingTime >= Math.ceil(level.timeLimit * 0.5)
        ? 3
        : options.remainingTime >= Math.ceil(level.timeLimit * 0.2)
          ? 2
          : 1;
    rewardCoins = 10 + stars * 5;

    currentRecord.completed = true;
    currentRecord.stars = Math.max(currentRecord.stars || 0, stars);
    currentRecord.bestTime = Math.max(currentRecord.bestTime || 0, options.remainingTime);
    currentRecord.bestMoves =
      currentRecord.bestMoves === 0
        ? options.moves
        : Math.min(currentRecord.bestMoves, options.moves);

    profile.coins += rewardCoins;
    nextLevelId = levelRepo.getNextLevelId(options.levelId);
    if (nextLevelId && progress.unlockedLevels.indexOf(nextLevelId) === -1) {
      progress.unlockedLevels.push(nextLevelId);
    }
    progress.lastPlayedLevelId = nextLevelId || options.levelId;
    profile.currentLevelId = progress.lastPlayedLevelId;
  } else {
    currentRecord.failCount = (currentRecord.failCount || 0) + 1;
    progress.lastPlayedLevelId = options.levelId;
    profile.currentLevelId = options.levelId;
  }

  progress.levelRecords[options.levelId] = currentRecord;
  saveProgress(progress);
  saveProfile(profile);

  return {
    progress: clone(progress),
    profile: clone(profile),
    rewards: {
      coins: rewardCoins,
      stars
    },
    nextLevelId
  };
}

function claimDailySignIn() {
  const profile = getProfile();
  const today = formatDateKey(new Date());
  if (profile.lastSignInDate === today) {
    return {
      ok: false,
      profile
    };
  }

  profile.lastSignInDate = today;
  profile.energy = Math.min(profile.maxEnergy, profile.energy + 3);
  profile.unlockDragTools += 1;
  profile.guideHintTools += 1;
  profile.coins += 30;

  if (profile.energy >= profile.maxEnergy) {
    profile.energyRecoverAt = 0;
  } else if (isDevelopEnv() && !profile.energyRecoverAt) {
    profile.energyRecoverAt = Date.now();
  } else if (!isDevelopEnv()) {
    profile.energyRecoverAt = 0;
  }

  saveProfile(profile);

  return {
    ok: true,
    profile: clone(profile),
    reward: {
      energy: 3,
      unlockDragTools: 1,
      guideHintTools: 1,
      coins: 30
    }
  };
}

module.exports = {
  addCoins,
  addEnergy,
  addGuideHintTools,
  addUnlockDragTools,
  bootstrap,
  claimDailySignIn,
  consumeGuideHintTool,
  consumeUnlockDragTool,
  consumeEnergy,
  getEnergyCountdownText,
  getProfile,
  getProgress,
  saveSoundEnabled,
  setCurrentLevel,
  updateLevelResult
};
