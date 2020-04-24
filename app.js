require('dotenv').config(); // env-переменные добавлены в process.env

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookies = require('cookie-parser');
const helmet = require('helmet'); // sets HTTP headers for security
const { errors } = require('celebrate'); // validation middleware (checks data before passing it to controller)
const rateLimit = require('express-rate-limit'); // used to limit repeated requests to public APIs and/or endpoints such as password reset

const router = require('./routes');
const { createUser, login } = require('./controllers/users');
const errorHandler = require('./middleware/error-handler');
const auth = require('./middleware/auth');
const { requestLogger, errorLogger } = require('./middleware/logger');
const { userValidator, loginValidator } = require('./middleware/validation-celebrate');

const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // timeframe for which requests are checked/remebered: 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Please try again later',
});

app.use(helmet());
// app.disable('x-powered-by');

mongoose.connect('mongodb://localhost:27017/mestodb', {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

// initial middleware
app.use(bodyParser.json()); // for parsing data as JSON
app.use(bodyParser.urlencoded({ extended: true })); // accepting various file types in POST requests
app.use(cookies());
app.use(requestLogger); // request logging middleware must be connected before all routes
app.use(limiter); // express rate limit is applied to all requests

// crash test
app.get('/crash-test', () => {
  setTimeout(() => {
    throw new Error('Сервер сейчас упадёт');
  }, 0);
});

// routes
app.post('/signin', loginValidator, login);
app.post('/signup', userValidator, createUser);
app.use(auth); // following routes are protected by auth
app.use('/', router); // защитите авторизацией все маршруты, кроме создания нового пользователя и логина

// errors
app.use(errorLogger); // error logging middleware must be connected before error handlers
app.use(errors()); // celebrate error handler
app.use(errorHandler); // a centralized error handler is the last middleware

module.exports = app;
