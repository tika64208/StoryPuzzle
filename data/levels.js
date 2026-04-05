const CHAPTER_BLUEPRINTS = [
  {
    chapterId: 'ch05',
    title: '倩女幽魂',
    summary: '自暴雨古道入局，至白首焚稿收束，十六幕兰若寺旧梦在拼图中层层揭开。',
    levels: [
      {
        title: '暴雨古道',
        introText: '暴雨倾盆，油纸伞被狂风掀翻。宁采臣背着书篓踉跄前行，只能顺着古道尽头那一线残灯奔去。',
        outroText: '灯影尽头，兰若寺在风雨中缓缓显形，一场注定改写命运的相遇就此开始。',
        clueTag: '古道',
        sceneName: '暴雨古道',
        themeColor: '#5e91be',
        rows: 3,
        cols: 3,
        timeLimit: 90,
        energyCost: 1,
        hints: 2
      },
      {
        title: '荒寺惊门',
        introText: '半朽寺门被猛然撞开，蝙蝠裹着灰尘扑向夜色。残殿深处，剥落的佛像似乎正无声注视着来人。',
        outroText: '寺中看似空寂无声，暗处却早已有目光落在这位误闯者身上。',
        clueTag: '寺门',
        sceneName: '荒寺惊门',
        themeColor: '#76859c',
        rows: 3,
        cols: 3,
        timeLimit: 95,
        energyCost: 1,
        hints: 2
      },
      {
        title: '横梁倒影',
        introText: '宁采臣倚柱小憩，一缕冰凉发丝却先垂到鼻尖。呼吸近在头顶，却迟迟看不见来者真身。',
        outroText: '自横梁倒悬而下的身影，美得惊心，也诡得彻骨。',
        clueTag: '发丝',
        sceneName: '横梁倒悬',
        themeColor: '#6d7ca8',
        rows: 3,
        cols: 3,
        timeLimit: 100,
        energyCost: 1,
        hints: 2
      },
      {
        title: '枯井红衣',
        introText: '月色惨白，枯井边一袭红衣背对而立。井水沉黑如墨，却映不出她半点身影。',
        outroText: '那口井吞没的不只是月光，也揭开了她不属于人间的事实。',
        clueTag: '枯井',
        sceneName: '枯井红衣',
        themeColor: '#8c4f6d',
        rows: 4,
        cols: 4,
        timeLimit: 110,
        energyCost: 1,
        hints: 2
      },
      {
        title: '月下试情',
        introText: '她忽然逼近，做出吸食阳气的姿态，似真似假地试探着这个书生的胆色与心性。',
        outroText: '妖媚只是她的面具，她真正想知道的，是眼前人是否值得托付一丝信任。',
        clueTag: '试情',
        sceneName: '月下试情',
        themeColor: '#a35b7c',
        rows: 4,
        cols: 4,
        timeLimit: 120,
        energyCost: 1,
        hints: 2
      },
      {
        title: '利爪试探',
        introText: '小倩翻身落地，十指骤然化作漆黑利爪。柔弱伪装褪去，真正的危险终于露出锋芒。',
        outroText: '宁采臣却没有退后，这份镇定反倒让她第一次生出迟疑。',
        clueTag: '利爪',
        sceneName: '利爪试探',
        themeColor: '#7e5368',
        rows: 4,
        cols: 4,
        timeLimit: 130,
        energyCost: 1,
        hints: 2
      },
      {
        title: '金页锁魂',
        introText: '宁采臣撕下《妖灵录》书页，金色纸片于空中化作灵索，如蛇游走，直追小倩而去。',
        outroText: '这一击并非为了伤她，而是为了逼出藏在更深处的真正恶意。',
        clueTag: '金页',
        sceneName: '金页锁魂',
        themeColor: '#c1a56a',
        rows: 4,
        cols: 4,
        timeLimit: 140,
        energyCost: 2,
        hints: 1
      },
      {
        title: '槐妖真身',
        introText: '地宫深处，那株遮蔽半壁空间的巨大槐树缓缓苏醒。扭曲人脸在树干上浮现，齐齐睁眼。',
        outroText: '至此，兰若寺真正的主人终于现身，所有伪装也随之崩裂。',
        clueTag: '槐妖',
        sceneName: '姥姥真身',
        themeColor: '#5f6a52',
        rows: 4,
        cols: 4,
        timeLimit: 150,
        energyCost: 2,
        hints: 1
      },
      {
        title: '树根地劫',
        introText: '无数树根破地而出，将宁采臣与小倩一并拖向深渊。整座兰若寺都像在这一刻活了过来。',
        outroText: '生死瞬间，他暗中捏碎玉佩，一缕符光在掌心悄然亮起。',
        clueTag: '树根',
        sceneName: '树根地劫',
        themeColor: '#5d6d56',
        rows: 4,
        cols: 4,
        timeLimit: 160,
        energyCost: 2,
        hints: 1
      },
      {
        title: '金链封魔',
        introText: '姥姥卷起二人欲一口吞噬，宁采臣怒喝一声，周身青金符文炸亮，化作锁链贯穿黑暗。',
        outroText: '锁链未必足以斩断妖根，却为最后的封印争来了一线生机。',
        clueTag: '锁链',
        sceneName: '金链封魔',
        themeColor: '#b9995a',
        rows: 4,
        cols: 5,
        timeLimit: 175,
        energyCost: 2,
        hints: 1
      },
      {
        title: '前尘祭坛',
        introText: '灰白如水墨的旧梦缓缓浮现。少女小倩立于祭坛中央，命运的锁扣早在那时便已扣下。',
        outroText: '她从一开始就知道，若想终结这一切，终究要以自己的魂力为代价。',
        clueTag: '祭坛',
        sceneName: '前尘祭坛',
        themeColor: '#c7c9cf',
        rows: 4,
        cols: 4,
        timeLimit: 165,
        energyCost: 2,
        hints: 1
      },
      {
        title: '封印成阵',
        introText: '封印法阵终于闭合，姥姥的树干开始石化，然而小倩的灵魂也在同一刻急速消散。',
        outroText: '胜负已定，代价却比想象中更沉重。',
        clueTag: '封印',
        sceneName: '封印成阵',
        themeColor: '#839bc4',
        rows: 5,
        cols: 5,
        timeLimit: 200,
        energyCost: 2,
        hints: 1
      },
      {
        title: '幽魂别离',
        introText: '姥姥化作枯树雕像，小倩的身体却自足下化为蓝色光点，缓缓散向夜空。',
        outroText: '他拼回了所有真相，却终究留不住即将远去的人。',
        clueTag: '别离',
        sceneName: '幽魂别离',
        themeColor: '#7398cc',
        rows: 4,
        cols: 5,
        timeLimit: 190,
        energyCost: 2,
        hints: 1
      },
      {
        title: '妖灵录终页',
        introText: '《妖灵录》自行翻到最后一页，小倩的一生在纸上静静浮现，仿佛一场迟来的自白。',
        outroText: '宁采臣终于明白，她真正渴求的从来不是被拯救，而是被铭记。',
        clueTag: '终页',
        sceneName: '妖灵录终页',
        themeColor: '#8f8db3',
        rows: 4,
        cols: 4,
        timeLimit: 170,
        energyCost: 2,
        hints: 1
      },
      {
        title: '灰烬回眸',
        introText: '寺庙在灰烬中倾塌，宁采臣抱着《妖灵录》走出火后残景，背后只余风声与余烬。',
        outroText: '最后一页画像忽然眨眼，仿佛有人在火光尽头回首一望。',
        clueTag: '灰烬',
        sceneName: '灰烬回眸',
        themeColor: '#7c7166',
        rows: 4,
        cols: 4,
        timeLimit: 175,
        energyCost: 2,
        hints: 1
      },
      {
        title: '白首焚稿',
        introText: '多年之后，白发宁采臣独坐兰若寺废墟前，将写满往事的手稿一页页投入火中。',
        outroText: '火光散尽，兰若寺的故事终被风带走，只剩最后一幅谜境留在人心深处。',
        clueTag: '焚稿',
        sceneName: '白首焚稿',
        themeColor: '#a37f5e',
        rows: 4,
        cols: 4,
        timeLimit: 180,
        energyCost: 2,
        hints: 1
      }
    ]
  }
];

