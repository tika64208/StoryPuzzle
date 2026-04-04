const CHAPTER_BLUEPRINTS = [
  {
    chapterId: 'ch04',
    title: '倩女幽魂',
    summary: '暴雨古道、荒寺夜灯、枯井红衣和千年姥姥的阴影，把倩女幽魂的剧情拼成了一条完整线索。',
    levels: [
      {
        title: '雨夜古道',
        introText: '暴雨打翻了油纸伞，宁采臣只能顺着远处残灯的方向，闯进荒山古寺避雨。',
        outroText: '他以为自己只是借宿一夜，却不知道从踏入寺门开始，就已经被卷进聂小倩与树妖的局中。',
        clueTag: '破伞',
        sceneName: '雨夜古道',
        themeColor: '#5e91be',
        rows: 3,
        cols: 3,
        timeLimit: 90,
        energyCost: 1,
        hints: 2
      },
      {
        title: '横梁倒悬',
        introText: '宁采臣在佛堂柱边假寐，一缕发丝却先于人影垂到他面前。',
        outroText: '小倩并没有站在地上，她是从横梁上倒悬而下的。',
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
        introText: '古井边的红衣女子背对月色，井水却没有映出她的身影。',
        outroText: '这口井没有倒映出任何月光，只说明她根本不属于人间。',
        clueTag: '古井',
        sceneName: '枯井红衣',
        themeColor: '#8c4f6d',
        rows: 4,
        cols: 4,
        timeLimit: 120,
        energyCost: 1,
        hints: 2
      },
      {
        title: '利爪试探',
        introText: '小倩突然翻身落地，十指利爪暴长，她终于不再继续伪装。',
        outroText: '宁采臣并没有退后，他说破了她的试探，她也第一次显出犹疑。',
        clueTag: '利爪',
        sceneName: '利爪试探',
        themeColor: '#7e5368',
        rows: 4,
        cols: 4,
        timeLimit: 130,
        energyCost: 1,
        hints: 1
      },
      {
        title: '金锁书符',
        introText: '宁采臣撕下书页，纸片化作金色绳索，在空中自动追逐女鬼的轨迹。',
        outroText: '真正惊到小倩的不是绳索，而是宁采臣真的愿意信她。',
        clueTag: '书符',
        sceneName: '金锁书符',
        themeColor: '#c1a56a',
        rows: 4,
        cols: 4,
        timeLimit: 140,
        energyCost: 2,
        hints: 1
      },
      {
        title: '树根地劫',
        introText: '数十条树根突然破地而出，将宁采臣与小倩一同拖向地下。',
        outroText: '玉佩碎裂的瞬间，金光让树根略微松动，姥姥的真正杀意也由此显现。',
        clueTag: '树根',
        sceneName: '树根地劫',
        themeColor: '#5d6d56',
        rows: 4,
        cols: 4,
        timeLimit: 150,
        energyCost: 2,
        hints: 1
      },
      {
        title: '幽魂别离',
        introText: '姥姥被彻底石化后，小倩的身体也从脚下开始化成蓝色光点，缓缓升向空中。',
        outroText: '即使拼回了所有线索，最后留下的也仍然是一场无法挽回的别离。',
        clueTag: '光点',
        sceneName: '幽魂别离',
        themeColor: '#7398cc',
        rows: 4,
        cols: 4,
        timeLimit: 160,
        energyCost: 2,
        hints: 1
      }
    ]
  },
  {
    chapterId: 'ch01',
    title: '深夜旧宅',
    summary: '从昏暗楼道、破碎镜面和潮湿台阶里，拼出第一组案发线索。',
    levels: [
      {
        title: '门后的脚印',
        introText: '门锁没有损坏，真正的线索藏在地面。',
        outroText: '脚印先离开门口，再诡异地绕回屋内。',
        clueTag: '脚印',
        sceneName: '旧宅走廊',
        themeColor: '#de7c4a',
        rows: 3,
        cols: 3,
        timeLimit: 80,
        energyCost: 1,
        hints: 2
      },
      {
        title: '镜面反光',
        introText: '镜子边缘残留着一抹冷光，拼回画面才能看清方向。',
        outroText: '反光里映出的并不是凶手，而是另一扇未关紧的窗。',
        clueTag: '碎镜',
        sceneName: '裂痕镜厅',
        themeColor: '#82b0e8',
        rows: 3,
        cols: 3,
        timeLimit: 80,
        energyCost: 1,
        hints: 2
      },
      {
        title: '台阶划痕',
        introText: '楼梯扶手干净得过分，台阶边缘却留下划痕。',
        outroText: '有人拖着沉重的东西往地下室去过。',
        clueTag: '划痕',
        sceneName: '地下台阶',
        themeColor: '#cfa16b',
        rows: 3,
        cols: 3,
        timeLimit: 80,
        energyCost: 1,
        hints: 2
      },
      {
        title: '窗边残页',
        introText: '风把纸页吹散了，碎片里藏着最后一句留言。',
        outroText: '字迹断在“别相信灯亮着的人”这里。',
        clueTag: '残页',
        sceneName: '窗边残页',
        themeColor: '#df9b63',
        rows: 3,
        cols: 3,
        timeLimit: 80,
        energyCost: 1,
        hints: 2
      }
    ]
  },
  {
    chapterId: 'ch02',
    title: '废弃剧场',
    summary: '聚光灯熄灭后，舞台与后台留下了新的目击证词。',
    levels: [
      {
        title: '红幕背影',
        introText: '舞台幕布刚刚被人掀开，痕迹还很新。',
        outroText: '幕布后的影子高度不对，真正藏人的不是那里。',
        clueTag: '幕布',
        sceneName: '废弃舞台',
        themeColor: '#b95248',
        rows: 3,
        cols: 3,
        timeLimit: 70,
        energyCost: 1,
        hints: 1
      },
      {
        title: '旧票根',
        introText: '散落座椅间的票根像是被故意留在这里。',
        outroText: '票面时间比剧场停业日期晚了三个月。',
        clueTag: '票根',
        sceneName: '旧影院座席',
        themeColor: '#d06a55',
        rows: 3,
        cols: 3,
        timeLimit: 70,
        energyCost: 1,
        hints: 1
      },
      {
        title: '灯控台编号',
        introText: '控制台上只剩几枚按键还泛着微光。',
        outroText: '被触发的不是主灯，而是顶灯吊架的检修回路。',
        clueTag: '灯控',
        sceneName: '灯控台',
        themeColor: '#88d0de',
        rows: 4,
        cols: 4,
        timeLimit: 70,
        energyCost: 1,
        hints: 1
      },
      {
        title: '后台衣箱',
        introText: '衣箱排列整齐，偏偏有一格盖子压不住。',
        outroText: '里面放的不是戏服，而是一张被拆开的平面图。',
        clueTag: '衣箱',
        sceneName: '后台衣箱',
        themeColor: '#ca8f63',
        rows: 4,
        cols: 4,
        timeLimit: 70,
        energyCost: 1,
        hints: 1
      }
    ]
  },
  {
    chapterId: 'ch03',
    title: '雨夜码头',
    summary: '冷风、雨幕和集装箱阴影，让案件开始指向真正的交易地点。',
    levels: [
      {
        title: '潮湿绳结',
        introText: '系船桩上的绳结打法很专业，不像普通渔民。',
        outroText: '绳结是临时改过的，原本停靠的根本不是这条船。',
        clueTag: '绳结',
        sceneName: '雨夜码头',
        themeColor: '#5cb0d6',
        rows: 4,
        cols: 4,
        timeLimit: 60,
        energyCost: 2,
        hints: 1
      },
      {
        title: '集装箱编号',
        introText: '雨把编号洗得模糊，只有零散字符还能辨得出来。',
        outroText: '编号顺序被人调换过，目标箱体藏在第三排。',
        clueTag: '编号',
        sceneName: '集装箱区',
        themeColor: '#e09c5d',
        rows: 4,
        cols: 4,
        timeLimit: 60,
        energyCost: 2,
        hints: 1
      },
      {
        title: '甲板水痕',
        introText: '水痕汇集在一个并不该积水的位置。',
        outroText: '有人从上层把箱子吊下时，故意掩盖了拖拽方向。',
        clueTag: '水痕',
        sceneName: '甲板水痕',
        themeColor: '#78cad9',
        rows: 4,
        cols: 4,
        timeLimit: 60,
        energyCost: 2,
        hints: 1
      },
      {
        title: '警戒灯塔',
        introText: '最后一组线索在岸边警戒灯塔附近。',
        outroText: '灯塔不是目击点，而是交易双方约定的倒计时信号。',
        clueTag: '灯塔',
        sceneName: '警戒灯塔',
        themeColor: '#f0c671',
        rows: 4,
        cols: 4,
        timeLimit: 60,
        energyCost: 2,
        hints: 1
      }
    ]
  }
];

