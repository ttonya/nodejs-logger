# The Butcher

NodeJS package for logging.

## Installation

Use the package manager [npm](https://www.npmjs.com/package/npm) to install the-butcher.

```bash
npm install the-butcher
```

## Usage

```javascript
var logger = require("@svs/auditlog");

// Config example
const loggerConfig = {
	// Object for logger config to get event description and a field value
	entities: {
		// key - name of an entity, value (string) - main field of an entity (to get entity_name). Default - {}
		'file': {field: "name"},
		'user': {field: "email"},
		'place': {field: "id", requests: ['getinfo', 'add', 'find']}, /* entity can have a list of requests,
		so in case logger can't get entity from request url, it will get it from this array */
	}, /* also can be just object 'entity', then you will force the logger to describe the entity in log
	   example - entity: { type: 'Conference', field: 'id'} */
	writeToFile: true, // (boolean) true - write to log file, false - write to stdout. Default - false
	user: currentUser, // (string) currentUser name. Example - "ae.sypchenko". Default - " " or request.user.email if its not undefined
	file: "./src/debug.log", // (string) file you want your logs to be added to. If omitted, system will create 'debug.log' file in your root directory.
	requestDescription: 'Something happend' || { 'deletetopic': text: "Delete topic", field: "id"  } /* (string) || (object) used to describe event
	 in event_message. Result example -  'Something happend' || 'Delete topic 345'. Default - undefined */
	 field: "name", /* (string) field to get entity name by. Default "name" */
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


// example for just one request

router.post('addcard', (req, res, next) => {
    const loggerConfig = {
		entity: { type: 'card', field: 'name'} // e.g let card = { name: 'New Card'}
		user: currentUser,
		requestDescription: 'User added a card';
};
	logger(req, res, loggerConfig);
})

```

## Log Format

```json
{
	"timestamp": "2020-07-30T06:57:35.629Z",
	"log_type": "audit",
	"client_ip": "1",
	"username": "ae.sypchenko",
	"entity_type": "card",
	"entity_name": "Some Card",
	"event_type": "create",
	"event_message": "Some card created",
	"event_success": "true"
}

{
	"timestamp": "2020-07-30T06:57:35.629Z",
	"log_type": "audit",
	"client_ip": "1",
	"username": "ae.sypchenko",
	"entity_type": "card",
	"entity_name": "New Card",
	"event_type": "create",
	"event_message": "User added a card - New Card",
	"event_success": "true"
}
```
