//Masque de dates à utiliser pour les log
var dateToLog=function(date){
    return '[' + date.getDate() + '/' + (date.getMonth() +1) + ' ' + date.getHours() + ':' + date.getMinutes() + '] ';
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
   this.updatePlayerStats=function(datas){
      var _this=this;
      this.PlayerModel.find({pseudo : datas.pseudo},function(err, users){
         var user=users[0];//on récupère le premier enregistrement
         //On calcule les nouvelles valeurs à mettre.
         var deaths=user.deaths + datas.deaths;
         var kills=user.kills + datas.kills;
         var record=user.record > datas.record ? user.record : datas.record;
         _this.PlayerModel.update({pseudo:datas.pseudo}, {kills : kills, deaths : deaths, record : record}, function(err, data){if(err)throw err;});
      });
   }


   this.mongoose= new require('mongoose');
   this.playerSchema=new this.mongoose.Schema({
      pseudo: String,
      pseudoLowerCase:String,
      mdp : String,
      kills : {type : Number, default : 0},
      deaths: {type : Number, default : 0},
      record: {type : Number, default : 0},
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