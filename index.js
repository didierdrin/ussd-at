const express = require('express');
const router = express.Router();
const { firestore } = require('../firebaseConfig'); // Adjust path as needed
const { v4: uuidv4 } = require('uuid');

// In-memory session storage (use Redis/database in production)
const sessions = {};

// Language translations
const translations = {
    en: {
        welcome: "Welcome to Nanenane Fish Agent Portal! 🐟",
        selectLanguage: "Select Language:",
        english: "English",
        swahili: "Swahili",
        registration: "Registration",
        chooseRegType: "Choose your registration type:",
        newFisher: "Register (New Fisher) - No ID required",
        existingMember: "Already a Member",
        userDetails: "User Details",
        enterFullName: "Enter your full name:",
        enterAgentId: "Enter Agent ID:",
        enterUsername: "Enter your username:",
        fishType: "Fish Type",
        enterFishType: "Enter the type of fish:",
        fishDeposit: "Fish Deposit",
        enterWeight: "Enter fish weight in Kg:",
        verification: "Verification",
        verifyDetails: "Please verify your details:",
        approved: "Approved",
        needsCorrection: "Needs Correction",
        submittedSuccess: "APPLICATION SUBMITTED SUCCESSFULLY!",
        submittedCorrection: "APPLICATION SUBMITTED - NEEDS CORRECTION",
        summary: "SUMMARY:",
        fullName: "Full Name:",
        agentId: "Agent ID:",
        username: "Username:",
        userId: "User ID:",
        fishTypeLabel: "Fish Type:",
        fishWeight: "Fish Weight:",
        status: "Status:",
        phone: "Phone:",
        confirmationSms: "Your fish deposit has been recorded. You will receive a confirmation SMS shortly.",
        agentContact: "Our agent will contact you to verify the details. Please keep your fish ready for inspection.",
        thankYou: "Thank you for using Nanenane Fish Agent Portal! 🐟",
        invalidSelection: "Invalid selection. Please try again.",
        sessionError: "Session error. Please dial again to start over.",
        mainMenu: "Main Menu",
        step: "Step"
    },
    sw: {
        welcome: "Karibu kwenye Nanenane Fish Agent Portal! 🐟",
        selectLanguage: "Chagua Lugha:",
        english: "Kiingereza",
        swahili: "Kiswahili",
        registration: "Usajili",
        chooseRegType: "Chagua aina ya usajili wako:",
        newFisher: "Sajili (Mvuvi Mpya) - Hakuna kitambulisho kinahitajika",
        existingMember: "Tayari ni Mwanachama",
        userDetails: "Maelezo ya Mtumiaji",
        enterFullName: "Ingiza jina lako kamili:",
        enterAgentId: "Ingiza kitambulisho cha wakala:",
        enterUsername: "Ingiza jina lako la utumiaji:",
        fishType: "Aina ya Samaki",
        enterFishType: "Ingiza aina ya samaki:",
        fishDeposit: "Uwekaji wa Samaki",
        enterWeight: "Ingiza uzito wa samaki kwa Kg:",
        verification: "Uthibitisho",
        verifyDetails: "Tafadhali thibitisha maelezo yako:",
        approved: "Imeidhinishwa",
        needsCorrection: "Inahitaji Marekebisho",
        submittedSuccess: "OMBI LIMEWASILISHWA KWA MAFANIKIO!",
        submittedCorrection: "OMBI LIMEWASILISHWA - LINAHITAJI MAREKEBISHO",
        summary: "MUHTASARI:",
        fullName: "Jina Kamili:",
        agentId: "Kitambulisho cha Wakala:",
        username: "Jina la Utumiaji:",
        userId: "Kitambulisho cha Mtumiaji:",
        fishTypeLabel: "Aina ya Samaki:",
        fishWeight: "Uzito wa Samaki:",
        status: "Hali:",
        phone: "Simu:",
        confirmationSms: "Uwekaji wako wa samaki umerekodiwa. Utapokea ujumbe wa uthibitisho hivi karibuni.",
        agentContact: "Wakala wetu atawasiliana nawe kuthibitisha maelezo. Tafadhali weka samaki wako tayari kwa ukaguzi.",
        thankYou: "Asante kwa kutumia Nanenane Fish Agent Portal! 🐟",
        invalidSelection: "Uchaguzi si sahihi. Tafadhali jaribu tena.",
        sessionError: "Hitilafu ya kipindi. Tafadhali piga tena kuanza upya.",
        mainMenu: "Menyu Kuu",
        step: "Hatua"
    }
};

// Helper function to get translation
function getText(lang, key) {
    return translations[lang] ? translations[lang][key] : translations['en'][key];
}

// Helper function to generate user ID
function generateUserId(agentId, location, userUuid) {
    return `${agentId}-${location}-${userUuid}`;
}

