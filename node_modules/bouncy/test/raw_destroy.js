var test = require('tap').test;
var bouncy = require('../');
var net = require('net');
var EventEmitter = require('events').EventEmitter;

test('destroy the socket during piping', function (t) {
    t.plan(3);
    
    var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
    
    var s0 = bouncy(function (req, bounce) {
        t.equal(req.headers.host, 'lulzy');
        
        var c = net.connect(p1, function () {
            bounce(c);
        });
    });
    
    s0.listen(p0, function () {
        var c = net.connect(p0, function () {
            c.write('POST /lul HTTP/1.1\r\n');
            c.write('Host: lulzy\r\n');
            c.write('Foo: bar\r\n');
            c.write('Content-Length: 7\r\n');
            c.write('\r\n');
            
            setTimeout(function () {
                c.once('error', function (err) {
                    t.ok(/socket is closed/.test(err.message));
                });
                c.write('a=3&b=4');
            }, 300);
            
            setTimeout(function () {
                t.pass();
                c.end();
            }, 350);
        });
    });
    
    var s1 = net.createServer(function (c) {
        setTimeout(function () {
            c.destroy();
        }, 20);
    });
    s1.listen(p1);
    
    t.on('end', function () {
        s0.close();
        s1.close();
    });
});
