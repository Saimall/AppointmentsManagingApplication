const express = require("express"); //importing express
var csrf = require("tiny-csrf");
const app = express(); // creating new application
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
app.use(bodyParser.json());
const path = require("path");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");

const saltRounds = 10;
app.set("views", path.join(__dirname, "views"));
app.use(flash());
const { appointments, users } = require("./models");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
//SET EJS AS VIEW ENGINE
app.use(cookieParser("shh! some secrete string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.set("view engine", "ejs");
app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hours
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      users
        .findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid User!!" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  users
    .findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async (request, response) => {
  if (request.user) {
    return response.redirect("/list");
  } else {
    response.render("index", {
      title: "Todo Application",
      csrfToken: request.csrfToken(),
    });
  }
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});
app.post("/Users", async (request, response) => {
  if (request.body.email.length == 0) {
    request.flash("error", "email can not be empty!!");
    return response.redirect("/signup");
  }
  if (request.body.firstname.length == 0) {
    request.flash("error", "First name can not be empty");
    return response.redirect("/signup");
  }
  if (request.body.password.length == 0) {
    request.flash("error", "Password can not be empty");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);

  try {
    const user = await users.create({
      firstname: request.body.firstname,
      lastname: request.body.lastname,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/list");
      } else {
        request.flash("success", "Sign up successful");
        response.redirect("/list");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "User Already Exist with this mail!!");
    return response.redirect("/signup");
  }
});

app.get("/login", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/list");
  }
);
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.get(
  "/list",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const loggedInUser = request.user.id;
      const allevents = await appointments.getevents(loggedInUser);
      if (request.accepts("html")) {
        response.render("list", {
          title: "Appointment Managing Application",
          allevents,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({ allevents });
      }
    } catch (err) {
      console.log(err);
    }
  }
);

app.post(
  "/lists",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.starttime.length == 0) {
      request.flash("error", "Time can not be empty!!");
      return response.redirect("/list");
    }
    if (request.body.title.length == 0) {
      request.flash("error", "title can not be empty");
      return response.redirect("/list");
    }

    const event = await appointments.findone(
      request.body.starttime,
      request.body.endtime
    );
    console.log(event);
    if (event) {
      request.flash(
        "error",
        "Ooopss!! seems like the selected time slot is already booked!!"
      );
      return response.redirect("/list");
    }
    console.log("creating new event name", request.body);
    try {
      // eslint-disable-next-line no-unused-vars
      await appointments.addevent({
        title: request.body.title,
        start: request.body.starttime,
        end: request.body.endtime,
        userId: request.user.id,
      });
      return response.redirect("/list");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/lists/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("delete a todo with ID:", request.params.id);
    try {
      await appointments.remove(request.params.id, request.user.id);
      return response.json({ success: true });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/lists/:id/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const eventId = request.params.id;
    const event = await appointments.findevent(userId, eventId);
    const loggedInUser = request.user.id;
    const allevents = await appointments.getevents(loggedInUser);
    try {
      if (request.accepts("html")) {
        response.render("modifyevent", {
          eventname: event.title,
          id: event.id,
          csrf: request.csrfToken(),
        });
      } else {
        response.json({ allevents });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/lists/:id/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await appointments.modifyevent(request.body.eventname, request.params.id);
      request.flash("success", "Updated sucessfully!!");
      return response.redirect("/list");
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = app;
