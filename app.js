/////////// ///////Require all the packages//////////////////
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const https = require('node:https');
const ejs = require('ejs');
const mongoose = require('mongoose');
const data = require(__dirname+'/secrets.js');
const _ = require('lodash');
const encrypt = require('mongoose-encryption');



///////////////// Initializing all the applications/////////////
const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}))
app.set('view engine', 'ejs');
app.use(express.static('public'));


// Connecting with mongoDB server
mongoose.connect(process.env.API_KEY);


//////////////// Schema and Model for Posts////////////////////////////
const postsSchema = new mongoose.Schema({
    desc: {
        type: String,
        required: [true, 'No description.']
    }
})

const Post = new mongoose.model('Post', postsSchema);

///////////////////////// Schema and Model for Users///////////////////////
const usersSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'No username provided.']
    },
    password: {
        type : String,
        required: [true, 'No password provided.']
    }
})


usersSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']})


const User = new mongoose.model('User', usersSchema);

//////////////////Managing https requests////////////////////

app.get('/', function(req, res){
    res.render('home');
})


app.get('/login', function(req, res){
    res.render('login');
})

app.get('/register', function(req, res){
    res.render('register');
})

app.get('/submit', function(req, res){
    res.render('submit');
})

app.get('/logout', function(req, res){
    res.redirect('/');
})
////////////// Post requests/////////////
// function getAllSecrets(){
//     return Post.find({}, function(err, foundPosts){
//         if(err){
//             reject(err);
//         }else {
//             console.log(typeof(foundPosts));
//             resolve(foundPosts);
//         }
//     })
// }


app.post('/login', function(req, res){
    const userName = req.body.username;
    const passWord = req.body.password;
    User.findOne({username: userName}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                if(foundUser.password === passWord){
                    Post.find({}, function(err, foundPosts){
                        if(err){
                            console.log(err);
                        }else {
                            res.render('secrets', {
                                foundPosts: foundPosts
                            })
                        }
                    })
                }
                else {
                    res.send('<h1>Wrong Password.</h1>');
                }
            }
            else{
                res.send('<h1>No user found.</h1>')
            }
        }
    })
})


app.post('/register', function(req,res){
    const userName = req.body.username;
    const passWord = req.body.password;
    const newUser = new User({
        username: userName,
        password: passWord
    })
    newUser.save();
    Post.find({}, function(err, foundPosts){
        if(err){
            res.send(err);
        }else {
            res.render('secrets', {
                foundPosts: foundPosts
            })
        }
    })
})

app.post('/submit', function(req, res){
    const secretDes = req.body.secret;
    const newPost = new Post({
        desc: secretDes
    })
    newPost.save();
    const allPosts = getAllSecrets();
    res.render('')
})

app.post('/logout', function(req, res){
    res.redirect('/');
})









// app.get('/:customRoute', function(req, res){
//     const customRoute = _.lowerCase(req.params.customRoute);
//     res.render(customRoute, function(err, html){
//         if(err){
//             res.render('error');
//         }else {
//             res.render(customRoute);
//         }
//     });
// })







// Listening requests on post 3000
app.listen(process.env.PORT || 3000, function(){
    console.log('Server started on port 3000');
})