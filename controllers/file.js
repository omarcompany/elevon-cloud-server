const path = require('path');

const Conflict = require('../errors/conflict-error');
const BadRequestError = require('../errors/bad-request-error');
const FileService = require('../services/file-service.js');
const File = require('../models/file');
const User = require('../models/user');

const { ERROR_TYPE, HTTP_RESPONSE } = require('../constants/errors');
const { STORAGE_PATH } = require('../settings');

module.exports.createDir = async (req, res, next) => {
  try {
    const { name, type, parent } = req.body;
    const file = new File({ name, type, parent, user: req.user._id });
    const parentFile = await File.findOne({ _id: parent });
    if (!parentFile) {
      file.path = name;
      await FileService.createDir(file);
    } else {
      file.path = path.join(parentFile.path, file.name);
      await FileService.createDir(file);
      parentFile.childs.push(file._id);
      await parentFile.save();
    }
    await file.save();
    return res.send(file);
  } catch (error) {
    if (error.name && error.name === ERROR_TYPE.fileExist) {
      next(new Conflict());
      return;
    } else {
      next(error);
    }
  }
};

module.exports.getFiles = async (req, res, next) => {
  try {
    const files = await File.find({
      user: req.user._id,
      parent: req.query?.parent,
    });
    return res.send(files);
  } catch (error) {
    next(error);
  }
};

module.exports.uploadFile = async (req, res, next) => {
  try {
    const file = req.files.file;

    const parent = await File.findOne({
      user: req.user._id,
      _id: req.body.parent,
    });
    const user = await User.findOne({ _id: req.user._id });

    if (user.usedSpace + file.size > user.diskSpace) {
      next(new BadRequestError(HTTP_RESPONSE.badRequest.absentMessage.noSpace));
      return;
    }

    user.usedSpace += file.size;

    const filePath = parent
      ? path.join(STORAGE_PATH, user._id.toString(), parent.path, file.name)
      : path.join(STORAGE_PATH, user._id.toString(), file.name);

    file.mv(filePath);

    const type = file.name.split('.').pop();

    const dbFile = new File({
      name: file.name,
      type,
      size: file.size,
      path: parent?.path,
      parent: parent?._id,
      user: user._id,
    });

    await dbFile.save();
    await user.save();

    return res.send(dbFile);
  } catch (error) {
    console.log(error)
    next(error);
  }
};
