/////////// ///////////////Require all the packages//////////////////

require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const https = require('node:https')
const ejs = require('ejs')
const mongoose = require('mongoose')
const _ = require('lodash')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const encrypt = require('mongoose-encryption')
const md5 = require('md5')
const bcrypt = require('bcrypt')
const saltRounds = 10
const GoogleStrategy = require('passport-google-oauth20').Strategy
const TwitterStrategy = require('passport-twitter')
const findOrCreate = require('mongoose-findorcreate')
const dateStr = require(__dirname + '/date.js')

/////////////////////////////Initializing all the applications/////////////

const app = express()
app.use(
  bodyParser.urlencoded({
    extended: true
  })
)
const PORT = process.env.PORT || 8080;
app.set('view engine', 'ejs')
app.use(express.static('public'))

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
  })
)
app.use(passport.initialize())
app.use(passport.session())
//////////////////////////////Connecting with mongoDB server//////////////////////////////////
const db = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@whisper.bpxmguu.mongodb.net/whisperDB`;
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(db);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

///////////////////////// Schema and Model for Users///////////////////////

const usersSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  twitterId: String
})


////////////////////////////Schema and Model for Posts////////////////////////////

const postsSchema = new mongoose.Schema({
  desc: {
    type: String,
    required: [true, 'No description.']
  },
  likeCount: Number,
  dateAdded: String,
  likes: [],
})
const Post = new mongoose.model('Post', postsSchema)


usersSchema.plugin(passportLocalMongoose)
usersSchema.plugin(findOrCreate)

const User = new mongoose.model('User', usersSchema)

//////////////////////////////Create and Destroying sessions///////////////////////////////////

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username })
  })
})

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user)
  })
})

///////////////////////////////////Google OAuthentication///////////////////////////

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'https://whisperapp.up.railway.app/auth/google/secrets'
      // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user)
      })
    }
  )
)

//////////////////////////////////Twitter OAuthentication//////////////////////
passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_API_KEY,
      consumerSecret: process.env.TWITTER_API_KEY_SECRET,
      callbackURL: 'https://whisperapp.up.railway.app/auth/twitter/secrets'
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ twitterId: profile.id }, function (err, user) {
        return cb(err, user)
      })
    }
  )
)

//////////////////Managing https GET requests////////////////////

app.get('/', function (req, res) {
  res.render('home')
})

///Google URLs
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }))

app.get(
  '/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect secret.
    res.redirect('/secrets')
  }
)

//Twitter URLs
app.get('/auth/twitter', passport.authenticate('twitter'))

app.get(
  '/auth/twitter/secrets',
  passport.authenticate('twitter', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets')
  }
)

app.get('/login', function (req, res) {
  console.log(req.user)
  res.render('login')
})

app.get('/register', function (req, res) {
  res.render('register')
})

app.get('/submit', function (req, res) {
  if (req.isAuthenticated()) {
    res.render('submit', function (err) {
      if (err) {
        console.log(err)
      } else {
        res.render('submit')
      }
    })
  } else {
    res.redirect('/login')
  }
})

app.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }
    res.redirect('/')
  })
})

app.get('/secrets', function (req, res) {
  if (req.isAuthenticated()) {
    Post.find({}, function(err, foundPosts){
      if(err){
        console.log(err);
      }else {
        if(foundPosts.length === 0){
            res.render('error', {
            errorMsg: 'Seems like not posts yet.'
          })
        }else {
            res.render('secrets',{
            secret: foundPosts,
            currUsr: req.user.id
          })
        }
      }
    });
  }else {
    res.redirect('/login');
  }
});

/////////////////////////////////HTTP POST REQUESTS//////////////////////

app.post('/login', function (req, res) {
  User.findOne({ username: req.body.username }, function (err, foundUser) {
    if (err) {
      console.log(err)
    } else {
      if (foundUser) {
        const user = {
          id: foundUser.id,
          username: req.body.username,
          password: req.body.password
        }
        req.login(user, function (err) {
          if (err) {
            console.log(err)
          } else {
            passport.authenticate('local')(req, res, function () {
              res.redirect('/secrets')
            })
          }
        })
      } else {
        res.send('<h1>No user found.</h1>');
      }
    }
  })
})

app.post('/register', function (req, res) {
  User.register(
    { username: req.body.username, id: this._id },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err)
        res.redirect('/register')
      } else {
        req.login(user, function (err) {
          if (err) {
            console.log(err)
          } else {
            passport.authenticate('local')(req, res, function () {
              res.redirect('/secrets')
            })
          }
        })
      }
    }
  )
})

/////////////////// bcrytp hashing method///////////////////////

// bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const userName = req.body.username;
//     const newUser = new User({
//         username: userName,
//         password: hash
//     })
//     newUser.save();
//     Post.find({}, function(err, foundPosts){
//         if(err){
//             res.send(err);
//         }else {
//             res.render('secrets', {
//                 foundPosts: foundPosts
//             })
//         }
//     })
// });

app.post('/submit', function (req, res) {
  const secretDes = req.body.secret
  const newPost = new Post({
    desc: secretDes,
    dateAdded: dateStr.getDateStr(),
    likeCount: 0
  })
  newPost.save();
  res.redirect('/secrets');
  
});

app.post('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err)
    }
    res.redirect('/')
  })
})

//////////////////////////////// Add like/remove like//////////////////////////

app.post('/addRemoveLike', function (req, res) {
    if(req.isAuthenticated()){
    const secretId = req.body.secretId
    const reqId = req.user.id
      Post.updateOne(
        {
          "_id": secretId, 
        "likes": { $ne: reqId }
        },
        {
          $inc: { "likeCount": 1 },
          $push: { "likes": reqId}
      }, function(err, result){
        if(err){
          console.log(err)
        }else {
          if(result.modifiedCount === 1){
            res.redirect('/secrets');
          }else{
            Post.updateOne(
              {
                "_id": secretId,
                "likes": reqId
              },
              {
                $inc: {"likeCount": -1},
                $pull: {"likes": reqId}
              },function(err, reslt){
                if(err){
                  console.log(err);
                }else {
                  if(reslt.modifiedCount === 1){
                    res.redirect('/secrets');
                  }
                  else{
                    res.redirect('/login');
                  }
                }
              }
            )
          }
        }
      }
      )
    }else {
        res.redirect('/login');
    }
})

//////////////////////////////////Listening requests on post 3000//////////////////////
connectDB().then(() => {
  app.listen(PORT, () => {
      console.log("listening for requests");
  })
})