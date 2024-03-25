const { execSync, exec, spawn } = require('child_process');
const { CronJob } = require('cron');
const stringSimilarity = require('string-similarity');
const {initWebSocketConnection} = require('./websocket');
const robot = require('robotjs');
const fs = require('fs');
// const FormData = require('form-data');
const fetch = require('node-fetch');
const path = require('path');
require('./node_modules/robotjs/build/Release/robotjs.node');
const jimp = require('jimp');
const Tesseract = require('tesseract.js');
const {
  findLargestWindow,
  getWindowPositionById,
  getAllWindowsIdByTitle,
  getWindowChrom,
} = require('./quant');

const {desktopSnapshot} = require('./snapshot');
const { TGTOKEN } = require('./config');

let windowPosition;
let width;
let height;
let watchingNow = false;
let intrId;
let botPosition;
let downloadPosition;
let runPosition;
let cycle = 0;
let oneHourTimer
let oneAndHalfHourTimer

const userName = process.env.USERNAME || process.env.USER;
const timer = startCountdown();
timer.stop()

const screenshotsFolder = 'screenshots';
if (!fs.existsSync(screenshotsFolder)) {
  fs.mkdirSync(screenshotsFolder);
}

async function getAllWindowsParamByTitle(title) {
  try {
    let windows = getAllWindowsIdByTitle(title);
    windows.forEach(window => {
      window.windowPosition = getWindowPositionById(window.id);
    });

    return windows;
  } catch (error) {
    console.error('Произошла ошибка:', error);
    throw error;
  }
}

async function getWindowParamByTitle(title) {
  try {
    const { id, width, height } = findLargestWindow(title);
    const windowPosition = getWindowPositionById(id);

    return { windowPosition, width, height };
  } catch (error) {
    console.error('Произошла ошибка:', error);
    throw error;
  }
}

async function getQuantWindowParam() {
  const title = 'Quant';
  try {
    const {
      windowPosition: newPosition,
      width: newWidth,
      height: newHeight,
    } = await getWindowParamByTitle(title);
    windowPosition = newPosition;
    width = newWidth;
    height = newHeight;
  } catch (error) {
    console.error('Произошла ошибка:', error);
    throw error;
  }
}


async function performOCRAndFindWords(p, w, h) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now()
    const screenFileName = `screen${timestamp}.png`; 
    const screenPath = path.join(screenshotsFolder, screenFileName); 
    const screen = robot.screen.capture(p.x - 10, p.y - 55, w + 10, h + 30);

    new jimp(screen.width, screen.height, async function (err, img) {
      // console.log(img);
      img.bitmap.data = screen.image;
      img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        var red = img.bitmap.data[idx + 0];
        var blue = img.bitmap.data[idx + 2];
        img.bitmap.data[idx + 0] = blue;
        img.bitmap.data[idx + 2] = red;
      });
      img.write(screenPath);
    });

    Tesseract.recognize(screenPath, 'eng', {
      logger: info => console.log(),
    }).then(({ data: { text, lines } }) => {
      // Выведите распознанный текст
      // console.log('Распознанный текст:', text);

      // Создайте объект для хранения слов и их координат
      const wordsWithCoordinates = [];

      // Обработайте каждую линию текста
      lines.forEach(line => {
        // Обработайте каждое слово в линии
        line.words.forEach(word => {
          // Добавьте слово и его координаты в объект
          wordsWithCoordinates.push({
            text: word.text,
            coordinates: {
              left: word.bbox.x0,
              top: word.bbox.y0,
              right: word.bbox.x1,
              bottom: word.bbox.y1,
            },
          });
        });
      });

      // Выведите объект с словами и их координатами

      // Удалите временный файл снимка
      // fs.unlinkSync('screen.png');
      resolve(wordsWithCoordinates);

      // return wordsWithCoordinates;
    });
  });
}

