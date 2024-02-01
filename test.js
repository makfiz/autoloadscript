const fs = require('fs');
const Tesseract = require('tesseract.js');
const screenshot = require('desktop-screenshot');

// Сделайте снимок экрана и сохраните его в файл
screenshot('screenshot.png', function (error, complete) {
  if (error) {
    console.error(error);
    return;
  }

  // Используйте Tesseract для распознавания текста
  Tesseract.recognize(
    'screenshot.png',
    'eng', // Язык распознавания (может потребоваться установка языковых данных)
    { logger: info => console.log(info) } // Опциональный логгер
  ).then(({ data: { text } }) => {
    // Выведите распознанный текст
    console.log(text);

    // Удалите временный файл снимка
    fs.unlinkSync('screenshot.png');
  });
});
