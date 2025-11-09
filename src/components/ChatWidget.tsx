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

const FormattedTextMessage = ({ text }: { text: string }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const processInlineFormatting = (line: string) => {
        return line.split(/(\*\*.*?\*\*)/g).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    lines.forEach((line, index) => {
        if (line.trim().startsWith('* ')) {
            listItems.push(<li key={`li-${index}`}>{processInlineFormatting(line.trim().substring(2))}</li>);
        } else {
            if (listItems.length > 0) {
                elements.push(<ul key={`ul-${index - 1}`}>{listItems}</ul>);
                listItems = [];
            }
            if (line.trim() !== '') {
                elements.push(<p key={`p-${index}`}>{processInlineFormatting(line)}</p>);
            }
        }
    });

    if (listItems.length > 0) {
        elements.push(<ul key={`ul-end`}>{listItems}</ul>);
    }

    return <>{elements}</>;
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

    useEffect(() => {
        if (isOpen) {
            setSessionId(`web-chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
            setMessages([]);
            setIsLoading(false);
            setInputValue('');
        } else {
            setMessages([]);
            setSessionId(null);
            setIsLoading(false);
            setInputValue('');
        }
    }, [isOpen]);

    const premadeQuestions = [
        t('premadeQuestion1'),
        t('premadeQuestion2'),
        t('premadeQuestion3'),
    ].filter(Boolean);


    if (!chatWebhookUrl) {
        return null;
    }

    const sendMessageToServer = async (messageText: string) => {
        const requestBody = {
            chatInput: messageText,
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

            if (Array.isArray(responseData) && responseData.length > 0) {
                responsePayload = responseData[0].json || responseData[0];
            } 
            else if (typeof responseData === 'object' && responseData !== null) {
                responsePayload = responseData;
            }

            if (responsePayload) {
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
    
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || !sessionId) return;

        const newUserMessage: Message = {
            id: Date.now(),
            text: trimmedInput,
            sender: 'user',
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        await sendMessageToServer(trimmedInput);
    };

    const handlePremadeQuestionClick = async (question: string) => {
        if (!question || !sessionId) return;
    
        const newUserMessage: Message = { id: Date.now(), text: question, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);
        
        await sendMessageToServer(question);
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
                    {messages.length === 0 && !isLoading && (
                         <>
                            <div className="message-bubble bot">
                                <FormattedTextMessage text={t('initialMessage')} />
                            </div>
                            {premadeQuestions.length > 0 && (
                                <div className="premade-questions">
                                    {premadeQuestions.map((q, i) => (
                                        <button key={i} className="premade-question-btn" onClick={() => handlePremadeQuestionClick(q)}>
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
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