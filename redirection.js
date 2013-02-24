var app = require ('http'). createServer(handler)
, fs = require ('fs')
, io = require ('socket.io').listen(app)
, path = require('path');


app.listen (process.env.PORT || 5000) ;

//stop le flood !
io.set('log level', 1);
io.set('transport', ['websocket']);

//Masque de dates à utiliser pour les log
var dateToLog=function(date){
    return '[' + date.getDate() + '/' + (date.getMonth() +1) + ' ' + date.getHours() + ':' + date.getMinutes() + '] ';
}

function handler( request , response ) {
	
    var contentType = 'text/html';
    response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control':'max-age=3600'});
    response.write('<html><head><title>Zombiz, redirection</title></head>');
    response.write('<body><h1><a href="http://zombiz.fr">Retrouvez Zombiz sur zombiz.fr !</a></h1></body></html>');


    response.end('', 'utf-8');
}