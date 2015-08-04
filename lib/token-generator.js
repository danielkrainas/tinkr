var crypto = require('crypto');

var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

module.exports = function (length) {
    length = length || 16;
    var s = '';
    do {
        var bf = crypto.randomBytes(length);
        for (var i = 0; i < bf.length; i++) {
            s += CHARS.charAt(bf.readUInt8(i) % CHARS.length);
        }
    } while (s.length < length);

    return s;
};