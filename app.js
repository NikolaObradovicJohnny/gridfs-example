const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// MongoDB URI
const mongoURI = 'mongodb://localhost:27017/gridfstest';

// Create Mongo Connection
const conn = mongoose.createConnection(mongoURI);

// Init grf
let gfs;
const collectionName = 'uploads';

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection(collectionName);
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
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: collectionName
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });

// @route GET /
// @desc Load form
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // check if files exist
        if (!files || files.length === 0) {
            res.render('index', {files: false});
        } else {
            files.map(file => {
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                    file.isImage = true;
                    file.isAudio = false;
                } else if (file.contentType === 'audio/mp3' || file.contentType === 'audio/wav' || file.contentType === 'audio/x-ms-wma') {
                    file.isAudio = true;
                    file.isImage = false;
                } else {
                    file.isImage = false;
                    file.isAudio = false;
                }
            });
            res.render('index',{files: files});
        }
    });
    
});

// @route POST /upload
// @desc upload file to DB
app.post('/upload', upload.single('file'), (req, res) => {
    // res.json({file: req.file});
    res.redirect('/');
});

// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // check if files exist
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist.'
            });
        }

        // Files exist
        return res.json(files);
    });
});

// @route GET /files/:filename
// @desc Display single file in JSON
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        // check if files exist
        if (!file) {
            return res.status(404).json({
                err: 'No file exists.'
            });
        }

        // File exist
        return res.json(file);
    });
});

// @route GET /image/:filename
// @desc Display single image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        // check if file exist
        if (!file) {
            return res.status(404).json({
                err: 'No file exists.'
            });
        }

        // Check if image
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({err: 'This is not an image file.'});
        }
    });
});

// @route GET /audio/:filename
// @desc Display single image
app.get('/audio/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        // check if file exist
        if (!file) {
            return res.status(404).json({
                err: 'No file exists.'
            });
        }

        // Check if image
        if (file.contentType === 'audio/mp3' || file.contentType === 'audio/wav') {
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({err: 'This is not an audio file.'});
        }
    });
});

const port = 5000;

app.listen(port, () => console.log('server started on port ${port}',port));