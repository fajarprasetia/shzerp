// This is a mock implementation of bcrypt for the browser
// It doesn't actually do any hashing, just returns placeholder values
// The real bcrypt will be used on the server side only

module.exports = {
  genSaltSync: function() {
    console.warn('bcrypt.genSaltSync called in browser environment');
    return 'browser-mock-salt';
  },
  hashSync: function(data) {
    console.warn('bcrypt.hashSync called in browser environment');
    return `browser-mock-hash:${data}`;
  },
  compareSync: function(data, hash) {
    console.warn('bcrypt.compareSync called in browser environment');
    return false;
  },
  genSalt: function(rounds, callback) {
    console.warn('bcrypt.genSalt called in browser environment');
    if (callback) callback(null, 'browser-mock-salt');
    return Promise.resolve('browser-mock-salt');
  },
  hash: function(data, salt, callback) {
    console.warn('bcrypt.hash called in browser environment');
    const result = `browser-mock-hash:${data}`;
    if (callback) callback(null, result);
    return Promise.resolve(result);
  },
  compare: function(data, hash, callback) {
    console.warn('bcrypt.compare called in browser environment');
    if (callback) callback(null, false);
    return Promise.resolve(false);
  }
}; 