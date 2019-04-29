//var LevelDB = require('node-leveldb');
const path = require('path');
const db = path.join(process.cwd(), 'db');
const Storage = require("key-file-storage");
var Tests = Storage(db);
var Crypto = require('crypto');
module.exports = {
  set: (obj) => {
    var key = Crypto.createHash('md5').update(obj.location).digest('hex');
    Tests[`tests/${obj.testType}/${key}`] = obj;
  },
  get: (obj) => {
    var key = Crypto.createHash('md5').update(obj.location).digest('hex');
    return Tests(`tests/${obj.testType}/${key}`);
  }
}