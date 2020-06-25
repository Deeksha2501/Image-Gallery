const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
require('dotenv').config();
images = [{image:"background.webp"}];


const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.use(express.static("public"));

// Mongo URI
const mongoURI = process.env.mongo_URI;
const ImageSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  filename : {
    type : String,
  },
  type : String,
  size : Number,
  id : String,
  extType : String
});

const Image = mongoose.model('Image', ImageSchema);
const image = mongoose.model('Image')                                                                                                        


var connection = mongoose.connect(mongoURI , { useNewUrlParser: true  , useUnifiedTopology: true} , (err)=>{
  if(!err){
      console.log("Moongoose connect succeded...");
  }
  else{
      console.log("ERROR : " , err);
  }
});

// Create mongo connection
const conn = mongoose.createConnection(mongoURI , {useNewUrlParser: true , useUnifiedTopology: true});


// Init gfs
let gfs;

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });


app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    // if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    // } else {
      // res.status(404).json({
        // err: 'Not an image'
      // });
    // }
  });
});


app.get('/', async (req, res) => {
  const files = await image.find({});
  console.log(files);
  res.render('index.ejs', { files: files , images:images });
});


app.post('/upload', upload.single('file'), async (req, res) => {
  try{
  const filename = req.file.filename;
  const name = req.body.name;
  const type = req.file.contentType;
  const img_id = req.file.id;
  const size = req.file.size / 1024;
  const extType = req.file.contentType.split('/')[1];
  console.log({filename ,type , img_id , size });
  const img = await image.create({
    name : name,
    filename : filename,
    type : type, 
    size : size,
    extType : extType,
    id : img_id,
  });
  console.log(img);
}
catch(e){
  console.log(e);
}
res.redirect('/');
});

app.post('/search' , async(req , res)=>{
  try{
    const name = req.body.search;
    const files = await image.find({name : name})
    console.log({files});
    res.render('index.ejs', { files: files , images:images });
  }
  catch{

  }
})

// @route DELETE /files/:id
app.delete('/files/:id', async(req, res) => {
  try{
    console.log(req.params.id);
    await image.deleteOne({_id : req.params.id})
    res.redirect('/');
  }
  catch(e){
    console.log(e);
  }

  
});



const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));
