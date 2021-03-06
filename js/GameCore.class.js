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
		W:87,
		A:65,
		ENTER:13,
		ETOILE:220,
		ETOILE2:170,
		ECHAP:27,
		V:86,
		M:77,
		EFFACER:8
		};

//On met des valeurs pour pas que ça plante
var gameMap;
var gameCore;

//var SERVER_ADRESS=document.URL.substring(0,document.URL.indexOf("/",7));
var SERVER_ADRESS=document.domain;

/*Classe qui sera appelée pour gérer les envois/réceptions du serveur*/
function GameCore(pseudo,mdp){

	this.tryConnection=function(pseudo, mdp){
		this.pseudo=pseudo;
		this.mdp=mdp;
		this.socket.emit('connection_attempt', {pseudo:pseudo, mdp:mdp});
	}

	this.init=function(){
		this.socket = io.connect(SERVER_ADRESS);
		this.socket.on('broadcast_msg', function ( data ) {
			gameCore.tchat(data.auteur, data.message, data.class, data.rang);
		});
		this.socket.on('connect', function(){
			$('#inscription h2').text('Liaison avec le serveur OK...');
			gameCore.tryConnection(gameCore.pseudo, gameCore.mdp);
			$('#inscription h2').text('Vérification des identifiants en cours...');
			/*if(gameCore.playerId == -1){
				gameCore.socket.emit('new_player', {'pseudo' : gameCore.pseudo});
				$('#inscription').append('<h2>Création d\'un personnage en cours...</h2>');
			}
			else
				alert('ERREUR ! C\'est étrange. Merci de me signaler que vous avez eu cette erreur. (erreur "on connect" en cours de partie)');
		*/});
		this.socket.on('connection_fail', function(datas){
			$('#inscription h2').text(datas.message);
			initEventConnexion();
		});
		this.socket.on('connection_success', function(datas){
			$('#inscription h2').text(datas.message);
			gameCore.pseudo=datas.pseudo;
			//On sauvegarde le pseudo dans un cookie pour les futures connexions
			if(datas.pseudo.substr(0,8)!="visiteur")
				createCookie('zombiz_pseudo', datas.pseudo, 30);//1 mois

			//gameCore.socket.emit('new_player', {'pseudo' : datas.pseudo});
		});

		this.socket.on('disconnect', function(){
			alert('ERREUR : Vous avez perdu votre connexion.');
			document.location.reload(true);
		});
		this.socket.on('reconnecting', function(){
			alert('ERREUR : Vous avez perdu votre connexion et votre navigateur essaye de se reconnecter.');
			document.location.reload(true);
		});
		this.socket.on('connect_failed', function(){
			alert('ERREUR : Connexion au serveur impossible.');
		});


		this.socket.on('set_id', function(nbr){
			$('#inscription h2').text('Personnage créé ! Lancement du jeu...');
			$('#inscription').fadeOut(1000,function(){$(this).remove()});
			gameCore.playerId=nbr;

			if(gameMap!=null)return;
			gameMap=new GameMap();
			//gameMap.desinit(); //on lance que quand tout ça marche
			gameCore.socket.on('update',function(datas){
				//test auto-kick
				if(new Date - gameCore.dateLastAction > 1000 * 60 * 4 && gameMap.ghostCam.running==false){
					gameCore.spectateurOn();gameMap.desinit();
					alert('Vous avez été placé spectateur suite à une trop longue inactivité.');
				}
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
			$('#tchat').mousewheel(function(event, delta, deltaX, deltaY) {
				event.preventDefault();
				var hauteurActuelle = parseInt($('#tchat ul').css('bottom'));
				var pas = 15;
				//si on veut remonter
			    if(delta>0){
			    	$('#tchat ul').css('bottom', (hauteurActuelle- pas) +'px');
			    }
			    else{
			    	if(hauteurActuelle+pas < 20)
			    		$('#tchat ul').css('bottom', (hauteurActuelle + pas) +'px');
					else
						$('#tchat ul').css('bottom', '20px');
			    }
			});

			//On ajoute les fonctionnalités des options
			$('#passerSpectateur').click(function(){
				$('#buffs').empty();
				$('.fenetreInfosPlateau').hide();
				gameCore.spectateurOn();gameMap.desinit();
			});
			$('#rejoindrePartie').click(function(){
				$('.fenetreInfosPlateau').hide();
				gameCore.spectateurOff();
				$('#options').hide();
				$('#account').hide();
				gameCore.dateLastAction=new Date;
			});
			$('#menu').fadeIn(1000);
			$('#show_options').click(function(){
				$('.fenetreInfosPlateau').hide();
				if(OPTIONS.display_names)
					$("#checkbox-pseudo").attr("checked", "checked");
				else
					$("#checkbox-pseudo").removeAttr("checked"); 
				if(OPTIONS.sound_enabled)
					$("#checkbox-audio").attr("checked", "checked");
				else
					$("#checkbox-audio").removeAttr("checked"); 
				if(OPTIONS.display_blood)
					$("#checkbox-sang").attr("checked", "checked");
				else
					$("#checkbox-sang").removeAttr("checked"); 
				$('#options').show();
				return false;
			});
			$('#show_account').click(function(){
				$('.fenetreInfosPlateau').hide();
				$('#account').show();
				//On récupère les infos de la DB
				gameCore.requestAccountInformations();
				return false;
			});
			$('#account-change-passwd').click(function(){
				if($('#account-passwd1')[0].value==$('#account-passwd2')[0].value && $('#account-passwd1')[0].value!='')
					gameCore.updateAccountPassword($('#account-passwd1')[0].value);
				return false;
			});
			$('#account-change-email').click(function(){
				if($('#account-email')[0].value!='')
					gameCore.updateAccountEmail($('#account-email')[0].value);
				return false;
			});
			$('#show_serveurs').click(function(){
				$('.fenetreInfosPlateau').hide();
				$('#changementServeur').show();
				$.get('/serverList', function(data){
					$('#tableauListeServeurs').html(data);
				});
			});
			$('.openFenetres').click(function(){
				$('.fenetreInfosPlateau').hide();
				$('#'+$(this).attr('data-id')).show();
				return false;
			});
			$('.closeFenetres').click(function(){
				$('.fenetreInfosPlateau').hide();
				return false;
			});

			//On ajoute les fonctionnalités des trucs pour join le serveur
			$('body').delegate('.joinServerButton', 'click', function(){
				gameCore.changeMap($(this).attr('data-id-map'));
				$('.fenetreInfosPlateau').fadeOut();
				gameMap.clearMapFull();
				return false;
			});
			//Par défaut on "force" l'affichage de l'ecran des serveurs
			$('#show_serveurs').click();
		});

		this.socket.on('response_account_informations', function(datas){
			$('#account-name')[0].value=datas.pseudo;
			$('#account-email')[0].value=datas.email;
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

		this.socket.on('player_spectateur', function(datas){
			if(datas.id==gameCore.playerId){
				gameMap.desinit();
				gameCore.tchat('', 'Vous êtes spectateur, vous pourrez rejoindre à la fin de la manche.');
			}
		});
		this.socket.on('player_revive', function(datas){
			if(datas.id==gameCore.playerId){
				$('#joueur-life').text(datas.life).css('color','rgb(70,128,51)');
				$('#joueur-kills').text(datas.kills);
				gameMap.init();
			}
		});

		this.socket.on('clear_map', function(){
			gameMap.clearMap();
		});

		this.socket.on('clear_map_full', function(){
			gameMap.clearMapFull();
		});
		this.socket.on('success', function(){
			alert('La mise à jour s\'est bien déroulée.');
		});
		this.socket.on('kick_player', function(datas){
			if(datas.id==gameCore.playerId){
				alert('KICK ! Vous avez été kické du jeu.');
				document.location.reload(true);
			}
		});
		this.socket.on('ban_player', function(datas){
			if(datas.id==gameCore.playerId){
				alert('Vous avez été banni du jeu.');
				createCookie('zombiz_version_z', 1, 5);
				document.location.reload(true);
			}
		});

		this.socket.on('info_map', function(datas){
			gameMap.changeMap(datas);
		});
	}

	this.updateAngle=function(angle){
		this.dateLastAction=new Date;
		this.socket.emit('update_player_angle',{'id':gameCore.playerId,'angle':angle});
	}
	this.updateMouvement=function(){
		this.dateLastAction=new Date;
		this.socket.emit('update_player_mouvement',{'id':gameCore.playerId, 'directions' : gameCore.directions});
	}
	this.fire=function(targetX,targetY){
		this.dateLastAction=new Date;
		this.socket.emit('fire',{'id':gameCore.playerId, 'targetX' : targetX, 'targetY':targetY});
	}
	this.stopFire=function(targetX,targetY){
		this.dateLastAction=new Date;
		this.socket.emit('stop_fire',{'id':gameCore.playerId});
	}
	this.sendTchatMessage=function(datas){
		this.dateLastAction=new Date;
		this.socket.emit('broadcast_msg', datas);
	}
	this.spectateurOn=function(){
		this.socket.emit('spect_mode_on');
	}
	this.spectateurOff=function(){
		this.socket.emit('spect_mode_off');
	}
	this.requestAccountInformations=function(){
		this.socket.emit('request_account_informations')
	}
	this.updateAccountEmail=function(email){
		this.socket.emit('update_account_email', email);
	}
	this.updateAccountPassword=function(passwd){
		this.socket.emit('update_account_passwd', passwd);
	}
	this.updateSkin=function(skinID){
		this.socket.emit('update_account_skin', skinID);
		$('#boutique').hide();
		return false;
	}
	this.changeMap=function(mapID){
		this.socket.emit('change_map', mapID);
	}


	/*functions*/
	this.bouger=function(e){
		direction=e.keyCode;
		//On se déplace seulement si le tchat est pas ouvert
		if(!$("#tchat-input").is(":focus")){
			var directionDifferente=false;
			if(direction==KEYS.UP || direction==KEYS.Z || direction==KEYS.W){directionDifferente=gameCore.directions.haut==true?false:true;gameCore.directions.haut=true;}
			else if(direction==KEYS.DOWN || direction==KEYS.S){directionDifferente=gameCore.directions.bas==true?false:true;gameCore.directions.bas=true;}
			else if(direction==KEYS.LEFT || direction==KEYS.Q || direction==KEYS.A){directionDifferente=gameCore.directions.gauche==true?false:true;gameCore.directions.gauche=true;}
			else if(direction==KEYS.RIGHT || direction==KEYS.D){directionDifferente=gameCore.directions.droite==true?false:true;gameCore.directions.droite=true;}

			//Protection pour éviter d'envoyer 50 messages si on appuie que sur 1 touche
			if(directionDifferente)
				gameCore.updateMouvement();
		}

		return gameCore.gestionTouchesSpeciales(direction,e);
	};
	this.stopBouger=function(direction){
		direction=direction.keyCode;
		if(direction==KEYS.UP || direction==KEYS.Z || direction==KEYS.W){	gameCore.directions.haut=false;}
		else if(direction==KEYS.DOWN || direction==KEYS.S){	gameCore.directions.bas=false;}
		else if(direction==KEYS.LEFT || direction==KEYS.Q || direction==KEYS.A){	gameCore.directions.gauche=false;}
		else if(direction==KEYS.RIGHT || direction==KEYS.D){	gameCore.directions.droite=false;}
		gameCore.updateMouvement();
	};

	this.gestionTouchesSpeciales=function(key,e){
		//console.log(key);
		this.dateLastAction=new Date;
		if(!$("#tchat-input").is(":focus") && !$('#account-email').is(":focus") && !$('#account-passwd1').is(":focus") && !$('#account-passwd2').is(":focus")){
			if(key==KEYS.V){
				OPTIONS.display_names=!OPTIONS.display_names;
			}
			if(key==KEYS.M){
				if(OPTIONS.sound_enabled)
					for(var key in AUDIO)
						AUDIO[key].stop();
				OPTIONS.sound_enabled=!OPTIONS.sound_enabled;
			}
			if(key==KEYS.ETOILE ||key==KEYS.ETOILE2){
				$('#debug').toggle();
			}
			if(key==KEYS.EFFACER){
				e.preventDefault();
				return false;
			}
		}
		//tchat
		if(key==KEYS.Y || key==KEYS.ENTER){
			if($("#tchat-input").is(":focus")) 
				return true;
			else{
				if(!$('#account-email').is(":focus") && !$('#account-passwd1').is(":focus") && !$('#account-passwd2').is(":focus")){
					$('#tchat-input').focus();
					return false;
				}
				else
					return true;
			}
		}
		if(key==KEYS.ECHAP){
			if($("#tchat-input").is(":focus")){
				$('#tchat-input').blur();
				$('#map').focus();
			}
			//protection du reload de page sous FF
			return false;
		}
		//Protection du scrolling de la page
		if(key==KEYS.UP || key==KEYS.DOWN || key==KEYS.LEFT ||key==KEYS.RIGHT){
			//on annule l'event par défaut (par exemple scroll avec touches)
			e.preventDefault();
			return false;
		}
		return true;
	}

	this.tchat=function(auteur,message,classe, rang){
		//On supprime si y'a trop de messages
		if($('#tchat ul li').length>30){
			$('#tchat ul li:lt(5)').remove();
		}
		var debutMessage='';
		if(auteur!=undefined && auteur!=''){
			debutMessage=$('<span>').addClass('tchat-rang-0').addClass(classe).text(auteur + '> ');
			if(rang!=undefined)
				if(rang>0)
					debutMessage.prepend($('<span>').addClass('tchat-rang-' + rang).text('GM'));
		}
		if(classe==undefined)
			classe='';
		var corpsMessage=$('<span>').text(message);
		$('#tchat ul').append($('<li>').append(debutMessage).append(corpsMessage).addClass(classe));
	};

	this.debug=function(){
		if(gameCore.lastUpdate!=-1){
			var now=new Date;
			var currentPeak=(now-gameCore.lastUpdate);
			if(currentPeak>gameCore.maxPeak)gameCore.maxPeak=currentPeak;
			//console.log(currentPeak + 'ms since last update');
			gameCore.averageBPS=(gameCore.averageBPS*9 + currentPeak)/ 10;
			$('#debug-average-BPS').text( 'Recept moy. : ' + (Math.round(gameCore.averageBPS*100)/100) + 'ms. max :' + gameCore.maxPeak +'ms');
			gameCore.lastUpdate=now;
		}
		else
			gameCore.lastUpdate=new Date;
	}

	//Variables d'appui de touches
	this.directions={};
	this.directions.gauche=false;
	this.directions.droite=false;
	this.directions.haut=false;
	this.directions.bas=false;
	//info du joueur
	this.playerId=-1;
	this.pseudo=pseudo;
	this.mdp=mdp
	this.socket=null;
	//Variable pour l'autokick
	this.dateLastAction=new Date;
	/*variables pour le calcul des FPS*/
	this.lastUpdate=-1;
	this.averageBPS=0;
	this.maxPeak=0;
	this.init();	
}

function lancerPartie(pseudo, mdp){
	$('#inscription h2').text('Connexion au serveur en cours...');
	$('#button-inscription').unbind('click');
	$('#jouerVisiteur').unbind('click');
	if(gameCore==null)
		gameCore=new GameCore(pseudo,mdp);
	else
		gameCore.tryConnection(pseudo,mdp);
}
function initEventConnexion(){
	$('#button-inscription').click(function(){
		var inputPseudo=$('#champs-pseudo')[0].value;
		var inputMDP=$('#champs-mdp')[0].value;
		if(inputPseudo != '' && inputMDP!=''){
			lancerPartie(inputPseudo, inputMDP);
		}
	});

	$('#jouerVisiteur').click(function(){
		lancerPartie('visiteur', '');
	});
}

function updateLeaderBoard(){
	//On charge le leaderboard
	$.get('/top', function(data){
		$('#leaderboard').html(data);
	});
	//On update le leaderboard dans X secondes
	setTimeout(updateLeaderBoard, 60000);
}


$(window).load(function(){
	if(readCookie('zombiz_version_z')==null)
		initEventConnexion();
	else{
		$('#button-inscription').hide();
		$('#jouerVisiteur').hide();
		$('#creerCompte').hide();
		$('#inscription form').hide();
		$('#inscription h2').text('Vous ne pouvez plus jouer car votre compte a été banni.').after("<p>Si il s'agit d'une erreur, veuillez contacter un administrateur.</p>");
		alert('Vous avez été banni.');
	}
	//Eviter le changement du curseur en text
	document.onselectstart = function(e){ if(e.originalEvent!=undefined) e.originalEvent.preventDefault();e.preventDefault();return false; }

	$('#champs-pseudo').focus();

	$('#checkbox-audio').click(function(){
		if($(this).is(':checked'))
			OPTIONS.sound_enabled=true;
		else{
			OPTIONS.sound_enabled=false;
			if(OPTIONS.sound_enabled)
				for(var key in AUDIO)
					AUDIO[key].stop();
		}
	});
	$('#checkbox-pseudo').click(function(){
		if($(this).is(':checked'))
			OPTIONS.display_names=true;
		else
			OPTIONS.display_names=false;
	});
	$('#checkbox-sang').click(function(){
		if($(this).is(':checked'))
			OPTIONS.display_blood=true;
		else
			OPTIONS.display_blood=false;
	});
	//On autorise les clic sur la page de gestion de compte
	$('#account-email').click(function(){$(this).focus();});
	$('#account-passwd1').click(function(){$(this).focus();});
	$('#account-passwd2').click(function(){$(this).focus();});
	updateLeaderBoard();

	// FONCTIONS DE PRELOADING
	console.log('Lancement du chargement...');
	for(var i=0;i<tabImages.length;i++){
		tabObjImages[i]=new Image();
		tabObjImages[i].src=tabImages[i];
		tabObjImages[i].onload=incrementChargement;
	}
	/* Chargement des sons */
	for(var key in audio_tableau){
		AUDIO[key]=new buzz.sound(audio_tableau[key], {preload:true});
		//AUDIO[key].bind('canplaythrough',incrementChargement);
		//AUDIO[key].bind('error', incrementChargement);
		incrementChargement();
	}
	$('#loadingScreen p').text($('#version').text());
});
var nbZombieSound=8;
var AUDIO={};
var tabObjImages={};

//VARIABLES A PRELOADER
var tabImages=['img/players.png', 'img/players_mini.png', 'img/buffs.png', 'img/sang.png','img/accueil.jpg',
				'img/simple_bullet.png', 'img/droppables.png', 'img/zombies.png', 'img/zombies_mini.png'];
var audio_tableau={'GUN_SHORT':'/sounds/gunshot_short.wav', 'GUN_LONG':'/sounds/gunshot_long.wav',
						'ZOMBIE_0':'/sounds/i_want_brains.mp3', 'ZOMBIE_1':'/sounds/mummy_zombie.mp3', 
						'ZOMBIE_2':'/sounds/silverstone.wav', 'ZOMBIE_3':'/sounds/zombie_attack.wav',
						'ZOMBIE_4':'/sounds/Zombie_Brain_Eater.mp3', 'ZOMBIE_5':'/sounds/Zombie_Gets_Attacked.mp3',
						'ZOMBIE_6':'/sounds/zombie_groan_1.wav', 'ZOMBIE_7':'/sounds/zombie_groan_2.wav',
						'ZOMBIE_8':'/sounds/Zombie_Kill_You.mp3','ZOMBIE_9':'/sounds/Zombie_Long_Death.mp3',
						'ZOMBIE_10':'/sounds/Zombie_Moan.mp3'};
//var audio_tableau={};

var totalOK = 0;
var totalCible= tabImages.length + Object.keys(audio_tableau).length;
function incrementChargement(){
	totalOK++;
	//console.log(totalOK);
	$('#progressBar').text(parseInt(totalOK/totalCible*100)+'%');
	if(totalOK==totalCible){
		console.log('Chargement terminé.');
		$('#loadingScreen').remove();
		//Si on a le cookie du pseudo, alors on le met dans le champs
		if(readCookie('zombiz_pseudo')!=null){
			$('#champs-pseudo').val('');
			$('#champs-pseudo').val(readCookie('zombiz_pseudo'));
			$('#champs-mdp').val('');
			$('#champs-mdp').focus();
		}
		else
			$('#champs-pseudo').focus();
	}
}
