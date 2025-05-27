const express = require('express');
const router = express.Router();

// In-memory session storage (use Redis/database in production)
const sessions = {};

router.post('/ussd', (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    console.log('##########', req.body);

    let response = '';
    
    // Initialize session if it doesn't exist
    if (!sessions[sessionId]) {
        sessions[sessionId] = {
            step: 1,
            userType: null,
            fishQuantity: null,
            verification: null,
            phoneNumber: phoneNumber
        };
    }

    const session = sessions[sessionId];

    // STEP 1: REGISTRATION
    if (text === '') {
        // Initial menu
        response = `CON Welcome to Nanenane Fish Agent Portal! 🐟
Step 1/3: Registration
Choose your registration type:
1. Register (New Fisher) - No ID required
2. Already a Member`;
        session.step = 1;
    } 
    else if (text === '1' && session.step === 1) {
        // New Fisher Registration
        session.userType = 'new';
        response = `CON ✅ Registration: New Fisher
Step 2/3: Fish Deposit
How much fish are you depositing?
1. 1 Kg
2. 2 Kg
3. 3 Kg
4. 4+ Kg`;
        session.step = 2;
    } 
    else if (text === '2' && session.step === 1) {
        // Existing Member
        session.userType = 'existing';
        response = `CON ✅ Registration: Existing Member
Step 2/3: Fish Deposit
How much fish are you depositing?
1. 1 Kg
2. 2 Kg
3. 3 Kg
4. 4+ Kg`;
        session.step = 2;
    }

    // STEP 2: FISH DEPOSIT
    else if ((text === '1*1' || text === '1*2' || text === '1*3' || text === '1*4' || 
              text === '2*1' || text === '2*2' || text === '2*3' || text === '2*4') && session.step === 2) {
        // Extract quantity from user input
        const quantity = parseInt(text.split('*')[1]);
        session.fishQuantity = quantity;
        
        const kgText = quantity === 4 ? '4+ Kg' : `${quantity} Kg`;
        
        response = `CON ✅ Fish Deposit: ${kgText}
Step 3/3: Verification
Please verify the quantity status:
1. Approved Quantity ✓
2. Wrong Quantity/Stock ✗`;
        session.step = 3;
    }

    // STEP 3: VERIFICATION & SUBMIT
    else if (session.step === 3) {
        if (text.endsWith('*1')) {
            // Approved quantity
            session.verification = 'approved';
            const userTypeText = session.userType === 'new' ? 'New Fisher' : 'Existing Member';
            const quantityText = session.fishQuantity === 4 ? '4+ Kg' : `${session.fishQuantity} Kg`;
            
            response = `END ✅ APPLICATION SUBMITTED SUCCESSFULLY!

SUMMARY:
👤 Registration: ${userTypeText}
🐟 Fish Quantity: ${quantityText}
📋 Status: APPROVED
📱 Phone: ${phoneNumber}

Your fish deposit has been recorded. You will receive a confirmation SMS shortly.

Thank you for using Nanenane Fish Agent Portal! 🐟`;
            
            // Clear session after successful submission
            delete sessions[sessionId];
        } 
        else if (text.endsWith('*2')) {
            // Wrong quantity - needs correction
            session.verification = 'wrong';
            const userTypeText = session.userType === 'new' ? 'New Fisher' : 'Existing Member';
            const quantityText = session.fishQuantity === 4 ? '4+ Kg' : `${session.fishQuantity} Kg`;
            
            response = `END ⚠️ APPLICATION SUBMITTED - NEEDS CORRECTION

SUMMARY:
👤 Registration: ${userTypeText}
🐟 Fish Quantity: ${quantityText}
📋 Status: NEEDS CORRECTION
📱 Phone: ${phoneNumber}

Our agent will contact you to verify the correct quantity. Please keep your fish ready for inspection.

Thank you for using Nanenane Fish Agent Portal! 🐟`;
            
            // Clear session after submission
            delete sessions[sessionId];
        }
    }

    // Handle invalid inputs or navigation errors
    else if (text === '0') {
        // Reset to main menu
        response = `CON Welcome back to Nanenane Fish Agent Portal! 🐟
Step 1/3: Registration
Choose your registration type:
1. Register (New Fisher) - No ID required
2. Already a Member`;
        session.step = 1;
        session.userType = null;
        session.fishQuantity = null;
        session.verification = null;
    }
    else {
        // Invalid input handler
        if (session.step === 1) {
            response = `CON ❌ Invalid selection. Please try again.
Step 1/3: Registration
Choose your registration type:
1. Register (New Fisher) - No ID required
2. Already a Member
0. Main Menu`;
        } else if (session.step === 2) {
            response = `CON ❌ Invalid selection. Please try again.
Step 2/3: Fish Deposit
How much fish are you depositing?
1. 1 Kg
2. 2 Kg
3. 3 Kg
4. 4+ Kg
0. Main Menu`;
        } else if (session.step === 3) {
            response = `CON ❌ Invalid selection. Please try again.
Step 3/3: Verification
Please verify the quantity status:
1. Approved Quantity ✓
2. Wrong Quantity/Stock ✗
0. Main Menu`;
        } else {
            response = `END ❌ Session error. Please dial again to start over.`;
            delete sessions[sessionId];
        }
    }

    res.set("Content-Type", "text/plain");
    res.send(response);
});

