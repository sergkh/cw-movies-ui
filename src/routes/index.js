const router = require('express').Router();
const client = require('../client');
const { transformMovie, parseAuth, rejectUnauthenticated } = require('../utils');

/* Головна сторінка */
router.get('/', parseAuth, async function(req, res) {
  try {
    // Отримуємо список фільмів з API, 
    // populate=image означає, що ми хочемо також отримати зовнішне поле image
    const response = await client.get('movies?populate=image');
    const movies = response.data.data.map(movie => transformMovie(movie));

    // завантажуємо списки фільмів користувача, якщо він авторизований
    // щоб правильно відобразити кнопки "Додати до переглянутих" та "Додати до перегляду"
    var userWatched = [];
    var userToWatch = [];
    
    res.render('index', { movies, user: req.user, userWatched, userToWatch });
  } catch (error) {
    console.log(error);
    res.status(500).send('Внутрішня помилка сервера');
  }
});

router.get('/movies/:id', parseAuth, async function(req, res) {
  try {
    const movieId = req.params.id;
    const response = await client.get(`movies/${movieId}?populate[image][populate][0]=image&populate[comments][populate][1]=author`);

    console.log(`Showing movie ${movieId}`);

    const movie = transformMovie(response.data.data, 'large');

    var planned = false
    var watched = false

    if (req.user) {    
      // Перевірка чи фільм вже додано до списку переглянутих або до списку фільмів для перегляду шляхом
      // пошуку фільму за id та одночасно за відношенням до користувача. Якщо пошук не дав результату, то
      // фільм не додано до списку
      const addedToPlannedResp = await client.get(`movies?filters[id][$eq]=${movieId}&filters[user_to_watch][$eq]=${req.user.id}&fields=id`);
      const addedToWatchedResp = await client.get(`movies?filters[id][$eq]=${movieId}&filters[watched_by][$eq]=${req.user.id}&fields=id`);    
      
      planned = addedToPlannedResp.data.data.length > 0
      watched = addedToWatchedResp.data.data.length > 0

      console.log(`Showing movie ${movieId} to user ${req.user.id}. Watched: ${watched}. Planned to watch: ${planned}`)
    } else {
      console.log(`Showing movie ${movieId} to anonymous user`)
    }

    res.render('movie', { user: req.user, movie, page: 'movie', planned, watched });
  } catch (error) {
    console.log(error);
    
    if (error.response) {
      const errorCode = error.response.data.error;
      if (errorCode.name === 'NotFoundError') return res.status(404).send('Фільм не знайдено');
    }
    
    res.status(500).send('Внутрішня помилка сервера');
  }
});

router.post('/movies/:id/comments', parseAuth, rejectUnauthenticated, async function(req, res) {
  try {
    const movieId = req.params.id;
    const comment = req.body.text;
    const userId = req.user.id;

    if (userId !== req.user.id) return res.status(401).send('Unauthorized');
    if (!comment) return res.status(400).send('Comment is required');

    console.log(`Adding comment to movie ${movieId} for user ${userId}`);

    await client.post(`comments`, {
      data : {
        movie: movieId,
        text: comment,
        author: userId
      }
    });

    res.redirect(`/movies/${movieId}`);
  } catch (error) {
    console.log(error);
    res.status(500).send('Внутрішня помилка сервера');
  }
});

router.post('/movies/:id/rating', parseAuth, rejectUnauthenticated, async function(req, res) {
  try {
    const movieId = req.params.id;
    const rating = req.body.rating;
    if (!rating) return res.status(400).send('Rating is required');
    if (rating < 1 || rating > 5) return res.status(400).send('Rating must be between 1 and 5');

    const oldRatingResp = await client.get(`ratings?filters[movie][$eq]=${movieId}&filters[user][$eq]=${req.user.id}`);  
    const oldRating = oldRatingResp.data.data.length > 0 ? oldRatingResp.data.data[0] : null;
    
    if (oldRating) {
      await client.delete(`ratings/${oldRating.id}`);
    }
    
    await client.post(`ratings`, { data: { movie: movieId, rating, user: req.user.id } });  
    
    console.log(`Voted for a movie ${movieId} with rating ${rating}. Rating ${oldRating ? 'updated' : 'added'}.`);

    const movieResp = await client.get(`movies/${movieId}`);
    const movie = movieResp.data.data.attributes;    

    // Перерахунок загального рейтингу фільму
    // Якщо рейтинг вже був встановлений цим користувачем то змінюємо його та залишаємо votes незмінним
    // Якщо рейтинг встановлюється вперше то збільшуємо votes на 1
    const update = {};
    update.rating_sum = movie.rating_sum ? movie.rating_sum : 0;
    update.votes = movie.votes ? movie.votes : 0;
    
    update.rating_sum += rating - (oldRating ? oldRating.attributes.rating : 0);
    update.votes += oldRating ? 0 : 1;

    // Оновлення порахованого рейтингу фільму
    await client.put(`movies/${movieId}`, { data: update });

    res.json({ rating: update.rating_sum / update.votes });
  } catch (error) {
    if(error.response) {
      console.log(error.response.data)
    } else {
      console.log(error)
    }
    res.status(500).send('Внутрішня помилка сервера');
  }
});

router.get('/about', parseAuth, function(req, res) {
  res.render('about', {user: req.user });
});

router.get('/images/*', async function(req, res) {
  try {
    const path = req.params[0];
    console.log(`Loading image ${path}`);
    const image = await client.getImage(path)
    res.send(image.data);
  } catch (error) {
    if(error.response) {
      console.log(error.request)
      console.log(error.response.data)
    } else {
      console.log(error)
    }
    res.status(404).end();
  }
});


module.exports = router;
