const CHAPTER_BLUEPRINTS = [
  {
    chapterId: 'ch05',
    title: '倩女幽魂·双生局',
    summary: '自兰若夜访起局，以假死骗过妖耳，以封印改写命数；十六幕双生局在兰若寺的风雨与月色中层层展开。',
    levels: [
      {
        title: '暴雨古道',
        introText: '暴雨如注，泥泞古道上破伞翻滚。宁采臣逆风狂奔，远处歪斜的寺庙剪影在闪电中一瞬显形。',
        outroText: '他追着那一点残灯奔去，兰若寺终于在雷光尽头露出真容。',
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
        title: '残殿熄灯',
        introText: '宁采臣撞开半朽寺门，蝙蝠惊起。火柴刚点亮一盏孤灯，阴风便掠过佛前，将火苗瞬间吹灭。',
        outroText: '他没有惊叫，只抬手在门框上悄悄画下一道符文，像是早有准备。',
        clueTag: '残殿',
        sceneName: '残殿熄灯',
        themeColor: '#76859c',
        rows: 3,
        cols: 3,
        timeLimit: 95,
        energyCost: 1,
        hints: 2
      },
      {
        title: '枯井红衣',
        introText: '月色惨白，寺后荒院里一口枯井寂然无声。红衣女子背对而立，半张脸绝美，半张脸已被尸气侵蚀。',
        outroText: '她低声念出“第十七个了”，随即离地而起，向正殿悄然飞去。',
        clueTag: '枯井',
        sceneName: '枯井红衣',
        themeColor: '#8c4f6d',
        rows: 3,
        cols: 3,
        timeLimit: 100,
        energyCost: 1,
        hints: 2
      },
      {
        title: '横梁倒悬',
        introText: '宁采臣倚柱假寐，一缕冰凉发丝却先垂落到脸前。小倩自横梁倒悬而下，与他只隔一寸四目相对。',
        outroText: '她刚要魅语试探，宁采臣却先一句点破她身上的尸气，让她瞳孔骤缩。',
        clueTag: '倒悬',
        sceneName: '横梁倒悬',
        themeColor: '#6d7ca8',
        rows: 4,
        cols: 4,
        timeLimit: 110,
        energyCost: 1,
        hints: 2
      },
      {
        title: '妖录窥名',
        introText: '宁采臣抽出破旧蓝皮《妖灵录》，书页翻开，纸上赫然就是聂小倩的画像与来历。',
        outroText: '“一个写故事的。”他含笑答她，也第一次让她意识到眼前人绝非普通书生。',
        clueTag: '妖录',
        sceneName: '妖录窥名',
        themeColor: '#8a7a93',
        rows: 4,
        cols: 4,
        timeLimit: 120,
        energyCost: 1,
        hints: 2
      },
      {
        title: '金索辨魂',
        introText: '书页离手化作金色灵索，缠住小倩手腕。青烟腾起，腐肉剥落，露出白玉般的骨节。',
        outroText: '宁采臣看出她怨气不足三成，当场戳穿了一个真相：她根本没有杀过人。',
        clueTag: '金索',
        sceneName: '金索辨魂',
        themeColor: '#c1a56a',
        rows: 4,
        cols: 4,
        timeLimit: 130,
        energyCost: 1,
        hints: 2
      },
      {
        title: '巫女旧祭',
        introText: '灰白水墨般的旧梦铺开。少女时代的小倩立于祭坛，决意以生魂为引，将树妖封入阵中十年。',
        outroText: '那不是被迫的牺牲，而是她在生前就已做出的选择。',
        clueTag: '祭坛',
        sceneName: '巫女旧祭',
        themeColor: '#c7c9cf',
        rows: 4,
        cols: 4,
        timeLimit: 140,
        energyCost: 2,
        hints: 1
      },
      {
        title: '双生同谋',
        introText: '宁采臣松开金索，提出一场更危险的交易：她继续假装听命于姥姥，而他把自己当成饵，演一场戏。',
        outroText: '小倩第一次真正看向他，明白这不是猎人与猎物，而是两个赌命的人站到了一边。',
        clueTag: '同谋',
        sceneName: '双生同谋',
        themeColor: '#7d8eb8',
        rows: 4,
        cols: 4,
        timeLimit: 150,
        energyCost: 2,
        hints: 1
      },
      {
        title: '假死骗局',
        introText: '小倩压在宁采臣身上，故作吸食阳气。门外黑雾窥视而去，而宁采臣翻白眼吐舌的演技夸张得过分。',
        outroText: '戏骗过了姥姥的耳目，却也让两人的命运真正绑在了一处。',
        clueTag: '假死',
        sceneName: '假死骗局',
        themeColor: '#a35b7c',
        rows: 4,
        cols: 4,
        timeLimit: 160,
        energyCost: 2,
        hints: 1
      },
      {
        title: '地宫槐影',
        introText: '地宫深处，半座洞穴都被槐木与人脸覆盖。姥姥张开群声重叠的巨口，终于露出了真正的真身。',
        outroText: '当她点名要把书生和小倩一并带来时，最后的局也随之合拢。',
        clueTag: '姥姥',
        sceneName: '地宫槐影',
        themeColor: '#5f6a52',
        rows: 4,
        cols: 4,
        timeLimit: 165,
        energyCost: 2,
        hints: 1
      },
      {
        title: '树根拖命',
        introText: '数十条树根破地而出，将二人一并拖向地下。宁采臣暗中捏碎玉佩，金色符文沿着树根悄然蔓延。',
        outroText: '小倩看懂了他的动作，也终于对这场赌命之局点下了头。',
        clueTag: '树根',
        sceneName: '树根拖命',
        themeColor: '#5d6d56',
        rows: 4,
        cols: 4,
        timeLimit: 170,
        energyCost: 2,
        hints: 1
      },
      {
        title: '封印决战',
        introText: '姥姥将二人卷至树干前欲一口吞噬。宁采臣暴喝，满身符文炸亮成金链，小倩趁势以巫女之血重启封印阵。',
        outroText: '锁链锁住主干，法阵闭合成形，真正的决战在这一刻终于落下。 ',
        clueTag: '封印',
        sceneName: '封印决战',
        themeColor: '#b9995a',
        rows: 4,
        cols: 5,
        timeLimit: 175,
        energyCost: 2,
        hints: 1
      },
      {
        title: '魂光将散',
        introText: '姥姥石化，小倩的灵魂却也开始从脚下化为蓝色光点。她望着宁采臣，第一次露出真正安静的微笑。',
        outroText: '赢下这一局的代价，是她将从这世上慢慢消失。',
        clueTag: '魂散',
        sceneName: '魂光将散',
        themeColor: '#7398cc',
        rows: 4,
        cols: 5,
        timeLimit: 185,
        energyCost: 2,
        hints: 1
      },
      {
        title: '一页留魂',
        introText: '宁采臣咬破舌尖，将寿命为墨，血点落在《妖灵录》小倩那一页上，强行把她的魂魄封入书中。',
        outroText: '“这剧本我说了算。”这一次，他硬把她从消散的边缘拽了回来。',
        clueTag: '留魂',
        sceneName: '一页留魂',
        themeColor: '#8f8db3',
        rows: 4,
        cols: 4,
        timeLimit: 170,
        energyCost: 2,
        hints: 1
      },
      {
        title: '兰若黎明',
        introText: '寺庙在封印余波中倾塌，宁采臣抱着《妖灵录》走出灰烬。破晓的冷光中，一切终于归于寂静。',
        outroText: '最后一页画像微微眨眼，像是有人隔着纸页，对他轻轻回望。',
        clueTag: '黎明',
        sceneName: '兰若黎明',
        themeColor: '#7c7166',
        rows: 4,
        cols: 4,
        timeLimit: 175,
        energyCost: 2,
        hints: 1
      },
      {
        title: '篝火长行',
        introText: '后来宁采臣抱着《妖灵录》走过很多地方。月圆之夜，篝火旁总会多出一抹若有若无的影子。',
        outroText: '从此他写人间故事，她坐在火光另一侧安静听着，兰若寺的夜却再没有真正结束。',
        clueTag: '长行',
        sceneName: '篝火长行',
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
