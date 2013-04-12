//Masque de dates à utiliser pour les log
var dateToLog=function(date){
    return '[' + date.getDate() + '/' + (date.getMonth() +1) + ' ' + date.getHours() + ':' + date.getMinutes() + '] ';
}

var CharacterManager=require('./js/CharacterManager.class.js');
var characterManager=new CharacterManager();

var ServerMap = require('./js/ServerMap.class.js');
var serverMap = new ServerMap(io,characterManager, dbCore);

/*Classe qui gère tout les calculs sur la map*/
module.exports = function ServerRoomManager(io, dbCore)
{

}