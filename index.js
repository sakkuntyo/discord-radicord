//共通ライブラリ
const os = require("os")
const fs = require("fs");
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
const discordtoken = JSON.parse(
  fs.readFileSync("./settings.json", "utf8")
).discordtoken;
const client = new Discord.Client();

//ytdl
const ytdl = require("discord-ytdl-core");

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
  console.log("message:", msg.content);
  if (msg.content.match(/^!ra/)) {
    msg.channel.send("test")
  }
});

function play(msg) {
  if (!queue.get(msg.guild.id).songs[0]) {
    console.log("tried to play, but the queue was empty, so I quit.");
    msg.guild.me.voice.channel.leave();
    return;
  }

  var stream = null;
  if(queue.get(msg.guild.id).songs[0].isLive){
    stream = ytdl(queue.get(msg.guild.id).songs[0].url, {
      opusEncoded: true,
      encoderArgs: ["-af", "bass=g=3,volume=0.05"],
    });
  }
  else {
    stream = ytdl(queue.get(msg.guild.id).songs[0].url, {
      filter: "audioonly",
      opusEncoded: true,
      encoderArgs: ["-af", "bass=g=3,volume=0.05"],
    });
  }

  console.log({"musicUrl": queue.get(msg.guild.id).songs[0].url, "musicTitle": queue.get(msg.guild.id).songs[0].title})
  if(aiclient){
    aiclient.trackEvent({name: "play music", properties: {"musicUrl": queue.get(msg.guild.id).songs[0].url, "musicTitle": queue.get(msg.guild.id).songs[0].title}})
  }
  //msg.channel.send("now playing -> " + queue.get(msg.guild.id).songs[0].url)

  msg.member.voice.channel.join().then((connection) => {
    queue.get(msg.guild.id).playing = true;
    queue.get(msg.guild.id).connection = connection;

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
