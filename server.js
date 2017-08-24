//------------------------   Dependencies   ------------------------
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require('express-handlebars');
var request = require("request");
var cheerio = require("cheerio");



//------------------------   Setup Express  ------------------------
var app = express();


//------------------------   Setup Mongoose   ------------------------
mongoose.Promise = Promise;


// -----------------   Setup Handlbars   -----------------
app.set('views', './app/views');
app.engine('hbs', exphbs({
  extname: '.hbs',
  defaultLayout  : 'main',
  layoutsDir     : './app/views/layouts/',
  partialsDir    : './app/views/partials/'
  }));
app.set('view engine', '.hbs');


// -----------------   Setup BodyParser   -----------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));


// -----------------   Setup Morgan (logger middleware for Express)   -----------------
app.use(require('morgan')('dev'));


//------------------------   Require Models   ------------------------
var Note = require("./app/models/Note.js");
var Article = require("./app/models/Article.js");


// ----------------   Setup public folder   ----------------
app.use(express.static('app/public'));


// // -----------------   Setup Routes   -----------------
// var authRoute = require('./app/routes/auth.js')(app, passport);


// -----------------   Index route   -----------------
app.get('/', function(req, res) {
  res.render('index');
});


//------------------------   Database configuration with mongoose   ------------------------
mongoose.connect("mongodb://localhost/scraper");
var db = mongoose.connection;


db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});


db.once("open", function() {
  console.log("Mongoose connection successful.");
});




//------------------------   Scrape Wall Street Journal   ------------------------
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  console.log("you got here");
  request("https://news.ycombinator.com/", function(error, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    // Now, we grab every h2 within an article tag, and do the following:
    $(".title").each(function(i, element) {

      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      // Using our Article model, create a new entry
      // This effectively passes the result object to the entry (and the title and link)
      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(doc);
        }
      });

    });
  });
  // Tell the browser that we finished scraping the text
  // res.send("Scrape Complete");
  res.render('scrape');
});


//------------------------   Present all articles   ------------------------
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});


//------------------------   Present a single article with a note    ------------------------
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});












//------------------------   Setup port   ------------------------
var PORT = process.env.PORT || 3000;


// -----------------   Express server listener   -----------------
app.listen(3000, function() {
  console.log("App running on port 3000!");
});
