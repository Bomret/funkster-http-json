import { compose } from "funkster-core";
import { body, HttpContext, HttpPipe, NotAcceptable, Ok, UnsupportedMediaType } from "funkster-http";
import { parseAcceptHeaders } from "funkster-http-headers-accept";
import { parseContentHeaders, setContentType } from "funkster-http-headers-content";

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
    setContentType({ parameters: { charset: "utf-8" }, type: "application/json" }),
    Ok(json));
}

export function sendJsonWith<T>(
  obj: T,
  handler: (json: string) => HttpPipe,
  toJson: (obj: T) => string): HttpPipe {
  return parseAcceptHeaders(headers => {
    if (headers.types().length > 0 && !headers.type("json")) {
      return NotAcceptable("application/json");
    }

    const json = toJson(obj);
    return handler(json);
  });
}

export function sendJson<T>(obj: T): HttpPipe {
  return sendJsonWith(obj, respondWithJson, JSON.stringify);
}

export function parseJsonWith<T>(
  handler: (deserializedBody: T) => HttpPipe,
  fromJson: (json: string) => T): HttpPipe {

  return parseContentHeaders(contents => {
    if (!contents.contentType || !contents.contentType.type.match(/json/)) {
      return UnsupportedMediaType();
    }

    return body(body => {
      const json = body.toString();

      try {
        const desBody = fromJson(json);

        return handler(desBody);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return UnsupportedMediaType(error.message);
        }
        throw error;
      }
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
