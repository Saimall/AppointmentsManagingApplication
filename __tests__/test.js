/* eslint-disable no-undef */
const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
// const { TIME } = require("sequelize");
let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}
const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Appointment Manager test suite ", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });

  test("Signup", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/Users").send({
      firstname: "Test",
      lastname: "User A",
      email: "reddy123@gmail.com",
      password: "123456789",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/list");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/list");
    expect(res.statusCode).toBe(302);
  });

  test("testing user login", async () => {
    res = await agent.get("/list");
    expect(res.statusCode).toBe(302);
    await login(agent, "sai@test.com", "123456789");
    res = await agent.get("/list");
    expect(res.statusCode).toBe(302);
  });

  test("testing functinality of Adding appointment", async () => {
    const agent = request.agent(server);
    await login(agent, "reddy123@gmail.com", "123456789");
    const res = await agent.get("/list");
    const csrfToken = extractCsrfToken(res);
    response = await agent.post("/lists").send({
      title: "buy milk",
      starttime: "4:45",
      endtime: "5:45",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302); //http status code
  });
});
