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

//Fonction de commandes spéciales IG
function specialCommandProcessing(pseudo, string){
    var result='';
    if(string=="/help"){
        result='Liste des commandes : /help (donne la liste des commandes), /who (donne la liste des joueurs en ligne)';
        if(listeOnlinePlayers[pseudo]!=undefined && listeOnlinePlayers[pseudo].rang>0){
            result+=', /list (affiche la liste des joueurs avec leur ID), /kick ID (kick le joueur ID), /annonce MSG (affiche un message type annonce)';
        }
    }
    else if(string=="/who"){
        result=serverMap.getListeJoueursStr();
    }
    else if(string=="/getCurrentWave"){
        result=serverMap.currentWave + ' (vague courante)';
    }
    else if(string=="/list"){
        //Commande d'admin, qui list les joueurs avec leur ID pour les kicker/ban
        if(listeOnlinePlayers[pseudo]!=undefined && listeOnlinePlayers[pseudo].rang>0){
            result=serverMap.getListeJoueursWithIDStr();
        }
        else
            result="Vous n'avez pas les droits.";
    }
    else if(string.substr(0,5)=="/kick"){
        if(listeOnlinePlayers[pseudo]!=undefined && listeOnlinePlayers[pseudo].rang>0){
            if(string.length>=6){
                var id = parseInt(string.substring(6,string.length));
                var playerToKick = serverMap.getJoueur(id);
                if(playerToKick==undefined) return 'Le joueur n\'existe pas';
                dbCore.updatePlayerStats(playerToKick);
                io.sockets.emit('kick_player', {id:id});
                serverMap.removeJoueur(id);
                io.sockets.emit('remove_player', {'id':id});
                io.sockets.emit('broadcast_msg', {message:'Le joueur ' + playerToKick.pseudo + ' a été kické.', class:'tchat-game-event'});
                result="Commande OK";
            }
            else
                result="La commande s'utilise comme ceci : /kick playerID. Taper /list pour avoir la liste des ID";
        }
        else
            result="Vous n'avez pas les droits.";
    }
    else if(string.substr(0,4)=="/ban"){
        if(listeOnlinePlayers[pseudo]!=undefined && listeOnlinePlayers[pseudo].rang>=2){
            if(string.length>=5){
                var id = parseInt(string.substring(5,string.length));
                var playerToBan = serverMap.getJoueur(id);
                if(playerToBan==undefined) return 'Le joueur n\'existe pas';
                dbCore.updatePlayerStats(playerToBan);
                io.sockets.emit('ban_player', {id:id});
                serverMap.removeJoueur(id);
                io.sockets.emit('remove_player', {'id':id});
                io.sockets.emit('broadcast_msg', {message:'Le joueur' + playerToBan.pseudo + ' a été banni.', class:'tchat-game-event'});
                dbCore.ban(playerToBan.pseudo);
                result="Commande OK";
            }
            else
                result="La commande s'utilise comme ceci : /ban playerID. Taper /list pour avoir la liste des ID";
        }
        else
            result="Vous n'avez pas les droits.";
    }
    else if(string.substr(0,8)=="/annonce"){
        if(listeOnlinePlayers[pseudo]!=undefined && listeOnlinePlayers[pseudo].rang>0){
            io.sockets.emit('broadcast_msg', {auteur:'SERVEUR', message:string.substr(9, string.length), class:'tchat-admin'});
            result="Commande OK";
        }
        else
            result="Vous n'avez pas les droits.";

    }
    return result;
}

var listeOnlinePlayers = {};

/* GESTION DES ENVOIS RECEPTIONS CLIENTS */
io.sockets.on('connection', function(socket) {
    socket.set('pseudo', '_null');

    socket.on('update_player_mouvement', function(datas){
        //On protège en prenant l'id sauvegardé serverside
        socket.get('id', function(err, id){datas.id=id;serverMap.updateJoueurMouvement(datas);});
    });

    socket.on('update_player_angle', function(datas){
        socket.get('id', function(err, id){datas.id=id;serverMap.updateJoueurAngle(datas);});
    });

    socket.on('fire',function(datas){
        socket.get('id', function(err, id){datas.id=id;serverMap.fire(datas);});
    });

    socket.on('stop_fire', function(datas){
        socket.get('id', function(err, id){datas.id=id;serverMap.stopFire(datas);});
    });

    socket.on('broadcast_msg', function(datas){
        if(datas == undefined) return;
        if(datas.message == undefined) return;
        socket.get('pseudo', function(err, pseudo){
            //On regarde si c'est une commande spéciale
            var specialCommandResult = specialCommandProcessing(pseudo, datas.message)
            if( specialCommandResult != ''){
                socket.emit('broadcast_msg', {message:specialCommandResult});
            }
            else{
                datas.class='';
                datas.rang=(listeOnlinePlayers[pseudo]!=undefined) ? listeOnlinePlayers[pseudo].rang : 0;
                datas.auteur=pseudo;io.sockets.emit('broadcast_msg', datas);
            }
        });
    });

    socket.on('spect_mode_on', function(){
        socket.get('id', function(err, id){serverMap.switchSpectateur(id);})
    });

    socket.on('spect_mode_off',function(){
        socket.get('id', function(err, id){serverMap.switchInGame(id);})
    });

    socket.on('disconnect',function(){
        socket.get('id', function(err,id){
            if(id==null) return;
            //On lance un update de la DB sur ce joueur, pour pas qu'il perde ce qu'il a eu.
            var playerToUpdate = serverMap.getJoueur(id);
            if(playerToUpdate!=undefined){
                dbCore.updatePlayerStats(serverMap.getJoueur(id));
                serverMap.removeJoueur(id);
                socket.broadcast.emit('remove_player', {'id':id});
            }
            socket.get('pseudo', function(err, pseudo){
                if(pseudo!=null){
                    if(listeOnlinePlayers[pseudo]!=undefined)
                        delete listeOnlinePlayers[pseudo];
                    console.log(dateToLog(new Date)+"Joueur '" + pseudo + "' a quitté.");
                    socket.broadcast.emit('broadcast_msg', {'message': pseudo + ' a quitté le jeu.', 'class':'tchat-game-event'});
                }
            });
        });
    });

    //Fonctions de création de compte et connexion
    socket.on('create_account', function(datas){
        dbCore.createAccount(datas, this);
    });
    socket.on('connection_attempt', function(datas){
        dbCore.connect(datas, this, listeOnlinePlayers, serverMap);
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
                serverMap.getPlayer(pseudo).style=skinID;
            }
        });
    });
});