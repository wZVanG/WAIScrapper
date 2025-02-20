const NodeCache = require('node-cache');
const config = require('../config/config');

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cache.ttl,
      checkperiod: config.cache.checkPeriod
    });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    return this.cache.set(key, value);
  }

  delete(key) {
    return this.cache.del(key);
  }
}

module.exports = new CacheService();