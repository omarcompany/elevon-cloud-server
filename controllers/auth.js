const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const BadRequestError = require('../errors/bad-request-error');
const Conflict = require('../errors/conflict-error');
const FileService = require('../services/file-service.js');
const File = require('../models/file');
const UnauthorizedError = require('../errors/unauthorized-error');
const User = require('../models/user');

const { ERROR_TYPE } = require('../constants/errors');
const { SECRET_KEY } = require('../constants/constants.js');

const generateAccessToken = (_id) => {
  const payload = { _id };
  return jwt.sign(payload, SECRET_KEY, {
    expiresIn: 36000,
  });
};

module.exports.registation = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hash,
    });
    const file = await File.create({
      user: user._id,
      name: 'author',
      type: 'dir',
    });
    await FileService.createDir(file);
    res.send({
      _id: user._id,
      email: user.email,
    });
  } catch (err) {
    if (err.name === ERROR_TYPE.validity || err.name === ERROR_TYPE.cast) {
      next(new BadRequestError());
      return;
    } else if (err.name === ERROR_TYPE.fileExist) {
      next(new Conflict());
      return;
    }
    next(err);
  }
};

module.exports.login = (req, res, next) => {
  const { email, password } = req.body;

  return User.findUserByCredentials(email, password)
    .then((user) => {
      const token = generateAccessToken(user._id);
      res.send({ token });
    })
    .catch(() => next(new UnauthorizedError()));
};
