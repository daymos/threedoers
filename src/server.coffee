##############################################################################
# Main file to load all required config, settings and routes
##############################################################################

# requiring some modules in main files
HTTPStatus = require "http-status"
express = require "express"
gzippo = require "gzippo"
MongoStore = require('connect-mongo')(express)
mongoose = require "mongoose"
engines = require 'consolidate'
expressValidator = require 'express-validator'

logger = require "./lib/logger"
settings = require './config'


env = process.env.NODE_ENV || 'development'
global.env = env
global.root = __dirname

logger.info ''
logger.info '***********************************************************************'
logger.info '* Starting iMake server:'
logger.info '*'


app = express()
validator = expressValidator()
db = mongoose.connect "#{settings.db.host}#{settings.db.name}", db: {safe: true}, server: {auto_reconnect: true}

app.on 'mount', (parent) ->
  console.log parent

app.set 'port', settings.host.port

app.engine 'jade', engines.jade
app.set 'view engine', 'jade'
app.set 'views', "#{global.root}/views"

app.use express.static "#{global.root}/public"
# app.use express.limit(config.req_max_size)

app.use express.bodyParser({keepExtensions: true, uploadDir: settings.mediaRoot})
app.use express.cookieParser()
app.use express.methodOverride()
app.use validator

app.use express.session(
  secret: settings.cookieSecret
  store: new MongoStore(url: "#{settings.db.host}#{settings.db.name}")
)

app.use express.csrf()
app.use gzippo.compress()
app.disable "x-powered-by"

app.configure 'development', ->
  app.locals.pretty = true

app.use (req, res, next) ->
  res.locals
    user: req.user
    nav: req.path
    csrfToken: req.session._csrf
  next()

# loading modules
for appName in ['core', 'auth']
  _app = require "./lib/#{appName}"
  _app.use validator
  _app.once 'mount', (parent) ->
    _app.engines = parent.engines
    _app.set 'views', parent.get('views')
  app.use _app

# start server
if settings.protocol is 'https'
  https = require 'https'
  ssl_options =
    key: fs.readFileSync settings.ssl_key
    cert: fs.readFileSync settings.ssl_pem
    ca: fs.readFileSync settings.ssl_crt
  server = https.createServer(ssl_options, app).listen(settings.host.port, settings.host.ip, ->
    logger.info "*   Visit page: #{settings.host.protocol}://#{settings.host.ip}:#{settings.host.port}"
    logger.info '*   Mongo Database:', settings.db.name
    logger.info '*   Pid File:', process.pid
    logger.info '*'
    logger.info '***********************************************************************'
  )
else
  http = require 'http'
  server = http.createServer(app).listen(settings.host.port, settings.host.ip, ->
    logger.info "*   Visit page: #{settings.host.protocol}://#{settings.host.ip}:#{settings.host.port}"
    logger.info '*   Mongo Database:', settings.db.name
    logger.info '*   Pid File:', process.pid
    logger.info '*'
    logger.info '***********************************************************************'
  )


# # db connection

# app.use '/api/v1', (req, res, next) ->
#   req.allow_upload = {}
#   res.data = {}
#   next()

# # mount all the applications, auth module should be the first!
# app.use require "auth/passport_setup"
# app.use '/api/v1', require("auth")
# app.use '/api/v1', require("access-control")
# app.use require("static-pages")
# app.use '/api/v1', require("users-api")
# app.use '/api/v1', require("brokers-api")
# app.use '/api/v1', require("loads-api")

# # end point for all error requests
# app.use '/api/v1', (err, req, res, next) ->
#   console.error "api v1 - error : ", err
#   require("upload-control")(req)
#   res.status err.status || HTTPStatus.INTERNAL_SERVER_ERROR
#   res.json err

# # end point for all non error requests to /api/v1
# app.use '/api/v1', (req, res) ->
#   require("upload-control")(req)
#   if _.isEmpty(res.data)
#     res.status HTTPStatus.NOT_FOUND
#     res.json()
#   else
#     switch req.query.body
#       when 'false', '-1', -1
#         res.json()
#       else
#         res.json res.data

# # handler all other 404 pages and resourses
# app.use (req, res) ->
#   require("upload-control")(req)
#   res.status 404
#   res.redirect "/404"

# require("push-manager").init(server, sessionConf)
