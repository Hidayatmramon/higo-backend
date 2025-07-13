const Customer = require('../models/Customer');
const fs = require('fs');
const csv = require('fast-csv');
const { setProgress, getProgress, resetProgress } = require('./progressState');

exports.uploadCustomerCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  res.status(202).json({ message: 'File diterima, sedang diproses' });

  processCSV(filePath)
    .then(() => console.log('File selesai diproses'))
    .catch((err) => console.error('Gagal proses CSV:', err));
};

exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    const regexSearch = new RegExp(search, 'i'); 

    const query = {
      $or: [
        { Name: regexSearch },
        { Email: regexSearch },
      ]
    };

    const data = await Customer.find(search ? query : {})
      .skip(skip)
      .limit(limit);

    const total = await Customer.countDocuments(search ? query : {});

    res.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Gagal ambil data:', err);
    res.status(500).json({ error: 'Gagal ambil data' });
  }
};

exports.deleteAllCustomers = async (req, res) => {
  try {
    await Customer.collection.drop();
    res.json({ message: 'Collection customer berhasil dihapus (drop).' });
  } catch (err) {
    if (err.code === 26) {
      res.json({ message: 'Collection sudah kosong.' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Gagal menghapus collection' });
    }
  }
};
exports.getStats = async (req, res) => {
  try {
    const genderAgg = await Customer.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    const ageAgg = await Customer.aggregate([
    { $group: { _id: '$Age', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
    ]);

    const brandDeviceAgg = await Customer.aggregate([
      { $group: { _id: '$Brand Device', count: { $sum: 1 } } }
    ]);

    const digitalInterestAgg = await Customer.aggregate([
      { $group: { _id: '$Digital Interest', count: { $sum: 1 } } }
    ]);

    res.json({
      gender: genderAgg,
      age: ageAgg,
      brandDevice: brandDeviceAgg,
      digitalInterest: digitalInterestAgg
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal ambil statistik' });
  }
};



const processCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const parser = csv.parse({ headers: true });
    const BATCH_SIZE = 100;
    let buffer = [];
    let count = 0;

    resetProgress();
    setProgress({ status: 'processing', total: 0, current: 0 });

    parser
      .on('error', (error) => {
        fs.unlinkSync(filePath);
        setProgress({ status: 'error' });
        reject(error);
      })
      .on('data', (row) => {
        buffer.push(row);
        count++;

        if (count % 1000 === 0) {
          setProgress({ current: count });
        }

        if (buffer.length >= BATCH_SIZE) {
          stream.pause();
          Customer.insertMany(buffer, { ordered: false })
            .then(() => {
              buffer = [];
              stream.resume();
            })
            .catch((err) => {
              console.error('Error insertMany (batch)', err.message);
              stream.resume();
            });
        }
      })
      .on('end', () => {
        if (buffer.length > 0) {
          Customer.insertMany(buffer, { ordered: false })
            .then(() => {
              fs.unlinkSync(filePath);
              setProgress({ status: 'done', current: count });
              resolve();
            })
            .catch((err) => {
              console.error('Error insertMany (last batch)', err.message);
              fs.unlinkSync(filePath);
              setProgress({ status: 'done', current: count });
              resolve();
            });
        } else {
          fs.unlinkSync(filePath);
          setProgress({ status: 'done', current: count });
          resolve();
        }
      });

    stream.pipe(parser);
  });
};
