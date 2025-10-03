'use strict';
const fetch = require('node-fetch');
const crypto = require('crypto');

module.exports = function (app, db) {
  const collection = db.collection('stocks');

  // helper anonymize IP
  function anonymizeIP(ip) {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        let { stock, like } = req.query;
        if (!stock) return res.status(400).json({ error: 'stock query required' });

        let stocks = Array.isArray(stock) ? stock.map(s => s.toUpperCase()) : [stock.toUpperCase()];
        const ipHash = anonymizeIP(req.ip || req.headers['x-forwarded-for'] || '0.0.0.0');

        const results = await Promise.all(stocks.map(async sym => {
          // fetch stock price from FCC proxy
          const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${sym}/quote`;
          const data = await fetch(url).then(r => r.json());
          const price = data.latestPrice;

          // find or insert stock doc
          let doc = await collection.findOne({ stock: sym });
          if (!doc) {
            doc = { stock: sym, likes: [] };
            await collection.insertOne(doc);
          }

          // handle like
          if ((like === true || like === 'true') && !doc.likes.includes(ipHash)) {
            await collection.updateOne({ stock: sym }, { $push: { likes: ipHash } });
            doc.likes.push(ipHash);
          }

          return { stock: sym, price, likes: doc.likes.length };
        }));

        if (results.length === 2) {
          const rel0 = results[0].likes - results[1].likes;
          const rel1 = results[1].likes - results[0].likes;
          return res.json({
            stockData: [
              { stock: results[0].stock, price: results[0].price, rel_likes: rel0 },
              { stock: results[1].stock, price: results[1].price, rel_likes: rel1 }
            ]
          });
        } else {
          return res.json({ stockData: results[0] });
        }

      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
      }
    });
};
