const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

const private_app_token = process.env.TOKEN

app.get('/contacts', async (req, res) => {
    const contacts = 'https://api.hubspot.com/crm/v3/objects/contacts';
    const headers = {
        Authorization: `Bearer ${private_app_token}`,
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
        Authorization: `Bearer ${private_app_token}`,
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
        Authorization: `Bearer ${private_app_token}`, 
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