import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useToast } from '../contexts/ToastContext';
import Icon, { ICONS } from './Icon';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
}

// A safe component to render simple markdown-like bolding.
const FormattedTextMessage = ({ text }: { text: string }) => {
    // Split text by the bold delimiter (**text**), keeping the delimiters
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    // If it's a bold part, render it as <strong>
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                // Otherwise, render it as plain text
                return part;
            })}
        </>
    );
};


const ChatWidget = () => {
    const { config } = useConfiguration();
    const { addToast } = useToast();
    const { t } = useTranslation(['chat', 'common']);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chatWebhookUrl = config?.app_chat;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Generate a new session ID when the widget opens and clear state when it closes.
    useEffect(() => {
        if (isOpen) {
            // Every time the widget opens, start a new session.
            setSessionId(`web-chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
            setMessages([]);
            setIsLoading(false);
            setInputValue('');
        } else {
            // Clear state when closed to ensure a fresh start next time.
            setMessages([]);
            setSessionId(null);
            setIsLoading(false);
            setInputValue('');
        }
    }, [isOpen]);


    if (!chatWebhookUrl) {
        return null;
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || !sessionId) return; // Guard against sending without a session

        const newUserMessage: Message = {
            id: Date.now(),
            text: trimmedInput,
            sender: 'user',
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        // The sessionId is now guaranteed to exist when the chat is open.
        const requestBody = {
            chatInput: trimmedInput,
            sessionId: sessionId,
        };

        try {
            const response = await fetch(chatWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const responseData = await response.json();
            
            let botText = t('fallbackMessage');
            let responsePayload: any;

            // n8n webhook responses are typically an array of items.
            if (Array.isArray(responseData) && responseData.length > 0) {
                // The actual data might be in the root of the item, or nested in a `json` property.
                responsePayload = responseData[0].json || responseData[0];
            } 
            // Fallback for a direct object response.
            else if (typeof responseData === 'object' && responseData !== null) {
                responsePayload = responseData;
            }

            if (responsePayload) {
                // The final response text could be in a 'response' or 'text' property.
                botText = responsePayload.response || responsePayload.text || botText;
            }

            const newBotMessage: Message = {
                id: Date.now() + 1,
                text: botText,
                sender: 'bot',
            };
            setMessages(prev => [...prev, newBotMessage]);

        } catch (error: any) {
            addToast(`${t('error', { ns: 'common' })}: ${error.message}`, 'error');
            const errorMessage: Message = {
                id: Date.now() + 1,
                text: t('connectionError'),
                sender: 'bot',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button className="chat-fab" onClick={() => setIsOpen(true)} aria-label={t('openChat')}>
                <Icon>{ICONS.MESSAGE_SQUARE}</Icon>
            </button>

            {isOpen && <div className="chat-widget-overlay" onClick={() => setIsOpen(false)}></div>}

            <div className={`chat-widget-window ${isOpen ? 'open' : ''}`}>
                <div className="chat-widget-header">
                    <h3>{t('supportChat')}</h3>
                    <button className="chat-widget-close-btn" onClick={() => setIsOpen(false)} aria-label={t('closeChat')}>
                        <Icon>{ICONS.X}</Icon>
                    </button>
                </div>
                <div className="chat-widget-messages">
                    {messages.length === 0 && (
                         <div className="message-bubble bot">
                            {t('initialMessage')}
                        </div>
                    )}
                    {messages.map(msg => (
                        <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                            {msg.sender === 'bot' ? <FormattedTextMessage text={msg.text} /> : msg.text}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message-bubble bot">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form className="chat-widget-input-form" onSubmit={handleSend}>
                    <input
                        type="text"
                        className="chat-widget-input"
                        placeholder={t('typeMessage')}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isLoading}
                    />
                    <button type="submit" className="chat-widget-send-btn" disabled={isLoading || !inputValue.trim()}>
                        <Icon>{ICONS.SEND_EMAIL}</Icon>
                    </button>
                </form>
            </div>
        </>
    );
};

export default ChatWidget;