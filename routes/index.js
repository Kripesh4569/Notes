'use strict';

var express = require('express');
var router = express.Router();
var path = require('path');
var notes = require(process.env.NOTES_MODEL ? path.join('..', process.env.NOTES_MODEL) : '../models/notes-memory');
const log = require('debug')('notes:router-home');
const error = require('debug')('notes:error');


/* GET home page. */

router.get('/', function (req, res, next) {
  getKeyTitlesList()
    .then(notelist => {
      console.log(req.user);
      res.render('index', {
        title: 'Notes', notelist: notelist, user: req.user ? req.user : undefined, breadcrumbs: [
          { href: '/', text: 'Home' }
        ]
      });
    })
    .catch(err => { next(err); });
});

module.exports = router;

var getKeyTitlesList = function () {
  return notes.keylist()
    .then(keylist => {
      var keyPromises = keylist.map(key => {
        return notes.read(key).then(note => {
          return { key: note.key, title: note.title };
        });
      });
      return Promise.all(keyPromises);
    });
};

module.exports.socketio = function (io) {
  var emitNoteTitles = () => {
    getKeyTitlesList().then(notelist => {
      io.of('/home').emit('notetitles', { notelist });
    });
  };
  notes.events.on('notecreated', emitNoteTitles);
  notes.events.on('noteupdate', emitNoteTitles);
  notes.events.on('notedestroy', emitNoteTitles);
};