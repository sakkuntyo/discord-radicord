//共通ライブラリ
const fs = require('fs');
const exec = require('child_process').exec;
const Duplex = require('stream').Duplex;

//discordbotの操作に必要
const Discord = require('discord.js');
const discordtoken = JSON.parse(fs.readFileSync('./settings.json', 'utf8')).discordtoken;
const client = new Discord.Client();

client.on('ready', () => {
  if(!(fs.existsSync("./tmp"))){
    fs.mkdirSync("./tmp")
  }
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
  if(msg.author.bot) return;
  console.log("message:", msg.content)

  if(msg.content.match(/^!sr /) || msg.channel.name.match("sr")) {
    console.log("firstcmd: sr")
    var secondory_msg = msg.content.replace(/^!sr /,"");

    var voiceChannel = msg.member.voice.channel;
    
    // join force
    try {
      var joinedChannel = await voiceChannel.join();
    } catch(e) {
      console.log(e)
    }

    console.log("secondmsg ->", secondory_msg)

    // play cmd
    if(secondory_msg.match(/^play .*/) || secondory_msg.match(/^p .*$/)) {
      console.log("secondcmd: play")
      var messageInfo = secondory_msg.replace(/^p.* /,"");
      console.log(messageInfo)
    }

    // disconnect cmd
    if(secondory_msg.match(/^disc$/)) {
      console.log("secondcmd: disc")
      try {
        voiceChannel.leave();
        return 0
      } catch(e) {
        console.log(e)
        return 1
      }
    }
  } 
});
  
client.login(discordtoken);
