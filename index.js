const robot = require('robotjs');
const fs = require('fs');
const ffi = require('ffi-napi');
const jimp = require('jimp');
const Tesseract = require('tesseract.js');
// const screenSize = robot.getScreenSize();
// console.log(screenSize);
// const worker = await createWorker('eng');
const targetWindowTitle = 'Quant';

const user32 = new ffi.Library('user32', {
  FindWindowA: ['int', ['string', 'string']],
  GetWindowRect: ['bool', ['int', 'pointer']],
  GetWindowTextA: ['int', ['int', 'string', 'int']],
});

// Function to get the handle of the window by title
function getWindowHandleByTitle(title) {
  return user32.FindWindowA(null, title);
}

// Function to get the window rectangle (position and size)
function getWindowRect(handle) {
  const rectBuffer = Buffer.alloc(16); // 4 int'а по 4 байта
  user32.GetWindowRect(handle, rectBuffer);

  const rect = [];
  for (let i = 0; i < 4; i++) {
    rect.push(rectBuffer.readInt32LE(i * 4));
  }

  return {
    left: rect[0],
    top: rect[1],
    right: rect[2],
    bottom: rect[3],
  };
}

async function performOCRAndFindWords(rect) {
  return new Promise((resolve, reject) => {
    const screen = robot.screen.capture(
      rect.left,
      rect.top,
      rect.right - rect.left,
      rect.bottom - rect.top
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

async function performOCRAndFindLines(rect) {
  return new Promise((resolve, reject) => {
    const screen = robot.screen.capture(
      rect.left,
      rect.top,
      rect.right - rect.left,
      rect.bottom - rect.top
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
      // fs.unlinkSync('screen.png');
      resolve(linesFinded);
      // return wordsWithCoordinates;
    });
  });
}

// async function performOCRAndFindText(rect, targetText) {
//   return new Promise((resolve, reject) => {
//     const image = robot.screen.capture(
//       rect.left,
//       rect.top,
//       rect.right - rect.left,
//       rect.bottom - rect.top
//     );

//     Tesseract.recognize(image.bitmap, 'eng', {
//       logger: info => {
//         if (info.progress === 100) {
//           const foundText = info.data.text;
//           const textIndex = foundText.indexOf(targetText);

//           if (textIndex !== -1) {
//             const charWidth = image.width / foundText.length;
//             const charHeight = image.height;

//             const startX = rect.left + textIndex * charWidth;
//             const startY = rect.top;
//             const endX = startX + targetText.length * charWidth;
//             const endY = rect.bottom;

//             const textCoordinates = {
//               startX: Math.round(startX),
//               startY: Math.round(startY),
//               endX: Math.round(endX),
//               endY: Math.round(endY),
//             };

//             resolve(textCoordinates);
//           } else {
//             resolve(null); // Текст не найден
//           }
//         }
//       },
//     });
//   });
// }

// (async () => {
//   const handle = getWindowHandleByTitle(targetWindowTitle);
//   // console.log(handle);

//   if (handle !== 0) {
//     const rect = getWindowRect(handle);
//     console.log('Window Rect:', rect);
//     const targetWord = 'File'; // Текст, который мы ищем

//     const wordsWithCoordinates = await performOCRAndFindLines(rect);
//     console.log('Слова с координатами:', wordsWithCoordinates);
//     const foundObject = wordsWithCoordinates.find(
//       obj => obj.text === targetWord
//     );

//     if (foundObject) {
//       console.log('Найден объект:', foundObject);
//       const { left, top } = foundObject.coordinates;
//       robot.moveMouse(rect.left + left, rect.top + top);
//       robot.mouseClick('left');
//     } else {
//       console.log('Объект с текстом', targetText, 'не найден.');
//     }

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
//   } else {
//     console.error('Window not found');
//   }
// })();

(async () => {
  const handle = getWindowHandleByTitle(targetWindowTitle);
  // console.log(handle);

  if (handle !== 0) {
    const rect = getWindowRect(handle);
    console.log('Window Rect:', rect);
    const targetWord = 'File'; // Текст, который мы ищем

    const wordsWithCoordinates = await performOCRAndFindLines(rect);
    console.log('', wordsWithCoordinates);

    // if (textCoordinates) {
    //   console.log(
    //     `Найден текст "${targetText}" в координатах:`,
    //     textCoordinates
    //   );
    //   // Твой код для дальнейших действий
    // } else {
    //   console.log(`Текст "${targetText}" не найден в заданной области.`);
    // }
    // Предположим, что координаты кнопки "File" внутри окна равны (x, y)
    // const fileButtonX = rect.left + 50; // Замени на фактические значения
    // const fileButtonY = rect.top + 50; // Замени на фактические значения

    // // Вызови функцию для клика по кнопке "File"
    // clickAt(fileButtonX, fileButtonY);
  } else {
    console.error('Window not found');
  }
})();
