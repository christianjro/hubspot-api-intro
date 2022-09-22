require('dotenv').config();
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const session = require('express-session');
const { response } = require('express');

const app = express();

app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

const PRIVATE_APP_TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const REDIRECT_URI = 'http://localhost:3000/oauth-callback';
const authUrl = 'https://app.hubspot.com/oauth/authorize?client_id=029ddea4-54e6-40f4-92c9-dd1e0c1900e7&redirect_uri=http://localhost:3000/oauth-callback&scope=crm.lists.read%20crm.objects.contacts.read%20crm.objects.contacts.write%20crm.schemas.contacts.read%20crm.lists.write%20crm.schemas.contacts.write';

const tokenStore = {};

app.use(session({
    secret: Math.random().toString(36).substring(2),
    resave: false,
    saveUninitialized: true
}));


// 1. Send user to authorization page (This kicks off the initial request to OAuth server)
// function isAuthorized(userId) {
//     return tokenStore[userId] ? true : false;
// }

const isAuthorized = (userId) => {
    return tokenStore[userId] ? true : false;
};

app.get('/', async (req, res) => {
    if (isAuthorized(req.sessionID)) {
        const accessToken = tokenStore[req.sessionID];
        const headers = {
            Authorization : `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
        const contacts = `https://api.hubapi.com/crm/v3/objects/contacts`;
        try {
            const resp = await axios.get(contacts, {headers});
            const data = resp.data;
            res.render('home', {token: accessToken, contacts: data.results});
        } catch (error) {
            console.error(error)
        }
    } else {
        res.render('home', {authUrl});
    }
});

// 2. Get temporary authorization code from OAuth server
// 3. Combine temporary auth code with app credentials and send them back to OAuth server
// the '/oauth/v1/token' endpoint expects the form urlencoded formal instead of JSON format
app.get('/oauth-callback', async (req, res) => {
    // res.send(req.query.code);
    const authCodeProof = {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: req.query.code
    };
    try {
        const responseBody = await axios.post('https://api.hubspot.com/oauth/v1/token', querystring.stringify(authCodeProof));
        // 4. Get access token and refresh token
        tokenStore[req.sessionID] = responseBody.data.access_token;
        res.redirect('/');
    } catch (error) {
        console.error(error)
    }
});





app.get('/contacts', async (req, res) => {
    const contacts = 'https://api.hubspot.com/crm/v3/objects/contacts';
    const headers = {
        Authorization: `Bearer ${PRIVATE_APP_TOKEN}`,
        'Content-Type': 'application/json'
    }
    try {
        const response = await axios.get(contacts, {headers});
        const data = response.data.results;
        res.render('contacts', {title: 'Contacts | HubSpot APIs', data});
    } catch (error) {
        console.error(error);
    }
});

app.get('/update', async (req, res) => {
    // http://localhost:3000/update?email=rick@crowbars.net
    // The read contact endpoint requires a contactId, or any unique property
    // so, we'll use the contact's email address in our request and set the idProperty = email
    // we also need to specify what properties we want to return
    const email = req.query.email;
    const getContact = `https://api.hubapi.com/crm/v3/objects/contacts/${email}?idProperty=email&properties=email,favorite_book`;
    const headers = {
        Authorization: `Bearer ${PRIVATE_APP_TOKEN}`,
        'Content-Type': 'application/json'
    };
    try {
        const response = await axios.get(getContact, {headers});
        const data = response.data;
        res.render('update', {userEmail: data.properties.email, favoriteBook: data.properties.favorite_book});
    } catch(error) {
        console.error(error)
    }
});

app.post('/update', async (req, res) => {
    const update = {
        properties: {
            "favorite_book": req.body.newVal
        }
    }
    const email = req.query.email
    const updateContact = `https://api.hubapi.com/crm/v3/objects/contacts/${email}?idProperty=email`
    const headers = {
        Authorization: `Bearer ${PRIVATE_APP_TOKEN}`, 
        'Content-Type': 'application/json'
    }
    try {
        await axios.patch(updateContact, update, {headers});
        res.redirect('back');
    } catch(error) {
        console.error(error)
    }
});



app.listen(3000, () => console.log('Listening on http://localhost:3000'));