async function performOCRAndFindLines(p, w, h) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now()
    const screenFileName = `screen${timestamp}.png`; 
    const screenPath = path.join(screenshotsFolder, screenFileName); 
    const screen = robot.screen.capture(p.x - 10, p.y - 55, w + 10, h + 30);

    new jimp(screen.width, screen.height, async function (err, img) {
      // console.log(img);
      img.bitmap.data = screen.image;
      img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        var red = img.bitmap.data[idx + 0];
        var blue = img.bitmap.data[idx + 2];
        img.bitmap.data[idx + 0] = blue;
        img.bitmap.data[idx + 2] = red;
      });
      img.write(screenPath);
    });

    Tesseract.recognize(screenPath, 'eng', {
      logger: info => console.log(),
    }).then(({ data: { text, lines } }) => {
      // Выведите распознанный текст
      // console.log('Распознанный текст:', text);

      // Создайте объект для хранения слов и их координат
      const linesFinded = [];

      // Обработайте каждую линию текста
      lines.forEach(line => {
        // Обработайте каждое слово в линии
        linesFinded.push({
          text: line.text,
        });
      });

      // Выведите объект с словами и их координатами

      // Удалите временный файл снимка
      // fs.unlinkSync('screen.png');
      resolve(linesFinded);
      // return wordsWithCoordinates;
    });
  });
}



function moveMouse(x, y) {
  console.log(`mousemove to ${x} ${y}`);
  execSync(`xdotool mousemove ${x} ${y}`);
}
function mouseClick() {
  console.log(`mouseclick`);
  execSync(`xdotool click 1`);
}

async function findAndClick(name, position = undefined) {
  const targetWord = name.toLowerCase(); // Текст, который мы ищем
  if (position) {
    const [x, y] = position;
    await mouseMoveAndClick(x, y);
  } else {
    const wordsWithCoordinates = await performOCRAndFindWords(
      windowPosition,
      width,
      height
    );
    console.log('found strings splitet by word:', wordsWithCoordinates);
    const foundObject = wordsWithCoordinates.find(
      obj => obj.text.toLowerCase() === targetWord
    );

    if (foundObject) {
      console.log('foundObject:', foundObject);
      const { left, top } = foundObject.coordinates;
      await mouseMoveAndClick(
        windowPosition.x + left,
        windowPosition.y - 50 + top
      );
      // await new Promise(resolve => {
      //   moveMouse(windowPosition.x + left, windowPosition.y - 50 + top);
      //   mouseClick();
      //   setTimeout(() => {
      //     resolve([windowPosition.x + left, windowPosition.y - 50 + top]);
      //   }, 1500);
      // });
    }
  }
}

async function firstRun() {
  timer.reset()
  botPosition = await findAndClick('Bot');
  downloadPosition = await findAndClick('Download');
  await new Promise(resolve => {
    setTimeout(async () => {
      await findAndClick('Bot', botPosition);
      runPosition = await findAndClick('Run');
      resolve();
    }, 10000);
  });
}

async function proxyOn() {
  await findAndClick('Bot');
  await findAndClick('Proxy');
  await findAndClick('Test');
}

// setTimeout(firstRun, 5000);

async function runBot() {
  timer.reset()
  botPosition = await findAndClick('Bot', botPosition);
  downloadPosition = await findAndClick('Download', downloadPosition);
  await new Promise(resolve => {
    setTimeout(async () => {
      await findAndClick('Bot', botPosition);
      runPosition = await findAndClick('Run', runPosition);
      resolve();
    }, 10000);
  });
}

// startObservation()
function startObservation() {
  console.log('started observation');
  watchingNow = true;
  initWebSocketConnection(userName)
  intrId = setInterval(() => {
    handleQuantStatus(intrId);
  }, 45000);
}

