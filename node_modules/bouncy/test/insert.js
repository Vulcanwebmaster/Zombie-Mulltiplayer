var test = require('tap').test;
var insertHeaders = require('../lib/insert_headers');
var chunky = require('chunky');

test('insert headers', function (t) {
    t.plan(50 * 3);
    var msg = [
        'POST / HTTP/1.1',
        'Host: beep',
        '',
        'sound=boop'
    ].join('\r\n');
    
    for (var i = 0; i < 50; i++) {
        var bufs = chunky(msg);
        t.equal(bufs.map(String).join(''), msg);
        
        var n = insertHeaders(bufs, { foo : 'bar', baz : 'quux' });
        t.equal(n, 'foo: bar\r\nbaz: quux\r\n'.length);
        t.equal(bufs.map(String).join(''), [
            'POST / HTTP/1.1',
            'Host: beep',
            'foo: bar',
            'baz: quux',
            '',
            'sound=boop'
        ].join('\r\n'));
    }
    t.end();
});
