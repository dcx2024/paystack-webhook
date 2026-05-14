//require('dotenv').config(); // Ensure you have your SECRET_KEY in a .env file
const express = require('express');
const crypto = require('crypto');
const axios=require('axios')
const app = express();


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
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
            },
        });
    } catch (err) {
        console.error("WhatsApp Send Error:", err.response?.data || err.message);
    }
}

async function sendOTPMessage(to, otp) {
    try {
        const url = 'https://api.sms-gate.app/3rdparty/v1/message';

        const payload = {
            textMessage: {
                text: `Your OTP code is: ${otp}` // Dynamic text
            },
            phoneNumbers: [to] // Dynamic phone number
        };

        const response = await axios.post(url, payload, {
            auth: {
                username: process.env.OTP_SERVER_USER, // Recommended to use .env
                password: process.env.OTP_SERVER_PASSWORD 
            }
        });

        console.log('Cloud OTP Server Response:', response.data);
    } catch (error) {
        console.error('OTP Send Error:', error.response ? error.response.data : error.message);
    }
}

app.post('/verify', async(req, res) => {
    try {
         const signature = req.headers['x-paystack-signature'];
        const secret = process.env.PAYSTACK_SECRET_KEY; // Use .env 

        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

        if (hash !== signature) {
            return res.status(401).send('Invalid Signature');
        }

        const { event, data } = req.body;

        if (event === 'charge.success') {
            const sellerPhone = data.metadata?.whatsapp_number;
            const customerPhone=data.metadata?.customer_phone
            const itemName = data.metadata?.item_name;
            const otp = data.metadata?.otp_code;
            const reference = data.reference;
            const amount = data.amount / 100; // Convert kobo to Naira

            if (sellerPhone) {
                const messageText = `✅ *Payment Received!*\n\nRef: ${reference}\nItem: ${itemName}\nAmount: ₦${amount.toLocaleString()}`;
                await sendWhatsAppMessage(sellerPhone, messageText);
            }

            if(customerPhone){
                await sendOTPMessage(customerPhone,otp)
            }
        }
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
