const router = require('express').Router();
const client = require('../client');
const { rejectUnauthenticated, parseAuth, transformMovie } = require('../utils');

router.get('/watched', parseAuth, async function(req, res) {
  const userId = req.user.id;
  const response = await client.get(`movies?populate=image&filters[watched_by][$eq]=${userId}`);

  const movies = response.data.data.map(movie => transformMovie(movie));    

  res.render('bookmarks', { movies: movies, user: req.user, listType: 'watched', page: 'watched', title: 'Список переглянутих фільмів' });
});

router.get('/to-watch', parseAuth, async function(req, res) {
  const userId = req.user.id;
  const response = await client.get(`movies?populate=image&filters[user_to_watch][$eq]=${userId}`);

  const movies = response.data.data.map(movie => transformMovie(movie));   

  res.render('bookmarks', { movies: movies, user: req.user, listType: 'to-watch', page: 'to-watch', title: 'Список фільмів до перегляду'  });
});

router.post('/watched', parseAuth, rejectUnauthenticated, async function(req, res) {
  const movieId = req.body.movieId;
  const userId = req.user.id;
  
  if (!movieId) return res.status(400).send('movieId is required');
  if (!userId) return res.status(400).send('userId is required');
  if (userId != req.user.id) return res.status(403).send('Forbidden');

  console.log(`Adding movie ${movieId} to watched for user ${userId}`);

  try {
    await client.put(`/movies/${movieId}`, { data: { watched_by: { connect: [userId] } }});
    res.redirect('/movies/' + movieId);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

router.post('/to-watch', parseAuth, rejectUnauthenticated, async function(req, res) {
  const movieId = req.body.movieId;
  const userId = req.user.id;
  
  if (!movieId) return res.status(400).send('movieId is required');
  if (!userId) return res.status(400).send('userId is required');
  if (userId != req.user.id) return res.status(403).send('Forbidden');

  console.log(`Adding movie ${movieId} to the to be watched list for user ${userId}`);

  try {
    await client.put(`/movies/${movieId}`, { data: { user_to_watch: { connect: [userId] } }});
    res.redirect('/movies/' + movieId);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

router.post('/to-watch/remove', parseAuth, rejectUnauthenticated, async function(req, res) {
  const movieId = req.body.movieId;
  const userId = req.user.id;
  
  if (!movieId) return res.status(400).send('movieId is required');
  if (!userId) return res.status(400).send('userId is required');
  if (userId != req.user.id) return res.status(403).send('Forbidden');

  console.log(`Removing movie ${movieId} from the to be watched for user ${userId}`);

  try {
    await client.put(`/movies/${movieId}`, { data: { user_to_watch: { disconnect: [userId] } }});
    res.redirect('/movies/' + movieId);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

router.post('/watched/remove', parseAuth, rejectUnauthenticated, async function(req, res) {
  const movieId = req.body.movieId;
  const userId = req.user.id;
  
  if (!movieId) return res.status(400).send('movieId is required');
  if (!userId) return res.status(400).send('userId is required');
  if (userId != req.user.id) return res.status(403).send('Forbidden');

  console.log(`Removing movie ${movieId} from the watched list for user ${userId}`);

  try {
    await client.put(`/movies/${movieId}`, { data: { watched_by: { disconnect: [userId] } }});
    res.redirect('/movies/' + movieId);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;
