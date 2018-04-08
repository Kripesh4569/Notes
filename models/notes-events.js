'use strict';
const EventEmitter = require('events');
class NotesEmitter extends EventEmitter { }
module.exports = new NotesEmitter();

module.exports.noteCreated = function (note) {
    module.exports.emit('notecreated', note);
};
module.exports.noteUpdate = function (note) {
    module.exports.emit('noteupdate', note);
};
module.exports.noteDestroy = function (data) {
    module.exports.emit('notedestroy', data);
};