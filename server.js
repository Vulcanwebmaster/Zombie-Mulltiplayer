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
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control':'max-age=3600'});
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

//Fonction de commandes spéciales IG
function specialCommandProcessing(string){
    var result='';
    if(string=="/help"){
        result='Liste des commandes : /help (donne la liste des commandes), /who (donne la liste des joueurs en ligne)';
    }
    else if(string=="/who"){
        result=serverMap.getListeJoueursStr();
    }
    /*else if(string=="/list"){
        //Commande d'admin, qui list les joueurs avec leur ID pour les kicker/ban
        result=serverMap.getListeJoueursWithIDStr();
    }
    else if(string.substr(0,5)=="/kick"){
        //Commande admin
        //Usage : /kick ID
        if(string.length>=6)
            var ID = parseInt(string.substring(6,string.length));
        else
            result="La commande s'utilise comme ceci : /kick playerID. Taper /list pour avoir la liste des ID";
    }*/
    return result;
}


/* GESTION DES ENVOIS RECEPTIONS CLIENTS */
io.sockets.on('connection', function(socket) {
    socket.set('pseudo', '_null');
    socket.set('grade', 0);
	socket.on('new_player', function(datas) {
        console.log(dateToLog(new Date) + 'Un joueur envoi son pseudo : ' + datas.pseudo);
        //On vérifie avant tout que le pseudo envoyé correspond bien à celui enregistré sur la socket
        socket.get('pseudo', function(err, pseudo){
            if(pseudo==datas.pseudo){
                var joueurDejaInGame = serverMap.getPlayer(datas.pseudo);
                if(joueurDejaInGame == null || datas.pseudo.toLowerCase() == "visiteur")
                    var joueurId=serverMap.addJoueur(datas.pseudo, socket);
                else{
                    socket.emit('set_id', -1);
                    socket.emit('player_spectateur', {id:-1});
                    socket.emit('broadcast_msg', {'message': 'ATTENTION : Le pseudo ' + datas.pseudo + ' est déjà pris. Vous ne pourrez pas jouer. /!\\', 'class': 'tchat-error'});;
               }
                io.sockets.emit('broadcast_msg', {'message': datas.pseudo + ' vient de se connecter.', 'class': 'tchat-game-event'});
                socket.set('id', joueurId);
            }
            else
                console.log(dateToLog(new Date) + 'Le pseudo ne correspond pas à celui de la socket.(' + pseudo + ')');
        });
	});

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
        //On regarde si c'est une commande spéciale
        var specialCommandResult = specialCommandProcessing(datas.message)
        if( specialCommandResult != ''){
            socket.emit('broadcast_msg', {message:specialCommandResult});
        }
        else
            socket.get('pseudo', function(err, pseudo){
                datas.class='';
                datas.auteur=pseudo;io.sockets.emit('broadcast_msg', datas);
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
            dbCore.updatePlayerStats(serverMap.getJoueur(id));
            serverMap.removeJoueur(id);
            socket.broadcast.emit('remove_player', {'id':id});
            socket.get('pseudo', function(err, pseudo){
                if(pseudo!=null){
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
        dbCore.connect(datas, this);
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
});