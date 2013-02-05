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
			if(angle < gameMap.lastDegreeSent - 10 || angle>gameMap.lastDegreeSent + 10){
				gameCore.updateAngle(angle);
				gameMap.lastDegreeSent=angle;
			}
			//Si on est en train de tirer, alors on met la position target a jour sur le server
			if(gameMap.isFiring){
				offset=$('#map').offset();
				var viseX = (e.pageX - offset.left);
				var viseY = (e.pageY - offset.top);
				gameCore.fire(viseX,viseY);
			}
		})
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
		//Update de tous les zombies
		var player;
		for(var idPerso in datas.listeJoueurs){
			player=document.getElementById('player'+idPerso);
			if(player==null){
				player=document.createElement('div');
				player.className= player.className+' map-item player';
				player.id='player' + idPerso;
				player.style.top=datas.listeJoueurs[idPerso].y+ 'px';
				player.style.left=datas.listeJoueurs[idPerso].x + 'px';
				//Affichage du style
				player.style.backgroundPosition=this.setBackgroundPosition(datas.listeJoueurs[idPerso].style);
				this.divMap.appendChild(player);
			}
			else{
				player.style.top=datas.listeJoueurs[idPerso].y+ 'px';
				player.style.left=datas.listeJoueurs[idPerso].x+ 'px';
				if(datas.listeJoueurs[idPerso].alive==true){
					player.style.zIndex=9;
					player.style.backgroundPosition=this.setBackgroundPosition(datas.listeJoueurs[idPerso].style);
				}
				if(datas.listeJoueurs[idPerso].alive==false){
					player.style.zIndex=5;
					player.style.backgroundPosition=this.setBackgroundPosition(12);
				}
			}

			//Si le joueur sur lequel on boucle est le joueur du navigateur, alors on centre la cam sur lui.
			// + on le fait que si on est pas en ghostCam (donc libre)
			if(idPerso==gameCore.playerId && this.ghostCam.running==false){
				var map=document.getElementById('map');
				map.style.top=(this.heightPlateau/2 - datas.listeJoueurs[idPerso].y) + 'px';
				map.style.left=(this.widthPlateau/2 - datas.listeJoueurs[idPerso].x) + 'px';
				player.style.zIndex=10;
			}
			else
				this.rotate(player,datas.listeJoueurs[idPerso].angle);				
		}

		var zombie;
		for(var idZombie in datas.listeZombies){
			zombie=document.getElementById('zombie'+idZombie);
			if(zombie==null){	
				var div=document.createElement('div');
				div.className= div.className+' map-item zombie';
				div.id='zombie' + idZombie;
				div.setAttribute('data-life',datas.listeZombies[idZombie].life);
				div.style.top=datas.listeZombies[idZombie].y+ 'px';
				div.style.left=datas.listeZombies[idZombie].x + 'px';
				div.style.backgroundPosition=this.setBackgroundPosition(datas.listeZombies[idZombie].style);
				this.divMap.appendChild(div);
			}
			else{
				zombie.style.top=datas.listeZombies[idZombie].y+ 'px';
				zombie.style.left=datas.listeZombies[idZombie].x+ 'px';
				if(datas.listeZombies[idZombie].alive==false){
					zombie.style.zIndex=5;
					zombie.style.backgroundPosition=this.setBackgroundPosition(12);
				}
				this.rotate(zombie,datas.listeZombies[idZombie].angle);
			}
		}

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
	    setTimeout(function(){document.getElementById("map").removeChild(div);},50);
	}

	this.ghostCamKeyDown=function(direction){
		direction=direction.keyCode;
		if(direction==KEYS.UP || direction==KEYS.Z){	gameMap.ghostCam.haut=true;}
		else if(direction==KEYS.DOWN || direction==KEYS.S){	gameMap.ghostCam.bas=true;}
		else if(direction==KEYS.LEFT || direction==KEYS.Q){	gameMap.ghostCam.gauche=true;}
		else if(direction==KEYS.RIGHT || direction==KEYS.D){	gameMap.ghostCam.droite=true;}
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
			setTimeout(function(){gameMap.ghostCamloop();}, 50);
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
}