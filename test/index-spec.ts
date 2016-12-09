import { asRequestListener, Ok } from "funkster-http";
import * as http from "http";
import * as request from "supertest";
import { mapJson, parseJson, sendJson } from "../src";

describe("When sending a json response", () => {
  const jsonObj = { success: true };
  const pipe = sendJson(jsonObj);
  const server = http.createServer(asRequestListener(pipe));

  it("should return the correct json response", () =>
    request(server)
      .get("/")
      .expect(200)
      .expect("Content-Type", "application/json; charset=utf-8")
      .expect(jsonObj));
});

describe("When parsing a json body", () => {
  const jsonObj = { success: true };
  const pipe = parseJson(body => Ok(JSON.stringify(body)));
  const server = http.createServer(asRequestListener(pipe));

  describe("but the Content-Type is not json", () =>
    it("should return a 415", () =>
      request(server)
        .post("/")
        .send("not json")
        .expect(415)));

  describe("and the Content-Type is application/json", () =>
    it("should parse the correct json", () =>
      request(server)
        .post("/")
        .send(jsonObj)
        .expect(200)
        .expect(JSON.stringify(jsonObj))));
});

describe("When mapping a json request to a json response", () => {
  const source = { ack: false };
  const expected = { ack: true };
  const pipe = mapJson<any, any>(body => {
    body.ack = true;
    return Promise.resolve(body);
  });
  const server = http.createServer(asRequestListener(pipe));

  describe("but the Content-Type is not json", () =>
    it("should return a 415", () =>
      request(server)
        .post("/")
        .send("not json")
        .expect(415)));

  describe("and the Content-Type is application/json", () =>
    it("should parse the correct json", () =>
      request(server)
        .post("/")
        .send(source)
        .expect(200)
        .expect("Content-Type", "application/json; charset=utf-8")
        .expect(expected)));
});
