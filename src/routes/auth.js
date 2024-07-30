const router = require('express').Router();
const client = require('../client');

/* Відобразити форму логіну */
router.get('/login', function(req, res) {  
  res.render('login', { error: req.query.error });
});

/* 
  Обробка форми логіну. Перевірка пошти та паролю через API та запис токену в куки
 */
router.post('/login', async function(req, res) {
  try {
    const token = await client.authenticate(req.body.email, req.body.password);
    
    res.cookie('session', token, { httpOnly: true })
      .redirect('/');

  } catch (e) {
    var error = 'невідома помилка';
    
    if (e.response.data.error) {
      if (e.response.data.error.name === 'ValidationError') {
        error = 'Невірний логін або пароль';
      } else {
        error = e.response.data.error.message;
      }
    }

    return res.redirect(`/login?error=${encodeURIComponent(error)}`);
  }
});

/* Відобразити форму реєстрації */
router.get('/signup', function(req, res) {  
  res.render('signup', { error: req.query.error });
});


/* 
  Обробка форми реєстрації
*/
router.post('/signup', async function(req, res) {
  const { email, password, password_repeat } = req.body;
  if(!email || !password || !password_repeat) {
    return res.redirect(`/signup?error=${encodeURIComponent('Всі поля повинні бути заповнені')}`);
  }
  
  if (password !== password_repeat) {
    return res.redirect(`/signup?error=${encodeURIComponent('Паролі не співпадають')}`);
  }

  // Реєстрація нового користувача, тут необхідно використовувати токен адміністратора
  // ID ролі береться з strapi, 1 - зареєстрований користувач,
  // можна отримати за посиланням (необхідний токен) http://localhost:1337/api/users-permissions/roles
  const registration = {
    email, 
    username: email, 
    password, 
    confirmed: true
  }

  try {
    const registrationResp = await client.post('auth/local/register', registration);
    
    console.log(`Registered user: ${email}. Response: ${registrationResp.data}`);

    const token = await client.authenticate(email, password);

    res.cookie('session', token, { httpOnly: true })
      .redirect('/');

  } catch (e) {
    var error = 'невідома помилка';
    
    console.log(e.response.data);

    if (e.response.data.error) {
      if (e.response.data.error.name === 'ValidationError') {
        error = 'Невірний логін або пароль';
      } else {
        error = e.response.data.error.message;
      }
    }

    return res.redirect(`/signup?error=${encodeURIComponent(error)}`);
  }
});

/* Вихід: видалення кукі */
router.post('/logout', function(req, res) {
  res.clearCookie('session')
     .redirect('/');
});

module.exports = router;
