##############################################################################
# Global config file
##############################################################################

config =
  logLevel: 'info'
  cookieSecret: 'This is a secret'
  debug: false
  rootDir: __dirname
  logFile: __dirname + '/log/error.log'
  site: 'http://3doers.it'

  host:
    ip: process.env.OPENSHIFT_NODEJS_IP
    port: process.env.OPENSHIFT_NODEJS_PORT
    protocol: 'http'

  db:
    name: 'imake'
    host: 'mongodb://imake:3m1k2M4ng4@ds033617.mongolab.com:33617/'

  mailer:
    service: 'Mandrill'
    username: '3doers@gmail.com'
    password: 'tYhdoBQgtOtpeYn4ZSlyXg'
    noReply: 'no-reply@3doers.it'

  registration:
    activation:
      subject: "Activate your account"

  admins:
    emails: ['3doers@gmail.com']

  python:
    path: __dirname + '/src/stlstats.py'
    bin: '~/app-root/data/3doers-pyenv/bin/python'

try
  locals = require './locals'
  for key of locals
    config[key] = locals[key]
catch
  # ignore

module.exports = config
