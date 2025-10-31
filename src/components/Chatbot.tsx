
import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import * as chatbotFunctions from '../api/chatbotFunctions';
import Icon, { ICONS } from './Icon';
import Loader from './Loader';
import { useTranslation } from 'react-i18next';

// Simple markdown to HTML conversion
const markdownToHtml = (text: string) => {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    text = text.replace(/\n/g, '<br />');
    return text;
};

const MessageContent = ({ text, setView }: { text: string, setView: (view: string) => void }) => {
    const parts: (string | React.ReactElement)[] = [];
    const regex = /\[link:([^|]+)\|([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        const viewName = match[1];
        const displayText = match[2];
        parts.push(
            <button key={match.index} className="chatbot-link" onClick={() => setView(viewName)}>
                {displayText}
            </button>
        );
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }
    return (
        <>
            {parts.map((part, i) =>
                typeof part === 'string' ? (
                    <span key={i} dangerouslySetInnerHTML={{ __html: markdownToHtml(part) }} />
                ) : (
                    part
                )
            )}
        </>
    );
};

const Chatbot = ({ setView }: { setView: (view: string, data?: any) => void }) => {
    const { t, i18n } = useTranslation(['chatbot', 'common']);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const chat = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const apiKey = user?.elastickey;
    const currentLang = useRef(i18n.language);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const initializeChat = useCallback(() => {
        setIsLoading(true);
        setMessages([]); // Clear previous messages
        chat.current = null; // Reset chat instance
        try {
            const getCreditBalanceTool: FunctionDeclaration = { name: 'getCreditBalance', description: t('functions.getCreditBalance'), parameters: { type: Type.OBJECT, properties: {} } };
            const getTotalContactCountTool: FunctionDeclaration = { name: 'getTotalContactCount', description: t('functions.getTotalContactCount'), parameters: { type: Type.OBJECT, properties: {} } };
            const listVerifiedDomainsTool: FunctionDeclaration = { name: 'listVerifiedDomains', description: t('functions.listVerifiedDomains'), parameters: { type: Type.OBJECT, properties: {} } };
            
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            chat.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: t('systemInstruction'),
                    tools: [{ functionDeclarations: [getCreditBalanceTool, getTotalContactCountTool, listVerifiedDomainsTool] }],
                },
            });
            setMessages([{ role: 'model', text: t('initialMessage') }]);
        } catch (error) {
            console.error("Failed to initialize Gemini AI:", error);
            setMessages([{ role: 'model', text: t('errorConnect') }]);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    // Handle language change
    useEffect(() => {
        if (i18n.language !== currentLang.current) {
            currentLang.current = i18n.language;
            if (isOpen) {
                initializeChat();
            } else {
                // If closed, just reset for next opening
                setMessages([]);
                chat.current = null;
            }
        }
    }, [i18n.language, isOpen, initializeChat]);

    const toggleChat = () => {
        const nextIsOpen = !isOpen;
        setIsOpen(nextIsOpen);
        if (nextIsOpen && !chat.current) {
            initializeChat();
        }
    };
    
    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        const userMessage = inputValue.trim();
        if (!userMessage || isLoading || !apiKey) return;

        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        if (!chat.current) {
            setIsLoading(false);
            setMessages(prev => [...prev, { role: 'model', text: t('errorNotInitialized') }]);
            return;
        }

        try {
            let response: GenerateContentResponse = await chat.current.sendMessage({ message: userMessage });

            while (response.functionCalls && response.functionCalls.length > 0) {
                const functionCalls = response.functionCalls;
                const functionResponses = [];

                for (const call of functionCalls) {
                    let functionResult;
                    try {
                        switch (call.name) {
                            case 'getCreditBalance':
                                const balance = await chatbotFunctions.getCreditBalance(apiKey);
                                functionResult = { balance };
                                break;
                            case 'getTotalContactCount':
                                const count = await chatbotFunctions.getTotalContactCount(apiKey);
                                functionResult = { count };
                                break;
                            case 'listVerifiedDomains':
                                const domains = await chatbotFunctions.listVerifiedDomains(apiKey);
                                functionResult = { domains };
                                break;
                            default:
                                throw new Error(`Unknown function call requested by the model: ${call.name}`);
                        }
                        functionResponses.push({ id: call.id, name: call.name, response: functionResult });
                    } catch (funcError: any) {
                        functionResponses.push({ id: call.id, name: call.name, response: { error: funcError.message || 'Function execution failed.' } });
                    }
                }

                response = await chat.current.sendMessage({ toolResponse: { functionResponses } });
            }
            
            const modelResponse = response.text;
            setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);

        } catch (error: any) {
            console.error("Gemini API error:", error);
            setMessages(prev => [...prev, { role: 'model', text: t('errorGeneral') }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button className="chatbot-fab" onClick={toggleChat} aria-label={t('openAIAssistant')}>
                <Icon>{isOpen ? ICONS.X_CIRCLE : ICONS.AI_ICON}</Icon>
            </button>
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-avatar"><Icon>{ICONS.AI_ICON}</Icon></div>
                        <div className="chatbot-title">
                            <h3>{t('aiAssistant')}</h3>
                            <span>{t('online')}</span>
                        </div>
                        <button className="chatbot-close" onClick={() => setIsOpen(false)} aria-label={t('closeChat')}>&times;</button>
                    </div>
                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message-bubble ${msg.role}`}>
                                <MessageContent text={msg.text} setView={setView} />
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message-bubble model">
                                <div className="typing-indicator"><span></span><span></span><span></span></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chatbot-input-form" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            placeholder={t('inputPlaceholder')}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !inputValue.trim()}><Icon>{ICONS.SEND_EMAIL}</Icon></button>
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;
