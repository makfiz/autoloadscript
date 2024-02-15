const { execSync } = require('child_process');
const { CronJob } = require('cron');
const robot = require('robotjs');
const fs = require('fs');
require('./node_modules/robotjs/build/Release/robotjs.node');
const jimp = require('jimp');
const Tesseract = require('tesseract.js');
const {  windowPosition,
  id,
  width,
  height} = require('./quant')
  
let watchingNow = false


async function performOCRAndFindWords() {
  return new Promise((resolve, reject) => {
    const screen = robot.screen.capture(
      windowPosition.x,
      windowPosition.y-50,
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

async function performOCRAndFindLines() {
  return new Promise((resolve, reject) => {
    const screen = robot.screen.capture(
      windowPosition.x,
      windowPosition.y-50,
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

function moveMouse (x, y) {
  console.log(`mousemove to ${x} ${y}`)
  execSync(`xdotool mousemove ${x} ${y}`)
}
function mouseClick () {
  console.log(`mouseclick`)
  execSync(`xdotool click 1`)
}


async function findAndClick (name, position = undefined) {
  const targetWord = name; // Текст, который мы ищем
  if (position) {
    const [x , y] = position
    await new Promise((resolve) => {
      try {
        moveMouse(x, y);
        mouseClick();
      } catch (error) {
        console.log("findAndClick err:",error)
      }
     
      setTimeout(() => {
        resolve([x, y]);
      }, 1000);
    });
  } else {
    const wordsWithCoordinates = await performOCRAndFindWords();
  console.log('found strings splitet by word:', wordsWithCoordinates);
  const foundObject = wordsWithCoordinates.find(
    obj => obj.text === targetWord
  );

  if (foundObject) {
    console.log('foundObject:', foundObject);
    const { left, top } = foundObject.coordinates;
    await new Promise((resolve) => {
      moveMouse(windowPosition.x + left, windowPosition.y-50 + top);
      mouseClick();
      setTimeout(() => {
        resolve([windowPosition.x + left, windowPosition.y-50 + top]);
      }, 1000);
    });
    
   
    
  } 
  }
  
}

let botPosition 
let downloadPosition
let runPosition


async function firstRun () {
  botPosition = await findAndClick("Bot")
  downloadPosition = await findAndClick("Download")
 await   new Promise((resolve) => {
  setTimeout(async ()=>{
    
    await findAndClick("Bot")
    runPosition = await findAndClick("Run")
    resolve()
  }, 15000)
 })
 


}

setTimeout(firstRun,10000)


async function runBot () {
  botPosition = await findAndClick("Bot", botPosition)
  downloadPosition = await findAndClick("Download", downloadPosition)
 await   new Promise((resolve) => {
  setTimeout(async ()=>{
    
    await findAndClick("Bot", botPosition)
    runPosition = await findAndClick("Run", runPosition)
    resolve()
  }, 15000)
 })
 


}

startObservation()
function startObservation () {
  console.log("started observation")
  watchingNow = true
  const intrId = setInterval(()=>{
    handleQuantStatus(intrId)
  },60000)
  
  
 
}

async function handleQuantStatus (id) {

  const lines = await performOCRAndFindLines();
  const foundLines = lines.filter(obj => obj.text.length >= 10);
  const targetLine = 'The project was successfully uploaded';
  const targetLine2 = 'Failed to download the project';
  const targetLine3 = 'There is no project here';
  const targetLine4 = "There are no available projects"
  
  // 
  // 
  console.log('found strings:', foundLines);

   if (foundLines.length <4) return

  const successfull =     foundLines[foundLines.length-1].text.includes(targetLine) || 
  foundLines[foundLines.length-2].text.includes(targetLine) || 
  foundLines[foundLines.length-3].text.includes(targetLine) || 
  foundLines[foundLines.length-4].text.includes(targetLine) 
  const failedDownload =     foundLines[foundLines.length-1].text.includes(targetLine2) || 
  foundLines[foundLines.length-2].text.includes(targetLine2) || 
  foundLines[foundLines.length-3].text.includes(targetLine2) || 
  foundLines[foundLines.length-4].text.includes(targetLine2) 

  const directoryEmpty =     foundLines[foundLines.length-1].text.includes(targetLine3) || 
  foundLines[foundLines.length-2].text.includes(targetLine3) || 
  foundLines[foundLines.length-3].text.includes(targetLine3) || 
  foundLines[foundLines.length-4].text.includes(targetLine3) 





  if (directoryEmpty) {
    console.log(`directoryEmpty ${directoryEmpty}`)
    const noProject = foundLines[foundLines.length-1].text.includes(targetLine4) || 
    foundLines[foundLines.length-2].text.includes(targetLine4) || 
    foundLines[foundLines.length-3].text.includes(targetLine4) || 
    foundLines[foundLines.length-4].text.includes(targetLine4) 

    if (noProject) {
      console.log("no projects stop observation")
      clearInterval(id)
      watchingNow = false
      return
    } else {
      console.log("line 'There are no available projects' not found, run Bot")
      await runBot()
      return
    }

    
  }

 

  if (successfull || failedDownload ) {
    await runBot()
  }
}




const taskMorning = new CronJob('15 7 * * 1-5', async () => {
  if (!watchingNow) {
    watchingNow = true
    await firstRun()
    startObservation()
  } else {
    return
  }

}, null, true, 'Europe/Kiev'); 

const taskEvening = new CronJob('30 21 * * 1-5', async () => {
  if (!watchingNow) {
    watchingNow = true
    await firstRun()
    startObservation()
  } else {
    return
  }
}, null, true, 'Europe/Kiev'); 


taskMorning.start();
taskEvening.start();