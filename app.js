if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

// importing modules
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
var app = require('express')();
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const localStrategy = require('passport-local');
const methodOverride = require('method-override');
const MongoStore = require('connect-mongo');


const dbUrl = process.env.DB_URL

// app configurations 
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(bodyParser());
// app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// requiring user , post , keywords , category model from user schema 
const User = require('./models/UserSchema')
const Post = require('./models/PostSchema')
const Keyword = require('./models/KeywordSchema')
const Category = require('./models/CategorySchema')

const DB_URL = process.env.DB_URL
const secret = process.env.SECRET

// mongo store for sessions 
const store = new MongoStore({
    mongoUrl : DB_URL,
    secret:secret ,
    touchAfter : 24*60*60
});

// creating express session
app.use(session({
    store,
    secret:secret,
    resave: false,
    saveUninitialized: false,
    cookie:{
        httpOnly: true,
        expires: Date.now() + 1000*24*60*60*7,
        maxAge:1000*60*60*24*7,
        // secure : true
    }
}));


// mongoose connection 
mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    socketTimeoutMS: 0,
}).
then(() => console.log('Connected')).
catch(err => console.log('Caught', err.stack));
mongoose.set("useCreateIndex", true);
mongoose.set('debug', true);

// initialize passport session
app.use(passport.initialize());
app.use(passport.session());

// passport serialization 
passport.use(User.createStrategy());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });
  

// flash
app.use(flash());
app.use((req,res,next) => {
    res.locals.success = req.flash('success')
    res.locals.error = req.flash('error');
    next();
})


// requiring routes -- post 
const postRoute = require('./routes/post')
app.use('/post', postRoute)

// require routes -- user routes 
const userRoute = require('./routes/userRoutes')
app.use('/user', userRoute)

// require routes -- category routes 
const categoryRoute = require('./routes/categoryRoutes')
app.use('/category', categoryRoute)

// basic routes 
const basicRoute = require('./routes/basicRoutes')
app.use('/', basicRoute)


// start page
app.get('/', function (req, res) {
        res.render('start');
})

// register page
app.get('/register', (req, res) => {
    res.render("register");
});

// logout session
app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
})

// check if username exists 
app.get('/check/:username',async (req, res)=>{
    username = req.params.username
    var user = await User.findOne({ username: username})
    if(user) {res.sendStatus(409);}
    else {res.sendStatus(200)}
})


// POST -- register user
app.post('/register', (req, res) => {
    User.register({
        username: req.body.username,
        name: req.body.name,
        email:req.body.email
    }, req.body.password, (err) => {
        if (err) {
            res.sendStatus(404)
        } else {
            passport.authenticate("local")(req, res, () => {
                res.sendStatus(200)
            })
        }
    })
});

// Login user authentication 
app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if (err) {
            res.sendStatus(404);
        } else {
            passport.authenticate("local")(req, res, () => {
                res.sendStatus(200);
            });
        }
    })
})

// for wrong routes
app.get('*', (req, res) => {
    res.send('The link seems to be broken');
})

// listen on port 
port = process.env.PORT || 3000
app.listen(port, function () {
    console.log(`Server started on port ${port}`);
})