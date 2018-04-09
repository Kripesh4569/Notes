'use strict';
const Sequelize = require("sequelize");
const jsyaml = require('js-yaml');
const fs = require('fs');
const util = require('util');
const EventEmitter = require('events');
const log = require('debug')('messages:model-messages');

class MessagesEmitter extends EventEmitter { }
const error = require('debug')('messages:error');

var SQMessage;
var sequlz;

module.exports = new MessagesEmitter();


var connectDB = function () {
    if (SQMessage) return SQMessage.sync();
    return new Promise((resolve, reject) => {
        fs.readFile(process.env.SEQUELIZE_CONNECT, 'utf8',
            (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
    })
        .then(yamltext => jsyaml.safeLoad(yamltext, 'utf8'))
        .then(params => {
            if (!sequlz) sequlz = new Sequelize(params.dbname, params.
                username, params.password, params.params);
            if (!SQMessage) SQMessage = sequlz.define('Message', {
                id: {
                    type: Sequelize.INTEGER, autoIncrement: true,
                    primaryKey: true
                },
                from: Sequelize.STRING,
                namespace: Sequelize.STRING,
                message: Sequelize.STRING(1024),
                timestamp: Sequelize.DATE
            });
            return SQMessage.sync();
        });
};

module.exports.postMessage = function (from, namespace, message) {
    return connectDB()
        .then(SQMessage => SQMessage.create({
            from, namespace, message, timestamp: new Date()
        }))
        .then(newmsg => {
            var toEmit = {
                id: newmsg.id,
                from: newmsg.from,
                namespace: newmsg.namespace,
                message: newmsg.message,
                timestamp: newmsg.timestamp
            };
            module.exports.emit('newmessage', toEmit);
        });
};

module.exports.destroyMessage = function (id, namespace) {
    return connectDB()
        .then(SQMessage => SQMessage.find({ where: { id } }))
        .then(msg => msg.destroy())
        .then(result => {
            module.exports.emit('destroymessage', { id, namespace });
        });
};

module.exports.recentMessages = function (namespace) {
    return connectDB().then(SQMessage => {
        return SQMessage.findAll({
            where: { namespace },
            order: 'timestamp DESC',
            limit: 20
        });
    })
        .then(messages => {
            return messages.map(message => {
                return {
                    id: message.id,
                    from: message.from,
                    namespace: message.namespace,
                    message: message.message,
                    timestamp: message.timestamp
                };
            });
        });
};