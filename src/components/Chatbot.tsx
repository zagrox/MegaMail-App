import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import Icon, { ICONS } from './Icon';
import Loader from './Loader';

// Simple markdown to HTML conversion
const markdownToHtml = (text: string) => {
    // Bold **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code `text`
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    // Newlines to <br>
    text = text.replace(/\n/g, '<br />');
    return text;
};

const MessageContent = ({ text, setView }: { text: string, setView: (view: string) => void }) => {
    const parts: (string | React.ReactElement)[] = [];
    const regex = /\[link:([^|]+)\|([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Text before the link
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const viewName = match[1];
        const displayText = match[2];

        // The button element
        parts.push(
            <button key={match.index} className="chatbot-link" onClick={() => setView(viewName)}>
                {displayText}
            </button>
        );

        lastIndex = regex.lastIndex;
    }

    // Text after the last link
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    // Render the parts
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
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const chat = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const initializeChat = () => {
        if (!chat.current) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                chat.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: "You are a friendly and helpful assistant for the MegaMail app. When you suggest a user navigate to a page, you MUST use the format `[link:ViewName|display text]`. Available `ViewName` values are: `Dashboard`, `Statistics`, `Account`, `Buy Credits`, `Contacts`, `Email Lists`, `Segments`, `Media Manager`, `Campaigns`, `Templates`, `Email Builder`, `Calendar`, `Settings`, `Guides`. Be concise and helpful.",
                    },
                });
                setMessages([{
                    role: 'model',
                    text: "Hello! I'm your MegaMail AI assistant. How can I help you today?"
                }]);
            } catch (error) {
                console.error("Failed to initialize Gemini AI:", error);
                setMessages([{
                    role: 'model',
                    text: "Sorry, I couldn't connect to the AI service right now. Please check the API key configuration."
                }]);
            }
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen && messages.length === 0) {
            initializeChat();
        }
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        const userMessage = inputValue.trim();
        if (!userMessage || isLoading) return;

        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        if (!chat.current) {
            setIsLoading(false);
            setMessages(prev => [...prev, { role: 'model', text: "Chat is not initialized. Please try again." }]);
            return;
        }

        try {
            const response = await chat.current.sendMessage({ message: userMessage });
            const modelResponse = response.text;
            setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);
        } catch (error: any) {
            console.error("Gemini API error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button className="chatbot-fab" onClick={toggleChat} aria-label="Open AI Assistant">
                <Icon>{isOpen ? ICONS.X_CIRCLE : ICONS.AI_ICON}</Icon>
            </button>
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-avatar">
                            <Icon>{ICONS.AI_ICON}</Icon>
                        </div>
                        <div className="chatbot-title">
                            <h3>AI Assistant</h3>
                            <span>Online</span>
                        </div>
                        <button className="chatbot-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
                            &times;
                        </button>
                    </div>
                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message-bubble ${msg.role}`}>
                                <MessageContent text={msg.text} setView={setView} />
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message-bubble model">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chatbot-input-form" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            placeholder="Ask a question..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !inputValue.trim()}>
                            <Icon>{ICONS.SEND_EMAIL}</Icon>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;