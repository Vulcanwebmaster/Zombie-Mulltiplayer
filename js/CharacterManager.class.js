

/*Classe qui gère la création et les fonctions en rapport avec les personnages*/
module.exports = function CharacterManager(){

	this.creationZombie=function(instance,id,type){
		var result={
            x:0,
            y:0,
            speed:1,
            maxSpeed:Math.random()*(this.PAS*0.3)+1,
            life: this.DEFAULT_PLAYER_LIFE,
            angle:0,//degrés
            id:id,
            attaque:{degats:5,compteAReboursAttaque:0,delaiMax:25},
            alive:true,
            aware:false,
            distanceVision:this.MIN_DISTANCE_VISIBLE*(2/3),
            style:parseInt(Math.random()*2),
            taille:this.LARGEUR_PERSO,
            agressivite:Math.random()*150 -75,
            instance:instance,
            PAS:this.PAS,
            dropRate:0.1,
            listDropRate :{},
            special:function(){}
         };
         //On remplit le tableau de droprate avec tout à zero par défaut
         for(var idDrop in this.LISTE_DROPPABLES){
            result.listDropRate[this.LISTE_DROPPABLES[idDrop]]=0;
         }

         //Normal 4 DPS
         if(type==this.ZOMBIE_NORMAL){
            //Le zombie normal peut faire saigner
            result.special=function(args){
                if(args.type=="attaque"){
                    //on applique le debuff de saignement léger à 10%
                    if(Math.random()*100 < 10)
                        args.target.addBuff('saignementLeger');
                }
            }
            result.dropRate=0.2;
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_SOIN]=45;
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_VITESSE]=45;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_WALTER]=7;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_DEAGLE]=3;
         }
         //Rapide 8 DPS
         if(type==this.ZOMBIE_RAPIDE){
            result.maxSpeed=this.PAS*0.6;
            result.life=150;
            result.attaque.degats=2;
            result.attaque.delaiMax=5;
            result.style=type;
            result.distanceVision=this.MAX_DIAGONALE_PLAYER;
            result.special=function(args){
                if(args.type=="defense"){
                    //on court un peu plus vite si on prend des dégats
                    this.speed=this.speed < 9 ? this.speed + 0.5 : 9;  
                }
            }
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_SOIN]=30;
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_VITESSE]=30;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_WALTER]=20;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_DEAGLE]=15;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_UZI]=5;
         }
         //Deuxième rapide, 20DPS plus violent que le premier
          if(type==this.ZOMBIE_RAPIDE2){
            result.maxSpeed=this.PAS*0.8;
            result.life=200;
            result.attaque.degats=5;
            result.attaque.delaiMax=5;
            result.style=type;
            result.distanceVision=this.MAX_DIAGONALE_PLAYER;
            result.special=function(args){
                if(args.type=="defense"){
                    //on court un peu plus vite si on prend des dégats
                    this.speed=this.speed < this.PAS*1.15 ? this.speed + 0.5 : this.PAS*1.15;  
                }
            }
            result.dropRate=0.1;
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_SOIN]=30;
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_VITESSE]=20;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_UZI]=20;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_SKORPION]=20;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_AK]=7;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_M16]=3;
         }
         //Gros 20 DPS mais très lent (1 coup toutes les 2,5 secondes)
         if(type==this.ZOMBIE_GROS){
            result.maxSpeed=this.PAS*0.2;
            result.life=1000;
            result.attaque.degats=50;
            result.attaque.delaiMax=50;
            result.style=type;
            result.agressivite=result.agressivite/2;
            result.distanceVision=this.MIN_DISTANCE_VISIBLE;
            //Le zombie gros peut assomer
            result.special=function(args){
                if(args.type=="attaque"){
                    //on applique le debuff d'assomage à 50%
                    if(Math.random()*100 < 50)
                        args.target.addBuff('assomage');
                }
            }
            result.dropRate=0.3;
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_SOIN]=70;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_DEAGLE]=20;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_UZI]=10;
         }
         //Très rapide 10 DPS
         if(type==this.ZOMBIE_TRES_RAPIDE){
           	result.maxSpeed=this.PAS;
           	result.life=50;
           	result.attaque.degats=1;
           	result.attaque.delaiMax=2;
           	result.style=type;
            result.distanceVision=this.MAX_DISTANCE;
            //L'araignée peut empoisonner
            result.special=function(args){
                if(args.type=="attaque"){
                    //on applique le debuff de poison à 5%
                    if(Math.random()*100 < 5)
                        args.target.addBuff('poison');
                }
            }
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_VITESSE]=40;
            result.listDropRate[this.LISTE_DROPPABLES.BONUS_SOIN]=40;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_SKORPION]=10;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_AK]=7;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_M16]=3;
         }
         //Resistant 26.6 DPS
         if(type==this.ZOMBIE_RESISTANT){
         	result.maxSpeed=this.PAS*0.7;
            result.life=2000;
            result.attaque.degats=20;
            result.attaque.delaiMax=15;
            result.style=type;
            result.distanceVision=this.MAX_DISTANCE/2;

            result.dropRate=0.4;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_UZI]=50;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_DEAGLE]=50;
         }
         //Mini Boss 300 DPS
         if(type==this.ZOMBIE_BOSS1){
            result.maxSpeed=this.PAS*1.1;
            result.life=10000;
            result.attaque.degats=30;
            result.attaque.delaiMax=2;
            result.style=type;
            result.speed=0;
            result.distanceVision=0;
            var _this=this;//on sauvegarde le character manager, pour l'appeler dans la fonction
            result.special=function(args){
                if(args.type=="defense"){
                    //On perd un peu de vitesse quand on se fait taper
                    this.speed-=0.001;
                    //Quand on prend un dégat, on pop une araignée à 20%
                    if(Math.random()*100 < 20){
                      var araignee=_this.creationZombie(this.instance, this.instance.nbZombies, _this.ZOMBIE_TRES_RAPIDE);
                      araignee.x=this.x;
                      araignee.y=this.y;
                      this.instance.listeZombies[this.instance.nbZombies++]=araignee;
                    }
                }
            }
            result.dropRate=1;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_AK]=50;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_M16]=50;
         }
         //armé 160 DPS mais tape très fort
         if(type==this.ZOMBIE_ARME){
         	result.maxSpeed=this.PAS*0.9;
            result.life=1000;
            result.attaque.degats=200;
            result.attaque.delaiMax=25;
            result.style=type;
            result.speed=0;
            result.distanceVision=this.MIN_DISTANCE_VISIBLE/3;
            //Le zombie armé peut faire un saignement qui pique
            result.special=function(args){
                if(args.type=="attaque"){
                    //on applique le debuff de saignement à 50%
                    if(Math.random()*100 < 50)
                        args.target.addBuff('saignementViolent');
                }
            }
            result.dropRate=0.2;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_UZI]=40;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_SKORPION]=40;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_AK]=15;
            result.listDropRate[this.LISTE_DROPPABLES.ARME_M16]=5;
         }
         //Zombie explosif
         //console.log(result);
         //Zombie boss encore plus fort
         //Zombie boss encore encore plus fort
         return result;
	}

	this.creationJoueur=function(id,pseudo){
		var result={
   			x:0,
   			y:0,
        maxLife : this.DEFAULT_PLAYER_LIFE,
   			life:this.DEFAULT_PLAYER_LIFE,
        angle:0,//degrés
   			directions:{haut:false,bas:false,gauche:false,droite:false},
   			id:id,
            pseudo:pseudo,
            alive:true,
            style:parseInt(Math.random()*4),
            attaque:this.creationArme(0),
            isFiring:false,
            target:{targetX:0,targetY:0},
            kills:0,
            deaths:0,
            record:0,//meilleure vague atteinte
            speed:this.PAS,
            maxSpeed : this.PAS,
            taille:this.LARGEUR_PERSO,
            buffs:{},
            reini:function(characterManager){
              this.alive=true;
              this.life=characterManager.DEFAULT_PLAYER_LIFE;
              this.speed=this.maxSpeed;
              this.attaque=characterManager.creationArme(0);
              this.buffs={};
              this.kills=0;
              this.deaths=0;
              this.record=0;
              this.directions={haut:false,bas:false,gauche:false,droite:false};
              this.isFiring=false;
            },
            die:function(instance){
                this.buffs={};
                this.life=0;
                this.deaths++;
                this.alive=false;
                this.isFiring=false;
                this.directions={haut:false,bas:false,gauche:false,droite:false};
                instance.io.sockets.emit('player_die', this);
                instance.testFinPartie();
            },
            revive:function(characterManager){
              this.alive=true;
              this.life=characterManager.DEFAULT_PLAYER_LIFE;
              this.speed=this.maxSpeed;
              this.isFiring=false;
            },
            secondsToTic:function(secondes){return secondes*1000/50;},
            addBuff:function(type){
                //on regarde si le buff existe déjà ou pas
                if(this.buffs[type]==undefined)
                   this.buffs[type]={};
                if(type=="saignementLeger"){
                    this.buffs[type].duree=this.secondsToTic(5);
                    this.buffs[type].description="Saignement léger : votre vie descend lentement";
                  }
                else if(type=="assomage"){
                    this.buffs[type].duree=this.secondsToTic(2);
                    this.buffs[type].description="Assomage : vous ne pouvez plus bouger";
                  }
                else if(type=="saignementViolent"){
                    this.buffs[type].duree=this.secondsToTic(10);
                    this.buffs[type].description="Plaie profonde : votre vie descend rapidement";
                  }
                else if(type=="zombizSlayer"){
                    this.buffs[type].duree=this.secondsToTic(180);
                    this.buffs[type].description="Zombiz Slayer : vous courrez plus vite";
                  }
                else if(type=="poison"){
                    this.buffs[type].duree=this.secondsToTic(5);
                    this.buffs[type].description="Poison d'araignée : votre vitesse diminue petit à petit";
                  }
                else if(type=="survivor"){
                  this.buffs[type].duree=this.secondsToTic(5);
                  this.buffs[type].description="Survivor : vos dégâts sont amplifiés par la vue de vos amis morts";
                }
                else if(type=="adrenaline"){
                  if(this.buffs[type].duree!=undefined)
                    this.buffs[type].duree=this.buffs[type].duree+this.secondsToTic(10);
                  else
                    this.buffs[type].duree=this.secondsToTic(10);
                  this.buffs[type].description="Adrenaline : Le monde vous parait plus lent. Ou alors, vous allez plus vite ?";
                }
            },
            doDamages:function(target){
              var multiplier=1;
              if(this.buffs['survivor']!=undefined) multiplier=2;
              target.life-=this.attaque.degats * multiplier;
            },
            applyBuff:function(instance){/*on passe instance car on veut envoyer au client ses nouvelles infos !*/
              //On regarde si il est empoisonné pour pas appliquer le buff zombizSlayer
              var empoisonner=false;
              var slayer=false, adrenaline=false;;
              if(this.buffs['poison']!=undefined && this.buffs['poison'].duree!=undefined && this.buffs['poison'].duree>0) empoisonner=true;

                for(var stringBuff in this.buffs){
                    if(stringBuff=="saignementLeger"){
                        this.life-=0.1;
                        this.buffs[stringBuff].duree--;
                        instance.temporaryDisplayItem[instance.numberTmpItem++]={type:'player_life', id:this.id, life:parseInt(this.life)};
                        if(this.life<=0){
                            this.die(instance);
                        }
                        if(this.buffs[stringBuff]!=undefined && this.buffs[stringBuff].duree==0){
                            delete this.buffs[stringBuff];
                        }
                    }
                    else if(stringBuff=="assomage"){
                        this.speed=0;
                        this.isFiring=false;
                        this.buffs[stringBuff].duree--;
                        if(this.buffs[stringBuff].duree==0){
                            delete this.buffs[stringBuff];
                            this.speed=this.maxSpeed;
                        }
                    }
                    else if(stringBuff=="saignementViolent"){
                        this.life-=0.5;
                        this.buffs[stringBuff].duree--;
                        instance.temporaryDisplayItem[instance.numberTmpItem++]={type:'player_life', id:this.id, life:parseInt(this.life)};
                        instance.temporaryDisplayItem[instance.numberTmpItem++]={type:'sang', x:this.x, y:this.y};
                        if(this.life<=0){
                            this.die(instance);
                        }
                        if(this.buffs[stringBuff]!=undefined && this.buffs[stringBuff].duree==0){
                            delete this.buffs[stringBuff];
                        }
                    }
                    else if(stringBuff=="zombizSlayer"){
                        if(adrenaline && !empoisonner)
                          this.speed=this.maxSpeed+2;
                        else if(!adrenaline && !empoisonner)
                          this.speed=this.maxSpeed+1;
                        slayer=true;
                        this.buffs[stringBuff].duree--;
                        if(this.buffs[stringBuff].duree==0){
                            delete this.buffs[stringBuff];
                            this.speed=this.maxSpeed;
                        }
                    }
                    else if(stringBuff=="adrenaline"){
                      if(slayer && !empoisonner)
                          this.speed=this.maxSpeed+2;
                      else if(!slayer && !empoisonner)
                          this.speed=this.maxSpeed+1;
                      adrenaline=true;
                      this.buffs[stringBuff].duree--;
                      if(this.buffs[stringBuff].duree==0){
                        delete this.buffs[stringBuff];
                        if(slayer)
                          this.speed=this.maxSpeed+1;
                        else
                          this.speed=this.maxSpeed;
                      }
                    }
                    else if(stringBuff=="poison"){
                        this.speed=this.speed>0.1 ? this.speed - 0.1 : 0 ;
                        this.buffs[stringBuff].duree--;
                        if(this.buffs[stringBuff].duree==0){
                            delete this.buffs[stringBuff];
                            this.speed=this.maxSpeed;
                        }
                    }
                    else if(stringBuff=="survivor"){
                        this.buffs[stringBuff].duree--;
                        if(this.buffs[stringBuff].duree==0){
                            delete this.buffs[stringBuff];
                        }
                    }
                }
            }
   		};
        
   		return result;
	}

	this.creationArme=function(level){
		var result;
		switch(level){
			// 50 DPS
			case 0:result={id:level, nom:'.44 Magnum', degats:37.5,compteAReboursAttaque:0,delaiMax:15, portee:this.MIN_DISTANCE_VISIBLE*0.7};break;
			// 75 DPS
			case 1:result={id:level, nom:'Walther P99', degats:63.75,compteAReboursAttaque:0,delaiMax:17, portee:this.MIN_DISTANCE_VISIBLE*0.9};break;
			// 100 DPS
			case 2:result={id:level, nom:'Desert Eagle', degats:100,compteAReboursAttaque:0,delaiMax:20, portee:this.MIN_DISTANCE_VISIBLE*1.1};break;
			// 130 DPS
			case 3:result={id:level, nom:'Uzi', degats:13,compteAReboursAttaque:0,delaiMax:2, portee:this.MIN_DISTANCE_VISIBLE*0.8};break;
			// 200 DPS
			case 4:result={id:level, nom:'Skorpion VZ61', degats:10,compteAReboursAttaque:0,delaiMax:1, portee:this.MIN_DISTANCE_VISIBLE*0.9};break;
			// 300 DPS
			case 5:result={id:level, nom:'AK-47', degats:45,compteAReboursAttaque:0,delaiMax:3, portee:this.MIN_DISTANCE_VISIBLE};break;
			// 500 DPS
			case 6:result={id:level, nom:'M16', degats:100,compteAReboursAttaque:0,delaiMax:4, portee:this.MIN_DISTANCE_VISIBLE*1.1};break;
			default:result={id:level, nom:'arme', degats:30,compteAReboursAttaque:0,delaiMax:10, portee:this.MIN_DISTANCE_VISIBLE*0.5};break;
		}
		return result;
	}

	this.getWave=function(level){
		var result={};

		var nombre={};
		nombre[this.ZOMBIE_NORMAL]= {     0:10, 1:20, 2:30, 3:40, 4:50, 5:0,  6:30, 7:30, 8:30, 9:30, 10:0,  11:30, 12:30, 13:30, 14:30, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_RAPIDE]= {     0:0 , 1:0,  2:5,  3:15, 4:30, 5:0,  6:30, 7:30, 8:20, 9:20, 10:10, 11:10, 12:10, 13:10, 14:10, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_GROS]= {       0:0 , 1:0,  2:0,  3:0,  4:1,  5:0,  6:3,  7:3,  8:2,  9:2,  10:0,  11:2, 12:2,   13:2,  14:2,  15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_TRES_RAPIDE]= {0:0 , 1:0,  2:0,  3:0,  4:0,  5:0,  6:0,  7:0,  8:0,  9:1, 10:20, 11:20,12:20,  13:25, 14:30,  15:0, 16:200,17:300, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_RESISTANT]= {  0:0 , 1:0,  2:0,  3:0,  4:0,  5:2,  6:0,  7:0,  8:1,  9:2,  10:1,  11:1, 12:1,   13:1,  14:1,  15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_BOSS1]= {      0:0 , 1:0,  2:0,  3:0,  4:0,  5:0,  6:0,  7:0,  8:0,  9:0,  10:0,  11:0, 12:0,   13:0,  14:0,  15:1, 16:0, 17:10, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_ARME]= {       0:0 , 1:0,  2:0,  3:0,  4:0,  5:2,  6:0,  7:0,  8:2,  9:2,  10:5,  11:1, 12:1,   13:3,  14:3,  15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
    nombre[this.ZOMBIE_RAPIDE2]={     0:0 , 1:0,  2:0,  3:0,  4:0,  5:2,  6:5,  7:10, 8:20, 9:20, 10:10,  11:20, 12:20, 13:20, 14:20, 15:0, 16:0, 17:100, 18:0, 19:0, 20:0};
		//Affichage des totaux par vague dans la console, pour vérification.
		for(var i=0 ; i<=15 ; i++){
			var totalTmp=0;
      var vieTmp=0;
      var zombieTmp=null;
			for(var j=1;j<=8;j++){
				totalTmp+=nombre[j][i];
                zombieTmp=this.creationZombie(null,0,j);
                vieTmp+=zombieTmp.life * nombre[j][i];
            }
			//console.log('Vague ' + i + ': ' + totalTmp + ' zombies. ' + vieTmp + ' PV.');
		}

		//Ajout des zombies normaux
		result[this.ZOMBIE_NORMAL]={type:this.ZOMBIE_NORMAL, nombre:nombre[this.ZOMBIE_NORMAL][level]};
		//Ajout des zombies rapide
		result[this.ZOMBIE_RAPIDE]={type:this.ZOMBIE_RAPIDE, nombre:nombre[this.ZOMBIE_RAPIDE][level]};
		//Ajout des zombies gros
		result[this.ZOMBIE_GROS]={type:this.ZOMBIE_GROS, nombre:nombre[this.ZOMBIE_GROS][level]};
		//Ajout des zombies très rapide
		result[this.ZOMBIE_TRES_RAPIDE]={type:this.ZOMBIE_TRES_RAPIDE, nombre:nombre[this.ZOMBIE_TRES_RAPIDE][level]};
		//Ajout des zombies resistant
		result[this.ZOMBIE_RESISTANT]={type:this.ZOMBIE_RESISTANT, nombre:nombre[this.ZOMBIE_RESISTANT][level]};
		//Ajout des zombies pieuvre
		result[this.ZOMBIE_BOSS1]={type:this.ZOMBIE_BOSS1, nombre:nombre[this.ZOMBIE_BOSS1][level]};
		//Ajout des zombies armé
		result[this.ZOMBIE_ARME]={type:this.ZOMBIE_ARME, nombre:nombre[this.ZOMBIE_ARME][level]};
    //ajout des sprinters un peu plus sprinters
    result[this.ZOMBIE_RAPIDE2]={type:this.ZOMBIE_RAPIDE2, nombre:nombre[this.ZOMBIE_RAPIDE2][level]};
		return result;
	}

  this.getDroppable=function(idItem, x, y){
    //switch sur l'id
    return {id:idItem, x:x, y:y, taille:40};
  }
  this.getRandomDroppable=function(zombieTuer){
    //On associe les ID avec un niveau de rareté
    var random=Math.random()*100;
    var total=0;
    for(var idDrop in this.LISTE_DROPPABLES){
      //console.log('Random ' + random + ': Total actuel : ' + total + ': DropRate ' + zombieTuer.listDropRate[this.LISTE_DROPPABLES[idDrop]]);
      if(random < total + zombieTuer.listDropRate[this.LISTE_DROPPABLES[idDrop]])
        return {id:this.LISTE_DROPPABLES[idDrop], x:zombieTuer.x, y:zombieTuer.y, taille:40};
      total+=zombieTuer.listDropRate[this.LISTE_DROPPABLES[idDrop]];
    }
    console.log('Petit probleme dans les random du getRandomDroppable sur un ' + zombieTuer.style +' avec un pourcentage de : ' + random);
    return {id:this.LISTE_DROPPABLES.BONUS_SOIN, x:zombieTuer.x, y:zombieTuer.y, taille:40};
  }

  this.manageDroppable=function(perso, item){
    //Les 6 premiers sont les armes
    if(item.id<=6){
      if(perso.attaque.id < item.id){
        perso.attaque=this.creationArme(item.id);
        return 'J\'ai trouvé un '+ perso.attaque.nom +'!';
      }
      else return '';
    }
    else if(item.id==this.LISTE_DROPPABLES.BONUS_SOIN){
      perso.life+=10;
      return '';
    }
    else if(item.id==this.LISTE_DROPPABLES.BONUS_VITESSE){
      perso.addBuff('adrenaline');
      return '';
    }
    return "J'ai ramassé un objet non identitifé";
  }

  this.listToNetwork=function(liste){
        var result={};
        for(var id in liste){
            //On a besoin du x, du y, du style, de l'angle et de alive
            result[id]={};
            result[id].x=parseInt(liste[id].x);
            result[id].y=parseInt(liste[id].y);
            result[id].style=liste[id].style;
            result[id].angle=parseInt(liste[id].angle);
            result[id].alive=liste[id].alive;
            result[id].life=parseInt(liste[id].life);
            if(liste[id].attaque.id != undefined)
              result[id].attaque=liste[id].attaque.id;
            if(liste[id].pseudo != undefined)
               result[id].pseudo=liste[id].pseudo;
            if(liste[id].buffs != undefined)
               result[id].buffs=liste[id].buffs;//on envoie les buffs pour affichage client side
            //on ajoute la vitesse pour les calculs client side (en cas de lag)
            /*result[id].speed=liste[id].speed;
            if(liste[id].directions != undefined)
                result[id].directions=liste[id].directions;*/
        }
        return result;
    }

	  this.PAS=10;//px
  	this.LARGEUR_PERSO=50;
  	this.ZOMBIE_NORMAL=1;
  	this.ZOMBIE_RAPIDE=2;
  	this.ZOMBIE_GROS=3;
  	this.ZOMBIE_TRES_RAPIDE=4;
  	this.ZOMBIE_RESISTANT=5;
  	this.ZOMBIE_BOSS1=6;
  	this.ZOMBIE_ARME=7;
    this.ZOMBIE_RAPIDE2=8;
    this.ZOMBIE_BOSS2=-1;
    this.ZOMBIE_BOSS3=-1;
    this.ZOMBIE_EXPLOSIF=-1;//??
  	this.DEFAULT_PLAYER_LIFE=100;
    this.MAX_DISTANCE=Math.sqrt(2000*2000 + 1000*1000);//Distance diagonale de la map du jeu
    this.MIN_DISTANCE_VISIBLE=350;//distance où est raisonnablement visible
    this.MAX_DIAGONALE_PLAYER=Math.sqrt(450*450 + 325*325); //en gros, dès que le joueur peut le voie, il attaque
    this.VAGUE_MAX=15;
    this.LISTE_DROPPABLES={
      BONUS_SOIN:8,
      BONUS_VITESSE:7,
      ARME_WALTER:1,
      ARME_DEAGLE:2,
      ARME_UZI:3,
      ARME_SKORPION:4,
      ARME_AK:5,
      ARME_M16:6      
    };
}