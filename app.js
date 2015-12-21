var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var compression = require("compression");
var mongoose = require("mongoose");
var passport = require("passport");
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var User = require('./models/user.js');
var Note = require('./models/note.js');

mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGODB_URI || 'localhost');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express['static'](__dirname + '/static'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
app.use(cookieParser());
app.use(session({ secret: process.env.GOOGLE_SESSION || 'fj23f90jfoijfl2mfp293i019eoijdoiqwj129' }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/plainmap', function (req, res) {
  var myUser;
  if (req.user) {
    myUser = req.user;
  } else {
    myUser = { id: 'test' };
  }
  Note.find({ map: 'first', user: myUser.id }, function (err, notes) {
    if (err) {
      throw err;
    }
    res.render('map', {
      user: myUser,
      notes: notes
    });
  });
});

app.get('/mapper', function (req, res) {
  console.log(req.user);
  if (!req.user) {
    return res.redirect('/plainmap');
  }
  Note.find({ map: 'first', user: req.user.id }, function (err, notes) {
    if (err) {
      throw err;
    }
    res.render('map', {
      user: req.user || null,
      notes: notes
    });
  });
});

app.post('/savenote', function (req, res) {
  Note.findOne({ map: req.body.layer, user: req.body.user, parcel: req.body.id }, function (err, n) {
    if (err) {
      return res.json(err);
    }
    if (!n) {
      n = new Note();
      n.user = req.body.user;
      n.map = req.body.layer;
      n.parcel = req.body.id;
    }
    n.note = req.body.note;
    n.save(function (err) {
      res.json(err || n._id);
    });
  });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email'] }));

app.get('/map',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/mapper');
  });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CONSUMER_KEY,
    clientSecret: process.env.GOOGLE_CONSUMER_SECRET,
    callbackURL: "http://chennai-data-portal.herokuapp.com/map"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findOne({ id: id }, function(err, user) {
    if (!user) {
      var u = new User();
      u.name = 'Test';
      u.language = 'en';
      u.maps = [];
      u.notes = {};
      u.save(function (err) {
        done(err, u);
      });
    } else {
      done(err, user);
    }
  });
});

var server = app.listen(process.env.PORT || 8080, function() {
  var port = server.address().port;
  console.log('Serving on port ' + port);
});

module.exports = app;
