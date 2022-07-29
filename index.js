//共通ライブラリ
const os = require("os")
const fs = require("fs");
const exec = require("child_process").exec;
const Duplex = require("stream").Duplex;
require("array-foreach-async");

//その他共通情報
const name = JSON.parse(
  fs.readFileSync("./package.json", "utf8")
).name;
const version = JSON.parse(
  fs.readFileSync("./package.json", "utf8")
).version;
const description = JSON.parse(
  fs.readFileSync("./package.json", "utf8")
).description;

//discordbotの操作に必要
const Discord = require("discord.js");
const { AudioPlayerStatus } = require('@discordjs/voice');

const discordtoken = JSON.parse(
  fs.readFileSync("./settings.json", "utf8")
).discordtoken;
const client = new Discord.Client();
const getYoutubeTitle = require('get-youtube-title-await')
const getYoutubeType = require('get-youtube-type-await')
const spl = require('search-youtube-playlists')

//ytdl
const ytdl = require("discord-radikodl-core");

//ytpl
const ytpl = require('skt-ytpl');

//ytsr
const ytsr = require("ytsr");
const validUrl = require("valid-url");

//radijs
const radijs = require('radijs');

//queue
const queue = new Map();

//appinsights
const appInsights = require("applicationinsights");
const iKey = JSON.parse(
  fs.readFileSync("./settings.json", "utf8")
).iKey;
if(iKey){
  appInsights.setup(iKey)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .setAutoCollectConsole(true, true)
    .setAutoCollectPreAggregatedMetrics(true) // 1.8.10では使用できないオプション
    .start();
}
const aiclient = appInsights.defaultClient;

client.on("ready", () => {
  if(os.release().includes("azure")){
    client.user.setActivity("Running on Azure");
  } else {
    client.user.setActivity("Running");
  }
  if (!fs.existsSync("./tmp")) {
    fs.mkdirSync("./tmp");
  }
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", async (msg) => {
  if (msg.author.bot) return;
  //console.log("message:", msg.content);

  if (msg.content.match(/^!radiko /)) {
    console.log("firstcmd: sr");
    var secondory_msg = msg.content.replace(/^!radiko /, "");

    var voiceChannel = msg.member.voice.channel;

    // join force
    try {
      var joinedChannel = await voiceChannel.join();
    } catch (e) {
      console.log(e);
    }

    console.log("secondmsg ->", secondory_msg);

    // play cmd
    if (secondory_msg.match(/^play .*/) || secondory_msg.match(/^p .*$/)) {
      console.log("secondcmd: play");
      var messageInfo = secondory_msg.replace(/^play /, "");
      messageInfo = messageInfo.replace(/^p /, "");
      console.log("messageInfo ->", messageInfo);

      //search and push queue
      const addMusics = [];

      var musicTitle = "";
      var musicUrl = "";
      // musicUrl contains playlist then foreach add
      musicUrl = await radijs.get_bangumi_uri(messageInfo);
      chunkUrl = await radijs.get_m3u8(musicUrl, await radijs.get_authtoken())
      musicTitle =  messageInfo
      addMusics.push({title:musicTitle, url: musicUrl, chunkUrl: chunkUrl})

      if (!queue.get(msg.guild.id)) {
        queue.set(msg.guild.id, {
          playing: false,
          connection: null,
          songs: [],
          isLoop: false,
        });
      }
      
      await addMusics.forEachAsync(async(item) => {
        queue.get(msg.guild.id).songs.push({ title: item.title, url: item.url, chunkUrl: item.chunkUrl});
      })

      msg.channel.send("added to queue -> " + messageInfo);
      msg.channel.send("queue length -> " + queue.get(msg.guild.id).songs.length);

      console.log(queue.get(msg.guild.id));

      //already playing
      if (queue.get(msg.guild.id).playing) {
        console.log("Since it is playing, we will just add it to the queue.");
        return;
      }

      play(msg, queue.get(msg.guild.id).songs[0]);
    }
    
    // skip cmd
    if (secondory_msg.match(/^s$/) || secondory_msg.match(/^skip$/) ) {
      queue.get(msg.guild.id).connection.dispatcher.end("Skip command used")
      return
    }

    // slist cmd
    if (secondory_msg.match(/^slist/)) {
        msg.channel.send(await radijs.get_station_id_list());
    }

    // now cmd
    if (secondory_msg.match(/^n/) || secondory_msg.match(/^now/)) {
	let song = JSON.parse(JSON.stringify(queue.get(msg.guild.id).songs[0]));
        msg.channel.send("1. ".concat(song.title, "\n",
		song.url)
	);
    }

    // queue cmd
    if (secondory_msg.match(/^q/) || secondory_msg.match(/^queue/)) {
      var songs = ""
      try {
	let replacer = function(key,value){
		if (key == "url") {
		  return "<" + value + ">"
		}
		return value
	}
	songs = JSON.parse(JSON.stringify(queue.get(msg.guild.id).songs, replacer));
	songs = songs.reduce((prev, current, index) => {
		prev[index + 1] = current;
		return prev;
	}, {})
      } catch(err) {
	console.log(err)
        return
      }
      msg.channel.send("queue ->");
      const numChunks = Math.ceil(JSON.stringify(songs, null, "\t").length / 1900)
      const chunks = new Array(numChunks)
      for (let i=0, x=0; i < numChunks; ++i, x += 1900) {
        msg.channel.send(JSON.stringify(songs, null, "\t").substr(x, 1900));
      }

      return;
    }

    // version cmd
    if (secondory_msg.match(/^v/) || secondory_msg.match(/^version/) ) {
      msg.channel.send("bot name : " + name);
      msg.channel.send("version : " + version);
      msg.channel.send("description : " + description);
      msg.channel.send("How to use : " + "https://github.com/sakkuntyo/discord-radicord/blob/dependabot/npm_and_yarn/ws-7.5.5/readme.md");
      msg.channel.send("invitation link : " + "https://discord.com/api/oauth2/authorize?client_id=889584860308570113&permissions=3147904&scope=bot");
      return;
    }

    // help cmd
    if (secondory_msg.match(/^h/) || secondory_msg.match(/^help/) ) {
      msg.channel.send("How to use : " + "https://github.com/sakkuntyo/discord-sktrythmjs/blob/dependabot/npm_and_yarn/ws-7.5.5/readme.md");
      msg.channel.send("invitation link : " + "https://discord.com/api/oauth2/authorize?client_id=889584860308570113&permissions=3147904&scope=bot");
      return;
    }

    // disconnect cmd
    if (
      secondory_msg.match(/^disc$/) ||
      secondory_msg.match(/^d$/) ||
      secondory_msg.match(/^disconnect$/)
    ) {
      console.log("secondcmd: disc");
      try {
        voiceChannel.leave();
        queue.delete(msg.guild.id);
        return 0;
      } catch (e) {
        console.log(e);
        return 1;
      }
    }
  }

});

