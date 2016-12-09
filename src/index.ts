import { compose } from "funkster-core";
import { body, HttpContext, HttpPipe, NotAcceptable, Ok, setHeader, UnsupportedMediaType } from "funkster-http";
import { parseAcceptHeaders } from "funkster-http-headers-accept";
import { setContentType } from "funkster-http-headers-content";

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
    setContentType({ type: "application/json", parameters: { charset: "utf-8" } }),
    Ok(json));
}

export function sendJsonWith<T>(
  obj: T,
  handler: (json: string) => HttpPipe,
  toJson: (obj: T) => string): HttpPipe {
  const json = toJson(obj);
  return handler(json);
}

export function sendJson<T>(obj: T): HttpPipe {
  return sendJsonWith(obj, respondWithJson, JSON.stringify);
}

export function parseJsonWith<T>(
  handler: (deserializedBody: T) => HttpPipe,
  fromJson: (json: string) => T): HttpPipe {
  return parseAcceptHeaders(accepts => {
    if (!accepts.type("json")) {
      return NotAcceptable();
    }

    return body(body => {
      const json = body.toString();
      let desBody: T;
      try {
        desBody = fromJson(json);
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

export function parseJson<T>(handler: (deserializedBody: T) => HttpPipe) {
  return parseJsonWith(handler, JSON.parse);
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
