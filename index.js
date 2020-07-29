const loggerConfig = require("./logger.config");
const fs = require("fs");

let ent = " ";
let entName = " ";

let getEntityByUrl = (req, res, config) => {
	ent = Object.keys(config.entities).filter(
		(entity) => req.url.indexOf(entity) !== -1
	)[0];

	filedName = "name" | "email" | "login";

	let field = config.entities ? config.entities[ent] : filedName;
	try {
		let result = JSON.parse(res);
		let data = result.data || result.response || result.result || result;

		entName = data[field] || data[field] || req.body[field];
	} catch (e) {
		console.log(e);
	}

	if (!ent) {
		ent = "";
		entName = "";
	}
};

let getAction = (req) => {
	const { actions } = loggerConfig;
	return Object.keys(actions).map((action) => {
		if (req.method.toLowerCase() === action) {
			return actions[action];
		} else if (req.url.indexOf(action) !== -1) {
			return actions[action];
		} else {
			return "";
		}
	})[0];
};

let writeToFile = (log, fileName) => {
	let file = fileName ? fileName : "debug.log";
	fs.appendFile(file, log, (err) => {
		console.error(err);
	});
};

let writeToStdOut = (log) => {
	console.log(log);
};

let logger = async (req, res, config) => {
	let possibleIp =
		req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;
	let ip =
		possibleIp.indexOf(":") !== -1
			? possibleIp.split(":")[possibleIp.length - 1]
			: possibleIp;
	let date = new Date().toISOString();
	let logType = "audit";
	// Check req.user
	// change user to user.name
	let user = config.user || req.user || {};
	let userName = user.email || user.login || " ";

	let isSuccess = res.statusCode === 200;

	const defaultWrite = res.write;
	const defaultEnd = res.end;
	const chunks = [];

	res.write = (...restArgs) => {
		chunks.push(Buffer.from(restArgs[0]));
		defaultWrite.apply(res, restArgs);
	};

	res.end = (...restArgs) => {
		if (restArgs[0]) {
			chunks.push(Buffer.from(restArgs[0]));
		}
		let responseText = Buffer.concat(chunks).toString("utf8");

		let field = config.field ? config.field : "name";
		let message = getMessage(responseText, res.statusCode, field);
		defaultEnd.apply(res, restArgs);

		getEntityByUrl(req, responseText, config);
		let eventType = getAction(req);
		const log = `\n{"timestamp": "${date}", "log_type": "${logType}", "client_ip": "${ip}", "username": "${userName}", "entity_type": "${ent}", "entity_name": "${entName}","event_type": "${eventType}", "event_message": "${message}", "event_success": "${isSuccess}"}`;

		if (config.writeToFile) {
			writeToFile(log, config.fileName);
		} else {
			writeToStdOut(log);
		}
	};
};

let getMessage = (res, statusCode, field) => {
	let responseBody;
	try {
		let result = JSON.parse(res);
		let resultData =
			result.data || result.response || result.results || result.result || " ";

		if (statusCode === 200) {
			if (result[field]) {
				responseBody = result[field];
			} else if (typeof resultData != "string" && resultData.length) {
				responseBody = "Получение списка";
			} else {
				responseBody = " ";
			}
		} else {
			responseBody =
				result.message || result.error || result.errorMessage || " ";
		}
	} catch (e) {
		if (typeof res != "string") {
			responseBody = "Ошибка";
		} else {
			responseBody = res;
		}
	}

	return responseBody;
};

module.exports = logger;
