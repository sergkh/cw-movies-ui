var axios = require('axios');

const apiUrl = process.env.API_URL || 'http://localhost:1337'

if (!process.env.API_TOKEN) {
  throw new Error(`Не встановлено змінну API_TOKEN. 
    ЇЇ можна створивши токен в налаштуваннях панелі адміністратора strapi та записавши в .env файл, як
    API_TOKEN=токен`);
}

const client = axios.create({ baseURL: apiUrl + '/api' });
client.defaults.headers.common['Authorization'] = `Bearer ${process.env.API_TOKEN}`;

client.apiUrl = apiUrl

client.authenticate = async function (identifier, password) {
  const resp = await this.post('/auth/local', { identifier, password });
  const {jwt} = resp.data;
  return jwt;
};

client.getImage = function (path) {
  return this.get(apiUrl + "/" + path, { responseType: 'arraybuffer' });
};

module.exports = client;