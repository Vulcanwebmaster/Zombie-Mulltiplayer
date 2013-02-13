/*CLASSES*/
function GameMap(){
	/*attributes*/
	var heightPlateau;
	var widthPlateau;
	var widthMap;
	var heightMap;
	var divMap;
	var lastDegreeSent;
	/*functions*/
	this.init=function(){
		this.isFiring=false;
		this.clearMap();
		//On enleve la ghostMap si elle est là
		this.ghostCam.running=false;
		$('body').unbind('keydown');
		$('body').unbind('keyup');
		$('body').keydown(gameCore.bouger);
		$('body').keyup(gameCore.stopBouger);
		$('#plateau').mousedown(function(e){
			e.originalEvent.preventDefault();
			var offset = $('#map').offset();
			var relativeX = (e.pageX - offset.left);
			var relativeY = (e.pageY - offset.top);
			gameMap.isFiring=true;
			gameCore.fire(relativeX,relativeY);
		});
		$('#plateau').mouseup(function(e){
			gameMap.isFiring=false;
			gameCore.stopFire();
		});
		$('#plateau').mousemove(function(e){
			var offset = $(this).offset();
			var relativeX = (e.pageX - offset.left - gameMap.widthPlateau/2 - gameMap.LARGEUR_PERSO/2);
			var relativeY = (e.pageY - offset.top - gameMap.heightPlateau/2 - gameMap.LARGEUR_PERSO/2);
			player=document.getElementById('player'+gameCore.playerId);
			var angle=Math.round(Math.atan2(relativeY,relativeX)*180/Math.PI,0);
			gameMap.rotate(player,angle);		
			if(angle < gameMap.lastDegreeSent - 1 || angle>gameMap.lastDegreeSent + 1){
				gameCore.updateAngle(angle);
				gameMap.lastDegreeSent=angle;
				//Si on est en train de tirer, alors on met la position target a jour sur le server
				if(gameMap.isFiring){
					offset=$('#map').offset();
					var viseX = (e.pageX - offset.left);
					var viseY = (e.pageY - offset.top);
					gameCore.fire(viseX,viseY);
				}
			}
		});
		$('#map').focus();
	}
	this.desinit=function(){
		$('body').unbind('keydown');
		$('body').unbind('keyup');
		$('#plateau').unbind('mousemove');
		$('#plateau').unbind('mousedown');
		$('#plateau').unbind('mouseup');
		$('body').keydown(this.ghostCamKeyDown);
		$('body').keyup(this.ghostCamKeyUp);
		this.ghostCam.running=true;
		this.ghostCamloop();
	}


	this.update=function(datas){
		this.GAME_SPEED=gameCore.averageBPS;
		this.last_update=datas.id;
		//Update de tous les zombies
		var player;
		for(var idPerso in datas.listeJoueurs){
			player=document.getElementById('player'+idPerso);
			if(player==null){
				player=document.createElement('div');
				player.className= player.className+' map-item player';
				player.id='player' + idPerso;
				player.style.left=datas.listeJoueurs[idPerso].x +'px';
				player.style.top=datas.listeJoueurs[idPerso].y+'px';
				player.setAttribute('data-max-life',datas.listeJoueurs[idPerso].life);
				//Affichage du style
				player.style.backgroundPosition=this.setBackgroundPosition(datas.listeJoueurs[idPerso].style);
				this.rotate(player,datas.listeJoueurs[idPerso].angle);	
				this.divMap.appendChild(player);
			}
			else{
				this.moveTo(player, datas.listeJoueurs[idPerso].x,datas.listeJoueurs[idPerso].y);
				player.setAttribute('data-life',datas.listeJoueurs[idPerso].life);
				if(datas.listeJoueurs[idPerso].alive==true){
					player.style.zIndex=9;
					player.style.backgroundPosition=this.setBackgroundPosition(datas.listeJoueurs[idPerso].style);
				}
				if(datas.listeJoueurs[idPerso].alive==false){
					player.style.zIndex=5;
					player.style.backgroundPosition=this.setBackgroundPosition(12);
				}
			}
			if(idPerso!=gameCore.playerId)
				this.rotate(player,datas.listeJoueurs[idPerso].angle);				
		}

		var zombie;
		for(var idZombie in datas.listeZombies){
			zombie=document.getElementById('zombie'+idZombie);
			if(zombie==null){	
				var zombie=document.createElement('div');
				zombie.className= zombie.className+' map-item zombie';
				zombie.id='zombie' + idZombie;
				zombie.setAttribute('data-max-life',datas.listeZombies[idZombie].life);
				zombie.style.left=datas.listeZombies[idZombie].x+'px';
				zombie.style.top=datas.listeZombies[idZombie].y+'px';
				zombie.style.backgroundPosition=this.setBackgroundPosition(datas.listeZombies[idZombie].style);
				this.rotate(zombie,datas.listeJoueurs[idPerso].angle);
				this.divMap.appendChild(zombie);
			}
			else{
				this.moveTo(zombie,datas.listeZombies[idZombie].x ,datas.listeZombies[idZombie].y);
				zombie.setAttribute('data-life',datas.listeZombies[idZombie].life);
				if(datas.listeZombies[idZombie].alive==false){
					zombie.style.zIndex=5;
					zombie.style.backgroundPosition=this.setBackgroundPosition(12);
				}
				this.rotate(zombie,datas.listeZombies[idZombie].angle);
			}
		}
		//On ajoute l'event d'affichage de la vie du zombie
		/*$('.zombie').unbind('mouseover').unbind('mouseleave')
			.mouseover(function(){
				if($(this).attr('data-life') != '0'){
					$('#zombie-life').stop(true).text($(this).attr('data-life') +'/' + $(this).attr('data-max-life'))
									.animate({'opacity':1},200);
				}
			})
			.mouseleave(function(){
			$('#zombie-life').text($(this).attr('data-life') +'/' + $(this).attr('data-max-life'))
								.animate({'opacity':0},1000);
			});*/

		var item;
		for(var idItem in datas.listeTemporaryItems){
			item=datas.listeTemporaryItems[idItem];
			if(item.type=='fire')
				this.drawLine(parseInt(item.x), parseInt(item.y), parseInt(item.targetX), parseInt(item.targetY));
			else if(item.type=='sang')
				this.addBlood(parseInt(item.x), parseInt(item.y));
			else if(item.type=='player_life'){
				if(item.id==gameCore.playerId){
					$('#joueur-life').text(item.life);
					//coloration de la case
					if(item.life>75)
						$('#joueur-life').css('color','rgb(70,128,51)');
					else if(item.life>25 && item.life<=75)
						$('#joueur-life').css('color','rgb(179,121,15)');
					else
						$('#joueur-life').css('color','rgb(162,13,17)');
				}
			}
			else if(item.type=='numero_vague'){
				$('#vague-courante').text(item.value);
			}
			else if(item.type=='zombie_killed'){
				if(item.id==gameCore.playerId)
					$('#joueur-kills').text(item.kills);
			}
			else if(item.type=='compte_a_rebours_vague'){
				var div=$('<div>');
				$('#plateau').append(div.attr('id','compteAReboursVague').text(item.value));
				div.fadeOut(500, function(){$(this).remove();});
			}

		}
		//on lance l'update local au cas où le serveur lag
		var _this=this;
		/*setTimeout(function(){_this.localUpdate(datas.id);}, this.GAME_SPEED);*/
	}

	this.localUpdate=function(id){
		//si y'a eu une update entre temps, on ne fait pas l'update en local
		if(id<this.last_update){
			return 0;
		}

		var listeZombies=document.getElementsByClassName('zombie');
		var zombieTmp;
		for(var i=0; i< listeZombies.length;i++){
			zombieTmp=listeZombies[i]
			this.moveTo(zombieTmp,
						parseInt((parseFloat(zombieTmp.style.left) + Math.cos(this.getRotateDegree(zombieTmp) / 180 * Math.PI)* parseFloat(zombieTmp.getAttribute('data-speed')))),
						parseInt((parseFloat(zombieTmp.style.top) + Math.sin(this.getRotateDegree(zombieTmp) / 180 * Math.PI)* parseFloat(zombieTmp.getAttribute('data-speed'))))
						);
		}
		var listeJoueurs=document.getElementsByClassName('player');
		var joueurTmp;
		for(var i=0; i< listeJoueurs.length;i++){
			joueurTmp=listeJoueurs[i];
			var coefX=0,coefY=0;
	         if(joueurTmp.getAttribute('data-haut')=='true'){coefY=-1;}
	         else if(joueurTmp.getAttribute('data-bas')=='true'){coefY=1;}
	         if(joueurTmp.getAttribute('data-gauche')=='true'){coefX=-1;}
	         else if(joueurTmp.getAttribute('data-droite')=='true'){coefX=1;}

	         //Cas des diagonales
	         if(coefX!=0 && coefY!=0){
	         	coefX=coefX > 0 ? this.COSINUS_45 : -this.COSINUS_45;
	         	coefY=coefY > 0 ? this.COSINUS_45 : -this.COSINUS_45;
	         }
	         this.moveTo(joueurTmp,parseInt((parseFloat(joueurTmp.style.left) + coefX * parseFloat(joueurTmp.getAttribute('data-speed')))) ,parseInt((parseFloat(joueurTmp.style.top) + coefY * parseFloat(joueurTmp.getAttribute('data-speed')))))
		}
		var _this=this;
		//setTimeout(function(){_this.localUpdate(id);}, this.GAME_SPEED);

	}

	this.moveTo=function(ent, x, y){
		ent.style.left=x+'px';
		ent.style.top=y+'px';
		/*$(ent).stop().animate({'top' : y+'px', 'left' : x+'px'}, this.GAME_SPEED, 'linear');*/
		if(gameCore.playerId==parseInt(ent.getAttribute('id').substring(6, ent.getAttribute('id').length))
			&& (ent.getAttribute('id').substring(0,1)=='p')
			&& this.ghostCam.running==false){
				this.centerMapOn(x,y);
				ent.style.zIndex=10;
			}
	}

	this.rotate=function(ent,deg){
		if(ent!=null){
			ent.style.transform='rotate('+deg+'deg)';
			ent.style.mozTransform='rotate('+deg+'deg)';
			ent.style.webkitTransform='rotate('+deg+'deg)';
			ent.style.oTransform='rotate('+deg+'deg)';
			ent.style.msTransform='rotate('+deg+'deg)';
		}
	}
	this.getRotateDegree=function(ent){
		if(ent==null || ent.style==null || ent.style.transform==null)
			return 0;
		return (ent.style.transform.substring(7,ent.style.transform.indexOf("deg",7)));
	}

	this.centerMapOn=function(x,y){
		var map=document.getElementById('map');
		map.style.top=(this.heightPlateau/2 - y) + 'px';
		map.style.left=(this.widthPlateau/2 - x) + 'px';
		/*$('#map').stop().animate({'top' : (this.heightPlateau/2 - y ) + 'px', 
							'left':(this.widthPlateau/2 - x ) + 'px'},this.GAME_SPEED, 'linear');*/
	}

	this.addBlood=function(x,y){
		//comptage du nombre de "sang" déjà présent
		var numItems = $('.sang').length;
		if(numItems>200){
			$('.sang:lt(10)').remove();
			numItems = $('.sang').length;
		}

		var div=document.createElement('div');
		div.className= div.className+' map-item sang';
		div.style.top=y +'px';
		div.style.left=x +'px';
		div.style.backgroundPosition=this.setBackgroundPosition(parseInt(Math.random()*12));
		this.rotate(div, parseInt(Math.random()*360));
		this.divMap.appendChild(div);
	}

	this.removeJoueur=function(id){
      	this.removeElement('map', 'player'+id);
   }

   this.removeElement=function(parentDiv, childDiv){
   		 if (document.getElementById(childDiv)) {     
	         var child = document.getElementById(childDiv);
	          var parent = document.getElementById(parentDiv);
	          parent.removeChild(child);
	     }
	     else {
	          //alert("Child div has already been removed or does not exist.");
	          return false;
	     }
	}

	this.clearMap=function(){
		//$('#map').html('');
		$('.zombie').fadeOut(3000, function(){$(this).remove()});
	}

	this.clearMapFull=function(){
		this.clearMap();
		$('.sang').fadeOut(3000, function(){$(this).remove()});
	}

	this.setBackgroundPosition=function(num){
		switch(parseInt(num)){
			case 0:return '-10px -10px';break;
			case 1:return '-10px -60px';break;
			case 2:return '-10px -110px';break;
			case 3:return '-10px -160px';break;
			case 4:return '-60px -10px';break;
			case 5:return '-60px -60px';break;
			case 6:return '-60px -110px';break;
			case 7:return '-60px -160px';break;
			case 8:return '-110px -10px';break;
			case 9:return '-110px -60px';break;
			case 10:return '-110px -110px';break;
			case 11:return '-110px -160px';break;
			case 12:return '-160px -10px';break;
		}
	}

	this.drawLine=function(x1, y1, x2, y2){
	    if(y1 < y2){
	        var pom = y1;
	        y1 = y2;
	        y2 = pom;
	        pom = x1;
	        x1 = x2;
	        x2 = pom;
	    }

	    var a = Math.abs(x1-x2);
	    var b = Math.abs(y1-y2);
	    var c;
	    var sx = (x1+x2)/2 ;
	    var sy = (y1+y2)/2 ;
	    var width = Math.sqrt(a*a + b*b ) ;
	    var x = sx - width/2;
	    var y = sy;

	    a = width / 2;

	    c = Math.abs(sx-x);

	    b = Math.sqrt(Math.abs(x1-x)*Math.abs(x1-x)+Math.abs(y1-y)*Math.abs(y1-y) );

	    var cosb = (b*b - a*a - c*c) / (2*a*c);
	    var rad = Math.acos(cosb);
	    var deg = (rad*180)/Math.PI

	    var div = document.createElement("div");
	    div.setAttribute('style','z-index:7;border:1px solid white;width:'+width+'px;height:0px;-moz-transform:rotate('+deg+'deg);-webkit-transform:rotate('+deg+'deg);position:absolute;top:'+y+'px;left:'+x+'px;');   

	    document.getElementById("map").appendChild(div);
	    setTimeout(function(){document.getElementById("map").removeChild(div);},25);
	}

	this.ghostCamKeyDown=function(e){
		direction=e.keyCode;
		//On se déplace seulement si le tchat est pas ouvert
		if(!$("#tchat-input").is(":focus")){
			if(direction==KEYS.UP || direction==KEYS.Z){	gameMap.ghostCam.haut=true;}
			else if(direction==KEYS.DOWN || direction==KEYS.S){	gameMap.ghostCam.bas=true;}
			else if(direction==KEYS.LEFT || direction==KEYS.Q){	gameMap.ghostCam.gauche=true;}
			else if(direction==KEYS.RIGHT || direction==KEYS.D){	gameMap.ghostCam.droite=true;}
		}
		return gameCore.gestionTouchesSpeciales(direction,e);
	}

	this.ghostCamKeyUp=function(direction){
		direction=direction.keyCode;
		if(direction==KEYS.UP || direction==KEYS.Z){	gameMap.ghostCam.haut=false;}
		else if(direction==KEYS.DOWN || direction==KEYS.S){	gameMap.ghostCam.bas=false;}
		else if(direction==KEYS.LEFT || direction==KEYS.Q){	gameMap.ghostCam.gauche=false;}
		else if(direction==KEYS.RIGHT || direction==KEYS.D){	gameMap.ghostCam.droite=false;}
	}

	this.ghostCamloop=function(){
		if(gameMap.ghostCam.running)
			setTimeout(function(){gameMap.ghostCamloop();}, this.GAME_SPEED);
		var pas=7;

		if(gameMap.ghostCam.haut)
			gameMap.divMap.style.top=(parseInt(gameMap.divMap.style.top) + pas)+'px';
		else if(gameMap.ghostCam.bas)
			gameMap.divMap.style.top=(parseInt(gameMap.divMap.style.top) - pas)+'px';
		if(gameMap.ghostCam.gauche)
			gameMap.divMap.style.left=(parseInt(gameMap.divMap.style.left) + pas)+'px';
		else if(gameMap.ghostCam.droite)
			gameMap.divMap.style.left=(parseInt(gameMap.divMap.style.left) - pas)+'px';
	}

	/*constructor*/
	this.widthPlateau=parseInt($('#plateau').css('width'));
	this.heightPlateau=parseInt($('#plateau').css('height'));
	this.widthMap=parseInt($('#map').css('width'));
	this.heightMap=parseInt($('#map').css('height'));
	this.divMap=document.getElementById('map');
	this.ghostCam={running:false,haut:false,bas:false,gauche:false,droite:false};
	this.LARGEUR_PERSO=30;
	this.lastDegreeSent=0;
	this.isFiring=false;
	this.COSINUS_45=Math.cos(45/180*Math.PI);
}