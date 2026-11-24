const multer = require("multer");
const path = require("path");
const fs = require("fs");


// check if direcotry exists
let uploadDir = "uploads"

if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, {recursive:true})
}

// setup sotrage engine

const storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, uploadDir);
    },
    filename: function (req, file, cb){
        cb(null,
            `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
        )
    }
})


function checkFileType(file, cb){
    const fileTypes = /jpeg|jpg|png|gif/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if(extName && mimeType){
        return cb(null, true)
    }else{
        cb("Error: Images Only")
    }
}

const upload = multer({
    storage:storage,
    limits:{fileSize: 2 *1024 *1024},
    fileFilter: function (req, file, cb){
        checkFileType(file, cb)
    }
}).single("coverImage");

module.exports = upload