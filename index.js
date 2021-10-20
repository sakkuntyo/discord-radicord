//共通ライブラリ
const fs = require("fs");
const exec = require("child_process").exec;
const Duplex = require("stream").Duplex;
require("array-foreach-async");

//discordbotの操作に必要
const Discord = require("discord.js");
const discordtoken = JSON.parse(
  fs.readFileSync("./settings.json", "utf8")
).discordtoken;
const client = new Discord.Client();
const getYoutubeTitle = require('get-youtube-title-await')
const getYoutubeType = require('get-youtube-type-await')

//ytdl
const ytdl = require("discord-ytdl-core");

//ytpl
const ytpl = require('ytpl');

//ytsr
const ytsr = require("ytsr");
const validUrl = require("valid-url");

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

client.on("ready", () => {
  if (!fs.existsSync("./tmp")) {
    fs.mkdirSync("./tmp");
  }
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", async (msg) => {
  if (msg.author.bot) return;
  //console.log("message:", msg.content);

  if (msg.content.match(/^!sr /) || msg.channel.name.match("sr")) {
    console.log("firstcmd: sr");
    var secondory_msg = msg.content.replace(/^!sr /, "");

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
      addMusics = [];

      var musicTitle = "";
      var musicUrl = "";
      var isLive = "";
      if (validUrl.isUri(messageInfo)) {
	// musicUrl contains playlist then foreach add
	if(messageInfo.match(/.*?list=/)){
          //playlist
          var playlistId = messageInfo.replace(/.*?list=/,"").replace(/&.*/,"")
          var playlist = await ytpl(playlistId)
          await playlist.items.forEachAsync(async(videoInfo) => {
            musicUrl = videoInfo.shortUrl
            musicTitle =  await getYoutubeTitle(videoInfo.id)
            isLive =  await getYoutubeType(videoInfo.id) == "live"
            addMusics.push({title:musicTitle, url: musicUrl, isLive: isLive})
	  })
	} else {
          //video
          musicUrl = messageInfo;
          musicTitle =  await getYoutubeTitle(musicUrl.replace(/.*?v=/,"").replace(/&.*/,""))
          isLive =  await getYoutubeType(musicUrl.replace(/.*?v=/,"").replace(/&.*/,"")) == "live"
          addMusics.push({title:musicTitle, url: musicUrl, isLive: isLive})
	}
      } else {
        const options = {
          pages: 1,
        };
        const filters1 = await ytsr.getFilters(messageInfo);
        const filter1 = filters1.get("Type").get("Video");
        const searchResults = await ytsr(filter1.url, options);
        musicTitle = searchResults.items[0].title;
        musicUrl = searchResults.items[0].url;
        isLive =  await getYoutubeType(musicUrl.replace(/.*?v=/,"").replace(/&.*/,"")) == "live"
        addMusics.push({title:musicTitle, url: musicUrl, isLive: isLive})
      }

      if (!queue.get(msg.guild.id)) {
        queue.set(msg.guild.id, {
          playing: false,
          connection: null,
          songs: [],
        });
      }
      
      await addMusics.forEachAsync(async(item) => {
        queue.get(msg.guild.id).songs.push({ title: item.title, url: item.url, isLive: item.isLive });
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

    // queue cmd
    if (secondory_msg.match(/^q/) || secondory_msg.match(/^queue/)) {
      var songs = JSON.parse(JSON.stringify(queue.get(msg.guild.id).songs));
      songs.filter((song) => {
        song.url = "<" + song.url;
        song.url = song.url + ">";
      });
      msg.channel.send("queue ->");
      const numChunks = Math.ceil(JSON.stringify(songs, null, "\t").length / 1900)
      const chunks = new Array(numChunks)
      for (let i=0, x=0; i < numChunks; ++i, x += 1900) {
        msg.channel.send(JSON.stringify(songs, null, "\t").substr(x, 1900));
      }

      return;
    }

    // shuffle cmd
    if (secondory_msg.match(/^sh/) || secondory_msg.match(/^shuffle/)) {
      for (i = queue.get(msg.guild.id).songs.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = queue.get(msg.guild.id).songs[i];
        queue.get(msg.guild.id).songs[i] = queue.get(msg.guild.id).songs[j];
        queue.get(msg.guild.id).songs[j] = tmp;
      }
      msg.channel.send("shuffled");

      queue.get(msg.guild.id).songs;
      return;
    }

    // mv cmd
    if (secondory_msg.match(/^mv .*/)) {
      console.log("secondcmd: mv");
      var index = secondory_msg.replace(/^mv /, "") - 1;
      console.log(queue.get(msg.guild.id).songs);
      queue.get(msg.guild.id).songs.move(index, 1);

      var songs = JSON.parse(JSON.stringify(queue.get(msg.guild.id).songs));
      songs.filter((song) => {
        song.url = "<" + song.url;
        song.url = song.url + ">";
      });

      msg.channel.send("shuffled" + "\r " + JSON.stringify(songs, null, "\t"));

      return;
    }
    // skip cmd
    if (secondory_msg.match(/^s/) || secondory_msg.match(/^skip/) ) {
      queue.get(msg.guild.id).connection.dispatcher.end("Skip command used")
      return
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

  console.log(queue.get(msg.guild.id).songs[0].url)
  console.log(queue.get(msg.guild.id).songs[0].title)
  msg.channel.send("now playing -> " + queue.get(msg.guild.id).songs[0].url)

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
        queue.get(msg.guild.id).songs.shift();
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
