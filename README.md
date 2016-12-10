# funkster-http-json

[![npm](https://img.shields.io/npm/v/funkster-http-json.svg)](https://www.npmjs.com/package/funkster-http-json)
[![node](https://img.shields.io/node/v/funkster-http-json.svg)](http://nodejs.org/download/)
[![npm](https://img.shields.io/npm/dt/funkster-http-json.svg)](https://www.npmjs.com/package/funkster-http-json)
[![Known Vulnerabilities](https://snyk.io/test/github/bomret/funkster-http-json/badge.svg)](https://snyk.io/test/github/bomret/funkster-http-json)
[![Travis](https://travis-ci.org/Bomret/funkster-http-json.svg?branch=master)](https://travis-ci.org/Bomret/funkster-http-json)

Funkster is a compositional server library. This package provides types and combinators to parse json bodies from requests and respond with json to the client.

## Install
```bash
$ npm install funkster-http-json
```

## Parsing JSON from a request body
The `parseJson` and `parseJsonWith` combinators can be used to parse JSON data from a request.
In a valid request the `Content-Type` header contains `json` and a request body must be present, otherwise a `415 Unsupported Media Type` is returned.

### Example:
```javascript
import * as http from 'http';
import { parseJson } from 'funkster-http-json';
import { asRequestListener, Ok } from 'funkster-http';

interface User {
  name: string;
}

const greet = parseJson<User>(user => Ok('Hello ' + user.name));
const server = http.createServer(asRequestListener(greet));

// start the node HTTP server and send e.g. a POST with '{ "name": "John Connor" }'.
```

It is possible to use a custom JSON deserializer. The default is `JSON.parse`.

### Custom deserializer:
```javascript
import * as http from 'http';
import { parseJsonWith } from 'funkster-http-json';
import { asRequestListener, Ok } from 'funkster-http';

interface User {
  name: string;
}

function deserializeJson<User>(json: string): User {
  return /* your custom json deserialization here */
}

const greet = parseJsonWith<User>(user => Ok('Hello ' + user.name), deserializeJson);
const server = http.createServer(asRequestListener(greet));

// start the node HTTP server and send e.g. a POST with '{ "name": "John Connor" }'.
```

## Sending JSON to the client
The `sendJson` and `sendJsonWith` combinators can be used to send proper JSON responses to the client.

### Example:
```javascript
import * as http from 'http';
import { sendJson } from 'funkster-http-json';
import { asRequestListener } from 'funkster-http';

const greet = sendJson({ hello: "John Connor" });
const server = http.createServer(asRequestListener(greet));

// start the node HTTP server and send a simple GET.
```

The `Content-Type` of the response will be set to `application/json; charset=utf-8`.

It is possible to specify a custom response handler (default: `200 OK`) and JSON serializer (default: `JSON.stringify`).

### Custom response handler and serializer:
```javascript
import * as http from 'http';
import { compose } from "funkster-core";
import { sendJsonWith } from 'funkster-http-json';
import { setContentType } from "funkster-http-headers-content";
import { Accepted, asRequestListener, HttpPipe } from 'funkster-http';

function respondWithJson(json: string): HttpPipe {
  return compose(
    setContentType({ type: "application/json", parameters: { charset: "ascii" } }),
    Accepted(json));
}

function serialize(obj: any): string {
  return /* your custom json serialization here */
}

const greet = sendJsonWith({ hello: "John Connor" }, respondWithJson, serialize);
const server = http.createServer(asRequestListener(greet));

// start the node HTTP server and send a simple GET.
```

## Building a JSON api
The `mapJson` and `mapJsonWith` combinators allow to build a `HttpPipe` that consumes JSON requests, maps the data and produces JSON responses.

### Example:
```javascript
import * as http from 'http';
import { mapJson } from 'funkster-http-json';
import { asRequestListener } from 'funkster-http';

interface User {
  id: string;
}

interface UserInfo {
  name: string;
  age: number;
  city: string;
}

function lookup(user: User): Promise<UserInfo> {
  if(user.id !== 1234) {
    return Promise.resolve(null);
  }

  return Promise.resolve({
    name: 'John Connor',
    age: 42,
    city: 'Los Angeles'
  });
}

const getUserInfo = mapJson<User, UserInfo>(lookup);
const server = http.createServer(asRequestListener(getUserInfo));

// start the node HTTP server and send e.g. a POST with '{ "id": "1234" }'.
```

Internally `mapJson` uses `parseJson` and `sendJson` so the same rules apply.
It is possible to specify the parse and send functions via `mapJsonWith`.

### Custom response handling:
```javascript
import * as http from 'http';
import { mapJson, parseJson, sendJson } from 'funkster-http-json';
import { asRequestListener, NotFound } from 'funkster-http';

interface User {
  id: string;
}

interface UserInfo {
  name: string;
  age: number;
  city: string;
}

function lookup(user: User): Promise<UserInfo> {
  if(user.id !== 1234) {
    return Promise.resolve(null);
  }

  return Promise.resolve({
    name: 'John Connor',
    age: 42,
    city: 'Los Angeles'
  });
}

function sendUserInfo(userInfo?: UserInfo): HttpPipe {
  if(!userInfo) {
    return NotFound();
  }

  return sendJson(userInfo);
} 

const getUserInfo = mapJsonWith<User, UserInfo>(lookup, parseJson, sendUserInfo);
const server = http.createServer(asRequestListener(getUserInfo));

// start the node HTTP server and send e.g. a POST with '{ "id": "1234" }'.
```
