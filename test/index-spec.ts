import { asRequestListener, Ok } from "funkster-http";
import * as http from "http";
import * as request from "supertest";
import { mapJson, parseJson, sendJson } from "../src";

describe("When sending a json response", () => {
  const jsonObj = { success: true };
  const pipe = sendJson(jsonObj);
  const server = http.createServer(asRequestListener(pipe));

  describe("and the client has sent */* for the Accept header", () =>
    it("should return the correct json response", () =>
      request(server)
        .get("/")
        .set("Accept", "*/*")
        .expect(200)
        .expect("Content-Type", "application/json; charset=utf-8")
        .expect(jsonObj)));

  describe("and the client has sent application/json for the Accept header", () =>
    it("should return the correct json response", () =>
      request(server)
        .get("/")
        .set("Accept", "application/json")
        .expect(200)
        .expect("Content-Type", "application/json; charset=utf-8")
        .expect(jsonObj)));

  describe("but the client has sent application/xml for the Accept header", () =>
    it("should return a 406", () =>
      request(server)
        .get("/")
        .set("Accept", "application/xml")
        .expect(406, "application/json")));
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

  describe("and the Content-Type is application/json but the content is not", () =>
    it("should return a 415", () =>
      request(server)
        .post("/")
        .set("Content-Type", "application/json")
        .send("<xml/>")
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

  describe("and the Content-Type is application/json but Accept is application/xml", () =>
    it("should return a 406", () =>
      request(server)
        .post("/")
        .set("Accept", "application/xml")
        .send(source)
        .expect(406, "application/json")));

  describe("and the Content-Type is application/json and Accept is application/json", () =>
    it("should parse the correct json", () =>
      request(server)
        .post("/")
        .set("Accept", "application/json")
        .send(source)
        .expect(200)
        .expect("Content-Type", "application/json; charset=utf-8")
        .expect(expected)));

  describe("and the Content-Type is application/json and Accept is */*", () =>
    it("should parse the correct json", () =>
      request(server)
        .post("/")
        .set("Accept", "*/*")
        .send(source)
        .expect(200)
        .expect("Content-Type", "application/json; charset=utf-8")
        .expect(expected)));
});