async function handleQuantStatus(id) {
  await mouseMoveAndClick(windowPosition.x, windowPosition.y);
  const lines = await performOCRAndFindLines(windowPosition, width, height);
  console.log(lines);
  const foundLines = lines.filter(obj => obj.text.length >= 10);
  if (foundLines.length < 4) return;
  const foundLinesSliced = foundLines.slice(-4);

  const targetLine = 'The project was successfully uploaded';
  const targetLine2 = 'Failed to download the project';
  const targetLine3 = 'There is no project here';
  const targetLine4 = 'There are no available projects';
  const targetLine5 = 'You need to re-enter the Quant';
  const targetLine6 = 'Lost internet connection';
  const targetLine7 = 'Unable to connect to platform';
  const targetLine8 = 'Do you really want to interrupt the bot process';
  const targetLine9 = 'Bot was successfully interrupted';
  // Bot was successfully interrupted !
  // const targetWord = 'Login'
  //
  //
  //
  console.log('found strings:', foundLines);

  const isSimilar = (line, target) => {
    const similarity = stringSimilarity.compareTwoStrings(
      line.toLowerCase(),
      target.toLowerCase()
    );
    return similarity >= 0.74; // Порог сходства
  };

  const internetConnection = foundLines.some(line =>
    isSimilar(line.text, targetLine6)
  );

  const platformConnection = foundLines.some(line =>
    isSimilar(line.text, targetLine7)
  );

  const interruptProcess = foundLines.some(line =>
    isSimilar(line.text, targetLine8)
  );

  // const botInterrupted = foundLines.some(line =>
  //   isSimilar(line.text, targetLine9)
  // );

  const successfull = foundLinesSliced.some(line =>
    isSimilar(line.text, targetLine)
  );
  const failedDownload = foundLinesSliced.some(line =>
    isSimilar(line.text, targetLine2)
  );
  const directoryEmpty = foundLinesSliced.some(line =>
    isSimilar(line.text, targetLine3)
  );
  const needReOpen = foundLinesSliced.some(line =>
    isSimilar(line.text, targetLine5)
  );

  console.log('lostConnection', internetConnection || platformConnection);
  console.log('successfullyUploaded', successfull);
  console.log('failedDownload', failedDownload);
  console.log('directoryEmpty', directoryEmpty);
  console.log('needReOpenQuant', needReOpen);

  cycle += 1;
  if (cycle == 10) {
    cycle = 0;
    await findAndClick('Enter');
    return;
  }

  if (internetConnection || platformConnection) {
    const windows = await getAllWindowsParamByTitle('Quant');
    windows.forEach(async window => {
      const { windowPosition } = window;
      await mouseMoveAndClick(
        windowPosition.x + 215,
        windowPosition.y - 50 + 100
      );
    });
    if (internetConnection) {
      const chromeWindows = getWindowChrom();
    if (chromeWindows.length == 0) {
      clearInterval(id);
     reopenQuantAndCleanProject();
    } else return;
    }
    
  }

  if (interruptProcess) {
    const windows = await getAllWindowsParamByTitle('Quant');
    windows.forEach(async window => {
      const { windowPosition, width } = window;
      await mouseMoveAndClick(
        windowPosition.x + width - 15,
        windowPosition.y - 50 + 10
      );
    });
    return;
  }

  if (needReOpen) {
    clearInterval(id);
    reopenQuant();
    return;
  }

  if (directoryEmpty) {
    const noProject = foundLinesSliced.some(line =>
      isSimilar(line.text, targetLine4)
    );
    console.log('noProject', noProject);
    if (noProject) {
      console.log('no projects stop observation');
      clearInterval(id);
      watchingNow = false;
      timer.stop()
      fs.readdirSync(screenshotsFolder).forEach(file => {
        const filePath = path.join(screenshotsFolder, file);
        fs.unlinkSync(filePath);
      });
      return;
    } else {
      console.log("line 'There are no available projects' not found, run Bot");
      await runBot();
      return;
    }
  }

  if (successfull || failedDownload) {
    await runBot();
  }
}

function reopenQuant() {
  try {
    execSync('killall Quant');
} catch (error) {
  if (error.status === 1) {
    console.log('');
}
}

  const terminalTitle = 'TerminalLogs';

  const xtermProcess = spawn('xterm', ['-T', terminalTitle, '-e', '~/Quant/Quant'], {
    detached: true,
    stdio: ['ignore']
  });
  
  xtermProcess.unref();


  setTimeout(async () => {
    try {
      await getQuantWindowParam();
      startObservation();
      setTimeout(async () => {
        await proxyOn();
        await firstRun();
        startObservation();
      }, 5000);
    } catch (error) {
      console.log(error);
    }
  }, 30000);
}

