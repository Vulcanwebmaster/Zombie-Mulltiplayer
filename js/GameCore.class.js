/*Variable globale*/
var KEYS={
		UP:38,
		DOWN:40,
		LEFT:37,
		RIGHT:39,
		Z:90,
		Q:81,
		S:83,
		D:68,
		Y:89,
		ENTER:13,
		ETOILE:220,
		ECHAP:27,
		V:86
		};

//On met des valeurs pour pas que ça plante
var gameMap;
var gameCore;

var SERVER_ADRESS=document.URL.substring(0,document.URL.indexOf("/",7));


/*Classe qui sera appelée pour gérer les envois/réceptions du serveur*/
function GameCore(pseudo){
	var socket;
	var directions;
	var playerId;
	var pseudo;

	this.init=function(){
		this.socket = io.connect(SERVER_ADRESS);
		this.socket.on('broadcast_msg', function ( data ) {
			gameCore.tchat(data.auteur, data.message, data.class);
		});

		this.socket.on('connect', function(){
			if(gameCore.playerId == -1){
				gameCore.socket.emit('new_player', {'pseudo' : gameCore.pseudo});
				$('#inscription').append('<h2>Création d\'un personnage en cours...</h2>');
			}
			else
				alert('ERREUR ! C\'est étrange. Merci de me signaler que vous avez eu cette erreur. (erreur "on connect" en cours de partie)');
		});

		this.socket.on('reconnect', function(){
			alert('Vous avez perdu votre connexion. Ou tout du moins, votre navigateur est en train de dire ça...');
		});

		this.socket.on('set_id', function(nbr){
			$('#inscription').append('<h2>Personnage créé ! Lancement de la partie...</h2>');
			$('#inscription').fadeOut(1000,function(){$(this).remove()});
			gameCore.playerId=nbr;
			gameMap=new GameMap();
			gameMap.init(); //on lance que quand tout ça marche
			gameCore.socket.on('update',function(datas){
				gameCore.debug();
				gameMap.update(datas);
			});
			//On ajoute la fonctionnalité du tchat

			$('#tchat-form').submit(function(){
				var message=$('#tchat-input')[0].value;
				if(message!='')
					gameCore.sendTchatMessage({'auteur':gameCore.pseudo, 'message':message });
				$('#tchat-input')[0].value='';
				$('#tchat-input').blur();
				$('#map').focus();
			});
		});

		this.socket.on('remove_player', function(datas){
			gameMap.removeJoueur(datas.id);
		});


		this.socket.on('player_die', function(datas){
			gameMap.addBlood(datas.x+'px', datas.y+'px');
			if(datas.id==gameCore.playerId){
				$('#joueur-life').text('0');
				gameCore.tchat('', 'Vous êtes mort.', 'tchat-game-event');
				gameCore.directions.gauche=false;gameCore.directions.droite=false;gameCore.directions.haut=false;gameCore.directions.bas=false;
				gameMap.isFiring=false;
				$('#buffs').text('');
				gameMap.desinit();
			}
			else
				gameCore.tchat('', datas.pseudo + ' est mort.', 'tchat-game-event');
		});

		this.socket.on('player_revive', function(datas){
			if(datas.id==gameCore.playerId){
				$('#joueur-life').text(datas.life).css('color','rgb(70,128,51)');
				$('#joueur-kills').text(datas.kills);
				gameCore.tchat('','Nouvelle vie !', 'tchat-game-event');
				gameMap.init();
			}
		});

		this.socket.on('clear_map', function(){
			gameMap.clearMap();
		});

		this.socket.on('clear_map_full', function(){
			gameMap.clearMapFull();
		});

	}

	this.updateAngle=function(angle){
		this.socket.emit('update_player_angle',{'id':gameCore.playerId,'angle':angle});
	}
	this.updateMouvement=function(){
		this.socket.emit('update_player_mouvement',{'id':gameCore.playerId, 'directions' : gameCore.directions});
	}
	this.fire=function(targetX,targetY){
		this.socket.emit('fire',{'id':gameCore.playerId, 'targetX' : targetX, 'targetY':targetY});
	}
	this.stopFire=function(targetX,targetY){
		this.socket.emit('stop_fire',{'id':gameCore.playerId});
	}
	this.sendTchatMessage=function(datas){
		this.socket.emit('broadcast_msg', datas);
	}


	/*functions*/
	this.bouger=function(e){
		direction=e.keyCode;
		//On se déplace seulement si le tchat est pas ouvert
		if(!$("#tchat-input").is(":focus")){
			var directionDifferente=false;
			if(direction==KEYS.UP || direction==KEYS.Z){directionDifferente=gameCore.directions.haut==true?false:true;gameCore.directions.haut=true;}
			else if(direction==KEYS.DOWN || direction==KEYS.S){directionDifferente=gameCore.directions.bas==true?false:true;gameCore.directions.bas=true;}
			else if(direction==KEYS.LEFT || direction==KEYS.Q){directionDifferente=gameCore.directions.gauche==true?false:true;gameCore.directions.gauche=true;}
			else if(direction==KEYS.RIGHT || direction==KEYS.D){directionDifferente=gameCore.directions.droite==true?false:true;gameCore.directions.droite=true;}

			//Protection pour éviter d'envoyer 50 messages si on appuie que sur 1 touche
			if(directionDifferente)
				gameCore.updateMouvement();
		}

		return gameCore.gestionTouchesSpeciales(direction,e);
	};
	this.stopBouger=function(direction){
		direction=direction.keyCode;
		if(direction==KEYS.UP || direction==KEYS.Z){	gameCore.directions.haut=false;}
		else if(direction==KEYS.DOWN || direction==KEYS.S){	gameCore.directions.bas=false;}
		else if(direction==KEYS.LEFT || direction==KEYS.Q){	gameCore.directions.gauche=false;}
		else if(direction==KEYS.RIGHT || direction==KEYS.D){	gameCore.directions.droite=false;}
		gameCore.updateMouvement();
	};

	this.gestionTouchesSpeciales=function(key,e){
		//console.log(key);
		if(!$("#tchat-input").is(":focus")){
			if(key==KEYS.V){
				OPTIONS.display_names=!OPTIONS.display_names;
			}
			if(key==KEYS.ETOILE){
				if($('#debug').css('display')=='none')
					$('#debug').css({'display':'block'});
				else
					$('#debug').css({'display':'none'});
			}
		}
		//tchat
		if(key==KEYS.Y || key==KEYS.ENTER){
			if($("#tchat-input").is(":focus")) 
				return true;
			else{
				$('#tchat-input').focus();
				return false;
			}
		}
		if(key==KEYS.ECHAP){
			$('#tchat-input').blur();
			$('#map').focus();
		}
		//Protection du scrolling de la page
		if(key==KEYS.UP || key==KEYS.DOWN || key==KEYS.LEFT ||key==KEYS.RIGHT){
			//on annule l'event par défaut (par exemple scroll avec touches)
			e.preventDefault();
			return false;
		}
		return true;
	}

	this.tchat=function(auteur,message,classe){
		var debutMessage='';
		if(auteur!=undefined && auteur!='')
			debutMessage=$('<span>').addClass('tchat-default-auteur').addClass(classe).text(auteur + '> ');
		if(classe==undefined)
			classe='';
		var corpsMessage=$('<span>').text(message);
		$('#tchat ul').append($('<li>').append(debutMessage).append(corpsMessage).addClass(classe));
	};

	this.debug=function(){
		if(gameCore.lastUpdate!=-1){
			var now=new Date;
			var currentPeak=(now-gameCore.lastUpdate);
			//console.log(currentPeak + 'ms since last update');
			if(currentPeak > gameCore.maxPeak) gameCore.maxPeak=currentPeak;
			gameCore.averageBPS=(gameCore.averageBPS*gameCore.nbrPeak + currentPeak)/ (gameCore.nbrPeak+1);
			gameCore.nbrPeak++;
			$('#debug').html( 'current : ' + currentPeak + 'ms<br/>' +
							'average : ' + (Math.round(gameCore.averageBPS*100)/100) + 'ms<br/>' +
							'max : ' + gameCore.maxPeak + 'ms')
			gameCore.lastUpdate=now;
		}
		else
			gameCore.lastUpdate=new Date;
	}

	this.directions={};
	this.directions.gauche=false;
	this.directions.droite=false;
	this.directions.haut=false;
	this.directions.bas=false;
	this.playerId=-1;
	this.pseudo=pseudo;
	this.socket=null;	
	/*variable pour le calcul des FPS*/
	this.lastUpdate=-1;
	this.maxPeak=0;
	this.nbrPeak=0;
	this.averageBPS=0;
	this.init();	
}

function lancerPartie(pseudo){
	$('#inscription').html('<div><h2>Connexion au serveur en cours...</h2></div>');
	$('#button-inscription').unbind('click');
	$('#jouerVisiteur').unbind('click');
	gameCore=new GameCore(pseudo);
}
$(document).ready(function(){
	//gameCore=new GameCore(pseudo);
	$('#button-inscription').click(function(){
		input=$('#champs-pseudo')[0].value;
		if(input != ''){
			lancerPartie(input);
		}
	});

	$('#jouerVisiteur').click(function(){
		lancerPartie('Visiteur' + (new Date()%100));
	});

	//Eviter le changement du curseur en text
	document.onselectstart = function(e){ e.originalEvent.preventDefault();e.preventDefault();return false; }

	$('#champs-pseudo').focus();
})