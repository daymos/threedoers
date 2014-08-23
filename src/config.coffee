##############################################################################
# Global config file
##############################################################################

config =
  logLevel: 'info'
  cookieSecret: 'This is a secret'
  debug: false
  rootDir: __dirname
  logFile: __dirname + '/log/error.log'
  site: 'http://www.3doers.it'

  host:
    ip: process.env.OPENSHIFT_NODEJS_IP
    port: process.env.OPENSHIFT_NODEJS_PORT
    protocol: 'http'

  io:
    port: 8000

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

  project:
    payed:
      subject: "Project was payed."

  printer:
    accepted:
      subject: "Your request was accepted"
    denied:
      subject: "Your request was denied"

  printing:
    accept:
      subject: "Your project was accepted by a printer"

  admins:
    emails: ['3doers@gmail.com']

  python:
    path: __dirname + '/src/stlstats.py'
    bin: '~/app-root/data/3doers-pyenv/bin/python'

  upload:
    to: (process.env.OPENSHIFT_DATA_DIR || '') + '3doers/uploads/'

  # paypal:
  #   port: 5000
  #   api:
  #     host: "api.paypal.com"
  #     port: ""
  #     client_id: "AbVJNRB86vH_GeBUz853oqhXZvS36ET3-a1DjC2IRP9djSF6hwwjAX7u03pU"
  #     client_secret: "EBuONxDylIjxbPRINS_caUUdG6MqBnucAClogB9CE-rEovnA6ysJ3AhDGr-m"
  paypal:
    port: 5000
    api:
      host: "api.sandbox.paypal.com"
      port: ""
      client_id: "AZrTbRDZWrirQKBM6U0xlh2QbDhy-YgzhviBgD9dIhV6EoXePHBPVGD99hD6"
      client_secret: "ENKeHRBEcHZ3TdTdNUHpkKqd9ktHYwTYZQur6XrGtY-BttLKsDRc6ZRa_uE-"

  postmaster:
    apiKey: 'pp_MTA2NDEwMDE6X2sxbnlGVjZLbjdtUjZKS2Q4RFJ0THY2Y1hj'
    password: 'mattia13'

  sentry:
    DSN: 'http://5146b6fd7b08424991adcfa6a2b94ce5:e279691b1c9444d69043eaab14220e2b@sentry.linkux-it.com/6'

try
  locals = require './locals'
  for key of locals
    config[key] = locals[key]
catch
  # ignore

module.exports = config
