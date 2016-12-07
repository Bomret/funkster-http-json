import { compose } from "funkster-core";
import { body, HttpContext, HttpPipe, NotAcceptable, Ok, setHeader, UnsupportedMediaType } from "funkster-http";
import { parseAccepts } from "funkster-http-accepts";

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

  return parseAccepts(accepts => {
    if (!accepts.type("json")) {
      return NotAcceptable();
    }

    return body(body => {
      const json = body.toString();
      let desBody: T;
      try {
        desBody = deserialize(json);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return UnsupportedMediaType(error.message);
        }
        throw error;
      }

      return handler(desBody);
    });
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
