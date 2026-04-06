const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appShellSource = fs.readFileSync(path.join(__dirname, '..', 'minigame', 'app.js'), 'utf8');
const appMethodsSource = fs.readFileSync(path.join(__dirname, '..', 'minigame', 'app-methods.js'), 'utf8');
const helperBundlesSource = fs.readFileSync(path.join(__dirname, '..', 'minigame', 'runtime-helper-bundles.js'), 'utf8');
const appSource = `${appShellSource}\n${appMethodsSource}`;

function countMethodDefinitions(methodName) {
  const pattern = new RegExp(`\\n\\s{2}(?:async\\s+)?${methodName}\\(`, 'g');
  const matches = appSource.match(pattern);
  return matches ? matches.length : 0;
}

test('critical minigame methods keep a single active definition', () => {
  [
    'drawHome',
    'drawChapters',
    'drawLevels',
    'drawCustom',
    'drawStoryHome',
    'drawStoryChapters',
    'drawStoryLevels',
    'drawSupplyPanel',
    'drawSettingsPanel',
    'drawLegalPanel',
    'drawLeaderboardPanel',
    'drawBackground',
    'drawLoading',
    'getHomeHeroParallax',
    'triggerScreenMotion',
    'getScreenMotion',
    'drawMotionMotes',
    'resizeCanvas',
    'bindTouches',
    'handleTouchStart',
    'handleTouchMove',
    'handleTouchEnd',
    'handleCustomUseDefault',
    'handleCustomChooseImage',
    'handleCustomChooseLayout',
    'handleCustomCreateLevel',
    'handleCustomImportCode',
    'handleCustomCopyCode',
    'handleCustomDelete',
    'isRectVisible',
    'getImageCacheEntry',
    'bindImageCacheEntry',
    'touchImageCacheEntry',
    'dropImageCacheEntry',
    'collectPreferredImageSources',
    'pruneImageCache',
    'switchToHome',
    'buildHomeLayout',
    'refreshHomeQuickActions',
    'switchToSettings',
    'buildSettingsLayout',
    'switchToLeaderboard',
    'buildLeaderboardLayout',
    'syncChallengeScoreToCloud',
    'loadFriendLeaderboard',
    'switchToChapters',
    'switchToLevels',
    'buildChapterLayout',
    'buildLevelLayout',
    'updateSelectedChapterDifficulty',
    'refreshCustomData',
    'ensureCustomPreview',
    'switchToCustom',
    'buildCustomLayout',
    'switchToSupply',
    'buildSupplyLayout',
    'switchToLegal',
    'buildLegalLayout',
    'buildLegalPages',
    'setupSharing',
    'buildShareQuery',
    'getHomeSharePayload',
    'getChapterSharePayload',
    'getLevelSharePayload',
    'getSharePayload',
    'triggerShare',
    'getSharePayloadFromData',
    'getSuccessShareAction',
    'handleSuccessShareAction',
    'getLaunchOptions',
    'showToast',
    'refreshProfile',
    'refreshSelectedChapter',
    'openLevel',
    'openIntroOverlay',
    'loadImage',
    'getResolvedImage',
    'handleHomeTap',
    'handleChapterTap',
    'handleLevelTap',
    'handleCustomTap',
    'handlePuzzleTap',
    'clearPressState',
    'capturePressState',
    'isButtonPressed',
    'drawButton',
    'drawScreenFade',
    'render',
    'drawBoard',
    'drawPuzzle',
    'drawOverlay',
    'buildPuzzleLayout',
    'startSettleAnimation',
    'capturePieceSlotSnapshot',
    'startPassiveSettleAnimations',
    'getSettleEffect',
    'getSettleOffset',
    'drawSettleTrail',
    'capturePuzzleFeedback',
    'getGroupBounds',
    'addSnapPulse',
    'spawnBurstParticles',
    'triggerMoveFeedback',
    'playSuccessCelebration',
    'updateAnimationEffects',
    'drawBoardEffects',
    'handleSupplyTap',
    'useHint',
    'useLockTool',
    'useGuideTool',
    'openFailOverlay',
    'openChapterOverlay',
    'openSuccessOverlay',
    'buildOverlayButtons',
    'handleOverlayTap',
    'buildChapterOverlayButtons',
    'drawChapterNarrativeOverlay',
    'handleMoreTools',
    'clearPuzzleEffects',
    'playHaptic',
    'playFeedbackCue',
    'syncScreenAudio',
    'drawToast'
  ].forEach((methodName) => {
    assert.equal(
      countMethodDefinitions(methodName),
      1,
      `expected a single definition for ${methodName}`
    );
  });
});

test('minigame shell keeps prototype wiring to extracted app methods', () => {
  assert.match(appShellSource, /Object\.assign\(MiniGameApp\.prototype,\s*appMethods\)/);
});

test('settings panel helper bundle includes fillRoundRect for panel rendering', () => {
  assert.match(
    helperBundlesSource,
    /settingsPanel:\s*\{[^}]*drawGlassCard,\s*drawText,\s*fillRoundRect[^}]*\}/
  );
});
