const robot = require('robotjs');
const fs = require('fs');

const jimp = require('jimp');
const Tesseract = require('tesseract.js');
const { windowPosition, id, width, height } = require('./quant');
console.log(windowPosition);
console.log(width);
console.log(height);

async function performOCRAndFindWords() {
  return new Promise((resolve, reject) => {
    const screen = robot.screen.capture(
      windowPosition.x,
      windowPosition.y - 50,
      width,
      height
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
      console.log('Распознанный текст:', text);

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

async function performOCRAndFindLines() {
  return new Promise((resolve, reject) => {
    const screen = robot.screen.capture(
      windowPosition.x,
      windowPosition.y - 50,
      width,
      height
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
      console.log('Распознанный текст:', text);

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

async function findAndClick(name) {
  const targetWord = name; // Текст, который мы ищем

  const wordsWithCoordinates = await performOCRAndFindWords();
  console.log('Слова с координатами:', wordsWithCoordinates);
  const foundObject = wordsWithCoordinates.find(obj => obj.text === targetWord);

  if (foundObject) {
    console.log('Найден объект:', foundObject);
    const { left, top } = foundObject.coordinates;
    await new Promise(resolve => {
      robot.moveMouse(windowPosition.x + left, windowPosition.y - 50 + top);
      robot.mouseClick('left');
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }
}

async function runBot() {
  await findAndClick('Bot');
  await findAndClick('Download');
  await new Promise(resolve => {
    setTimeout(async () => {
      await findAndClick('Bot');
      await findAndClick('Run');
      resolve();
    }, 15000);
  });
}

// (async () => {
//   // const handle = getWindowHandleByTitle(targetWindowTitle);
//   // console.log(handle);

//   // if (handle !== 0) {
//     // const rect = getWindowRect(handle);
//     /

//     // if (textCoordinates) {
//     //   console.log(
//     //     `Найден текст "${targetText}" в координатах:`,
//     //     textCoordinates
//     //   );
//     //   // Твой код для дальнейших действий
//     // } else {
//     //   console.log(`Текст "${targetText}" не найден в заданной области.`);
//     // }
//     // Предположим, что координаты кнопки "File" внутри окна равны (x, y)
//     // const fileButtonX = rect.left + 50; // Замени на фактические значения
//     // const fileButtonY = rect.top + 50; // Замени на фактические значения

//     // // Вызови функцию для клика по кнопке "File"
//     // clickAt(fileButtonX, fileButtonY);
//   // } else {
//   //   console.error('Window not found');
//   // }
// })();

const intrId = setInterval(async () => {
  const foundLines = await performOCRAndFindLines();
  const targetLine = 'The project was successfully uploaded';
  const targetLine2 = 'Failed to download the project';
  const targetLine3 = 'There is no project here';
  //
  //
  console.log('найденые строки:', foundLines);

  if (foundLines.length < 4) return;
  const noProject = false;

  const successfull =
    foundLines[foundLines.length - 1].text.includes(targetLine) ||
    foundLines[foundLines.length - 2].text.includes(targetLine) ||
    foundLines[foundLines.length - 3].text.includes(targetLine) ||
    foundLines[foundLines.length - 4].text.includes(targetLine);
  const failedDownload =
    foundLines[foundLines.length - 1].text.includes(targetLine2) ||
    foundLines[foundLines.length - 2].text.includes(targetLine2) ||
    foundLines[foundLines.length - 3].text.includes(targetLine2) ||
    foundLines[foundLines.length - 4].text.includes(targetLine2);

  if (noProject) {
    clearInterval(intrId);
    return;
  }
  if (successfull || failedDownload) {
    await runBot();
  }
}, 60000);
