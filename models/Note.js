'use strict';
module.exports = class Note {
    constructor(key, title, body) {
        this.key = key;
        this.title = title;
        this.body = body;
    }

    static fromJSON(json) {
        var data = JSON.parse(json);
        var note = new Note(data.key, data.title, data.body);
        return note;
    }

    get JSON() {
        return JSON.stringify({
            key: this.key, title: this.title, body: this.body
        });
    }
};