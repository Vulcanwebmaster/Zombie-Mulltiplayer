

/*Classe qui gère la création et les fonctions en rapport avec les personnages*/
module.exports = function CharacterManager(){

	this.creationZombie=function(instance,id,type){
		var result={
            x:0,
            y:0,
            speed:0.5,
            maxSpeed:Math.random()*(this.DEFAULT_ZOMBIE_SPEED-1)+1,
            life: this.DEFAULT_PLAYER_LIFE,
            angle:0,//degrés
            id:id,
            attaque:{degats:5,compteAReboursAttaque:0,delaiMax:25},
            alive:true,
            aware:false,
            distanceVision:this.MIN_DISTANCE_VISIBLE/2,
            style:parseInt(Math.random()*2),
            taille:this.LARGEUR_PERSO,
            agressivite:Math.random()*100 -50,
            instance:instance,
            special:function(){}
         };

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
         }
         //Rapide 8 DPS
         if(type==this.ZOMBIE_RAPIDE){
            result.maxSpeed=this.DEFAULT_ZOMBIE_SPEED*2;
            result.life=150;
            result.attaque.degats=2;
            result.attaque.delaiMax=5;
            result.style=type;
            result.distanceVision=this.MAX_DIAGONALE_PLAYER;
            result.special=function(args){
                if(args.type=="defense"){
                    //on court un peu plus vite si on prend des dégats
                    this.speed=this.speed < 9 ? this.speed + 1 : 9;  
                }
            }
         }
         //Gros 20 DPS mais très lent (1 coup toutes les 2,5 secondes)
         if(type==this.ZOMBIE_GROS){
            result.maxSpeed=this.DEFAULT_ZOMBIE_SPEED/2;
            result.life=1000;
            result.attaque.degats=50;
            result.attaque.delaiMax=50;
            result.style=type;
            result.agressivite=0;
            result.distanceVision=this.MIN_DISTANCE_VISIBLE/2;
            //Le zombie gros peut assomer
            result.special=function(args){
                if(args.type=="attaque"){
                    //on applique le debuff d'assomage à 50%
                    if(Math.random()*100 < 50)
                        args.target.addBuff('assomage');
                }
            }
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
         }
         //Resistant 26.6 DPS
         if(type==this.ZOMBIE_RESISTANT){
         	result.maxSpeed=this.DEFAULT_ZOMBIE_SPEED*2;
            result.life=2000;
            result.attaque.degats=20;
            result.attaque.delaiMax=15;
            result.style=type;
            result.distanceVision=this.MAX_DISTANCE/2;
         }
         //Mini Boss 300 DPS
         if(type==this.ZOMBIE_BOSS1){
            result.maxSpeed=this.PAS+1;
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
         }
         //armé 160 DPS mais tape très fort
         if(type==this.ZOMBIE_ARME){
         	result.maxSpeed=this.PAS-1;
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
         }
         //Zombie explosif

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
            style:parseInt(Math.random()*12),
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
            secondsToTic:function(secondes){return secondes*1000/50;},
            addBuff:function(type){
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
            },
            applyBuff:function(instance){/*on passe instance car on veut envoyer au client ses nouvelles infos !*/
              //On regarde si il est empoisonné pour pas appliquer le buff zombizSlayer
              var empoisonner=false;;
              if(this.buffs['poison']!=undefined && this.buffs['poison'].duree>0) empoisonner=true;

                for(var stringBuff in this.buffs){
                    if(stringBuff=="saignementLeger"){
                        this.life-=0.1;
                        this.buffs[stringBuff].duree--;
                        instance.temporaryDisplayItem[instance.numberTmpItem++]={type:'player_life', id:this.id, life:parseInt(this.life)};
                        if(this.life<=0){
                            this.die(instance);
                        }
                        if(this.buffs[stringBuff].duree==0){
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
                        if(this.buffs[stringBuff].duree==0){
                            delete this.buffs[stringBuff];
                        }
                    }
                    else if(stringBuff=="zombizSlayer"){
                        if(!empoisonner)
                          this.speed=this.maxSpeed+1;
                        this.buffs[stringBuff].duree--;
                        if(this.buffs[stringBuff].duree==0){
                            delete this.buffs[stringBuff];
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
                }
            }
   		};
        
   		return result;
	}

	this.creationArme=function(level){
		var result;
		switch(level){
			// 50 DPS
			case 0:result={nom:'.44 Magnum', degats:37.5,compteAReboursAttaque:0,delaiMax:15, portee:this.MIN_DISTANCE_VISIBLE};break;
			// 75 DPS
			case 1:result={nom:'Desert Eagle', degats:63.75,compteAReboursAttaque:0,delaiMax:17, portee:this.MIN_DISTANCE_VISIBLE};break;
			// 100 DPS
			case 2:result={nom:'Walther P99', degats:100,compteAReboursAttaque:0,delaiMax:20, portee:this.MIN_DISTANCE_VISIBLE};break;
			// 130 DPS
			case 3:result={nom:'Skorpion VZ61', degats:6.5,compteAReboursAttaque:0,delaiMax:1, portee:this.MIN_DISTANCE_VISIBLE};break;
			// 200 DPS
			case 4:result={nom:'Uzi', degats:20,compteAReboursAttaque:0,delaiMax:2, portee:this.MIN_DISTANCE_VISIBLE};break;
			// 300 DPS
			case 5:result={nom:'AK-47', degats:45,compteAReboursAttaque:0,delaiMax:3, portee:this.MIN_DISTANCE_VISIBLE};break;
			// 500 DPS
			case 6:result={nom:'M16', degats:100,compteAReboursAttaque:0,delaiMax:4, portee:this.MIN_DISTANCE_VISIBLE};break;
			default:result={nom:'arme', degats:30,compteAReboursAttaque:0,delaiMax:10, portee:this.MIN_DISTANCE_VISIBLE};break;
		}
		return result;
	}

	this.getWave=function(level){
		var result={};

		var nombre={};
		nombre[this.ZOMBIE_NORMAL]= {     0:5 , 1:15, 2:30, 3:40, 4:50, 5:0,  6:30, 7:30, 8:30, 9:30, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_RAPIDE]= {     0:0 , 1:0,  2:5,  3:15, 4:30, 5:0,  6:30, 7:30, 8:30, 9:30, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_GROS]= {       0:0 , 1:0,  2:0,  3:0,  4:1,  5:0,  6:5,  7:3,  8:2,  9:2,  10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_TRES_RAPIDE]= {0:0 , 1:0,  2:0,  3:0,  4:0,  5:0,  6:10, 7:20, 8:10, 9:10, 10:0, 11:200, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_RESISTANT]= {  0:0 , 1:0,  2:0,  3:0,  4:0,  5:2,  6:0,  7:0,  8:1,  9:2,  10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_BOSS1]= {      0:0 , 1:0,  2:0,  3:0,  4:0,  5:0,  6:0,  7:0,  8:0,  9:0,  10:1, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};
		nombre[this.ZOMBIE_ARME]= {       0:0 , 1:0,  2:0,  3:0,  4:0,  5:2,  6:0,  7:0,  8:2,  9:2,  10:0, 11:0, 12:0, 13:0, 14:0, 15:0, 16:0, 17:0, 18:0, 19:0, 20:0};

		//Affichage des totaux par vague dans la console, pour vérification.
		for(var i=0 ; i<=10 ; i++){
			var totalTmp=0;
            var vieTmp=0;
            var zombieTmp=null;
			for(var j=1;j<=7;j++){
				totalTmp+=nombre[j][i];
                zombieTmp=this.creationZombie(0,j);
                vieTmp+=zombieTmp.life * nombre[j][i];
            }
			//console.log('Vague ' + i + ': ' + totalTmp + ' zombies. ' + vieTmp + ' PV. ' + attaqueTmp + ' DPS');
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
		return result;
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

	this.PAS=9;//px
  	this.DEFAULT_ZOMBIE_SPEED=3;
  	this.LARGEUR_PERSO=30;
  	this.ZOMBIE_NORMAL=1;
  	this.ZOMBIE_RAPIDE=2;
  	this.ZOMBIE_GROS=3;
  	this.ZOMBIE_TRES_RAPIDE=4;
  	this.ZOMBIE_RESISTANT=5;
  	this.ZOMBIE_BOSS1=6;
  	this.ZOMBIE_ARME=7;
    this.ZOMBIE_BOSS2=-1;
    this.ZOMBIE_BOSS3=-1;
    this.ZOMBIE_EXPLOSIF=-1;//??
  	this.DEFAULT_PLAYER_LIFE=100;
    this.MAX_DISTANCE=Math.sqrt(1200*1200 + 700*700);//Distance diagonale de la map du jeu
    this.MIN_DISTANCE_VISIBLE=300;//distance où est raisonnablement visible
    this.MAX_DIAGONALE_PLAYER=Math.sqrt(450*450 + 250*250); //en gros, dès que le joueur peut le voie, il attaque
}