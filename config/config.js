/**
 *  @copyright 2015 [3Doers]
 *
 *  @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *  @version 0.1.0
 */

require('dotenv').load();

import nconf from 'nconf';
import path from 'path';


let ROOT_DIR = path.normalize(path.join(__dirname, '/..'));
let defaults = {};

// Some paths
defaults.rootDir = ROOT_DIR;
defaults.logFile = path.join(ROOT_DIR, '/logs/error.log');

// Log config
defaults.logLevel = process.env.LOG_LEVEL || 'warn';

// Site
defaults.site = 'https://www.3doers.it';

// Host
defaults.host = {
  ip: process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1',
  port: process.env.OPENSHIFT_NODEJS_PORT || 3000,
  protocol: process.env.PROTOCOL || 'https',
  ws: process.env.WEBSOCKET_SERVER || 'localhost:3000'
};

defaults.websocket = {
  port: 3000
};

defaults.mongo = {
  url: process.env.MONGO_URL,
  options: {
    db: {
      safe: true,
      autoIndex: false
    }
  }
};

defaults.mailer = {
  service: process.env.MAILER_SERVICE,
  username: process.env.MAILER_USERNAME,
  password: process.env.MAILER_PASSWORD,
  default_from: process.env.MAILER_DEFAULT
};

defaults.emailSubjects = {
  registration: {
    activation: 'Activate yout account',
    reset: 'Password reset'
  },

  project: {
    accepted: 'Your project was accepted',
    denied: 'Your project was denied',
    paid: 'Project was paid',
    status: 'Project Status'
  }
};

defaults.admins = {
  emails: ['3doers@gmail.com']
};

defaults.adminEmailAddresses = [
  '3doers@gmail.com'
];

defaults.commissions = {
  taxes: 0.22,
  printers: 0.25,
  designers: 0.25
};

defaults.python = {
  path: ROOT_DIR + '/stlstats.py',
  bin: 'python'
};

defaults.media = {
  upload: {
    to: (process.env.OPENSHIFT_DATA_DIR || ROOT_DIR) + '/3doers/uploads/'
  }
};

defaults.static = {
  path: ROOT_DIR + '/public/'
};

defaults.paypal = {
  primaryReceiver: 'mattia@3doers.it',
  port: 5000,
  adaptive: {
    user: process.env.PAYPAL_USER,
    password: process.env.PAYPAL_PASSWORD,
    signature: process.env.PAYPAL_SIGNATURE,
    appID: process.env.PAYPAL_ID
  }
};

defaults.sentry = {
  DSN: 'http://5146b6fd7b08424991adcfa6a2b94ce5:e279691b1c9444d69043eaab14220e2b@sentry.linkux-it.com/6'
};

/*
 * Setup nconf to use (in order):
 *  1. Command-line arguments
 *  2. Environment variables
 */
nconf.argv().env();

nconf.defaults(defaults);
