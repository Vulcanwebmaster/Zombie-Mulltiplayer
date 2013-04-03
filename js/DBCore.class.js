//Masque de dates à utiliser pour les log
var dateToLog=function(date){
    return '[' + date.getDate() + '/' + (date.getMonth() +1) + ' ' + date.getHours() + ':' + date.getMinutes() + '] ';
}
var s=function(n){
   return n>1 ? 's' : '';
}
var recordToString=function(n){
   return n==-1? 'Aucun' : 'Vague ' + n;
}

/*Classe qui gère toutes les fonctions en rapport avec la DB*/
module.exports = function DBCore(){

   //Connexion à la DB
   this.init=function(){
      this.mongoose.connect('mongodb://localhost/zombiz', function(err) {
        if (err) { throw err; }
        else { console.log(dateToLog(new Date) + 'Connexion à la base de données effectuée'); }
      });
   }


   this.createAccount=function(datas, socket){
      //On regarde si quelqu'un ne crée pas le compte visiteur
      if(datas.pseudo=='visiteur'){
         console.log(dateToLog(new Date) + 'Impossible de créer le compte ' + datas.pseudo);
         socket.emit('create_account_fail', {'message':'Le compte '+datas.pseudo+' n\'est pas disponible.'});
         return;
      }
      //On regarde si on a déjà un compte avec ce pseudo
      var _this=this;
      this.PlayerModel.find({pseudoLowerCase : datas.pseudo.toLowerCase()}, function(err, users){
         if(users.length>0){
            console.log(dateToLog(new Date) + 'Impossible de créer le compte ' + datas.pseudo);
            socket.emit('create_account_fail', {'message':'Le compte '+datas.pseudo+' n\'est pas disponible.'});
         }
         else{
            var player=new _this.PlayerModel({'pseudo':datas.pseudo, 'pseudoLowerCase' : datas.pseudo.toLowerCase(), 'mdp': _this.Sha1(datas.mdp), 'email': datas.email});
            player.save();
            console.log(dateToLog(new Date) + 'Création du compte : ' + datas.pseudo);
            socket.emit('create_account_success', {'message':'Le compte '+datas.pseudo+' a bien été créé.'});
         }
      });
   }
   this.connect=function(datas, socket, listeOnlinePlayers, serverMap){
      console.log(dateToLog(new Date) + 'Un joueur envoi son pseudo : ' + datas.pseudo);
      //On regarde si on se connecte en visiteur
      if(datas.pseudo=='visiteur'){
         socket.set('pseudo', 'visiteur');
         socket.emit('connection_success', {'message':'Vous êtes bien connecté.', 'pseudo':datas.pseudo});
         var joueurId=serverMap.addJoueur(datas.pseudo, socket);
         socket.broadcast.emit('broadcast_msg', {'message': datas.pseudo + ' vient de se connecter.', 'class': 'tchat-game-event'});
         socket.set('id', joueurId);
         return;
      }
      var _this=this;
      //Load from DB
      this.PlayerModel.find({pseudoLowerCase : datas.pseudo.toLowerCase(), mdp: this.Sha1(datas.mdp)}, function(err, users){
         if(users.length!=1){
            socket.emit('connection_fail', {'message':'Veuillez vérifier vos identifiants.'});
         }
         else{
            //Connexion en tant que joueur à partir de la DB
            if(users[0].active==1){
               listeOnlinePlayers[users[0].pseudo]=users[0];
               socket.set('pseudo', users[0].pseudo);
               socket.emit('connection_success', {'message':'Vous êtes bien connecté.', 'pseudo': users[0].pseudo});

               var joueurDejaInGame = serverMap.getPlayer(datas.pseudo);
               if(joueurDejaInGame == null || datas.pseudo.toLowerCase() == "visiteur")
                  var joueurId=serverMap.addJoueurFromDB(users[0], socket);
               else{
                  socket.emit('set_id', -1);
                  socket.emit('player_spectateur', {id:-1});
                  socket.emit('broadcast_msg', {'message': 'ATTENTION : Le pseudo ' + datas.pseudo + ' est déjà pris. Vous ne pourrez pas jouer. /!\\', 'class': 'tchat-error'});;
               }
               socket.broadcast.emit('broadcast_msg', {'message': datas.pseudo + ' vient de se connecter.', 'class': 'tchat-game-event'});
               socket.set('id', joueurId);
            }
            //ERROR
            else
               socket.emit('connection_fail', {'message':'Votre compte a été banni.'});
         }
      });
   }

   this.updatePlayerStats=function(datas){
      if(datas==null || datas==undefined){
         console.log(dateToLog(new Date) + 'DBCore::updatePlayerStats : datas = ' + datas);
         return;
      }
      if(datas.pseudo=='visiteur') return;
      var _this=this;
      //on save les datas car l'asynchrone fait que sinon c'est remis à zero avant l'update DB
      var dataTmp={pseudo:datas.pseudo, kills:datas.kills, deaths:datas.deaths, record:datas.record};
      this.PlayerModel.find({pseudoLowerCase : dataTmp.pseudo.toLowerCase()},function(err, users){
         var user=users[0];//on récupère le premier enregistrement
         if(user==undefined) return;
         //On calcule les nouvelles valeurs à mettre.
         var deaths=user.deaths + dataTmp.deaths;
         var kills=user.kills + dataTmp.kills;
         var record=user.record > dataTmp.record ? user.record : dataTmp.record;
         //console.log(dateToLog(new Date) + 'DBCore::updatePlayerStats : ' + user.pseudo + ' => Before : ' + user.deaths +':'+user.kills+':'+user.record +'. After : ' + deaths+ ':'+kills+':'+record);
         _this.PlayerModel.update(user, {kills : kills, deaths : deaths, record : record}, function(err, data){if(err) console.log(err);});
      });
   }

   this.getTopPlayerHTML=function(response){
      var nombreJoueurs=10;
      this.PlayerModel.find({},null, {sort : {kills : -1}, limit : nombreJoueurs}, function(err, users){
         response.writeHead(200, {'Content-Type': 'text/html'});
         var style="";
         response.write('<tr><th>Position</th><th>Pseudo</th><th>Zombies Tués</th><th>Record de survie</th></tr>');
         for(var i=0; i<users.length;i++){
            var badge="";
            if(users[i].active==0)
               badge='<span class="leaderboard-badge leaderboard-ban">banni</span> ';
            else if(users[i].rang==1)
               badge='<span class="leaderboard-badge leaderboard-modo">modo</span> ';
            else if(users[i].rang==2)
               badge='<span class="leaderboard-badge leaderboard-admin">admin</span> ';
            response.write('<tr><td>'+ (i+1) +'</td><td>'+badge+ users[i].pseudo +'</td><td>'+ users[i].kills +'</td><td>'+ recordToString(users[i].record) +'</td></tr>');
         }
         response.end();
      });
   }
   this.getLeaderboardHTML=function(response){
      this.PlayerModel.find({},null, {sort : {kills : -1}}, function(err, users){
         response.writeHead(200, {'Content-Type': 'text/html'});
         response.write('<tr><th>Position</th><th>Pseudo</th><th>Zombies Tués</th><th>Record de survie</th></tr>');
         var totalKills=0,bestRecord=-1;
         var style="";
         for(var i=0; i<users.length;i++){
            var badge="";
            if(users[i].active==0)
               badge='<span class="leaderboard-badge leaderboard-ban">banni</span> ';
            else if(users[i].rang==1)
               badge='<span class="leaderboard-badge leaderboard-modo">modo</span> ';
            else if(users[i].rang==2)
               badge='<span class="leaderboard-badge leaderboard-admin">admin</span> ';
            response.write('<tr><td>'+ (i+1) +'</td><td>'+badge+users[i].pseudo +'</td><td>'+ users[i].kills +'</td><td>'+ recordToString(users[i].record) +'</td></tr>');
            totalKills+=users[i].kills;
            bestRecord=Math.max(users[i].record, bestRecord);
         }
         response.write('<tr><th>TOTAL</th><th>'+ users.length + ' comptes</th><th>'+ totalKills +'</th><th>'+ recordToString(bestRecord) +'</th></tr>');
            
         response.end();
      });
   }
   this.getAccountInformations=function(pseudo, socket){
      if(pseudo=="visiteur"){
         socket.emit('response_account_informations', {pseudo:'visiteur', email:'Pas d\'adresse mail'});
         return;
      }
      this.PlayerModel.find({pseudoLowerCase:pseudo.toLowerCase()}, function(err, users){
         var user=users[0];
         var reponse={pseudo:'Erreur', email:'Erreur'};
         if(user!=undefined){
            reponse.pseudo=user.pseudo;
            reponse.email=user.email;
         }
         socket.emit('response_account_informations', reponse);
      });
   }

   this.updateAccountPassword=function(pseudo, passwd, socket){
      var passwdSha=this.Sha1(passwd);
      this.PlayerModel.update({pseudoLowerCase:pseudo.toLowerCase()}, {mdp:passwdSha}, function(err, data){if(err) console.log(err); else socket.emit('success');});
   }
   this.updateAccountEmail=function(pseudo, email, socket){
      this.PlayerModel.update({pseudoLowerCase:pseudo.toLowerCase()}, {email:email}, function(err, data){if(err) console.log(err); else socket.emit('success');});
   }
   this.ban=function(pseudo){
      this.PlayerModel.update({pseudoLowerCase:pseudo.toLowerCase()}, {active:0}, function(err, data){if(err) console.log(err); else console.log('Compte ' + pseudo + ' banni.');});
   }

   this.updateAccountSkin=function(pseudo, skinID){
      this.PlayerModel.update({pseudoLowerCase:pseudo.toLowerCase()}, {skin_id:skinID}, function(err, data){if(err) console.log(err);});
    }

   this.mongoose= new require('mongoose');
   this.playerSchema=new this.mongoose.Schema({
      pseudo: String,
      pseudoLowerCase:String,
      mdp : String,
      email : {type:String, default : ''},
      kills : {type : Number, default : 0},
      deaths: {type : Number, default : 0},
      record: {type : Number, default : -1},
      niveau: {type : Number, default :0},
      xp : {type : Number, default : 0},
      active : {type : Number, default : 1},
      rang : {type : Number, default : 0},
      skin_id : {type : Number, default : 0},
      created : {type : Date, default: Date.now}
   });

   this.PlayerModel = this.mongoose.model('players', this.playerSchema);
   this.Sha1=require('./sha1.js');
   this.init();
}
/*Si je veux ajouter un nouveau champs sur la table, il faudra lancer cette commande d'abord :
db.foo.update({},{$set : { "about.bio" : ""}} , true, true); */

//Champs à ajouter : active (0,1), rang(0,1,2), skin_id(X)
//db.players.update({}, {$set : {rang:0, active:1, skin_id:0}}, true, true);