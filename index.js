const fs = require("fs");

let ent = " ";
let entName = " ";
let eventType = " ";

let getEntityByUrl = (req, res, config) => {
	try {
		let entities = config.entities ? config.entities : {};
		ent = Object.keys(entities).filter(
			(entity) => req.url.indexOf(entity) !== -1
		)[0];

		let field = entities ? entities[ent] : "name";
		let result = res;
		if (testJSON(res)) {
			result = JSON.parse(res);
		}

		let data = result.data || result.response || result.result || result;

		entName =
			data[field] ||
			data[field] ||
			req.body["name"] ||
			req.body["email"] ||
			" ";
	} catch (e) {
		console.log(e);
	}

	if (!ent && eventType !== "auth") {
		ent = "";
		entName = "";
	} else if (eventType === "auth") {
		ent = "user";
	}
};

let getAction = (req, status) => {
	let actionType = " ";

	const methods = {
		get: "read",
		post: "create",
		delete: "delete",
		put: "edit",
	};

	let actions = {
		read: ["read", "get", "list"],
		create: ["create", "add"],
		delete: ["delete", "remove"],
		edit: ["edit", "update"],
		auth: ["login", "signin", "signup", "auth"],
	};

	Object.keys(methods).map((action) => {
		if (req.method.toLowerCase() === action) {
			actionType = action;
		}
	});

	Object.keys(actions).map((action) => {
		actions[action].map((type) => {
			if (req.url.indexOf(type) !== -1) {
				actionType = action;
			}
		});
	});

	if (status === 201) {
		actionType = "create";
	}

	eventType = actionType;
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

	let reqUser = req.user ? req.user.email : " ";
	let user = config.user || reqUser;

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
		defaultEnd.apply(res, restArgs);

		let field = config.field ? config.field : "name";
		getAction(req, res.statusCode);
		let message = getMessage(responseText, res.statusCode, field, req.url);

		getEntityByUrl(req, responseText, config);

		const log = `\n{"timestamp": "${date}", "log_type": "${logType}", "client_ip": "${ip}", "username": "${user}", "entity_type": "${ent}", "entity_name": "${entName}","event_type": "${eventType}", "event_message": "${message}", "event_success": "${isSuccess}"}`;

		if (config.writeToFile) {
			writeToFile(log, config.fileName);
		} else {
			writeToStdOut(log);
		}
	};
};

let getMessage = (res, statusCode, field, url) => {
	let responseBody = " ";

	if (testJSON(res)) {
		try {
			let result = JSON.parse(res);
			let resultData =
				result.data ||
				result.response ||
				result.results ||
				result.result ||
				result;

			if (statusCode >= 200 && statusCode <= 299) {
				if (result[field]) {
					responseBody = result[field];
				} else if (typeof resultData != "string" && resultData.length) {
					responseBody = "Получение списка";
				} else {
					responseBody = url;
				}
			} else {
				responseBody =
					result.message || result.error || result.errorMessage || " ";
			}
		} catch (e) {
			if (typeof res != "string") {
				responseBody = "Ошибка";
			}
		}
	} else {
		if (typeof res != "string") {
			responseBody = "Ошибка";
		} else {
			responseBody = res;
		}
	}

	return responseBody;
};

let testJSON = (data) => {
	try {
		JSON.parse(data);
		return true;
	} catch {
		return false;
	}
};

module.exports = logger;
