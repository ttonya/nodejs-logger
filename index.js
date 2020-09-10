const fs = require("fs");

let ent = " "; // entity
let entName = " "; // entity name
let eventType = " "; // event type

// Get entity type and entity name
let getEntityByUrl = (req, res, config) => {
	try {
		let entities = config.entities ? config.entities : {};

		for (const entity in entities) {
			if (
				req.url.indexOf(entity) !== -1 ||
				(entities[entity].requests &&
					entities[entity].requests.indexOf(request.url) !== -1)
			) {
				// Check if request url includes entity type
				ent = entity;
				break;
			}
		}

		let field = entities && entities[ent] ? entities[ent].field : "name"; // Default field is "name"
		let result;

		try {
			result = JSON.parse(res);
		} catch (e) {
			result = res;
		}

		let data = result.data || result.response || result.result || result; // Checking what basic structure of response we have

		entName =
			data[field] ||
			req.body[field] ||
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
	for (const method in methods) {
		if (req.method.toLowerCase() === method) {
			actionType = methods[method];
			break;
		}
	}

	// Checking if we can find action type in request url
	for (const action in actions) {
		let types = actions[action];
		for (let i = 0; i < types.length; i++) {
			if (req.url.indexOf(types[i]) !== -1) {
				actionType = action;
				break;
			}
		}
	}

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

// main function
let logger = async (req, res, config) => {
	let possibleIp =
		req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;
	let ipArray =
		possibleIp.indexOf(":") !== -1 ? possibleIp.split(":") : [possibleIp];
	let ip = ipArray[ipArray.length - 1];

	let date = new Date().toISOString();
	let logType = "audit";

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

		if (config.entity) {
			(ent = config.entity.type), (entName = req.body[config.entity.field]);
		} else {
			getEntityByUrl(req, responseText, config);
		}

		let message = getMessage(
			responseText,
			res.statusCode,
			field,
			req,
			config.requestDescription
		);

		const log = `\n{"timestamp": "${date}", "log_type": "${logType}", "client_ip": "${ip}", "username": "${user}", "entity_type": "${ent}", "entity_name": "${entName}","event_type": "${eventType}", "event_message": "${message}", "event_success": "${isSuccess}"}`;

		let fileName = config.fileName ? config.fileName : "debug.log";

		if (config.writeToFile) {
			writeToFile(log, fileName);
		} else {
			console.log(log);
		}
	};
};

// Getting message from response
let getMessage = (res, statusCode, field, req, requestDescription) => {
	let { url } = req;
	let responseBody = " ";

	if (requestDescription) {
		if (typeof requestDescription == "string") {
			responseBody = requestDescription;
		} else {
			let request = url.replace("/", "");
			let description = requestDescription[request];
			let name = req.body[description.field] || res[description.field]; // name or id of something we've changed
			responseBody = `${description.text} - ${name}`;
		}
	} else {
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
				} else {
					responseBody = url; // if we don't have a message to show, we display request url
				}
			} else {
				// if we got an error
				responseBody =
					result.message || result.error || result.errorMessage || " ";
			}
		} catch (e) {
			if (typeof res != "string" || res.indexOf("!DOCTYPE") !== -1) {
				responseBody = "Error";
			} else {
				responseBody = res;
			}
		}
	}

	return responseBody;
};

module.exports = logger;
