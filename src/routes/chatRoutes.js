const express = require('express');
const router = express.Router();
const axios = require('axios');

// AI Module API URL
const IA_API_URL = process.env.IA_API_URL || 'http://192.168.75.129:5001';


router.post('/', async (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question || !question.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Question is required' 
            });
        }

        // Call AI module Flask API
        const chatUrl = `${IA_API_URL}/api/chat`;
        console.log('[Chatbot] Calling URL:', chatUrl);
        const response = await axios.post(chatUrl, {
            question: question,
            user_role: req.user?.role || 'manager'
        }, {
            timeout: 30000 // 30 second timeout
        });

        res.json({
            success: true,
            answer: response.data.answer,
            intent: response.data.intent,
            data: response.data.data,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('[Chatbot API Error]', error.message);
        console.error('[Chatbot API Error] Full error:', error);
        if (error.code) console.error('[Chatbot API Error] Code:', error.code);
        if (error.response) console.error('[Chatbot API Error] Response:', error.response.data);
        res.status(500).json({
            success: false,
            error: 'Chatbot service temporarily unavailable',
            fallback: 'Please check the dashboard for incident details.'
        });
    }
});

/**
 * GET /api/chat/health
 * Health check for chatbot service
 */
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${IA_API_URL}/health`, {
            timeout: 5000
        });
        res.json({
            success: true,
            status: response.data
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'DOWN',
            error: error.message
        });
    }
});

module.exports = router;
