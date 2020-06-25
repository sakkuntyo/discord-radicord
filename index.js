//discordbotの操作に必要
const discordtoken = '<discordtoken>'
const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
const request = require("request");
const exec = require('child_process').exec;

client.on('ready', () => {
  if(!(fs.existsSync("./tmp"))){
    fs.mkdirSync("./tmp")
  }
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
  if(msg.author.bot) return;
  console.log("message:", msg.content)

  if(msg.content.match(/^!pero /)) {
    console.log("firstcmd: pero")
    var secondory_msg = msg.content.replace(/^!pero /,"");

    var voiceChannel = msg.member.voice.channel;
    
    // join force
    try {
      var joinedChannel = await voiceChannel.join();
    } catch(e) {
      console.log(e)
    }

    // disconnect cmd
    if(secondory_msg.match(/^disc$/)) {
      console.log("secondcmd: disc")
      try {
        voiceChannel.leave();
        return 0
      } catch(e) {
        console.log(e)
        console.log("チャンネルから抜けたいけど抜けられない(実装して)！！！！");
        return 1
      }
    }

    // other TtoS
    var fileName = Math.random().toString(32).substring(2)
    exec('cat ./request.json | sed ' + `"s/peropero chupa/${secondory_msg}/g" ` + '> ./request-edited.json;curl -X POST -H "Authorization: Bearer "$(gcloud auth application-default print-access-token) -H "Content-Type: application/json; charset=utf-8" -d @request-edited.json https://texttospeech.googleapis.com/v1/text:synthesize | jq .audioContent -r | base64 -i --decode > ./tmp/' + `${fileName}` + '.mp3', (err, stdout, stderr) => {
      if(err) {
        console.log(err)
        return 1
      }
      console.log("stderr ->", stderr)
      console.log("downloaded")
      try {
        joinedChannel.play('./tmp/' + `${fileName}` + '.mp3');
        console.log(`${fileName} played`)
        return 0
      } catch(e) {
        console.log(e)
        return 1
      }
    })
  } 
});
  
client.login(discordtoken);
