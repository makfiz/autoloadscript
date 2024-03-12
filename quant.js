const { execSync } = require('child_process');

function getWindowGeometryById(windowId) {
  try {
    const command = `xdotool getwindowgeometry ${windowId}`;
    const result = execSync(command, { encoding: 'utf-8' });
    const windowGeometry = result.trim();
    return windowGeometry;
  } catch (error) {
    console.error(`Error while getting geometry for Window ID ${windowId}: ${error.message}`);
    return null;
  }
}

function getWindowIdByTitle(title) {
  try {
    const command = `xdotool search --name "${title}"`;
    const result = execSync(command, { encoding: 'utf-8' });
    const windowIds = result.trim().split('\n');
    return windowIds;
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

function findLargestWindow(title) {
  const windowIds = getWindowIdByTitle(title);

  let largestWindowId = null;
  let largestWindowWidth = 0;
  let largestWindowHeight = 0;

  windowIds.forEach((windowId) => {
    const windowGeometry = getWindowGeometryById(windowId);
    console.log(`  Window Geometry: ${windowGeometry}`);

    if (windowGeometry) {
      // Разбираем строку с геометрией
      const [, width, height] = windowGeometry.match(/Geometry:\s+(\d+)x(\d+)/) || [];
      const currentWidth = parseInt(width, 10);
      const currentHeight = parseInt(height, 10);

      // Сравниваем с текущим наибольшим окном
      if (currentWidth * currentHeight > largestWindowWidth * largestWindowHeight) {
        largestWindowId = windowId;
        largestWindowWidth = currentWidth;
        largestWindowHeight = currentHeight;
      }
    }
  });

  return { id: largestWindowId, width: largestWindowWidth, height: largestWindowHeight };
}

function getAllWindowsIdByTitle(title) {
  const windowIds = getWindowIdByTitle(title);
  const AllWindows = [];

  windowIds.forEach((windowId) => {
    const windowGeometry = getWindowGeometryById(windowId);
    console.log(`  Window Geometry: ${windowGeometry}`);

    if (windowGeometry) {
      const [, width, height] = windowGeometry.match(/Geometry:\s+(\d+)x(\d+)/) || [];
      const currentWidth = parseInt(width, 10);

      if (currentWidth > 100) {
        const currentHeight = parseInt(height, 10);
        AllWindows.push({ id: windowId, width: currentWidth, height: currentHeight });
      }
    }
  });

  return AllWindows;
}

function getWindowPositionById(windowId) {
    const windowGeometry = getWindowGeometryById(windowId);
  
    if (windowGeometry) {
      // Разбираем строку с геометрией и получаем позицию окна
      const [, x, y] = windowGeometry.match(/Position:\s+(\d+),(\d+)/) || [];
      
      if (x !== undefined && y !== undefined) {
        return { x: parseInt(x, 10), y: parseInt(y, 10) };
      }
    }
  
    return null;
  }

  function getWindowChrom() {
    try {
      const command = `xdotool search --name "Google Chrome"`;
      const result = execSync(command, { encoding: 'utf-8' });
      const windowIds = result.trim().split('\n');
      console.log(windowIds)
      return windowIds;
    } catch (error) {
      console.error('Error:', error.message);
      return [];
    }
  }

module.exports = {
  findLargestWindow,
  getWindowPositionById,
  getAllWindowsIdByTitle,
  getWindowChrom
  };