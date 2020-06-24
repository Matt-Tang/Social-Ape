const functions = require('firebase-functions');

// Firebase database library
const admin = require('firebase-admin');

// Express libraries
const express = require('express');
const app = express()

admin.initializeApp(); //firebase object for accessing database

// First param is the route, second param is the handler
app.get('/screams', (req, res) => {
    admin.firestore()
        .collection('screams')
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push(doc.data());
            }); 
            return res.json(screams);
        })
        .catch(err => console.error(err));
});

app.post('/scream', (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt:  admin.firestore.Timestamp.fromDate(new Date())
    };

    admin.firestore()
        .collection('screams')
        .add(newScream)
        .then((doc) => {
            res.json({ message: `document ${doc.id} created successfully!`})
        })
        .catch((err) => {
            res.status(500).json({ error: `something went wrong :(`})
            console.error(err);
        })


});

// To expose our endpoint to be something like https://baseurl/api/function
// app is the container for all our routes so we just expose that, this is done through express
exports.api = functions.https.onRequest(app);