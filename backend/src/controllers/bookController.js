const bookModel = require("../models/Book");
const mongoose = require("mongoose");

// create new book
// post /api/book

async function createBook(req, res) {
    try {
        const { title, subtitle, author, chapters} = req.body

        if(!title || !author){
            return res.status(400).json({message:"please provide title and author name"})
        }

        const book = await bookModel.create({
            userId: req.user._id,
            title,
            subtitle,
            author,
            chapters,
        })

        res.status(201).json(book);

    } catch (error) {
        res.status(500).json({ message: `internal server error ${error}` })
    }
}

// get all books
// GET /api/book

async function getBooks(req, res) {
    try {
        const books = await bookModel.find({userId:req.user._id}).sort({createdAt:-1})
        res.status(200).json(books)

    } catch (error) {
        res.status(500).json({ message: `internal server error ${error}` })
    }
}

// get one book
// GET /api/books/:id

async function getBookById(req, res) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid book ID" });
    }
    try {
        const book = await bookModel.findById(id);

        if(!book){
            return res.status(404).json({message:"Book Not Found"})
        }
        if(book.userId.toString() !== req.user._id.toString()){
            return res.status(401).json({message:"Not authorized to view book"})
        }

        res.status(200).json(book)

    } catch (error) {
        res.status(500).json({ message: `internal server error ${error}` })
    }
}

// edit and update Book
// PUT /api/books/:id


async function updateBook(req, res) {
    try {
        const updatedBook = await bookModel.findByIdAndUpdate(req.params.id, req.body,{
            returnDocument: 'after',
            runValidators:true
        })
        res.status(200).json(updatedBook)
    } catch (error) {
        res.status(500).json({ message: `internal server error ${error}` })
    } 
}

// delete Book
// DELETE /api/books/:id

async function deleteBook(req, res) {
    try {
        const book = await bookModel.findById(req.params.id);

        if(!book){
            return res.status(404).json({message:"book not found"})
        }
        if(book.userId.toString()!==req.user._id.toString()){
            return res.status(401).json({message:"you are not authorized to access this book"})
        }
        await book.deleteOne();
        res.status(200).json({message:"book deleted successfully"})

    } catch (error) {
        res.status(500).json({ message: `internal server error ${error}` })
    }
}

// update book cover
// PUT /api/books/cover/:id

async function updateBookCover(req, res) {
    try {
        const book = await bookModel.findById(req.params.id);
        if(!book){
            return res.status(404).json({message:"book not found"});
        }
        if(book.userId.toString() !== req.user._id.toString()){
            return res.status(401).json({message:"you are not authorized to update this book"})
        }
        if(req.file){
            book.coverImage = `/${req.file.path}`
        }else{
            return res.status(400).json({message:"no image file provided"})
        }

        const updatedbook = await book.save();

        res.status(200).json({message:"cover updated successfully", updatedbook})
    } catch (error) {
        res.status(500).json({ message: `internal server error ${error}` })
    }
}


module.exports = { createBook, getBooks, getBookById, updateBook, deleteBook, updateBookCover }