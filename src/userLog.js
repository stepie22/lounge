"use strict";

var fs = require("fs");
var fsextra = require("fs-extra");
var moment = require("moment");
var Helper = require("./helper");
const Msg = require("./models/msg");

module.exports.read = function(user, network, chan) {
	var data = fs.readFileSync(
		`${Helper.getUserLogsPath(user, network)}/${chan}.log`,
		"utf-8"
	).toString().split("\n");

	// var format = Helper.config.logs.format || "YYYY-MM-DD HH:mm:ss";
	// var tz = Helper.config.logs.timezone || "UTC+00:00";

	var messages = [];

	data.forEach(line => {
		let result = /^\[(.*)\] <(.*)> (.*)$/.exec(line);

		if (result) {
			messages.push(new Msg({
				// time: result[1],
				from: result[2],
				text: result[3]
			}));
			return;
		}

		result = /^\[(.*)\] \* (.*) action (.*)$/.exec(line);

		if (result) {
			messages.push(new Msg({
				// time: result[1],
				from: result[2],
				text: result[3],
				type: "action"
			}));
			return;
		}
	});

	return messages;
};

module.exports.write = function(user, network, chan, msg) {
	try {
		var path = Helper.getUserLogsPath(user, network);
		fsextra.ensureDirSync(path);
	} catch (e) {
		log.error("Unabled to create logs directory", e);
		return;
	}

	var format = Helper.config.logs.format || "YYYY-MM-DD HH:mm:ss";
	var tz = Helper.config.logs.timezone || "UTC+00:00";

	var time = moment().utcOffset(tz).format(format);
	var line = "[" + time + "] ";

	var type = msg.type.trim();
	if (type === "message" || type === "highlight") {
		// Format:
		// [2014-01-01 00:00:00] <Arnold> Put that cookie down.. Now!!
		line += "<" + msg.from + "> " + msg.text;
	} else {
		// Format:
		// [2014-01-01 00:00:00] * Arnold quit
		line += "* " + msg.from + " " + msg.type;
		if (msg.text) {
			line += " " + msg.text;
		}
	}

	fs.appendFile(
		// Quick fix to escape pre-escape channel names that contain % using %%,
		// and / using %. **This does not escape all reserved words**
		path + "/" + chan.replace(/%/g, "%%").replace(/\//g, "%") + ".log",
		line + "\n",
		function(e) {
			if (e) {
				log.error("Failed to write user log", e);
			}
		}
	);
};
