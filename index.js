const { execSync, exec } = require('child_process');
const { CronJob } = require('cron');
const stringSimilarity = require('string-similarity');
const robot = require('robotjs');
const fs = require('fs');
require('./node_modules/robotjs/build/Release/robotjs.node');
const jimp = require('jimp');
const Tesseract = require('tesseract.js');
const { findLargestWindow, getWindowPositionById } = require('./quant');

let windowPosition;
let width;
let height;
let watchingNow = false;
let intrId;
let botPosition;
let downloadPosition;
let runPosition;


async function getWindowParam(title) {
  try {
    const { id, width, height } = findLargestWindow(title);
    const windowPosition = getWindowPositionById(id);

    return {windowPosition,width, height}
  } catch (error) {
    console.error('Произошла ошибка:', error);
    throw error;
  }
}

async function getQuantWindowParam() {
  const title = 'Quant';
  try {
    const { windowPosition:newPosition, width: newWidth, height: newHeight } = await getWindowParam(title);
    windowPosition = newPosition;
    width = newWidth;
    height = newHeight;
  } catch (error) {
    console.error('Произошла ошибка:', error);
    throw error;
  }
}


// async function getQuantWindowParam() {
//   const title = 'Quant';
//   try {
//     const { id, width: newWidth, height: newHeight } = findLargestWindow(title);
//     const newPosition = getWindowPositionById(id);
//     windowPosition = newPosition;
//     width = newWidth;
//     height = newHeight;
//   } catch (error) {
//     console.error('Произошла ошибка:', error);
//     throw error;
//   }
// }

getQuantWindowParam();

async function performOCRAndFindWords(p,w,h) {
  return new Promise((resolve, reject) => {
    const screen = robot.screen.capture(
      p.x -10,
      p.y -55 ,
      w + 10,
      h+30
    );

    new jimp(screen.width, screen.height, async function (err, img) {
      // console.log(img);
      img.bitmap.data = screen.image;
      img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        var red = img.bitmap.data[idx + 0];
        var blue = img.bitmap.data[idx + 2];
        img.bitmap.data[idx + 0] = blue;
        img.bitmap.data[idx + 2] = red;
      });
      img.write('screen.png');
    });

    Tesseract.recognize('screen.png', 'eng', {
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
      fs.unlinkSync('screen.png');
      resolve(wordsWithCoordinates);
     
      // return wordsWithCoordinates;
    });
  });
}

