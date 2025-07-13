const Customer = require('../models/Customer');
const fs = require('fs');
const csv = require('fast-csv');
const { setProgress, resetProgress } = require('./progressState');

const BATCH_SIZE = 100;

module.exports = function processCSV(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const parser = csv.parse({ headers: true });

    let buffer = [];
    let count = 0;
    let inserting = false;

    resetProgress();
    setProgress({ status: 'processing', total: 0, current: 0 });

    async function insertBuffer() {
      if (buffer.length === 0) return;
      try {
        inserting = true;
        await Customer.insertMany(buffer, { ordered: false });
        buffer = [];
        inserting = false;
        setProgress({ current: count });
        parser.resume();
      } catch (err) {
        console.error('insertMany error:', err.message);
        buffer = [];
        inserting = false;
        parser.resume();
      }
    }

    parser
      .on('error', (error) => {
        fs.unlinkSync(filePath);
        setProgress({ status: 'error' });
        reject(error);
      })
      .on('data', async (row) => {
        buffer.push(row);
        count++;

        if (buffer.length >= BATCH_SIZE && !inserting) {
          parser.pause();
          await insertBuffer();
        }
      })
      .on('end', async () => {
        if (buffer.length > 0) {
          await insertBuffer();
        }
        fs.unlinkSync(filePath);
        setProgress({ status: 'done', current: count });
        resolve();
      });

    stream.pipe(parser);
  });
};
