# The Butcher

NodeJS package for logging.

## Installation

Use the package manager [npm](https://www.npmjs.com/package/npm) to install the-butcher.

```bash
npm install the-butcher
```

## Usage

```javascript
var logger = require("the-butcher");

// Config example
const loggerConfig = {
	entities: {
		// key - name of an entity, value (string) - main field of an entity (to get entity_name). Default - {}
		trip: "name",
		user: "email",
		place: "name",
	},
	writeToFile: true, // (boolean) true - write to log file, false - write to stdout. Default - false
	field: "name", // (string) field to get from a response object to save as 'event_description'. Default "name | email"
	user: currentUser, // (string) currentUser name. Example - "ttonya". Default - " " or request.user.email if its not undefined
	file: "./src/debug.log", // (string) file you want your logs to be added to. If omitted, system will create 'debug.log' file in your root directory.
};

// add to Express.js
app.all("*", (req, res, next) => {
	logger(req, res, loggerConfig);
	next();
});

// add to NestJS
app.use("*", (req, res, next) => {
	logger(req, res, loggerConfig);
	next();
});
```

## Log Format

```json
{
	"timestamp": "2020-07-30T06:57:35.629Z",
	"log_type": "audit",
	"client_ip": "1",
	"username": "ttonya",
	"entity_type": "city",
	"entity_name": "New York",
	"event_type": "read",
	"event_message": "Read some interesting things about NYC",
	"event_success": "true"
}
```
