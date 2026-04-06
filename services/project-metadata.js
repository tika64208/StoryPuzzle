const levels = require('../data/levels');

function getProjectMetadata() {
  const chapters = levels.getChapters();
  const allLevels = levels.getAllLevels();
  const currentChapter = chapters[0] || null;
  const firstLevel = allLevels[0] || null;

  return {
    chapterCount: chapters.length,
    totalLevels: allLevels.length,
    currentChapterId: currentChapter ? currentChapter.chapterId : '',
    currentChapterTitle: currentChapter ? currentChapter.title : '',
    firstLevelId: firstLevel ? firstLevel.levelId : '',
    firstLevelTitle: firstLevel ? firstLevel.title : '',
    chapterTitles: chapters.map((chapter) => chapter.title)
  };
}

module.exports = {
  getProjectMetadata
};