// Optional: Clean up old sessions (run periodically)
setInterval(() => {
    const now = Date.now();
    Object.keys(sessions).forEach(sessionId => {
        if (!sessions[sessionId].lastActivity) {
            sessions[sessionId].lastActivity = now;
        } else if (now - sessions[sessionId].lastActivity > 300000) { // 5 minutes
            delete sessions[sessionId];
        }
    });
}, 60000); // Clean every minute

module.exports = router;


// const express = require('express');
// const router = express.Router();

// router.post('/ussd', (req, res) => {
//     const { sessionId, serviceCode, phoneNumber, text } = req.body;

//     console.log('##########', req.body);

//     let response = ''; // ✅ Declare the response variable properly

//     if (text === '') {
//         response = `CON Welcome to our USSD demo! Choose an option to proceed:\n1. New to AfriCulture\n2. Existing member`;
//     } else if (text === '1') {
//         response = `CON Do you have an account?\n1. Yes\n2. No`;
//     } else if (text === '2') {
//         response = `END Welcome back, glad you're here. Your phone number is ${phoneNumber}`;
//     } else if (text === '1*1') {
//         const accountNumber = 'ACC100101';
//         response = `END That's true, your account number is ${accountNumber}`;
//     } else if (text === '1*2') {
//         response = `END What are you waiting for? Create an account.`;
//     } else {
//         response = `END Invalid input. Try again.`;
//     }

//     res.set("Content-Type", "text/plain");
//     res.send(response);
// });

// module.exports = router;


// // const express = require('express'); 

// // const router = express.Router(); 

// // router.post('/ussd', (req, res) => {
// //     // Read variables sent via POST from our SDK 
// //     const { sessionId, serviceCode, phoneNumber, text } = req.body; 

// //     console.log('##########', req.body);

// //     // Chaine if statements will take uses through the ussd logic
// //     if (text === '') {
// //         console.log(text); 
// //         // This is the first request
// //         // Start respone with Continue if they have further options/they continue
// //         response = `Continue | Welcome to our USSD demo! Choose an option to proceed:
// //             1. New to AfriCulture
// //             2. Existing member
// //         `;
// //     } else if (text === '1') {
// //         // Business logic for first level response 
// //         response = `Continue | Do you have a n account?
// //             1. Yes
// //             2. No
// //         `;
// //     } else if (text === '2') {
// //         response = `End | Welcome back, glad you're here. Your phone number is ${phoneNumber}`;
// //     } else if (text === '1*1') {
// //         const accountNumber = 'ACC100101';
// //         response = `End | That's' true your account nmber is ${accountNumber}`;
// //     } else if (text === '1*2') {
// //         // create an account at developers.africastalking.com
// //         response = `End | what are you waiting for? Create an account`;
// //     }

// //     // Print the response onto the page so that our SDK can read it
// //     res.set("Content-Type: text/plain"); 
// //     res.send(response); 

// // });

// // module.exports = router; 