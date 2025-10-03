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

// ===== Security (Helmet + CSP strict) =====
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"]
    }
  })
);

// ===== Middleware =====
app.use('/public', express.static(process.cwd() + '/public'));
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== Routes =====
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

fccTestingRoutes(app);

// ===== Database connection + API mounting =====
const MONGO_URI = process.env.DB;

async function init() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db('stock_checker');
    apiRoutes(app, db);   // <-- mount API di sini
    console.log('Database connected');

    if (process.env.NODE_ENV !== 'test') {
      const listener = app.listen(process.env.PORT || 3000, () => {
        console.log('Server running on port ' + listener.address().port);
      });
    } else {
      console.log('Server ready for tests');
    }

  } catch (err) {
    console.error('DB connection failed:', err);
    process.exit(1);
  }
}

init();

module.exports = app;   // <--- penting! biar chai-http bisa akses route
