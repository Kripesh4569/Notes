'use strict';
var util = require('util');
var express = require('express');
var router = express.Router();
var path = require('path');
var notes = require(process.env.NOTES_MODEL ? path.join('..', process.env.NOTES_MODEL) : '../models/notes-memory');
var usersRouter = require('./users');

const log = require('debug')('notes:router-notes');
const error = require('debug')('notes:error');
const messagesModel = require('../models/messages-sequelize');

// Add Note.
router.get('/add', usersRouter.ensureAuthenticated, (req, res, next) => {
    res.render('noteedit', {
        title: "Add a Note",
        docreate: true,
        notekey: "",
        note: undefined,
        user: req.user ? req.user : undefined,
        breadcrumbs: [
            { href: '/', text: 'Home' },
            { active: true, text: "Add Note" }
        ],
        hideAddNote: true
    });
});

// Save Note
router.post('/save', usersRouter.ensureAuthenticated, (req, res, next) => {
    var p;
    if (req.body.docreate === "create") {
        p = notes.create(req.body.notekey,
            req.body.title, req.body.body);
    } else {
        p = notes.update(req.body.notekey,
            req.body.title, req.body.body);
    }
    p.then(note => {
        res.redirect('/notes/view?key=' + req.body.notekey);
    })
        .catch(err => { next(err); });
});

//View Note
router.get('/view', (req, res, next) => {
    notes.read(req.query.key)
        .then(note => {
            res.render('noteview', {
                title: note ? note.title : "",
                notekey: req.query.key,
                note: note,
                user: req.user ? req.user : undefined,
                breadcrumbs: [
                    { href: '/', text: 'Home' },
                    { active: true, text: note.title }
                ]
            });
        })
        .catch(err => { next(err); });
});


router.get('/edit', usersRouter.ensureAuthenticated, (req, res, next) => {
    notes.read(req.query.key)
        .then(note => {
            res.render('noteedit', {
                title: note ? ("Edit " + note.title) : "Add a Note",
                docreate: false,
                notekey: req.query.key,
                note: note,
                user: req.user ? req.user : undefined,
                breadcrumbs: [
                    { href: '/', text: 'Home' },
                    { active: true, text: note.title }
                ]
            });
        })
        .catch(err => { next(err); });
});


router.get('/destroy', usersRouter.ensureAuthenticated, (req, res, next) => {
    notes.read(req.query.key)
        .then(note => {
            res.render('notedestroy', {
                title: note ? note.title : "",
                notekey: req.query.key,
                note: note,
                user: req.user ? req.user : undefined,
                breadcrumbs: [
                    { href: '/', text: 'Home' },
                    { active: true, text: 'Destroy Note' }
                ]
            });
        })
        .catch(err => { next(err); });
});

router.post('/destroy/confirm', usersRouter.ensureAuthenticated, (req, res, next) => {
    notes.destroy(req.body.notekey)
        .then(() => { res.redirect('/'); })
        .catch(err => { next(err); });
});

module.exports = router;

module.exports.socketio = function (io) {
    var nspView = io.of('/view');
    var forNoteViewClients = function (cb) {
        nspView.clients((err, clients) => {
            clients.forEach(id => {
                cb(nspView.connected[id]);
            });
        });
    };
    notes.events.on('noteupdate', newnote => {
        forNoteViewClients(socket => {
            socket.emit('noteupdate', newnote);
        });
    });
    notes.events.on('notedestroy', data => {
        forNoteViewClients(socket => {
            socket.emit('notedestroy', data);
        });
    });

    nspView.on('connection', function (socket) {
        // 'cb' is a function sent from the browser, to which we
        // send the messages for the named note.
        socket.on('getnotemessages', (namespace, cb) => {
            messagesModel.recentMessages(namespace)
                .then(cb)
                .catch(err => console.error(err.stack));
        });
    });
    
    messagesModel.on('newmessage', newmsg => {
        forNoteViewClients(socket => {
            socket.emit('newmessage', newmsg);
        });
    });
    messagesModel.on('destroymessage', data => {
        forNoteViewClients(socket => {
            socket.emit('destroymessage', data);
        });
    });
};

//For messags on notes

//This is bad practice, use message and post for create delete for deletion
// Save incoming message to message pool, then broadcast it
router.post('/make-comment', usersRouter.ensureAuthenticated,
    (req, res, next) => {
        messagesModel.postMessage(req.body.from,
            req.body.namespace, req.body.message)
            .then(results => { res.status(200).json({}); })
            .catch(err => { res.status(500).end(err.stack); });
    });
// Delete the indicated message
router.post('/del-message', usersRouter.ensureAuthenticated,
    (req, res, next) => {
        messagesModel.destroyMessage(req.body.id, req.body.namespace)
            .then(results => { res.status(200).json({}); })
            .catch(err => { res.status(500).end(err.stack); });
    });
