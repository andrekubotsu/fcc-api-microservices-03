require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("dns");
const bodyParser = require("body-parser");

// hash function generator
const hash = require("short-hash");

//db connection using mongoose
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

// build a schema to db
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: { type: String, required: true }
});

const ShortURL = mongoose.model("ShortURL", urlSchema);

// create and save short url to db
let createAndSaveURL = url => {
  ShortURL.create(url, (err, data) => {
    if (err) return { error: "invalid url" };
  });
};

let urlFound;
async function findSavedURL(shorthash){
  ShortURL.find({ short_url: shorthash }, (err, data) => {
    if (err) return { error: "invalid url" };
    console.log(data);
    urlFound = data;
  });
};


//body-parser configuration to get the url info from form input
app.use(bodyParser.urlencoded({ extended: true }));

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

/*==============================*/
/* This is my original solution */
/*==============================*/

// Your first API endpoint
app.post("/api/shorturl/new", (req, res) => {
  let url = req.body;
  // first to test if the url is not a number, or numbers
  if (isNaN(url.url)) {
    dns.lookup(url.url, (err, family) => {
      if (err !== null) {
        res.json({ error: "invalid url" });
      } else {
        let hashURL = hash(url.url); //short version hex hash
        let newURL = {
          original_url: url.url,
          short_url: hashURL
        };
        createAndSaveURL(newURL);
        res.send({ original_url: url.url.toString(), short_url: hashURL.toString() });
      }
    });
  } else {
    res.json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:short", (req, res) => {
  const { short } = req.params;
  if (short !== "") {
    findSavedURL(short);
    const [{ original_url }] = urlFound;
    res.redirect(`http://${original_url}`);
  } else {
    res.json({ error: "invalid url" });
  }
});


/*=================================================================*/
/* this solution is from jagajeetkuppala99 from freeCodeCamp Forum */
/*=================================================================*/

//DB-SCHEMA
// var Schema = mongoose.Schema;
var urlShortnerSchema = new Schema({
  url: String
});
var urlShortner = mongoose.model("urlShortner", urlShortnerSchema);

//Function to extract domain name from URL
//This is because I use dns.resolve()
let urlExtractor = function(url) {
  var urlSplit = url.split("https://");
  if (urlSplit[1] == undefined) {
    return urlSplit[0].split("/")[0];
  } else {
    return urlSplit[1].split("/")[0];
  }
};

//Input
app.post("/api/shorturl/new", function(req, res) {
  var url = req.body.url;
  var extractedUrl = urlExtractor(req.body.url);
  dns.resolveAny(extractedUrl, (err, address) => {
    if (err) {
      console.log(err, address);
      res.json({ error: "invalid URL" });
    } else {
      var urlRecord = new urlShortner({ url: url });
      urlRecord.save((err, data) => {
        if (err) res.json({ error: "invalid URL" });
        else {
          res.json({ original_url: url, short_url: data._id.toString() });
        }
      });
    }
  });
});

//Output-Redirect
app.get("/api/shorturl/:shorturl", function(req, res) {
  let shorturl = req.params.shorturl;
  let urlId;
  try {
    urlId = mongoose.Types.ObjectId(shorturl);
  } catch (err) {
    res.json({ error: "invalid URL" });
    console.log("error" + urlId);
  }
  let completeurl = urlShortner.findById(urlId, (err, data) => {
    if (err) {
      res.json({ error: "invalid URL" });
      console.log("error" + urlId);
    } else {
      res.status(301).redirect(`http://${data.url}`); // only thing I changed, the template string
      console.log("Success" + urlId);
    }
  });
});

//================================================================


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
