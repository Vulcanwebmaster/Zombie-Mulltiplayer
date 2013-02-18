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
            var player=new _this.PlayerModel({'pseudo':datas.pseudo, 'pseudoLowerCase' : datas.pseudo.toLowerCase(), 'mdp': _this.Sha1(datas.mdp)});
            player.save();
            console.log(dateToLog(new Date) + 'Création du compte : ' + datas.pseudo);
            socket.emit('create_account_success', {'message':'Le compte '+datas.pseudo+' a bien été créé.'});
         }
      });
   }
   this.connect=function(datas, socket){
      //On regarde si on se connecte en visiteur
      if(datas.pseudo=='visiteur'){
         socket.emit('connection_success', {'message':'Vous êtes bien connecté.', 'pseudo':datas.pseudo});
         return;
      }
      var _this=this;
      this.PlayerModel.find({pseudoLowerCase : datas.pseudo.toLowerCase(), mdp: this.Sha1(datas.mdp)}, function(err, users){
         if(users.length!=1){
            socket.emit('connection_fail', {'message':'Veuillez vérifier vos identifiants.'});
         }
         else{
            socket.emit('connection_success', {'message':'Vous êtes bien connecté.', 'pseudo': users[0].pseudo});
         }
      });
   }

   this.updatePlayerStats=function(datas){
      if(datas==null || datas==undefined)return;
      if(datas.pseudo=='visiteur') return;
      var _this=this;
      //on save les datas car l'asynchrone fait que sinon c'est remis à zero avant l'update DB
      dataTmp={pseudo:datas.pseudo, kills:datas.kills, deaths:datas.deaths, record:datas.record};
      this.PlayerModel.find({pseudoLowerCase : dataTmp.pseudo.toLowerCase()},function(err, users){
         var user=users[0];//on récupère le premier enregistrement
         //On calcule les nouvelles valeurs à mettre.
         var deaths=user.deaths + dataTmp.deaths;
         var kills=user.kills + dataTmp.kills;
         var record=user.record > dataTmp.record ? user.record : dataTmp.record;
         //console.log('Before : ' + user.deaths +':'+user.kills+':'+user.record +'. After : ' + deaths+ ':'+kills+':'+record);
         _this.PlayerModel.update(user, {kills : kills, deaths : deaths, record : record}, function(err, data){if(err)throw err;});
      });
   }

   this.getTopPlayerHTML=function(response){
      this.PlayerModel.find({},null, {sort : {kills : -1}, limit : 5}, function(err, users){
         response.writeHead(200, {'Content-Type': 'text/html'});
         response.write('<tr><th>Pseudo</th><th>Zombies Tués</th><th>Record de survie</th></tr>');
         for(var i=0; i<users.length;i++)
            response.write('<tr><td>'+ users[i].pseudo +'</td><td>'+ users[i].kills +'</td><td>'+ recordToString(users[i].record) +'</td></tr>');
         response.end();
      });
   }
   this.getLeaderboardHTML=function(response){
      this.PlayerModel.find({},null, {sort : {kills : -1}}, function(err, users){
         response.writeHead(200, {'Content-Type': 'text/html'});
         response.write('<tr><th>Pseudo</th><th>Zombies Tués</th><th>Record de survie</th></tr>');
         var totalKills=0;var bestRecord=-1;
         for(var i=0; i<users.length;i++){
            response.write('<tr><td>'+ users[i].pseudo +'</td><td>'+ users[i].kills +'</td><td>'+ recordToString(users[i].record) +'</td></tr>');
            totalKills+=users[i].kills;
            bestRecord=Math.max(users[i].record, bestRecord);
         }
         response.write('<tr><th>TOTAL</th><th>'+ totalKills +'</th><th>'+ recordToString(bestRecord) +'</th></tr>');
            
         response.end();
      });
   }

   this.mongoose= new require('mongoose');
   this.playerSchema=new this.mongoose.Schema({
      pseudo: String,
      pseudoLowerCase:String,
      mdp : String,
      kills : {type : Number, default : 0},
      deaths: {type : Number, default : 0},
      record: {type : Number, default : -1},
      niveau: {type : Number, default :0},
      xp : {type : Number, default : 0},
      created : {type : Date, default: Date.now}
   });

   this.PlayerModel = this.mongoose.model('players', this.playerSchema);
   this.Sha1=require('./sha1.js');
   this.init();
}
/*Si je veux ajouter un nouveau champs sur la table, il faudra lancer cette commande d'abord :
db.foo.update({},{$set : { "about.bio" : ""}} , true, true); */