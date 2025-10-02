'use strict';
const fetch = require('node-fetch');
const crypto = require('crypto');

async function getStockData(stockSymbol) {
  const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol.toUpperCase()}/quote`);
  if (!response.ok) { return { error: 'invalid stock symbol' }; }
  const { symbol, latestPrice } = await response.json();
  return { stock: symbol, price: latestPrice };
}

function anonymizeIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Di dalam file routes/api.js

async function getLikes(db, stockSymbol, like, ip) {
  const stockCollection = db.collection('stocks');

  // JIKA TIDAK ADA 'LIKE', CUKUP CARI DATANYA
  if (like !== 'true') {
    const stockDoc = await stockCollection.findOne({ stock: stockSymbol });
    // Kembalikan jumlah likes jika ada, atau 0 jika tidak ada
    return stockDoc && stockDoc.likes ? stockDoc.likes.length : 0;
  }

  // JIKA ADA 'LIKE', BARU LAKUKAN UPDATE
  const hashedIp = anonymizeIp(ip);
  const updateResult = await stockCollection.findOneAndUpdate(
    { stock: stockSymbol },
    { $addToSet: { likes: hashedIp } },
    { upsert: true, returnDocument: 'after' }
  );

  // Kembalikan jumlah likes dari dokumen yang sudah di-update
  return updateResult.value && updateResult.value.likes ? updateResult.value.likes.length : 1;
}
module.exports = function (app, db) {
  app.route('/api/stock-prices')
    .get(async (req, res) => {
      const { stock, like } = req.query;
      const ip = req.ip;

      try {
        if (Array.isArray(stock)) {
          // --- Logika untuk Dua Saham ---
          const stockData1 = await getStockData(stock[0]);
          const stockData2 = await getStockData(stock[1]);

          const likes1 = await getLikes(db, stockData1.stock, like, ip);
          const likes2 = await getLikes(db, stockData2.stock, like, ip);

          const responseData = [
            { stock: stockData1.stock, price: stockData1.price, rel_likes: likes1 - likes2 },
            { stock: stockData2.stock, price: stockData2.price, rel_likes: likes2 - likes1 }
          ];
          res.json({ stockData: responseData });

        } else {
          // --- Logika untuk Satu Saham ---
          const stockData = await getStockData(stock);
          if (stockData.error) { return res.json({ stockData }); }
          stockData.likes = await getLikes(db, stockData.stock, like, ip);
          res.json({ stockData });
        }
      } catch (e) {
        console.error(e);
        res.status(500).send('An error occurred');
      }
    });
};