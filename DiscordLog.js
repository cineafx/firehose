"use strict"

const util = require('util')
const axios = require('axios')
const EventEmitter = require('eventemitter3')

const WEBHOOK = {
  url: "https://discordapp.com/api/webhooks/",
  method: 'POST',
  headers: {
    "Content-Type": "application/json"
  },
}

const MESSAGE_QUEUE = []
const LOG_QUEUE_EMITTER = new EventEmitter()
LOG_QUEUE_EMITTER.on('event', queueRunner)

let QUEUE_BEING_CHECKED = false

module.exports = class DiscordLog {
  constructor (id, token) {
    this.id = id
    this.token = token
  }

  /**
   * Log a message in a twitch message style.
   * By webhookName
   * @param title
   * @param description
   * @param timestamp
   * @param colorHex
   * @param footerText
   * @param footerIconUrl
   */
  twitchMessageFireHose (title, description, timestamp, colorHex, footerText, footerIconUrl) {
    if (!!this.id && !!this.token) {
      DiscordLog.twitchMessageManual(this.id, this.token, title, description, timestamp, colorHex, footerText, footerIconUrl)
    }
  }

  /**
   * Log a message in a twitch message style.
   * By id and token
   * @param id
   * @param token
   * @param title
   * @param description
   * @param timestamp
   * @param colorHex
   * @param footerText
   * @param footerIconUrl
   */
  static twitchMessageManual (id, token, title, description, timestamp, colorHex, footerText, footerIconUrl) {
    let messageQueueObj = {
      "id": id,
      "token": token,
      "postContent": {
        "wait": true,
        "embeds": [{
          //"title": title,
          "description": description,
          "timestamp": timestamp,
          "color": DiscordLog.getDecimalFromHexString(colorHex),
          //"footer": {
          //  "text": footerText,
          //  "icon_url": footerIconUrl
          //},
        }]
      }
    }
    if (title) {
      messageQueueObj.postContent.embeds[0].title = title
    }
    if (footerText || footerIconUrl) {
      messageQueueObj.postContent.embeds[0].footer = {}
    }
    if (footerText) {
      messageQueueObj.postContent.embeds[0].footer.text = footerText
    }
    if (footerIconUrl) {
      messageQueueObj.postContent.embeds[0].footer["icon_url"] = footerIconUrl
    }

    MESSAGE_QUEUE.push(messageQueueObj)
    LOG_QUEUE_EMITTER.emit(("event"))
  }

  /**
   * Convert Hex colour string to decimal used by Discord webhooks
   * @param hex input colour
   * @returns {number} converted decimal colour
   */
  static getDecimalFromHexString (hex) {
    hex = hex.replace("#", "")
    if (!hex.startsWith("0x")) {
      hex = "0x" + hex
    }
    return parseInt(hex)
  }
}

/**
 * Checks the queue, handles the current object and send the 'event' event again.
 * Use like this: LOG_QUEUE_EMITTER.on('event', queueRunner)
 */
function queueRunner () {
  if (MESSAGE_QUEUE.length > 0 && !QUEUE_BEING_CHECKED) {
    QUEUE_BEING_CHECKED = true
    sendToWebhook(MESSAGE_QUEUE.shift()).then(() => {
      QUEUE_BEING_CHECKED = false
      LOG_QUEUE_EMITTER.emit("event")
    }, () => {
      QUEUE_BEING_CHECKED = false
      LOG_QUEUE_EMITTER.emit("event")
    })
  }
}

/**
 * Send a messageQueueObj to the Discord servers.
 * Converts webhookName to id + token
 * @param messageQueueObj input object
 * @returns {Promise<void>}
 */
async function sendToWebhook (messageQueueObj) {
  //Logger.info(JSON.stringify(messageQueueObj, null, 2))
  let request = Object.assign({}, WEBHOOK)
  request.url += messageQueueObj.id + "/" + messageQueueObj.token
  request.data = messageQueueObj.postContent
  await axios(request)
}

