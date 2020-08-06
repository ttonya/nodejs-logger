const fs = require("fs");

let ent = " "; // entity
let entName = " "; // entity name
let eventType = " "; // event type

// Get entity type and entity name
let getEntityByUrl = (req, res, config) => {
	try {
		let entities = config.entities ? config.entities : {};
		ent = Object.keys(entities).filter(
			(entity) => req.url.indexOf(entity) !== -1 // Check if request url includes entity type
		)[0];

		let field = entities ? entities[ent] : "name"; // Default field is "name"

		let result = res;

		if (testJSON(res)) {
			result = JSON.parse(res);
		}

		let data = result.data || result.response || result.result || result; // Checking what basic structure of response we have

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

// Getting action type
let getAction = (req, status) => {
	let actionType = " ";

	const methods = {
		get: "read",
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

	// Checking if we can determine action type by http request method
	Object.keys(methods).map((action) => {
		if (req.method.toLowerCase() === action) {
			actionType = methods[action];
		}
	});

	// Checking if we can find action type in request url
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

// main function
let logger = async (req, res, config) => {
	let possibleIp =
		req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;
	let ipArray =
		possibleIp.indexOf(":") !== -1 ? possibleIp.split(":") : [possibleIp];
	let ip = ipArray[ipArray.length - 1];

	let date = new Date().toISOString();
	let logType = config.logType ? config.logType : "audit";

	let reqUser = req.user ? req.user.email : " ";
	let user = config.user || reqUser;

	let isSuccess;

	const defaultWrite = res.write;
	const defaultEnd = res.end;
	const chunks = [];

	// saving async data
	res.write = (...restArgs) => {
		chunks.push(Buffer.from(restArgs[0]));
		defaultWrite.apply(res, restArgs);
	};

	// on 'end' generating responseText from chunks and finishing all logic
	res.end = (...restArgs) => {
		if (restArgs[0]) {
			chunks.push(Buffer.from(restArgs[0]));
		}

		isSuccess = res.statusCode >= 200 && res.statusCode <= 299;

		let responseText = Buffer.concat(chunks).toString("utf8");
		defaultEnd.apply(res, restArgs);

		let field = config.field ? config.field : "name";

		getAction(req, res.statusCode);
		getEntityByUrl(req, responseText, config);

		let message = getMessage(responseText, res.statusCode, field, req.url);

		const log = `\n{"timestamp": "${date}", "log_type": "${logType}", "client_ip": "${ip}", "username": "${user}", "entity_type": "${ent}", "entity_name": "${entName}","event_type": "${eventType}", "event_message": "${message}", "event_success": "${isSuccess}"}`;

		let fileName = config.fileName ? config.fileName : "debug.log";

		if (config.writeToFile) {
			writeToFile(log, fileName);
		} else {
			writeToStdOut(log);
		}
	};
};

// Getting message from response
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
					// if we have a field from config in the response
					responseBody = result[field];
				} else if (typeof resultData != "string" && resultData.length) {
					// if we response data is array
					responseBody = "Получение списка";
				} else {
					responseBody = url; // if we don't have a message to show, we display request url
				}
			} else {
				// if we got an error
				responseBody =
					result.message || result.error || result.errorMessage || " ";
			}
		} catch (e) {
			if (typeof res != "string") {
				responseBody = "Ошибка";
			}
		}
	} else {
		if (typeof res != "string" || res.indexOf("!DOCTYPE") !== -1) {
			responseBody = "Ошибка";
		} else {
			responseBody = res;
		}
	}

	return responseBody;
};

// Testing if response is JSON
let testJSON = (data) => {
	try {
		JSON.parse(data);
		return true;
	} catch {
		return false;
	}
};

module.exports = logger;