async function play(msg) {
  
  if (!queue.get(msg.guild.id).songs[0]) {
    console.log("tried to play, but the queue was empty, so I quit.");
    msg.guild.me.voice.channel.leave();
    return;
  }

  var stream = null;
  //var token = await radijs.get_authtoken();
  stream = ytdl(queue.get(msg.guild.id).songs[0].chunkUrl, await radijs.get_authtoken(), {
    opusEncoded: true,
    encoderArgs: ["-af", "bass=g=3,volume=0.05"],
  })
  

  console.log({"musicUrl": queue.get(msg.guild.id).songs[0].url, "musicTitle": queue.get(msg.guild.id).songs[0].title})
  if(aiclient){
    aiclient.trackEvent({name: "play music", properties: {"musicUrl": queue.get(msg.guild.id).songs[0].url, "musicTitle": queue.get(msg.guild.id).songs[0].title}})
  }
  //msg.channel.send("now playing -> " + queue.get(msg.guild.id).songs[0].url)

  msg.member.voice.channel.join().then((connection) => {
    queue.get(msg.guild.id).playing = true;
    queue.get(msg.guild.id).connection = connection;

    connection.on(AudioPlayerStatus.Idle, () => {
  	console.log('idling!');
    });
    let dispatcher = connection
      .play(stream, {
        type: "opus",
      })
      .on("finish", () => {
        console.log("finished")
        queue.get(msg.guild.id).playing = false;
        if (queue.get(msg.guild.id).isLoop) {
          queue.get(msg.guild.id).songs.move(0, queue.get(msg.guild.id).songs.length - 1);
	} else {
          queue.get(msg.guild.id).songs.shift();
	}
        if (queue.get(msg.guild.id).songs.length == 0) {
          console.log("The song is over and the queue is empty, so I stop.");
          msg.guild.me.voice.channel.leave();
          return;
        }
        play(msg);
      })
      .on("error", (error) => {
        console.log(error)
	play(msg)
      })
      .on("debug", (error) => {
        console.log(error)
        play(msg)
      });
  });
}

client.login(discordtoken);

Array.prototype.move = function (from, to) {
  // Prototypes throw TypeErrors when the context or arguments are invalid
  if (Object.prototype.toString.call(this) !== "[object Array]") {
    throw new TypeError("`this` must be Array, not " + typeof this);
  } //from   ww  w  .  j  av  a 2  s .co  m
  if (typeof from !== "number") {
    throw new TypeError("argument[0] must be number, not " + typeof from);
  }
  if (typeof to !== "number") {
    throw new TypeError("argument[1] must be number, not " + typeof to);
  }
  var element = this[from];
  this.splice(from, 1);
  this.splice(to, 0, element);
  return this;
};
