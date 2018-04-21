/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const Promise = require('bluebird'),
  txModel = require('../models/txModel');

module.exports = async (block) => {


  return await Promise.map(block.txs, async tx=>{

    tx.outputs = await Promise.mapSeries(tx.outputs, async output=>{
      output.spent = await txModel.count({
        'inputs.prevout.hash': output.hash,
        'inputs.prevout.index': output.index
      });
      return output;
    });

    return tx;

  });
};
