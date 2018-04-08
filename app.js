var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var FileStreamRotator = require('file-stream-rotator');

var indexRouter = require('./routes/index');

var users = require('./routes/users');
const session = require('express-session');
const FileStore = require('session-file-store')(session);

var notes = require('./routes/notes');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//

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

app.use(session({
  store: new FileStore({ path: "sessions" }),
  secret: 'keyboard mouse',
  resave: false,
  saveUninitialized: false
}));
users.initPassport(app);

app.use('/', indexRouter);
// app.get('/user', restrictRoute, function (req, res) {
//   res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
// });
app.use('/users', users.router);
app.use('/notes', notes);
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
