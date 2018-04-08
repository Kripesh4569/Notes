#!/usr/bin/env node

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var FileStreamRotator = require('file-stream-rotator');
const passportSocketIo = require("passport.socketio");
const debug = require('debug')('notes:server');
const http = require('http');
const error = require('debug')('notes:error');

var indexRouter = require('./routes/index');

var users = require('./routes/users');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

var notes = require('./routes/notes');

const sessionCookie = 'notes.sid';
const sessionSecret = 'keyboard mouse';
const sessionStore = new FileStore({ path: "sessions" });

var app = express();

//Socket IO Object
var server = http.createServer(app);
var io = require('socket.io')(server);
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: sessionCookie,
  secret: sessionSecret,
  store: sessionStore
}));

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Default Express middlewares

var accessLogStream;
if (process.env.REQUEST_LOG_FILE) {
  var logDirectory = path.dirname(process.env.REQUEST_LOG_FILE);
  fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
  accessLogStream = FileStreamRotator.getStream({
    filename: process.env.REQUEST_LOG_FILE,
    frequency: 'daily', verbose: false
  });
}

app.use(logger(process.env.REQUEST_LOG_FORMAT || 'dev', {
  stream: accessLogStream ? accessLogStream : process.stdout
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Changing configuration of Express session 
app.use(session({
  store: sessionStore,
  secret: sessionSecret,
  key: sessionCookie,
  resave: true,
  saveUninitialized: true
}));
users.initPassport(app);

app.use('/', indexRouter);
// app.get('/user', restrictRoute, function (req, res) {
//   res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
// });
app.use('/users', users.router);
app.use('/notes', notes);

indexRouter.socketio(io);
// notes.socketio(io);


app.use('/vendor/bootstrap', express.static(
  path.join(__dirname, 'bower_components', 'bootstrap', 'dist')));
app.use('/vendor/jquery', express.static(
  path.join(__dirname, 'bower_components', 'jquery', 'dist')));

app.use('/vendor/bootstrap/css', express.static(path.join(
  __dirname, 'bower_components', 'bootstrap', 'dist', 'css')));
app.use('/vendor/bootstrap/fonts', express.static(path.join(
  __dirname, 'bower_components', 'bootstrap', 'dist', 'fonts')));
app.use('/vendor/bootstrap/js', express.static(path.join(
  __dirname, 'bower_components', 'bootstrap', 'dist', 'js')));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  log('Listening on ' + bind);
}