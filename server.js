'use strict';
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const { MongoClient } = require('mongodb');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

// ===== Security (Helmet + CSP) =====
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // hanya script dari server sendiri
      styleSrc: ["'self'"]   // hanya css dari server sendiri
    }
  })
);

// ===== Middleware =====
app.use('/public', express.static(process.cwd() + '/public'));
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== Database connection =====
const MONGO_URI = process.env.DB;

async function startServer() {
  let client;
  try {
    console.log('Mencoba menghubungkan ke database...');
    client = new MongoClient(MONGO_URI);
    await client.connect();

    console.log('Koneksi database berhasil!');
    const db = client.db('stock_checker');

    // ===== Routes =====
    app.route('/')
      .get(function (req, res) {
        res.sendFile(process.cwd() + '/views/index.html');
      });

    fccTestingRoutes(app);
    apiRoutes(app, db);

    // 404 handler
    app.use(function (req, res, next) {
      res.status(404).type('text').send('Not Found');
    });

    // Start server
    const listener = app.listen(process.env.PORT || 3000, function () {
      console.log('Aplikasi berjalan di port ' + listener.address().port);
      if (process.env.NODE_ENV === 'test') {
        console.log('Menjalankan Tes...');
        setTimeout(function () {
          try {
            runner.run();
          } catch (e) {
            console.log('Tes tidak valid:');
            console.error(e);
          }
        }, 3500);
      }
    });

  } catch (err) {
    console.error("KONEKSI DATABASE GAGAL:", err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
