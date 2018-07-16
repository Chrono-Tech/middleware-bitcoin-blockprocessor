/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

require('dotenv/config');

const config = require('../config'),
  models = require('../models'),
  fuzzTests = require('./fuzz'),
  performanceTests = require('./performance'),
  featuresTests = require('./features'),
  Promise = require('bluebird'),
  mongoose = require('mongoose');

mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, {useMongoClient: true});
mongoose.accounts = mongoose.createConnection(config.mongo.accounts.uri, {useMongoClient: true});


describe('core/blockProcessor', function () {

  before(async () => {
    models.init();
  });

  after(async () => {
    mongoose.disconnect();
    mongoose.accounts.close();
  });


  describe('fuzz', fuzzTests);

  describe('performance', performanceTests);

  describe('features', featuresTests);

});
