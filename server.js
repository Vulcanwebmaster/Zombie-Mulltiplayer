var app = require ('http'). createServer(handler)
, fs = require ('fs')
, io = require ('socket.io').listen(app)
, path = require('path');

var CharacterManager=require('./js/CharacterManager.class.js');
var characterManager=new CharacterManager();

var ServerMap = require('./js/ServerMap.class.js');
var serverMap = new ServerMap(io,characterManager);

app.listen (process.env.PORT || 8000) ;

//stop le flood !
io.set('log level', 1);
io.set('transport', ['websocket']);

function handler( request , response ) {
	var filePath = '.' + request.url;
    if (filePath == './')
        filePath = './index.html';
    else if(filePath=='./index')
        filePath='./index.html';
    else if(filePath=='./jeu')
        filePath='./jeu.html';
         
    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType= 'image/jpeg';
            break;
        case '.TTF':
            contentType= 'font/ttf';
            break;
        case '.ttf':
            contentType= 'font/ttf';
            break;
    }
     
    path.exists(filePath, function(exists) {  
        if (exists) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            response.writeHead(404);
            response.end();
        }
    });
}

io.sockets.on('connection', function(socket) {
	socket.on('new_player', function(datas) {
        console.log('Un joueur envoi son pseudo');
        var joueurId=serverMap.addJoueur(datas.pseudo);
        /*Ici on choisi ou non de lancer la partie*/
        if(serverMap.isRunning==false)
            serverMap.start();
        socket.emit('set_id', joueurId);
		io.sockets.emit('broadcast_msg', {'auteur':'Admin', 'message': datas.pseudo + ' a rejoint la partie.', 'class': 'tchat-admin'});
		socket.set('pseudo', datas.pseudo , function () {
			console.log ( 'Création du joueur ' + joueurId + ' (' + datas.pseudo + ')');
		});
        socket.set('id', joueurId);
	});

    socket.on('update_player_mouvement', function(datas){
        serverMap.updateJoueurMouvement(datas);
    });

    socket.on('update_player_angle', function(datas){
        serverMap.updateJoueurAngle(datas);
    });

    socket.on('fire',function(datas){
        serverMap.fire(datas);
    });

    socket.on('stop_fire', function(datas){
        serverMap.stopFire(datas);
    });

    socket.on('disconnect',function(){
        socket.get('id', function(err,id){
            serverMap.removeJoueur(id);
            socket.broadcast.emit('remove_player', {'id':id});
            socket.get('pseudo', function(err, pseudo){
                console.log("Joueur '" + pseudo + "' a quitté.");
                socket.broadcast.emit('broadcast_msg', {'auteur':'Admin', 'message': pseudo + ' a quitté la partie.', 'class':'tchat-admin'});
            });
        });
    });
});