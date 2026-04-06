const test = require('node:test');
const assert = require('node:assert/strict');

const challenge = require('../services/challenge');
const inputRuntime = require('../minigame/input-runtime');
const screenFlow = require('../minigame/screen-flow');

function createProfile(stars) {
  return {
    chapterDifficultyMap: {
      ch05: stars || 5
    }
  };
}

function createProgress() {
  return {
    unlockedLevels: ['ch05-lv01'],
    levelRecords: {}
  };
}

test('chapter layout clamps scroll offset when content does not need scrolling', () => {
  const app = {
    viewWidth: 375,
    viewHeight: 667,
    progress: createProgress(),
    screenScroll: {
      chapters: -180,
      levels: 0
    }
  };

  screenFlow.buildChapterLayout(app);

  assert.equal(app.screenScroll.chapters, 0);
  assert.equal(app.chapterButtons[0].y, 120);
});

test('level layout applies and clamps vertical scroll offset for long chapter content', () => {
  const profile = createProfile(5);
  const selectedChapter = challenge.getChaptersWithDifficulty(createProgress(), profile)[0];
  const app = {
    viewWidth: 375,
    viewHeight: 667,
    profile,
    selectedChapter,
    screenScroll: {
      chapters: 0,
      levels: -9999
    }
  };

  screenFlow.buildLevelLayout(app, {
    CHAPTER_DIFFICULTY_OPTIONS: challenge.CHAPTER_DIFFICULTY_OPTIONS,
    getChapterDifficultyStars: challenge.getChapterDifficultyStars
  });

  const backButton = app.levelButtons.find((button) => button.key === 'back');

  assert.ok(app.screenScroll.levels < 0);
  assert.equal(app.levelButtons[0].y, 262 + app.screenScroll.levels);
  assert.equal(Math.round(backButton.y + backButton.h), app.viewHeight - 24);
});

test('dragging the levels list scrolls content and suppresses tap handling', () => {
  const app = {
    screen: 'levels',
    overlay: null,
    drag: null,
    screenScroll: {
      chapters: 0,
      levels: 0
    },
    uiPressState: null,
    buildLevelLayoutCalls: 0,
    capturePressState() {
      this.uiPressState = {
        screen: 'levels',
        key: 'press'
      };
    },
    buildLevelLayout() {
      this.buildLevelLayoutCalls += 1;
      this.screenScroll.levels = Math.max(-120, Math.min(0, this.screenScroll.levels));
    },
    handleLevelTap() {
      this.tapped = true;
    }
  };

  inputRuntime.handleTouchStart(app, 120, 320, {
    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }
  });
  inputRuntime.handleTouchMove(app, 120, 264);

  assert.equal(app.touchScroll.moved, true);
  assert.ok(app.screenScroll.levels < 0);
  assert.ok(app.buildLevelLayoutCalls > 0);

  inputRuntime.handleTouchEnd(app, 120, 264);

  assert.equal(app.tapped, undefined);
});

test('simple tap on levels list still reaches tap handling when no scroll gesture happened', () => {
  const app = {
    screen: 'levels',
    overlay: null,
    drag: null,
    screenScroll: {
      chapters: 0,
      levels: 0
    },
    uiPressState: null,
    capturePressState() {
      this.uiPressState = {
        screen: 'levels',
        key: 'press'
      };
    },
    buildLevelLayout() {
      this.screenScroll.levels = Math.max(-120, Math.min(0, this.screenScroll.levels));
    },
    handleLevelTap() {
      this.tapped = true;
    }
  };

  inputRuntime.handleTouchStart(app, 120, 320, {
    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }
  });
  inputRuntime.handleTouchEnd(app, 120, 320);

  assert.equal(app.tapped, true);
});
