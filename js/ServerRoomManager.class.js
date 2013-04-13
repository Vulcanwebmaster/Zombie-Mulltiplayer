//Masque de dates à utiliser pour les log
var dateToLog=function(date){
    return '[' + date.getDate() + '/' + (date.getMonth() +1) + ' ' + date.getHours() + ':' + date.getMinutes() + '] ';
}

var CharacterManager=require('./CharacterManager.class.js');
var characterManager=new CharacterManager();

var ServerMap = require('./ServerMap.class.js');

/*Classe qui gère tout les calculs sur la map*/
module.exports = function ServerRoomManager(io, dbCore)
{
	this.nombreMaps=0;
	this.listeMap={};
	this.listeOnlinePlayers = {};//clé : socket.id, valeurs : pseudo, id et id de la map en cours

	this.init=function(){
		/** ACCUEIL **/
		this.listeMap[this.nombreMaps++]=this.getNewServerMap();
		this.listeMap[0].id=0;
		this.listeMap[0].nom='ACCUEIL';
		this.listeMap[0].type='AUCUN';
		//mettre des spec et les envoyer dans la servermap
		var options={id:0,vagues:false,hauteur:448, largeur:630, map:'/img/accueil.jpg', objets : {}};
		this.listeMap[0].serverMap=new ServerMap(io, characterManager, dbCore, options);

		/** PLAINE 1 **/
		this.listeMap[this.nombreMaps++]=this.getNewServerMap();
		this.listeMap[1].id=1;
		this.listeMap[1].nom='PLAINE_1';
		//mettre des spec et les envoyer dans la servermap
		var options={id:1,vagues:true,hauteur:1000, largeur:2000, map:'/img/map.jpg', objets : {}};
		this.listeMap[1].serverMap=new ServerMap(io, characterManager, dbCore, options);
	}

	this.getNewServerMap=function(){
		return {
			id:-1,
			nom:'MAP_VIDE',
			type: 'SURVIE',
			niveau : 'FACILE',
			carte:1,
			serverMap : null
		};
	}

	this.getLinkedServerMap=function(socket){
		var idMap = this.listeOnlinePlayers[socket.id].idMap;
		return this.listeMap[idMap].serverMap;
	}

	this.actionJoueur=function(action, socket, datas){
		datas.id=this.listeOnlinePlayers[socket.id].id;
		var serverMap=this.getLinkedServerMap(socket);
		if(action=='mvt')
			serverMap.updateJoueurMouvement(datas);
		else if(action=='angle')
			serverMap.updateJoueurAngle(datas);
		else if(action=='fire')
			serverMap.fire(datas);
		else if(action=='stopFire')
			serverMap.stopFire(datas);
	}

	this.tchat=function(socket, datas){
		if(datas == undefined) return;
        if(datas.message == undefined) return;
        //On regarde si c'est une commande spéciale
        var specialCommandResult = '';//this.specialCommandProcessing(pseudo, datas.message)
        if( specialCommandResult != ''){
            socket.emit('broadcast_msg', {message:specialCommandResult});
        }
        else{
            datas.class='';
            datas.rang=this.listeOnlinePlayers[socket.id].rang;
            datas.auteur= this.listeOnlinePlayers[socket.id].pseudo;
            var idMap = this.listeOnlinePlayers[socket.id].idMap;
            io.sockets.in('tchat-'+idMap).emit('broadcast_msg', datas);
        }
	}

	this.addDefaultJoueur=function(pseudo, socket){
		return this.addJoueur(pseudo, socket, 0);
	}
	this.addJoueur=function(pseudo, socket, idMap){
		this.joinRoom(socket, idMap);
		var playerId=this.listeMap[idMap].serverMap.addJoueur(pseudo, socket);
		this.listeOnlinePlayers[socket.id]={pseudo:pseudo, id:playerId, idMap:idMap};
		//on envoi au joueur les infos de la map
		var serverMap=this.getLinkedServerMap(socket);
		socket.emit('info_map', {x:serverMap.widthMap, y:serverMap.heightMap, file:serverMap.mapFile, objets:serverMap.mapObjects});
		
		return playerId;
	}

	this.addDefaultJoueurFromDB=function(infoDB, socket){
		return this.addJoueurFromDB(infoDB, socket, 0);
	}
	this.addJoueurFromDB=function(infoDB, socket, idMap){
		this.joinRoom(socket, idMap);
		var playerId=this.listeMap[idMap].serverMap.addJoueurFromDB(infoDB, socket);
		this.listeOnlinePlayers[socket.id]={pseudo:infoDB.pseudo, id:playerId, idMap:idMap};
		//on envoi au joueur les infos de la map
		var serverMap=this.getLinkedServerMap(socket);
		socket.emit('info_map', {x:serverMap.widthMap, y:serverMap.heightMap, file:serverMap.mapFile, objets:serverMap.mapObjects});
		
		return playerId;
	}

	this.joinRoom=function(socket, idRoom){
		socket.join('tchat-'+idRoom);
		socket.join('map-'+idRoom);
	}
	this.leaveRoom=function(socket, idRoom){
		socket.leave('tchat-'+idRoom);
		socket.leave('map-'+idRoom);
	}

	this.getPlayerByPseudo=function(pseudo){
		for(var id in this.listeMap){
			if(this.listeMap[id].serverMap.getPlayer(pseudo)!=null)
				return this.listeMap[id].serverMap.getPlayer(pseudo);
		}
		return null;
	}

	this.changeMap=function(socket, idMap){
		var currentMapId=this.listeOnlinePlayers[socket.id].idMap;
		console.log('Map id : from ' + currentMapId + ' to ' + idMap);
		this.leaveRoom(socket, currentMapId);
		
		if(idMap==currentMapId)return;

		if(this.listeMap[idMap]!=undefined){
			var joueur = this.listeOnlinePlayers[socket.id];
			this.getLinkedServerMap(socket).removeJoueur(joueur.id);
			joueur.idMap=parseInt(idMap);
			dbCore.movePlayer(joueur,socket, this);
		}
	}

	this.disconnect=function(socket){
		if(this.listeOnlinePlayers[socket.id]==null)return;
		var id = this.listeOnlinePlayers[socket.id].id;
		var pseudo = this.listeOnlinePlayers[socket.id].pseudo;
		var idMap = this.listeOnlinePlayers[socket.id].idMap;
		var serverMap=this.getLinkedServerMap(socket);
		if(id==null) return;
        //On lance un update de la DB sur ce joueur, pour pas qu'il perde ce qu'il a eu.
        var playerToUpdate = serverMap.getJoueur(id);
        if(playerToUpdate!=undefined){
            dbCore.updatePlayerStats(playerToUpdate);
            serverMap.removeJoueur(id);
            io.sockets.in('map-'+idMap).emit('remove_player', {'id':id});
        }
        if(pseudo!=null){
            if(this.listeOnlinePlayers[socket.id]!=undefined)
                delete this.listeOnlinePlayers[socket.id];
            console.log(dateToLog(new Date)+"Joueur '" + pseudo + "' a quitté.");
            io.sockets.in('tchat-'+idMap).emit('broadcast_msg', {'message': pseudo + ' a quitté le jeu.', 'class':'tchat-game-event'});
        }
	}

	this.switchSpectateur = function(type, socket){
		var serverMap=this.getLinkedServerMap(socket);
		var id = this.listeOnlinePlayers[socket.id].id;
		if(type=="on")
			serverMap.switchSpectateur(id);
		else if(type=="off")
			serverMap.switchInGame(id);
	}

	this.getListServers=function(response){
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.write('<tr><th>Serveur</th><th>Type</th><th>Difficulté</th><th>Joueurs</th><th>Rejoindre</th></tr>');
		for(var id in this.listeMap){
			var serveur = this.listeMap[id];
			response.write('<tr><td>'+ serveur.nom +'</td><td>'+ serveur.type +'</td><td>'+ serveur.niveau +'</td><td>'+serveur.serverMap.getOnlinePlayers() +'/10</td><td><a class="joinServerButton" data-id-map="'+id+'" href="#">Rejoindre</a></td></tr>');
		}
		response.end();
	}

	this.specialCommandProcessing=function(pseudo, string){
		//Tout à changer ici. surtout les gettesr via pseudo, ce n'est plus vrai)
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

	this.init();
}