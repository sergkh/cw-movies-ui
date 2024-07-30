const { jwtDecode } = require('jwt-decode');
const client = require('./client');


// Спрощує структуру об'єкта фільму отриману зі strapi
function transformMovie(apiUrl, movie, imageSize = 'small') {
  const comments = movie.attributes.comments
    ? movie.attributes.comments.data.map(c => transformComment(c)) 
    : null;

  return Object.assign(movie.attributes, {
    id: movie.id, 
    image: getImage(apiUrl, movie.attributes, imageSize), 
    rating: computeRating(movie.attributes),
    comments
  });
}

function transformComment(comment) {
  return { 
    id: comment.id, 
    text: comment.attributes.text, 
    author: comment.attributes.author.data.attributes.username,
    createdAt: new Date(comment.attributes.createdAt).toLocaleString()
  }
}
function computeRating(movie) {
  return movie.votes > 0 ? movie.rating_sum / movie.votes : 0;
}

function getImage(apiUrl, movie, type) {
  return apiUrl + movie.image.data.attributes.formats[type].url;
}

async function parseAuth(req, res, next) {
  const session = req.cookies.session;
  if (!session) return next();
  
  // отримання інформації про користувача та одночасно перевірка чи токен валідний
  try {
    const userData = await client.get('users/me?populate=role', { headers: { Authorization: `Bearer ${session}` } });
    const user = userData.data;
    user.role = user.role.name
    req.user = user
  } catch (e) {
    console.log('Error while parsing auth', e);
  }

  return next();
}

function rejectUnauthenticated(req, res, next) {
  if (!req.user) return res.redirect('/login');
  return next();
}

function rejectNonAdmin(req, res, next) {
  if (!req.user || !req.user.role === 'Admin') return res.redirect('/login');
  return next();
}


module.exports = {
  transformMovie, parseAuth, rejectUnauthenticated, rejectNonAdmin
}