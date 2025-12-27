// Script to manually verify payment and update user credits
const axios = require('axios');

async function verifyPayment() {
    try {
        console.log('Calling verify API...');
        
        const response = await axios.post('http://localhost:3000/api/payments/verify', {
            userEmail: 'darkmotosu@gmail.com',
            planId: 'premium_monthly',
            orderId: 'manual_test_' + Date.now()
        });
        
        console.log('Verify response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

verifyPayment();
