import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    CircularProgress,
    Avatar,
    Chip,
    Fab,
    Zoom
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

// API base URL - backend runs on port 3001
const API_URL = 'http://192.168.75.129:3001';

function ManagerChatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'Bonjour ! Je suis votre assistant IA. Posez-moi des questions sur les incidents, MTTR, services problématiques, etc.',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    
    // Auto scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    const handleSend = async () => {
        if (!input.trim() || loading) return;
        
        const userMessage = {
            role: 'user',
            text: input,
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);
        
        try {
            const response = await axios.post(`${API_URL}/api/chat`, {
                question: input
            }, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const botMessage = {
                role: 'bot',
                text: response.data.answer,
                intent: response.data.intent,
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
                role: 'bot',
                text: 'Désolé, une erreur est survenue. Le chatbot est temporairement indisponible.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    // Suggested questions
    const suggestions = [
        "Quel est le MTTR actuel ?",
        "Service le plus problématique ?",
        "L'IA est-elle efficace ?",
        "Explique incident #1"
    ];
    
    const handleSuggestion = (suggestion) => {
        setInput(suggestion);
    };

    // Chat window content
    const chatWindow = (
        <Paper
            elevation={6}
            sx={{
                position: 'fixed',
                bottom: 100,
                right: 20,
                width: 380,
                height: 500,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 1000,
                borderRadius: 2
            }}
        >
            {/* Header */}
            <Box sx={{ 
                p: 2, 
                bgcolor: 'primary.main', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToyIcon />
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                        Assistant IA
                    </Typography>
                </Box>
                <Button 
                    size="small" 
                    sx={{ color: 'white', minWidth: 'auto' }}
                    onClick={() => setOpen(false)}
                >
                    <CloseIcon />
                </Button>
            </Box>
            
            {/* Messages */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 2,
                    bgcolor: 'grey.50'
                }}
            >
                {messages.map((msg, idx) => (
                    <Box
                        key={idx}
                        sx={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            mb: 2
                        }}
                    >
                        <Box sx={{ display: 'flex', gap: 1, maxWidth: '85%' }}>
                            {msg.role === 'bot' && (
                                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                    <SmartToyIcon sx={{ fontSize: 18 }} />
                                </Avatar>
                            )}
                            
                            <Box>
                                <Paper
                                    elevation={1}
                                    sx={{
                                        p: 1.5,
                                        bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                                        color: msg.role === 'user' ? 'white' : 'text.primary',
                                        borderRadius: 2,
                                        border: msg.role === 'bot' ? 1 : 0,
                                        borderColor: 'divider'
                                    }}
                                >
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'inherit' }}>
                                        {msg.text}
                                    </Typography>
                                    
                                    {msg.intent && (
                                        <Chip
                                            label={msg.intent}
                                            size="small"
                                            sx={{ mt: 0.5, fontSize: '0.65rem', height: 20 }}
                                        />
                                    )}
                                </Paper>
                                
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontSize: '0.7rem' }}>
                                    {msg.timestamp.toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Typography>
                            </Box>
                            
                            {msg.role === 'user' && (
                                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                    <PersonIcon sx={{ fontSize: 18 }} />
                                </Avatar>
                            )}
                        </Box>
                    </Box>
                ))}
                
                {loading && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            <SmartToyIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption" sx={{ ml: 1 }}>
                                Analyse en cours...
                            </Typography>
                        </Paper>
                    </Box>
                )}
                
                <div ref={messagesEndRef} />
            </Box>
            
            {/* Suggestions (only at start) */}
            {messages.length === 1 && (
                <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Suggestions:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {suggestions.map((sug, idx) => (
                            <Chip
                                key={idx}
                                label={sug}
                                size="small"
                                onClick={() => handleSuggestion(sug)}
                                sx={{ 
                                    cursor: 'pointer', 
                                    fontSize: '0.7rem', 
                                    height: 24,
                                    bgcolor: 'action.hover'
                                }}
                            />
                        ))}
                    </Box>
                </Box>
            )}
            
            {/* Input */}
            <Box sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                borderTop: 1, 
                borderColor: 'divider'
            }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Posez votre question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        sx={{ 
                            '& .MuiInputBase-root': { 
                                borderRadius: 2,
                                bgcolor: 'background.default',
                                color: 'text.primary'
                            },
                            '& .MuiInputBase-input::placeholder': {
                                color: 'text.secondary',
                                opacity: 0.7
                            }
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        sx={{ borderRadius: 2, minWidth: 50, height: 40 }}
                    >
                        {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );

    return (
        <>
            {/* Floating Chat Button */}
            <Zoom in={!open}>
                <Fab
                    color="primary"
                    aria-label="chat"
                    onClick={() => setOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 1000
                    }}
                >
                    <ChatIcon />
                </Fab>
            </Zoom>
            
            {/* Chat Window */}
            {open && chatWindow}
        </>
    );
}

export default ManagerChatbot;
