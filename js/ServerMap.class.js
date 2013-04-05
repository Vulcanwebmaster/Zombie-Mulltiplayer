
//Masque de dates à utiliser pour les log
var dateToLog=function(date){
    return '[' + date.getDate() + '/' + (date.getMonth() +1) + ' ' + date.getHours() + ':' + date.getMinutes() + '] ';
}

/*Classe qui gère tout les calculs sur la map*/
module.exports = function ServerMap(io,characterManager, dbCore)
{
   var listeJoueurs;
   var listeZombies;
   var nbJoueurs;
   var nbZombies;
   var io;
   var widthMap;
   var heightMap;
   var GAME_SPEED;
   var PAS;
   var isRunning;
   var DEFAULT_ZOMBIE_SPEED;

   this.addJoueur=function(pseudo, socket){
   		var newJoueur=characterManager.creationJoueur(this.nbJoueurs++,pseudo);
   		this.listeAttente[newJoueur.id]=newJoueur;
         socket.emit('set_id', newJoueur.id);
         /*Ici on choisi ou non de lancer la partie*/
         if(this.isRunning==false && this.getPlayingPlayers()==0  && this.getWaitingPlayers()==1)
            this.start();
         else if(this.getPlayingPlayers()==0)
            this.start();
         else
            socket.emit('player_spectateur', {id:newJoueur.id});
         newJoueur.x=this.widthMap/2;
         newJoueur.y=this.heightMap/2;
   		return newJoueur.id;//on retourne l'id du nouveau joueur pour lui renvoyer;
   }
   this.addJoueurFromDB=function(infosJoueur, socket){
      var idPlayer = this.addJoueur(infosJoueur.pseudo, socket);
      //On modifie maintenant ses stats en fonction des infos de la DB
      var joueur=this.getJoueur(idPlayer);
      if(joueur!=null){
         joueur.style=infosJoueur.skin_id;
      }
      return idPlayer;
   }

   this.getPlayer=function(pseudo){
      var joueurEnLigne=null;
      for(var id in this.listeJoueurs)  if(this.listeJoueurs[id].pseudo.toLowerCase()==pseudo.toLowerCase()) joueurEnLigne=this.listeJoueurs[id];
      for(var id in this.listeAttente)  if(this.listeAttente[id].pseudo.toLowerCase()==pseudo.toLowerCase()) joueurEnLigne=this.listeAttente[id];
      for(var id in this.listeSpectateurs)  if(this.listeSpectateurs[id].pseudo.toLowerCase()==pseudo.toLowerCase()) joueurEnLigne=this.listeSpectateurs[id];
      return joueurEnLigne;
   }
   this.getListeJoueursStr=function(){
      var result="Liste des joueurs : ";
      for(var id in this.listeJoueurs) result+= " " +  this.listeJoueurs[id].pseudo + " (en ligne) | ";
      for(var id in this.listeAttente) result+= " " +  this.listeAttente[id].pseudo + " (en attente) | ";
      for(var id in this.listeSpectateurs) result+= " " +  this.listeSpectateurs[id].pseudo + " (spectateur) | ";
      return result;
   }
   this.getListeJoueursWithIDStr=function(){
      var result="Liste des joueurs : ";
      for(var id in this.listeJoueurs) result+= " " +  this.listeJoueurs[id].pseudo + " ("+id+") | ";
      for(var id in this.listeAttente) result+= " " +  this.listeAttente[id].pseudo + " ("+id+") | ";
      for(var id in this.listeSpectateurs) result+= " " +  this.listeSpectateurs[id].pseudo + " ("+id+") | ";
      return result;
   }
   this.getPlayingPlayers=function(){
      var cpt=0;
      for(var id in this.listeJoueurs)   cpt++;
      return cpt;
   }
   this.getWaitingPlayers=function(){
      var cpt=0;
      for(var id in this.listeAttente)  cpt++;
      return cpt;
   }
   this.getOnlinePlayers=function(){
      var cpt=0;
      for(var id in this.listeSpectateurs)   cpt++;
      cpt+=this.getPlayingPlayers();
      cpt+=this.getWaitingPlayers();
      return cpt;
   }
   this.getAlivePlayers=function(){
      var cpt=0;
      for(var id in this.listeJoueurs) if(this.listeJoueurs[id].alive) cpt++;
      return cpt;
   }
   this.getJoueur=function(id){
      return this.listeJoueurs[id] || this.listeSpectateurs[id] || this.listeAttente[id];
   }
   this.removeJoueur=function(id){
      if(this.listeJoueurs[id])
         delete this.listeJoueurs[id];
      if(this.listeSpectateurs[id])
         delete this.listeSpectateurs[id];
      if(this.listeAttente[id])
         delete this.listeAttente[id];
      this.testVeilleServeur();
   }
   this.switchSpectateur=function(id){
      if(this.listeJoueurs[id] || this.listeAttente[id]){
         this.listeSpectateurs[id]=this.listeJoueurs[id] || this.listeAttente[id];
         //if(this.listeJoueurs[id]) this.io.sockets.emit('broadcast_msg', {auteur:'Admin', message: this.listeSpectateurs[id].pseudo + ' passe en spectateur.', class:'tchat-admin'});
         delete this.listeJoueurs[id];
         delete this.listeAttente[id];
         this.listeSpectateurs[id].directions={haut:false,bas:false,gauche:false,droite:false};
         this.listeSpectateurs[id].isFiring=false;
         this.listeSpectateurs[id].buffs={};
         this.io.sockets.emit('remove_player', {'id':id});
         this.testFinPartie();
      }
   }
   this.switchInGame=function(id){
      if(this.listeSpectateurs[id]){
         this.listeAttente[id]=this.listeSpectateurs[id];
         delete this.listeSpectateurs[id];
         /*Ici on choisi ou non de lancer la partie*/
         if(this.isRunning==false  && this.getPlayingPlayers()==0  && this.getWaitingPlayers()==1)
            this.start();
         else if(this.getPlayingPlayers()==0  && this.getWaitingPlayers()>=1)
            this.start();
      }
   }
   this.flushFileAttente=function(){
      for(var id in this.listeAttente){
         this.listeJoueurs[id]=this.listeAttente[id];
         delete this.listeAttente[id];
         this.io.sockets.emit('player_revive', this.listeJoueurs[id]);
         //this.io.sockets.emit('broadcast_msg', {auteur:'Admin', message: this.listeJoueurs[id].pseudo + ' rejoint la partie.', class:'tchat-admin'});
      }
   }

   this.addZombie=function(type){
      //Zombie par défaut (type 0 et 1)
      var newZombie=characterManager.creationZombie(this,this.nbZombies++,type);
      //On multiplie la vie du zombie par un coefficient dépendant du nombre de joueurs      
      var nombreDeJoueurs=0;
      for(var id in this.listeJoueurs)
         nombreDeJoueurs++;
      newZombie.life= newZombie.life * (1 + (nombreDeJoueurs-1)*0.15);
      this.moveToBorder(newZombie);
      this.listeZombies[newZombie.id]=newZombie;
   }

   this.moveToBorder=function(zombie){
      //Tout d'abord un premier random pour savoir
      //si il sera au nord, sud est, ouest.
      var position=parseInt(Math.random()*4);
      if(position==0){
         zombie.x=parseInt(Math.random()*(this.widthMap-zombie.taille/2));
         zombie.y=0;
      }
      else if(position==1){
         zombie.x=parseInt(Math.random()*(this.widthMap-zombie.taille/2));
         zombie.y=this.heightMap - zombie.taille/2;
      }
      else if(position==2){
         zombie.x=0;
         zombie.y=parseInt(Math.random()*(this.heightMap-zombie.taille/2));
      }
      else if(position==3){
         zombie.x=this.widthMap - zombie.taille/2;
         zombie.y=parseInt(Math.random()*(this.heightMap-zombie.taille/2));
      }
      //De base le zombie vise au milieu (pour pas qu'il se bouffe le mur)
      zombie.angle=Math.atan2(this.heightMap/2 - zombie.y , this.widthMap/2 - zombie.x )*180/Math.PI;
   }

   this.spawnWave=function(id){
      if(this.vagueEnTrainDeSeLancer==true)return;
      this.flushFileAttente();
      if(!this.isRunning || this.getPlayingPlayers()==0)
         return;
      this.vagueEnTrainDeSeLancer=true;
      console.log(dateToLog(new Date) + 'Lancement de la vague ' + id);
      var _this=this;
      setTimeout(function(){
         //_this.io.sockets.emit('broadcast_msg', {'message':'Une vague de zombies approche !', 'class':'tchat-game-event'});
         setTimeout(function(){
            if(!_this.isRunning || _this.getPlayingPlayers()==0){
               _this.vagueEnTrainDeSeLancer=false;
               return;
            }
            //_this.io.sockets.emit('broadcast_msg', {'message':'Ils sont là ! Défendez-vous !', 'class':'tchat-game-event'});
            var jSONVague=characterManager.getWave(id);
            var decalageTotalMS=0;
            for(var zombieType in jSONVague){
               var nombreTmp=jSONVague[zombieType].nombre;
               for(var i=0;i<nombreTmp;i++){
                  setTimeout(_this.addZombieDecalage(_this,zombieType), decalageTotalMS);
                  decalageTotalMS+=25;
               }
            }
            _this.vagueEnTrainDeSeLancer=false;
         },7000);         
      },4000);
      //Fonction qui va faire le compte à rebours client side :
      var secondes=11;
      for(var i=secondes; i>0 ; i--){
         setTimeout(_this.compteAReboursVague(_this, secondes-i), 1000*i);
      }
   }
   this.compteAReboursVague=function(_this, secondesRestantes){
      return function(){
         if(_this.vagueEnTrainDeSeLancer){
            _this.flushFileAttente();
            _this.temporaryDisplayItem[_this.numberTmpItem++]={type:'compte_a_rebours_vague', value:secondesRestantes};
         }
      };
   }
   this.addZombieDecalage=function(_this, zombieType){
      return function(){
         _this.addZombie(zombieType);
      };
   }

   this.updateJoueurMouvement=function(datas){
         if(this.listeJoueurs[datas.id]){
   	   	this.listeJoueurs[datas.id].directions.gauche=datas.directions.gauche;
   	   	this.listeJoueurs[datas.id].directions.droite=datas.directions.droite;
   	   	this.listeJoueurs[datas.id].directions.haut=datas.directions.haut;
   	   	this.listeJoueurs[datas.id].directions.bas=datas.directions.bas;
         }
   }
   this.updateJoueurAngle=function(datas){
      if(this.listeJoueurs[datas.id])
         this.listeJoueurs[datas.id].angle=datas.angle;
   }
   this.stopFire=function(datas){
      if(this.listeJoueurs[datas.id]){
         this.listeJoueurs[datas.id].isFiring=false;
      }
   }
   this.fire=function(datas){
      if(this.listeJoueurs[datas.id]){
         this.listeJoueurs[datas.id].isFiring=true;
         this.listeJoueurs[datas.id].target={targetX:datas.targetX,targetY:datas.targetY};
      }
   }

   this.update=function(){
      var debutRenderDate = new Date;
      var _this=this;
      if(this.isRunning)
       setTimeout(function(){_this.update();},_this.GAME_SPEED);
      else
         return;//ajout de cette sécurité si la partie se finit alors qu'un timeOut est lancé      

      //On regarde combien de joueurs il reste
      var bonusSurvivor=false;
      if(this.getPlayingPlayers()>3 && this.getAlivePlayers()==1){
         bonusSurvivor=true;
      }

		//Update des joueurs en fonction des directions qu'ils appuyent
		for(var idPerso in this.listeJoueurs){
         var persoTmp=this.listeJoueurs[idPerso];
         if(persoTmp.alive){
            if(bonusSurvivor)
               persoTmp.addBuff('survivor');
            //On applique les buff/debuff avant tout
            persoTmp.applyBuff(this);
            //on verifie qu'il est toujours vivant après les debuff
            if(persoTmp.alive){
               this.move(persoTmp, 'humain');
               this.validatePositionToMapLimits(persoTmp);
               //On regarde si il marche sur un draoppebl
               this.checkIfOnDroppableItem(persoTmp);  
               this.calculNextEtapeFire(persoTmp);     
            }
         }
		}
      for(var idZombie in this.listeZombies){
         var zombieTmp=this.listeZombies[idZombie];
         if(zombieTmp.alive){
            this.calculNextEtapeIA(zombieTmp);
            this.move(zombieTmp, 'zombie');
            this.validatePositionToMapLimits(zombieTmp);
         }
      }

      //On calcule le temps qu'on a mis pour faire le rendu
      var finRenderDate=new Date();
      var tempsLastRender = finRenderDate - debutRenderDate;
      this.averageRenderTime = (this.averageRenderTime*9 + tempsLastRender)/10;
      this.temporaryDisplayItem[this.numberTmpItem++]={type:'render_time', value: (Math.round(this.averageRenderTime*100)/100)};

      this.temporaryDisplayItem[this.numberTmpItem++]={type:'numero_vague', value: this.currentWave};
      this.temporaryDisplayItem[this.numberTmpItem++]={type:'online_players_number', value: this.getOnlinePlayers()};
      //this.MODULO_ENVOI=(this.MODULO_ENVOI+1)%3;
      //if( this.MODULO_ENVOI == 0){
		   this.io.sockets.volatile.emit('update',{'timestamp' : new Date,
                                              'listeJoueurs' : characterManager.listToNetwork(this.listeJoueurs),
                                              'listeZombies' : characterManager.listToNetwork(this.listeZombies), 
                                              'listeTemporaryItems': this.temporaryDisplayItem, 'listeDroppables' : this.listeDroppables});
         //On réinitialise les item temporaires.
         this.temporaryDisplayItem={};
         this.numberTmpItem=0;	     
      //}

   }  
	  
   this.validatePositionToMapLimits=function(entite){
      if(entite.x<0)
         entite.x=0;
      if(entite.x>this.widthMap - entite.taille)
         entite.x=this.widthMap  - entite.taille;

      if(entite.y<0)
         entite.y=0;
      if(entite.y>this.heightMap - entite.taille)
         entite.y=this.heightMap  - entite.taille; 
   }

   this.calculNextEtapeIA=function(zombie){

      if(zombie.alive==false)
         return;

      var joueurLePlusProche=null;
      var distancePlusCourte=this.DIAGONALE_MAP;
      //D'abord on cherche le joueur le plus proche
      for(var idPerso in this.listeJoueurs){
         var persoTmp=this.listeJoueurs[idPerso];
         if(persoTmp.alive){
            var distanceTmp=this.calculDistanceBetween(persoTmp, zombie);
            if(distanceTmp < distancePlusCourte){
               joueurLePlusProche=persoTmp;
               distancePlusCourte=distanceTmp;
            }
         }
      }
      //Dans tous les cas on décompte le fait qu'il puisse mordre à nouveau
       zombie.attaque.compteAReboursAttaque=Math.max(0,zombie.attaque.compteAReboursAttaque-1);
      //Si un personnage passe dans son champs de vision, il se met à courir
      if(distancePlusCourte< zombie.distanceVision && zombie.aware==false){
         zombie.aware=true;
         zombie.speed=zombie.maxSpeed;
      }

      //on test si on a bien un joueur proche (cas où 0 joueurs)
      if(joueurLePlusProche!=null && zombie.aware==true){

         if(distancePlusCourte < joueurLePlusProche.taille/2.1 + zombie.taille/2.1){
            if(zombie.attaque.compteAReboursAttaque ==0){
               joueurLePlusProche.life-=zombie.attaque.degats;
               zombie.special({'type':'attaque', 'target':joueurLePlusProche});
               if(joueurLePlusProche.life<=0){
                  joueurLePlusProche.die(this);
               }
               else{
                  this.temporaryDisplayItem[this.numberTmpItem++]={type:'sang',x:parseInt(joueurLePlusProche.x), y:parseInt(joueurLePlusProche.y)};
               }
               this.temporaryDisplayItem[this.numberTmpItem++]={type:'player_life', id:joueurLePlusProche.id, life:joueurLePlusProche.life};
               zombie.attaque.compteAReboursAttaque=zombie.attaque.delaiMax;
            }
         }

         //Calcul du coefficient d'aggressivité. Si on est proche, on le met à 0 pour foncer sur le mec.
         var coef=1;
         if(distancePlusCourte <= 106)
            coef=0;
         /*Mise à jour de l'angle avec lequel afficher le zombie*/
         //Cet angle est utilisé pour avancer, donc important :)
         zombie.angle=Math.atan2(joueurLePlusProche.y + coef*zombie.agressivite- zombie.y, joueurLePlusProche.x + coef*zombie.agressivite - zombie.x )*180/Math.PI;

      }
      else{
         //On teste si le zombie se trouve sur un bord, si oui, on le remet vers le milieu
         var limite=75;
         if(zombie.x +limite > this.widthMap || zombie.x -limite <0 ||zombie.y+limite > this.heightMap ||zombie.y -limite <0)
            zombie.angle=Math.atan2(this.heightMap/2 - zombie.y , this.widthMap/2 - zombie.x )*180/Math.PI;
         else
            zombie.angle = Math.random() < 0.5 ? zombie.angle+1 : zombie.angle-1;
      }

   }

   this.calculDistanceBetween=function(ent1, ent2){
      return Math.sqrt(Math.pow(ent1.x-ent2.x,2)+Math.pow(ent1.y-ent2.y,2));
   }

   this.calculNextEtapeFire=function(joueur){
      //Dans tous les cas on fait le decompte du timer
      joueur.attaque.compteAReboursAttaque=Math.max(0,joueur.attaque.compteAReboursAttaque-1);
      if(!joueur.isFiring)
         return;
      else if(joueur.attaque.compteAReboursAttaque!=0)
         return;

      var joueurX=joueur.x + joueur.taille/2;
      var joueurY=joueur.y + joueur.taille/2;
      var targetX=joueur.target.targetX;
      var targetY=joueur.target.targetY;


      //On calcul la droite entre la target et le joueur
      //Test du cas où le tir est vertical !! (probleme de division par zéro)
      var tirVertical=false;
      if(targetX - joueurX < joueur.taille/1.2 && targetX - joueurX > -joueur.taille/1.2 ){
         // x=M
         tirVertical=true;
         var M=joueurX;
         var zombiePlusProche=null;
         var distancePlusCourte=this.DIAGONALE_MAP;

         var viseEnHaut=false;
         if(targetY-joueurY<0)
            viseEnHaut=true;

         for(var idZombie in this.listeZombies){
            var zombieTmp=this.listeZombies[idZombie];
            var distanceTmp=this.calculDistanceBetween(joueur,zombieTmp);
            if(zombieTmp.alive
               && zombieTmp.x +zombieTmp.taille/2 > M-zombieTmp.taille 
               && zombieTmp.x +zombieTmp.taille/2 < M+zombieTmp.taille
               &&  distanceTmp < distancePlusCourte
               && distanceTmp < joueur.attaque.portee){
               if((viseEnHaut && joueurY > zombieTmp.y ) || (!viseEnHaut && joueurY < zombieTmp.y) ){
                  zombiePlusProche=zombieTmp;
                  distancePlusCourte=distanceTmp;
               }
            }
         }
      }
      else{
         //y=ax+b
         var a=(targetY - joueurY)/(targetX - joueurX);
         var b=joueurY - ( a * joueurX);
         //console.log('Droite : y=' + a + 'x + ' + b);
         //On regarde si y'a des zombies sur cette droite
         //et on sauvegarde le plus proche
         var zombiePlusProche=null;
         var distancePlusCourte=this.DIAGONALE_MAP;

         var viseADroite=false;
         if(targetX-joueurX>0)
            viseADroite=true;

         for(var idZombie in this.listeZombies){
            var zombieTmp=this.listeZombies[idZombie];
            var distanceTmp=this.calculDistanceBetween(joueur,zombieTmp);
            if( zombieTmp.alive
                && ((zombieTmp.y+zombieTmp.taille/2) - (zombieTmp.x+zombieTmp.taille/2) * a) > b-zombieTmp.taille/2
                && ((zombieTmp.y+zombieTmp.taille/2) - (zombieTmp.x+zombieTmp.taille/2) * a) < b+zombieTmp.taille/2
                && distanceTmp < distancePlusCourte
                && distanceTmp < joueur.attaque.portee ){
                  //sécurité pour pas viser en arrière
                  if((viseADroite && zombieTmp.x > joueurX) || (!viseADroite && zombieTmp.x < joueurX)){
                     zombiePlusProche=zombieTmp;
                     distancePlusCourte=distanceTmp;
               }
               //Cas où le zombie est SUR NOUS
               else if(zombieTmp.alive && distanceTmp < distancePlusCourte && distanceTmp < joueur.taille / 1.5){
                  zombiePlusProche=zombieTmp;
                  distancePlusCourte=distanceTmp;
               }
            }
         }
      }
      //Si on peut tirer
      if(joueur.attaque.compteAReboursAttaque==0){
         //On enlève la vie au zombie le plus proche
         if(zombiePlusProche!=null){
            joueur.doDamages(zombiePlusProche);
            if(zombiePlusProche.aware==false){
               zombiePlusProche.aware=true;   
               zombiePlusProche.speed=zombiePlusProche.maxSpeed;
            }
            else
               zombiePlusProche.special({'type':'defense', 'target':joueur});

            if(zombiePlusProche.life<=0){
               zombiePlusProche.life=0;
               zombiePlusProche.alive=false;
               joueur.kills++;
               joueur.killOnThisRound++;
               this.totalZombiesKilled++;
               this.temporaryDisplayItem[this.numberTmpItem++]={type:'zombie_killed', id:joueur.id, kills:joueur.kills};
               this.temporaryDisplayItem[this.numberTmpItem++]={type:'player_target', id:joueur.id, id_zombie:-1};
               //On ajoute de manière aléatoire un objet (1 chance sur 10)
               if(Math.random()<=zombiePlusProche.dropRate)
                  this.listeDroppables[this.nbDroppables++]=characterManager.getRandomDroppable(zombiePlusProche);
            }
            else{
               //On lance la mise à jour de la cible pour le joueur
               this.temporaryDisplayItem[this.numberTmpItem++]={type:'player_target', id:joueur.id, id_zombie:zombiePlusProche.id};
            }
            this.temporaryDisplayItem[this.numberTmpItem++]={type:'sang', x:parseInt(zombiePlusProche.x),y:parseInt(zombiePlusProche.y)};
            //On balance l'event d'affichage du tir
            if(!tirVertical)
               this.temporaryDisplayItem[this.numberTmpItem++]={type:'fire', idPlayer:joueur.id, x:parseInt(joueurX) , y:parseInt(joueurY), targetX:parseInt(zombiePlusProche.x+zombiePlusProche.taille/2), targetY:parseInt((zombiePlusProche.x+zombiePlusProche.taille/2) * a + b)};
            else
               this.temporaryDisplayItem[this.numberTmpItem++]={type:'fire', idPlayer:joueur.id, x:parseInt(joueurX) , y:parseInt(joueurY), targetX:targetX, targetY:joueurY + (viseEnHaut ? -distancePlusCourte : distancePlusCourte)}; 
            this.testFinVague();
         }
         else{
             //On balance l'event d'affichage du tir
             this.temporaryDisplayItem[this.numberTmpItem++]={type:'fire', idPlayer:joueur.id, x:parseInt(joueurX) , y:parseInt(joueurY), targetX:parseInt(joueurX + Math.cos(joueur.angle/180*Math.PI)*joueur.attaque.portee), targetY:parseInt( joueurY+ Math.sin(joueur.angle/180*Math.PI)*joueur.attaque.portee)};
          }
          joueur.attaque.compteAReboursAttaque=joueur.attaque.delaiMax;
       }
   }

   this.movePlayerTarget=function(entite,deplacement){
         if(entite.directions.haut){entite.target.targetY-=deplacement;}
         else if(entite.directions.bas){entite.target.targetY+=deplacement;}
         if(entite.directions.gauche){entite.target.targetX-=deplacement;}
         else if(entite.directions.droite){entite.target.targetX+=deplacement;}
   }

   this.move=function(entite, type){
      if(type=='humain'){
         //Cas des diagonales (pour pas avancer trop en diagonales)
         var countDirection=0;
         for(var direction in entite.directions)
            if(entite.directions[direction])
               countDirection++;
         //si on a plus de 1 appuyé, on fait une diagonale
         var deplacement=entite.speed;
         if(countDirection>1){
            deplacement=this.COSINUS_45*entite.speed;
         }
         if(entite.directions.haut){entite.y-=deplacement}
         else if(entite.directions.bas){entite.y+=deplacement}
         if(entite.directions.gauche){entite.x-=deplacement}
         else if(entite.directions.droite){entite.x+=deplacement}

         //console.log("Vitesse : " + entite.speed + '. Distance : ' + this.calculDistanceBetween(entiteTmp,entite));
         this.movePlayerTarget(entite,deplacement);
      }
      else{
         //Déplacement par rapport à leur angle.
         entite.x+=Math.cos(Math.PI * entite.angle / 180)*entite.speed;
         entite.y+=Math.sin(Math.PI * entite.angle / 180)*entite.speed;
      }
   }

   this.start=function(){
      if(!this.isRunning){
         this.isRunning=true;
         if(this.currentWave==-1)
            this.spawnWave(++this.currentWave);
   		this.update();
      }
      else if(this.getPlayingPlayers()==0){
         this.currentWave=0;
         this.spawnWave(this.currentWave);
      }
	}
   this.stop=function(){
      this.isRunning=false;
   }

   this.testFinVague=function(){
      var fin=true;
      for(var idZombie in this.listeZombies){
         if(this.listeZombies[idZombie].alive==true){
            fin=false;
            break;
         }
      }
      if(fin){
         this.io.sockets.emit('broadcast_msg', {'message':'Vague ' + this.currentWave + ' terminée. (Total : ' + this.totalZombiesKilled + ' zombies)'
                                                , 'class':'tchat-game-event'});
         this.io.sockets.emit('clear_map_full');
         this.listeZombies={};
         this.nbZombies=0;

         //On fait pop des bonus
        /* for(var i = 0 ; i< Math.ceil(this.getPlayingPlayers()/2);i++)
            this.listeDroppables[this.nbDroppables++]=characterManager.getDroppable(parseInt(this.currentWave / characterManager.VAGUE_MAX * characterManager.NOMBRE_ARMES), parseInt(Math.random()*this.widthMap), parseInt(Math.random()*this.heightMap));
*/
         //On fait revivre les morts
         //et on regarde le joueur qui a le plus de kill pour lui donner un bonus
         var joueurMeneur=null;
         var maxKills=0;
         for(var idPerso in this.listeJoueurs){
            //on met a jour son record
            this.listeJoueurs[idPerso].record=this.currentWave;
            //si le joueur est mort
            if(!this.listeJoueurs[idPerso].alive){
               this.listeJoueurs[idPerso].revive(characterManager);
               this.io.sockets.emit('player_revive', this.listeJoueurs[idPerso]);
            }  
            else{
               //Sinon il gagne un bonus
               //this.listeJoueurs[idPerso].life+=25;
               this.temporaryDisplayItem[this.numberTmpItem++]={type:'player_life', id:this.listeJoueurs[idPerso].id, life:this.listeJoueurs[idPerso].life};
            }
            //comparaison du nombre de kills
            if(this.listeJoueurs[idPerso].killOnThisRound > maxKills){
               joueurMeneur=this.listeJoueurs[idPerso];
               maxKills=joueurMeneur.killOnThisRound;
            }
            this.listeJoueurs[idPerso].killOnThisRound=0;
         }
         //On fait aussi revivre les spectateurs si ils sont passés en spectateur pendant la mort
         for(var idSpec in this.listeSpectateurs)
            if(!this.listeSpectateurs[idSpec].alive)
               this.listeSpectateurs[idSpec].revive(characterManager);
         for(var idAttente in this.listeAttente)
            if(!this.listeAttente[idAttente].alive)
               this.listeAttente[idAttente].revive(characterManager);

         //Assignation du bonus Zombiz Slayer
         if(joueurMeneur!=null){
            this.io.sockets.emit('broadcast_msg', {'message': joueurMeneur.pseudo + ' gagne le bonus Zombiz slayer avec ' + maxKills + ' kills.' , 'class':'tchat-game-info'});
            joueurMeneur.addBuff('zombizSlayer');
         }
         this.spawnWave(++this.currentWave);
      }
   }

   this.testFinPartie=function(){
      var fin=true;
      for(var idJoueur in this.listeJoueurs){
         if(this.listeJoueurs[idJoueur].alive==true){
            fin=false;
            break;
         }
      }
      if(fin){
         this.io.sockets.emit('broadcast_msg', {'message':'Fin de partie.', 'class':'tchat-game-event'});
         console.log(dateToLog(new Date) + "La partie est terminée.");
         for(var idPerso in this.listeJoueurs){
            this.io.sockets.emit('broadcast_msg', {'auteur': this.listeJoueurs[idPerso].pseudo, 'message':'J\'ai tué ' + this.listeJoueurs[idPerso].kills + ' zombies.'});
         }
         this.stop();
         //On relance une partie
         //On met un mini timeout pour que la boucle actuelle ait le temps de finir
         var _this=this;
         setTimeout(function(){
            _this.io.sockets.emit('clear_map_full');
            _this.nbZombies=0;
            _this.listeZombies={};
            _this.totalZombiesKilled=0;
            for(var idDroppable in _this.listeDroppables)
               _this.temporaryDisplayItem[_this.numberTmpItem++]={type:'remove_droppable', id:idDroppable};
            _this.listeDroppables={};
            _this.nbDroppables=0;
            //On fait revivre les morts
            for(var idPerso in _this.listeJoueurs){
               //On update toutes les stats des joueurs dans la DB
               dbCore.updatePlayerStats(_this.listeJoueurs[idPerso]);
               _this.listeJoueurs[idPerso].reini(characterManager);
               _this.io.sockets.emit('player_revive', _this.listeJoueurs[idPerso]);
            }
            for(var idSpec in _this.listeSpectateurs){
                dbCore.updatePlayerStats(_this.listeSpectateurs[idSpec]);
               _this.listeSpectateurs[idSpec].reini(characterManager);
            }
            for(var idAttente in _this.listeAttente){
               dbCore.updatePlayerStats(_this.listeAttente[idAttente]);
               _this.listeAttente[idAttente].reini(characterManager);
            } 
            _this.io.sockets.emit('broadcast_msg', {'message':'Vous avez atteint la vague ' + _this.currentWave + '. Prochaine partie dans 10 secondes !', 'class':'tchat-game-event'});                    
            _this.flushFileAttente();
            _this.start();
            _this.currentWave=-1;
         },1000);
      
         var _this;
         setTimeout(function(){
            if(_this.getPlayingPlayers()!=0){
               _this.currentWave=0;
               _this.spawnWave(_this.currentWave);
            }
         },10000);
      }
   }

   this.testVeilleServeur=function(){
      var ilResteDesJoueurs=false;
      if(this.getOnlinePlayers()>0)
         ilResteDesJoueurs=true;
      if(!ilResteDesJoueurs){
         console.log(dateToLog(new Date) + 'Tous les joueurs ont quitté la partie, on met le serveur en veille.')
         this.stop();
         this.currentWave=-1;
         this.nbZombies=0;
         this.listeZombies={};
         this.nbJoueurs=0;
         this.listeJoueurs={};
         this.listeSpectateurs={};
         this.listeAttente={};
         for(var idDroppable in this.listeDroppables)
            this.temporaryDisplayItem[this.numberTmpItem++]={type:'remove_droppable', id:idDroppable};
         this.listeDroppables={};
         this.nbDroppables=0;
      }
      else
         this.testFinPartie();
   }

   this.checkIfOnDroppableItem=function(perso){
      var droppable=null;
      for(var idDroppable in this.listeDroppables){
         droppable=this.listeDroppables[idDroppable];
         //On calcule le centre du perso et du droppable
         var persoTmp = {x:perso.x+perso.taille/2, y:perso.y+perso.taille/2};
         var dropTmp = {x:droppable.x+droppable.taille/2, y:droppable.y+droppable.taille/2};
         if(this.calculDistanceBetween(persoTmp, dropTmp) < perso.taille/2){
            var msg = characterManager.manageDroppable(perso, droppable);
            if(msg!='')
               this.io.sockets.emit('broadcast_msg', {auteur:perso.pseudo, message:msg});
            this.temporaryDisplayItem[this.numberTmpItem++]={type:'player_life', id:perso.id, life:perso.life};
            this.temporaryDisplayItem[this.numberTmpItem++]={type:'remove_droppable', id:idDroppable};
            delete this.listeDroppables[idDroppable];
         }
      }
   }

   this.widthMap=2000;
   this.heightMap=1000;
   this.DIAGONALE_MAP=Math.sqrt(Math.pow(this.heightMap,2)+Math.pow(this.widthMap,2));
   this.io=io;//io passé en argument du constructeur
   this.GAME_SPEED=50;//ms
   this.nbJoueurs=0;
   this.listeJoueurs={};
   this.nbZombies=0;
   this.listeZombies={};
   this.numberTmpItem=0;
   this.temporaryDisplayItem={}; //such as blood, shots, ...
   this.nbDroppables=0;
   this.listeDroppables={};//armes, pack de soin...
   this.listeSpectateurs={};
   this.listeAttente={};
   this.isRunning=false;
   this.currentWave=-1;
   this.vagueEnTrainDeSeLancer=false;
   this.totalZombiesKilled=0;
   this.MODULO_ENVOI=0;
   this.averageRenderTime=0;
   this.ID_ENVOI=0;
   this.COSINUS_45=Math.cos(Math.PI * 45 / 180 );
}