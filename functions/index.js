const functions = require('firebase-functions');

// Firebase database library
const admin = require('firebase-admin');

// Express libraries
const express = require('express');
const app = express()

admin.initializeApp(); //firebase object for accessing database

// Firebase Authentication
const config = {
    apiKey: "AIzaSyBVrfKKc36qH3VkODtLsNCS7vQ2RoYzQXc",
    authDomain: "socialape-a3677.firebaseapp.com",
    databaseURL: "https://socialape-a3677.firebaseio.com",
    projectId: "socialape-a3677",
    storageBucket: "socialape-a3677.appspot.com",
    messagingSenderId: "203550461356",
    appId: "1:203550461356:web:c04aedbcce3e90834c7e09",
    measurementId: "G-TB9NS84TG4"
};

const firebase = require('firebase');
firebase.initializeApp(config);

const db = admin.firestore();


// First param is the route, second param is the handler
app.get('/screams', (req, res) => {
    db.collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt 
                });
            }); 
            return res.json(screams);
        })
        .catch(err => console.error(err));
});

app.post('/scream', (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };

    db.collection('screams')
        .add(newScream)
        .then((doc) => {
            res.json({ message: `document ${doc.id} created successfully!`})
        })
        .catch((err) => {
            res.status(500).json({ error: `something went wrong :(`})
            console.error(err);
        })


});

/* Checks if input is empty or not */
const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

/* Checks if Email is Valid or Not */
const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(regEx)) return true;
    else return false;
}

/* Sign up route */
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    // Define an errors object
    let errors = {};

    // Validation for sign up
    if(isEmpty(newUser.email)){
        errors.email = 'Must not be empty';
    } 
    else if(!isEmail(newUser.email)){
        errors.email = 'Must be a valid email address';
    }

    if(isEmpty(newUser.password)){
        errors.password = 'Must not be empty';
    }
    else if(newUser.password !== newUser.confirmPassword){
        errors.password = 'Passwords must match';
    }

    if(isEmpty(newUser.handle)){
        errors.handle = 'Must not be empty';
    }
    
    // Checks the error object and sees if the length of its keys are > 0, if yes that means
    // we have an error somewhere
    if(Object.keys(errors).length > 0){
        return res.status(400).json(errors);
    }


    // Check if user handle exists or not, you will get a doc regardless if it exists or not
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then((doc) => {
            if(doc.exists){ // handle exist we can not create it
                return res.status(400).json({ handle: 'this handle is already taken'});
            } else { // else it is unique and we should create it
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => { // successfully created handle so get token
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = { 
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId: userId
            };

            // Create user in database
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() =>{
            return res.status(201).json({ token });
        })
        .catch((err) => {
            console.error(err);
            if(err.code === 'auth/email-already-in-use'){
                return res.status(400).json({ error: 'Email is already in use' });
            }
            else {
                return res.status(500).json({ error: err.code });
            }
        });
})

/* Login route */
app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    // Error object
    let errors = {};

    // Validation for login
    if(isEmpty(user.email)){
        errors.email = 'Must not be empty';
    } 
    else if(!isEmail(user.email)){
        errors.email = 'Must be a valid email address';
    }

    if(isEmpty(user.password)){
        errors.password = 'Must not be empty';
    } 

    // Checks the error object and sees if the length of its keys are > 0, if yes that means
    // we have an error somewhere
    if(Object.keys(errors).length > 0){
        return res.status(400).json(errors);
    }

    // Log user in if we have no errors
    firebase.auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.json({ token });
        })
        .catch((err) => {
            console.error(err);
            if(err.code === 'auth/wrong-password'){
                return res.status(403).json({ general: 'Wrong credentials, please try again' });
            }
            return res.status(500).json({ error: err.code });
        })
})

// To expose our endpoint to be something like https://baseurl/api/function
// app is the container for all our routes so we just expose that, this is done through express
exports.api = functions.https.onRequest(app);