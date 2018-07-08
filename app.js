var express = require("express"),
    app         = express(),
    methodOverride = require("method-override"),
    expressSanitizer = require("express-sanitizer"),
    flash      = require("connect-flash"),
    bodyParser  = require("body-parser"),
    mongoose    = require ("mongoose"),
    passport   = require("passport"),
    LocalStrategy =require("passport-local"),
    Blog = require("./models/blog"),
    User       = require("./models/user")
require('dotenv').config()

mongoose.connect("mongodb://localhost/blog_app")

app.set("view engine", "ejs")
app.use(express.static("public"))  //for static files like css
app.use(bodyParser.urlencoded({extended: true})) // for posting nested objects
app.use(expressSanitizer());
app.use(methodOverride("_method"))
app.use(flash())

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: process.env.SECRET_KEY,
    resave:false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())


//middleware config
app.use(function(req,res,next){
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  next();
})



app.get("/", function(req, res){
    res.redirect("/blogs")
})

app.get("/blogs", function(req, res){
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // now searches in both desc and title
        Blog.find().or([{"title":regex}, {"desc":regex}]).exec(function(err, blogs){
            if(err){
                console.log("ERROR!")
            } else {
                if(blogs.length < 1) {
                    req.flash('error', 'Sorry, no blog entries match your query. Please try again');
                    return res.redirect('/blogs');
                }
                res.render("index", {blogs: blogs})
            }
        }) 
    } else {
        Blog.find({}, function(err, blogs){
            if(err){
                console.log("ERROR!")
            } else {
                console.log(blogs.slice(0,3))
                res.render("index", {blogs: blogs})
            }
        })
    }
})

//NEW ROUTE
app.get("/blogs/new", isAdmin, function(req, res) {
    res.render("new")
})

//CREATE ROUTE
app.post("/blogs", isAdmin, function(req, res){
    // req.body.blog.body=req.sanitize(req.body.blog.body)
    Blog.create(req.body.blog, function(err, newBlog){
        if(err){
            res.render("new")
        } else{
            res.redirect("/blogs")
        }
})
})
// SHOW ROUTE
app.get("/blogs/:id", function(req, res) {
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err || !foundBlog){
            res.redirect("/blogs")
        } else {
        Blog.find({}, function(err, blogs){
            if(err){
                console.log("ERROR!")
            } else {
                console.log(blogs.slice(0,3))
                res.render("show", {blogs: blogs, blog:foundBlog})
            }
        })
        }
    })
})
//EDIT ROUTE

app.get("/blogs/:id/edit", isAdmin, function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err || !foundBlog){
            res.redirect("/blogs")
        } else {
            res.render("edit", {blog:foundBlog})
        }
    })
})
//UPDATE ROUTE
app.put("/blogs/:id", isAdmin, function(req, res){
        //req.body.blog.body=req.sanitize(req.body.blog.body)
        Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
        if(err){
            res.redirect("/blogs")
        } else {
            res.redirect("/blogs/" + req.params.id)
        }
    })
})

// DELETE ROUTE
app.delete("/blogs/:id",isAdmin, function(req, res){
    Blog.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/blogs")
        } else {
            res.redirect("/blogs")
        }
    })
})


//About route
app.get("/about", function(req, res){
    res.render("about")
})


// AUTH ROUTES ===================================
//show register form
app.get("/register", function(req, res) {
    res.render("register")
})
//hadnel sign up logic 
app.post("/register", function(req, res) {
    var newUser = new User({username:req.body.username})
    if (req.body.admin === process.env.ADMIN) {
        newUser.isAdmin = true
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err)
            return res.render("register")
        }
        passport.authenticate("local")(req, res, function(){
            res.redirect("/")
        })
    })
})

//login form
app.get("/login", function(req, res) {
    res.render("login")
})

app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/",
        failureRedirect: "/login"
    }), function(req, res) {
    
})

//logout
app.get("/logout", function(req, res) {
    req.logout()
    res.redirect("/")
})


function isAdmin(req, res, next){
    if(req.isAuthenticated() && req.user.isAdmin){
        return next()
    }
    res.redirect("/")
    console.log("you are not admin")
}



function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server is running")
})