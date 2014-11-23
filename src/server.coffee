##############################################################################
# Main file to load all required config, settings and routes
##############################################################################
settings = require './config'


if settings.debug
  process.env.DEBUG = "express:*"


# requiring some modules in main files
HTTPStatus = require "http-status"
express = require "express"
gzippo = require "gzippo"
SessionStore = require('session-mongoose')(express)
mongoose = require "mongoose"
engines = require 'consolidate'
expressValidator = require 'express-validator'
q = require 'q'
passport = require "passport"
io = require 'socket.io'
ioSession = require 'socket.io-session'
raven = require 'raven'

logger = require "./lib/logger"

##
# mongoose with q promises
##

mongoose.Promise::then = (fulfilled, rejected) ->
  deferred = q.defer()
  @addCallback deferred.resolve
  @addErrback deferred.reject
  deferred.promise.then fulfilled, rejected


##
# End mongoose with q promises
##

env = process.env.NODE_ENV || 'development'
global.env = env
global.root = __dirname

logger.info ''
logger.info '***********************************************************************'
logger.info '* Starting 3doers server:'
logger.info '*'


app = express()
validator = expressValidator()

db = mongoose.connect "#{settings.db.host}#{settings.db.name}", db: {safe: true, autoIndex: false}, (err) ->
  logger.error err if err

app.use raven.middleware.express(settings.sentry.DSN)

app.set 'port', settings.host.port

app.engine 'jade', engines.jade
app.set 'view engine', 'jade'
app.set 'views', "#{global.root}/views"

app.use express.static settings.upload.to
app.use express.static "#{global.root}/public"
# app.use express.limit(config.req_max_size)

app.use express.bodyParser({keepExtensions: true, uploadDir: settings.upload.to})
app.use express.cookieParser()
app.use express.methodOverride()
app.use validator

sessionStore = new SessionStore(url: "#{settings.db.host}#{settings.db.name}")

app.use express.session(
  secret: settings.cookieSecret
  store: sessionStore
)

# initialize passport itself and passport sessions
app.use passport.initialize()
app.use passport.session()

app.use express.csrf()
app.use (req, res, next) ->
  res.cookie "XSRF-TOKEN", req.csrfToken()
  res.locals.csrftoken = req.csrfToken()
  next()
  return

app.use gzippo.compress()
app.disable "x-powered-by"

app.configure 'development', ->
  app.locals.pretty = true
  app.use express.errorHandler()

app.use (req, res, next) ->
  res.locals
    user: req.user
    nav: req.path
    csrfToken: req.session._csrf
    io: settings.io
  next()

app.locals.timeago = require 'timeago'

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
  io = io.listen server
else
  http = require 'http'
  server = http.createServer(app).listen(settings.host.port, settings.host.ip, ->
    logger.info "*   Visit page: #{settings.host.protocol}://#{settings.host.ip}:#{settings.host.port}"
    logger.info '*   Mongo Database:', settings.db.name
    logger.info '*   Pid File:', process.pid
    logger.info '*   Environment:', app.settings.env
    logger.info '*'
    logger.info '***********************************************************************'
  )
  io = io.listen server

io.set 'authorization', ioSession(express.cookieParser(settings.cookieSecret), sessionStore)

unless settings.debug
  io.configure ->
    io.set 'log level', 1
    io.set 'transports', ["websocket"]
    io.enable "browser client minification" # send minified client
    io.enable "browser client etag" # apply etag caching logic based on version number
    io.enable "browser client gzip" # gzip the file
    io.set 'polling duration', 30

# loading modules
for appName in ['admin', 'filemanager', 'core', 'auth', 'registration']
  logger.debug "Loading app #{appName}"
  require("./lib/#{appName}")(app, io)


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
