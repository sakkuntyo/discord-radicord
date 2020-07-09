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

  if(msg.content.match(/^!pero /) || msg.channel.name.match("pero")) {
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
        return 1
      }
    }

    //request.json
    var translateConfig = {
      audioConfig: {
        audioEncoding: "LINEAR16",
        pitch: 0,
        speakingRate: 1
      },
      input: {
        text: secondory_msg
      },
      voice: {
        languageCode: "en-US",
        name: "en-US-Wavenet-D"
      }
    }
    fs.writeFileSync("./request.json",JSON.stringify(translateConfig))

    // other TtoS
    exec('curl -X POST -H "Authorization: Bearer "$(gcloud auth application-default print-access-token) -H "Content-Type: application/json; charset=utf-8" -d @request.json https://texttospeech.googleapis.com/v1/text:synthesize',{maxBuffer: 1024 * 10240}, (err, stdout, stderr) => {

      //string -> json
      var audJson = JSON.parse(stdout,'utf-8')

      //json -> base64
      var b64 = audJson.audioContent

      //base64 -> buffer
      var buf = new Buffer.from(b64, 'base64')

      //buffer -> stream
      var stream = new Duplex();
      stream.push(buf);
      stream.push(null);

      //buffer -> file
      //fs.writeFileSync(`./tmp/${fileName}.mp3`,buf, {flag: 'a'}) //flag:"a"は追記
      //fs.writeFileSync(`./tmp/${fileName}.mp3`,buf) //mp3が再生できるか確認する時に使う

      //play
      joinedChannel.play(stream);
      console.log(`play :${secondory_msg}`)
    })
  } 
});
  
client.login(discordtoken);
