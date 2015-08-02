var crypto = require('crypto');

var CHARS = 'abcdefABCDEF0123456789';//'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

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