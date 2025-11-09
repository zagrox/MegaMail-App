
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useToast } from '../contexts/ToastContext';
import Icon, { ICONS } from './Icon';
import { navigationKeywords } from '../config/chatNavigation';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    navigationAction?: {
        view: string;
        buttonText: string;
        data?: any;
    } | null;
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


const ChatWidget = ({ setView }: { setView: (view: string, data?: any) => void }) => {
    const { config } = useConfiguration();
    const { addToast } = useToast();
    const { t } = useTranslation(['chat', 'common']);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const sessionIdRef = useRef<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sessionIdRef.current) {
            sessionIdRef.current = `web-chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
    }, []);

    const chatWebhookUrl = config?.app_chat;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const premadeQuestions = [
        t('premadeQuestion1'),
        t('premadeQuestion2'),
        t('premadeQuestion3'),
    ].filter(Boolean);

    const getNavigationAction = (text: string) => {
        const lowerText = text.toLowerCase();
        for (const nav of navigationKeywords) {
            if (nav.keywords.some(keyword => lowerText.includes(keyword))) {
                return {
                    view: nav.view,
                    buttonText: t(nav.buttonTextKey),
                    data: nav.data,
                };
            }
        }
        return null;
    };

    const handleNavigation = (action: Message['navigationAction']) => {
        if (!action) return;
        if(action.data?.tab) {
             sessionStorage.setItem('settings-tab', action.data.tab);
        }
        setView(action.view, action.data);
        setIsOpen(false);
    };

    if (!chatWebhookUrl) {
        return null;
    }

    const sendMessageToServer = async (messageText: string) => {
        const requestBody = {
            chatInput: messageText,
            sessionId: sessionIdRef.current,
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

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Could not read streaming response.');
            }

            const decoder = new TextDecoder();
            let accumulatedText = '';
            
            // Add an empty bot message to start populating
            const newBotMessage: Message = {
                id: Date.now() + 1,
                text: '',
                sender: 'bot',
            };
            setMessages(prev => [...prev, newBotMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.substring(6);
                            const dataObj = JSON.parse(jsonStr);
                            const textChunk = dataObj.response || dataObj.text || dataObj.output || '';
                            
                            if (textChunk) {
                                accumulatedText += textChunk;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastMessage = newMessages[newMessages.length - 1];
                                    if (lastMessage && lastMessage.sender === 'bot') {
                                        lastMessage.text = accumulatedText;
                                    }
                                    return newMessages;
                                });
                            }
                        } catch (e) {
                            console.warn("Could not parse streaming chunk:", line);
                        }
                    }
                }
            }

            // After stream is finished, check for navigation actions
            const navigationAction = getNavigationAction(accumulatedText);
            if (navigationAction) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.sender === 'bot') {
                      lastMessage.navigationAction = navigationAction;
                    }
                    return newMessages;
                });
            }

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
        if (!trimmedInput) return;

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
        if (!question) return;
    
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
                            <div className="message-container bot">
                                <div className="message-bubble bot">
                                    <FormattedTextMessage text={t('initialMessage')} />
                                </div>
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
                        <div key={msg.id} className={`message-container ${msg.sender}`}>
                            <div className={`message-bubble ${msg.sender}`}>
                                {msg.sender === 'bot' ? <FormattedTextMessage text={msg.text} /> : msg.text}
                            </div>
                            {msg.navigationAction && (
                                <div className="navigation-action">
                                    <button className="navigation-action-btn" onClick={() => handleNavigation(msg.navigationAction)}>
                                        <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                                        <span>{msg.navigationAction.buttonText}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.sender !== 'bot' && (
                        <div className="message-container bot">
                            <div className="message-bubble bot">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
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
