var app = require ('http'). createServer(handler)
, fs = require ('fs')
, io = require ('socket.io').listen(app)
, path = require('path');

 var DBCore= require('./js/DBCore.class.js');
 var dbCore=new DBCore();

 var ServerRoomManager=require('./js/ServerRoomManager.class.js');
 var serverRoomManager = new ServerRoomManager(io, dbCore);

app.listen (process.env.PORT || 80) ;

//stop le flood !
io.set('log level', 1);
io.set('transport', ['websocket']);

//Masque de dates à utiliser pour les log
var dateToLog=function(date){
    return '[' + date.getDate() + '/' + (date.getMonth() +1) + ' ' + date.getHours() + ':' + date.getMinutes() + '] ';
}

/* HANDLER DE PREMIERE CONNEXION AVEC UN CLIENT (envoi des pages)*/
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
    else if(filePath=='./bestiaire')
        filePath='./bestiaire.html';
    else if(filePath=='./fullLeaderboard'){
        dbCore.getLeaderboardHTML(response);
        return;
    }
    else if(filePath=='./leaderboard'){
        filePath='./leaderboard.html';
    }
    //On protège tous les dossiers et fichiers interdits
    else if(filePath=='./server.js' || filePath=='./js/CharacterManager.class.js' || filePath=='./js/DBCore.class.js' || filePath=='./js/ServerMap.class.js'){
        console.log(dateToLog(new Date) + 'Tentative d\'accès aux fichiers serveurs : ' + filePath);
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
            break;
        case '.wav':
            contentType= 'audio/wav';
            break;
        case '.mp3':
            contentType= 'audio/mpeg';
            break;
    }

    fs.stat(filePath, function(err,stat) { 
         if (err==null) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    console.log(dateToLog(new Date) + 'Erreur 500 : ' + err);
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control':'max-age=3600'});
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            console.log(dateToLog(new Date) + 'Erreur 404 : ' + err);
            response.writeHead(404);
            response.end();
        }
    });
}

/* GESTION DES ENVOIS RECEPTIONS CLIENTS */
io.sockets.on('connection', function(socket) {

    socket.on('update_player_mouvement', function(datas){
        serverRoomManager.actionJoueur('mvt', socket, datas);;
    });

    socket.on('update_player_angle', function(datas){
        serverRoomManager.actionJoueur('angle', socket, datas);;
    });

    socket.on('fire',function(datas){
        serverRoomManager.actionJoueur('fire',socket, datas);;
    });

    socket.on('stop_fire', function(datas){
        serverRoomManager.actionJoueur('stopFire', socket, datas);;
    });

    socket.on('broadcast_msg', function(datas){
        serverRoomManager.tchat(socket, datas);
    });

    socket.on('spect_mode_on', function(){
       serverRoomManager.switchSpectateur('on', socket);
    });

    socket.on('spect_mode_off',function(){
       serverRoomManager.serverMap.switchInGame('off', socket);
    });

    socket.on('disconnect',function(){
        serverRoomManager.disconnect(socket);
    });

    //Fonctions de création de compte et connexion
    socket.on('create_account', function(datas){
        dbCore.createAccount(datas, this);
    });
    socket.on('connection_attempt', function(datas){
        dbCore.connect(datas, this, serverRoomManager);
    });
    socket.on('request_account_informations', function(){
        socket.get('pseudo', function(err, pseudo){
            dbCore.getAccountInformations(pseudo, socket);
        });
    });
    socket.on('update_account_email', function(email){
        socket.get('pseudo', function(err, pseudo){
            dbCore.updateAccountEmail(pseudo, email, socket);
        });
    });
    socket.on('update_account_passwd', function(passwd){
        socket.get('pseudo', function(err, pseudo){
            dbCore.updateAccountPassword(pseudo, passwd, socket);
        });
    });
    socket.on('update_account_skin', function(skinID){
        socket.get('pseudo', function(err, pseudo){
            //A changer une fois les conditions d'obtentions faites.
            if(skinID>=0 && skinID<=10){
                dbCore.updateAccountSkin(pseudo, skinID);
                //var joueur = serverMap.getPlayer(pseudo);
                //if(joueur!=null) joueur.style=skinID;
            }
        });
    });
});