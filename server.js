'use strict';

require('dotenv').config();

const PORT = process.env.PORT || 8080;
const ENV = process.env.ENV || 'development';
const express = require('express');
const bodyParser = require('body-parser');
const sass = require('node-sass-middleware');
const app = express();

// cookie-session
const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'session',
  keys: ['somesecretkeyiguess'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig[ENV]);
const morgan = require('morgan');
const knexLogger = require('knex-logger');

// Seperated Routes for each Resource
const registerRoutes = require('./routes/register');
const loginRoutes = require('./routes/login');
const logoutRoutes = require('./routes/logout');
const categoriesRoutes = require('./routes/categories');
const tasksRoutes = require('./routes/tasks');

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/styles', sass({
  src: __dirname + '/styles',
  dest: __dirname + '/public/styles',
  debug: true,
  outputStyle: 'expanded'
}));
app.use(express.static('public'));

// Mount all resource routes
app.use('/register', registerRoutes(knex));
app.use('/login', loginRoutes(knex));
app.use('/logout', logoutRoutes());
app.use('/categories', categoriesRoutes(knex));
app.use('/categories', tasksRoutes(knex));

// Home page, renders index and passes back userID
app.get('/', (req, res) => {
  res.render('index', {
    email: req.session.userID,
  });
});

app.listen(PORT, () => {
  console.log('Example app listening on port ' + PORT);
});
