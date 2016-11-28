// tslint:disable-next-line:no-var-requires
require("es6-promise/auto");

import { compose } from "funkster-core";
import { HttpContext, HttpPipe, Ok, body, setHeader } from "funkster-http";

export type JsonParser = <T>(
  handler: (deserializedBody: T) => HttpPipe,
  deserialize?: (json: string) => T
) => HttpPipe;

export type JsonSender = <T>(
  obj: T,
  handler?: (json: string) => HttpPipe,
  serialize?: (obj: T) => string
) => HttpPipe;

export type JsonTransform<Source, Target> = (source: Source) => Promise<Target>;

function respondWithJson(json: string): HttpPipe {
  return compose(
    setHeader("Content-Type", "application/json; charset=utf-8"),
    Ok(json));
}

export function sendJson<T>(
  obj: T,
  respond: (json: string) => HttpPipe = respondWithJson,
  serialize: (obj: T) => string = JSON.stringify) {

  const json = serialize(obj);
  return respond(json);
}

export function parseJson<T>(
  handler: (deserializedBody: T) => HttpPipe,
  deserialize: (json: string) => T = JSON.parse) {

  return body(body => {
    const json = body.toString();
    const deserializedBody = deserialize(json);
    return handler(deserializedBody);
  });
}

export function mapJsonWith<Source, Target>(
  map: JsonTransform<Source, Target>,
  jsonParse: JsonParser,
  jsonSend: JsonSender) {
  return jsonParse<Source>(json =>
    async (ctx: HttpContext) => {
      const target = await map(json);
      return jsonSend(target)(ctx);
    });
}

export function mapJson<Source, Target>(handler: JsonTransform<Source, Target>) {
  return mapJsonWith(handler, parseJson, sendJson);
}