function reopenQuantAndCleanProject() {
  execSync(`killall Quant`);
  const terminalTitle = 'TerminalLogs';
  const process = spawn('xterm', ['-T', terminalTitle, '-e', '~/Quant/Quant'], {
    detached: true,
    stdio: 'ignore',
  });

  process.unref();
  setTimeout(async () => {
    try {
      await getQuantWindowParam();
      
      CleanUp();
      setTimeout(async () => {
        await firstRun();
        startObservation();
      }, 5000);
    } catch (error) {
      console.log(error);
    }
  }, 30000);
}

function CleanUp() {
  const [filePath, fileName] = getProjectDirectoryAndName()

  if (filePath) {
    fs.unlinkSync(filePath);
    
    const msg = `Quant closed while processing project ${fileName} on machine ${userName}`;
    console.log(msg);
    sendNotification(msg);
  }
}

function getProjectDirectoryAndName() {
  const directoryPath = `/home/${userName}/Core/Projects/`;
  const files = fs.readdirSync(directoryPath);
  const file = files[0];
  if (!file) return [null, null]
  const filePath = path.join(directoryPath, file);
  const fileName = path.basename(filePath);
  return [filePath, fileName];
}

function mouseMoveAndClick(x, y) {
  return new Promise(resolve => {
    moveMouse(x, y);
    setTimeout(() => {
      mouseClick();
      setTimeout(() => {
        resolve([x, y]);
      }, 1500);
    }, 500);
  });
}

const observationTask = new CronJob(
  '20 7,8,9,10,11,13,15,17,19,21 * * 1-5',
  async () => {
    if (!watchingNow) {
      watchingNow = true;
      reopenQuant();
    } else {
      return;
    }
  },
  null,
  true,
  'Europe/Kiev'
);

observationTask.start();


function startCountdown() {
  const oneHour = 60 * 60 * 1000; // 1 час
  const oneAndHalfHour = 90 * 60 * 1000; // 1.5 часа
  
   oneHourTimer = !oneHourTimer && setTimeout(hourlySnapshot, oneHour);
   oneAndHalfHourTimer = !oneAndHalfHourTimer && setTimeout(OneAndHalfHourlySnapshot, oneAndHalfHour);

  return {
    stop: function() {
      oneHourTimer && clearTimeout(oneHourTimer);
      oneAndHalfHourTimer && clearTimeout(oneAndHalfHourTimer);
      oneHourTimer = null
      oneAndHalfHourTimer = null
    },
    reset: function() {
      oneHourTimer && clearTimeout(oneHourTimer);
      oneAndHalfHourTimer && clearTimeout(oneAndHalfHourTimer);
      oneHourTimer = null
      oneAndHalfHourTimer = null
      startCountdown();
    },
  };
}

async function hourlySnapshot() {
  const [filePath, fileName] = getProjectDirectoryAndName()
  const hourlySnapshotMsg = `Hourly snapshot timer expired on machine ${userName} while running the project ${fileName}`
  try {
    sendNotification(hourlySnapshotMsg)
    await desktopSnapshot()
  } catch (error) {
    
  }
}
async function OneAndHalfHourlySnapshot() {
  const [filePath, fileName] = getProjectDirectoryAndName()
  const BiHourlySnapshot = `The 1.5 hour snapshot timer expired on machine ${userName} while running the project ${fileName}`
  try {
    sendNotification(BiHourlySnapshot)
    await desktopSnapshot()
} catch (error) {
  
}}  


function sendNotification(msg) {
  const url =
    `https://api.telegram.org/bot${TGTOKEN}/sendMessage`;
  const data = {
    chat_id: '-1002022520053',
    parse_mode: 'HTML',
    text: `${msg}`,
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).catch(error => {
    console.error('Error:', error);
  });
}


(function init () {
  reopenQuant()
})()
