(function() {
  var config, key, locals;

  config = {
    logLevel: 'info',
    cookieSecret: 'This is a secret',
    debug: false,
    rootDir: __dirname,
    logFile: __dirname + '/log/error.log',
    host: {
      ip: 'localhost',
      port: 3000,
      protocol: 'http'
    },
    db: {
      name: 'iMake',
      host: 'mongodb://localhost/'
    }
  };

  try {
    locals = require('./locals');
    for (key in locals) {
      config[key] = locals[key];
    }
  } catch (_error) {

  }

  module.exports = config;

}).call(this);