// Helper function to save user data to Firebase
async function saveUserData(userData) {
    try {
        await firestore.collection('usersNane').add({
            ...userData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('User data saved successfully');
    } catch (error) {
        console.error('Error saving user data:', error);
        throw error;
    }
}

// Helper function to save inventory data to Firebase
async function saveInventoryData(inventoryData) {
    try {
        await firestore.collection('inventoryFisherNane').add({
            ...inventoryData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Inventory data saved successfully');
    } catch (error) {
        console.error('Error saving inventory data:', error);
        throw error;
    }
}

// Helper function to check if user exists
async function checkUserExists(phoneNumber) {
    try {
        const userQuery = await firestore.collection('usersNane')
            .where('phoneNumber', '==', phoneNumber)
            .limit(1)
            .get();
        
        if (!userQuery.empty) {
            return userQuery.docs[0].data();
        }
        return null;
    } catch (error) {
        console.error('Error checking user existence:', error);
        return null;
    }
}

router.post('/ussd', async (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    console.log('########## Request Body:', req.body);
    console.log('########## Current Text:', text);
    console.log('########## Session ID:', sessionId);

    let response = '';
    
    // Initialize session if it doesn't exist
    if (!sessions[sessionId]) {
        sessions[sessionId] = {
            step: 0, // Start with language selection
            language: null,
            userType: null,
            fullName: null,
            agentId: null,
            username: null,
            userId: null,
            fishType: null,
            fishWeight: null,
            verification: null,
            phoneNumber: phoneNumber,
            location: 'default', // You can modify this based on your needs
            userUuid: uuidv4()
        };
    }

    const session = sessions[sessionId];
    const lang = session.language || 'en';

    console.log('########## Current Session:', session);
    console.log('########## Current Step:', session.step);

    try {
        // STEP 0: LANGUAGE SELECTION
        if (text === '') {
            response = `CON ${getText('en', 'welcome')}
${getText('en', 'selectLanguage')}
1. ${getText('en', 'english')}
2. ${getText('en', 'swahili')}`;
            session.step = 0;
        }
        else if (text === '1' && session.step === 0) {
            // English selected
            session.language = 'en';
            response = `CON ${getText('en', 'step')} 1/5: ${getText('en', 'registration')}
${getText('en', 'chooseRegType')}
1. ${getText('en', 'newFisher')}
2. ${getText('en', 'existingMember')}`;
            session.step = 1;
        }
        else if (text === '2' && session.step === 0) {
            // Swahili selected
            session.language = 'sw';
            response = `CON ${getText('sw', 'step')} 1/5: ${getText('sw', 'registration')}
${getText('sw', 'chooseRegType')}
1. ${getText('sw', 'newFisher')}
2. ${getText('sw', 'existingMember')}`;
            session.step = 1;
        }

        // STEP 1: REGISTRATION TYPE
        else if ((text === '1*1' || text === '2*1') && session.step === 1) {
            // New Fisher Registration
            session.userType = 'new';
            response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'newFisher')}
${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
${getText(lang, 'enterFullName')}`;
            session.step = 2;
        }
        else if ((text === '1*2' || text === '2*2') && session.step === 1) {
            // Existing Member - check if user exists
            session.userType = 'existing';
            const existingUser = await checkUserExists(phoneNumber);
            if (existingUser) {
                // User found in database - skip to fish type
                session.fullName = existingUser.fullName;
                session.agentId = existingUser.agentId;
                session.username = existingUser.username;
                session.userId = existingUser.userId;
                session.location = existingUser.location || 'default';
                response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'existingMember')}
👋 ${getText(lang, 'welcome')} ${existingUser.fullName}!
🆔 ${getText(lang, 'userId')} ${existingUser.userId}

${getText(lang, 'step')} 3/5: ${getText(lang, 'fishType')}
${getText(lang, 'enterFishType')}`;
                session.step = 4; // Skip user details collection (steps 2-2.2)
                console.log('########## Existing user found, skipping to step 4 (fish type)');
            } else {
                // User not found - treat as new user and collect details
                response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'existingMember')}
⚠️ User not found in database. Please provide details.
${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
${getText(lang, 'enterFullName')}`;
                session.step = 2;
                console.log('########## Existing user not found, collecting details');
            }
        }

        // STEP 2: FULL NAME
        else if (session.step === 2 && text.includes('*') && text.split('*').length === 3) {
            const fullName = text.split('*')[2];
            session.fullName = fullName;
            response = `CON ✅ ${getText(lang, 'fullName')} ${fullName}
${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
${getText(lang, 'enterAgentId')}`;
            session.step = 2.1;
        }

        // STEP 2.1: AGENT ID
        else if (session.step === 2.1 && text.includes('*') && text.split('*').length === 4) {
            const agentId = text.split('*')[3];
            session.agentId = agentId;
            response = `CON ✅ ${getText(lang, 'agentId')} ${agentId}
${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
${getText(lang, 'enterUsername')}`;
            session.step = 2.2;
        }

        // STEP 2.2: USERNAME
        else if (session.step === 2.2 && text.includes('*') && text.split('*').length === 5) {
            const username = text.split('*')[4];
            session.username = username;
            session.userId = generateUserId(session.agentId, session.location, session.userUuid);
            response = `CON ✅ ${getText(lang, 'username')} ${username}
✅ ${getText(lang, 'userId')} ${session.userId}
${getText(lang, 'step')} 3/5: ${getText(lang, 'fishType')}
${getText(lang, 'enterFishType')}`;
            session.step = 4;
        }

        // STEP 4: FISH TYPE
        else if (session.step === 4) {
            const textParts = text.split('*');
            const fishType = textParts[textParts.length - 1];
            
            console.log('########## Fish Type Input - Text Parts:', textParts);
            console.log('########## Fish Type Input - Fish Type:', fishType);
            
            if (fishType && fishType.trim() !== '' && fishType.trim().length > 0) {
                session.fishType = fishType.trim().toLowerCase();
                response = `CON ✅ ${getText(lang, 'fishTypeLabel')} ${fishType.trim()}
${getText(lang, 'step')} 4/5: ${getText(lang, 'fishDeposit')}
${getText(lang, 'enterWeight')}`;
                session.step = 5;
                console.log('########## Moving to Step 5 - Weight Input');
            } else {
                response = `CON ❌ ${getText(lang, 'invalidSelection')}
${getText(lang, 'step')} 3/5: ${getText(lang, 'fishType')}
${getText(lang, 'enterFishType')}`;
                console.log('########## Invalid fish type, staying at step 4');
            }
        }

        // STEP 5: FISH WEIGHT
        else if (session.step === 5) {
            const textParts = text.split('*');
            const fishWeight = textParts[textParts.length - 1];
            
            console.log('########## Fish Weight Input - Text Parts:', textParts);
            console.log('########## Fish Weight Input - Fish Weight:', fishWeight);
            
            const weightValue = parseFloat(fishWeight);
            if (!isNaN(weightValue) && weightValue > 0) {
                session.fishWeight = weightValue;
                response = `CON ✅ ${getText(lang, 'fishWeight')} ${weightValue} Kg
${getText(lang, 'step')} 5/5: ${getText(lang, 'verification')}
${getText(lang, 'verifyDetails')}
1. ${getText(lang, 'approved')} ✓
2. ${getText(lang, 'needsCorrection')} ✗`;
                session.step = 6;
                console.log('########## Moving to Step 6 - Verification');
            } else {
                response = `CON ❌ ${getText(lang, 'invalidSelection')}
${getText(lang, 'step')} 4/5: ${getText(lang, 'fishDeposit')}
${getText(lang, 'enterWeight')}`;
                console.log('########## Invalid weight, staying at step 5');
            }
        }

        // STEP 6: VERIFICATION & SUBMIT
        else if (session.step === 6) {
            if (text.endsWith('*1')) {
                // Approved - save to Firebase
                session.verification = 'approved';
                
                const userData = {
                    fullName: session.fullName,
                    agentId: session.agentId,
                    username: session.username,
                    userId: session.userId,
                    phoneNumber: session.phoneNumber,
                    location: session.location,
                    userType: session.userType
                };

                const inventoryData = {
                    agentUuid: session.agentId,
                    userUuid: session.userId,
                    fishStockWeight: session.fishWeight,
                    fishType: session.fishType,
                    amountToBePaid: session.fishWeight * 10, // Example calculation
                    location: session.location,
                    status: 'approved'
                };

                // Save to Firebase
                await saveUserData(userData);
                await saveInventoryData(inventoryData);
                
                const userTypeText = session.userType === 'new' ? getText(lang, 'newFisher') : getText(lang, 'existingMember');
                
                response = `END ✅ ${getText(lang, 'submittedSuccess')}

${getText(lang, 'summary')}
👤 ${getText(lang, 'registration')}: ${userTypeText}
👤 ${getText(lang, 'fullName')} ${session.fullName}
🆔 ${getText(lang, 'userId')} ${session.userId}
🐟 ${getText(lang, 'fishTypeLabel')} ${session.fishType}
⚖️ ${getText(lang, 'fishWeight')} ${session.fishWeight} Kg
📋 ${getText(lang, 'status')}: ${getText(lang, 'approved')}
📱 ${getText(lang, 'phone')}: ${phoneNumber}

${getText(lang, 'confirmationSms')}

${getText(lang, 'thankYou')}`;
                
                delete sessions[sessionId];
            }
            else if (text.endsWith('*2')) {
                // Needs correction - save to Firebase with correction status
                session.verification = 'needs_correction';
                
                const userData = {
                    fullName: session.fullName,
                    agentId: session.agentId,
                    username: session.username,
                    userId: session.userId,
                    phoneNumber: session.phoneNumber,
                    location: session.location,
                    userType: session.userType
                };

                const inventoryData = {
                    agentUuid: session.agentId,
                    userUuid: session.userId,
                    fishStockWeight: session.fishWeight,
                    fishType: session.fishType,
                    amountToBePaid: session.fishWeight * 10, // Example calculation
                    location: session.location,
                    status: 'needs_correction'
                };

                // Save to Firebase
                await saveUserData(userData);
                await saveInventoryData(inventoryData);
                
                const userTypeText = session.userType === 'new' ? getText(lang, 'newFisher') : getText(lang, 'existingMember');
                
                response = `END ⚠️ ${getText(lang, 'submittedCorrection')}

${getText(lang, 'summary')}
👤 ${getText(lang, 'registration')}: ${userTypeText}
👤 ${getText(lang, 'fullName')} ${session.fullName}
🆔 ${getText(lang, 'userId')} ${session.userId}
🐟 ${getText(lang, 'fishTypeLabel')} ${session.fishType}
⚖️ ${getText(lang, 'fishWeight')} ${session.fishWeight} Kg
📋 ${getText(lang, 'status')}: ${getText(lang, 'needsCorrection')}
📱 ${getText(lang, 'phone')}: ${phoneNumber}

${getText(lang, 'agentContact')}

${getText(lang, 'thankYou')}`;
                
                delete sessions[sessionId];
            }
        }

        // Handle navigation back to main menu
        else if (text === '0') {
            response = `CON ${getText(lang || 'en', 'welcome')}
${getText(lang || 'en', 'step')} 1/5: ${getText(lang || 'en', 'registration')}
${getText(lang || 'en', 'chooseRegType')}
1. ${getText(lang || 'en', 'newFisher')}
2. ${getText(lang || 'en', 'existingMember')}`;
            session.step = 1;
            // Reset session data but keep language
            const currentLang = session.language;
            Object.keys(session).forEach(key => {
                if (key !== 'phoneNumber' && key !== 'language') {
                    session[key] = null;
                }
            });
            session.language = currentLang;
            session.step = 1;
        }

        // Handle invalid inputs
        else {
            if (session.step === 0) {
                response = `CON ❌ ${getText('en', 'invalidSelection')}
${getText('en', 'selectLanguage')}
1. ${getText('en', 'english')}
2. ${getText('en', 'swahili')}`;
            } else {
                response = `CON ❌ ${getText(lang, 'invalidSelection')}
0. ${getText(lang, 'mainMenu')}`;
            }
        }

    } catch (error) {
        console.error('Error in USSD processing:', error);
        response = `END ❌ ${getText(lang || 'en', 'sessionError')}`;
        delete sessions[sessionId];
    }

    res.set("Content-Type", "text/plain");
    res.send(response);
});

// Clean up old sessions periodically
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
// const { firestore } = require('../firebaseConfig'); // Adjust path as needed
// const { v4: uuidv4 } = require('uuid');

// // In-memory session storage (use Redis/database in production)
// const sessions = {};

// // Language translations
// const translations = {
//     en: {
//         welcome: "Welcome to Nanenane Fish Agent Portal! 🐟",
//         selectLanguage: "Select Language:",
//         english: "English",
//         swahili: "Swahili",
//         registration: "Registration",
//         chooseRegType: "Choose your registration type:",
//         newFisher: "Register (New Fisher) - No ID required",
//         existingMember: "Already a Member",
//         userDetails: "User Details",
//         enterFullName: "Enter your full name:",
//         enterAgentId: "Enter Agent ID:",
//         enterUsername: "Enter your username:",
//         fishType: "Fish Type",
//         enterFishType: "Enter the type of fish:",
//         fishDeposit: "Fish Deposit",
//         enterWeight: "Enter fish weight in Kg:",
//         verification: "Verification",
//         verifyDetails: "Please verify your details:",
//         approved: "Approved",
//         needsCorrection: "Needs Correction",
//         submittedSuccess: "APPLICATION SUBMITTED SUCCESSFULLY!",
//         submittedCorrection: "APPLICATION SUBMITTED - NEEDS CORRECTION",
//         summary: "SUMMARY:",
//         fullName: "Full Name:",
//         agentId: "Agent ID:",
//         username: "Username:",
//         userId: "User ID:",
//         fishTypeLabel: "Fish Type:",
//         fishWeight: "Fish Weight:",
//         status: "Status:",
//         phone: "Phone:",
//         confirmationSms: "Your fish deposit has been recorded. You will receive a confirmation SMS shortly.",
//         agentContact: "Our agent will contact you to verify the details. Please keep your fish ready for inspection.",
//         thankYou: "Thank you for using Nanenane Fish Agent Portal! 🐟",
//         invalidSelection: "Invalid selection. Please try again.",
//         sessionError: "Session error. Please dial again to start over.",
//         mainMenu: "Main Menu",
//         step: "Step"
//     },
//     sw: {
//         welcome: "Karibu kwenye Nanenane Fish Agent Portal! 🐟",
//         selectLanguage: "Chagua Lugha:",
//         english: "Kiingereza",
//         swahili: "Kiswahili",
//         registration: "Usajili",
//         chooseRegType: "Chagua aina ya usajili wako:",
//         newFisher: "Sajili (Mvuvi Mpya) - Hakuna kitambulisho kinahitajika",
//         existingMember: "Tayari ni Mwanachama",
//         userDetails: "Maelezo ya Mtumiaji",
//         enterFullName: "Ingiza jina lako kamili:",
//         enterAgentId: "Ingiza kitambulisho cha wakala:",
//         enterUsername: "Ingiza jina lako la utumiaji:",
//         fishType: "Aina ya Samaki",
//         enterFishType: "Ingiza aina ya samaki:",
//         fishDeposit: "Uwekaji wa Samaki",
//         enterWeight: "Ingiza uzito wa samaki kwa Kg:",
//         verification: "Uthibitisho",
//         verifyDetails: "Tafadhali thibitisha maelezo yako:",
//         approved: "Imeidhinishwa",
//         needsCorrection: "Inahitaji Marekebisho",
//         submittedSuccess: "OMBI LIMEWASILISHWA KWA MAFANIKIO!",
//         submittedCorrection: "OMBI LIMEWASILISHWA - LINAHITAJI MAREKEBISHO",
//         summary: "MUHTASARI:",
//         fullName: "Jina Kamili:",
//         agentId: "Kitambulisho cha Wakala:",
//         username: "Jina la Utumiaji:",
//         userId: "Kitambulisho cha Mtumiaji:",
//         fishTypeLabel: "Aina ya Samaki:",
//         fishWeight: "Uzito wa Samaki:",
//         status: "Hali:",
//         phone: "Simu:",
//         confirmationSms: "Uwekaji wako wa samaki umerekodiwa. Utapokea ujumbe wa uthibitisho hivi karibuni.",
//         agentContact: "Wakala wetu atawasiliana nawe kuthibitisha maelezo. Tafadhali weka samaki wako tayari kwa ukaguzi.",
//         thankYou: "Asante kwa kutumia Nanenane Fish Agent Portal! 🐟",
//         invalidSelection: "Uchaguzi si sahihi. Tafadhali jaribu tena.",
//         sessionError: "Hitilafu ya kipindi. Tafadhali piga tena kuanza upya.",
//         mainMenu: "Menyu Kuu",
//         step: "Hatua"
//     }
// };

// // Helper function to get translation
// function getText(lang, key) {
//     return translations[lang] ? translations[lang][key] : translations['en'][key];
// }

// // Helper function to generate user ID
// function generateUserId(agentId, location, userUuid) {
//     return `${agentId}-${location}-${userUuid}`;
// }

// // Helper function to save user data to Firebase
// async function saveUserData(userData) {
//     try {
//         await firestore.collection('usersNane').add({
//             ...userData,
//             timestamp: admin.firestore.FieldValue.serverTimestamp()
//         });
//         console.log('User data saved successfully');
//     } catch (error) {
//         console.error('Error saving user data:', error);
//         throw error;
//     }
// }

// // Helper function to save inventory data to Firebase
// async function saveInventoryData(inventoryData) {
//     try {
//         await firestore.collection('inventoryFisherNane').add({
//             ...inventoryData,
//             timestamp: admin.firestore.FieldValue.serverTimestamp()
//         });
//         console.log('Inventory data saved successfully');
//     } catch (error) {
//         console.error('Error saving inventory data:', error);
//         throw error;
//     }
// }

// // Helper function to check if user exists
// async function checkUserExists(phoneNumber) {
//     try {
//         const userQuery = await firestore.collection('usersNane')
//             .where('phoneNumber', '==', phoneNumber)
//             .limit(1)
//             .get();
        
//         if (!userQuery.empty) {
//             return userQuery.docs[0].data();
//         }
//         return null;
//     } catch (error) {
//         console.error('Error checking user existence:', error);
//         return null;
//     }
// }

// router.post('/ussd', async (req, res) => {
//     const { sessionId, serviceCode, phoneNumber, text } = req.body;

//     console.log('########## Request Body:', req.body);
//     console.log('########## Current Text:', text);
//     console.log('########## Session ID:', sessionId);

//     let response = '';
    
//     // Initialize session if it doesn't exist
//     if (!sessions[sessionId]) {
//         sessions[sessionId] = {
//             step: 0, // Start with language selection
//             language: null,
//             userType: null,
//             fullName: null,
//             agentId: null,
//             username: null,
//             userId: null,
//             fishType: null,
//             fishWeight: null,
//             verification: null,
//             phoneNumber: phoneNumber,
//             location: 'default', // You can modify this based on your needs
//             userUuid: uuidv4()
//         };
//     }

//     const session = sessions[sessionId];
//     const lang = session.language || 'en';

//     console.log('########## Current Session:', session);
//     console.log('########## Current Step:', session.step);

//     try {
//         // STEP 0: LANGUAGE SELECTION
//         if (text === '') {
//             response = `CON ${getText('en', 'welcome')}
// ${getText('en', 'selectLanguage')}
// 1. ${getText('en', 'english')}
// 2. ${getText('en', 'swahili')}`;
//             session.step = 0;
//         }
//         else if (text === '1' && session.step === 0) {
//             // English selected
//             session.language = 'en';
//             response = `CON ${getText('en', 'step')} 1/5: ${getText('en', 'registration')}
// ${getText('en', 'chooseRegType')}
// 1. ${getText('en', 'newFisher')}
// 2. ${getText('en', 'existingMember')}`;
//             session.step = 1;
//         }
//         else if (text === '2' && session.step === 0) {
//             // Swahili selected
//             session.language = 'sw';
//             response = `CON ${getText('sw', 'step')} 1/5: ${getText('sw', 'registration')}
// ${getText('sw', 'chooseRegType')}
// 1. ${getText('sw', 'newFisher')}
// 2. ${getText('sw', 'existingMember')}`;
//             session.step = 1;
//         }

//         // STEP 1: REGISTRATION TYPE
//         else if ((text === '1*1' || text === '2*1') && session.step === 1) {
//             // New Fisher Registration
//             session.userType = 'new';
//             response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'newFisher')}
// ${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
// ${getText(lang, 'enterFullName')}`;
//             session.step = 2;
//         }
//         else if ((text === '1*2' || text === '2*2') && session.step === 1) {
//             // Existing Member - check if user exists
//             session.userType = 'existing';
//             const existingUser = await checkUserExists(phoneNumber);
//             if (existingUser) {
//                 session.fullName = existingUser.fullName;
//                 session.agentId = existingUser.agentId;
//                 session.username = existingUser.username;
//                 session.userId = existingUser.userId;
//                 response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'existingMember')}
// ${getText(lang, 'step')} 3/5: ${getText(lang, 'fishType')}
// ${getText(lang, 'enterFishType')}`;
//                 session.step = 4; // Skip user details collection
//             } else {
//                 response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'existingMember')}
// ${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
// ${getText(lang, 'enterFullName')}`;
//                 session.step = 2;
//             }
//         }

//         // STEP 2: FULL NAME
//         else if (session.step === 2 && text.includes('*') && text.split('*').length === 3) {
//             const fullName = text.split('*')[2];
//             session.fullName = fullName;
//             response = `CON ✅ ${getText(lang, 'fullName')} ${fullName}
// ${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
// ${getText(lang, 'enterAgentId')}`;
//             session.step = 2.1;
//         }

//         // STEP 2.1: AGENT ID
//         else if (session.step === 2.1 && text.includes('*') && text.split('*').length === 4) {
//             const agentId = text.split('*')[3];
//             session.agentId = agentId;
//             response = `CON ✅ ${getText(lang, 'agentId')} ${agentId}
// ${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
// ${getText(lang, 'enterUsername')}`;
//             session.step = 2.2;
//         }

//         // STEP 2.2: USERNAME
//         else if (session.step === 2.2 && text.includes('*') && text.split('*').length === 5) {
//             const username = text.split('*')[4];
//             session.username = username;
//             session.userId = generateUserId(session.agentId, session.location, session.userUuid);
//             response = `CON ✅ ${getText(lang, 'username')} ${username}
// ✅ ${getText(lang, 'userId')} ${session.userId}
// ${getText(lang, 'step')} 3/5: ${getText(lang, 'fishType')}
// ${getText(lang, 'enterFishType')}`;
//             session.step = 4;
//         }

//         // STEP 4: FISH TYPE
//         else if (session.step === 4) {
//             const textParts = text.split('*');
//             const fishType = textParts[textParts.length - 1];
            
//             console.log('########## Fish Type Input - Text Parts:', textParts);
//             console.log('########## Fish Type Input - Fish Type:', fishType);
            
//             if (fishType && fishType.trim() !== '' && fishType.trim().length > 0) {
//                 session.fishType = fishType.trim().toLowerCase();
//                 response = `CON ✅ ${getText(lang, 'fishTypeLabel')} ${fishType.trim()}
// ${getText(lang, 'step')} 4/5: ${getText(lang, 'fishDeposit')}
// ${getText(lang, 'enterWeight')}`;
//                 session.step = 5;
//                 console.log('########## Moving to Step 5 - Weight Input');
//             } else {
//                 response = `CON ❌ ${getText(lang, 'invalidSelection')}
// ${getText(lang, 'step')} 3/5: ${getText(lang, 'fishType')}
// ${getText(lang, 'enterFishType')}`;
//                 console.log('########## Invalid fish type, staying at step 4');
//             }
//         }

//         // STEP 5: FISH WEIGHT
//         else if (session.step === 5) {
//             const textParts = text.split('*');
//             const fishWeight = textParts[textParts.length - 1];
            
//             console.log('########## Fish Weight Input - Text Parts:', textParts);
//             console.log('########## Fish Weight Input - Fish Weight:', fishWeight);
            
//             const weightValue = parseFloat(fishWeight);
//             if (!isNaN(weightValue) && weightValue > 0) {
//                 session.fishWeight = weightValue;
//                 response = `CON ✅ ${getText(lang, 'fishWeight')} ${weightValue} Kg
// ${getText(lang, 'step')} 5/5: ${getText(lang, 'verification')}
// ${getText(lang, 'verifyDetails')}
// 1. ${getText(lang, 'approved')} ✓
// 2. ${getText(lang, 'needsCorrection')} ✗`;
//                 session.step = 6;
//                 console.log('########## Moving to Step 6 - Verification');
//             } else {
//                 response = `CON ❌ ${getText(lang, 'invalidSelection')}
// ${getText(lang, 'step')} 4/5: ${getText(lang, 'fishDeposit')}
// ${getText(lang, 'enterWeight')}`;
//                 console.log('########## Invalid weight, staying at step 5');
//             }
//         }

//         // STEP 6: VERIFICATION & SUBMIT
//         else if (session.step === 6) {
//             if (text.endsWith('*1')) {
//                 // Approved - save to Firebase
//                 session.verification = 'approved';
                
//                 const userData = {
//                     fullName: session.fullName,
//                     agentId: session.agentId,
//                     username: session.username,
//                     userId: session.userId,
//                     phoneNumber: session.phoneNumber,
//                     location: session.location,
//                     userType: session.userType
//                 };

//                 const inventoryData = {
//                     agentUuid: session.agentId,
//                     userUuid: session.userId,
//                     fishStockWeight: session.fishWeight,
//                     fishType: session.fishType,
//                     amountToBePaid: session.fishWeight * 10, // Example calculation
//                     location: session.location,
//                     status: 'approved'
//                 };

//                 // Save to Firebase
//                 await saveUserData(userData);
//                 await saveInventoryData(inventoryData);
                
//                 const userTypeText = session.userType === 'new' ? getText(lang, 'newFisher') : getText(lang, 'existingMember');
                
//                 response = `END ✅ ${getText(lang, 'submittedSuccess')}

// ${getText(lang, 'summary')}
// 👤 ${getText(lang, 'registration')}: ${userTypeText}
// 👤 ${getText(lang, 'fullName')} ${session.fullName}
// 🆔 ${getText(lang, 'userId')} ${session.userId}
// 🐟 ${getText(lang, 'fishTypeLabel')} ${session.fishType}
// ⚖️ ${getText(lang, 'fishWeight')} ${session.fishWeight} Kg
// 📋 ${getText(lang, 'status')}: ${getText(lang, 'approved')}
// 📱 ${getText(lang, 'phone')}: ${phoneNumber}

// ${getText(lang, 'confirmationSms')}

// ${getText(lang, 'thankYou')}`;
                
//                 delete sessions[sessionId];
//             }
//             else if (text.endsWith('*2')) {
//                 // Needs correction - save to Firebase with correction status
//                 session.verification = 'needs_correction';
                
//                 const userData = {
//                     fullName: session.fullName,
//                     agentId: session.agentId,
//                     username: session.username,
//                     userId: session.userId,
//                     phoneNumber: session.phoneNumber,
//                     location: session.location,
//                     userType: session.userType
//                 };

//                 const inventoryData = {
//                     agentUuid: session.agentId,
//                     userUuid: session.userId,
//                     fishStockWeight: session.fishWeight,
//                     fishType: session.fishType,
//                     amountToBePaid: session.fishWeight * 10, // Example calculation
//                     location: session.location,
//                     status: 'needs_correction'
//                 };

//                 // Save to Firebase
//                 await saveUserData(userData);
//                 await saveInventoryData(inventoryData);
                
//                 const userTypeText = session.userType === 'new' ? getText(lang, 'newFisher') : getText(lang, 'existingMember');
                
//                 response = `END ⚠️ ${getText(lang, 'submittedCorrection')}

// ${getText(lang, 'summary')}
// 👤 ${getText(lang, 'registration')}: ${userTypeText}
// 👤 ${getText(lang, 'fullName')} ${session.fullName}
// 🆔 ${getText(lang, 'userId')} ${session.userId}
// 🐟 ${getText(lang, 'fishTypeLabel')} ${session.fishType}
// ⚖️ ${getText(lang, 'fishWeight')} ${session.fishWeight} Kg
// 📋 ${getText(lang, 'status')}: ${getText(lang, 'needsCorrection')}
// 📱 ${getText(lang, 'phone')}: ${phoneNumber}

// ${getText(lang, 'agentContact')}

// ${getText(lang, 'thankYou')}`;
                
//                 delete sessions[sessionId];
//             }
//         }

//         // Handle navigation back to main menu
//         else if (text === '0') {
//             response = `CON ${getText(lang || 'en', 'welcome')}
// ${getText(lang || 'en', 'step')} 1/5: ${getText(lang || 'en', 'registration')}
// ${getText(lang || 'en', 'chooseRegType')}
// 1. ${getText(lang || 'en', 'newFisher')}
// 2. ${getText(lang || 'en', 'existingMember')}`;
//             session.step = 1;
//             // Reset session data but keep language
//             const currentLang = session.language;
//             Object.keys(session).forEach(key => {
//                 if (key !== 'phoneNumber' && key !== 'language') {
//                     session[key] = null;
//                 }
//             });
//             session.language = currentLang;
//             session.step = 1;
//         }

//         // Handle invalid inputs
//         else {
//             if (session.step === 0) {
//                 response = `CON ❌ ${getText('en', 'invalidSelection')}
// ${getText('en', 'selectLanguage')}
// 1. ${getText('en', 'english')}
// 2. ${getText('en', 'swahili')}`;
//             } else {
//                 response = `CON ❌ ${getText(lang, 'invalidSelection')}
// 0. ${getText(lang, 'mainMenu')}`;
//             }
//         }

//     } catch (error) {
//         console.error('Error in USSD processing:', error);
//         response = `END ❌ ${getText(lang || 'en', 'sessionError')}`;
//         delete sessions[sessionId];
//     }

//     res.set("Content-Type", "text/plain");
//     res.send(response);
// });

// // Clean up old sessions periodically
// setInterval(() => {
//     const now = Date.now();
//     Object.keys(sessions).forEach(sessionId => {
//         if (!sessions[sessionId].lastActivity) {
//             sessions[sessionId].lastActivity = now;
//         } else if (now - sessions[sessionId].lastActivity > 300000) { // 5 minutes
//             delete sessions[sessionId];
//         }
//     });
// }, 60000); // Clean every minute

// module.exports = router;


// ______________________________________

// const express = require('express');
// const router = express.Router();
// const { firestore } = require('./firebaseConfig'); // Adjust path as needed
// const { v4: uuidv4 } = require('uuid');

// // In-memory session storage (use Redis/database in production)
// const sessions = {};

// // Language translations
// const translations = {
//     en: {
//         welcome: "Welcome to Nanenane Fish Agent Portal! 🐟",
//         selectLanguage: "Select Language:",
//         english: "English",
//         swahili: "Swahili",
//         registration: "Registration",
//         chooseRegType: "Choose your registration type:",
//         newFisher: "Register (New Fisher) - No ID required",
//         existingMember: "Already a Member",
//         userDetails: "User Details",
//         enterFullName: "Enter your full name:",
//         enterAgentId: "Enter Agent ID:",
//         enterUsername: "Enter your username:",
//         fishType: "Fish Type",
//         enterFishType: "Enter the type of fish:",
//         fishDeposit: "Fish Deposit",
//         enterWeight: "Enter fish weight in Kg:",
//         verification: "Verification",
//         verifyDetails: "Please verify your details:",
//         approved: "Approved",
//         needsCorrection: "Needs Correction",
//         submittedSuccess: "APPLICATION SUBMITTED SUCCESSFULLY!",
//         submittedCorrection: "APPLICATION SUBMITTED - NEEDS CORRECTION",
//         summary: "SUMMARY:",
//         fullName: "Full Name:",
//         agentId: "Agent ID:",
//         username: "Username:",
//         userId: "User ID:",
//         fishTypeLabel: "Fish Type:",
//         fishWeight: "Fish Weight:",
//         status: "Status:",
//         phone: "Phone:",
//         confirmationSms: "Your fish deposit has been recorded. You will receive a confirmation SMS shortly.",
//         agentContact: "Our agent will contact you to verify the details. Please keep your fish ready for inspection.",
//         thankYou: "Thank you for using Nanenane Fish Agent Portal! 🐟",
//         invalidSelection: "Invalid selection. Please try again.",
//         sessionError: "Session error. Please dial again to start over.",
//         mainMenu: "Main Menu",
//         step: "Step"
//     },
//     sw: {
//         welcome: "Karibu kwenye Nanenane Fish Agent Portal! 🐟",
//         selectLanguage: "Chagua Lugha:",
//         english: "Kiingereza",
//         swahili: "Kiswahili",
//         registration: "Usajili",
//         chooseRegType: "Chagua aina ya usajili wako:",
//         newFisher: "Sajili (Mvuvi Mpya) - Hakuna kitambulisho kinahitajika",
//         existingMember: "Tayari ni Mwanachama",
//         userDetails: "Maelezo ya Mtumiaji",
//         enterFullName: "Ingiza jina lako kamili:",
//         enterAgentId: "Ingiza kitambulisho cha wakala:",
//         enterUsername: "Ingiza jina lako la utumiaji:",
//         fishType: "Aina ya Samaki",
//         enterFishType: "Ingiza aina ya samaki:",
//         fishDeposit: "Uwekaji wa Samaki",
//         enterWeight: "Ingiza uzito wa samaki kwa Kg:",
//         verification: "Uthibitisho",
//         verifyDetails: "Tafadhali thibitisha maelezo yako:",
//         approved: "Imeidhinishwa",
//         needsCorrection: "Inahitaji Marekebisho",
//         submittedSuccess: "OMBI LIMEWASILISHWA KWA MAFANIKIO!",
//         submittedCorrection: "OMBI LIMEWASILISHWA - LINAHITAJI MAREKEBISHO",
//         summary: "MUHTASARI:",
//         fullName: "Jina Kamili:",
//         agentId: "Kitambulisho cha Wakala:",
//         username: "Jina la Utumiaji:",
//         userId: "Kitambulisho cha Mtumiaji:",
//         fishTypeLabel: "Aina ya Samaki:",
//         fishWeight: "Uzito wa Samaki:",
//         status: "Hali:",
//         phone: "Simu:",
//         confirmationSms: "Uwekaji wako wa samaki umerekodiwa. Utapokea ujumbe wa uthibitisho hivi karibuni.",
//         agentContact: "Wakala wetu atawasiliana nawe kuthibitisha maelezo. Tafadhali weka samaki wako tayari kwa ukaguzi.",
//         thankYou: "Asante kwa kutumia Nanenane Fish Agent Portal! 🐟",
//         invalidSelection: "Uchaguzi si sahihi. Tafadhali jaribu tena.",
//         sessionError: "Hitilafu ya kipindi. Tafadhali piga tena kuanza upya.",
//         mainMenu: "Menyu Kuu",
//         step: "Hatua"
//     }
// };

// // Helper function to get translation
// function getText(lang, key) {
//     return translations[lang] ? translations[lang][key] : translations['en'][key];
// }

// // Helper function to generate user ID
// function generateUserId(agentId, location, userUuid) {
//     return `${agentId}-${location}-${userUuid}`;
// }

// // Helper function to save user data to Firebase
// async function saveUserData(userData) {
//     try {
//         await firestore.collection('usersNane').add({
//             ...userData,
//             timestamp: admin.firestore.FieldValue.serverTimestamp()
//         });
//         console.log('User data saved successfully');
//     } catch (error) {
//         console.error('Error saving user data:', error);
//         throw error;
//     }
// }

// // Helper function to save inventory data to Firebase
// async function saveInventoryData(inventoryData) {
//     try {
//         await firestore.collection('inventoryFisherNane').add({
//             ...inventoryData,
//             timestamp: admin.firestore.FieldValue.serverTimestamp()
//         });
//         console.log('Inventory data saved successfully');
//     } catch (error) {
//         console.error('Error saving inventory data:', error);
//         throw error;
//     }
// }

// // Helper function to check if user exists
// async function checkUserExists(phoneNumber) {
//     try {
//         const userQuery = await firestore.collection('usersNane')
//             .where('phoneNumber', '==', phoneNumber)
//             .limit(1)
//             .get();
        
//         if (!userQuery.empty) {
//             return userQuery.docs[0].data();
//         }
//         return null;
//     } catch (error) {
//         console.error('Error checking user existence:', error);
//         return null;
//     }
// }

// router.post('/ussd', async (req, res) => {
//     const { sessionId, serviceCode, phoneNumber, text } = req.body;

//     console.log('##########', req.body);

//     let response = '';
    
//     // Initialize session if it doesn't exist
//     if (!sessions[sessionId]) {
//         sessions[sessionId] = {
//             step: 0, // Start with language selection
//             language: null,
//             userType: null,
//             fullName: null,
//             agentId: null,
//             username: null,
//             userId: null,
//             fishType: null,
//             fishWeight: null,
//             verification: null,
//             phoneNumber: phoneNumber,
//             location: 'default', // You can modify this based on your needs
//             userUuid: uuidv4()
//         };
//     }

//     const session = sessions[sessionId];
//     const lang = session.language || 'en';

//     try {
//         // STEP 0: LANGUAGE SELECTION
//         if (text === '') {
//             response = `CON ${getText('en', 'welcome')}
// ${getText('en', 'selectLanguage')}
// 1. ${getText('en', 'english')}
// 2. ${getText('en', 'swahili')}`;
//             session.step = 0;
//         }
//         else if (text === '1' && session.step === 0) {
//             // English selected
//             session.language = 'en';
//             response = `CON ${getText('en', 'step')} 1/5: ${getText('en', 'registration')}
// ${getText('en', 'chooseRegType')}
// 1. ${getText('en', 'newFisher')}
// 2. ${getText('en', 'existingMember')}`;
//             session.step = 1;
//         }
//         else if (text === '2' && session.step === 0) {
//             // Swahili selected
//             session.language = 'sw';
//             response = `CON ${getText('sw', 'step')} 1/5: ${getText('sw', 'registration')}
// ${getText('sw', 'chooseRegType')}
// 1. ${getText('sw', 'newFisher')}
// 2. ${getText('sw', 'existingMember')}`;
//             session.step = 1;
//         }

//         // STEP 1: REGISTRATION TYPE
//         else if ((text === '1*1' || text === '2*1') && session.step === 1) {
//             // New Fisher Registration
//             session.userType = 'new';
//             response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'newFisher')}
// ${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
// ${getText(lang, 'enterFullName')}`;
//             session.step = 2;
//         }
//         else if ((text === '1*2' || text === '2*2') && session.step === 1) {
//             // Existing Member - check if user exists
//             session.userType = 'existing';
//             const existingUser = await checkUserExists(phoneNumber);
//             if (existingUser) {
//                 session.fullName = existingUser.fullName;
//                 session.agentId = existingUser.agentId;
//                 session.username = existingUser.username;
//                 session.userId = existingUser.userId;
//                 response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'existingMember')}
// ${getText(lang, 'step')} 3/5: ${getText(lang, 'fishType')}
// ${getText(lang, 'enterFishType')}`;
//                 session.step = 4; // Skip user details collection
//             } else {
//                 response = `CON ✅ ${getText(lang, 'registration')}: ${getText(lang, 'existingMember')}
// ${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
// ${getText(lang, 'enterFullName')}`;
//                 session.step = 2;
//             }
//         }

//         // STEP 2: FULL NAME
//         else if (session.step === 2 && text.includes('*') && text.split('*').length === 3) {
//             const fullName = text.split('*')[2];
//             session.fullName = fullName;
//             response = `CON ✅ ${getText(lang, 'fullName')} ${fullName}
// ${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
// ${getText(lang, 'enterAgentId')}`;
//             session.step = 2.1;
//         }

//         // STEP 2.1: AGENT ID
//         else if (session.step === 2.1 && text.includes('*') && text.split('*').length === 4) {
//             const agentId = text.split('*')[3];
//             session.agentId = agentId;
//             response = `CON ✅ ${getText(lang, 'agentId')} ${agentId}
// ${getText(lang, 'step')} 2/5: ${getText(lang, 'userDetails')}
// ${getText(lang, 'enterUsername')}`;
//             session.step = 2.2;
//         }

//         // STEP 2.2: USERNAME
//         else if (session.step === 2.2 && text.includes('*') && text.split('*').length === 5) {
//             const username = text.split('*')[4];
//             session.username = username;
//             session.userId = generateUserId(session.agentId, session.location, session.userUuid);
//             response = `CON ✅ ${getText(lang, 'username')} ${username}
// ✅ ${getText(lang, 'userId')} ${session.userId}
// ${getText(lang, 'step')} 3/5: ${getText(lang, 'fishType')}
// ${getText(lang, 'enterFishType')}`;
//             session.step = 4;
//         }

//         // STEP 4: FISH TYPE
//         else if (session.step === 4 && text.includes('*')) {
//             const fishType = text.split('*')[text.split('*').length - 1];
//             session.fishType = fishType.toLowerCase();
//             response = `CON ✅ ${getText(lang, 'fishTypeLabel')} ${fishType}
// ${getText(lang, 'step')} 4/5: ${getText(lang, 'fishDeposit')}
// ${getText(lang, 'enterWeight')}`;
//             session.step = 5;
//         }

//         // STEP 5: FISH WEIGHT
//         else if (session.step === 5 && text.includes('*')) {
//             const fishWeight = text.split('*')[text.split('*').length - 1];
//             session.fishWeight = parseFloat(fishWeight);
//             response = `CON ✅ ${getText(lang, 'fishWeight')} ${fishWeight} Kg
// ${getText(lang, 'step')} 5/5: ${getText(lang, 'verification')}
// ${getText(lang, 'verifyDetails')}
// 1. ${getText(lang, 'approved')} ✓
// 2. ${getText(lang, 'needsCorrection')} ✗`;
//             session.step = 6;
//         }

//         // STEP 6: VERIFICATION & SUBMIT
//         else if (session.step === 6) {
//             if (text.endsWith('*1')) {
//                 // Approved - save to Firebase
//                 session.verification = 'approved';
                
//                 const userData = {
//                     fullName: session.fullName,
//                     agentId: session.agentId,
//                     username: session.username,
//                     userId: session.userId,
//                     phoneNumber: session.phoneNumber,
//                     location: session.location,
//                     userType: session.userType
//                 };

//                 const inventoryData = {
//                     agentUuid: session.agentId,
//                     userUuid: session.userId,
//                     fishStockWeight: session.fishWeight,
//                     fishType: session.fishType,
//                     amountToBePaid: session.fishWeight * 10, // Example calculation
//                     location: session.location,
//                     status: 'approved'
//                 };

//                 // Save to Firebase
//                 await saveUserData(userData);
//                 await saveInventoryData(inventoryData);
                
//                 const userTypeText = session.userType === 'new' ? getText(lang, 'newFisher') : getText(lang, 'existingMember');
                
//                 response = `END ✅ ${getText(lang, 'submittedSuccess')}

// ${getText(lang, 'summary')}
// 👤 ${getText(lang, 'registration')}: ${userTypeText}
// 👤 ${getText(lang, 'fullName')} ${session.fullName}
// 🆔 ${getText(lang, 'userId')} ${session.userId}
// 🐟 ${getText(lang, 'fishTypeLabel')} ${session.fishType}
// ⚖️ ${getText(lang, 'fishWeight')} ${session.fishWeight} Kg
// 📋 ${getText(lang, 'status')}: ${getText(lang, 'approved')}
// 📱 ${getText(lang, 'phone')}: ${phoneNumber}

// ${getText(lang, 'confirmationSms')}

// ${getText(lang, 'thankYou')}`;
                
//                 delete sessions[sessionId];
//             }
//             else if (text.endsWith('*2')) {
//                 // Needs correction - save to Firebase with correction status
//                 session.verification = 'needs_correction';
                
//                 const userData = {
//                     fullName: session.fullName,
//                     agentId: session.agentId,
//                     username: session.username,
//                     userId: session.userId,
//                     phoneNumber: session.phoneNumber,
//                     location: session.location,
//                     userType: session.userType
//                 };

//                 const inventoryData = {
//                     agentUuid: session.agentId,
//                     userUuid: session.userId,
//                     fishStockWeight: session.fishWeight,
//                     fishType: session.fishType,
//                     amountToBePaid: session.fishWeight * 10, // Example calculation
//                     location: session.location,
//                     status: 'needs_correction'
//                 };

//                 // Save to Firebase
//                 await saveUserData(userData);
//                 await saveInventoryData(inventoryData);
                
//                 const userTypeText = session.userType === 'new' ? getText(lang, 'newFisher') : getText(lang, 'existingMember');
                
//                 response = `END ⚠️ ${getText(lang, 'submittedCorrection')}

// ${getText(lang, 'summary')}
// 👤 ${getText(lang, 'registration')}: ${userTypeText}
// 👤 ${getText(lang, 'fullName')} ${session.fullName}
// 🆔 ${getText(lang, 'userId')} ${session.userId}
// 🐟 ${getText(lang, 'fishTypeLabel')} ${session.fishType}
// ⚖️ ${getText(lang, 'fishWeight')} ${session.fishWeight} Kg
// 📋 ${getText(lang, 'status')}: ${getText(lang, 'needsCorrection')}
// 📱 ${getText(lang, 'phone')}: ${phoneNumber}

// ${getText(lang, 'agentContact')}

// ${getText(lang, 'thankYou')}`;
                
//                 delete sessions[sessionId];
//             }
//         }

//         // Handle navigation back to main menu
//         else if (text === '0') {
//             response = `CON ${getText(lang || 'en', 'welcome')}
// ${getText(lang || 'en', 'step')} 1/5: ${getText(lang || 'en', 'registration')}
// ${getText(lang || 'en', 'chooseRegType')}
// 1. ${getText(lang || 'en', 'newFisher')}
// 2. ${getText(lang || 'en', 'existingMember')}`;
//             session.step = 1;
//             // Reset session data but keep language
//             const currentLang = session.language;
//             Object.keys(session).forEach(key => {
//                 if (key !== 'phoneNumber' && key !== 'language') {
//                     session[key] = null;
//                 }
//             });
//             session.language = currentLang;
//             session.step = 1;
//         }

//         // Handle invalid inputs
//         else {
//             if (session.step === 0) {
//                 response = `CON ❌ ${getText('en', 'invalidSelection')}
// ${getText('en', 'selectLanguage')}
// 1. ${getText('en', 'english')}
// 2. ${getText('en', 'swahili')}`;
//             } else {
//                 response = `CON ❌ ${getText(lang, 'invalidSelection')}
// 0. ${getText(lang, 'mainMenu')}`;
//             }
//         }

//     } catch (error) {
//         console.error('Error in USSD processing:', error);
//         response = `END ❌ ${getText(lang || 'en', 'sessionError')}`;
//         delete sessions[sessionId];
//     }

//     res.set("Content-Type", "text/plain");
//     res.send(response);
// });

// // Clean up old sessions periodically
// setInterval(() => {
//     const now = Date.now();
//     Object.keys(sessions).forEach(sessionId => {
//         if (!sessions[sessionId].lastActivity) {
//             sessions[sessionId].lastActivity = now;
//         } else if (now - sessions[sessionId].lastActivity > 300000) { // 5 minutes
//             delete sessions[sessionId];
//         }
//     });
// }, 60000); // Clean every minute

// module.exports = router;
