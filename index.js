const express = require('express');
const router = express.Router();

router.post('/ussd', (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    console.log('##########', req.body);

    let response = ''; // ✅ Declare the response variable properly

    if (text === '') {
        response = `CON Welcome to our USSD demo! Choose an option to proceed:\n1. New to AfriCulture\n2. Existing member`;
    } else if (text === '1') {
        response = `CON Do you have an account?\n1. Yes\n2. No`;
    } else if (text === '2') {
        response = `END Welcome back, glad you're here. Your phone number is ${phoneNumber}`;
    } else if (text === '1*1') {
        const accountNumber = 'ACC100101';
        response = `END That's true, your account number is ${accountNumber}`;
    } else if (text === '1*2') {
        response = `END What are you waiting for? Create an account.`;
    } else {
        response = `END Invalid input. Try again.`;
    }

    res.set("Content-Type", "text/plain");
    res.send(response);
});

module.exports = router;


// const express = require('express'); 

// const router = express.Router(); 

// router.post('/ussd', (req, res) => {
//     // Read variables sent via POST from our SDK 
//     const { sessionId, serviceCode, phoneNumber, text } = req.body; 

//     console.log('##########', req.body);

//     // Chaine if statements will take uses through the ussd logic
//     if (text === '') {
//         console.log(text); 
//         // This is the first request
//         // Start respone with Continue if they have further options/they continue
//         response = `Continue | Welcome to our USSD demo! Choose an option to proceed:
//             1. New to AfriCulture
//             2. Existing member
//         `;
//     } else if (text === '1') {
//         // Business logic for first level response 
//         response = `Continue | Do you have a n account?
//             1. Yes
//             2. No
//         `;
//     } else if (text === '2') {
//         response = `End | Welcome back, glad you're here. Your phone number is ${phoneNumber}`;
//     } else if (text === '1*1') {
//         const accountNumber = 'ACC100101';
//         response = `End | That's' true your account nmber is ${accountNumber}`;
//     } else if (text === '1*2') {
//         // create an account at developers.africastalking.com
//         response = `End | what are you waiting for? Create an account`;
//     }

//     // Print the response onto the page so that our SDK can read it
//     res.set("Content-Type: text/plain"); 
//     res.send(response); 

// });

// module.exports = router; 