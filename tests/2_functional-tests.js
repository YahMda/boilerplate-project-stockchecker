const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  test('Viewing one stock: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=GOOG')
      .end(function(err, res){
        assert.equal(res.status, 200);
        assert.isObject(res.body.stockData);
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, 'GOOG');
        done();
      });
  });

  let likes;
  test('Viewing one stock and liking it: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=MSFT&like=true')
      .end(function(err, res){
        assert.equal(res.status, 200);
        assert.equal(res.body.stockData.stock, 'MSFT');
        assert.isAtLeast(res.body.stockData.likes, 1);
        likes = res.body.stockData.likes;
        done();
      });
  });

  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=MSFT&like=true')
      .end(function(err, res){
        assert.equal(res.status, 200);
        assert.equal(res.body.stockData.stock, 'MSFT');
        assert.equal(res.body.stockData.likes, likes);
        done();
      });
  });

  test('Viewing two stocks: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=AAPL&stock=SPOT')
      .end(function(err, res){
        assert.equal(res.status, 200);
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        done();
      });
  });

  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=AMZN&stock=TSLA&like=true')
      .end(function(err, res){
        assert.equal(res.status, 200);
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        assert.equal(res.body.stockData[0].rel_likes, -res.body.stockData[1].rel_likes);
        done();
      });
  });

});