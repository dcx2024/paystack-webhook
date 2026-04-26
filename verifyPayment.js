//require('dotenv').config(); // Ensure you have your SECRET_KEY in a .env file
const express = require('express');
const crypto = require('crypto');
const axios=require('axios')
const app = express();
const secret = 'sk_test_973b5bd99f0872a513ea7ae6eae157f283102153'


const port = 5000;

// Use express.json() (modern replacement for body-parser)
app.use(express.json());

async function sendWhatsAppMessage(to, text) {
    try {
        await axios({
            method: "POST",
            url: `https://graph.facebook.com/v18.0/1033168876553714/messages`,
            data: {
                messaging_product: "whatsapp",
                to: to,
                text: { body: text },
            },
            headers: {
                Authorization: `Bearer EAASz9lBuHioBRc5KK36dH9T630ugA93GepvWN4qsXWo6px97o4ZAWrRmj1MWreZCzTZACdLJMXkWYZA5AsTA3PFPEnhr5gjjZCa918rEgeHD2WQ3JbNqiz5fyVk8G0NjQhH2amaf1RjoquTLqSGK264qPivuuZAnAMOuTdQZAqipdxGMwKZAQZBbGtFtDq4CQoZAayZAitFgAXbpCVB9nNZBkm1DrT9IV3LKMnAvO1lHOZBBt4Bdt53wi9FDLfR5OZCnRWcQ1V8L79ICyDxZBxcNsqpaGBU`,
                "Content-Type": "application/json",
            },
        });
    } catch (err) {
        console.error("WhatsApp Send Error:", err.response?.data || err.message);
    }
}

app.post('/verify', async(req, res) => {
    try {
        // 1. Paystack sends the signature in the header, not the body
        const signature = req.headers['x-paystack-signature'];

        // 2. Validate the signature
        if (!validatePaystackSignature(signature, req.body)) {
            console.error('Invalid signature detected!');
            return res.status(401).send('Invalid Signature');
        }

        const { event, data } = req.body;
        const sellerPhone = data.metadata?.whatsapp_number;
        const itemName=data.metadata?.item_name
        const reference=data.reference;
        console.log(sellerPhone)
        // 3. Process events
        switch (event) {
            case 'charge.success':
                console.log('Payment successful:', reference);
                // 3. Trigger the WhatsApp message
                if (sellerPhone) {
                    const messageText = `✅ *Payment Received!*\n\nReference: ${reference}\nItem: ${itemName}\n\nThank you for your business!`;
                    await sendWhatsAppMessage(sellerPhone, messageText);
                }
                break;
            case 'charge.failed':
                console.log('Payment failed:', data.reference);
                break;
            case 'transfer.success':
                console.log('Transfer successful:', data.transfer_code);
                break;
            default:
                console.warn('Unhandled event:', event);
                break;
        }

        // 4. Always send a 200 OK back to Paystack quickly
        res.sendStatus(200);

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function validatePaystackSignature(signature, body) {


    // Create the hash using your secret key and the request body
    const hash = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(body))
        .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    return hash === signature;
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
