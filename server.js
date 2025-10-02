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
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"], // Hanya izinkan skrip dari domain Anda
    styleSrc: ["'self'"]   // Hanya izinkan CSS dari domain Anda
  }
}));
app.use('/public', express.static(process.cwd() + '/public'));
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://code.jquery.com/jquery-2.2.1.min.js'],
    styleSrc: ["'self'"]
  }
}));

const MONGO_URI = process.env.DB;

// Fungsi async untuk memulai server
async function startServer() {
  let client;
  try {
    console.log('Mencoba menghubungkan ke database...');
    client = new MongoClient(MONGO_URI);
    await client.connect(); // Mencoba koneksi
    
    console.log('Koneksi database berhasil!');
    const db = client.db('stock_checker');

    // Semua logika aplikasi diletakkan di sini setelah koneksi berhasil
    app.route('/')
      .get(function (req, res) {
        res.sendFile(process.cwd() + '/views/index.html');
      });

    fccTestingRoutes(app);
    apiRoutes(app, db);

    app.use(function (req, res, next) {
      res.status(404).type('text').send('Not Found');
    });

    const listener = app.listen(process.env.PORT || 3000, function () {
      console.log('Aplikasi Anda berjalan di port ' + listener.address().port);
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
    // JIKA KONEKSI GAGAL, ERROR AKAN MUNCUL DI SINI
    console.error("KONEKSI DATABASE GAGAL:", err);
    process.exit(1); // Hentikan aplikasi jika DB gagal terhubung
  }
}

// Panggil fungsi untuk memulai server
startServer();

module.exports = app;