function pad(num) {
  return `${num}`.padStart(2, '0');
}

const ALL_LEVELS = [];

CHAPTER_BLUEPRINTS.forEach((chapter, chapterIndex) => {
  chapter.levels.forEach((level, levelIndex) => {
    ALL_LEVELS.push({
      levelId: `${chapter.chapterId}-lv${pad(levelIndex + 1)}`,
      chapterId: chapter.chapterId,
      chapterTitle: chapter.title,
      title: level.title,
      introText: level.introText,
      outroText: level.outroText,
      clueTag: level.clueTag,
      sceneName: level.sceneName,
      sceneStyle: '',
      themeColor: level.themeColor,
      rows: level.rows,
      cols: level.cols,
      timeLimit: level.timeLimit,
      energyCost: level.energyCost,
      hints: level.hints,
      seed: `${chapter.chapterId}-${levelIndex + 1}-mystery`,
      chapterOrder: chapterIndex + 1,
      levelOrder: ALL_LEVELS.length + 1
    });
  });
});

const LEVEL_MAP = {};
ALL_LEVELS.forEach((level) => {
  LEVEL_MAP[level.levelId] = level;
});

function getChapters() {
  return CHAPTER_BLUEPRINTS.map((chapter) => {
    const chapterLevels = ALL_LEVELS.filter((item) => item.chapterId === chapter.chapterId);
    return {
      chapterId: chapter.chapterId,
      title: chapter.title,
      summary: chapter.summary,
      levelIds: chapterLevels.map((item) => item.levelId),
      totalLevels: chapterLevels.length
    };
  });
}

function getAllLevels() {
  return ALL_LEVELS.slice();
}

function getFirstLevelId() {
  return ALL_LEVELS[0].levelId;
}

function getLevelById(levelId) {
  return LEVEL_MAP[levelId] || null;
}

function getNextLevelId(levelId) {
  const index = ALL_LEVELS.findIndex((item) => item.levelId === levelId);
  if (index === -1 || index === ALL_LEVELS.length - 1) {
    return '';
  }
  return ALL_LEVELS[index + 1].levelId;
}

function getChaptersWithProgress(progress) {
  const unlocked = progress.unlockedLevels || [getFirstLevelId()];
  const records = progress.levelRecords || {};

  return getChapters().map((chapter) => {
    const levels = chapter.levelIds.map((levelId) => {
      const level = getLevelById(levelId);
      const record = records[levelId] || {};
      return Object.assign({}, level, {
        unlocked: unlocked.indexOf(levelId) > -1,
        completed: !!record.completed,
        stars: record.stars || 0,
        bestTime: record.bestTime || 0,
        bestMoves: record.bestMoves || 0
      });
    });

    return Object.assign({}, chapter, {
      levels,
      completedCount: levels.filter((item) => item.completed).length
    });
  });
}

module.exports = {
  getAllLevels,
  getChapters,
  getChaptersWithProgress,
  getFirstLevelId,
  getLevelById,
  getNextLevelId
};
