const router = require('express').Router();
const client = require('../client');
const { parseAuth, rejectNonAdmin } = require('../utils');
const { body, validationResult, matchedData } = require('express-validator')
require('express-async-errors');

const newMovieValidation = [
  body('title').isLength({ min: 1, max: 512 }),  
  body('description').isLength({ min: 10, max: 2048 }),
  body('director').isLength({ min: 1, max: 128 }),  
  body('actors').isLength({ min: 1, max: 1024 }),  
  body('year').isNumeric()
]

/* Відобразити форму додавання фільму */
router.get('/', parseAuth, rejectNonAdmin, function(req, res) {  
  res.render('admin', { error: req.query.error, success: req.query.success, user: req.user });
});

/** Додати новий фільм до бази */
router.post('/movies', parseAuth, rejectNonAdmin, newMovieValidation, async function(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.redirect(`/admin?error=${errors.array().map(e => e.msg).join(', ')}`);
  }

  if (!req.files || !req.files.image) {
    return res.redirect('/admin?error=Зображення не вибрано');
  }
  
  const file = req.files.image;
  const fileUpload = new FormData();
  fileUpload.append('files', new Blob([file.data]), file.name);

  const uploadedFile = await client.post('/upload', fileUpload)
  const fileId = uploadedFile.data[0].id;

  const movie = req.body;
  movie.image = fileId;
  movie.genres = movie.genres.split(',').map(g => g.trim());
  movie.actors = movie.actors.split(',').map(a => a.trim());

  const createMovie = await client.post('/movies', { data : movie});
  
  console.log(`Created a new movie with image id ${fileId}`, createMovie.data);

  res.redirect('/admin?success=Фільм успішно додано');
});

router.post('/movies/:id/delete', parseAuth, rejectNonAdmin, async function(req, res) {
  const id = req.params.id;

  await client.delete(`/movies/${id}`)

  res.redirect('/');
});

module.exports = router;
