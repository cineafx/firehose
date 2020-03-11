"use strict"

const util = require("util")
const axios = require('axios')
const CancelToken = axios.CancelToken
//CLASSES
const DiscordLog = require('./DiscordLog')

const nameRegex = /\bicdb\b/i

module.exports = class Firehose {
  constructor (config) {
    this.config = config
    this.discordLog = new DiscordLog(this.config.discord.id, this.config.discord.token)
    this.regex = new RegExp(this.config.regex, "i")
    this.lastLine = 0
    this.req = null
    this.source = CancelToken.source()
    //TODO: don't use timeouts ...
    setTimeout(this.checkFirehose.bind(this), 100)
  }

  /**
   * Check if firehose is still running.
   * By checking if there was a message in the past 5 seconds.
   * Restart the module if not.
   */
  checkFirehose () {
    if (this.lastLine + 5000 < new Date()) {
      if (this.req) {
        this.source.cancel()
        this.req = null
      }
      this.startFirehose()
    }
    setTimeout(this.checkFirehose.bind(this), 10000)
  }

  /**
   * Start the firehose parser
   */
  startFirehose () {
    let request = {
      url: "https://tmi.twitch.tv/firehose?oauth_token="
        + this.config.oauth.substring(6),
      responseType: 'stream'
    }

    console.debug("Starting firehose")
    this.req = axios(request, {cancelToken: this.source.token}).then((res) => {
      res.data.on('data', (response) => {
        try {
          this.lastLine = Date.now()

          let obj = JSON.parse(response.toString().split("\n")[1].substring(6))
          //obj.event = split[0].substring(7)
          if (this.regex.test(obj.body)) {

            let tags = obj.tags.split(";")
            let parsedtags = {}
            for (let tag of tags) {
              let split = tag.split("=")
              parsedtags[split[0]] = split[1]
            }

            if (obj.room) {
              console.log(obj.room + " " + obj.nick + ": " + obj.body)
              this.discordLog.twitchMessageFireHose(obj.room, obj.body, new Date().toISOString(), parsedtags.color, obj.nick, "")
            } else {
              DiscordLog.custom("firehose-notify",
                response.toString().split("\n")[0].substring(7),
                util.inspect(obj))
            }
          }
        } catch (e) {
          //ignore
          //console.warn(e)
        }
      })
    }).catch((err) => {
      if (axios.isCancel(err)) {
        console.log("Firehose canceled ...")
      } else {
        this.source.cancel()
      }
    })
  }
}

