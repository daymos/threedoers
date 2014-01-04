(function() {
  var config, key, locals;

  config = {
    logLevel: 'info',
    cookieSecret: 'This is a secret',
    debug: false,
    rootDir: __dirname,
    logFile: __dirname + '/log/error.log',
    host: {
      ip: process.env.OPENSHIFT_NODEJS_IP,
      port: process.env.OPENSHIFT_NODEJS_PORT,
      protocol: 'http'
    },
    db: {
      name: 'imake',
      host: 'mongodb://imake:3m1k2M4ng4@ds061198.mongolab.com:61198/'
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
