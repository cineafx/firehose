"use strict"
const util = require('util')
const Firehose = require('./Firehose')
const DiscordLog = require('./DiscordLog')
const config = require('./config.json')

let firehose = new Firehose(config)
