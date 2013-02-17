var app = require ('http'). createServer(handler)
, fs = require ('fs')
, io = require ('socket.io').listen(app)
, path = require('path');

 var DBCore= require('./js/DBCore.class.js');
 var dbCore=new DBCore();

var CharacterManager=require('./js/CharacterManager.class.js');
var characterManager=new CharacterManager();

var ServerMap = require('./js/ServerMap.class.js');
var serverMap = new ServerMap(io,characterManager, dbCore);

app.listen (process.env.PORT || 5000) ;

//stop le flood !
io.set('log level', 1);
io.set('transport', ['websocket']);

//Masque de dates à utiliser pour les log
var dateToLog=function(date){
    return '[' + date.getDate() + '/' + (date.getMonth() +1) + ' ' + date.getHours() + ':' + date.getMinutes() + '] ';
}

function handler( request , response ) {
	var filePath = '.' + request.url;
    if (filePath == './')
        filePath = './index.html';
    else if(filePath=='./index')
        filePath='./index.html';
    else if(filePath=='./jeu')
        filePath='./jeu.html';
    else if(filePath=='./newAccount')
        filePath='./newAccount.html';
    else if(filePath=='./top'){
        dbCore.getTopPlayerHTML(response);
        return;
    }
    else if(filePath=='./fullLeaderboard'){
        dbCore.getLeaderboardHTML(response);
        return;
    }
    else if(filePath=='./leaderboard'){
        filePath='./leaderboard.html';
    }
    //On protège tous les dossiers et fichiers interdits
    else if(filePath=='./server.js'){
        console.log(dateToLog(new Date) + 'Tentative d\'accès au fichier serveur');
        response.writeHead(403);
        response.end('Acces interdit. Petit malin.');
    }
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
        case '.ico':
            contentType= 'image/x-icon';
    }

    fs.stat(filePath, function(err,stat) { 
         if (err==null) {
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
            console.log(dateToLog(new Date) + 'Error fs.stat : ' + err);
            response.writeHead(404);
            response.end();
        }
    });
}

io.sockets.on('connection', function(socket) {
	socket.on('new_player', function(datas) {
        console.log(dateToLog(new Date) + 'Un joueur envoi son pseudo : ' + datas.pseudo);
        var joueurId=serverMap.addJoueur(datas.pseudo);
        /*Ici on choisi ou non de lancer la partie*/
        if(serverMap.isRunning==false && serverMap.getOnlinePlayers()==1)
            serverMap.start();
        socket.emit('set_id', joueurId);
		io.sockets.emit('broadcast_msg', {'auteur':'Admin', 'message': datas.pseudo + ' a rejoint la partie.', 'class': 'tchat-admin'});
		socket.set('pseudo', datas.pseudo , function () {
			/*console.log (dateToLog(new Date) + 'Création du joueur ' + joueurId + ' (' + datas.pseudo + ')');*/
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

    socket.on('broadcast_msg', function(datas){
        io.sockets.emit('broadcast_msg', datas);
    });

    socket.on('disconnect',function(){
        socket.get('id', function(err,id){
            if(id==null) return;
            //On lance un update de la DB sur ce joueur, pour pas qu'il perde ce qu'il a eu.
            dbCore.updatePlayerStats(serverMap.getJoueur(id));
            serverMap.removeJoueur(id);
            socket.broadcast.emit('remove_player', {'id':id});
            socket.get('pseudo', function(err, pseudo){
                if(pseudo!=null){
                    console.log(dateToLog(new Date)+"Joueur '" + pseudo + "' a quitté.");
                    socket.broadcast.emit('broadcast_msg', {'auteur':'Admin', 'message': pseudo + ' a quitté la partie.', 'class':'tchat-admin'});
                }
            });
        });
    });

    //Fonctions de création de compte et connexion
    socket.on('create_account', function(datas){
        dbCore.createAccount(datas, this);
    });
    socket.on('connection_attempt', function(datas){
        dbCore.connect(datas, this);
    });
});