async function performOCRAndFindLines(p,w,h) {
  return new Promise((resolve, reject) => {
    const screen = robot.screen.capture(
      p.x -10,
      p.y -55 ,
      w + 10,
      h+30
    );

    new jimp(screen.width, screen.height, async function (err, img) {
      // console.log(img);
      img.bitmap.data = screen.image;
      img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        var red = img.bitmap.data[idx + 0];
        var blue = img.bitmap.data[idx + 2];
        img.bitmap.data[idx + 0] = blue;
        img.bitmap.data[idx + 2] = red;
      });
      img.write('screen.png');
    });

    Tesseract.recognize('screen.png', 'eng', {
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
      fs.unlinkSync('screen.png');
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
  const targetWord = name; // Текст, который мы ищем
  if (position) {
    const [x, y] = position;
    await new Promise(resolve => {
      try {
        moveMouse(x, y);
        mouseClick();
      } catch (error) {
        console.log('findAndClick err:', error);
      }

      setTimeout(() => {
        resolve([x, y]);
      }, 1500);
    });
  } else {
    const wordsWithCoordinates = await performOCRAndFindWords(windowPosition,width,height);
    console.log('found strings splitet by word:', wordsWithCoordinates);
    const foundObject = wordsWithCoordinates.find(
      obj => obj.text === targetWord
    );

    if (foundObject) {
      console.log('foundObject:', foundObject);
      const { left, top } = foundObject.coordinates;
      await new Promise(resolve => {
        moveMouse(windowPosition.x + left, windowPosition.y - 50 + top);
        mouseClick();
        setTimeout(() => {
          resolve([windowPosition.x + left, windowPosition.y - 50 + top]);
        }, 1500);
      });
    }
  }
}

async function firstRun() {
  botPosition = await findAndClick('Bot');
  downloadPosition = await findAndClick('Download');
  await new Promise(resolve => {
    setTimeout(async () => {
      await findAndClick('Bot');
      runPosition = await findAndClick('Run');
      resolve();
    }, 15000);
  });
}

setTimeout(firstRun, 5000);

async function runBot() {
  botPosition = await findAndClick('Bot', botPosition);
  downloadPosition = await findAndClick('Download', downloadPosition);
  await new Promise(resolve => {
    setTimeout(async () => {
      await findAndClick('Bot', botPosition);
      runPosition = await findAndClick('Run', runPosition);
      resolve();
    }, 15000);
  });
}

startObservation();
function startObservation() {
  console.log('started observation');
  watchingNow = true;
  intrId = setInterval(() => {
    handleQuantStatus(intrId);
  }, 60000);
}


async function handleQuantStatus(id) {
  moveMouse(windowPosition.x, windowPosition.y);
  mouseClick();
  const lines = await performOCRAndFindLines(windowPosition,width,height);
  const foundLines = lines.filter(obj => obj.text.length >= 10);
  if (foundLines.length < 4) return;
  const targetLines = foundLines.slice(-4);

  const targetLine = 'The project was successfully uploaded';
  const targetLine2 = 'Failed to download the project';
  const targetLine3 = 'There is no project here';
  const targetLine4 = 'There are no available projects';
  const targetLine5 = 'You need to re-enter the Quant';
  const targetLine6 = "Lost internet connection"
  const targetLine7 = "Unable to connect to platform"
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

  const successfull = targetLines.some(line =>
    isSimilar(line.text, targetLine)
  );
  const failedDownload = targetLines.some(line =>
    isSimilar(line.text, targetLine2)
  );
  const directoryEmpty = targetLines.some(line =>
    isSimilar(line.text, targetLine3)
  );
  const needReOpen = targetLines.some(line =>
    isSimilar(line.text, targetLine5)
  );

  console.log('lostConnection', internetConnection || platformConnection);
  console.log('successfullyUploaded', successfull);
  console.log('failedDownload', failedDownload);
  console.log('directoryEmpty', directoryEmpty);
  console.log('needReOpenQuant', needReOpen);


  if (internetConnection || platformConnection) {
    const targetWord = 'Retry'
    const { windowPosition, width, height} = await getWindowParam('Quant');
    const wordsWithCoordinates = await performOCRAndFindWords(windowPosition,width,height);
    console.log('wordsWithCoordinates:', wordsWithCoordinates);
    
    const foundObject = wordsWithCoordinates.find(
      obj => obj.text.includes(targetWord))
      
      console.log('foundObject:', foundObject);
    if (foundObject) {
     
      const { left, top } = foundObject.coordinates;
      await new Promise(resolve => {
        moveMouse(windowPosition.x + left, windowPosition.y - 50 + top);
        mouseClick();
        setTimeout(() => {
          resolve([windowPosition.x + left, windowPosition.y - 50 + top]);
        }, 1500);
      });
    }
    return
  }

  if (needReOpen) {
    clearInterval(id);
    reopenQuant()
    return
  }

  if (directoryEmpty) {
    const noProject = targetLines.some(line =>
      isSimilar(line.text, targetLine4)
    );
    console.log('noProject', noProject);
    if (noProject) {
      console.log('no projects stop observation');
      clearInterval(id);
      watchingNow = false;
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
  execSync(`killall Quant`);
  exec(`~/Quant/Quant`);
  setTimeout(async () => {
    try {
      await getQuantWindowParam();
      await firstRun();
      startObservation();
    } catch (error) {
      console.log(error)
    }
  }, 60000);
}

const observationTask = new CronJob(
  '40 7,14,21 * * 1-5',
  async () => {
    if (!watchingNow) {
      watchingNow = true;
      await firstRun();
      startObservation();
    } else {
      return;
    }
  },
  null,
  true,
  'Europe/Kiev'
);

observationTask.start();