const SCENES = [
  {
    name: '旧宅走廊',
    themeColor: '#de7c4a',
    background:
      'linear-gradient(180deg, #0f1725 0%, #2f4058 38%, #89522d 40%, #4a3428 67%, #17120f 100%), radial-gradient(circle at 20% 18%, rgba(255,233,203,0.92) 0 10%, rgba(255,233,203,0.06) 14%, transparent 15%), radial-gradient(circle at 78% 28%, rgba(124,179,255,0.56) 0 10%, transparent 16%), linear-gradient(90deg, transparent 0 26%, rgba(0,0,0,0.24) 26% 32%, transparent 32% 62%, rgba(0,0,0,0.22) 62% 68%, transparent 68% 100%)'
  },
  {
    name: '裂痕镜厅',
    themeColor: '#82b0e8',
    background:
      'linear-gradient(180deg, #121927 0%, #31445d 34%, #3f6178 35%, #253647 56%, #121b27 100%), linear-gradient(135deg, transparent 0 42%, rgba(230,246,255,0.9) 42% 43%, transparent 43% 57%, rgba(230,246,255,0.85) 57% 58%, transparent 58% 100%), radial-gradient(circle at 50% 22%, rgba(233,247,255,0.75) 0 12%, transparent 13%), linear-gradient(90deg, rgba(255,255,255,0.04) 0 18%, transparent 18% 82%, rgba(255,255,255,0.04) 82% 100%)'
  },
  {
    name: '地下台阶',
    themeColor: '#cfa16b',
    background:
      'linear-gradient(180deg, #18202d 0%, #273242 16%, #53606f 16% 31%, #303948 31% 46%, #5f6b79 46% 61%, #373e49 61% 76%, #707b85 76% 91%, #252c37 91% 100%), linear-gradient(90deg, rgba(0,0,0,0.24) 0 18%, transparent 18% 100%), radial-gradient(circle at 88% 20%, rgba(255,208,138,0.66) 0 10%, transparent 14%)'
  },
  {
    name: '窗边残页',
    themeColor: '#df9b63',
    background:
      'linear-gradient(180deg, #0e1723 0%, #24384f 35%, #8f5c3b 36%, #554031 60%, #19130f 100%), radial-gradient(circle at 30% 18%, rgba(255,245,227,0.86) 0 14%, transparent 15%), linear-gradient(115deg, rgba(255,255,255,0.15) 0 8%, transparent 8% 28%, rgba(255,255,255,0.12) 28% 36%, transparent 36% 100%), linear-gradient(0deg, transparent 0 72%, rgba(255,255,255,0.05) 72% 100%)'
  },
  {
    name: '废弃舞台',
    themeColor: '#b95248',
    background:
      'linear-gradient(180deg, #160f18 0%, #2d1d2b 24%, #7f2131 24% 62%, #2a1419 62% 100%), radial-gradient(circle at 50% 12%, rgba(255,225,185,0.9) 0 8%, rgba(255,225,185,0.15) 14%, transparent 16%), linear-gradient(90deg, transparent 0 18%, rgba(0,0,0,0.25) 18% 22%, transparent 22% 78%, rgba(0,0,0,0.25) 78% 82%, transparent 82% 100%)'
  },
  {
    name: '旧影院座席',
    themeColor: '#d06a55',
    background:
      'linear-gradient(180deg, #141927 0%, #273140 25%, #4b1e26 26% 40%, #6f2a34 40% 55%, #4b1e26 55% 70%, #2a2732 70% 100%), linear-gradient(90deg, transparent 0 8%, rgba(255,255,255,0.06) 8% 10%, transparent 10% 20%, rgba(255,255,255,0.06) 20% 22%, transparent 22% 100%), radial-gradient(circle at 80% 16%, rgba(255,214,154,0.68) 0 8%, transparent 12%)'
  },
  {
    name: '灯控台',
    themeColor: '#88d0de',
    background:
      'linear-gradient(180deg, #091018 0%, #132231 35%, #1a4050 36% 58%, #0d1724 58% 100%), linear-gradient(90deg, rgba(0,0,0,0.28) 0 11%, transparent 11% 30%, rgba(0,0,0,0.22) 30% 42%, transparent 42% 100%), radial-gradient(circle at 30% 24%, rgba(106,239,255,0.86) 0 6%, transparent 8%), radial-gradient(circle at 56% 42%, rgba(118,221,255,0.76) 0 7%, transparent 9%), radial-gradient(circle at 76% 66%, rgba(254,211,115,0.78) 0 6%, transparent 8%)'
  },
  {
    name: '后台衣箱',
    themeColor: '#ca8f63',
    background:
      'linear-gradient(180deg, #12161f 0%, #2c3440 20%, #60422e 20% 48%, #8b5d39 48% 76%, #2a211b 76% 100%), linear-gradient(90deg, rgba(255,255,255,0.04) 0 24%, transparent 24% 48%, rgba(255,255,255,0.04) 48% 52%, transparent 52% 76%, rgba(255,255,255,0.04) 76% 100%), radial-gradient(circle at 70% 20%, rgba(255,214,164,0.72) 0 9%, transparent 13%)'
  },
  {
    name: '雨夜码头',
    themeColor: '#5cb0d6',
    background:
      'linear-gradient(180deg, #0b1220 0%, #16253b 34%, #254968 35% 58%, #182b3b 58% 72%, #253544 72% 100%), linear-gradient(105deg, rgba(255,255,255,0.14) 0 2%, transparent 2% 8%, rgba(255,255,255,0.12) 8% 10%, transparent 10% 100%), radial-gradient(circle at 80% 18%, rgba(136,220,255,0.78) 0 8%, transparent 11%), linear-gradient(180deg, transparent 0 78%, rgba(53, 92, 124, 0.72) 78% 100%)'
  },
  {
    name: '集装箱区',
    themeColor: '#e09c5d',
    background:
      'linear-gradient(180deg, #121826 0%, #243346 28%, #b0613d 28% 48%, #815c49 48% 68%, #46708f 68% 100%), linear-gradient(90deg, rgba(0,0,0,0.24) 0 14%, transparent 14% 32%, rgba(0,0,0,0.18) 32% 36%, transparent 36% 60%, rgba(0,0,0,0.18) 60% 64%, transparent 64% 100%), radial-gradient(circle at 14% 18%, rgba(255,223,179,0.78) 0 8%, transparent 11%)'
  },
  {
    name: '甲板水痕',
    themeColor: '#78cad9',
    background:
      'linear-gradient(180deg, #0d1622 0%, #173048 28%, #2b6074 29% 52%, #2f4d59 52% 72%, #141c2a 72% 100%), radial-gradient(circle at 48% 60%, rgba(179,233,246,0.42) 0 18%, transparent 20%), linear-gradient(110deg, rgba(255,255,255,0.09) 0 2%, transparent 2% 18%, rgba(255,255,255,0.08) 18% 20%, transparent 20% 100%)'
  },
  {
    name: '警戒灯塔',
    themeColor: '#f0c671',
    background:
      'linear-gradient(180deg, #0c1321 0%, #152840 42%, #283b58 42% 70%, #151e2c 70% 100%), radial-gradient(circle at 62% 18%, rgba(255,217,116,0.94) 0 9%, rgba(255,217,116,0.18) 16%, transparent 18%), linear-gradient(90deg, transparent 0 54%, rgba(241,220,164,0.72) 54% 58%, transparent 58% 100%), linear-gradient(180deg, transparent 0 58%, rgba(255,255,255,0.05) 58% 100%)'
  }
];

const SCENE_MAP = {};
SCENES.forEach((scene) => {
  SCENE_MAP[scene.name] = scene;
});

function pad(num) {
  return `${num}`.padStart(2, '0');
}

const ALL_LEVELS = [];

CHAPTER_BLUEPRINTS.forEach((chapter, chapterIndex) => {
  chapter.levels.forEach((level, levelIndex) => {
    const scene = SCENE_MAP[level.sceneName] || SCENES[(levelIndex + chapterIndex) % SCENES.length];
    ALL_LEVELS.push({
      levelId: `${chapter.chapterId}-lv${pad(levelIndex + 1)}`,
      chapterId: chapter.chapterId,
      chapterTitle: chapter.title,
      title: level.title,
      introText: level.introText,
      outroText: level.outroText,
      clueTag: level.clueTag,
      sceneName: level.sceneName || scene.name,
      sceneStyle: level.sceneStyle || scene.background,
      themeColor: level.themeColor || scene.themeColor,
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
