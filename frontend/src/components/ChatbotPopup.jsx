import { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiSend, FiMinimize2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import chatService from '../services/chatService';
import { toast } from 'react-toastify';

const ChatbotPopup = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    if (isOpen && user) {
      loadChatHistory();
    }
  }, [isOpen, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const response = await chatService.getMessages();
      if (response.success && response.data) {
        // Filter bot conversations (where sender_id === receiver_id and bot_response exists)
        const botMessages = response.data.filter(msg => {
          const senderId = msg.sender_id?._id || msg.sender_id;
          const receiverId = msg.receiver_id?._id || msg.receiver_id;
          return String(senderId) === String(receiverId) && msg.bot_response;
        });
        
        // Convert to chat format
        const chatMessages = [];
        botMessages.forEach(msg => {
          chatMessages.push({
            id: msg._id,
            text: msg.message,
            isUser: true,
            timestamp: msg.created_at || new Date().toISOString()
          });
          if (msg.bot_response) {
            chatMessages.push({
              id: `${msg._id}_bot`,
              text: msg.bot_response,
              isUser: false,
              timestamp: msg.updated_at || msg.created_at || new Date().toISOString()
            });
          }
        });
        
        // Sort by timestamp
        chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSendMessage = async (e, quickMessage = null) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    const messageToSend = quickMessage || inputMessage;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage = messageToSend.trim();
    setInputMessage('');
    
    // Scroll to bottom when sending
    setTimeout(() => scrollToBottom(), 100);
    
    // Add user message to UI immediately
    const tempUserMessage = {
      id: `temp_${Date.now()}`,
      text: userMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await chatService.sendBotMessage(userMessage);
      
      if (response.success && response.data) {
        // Remove temp message and add real messages
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== tempUserMessage.id);
          const now = new Date().toISOString();
          return [
            ...filtered,
            {
              id: response.data._id,
              text: userMessage,
              isUser: true,
              timestamp: response.data.created_at || response.data.createdAt || now
            },
            {
              id: `${response.data._id}_bot`,
              text: response.data.bot_response,
              isUser: false,
              timestamp: response.data.updated_at || response.data.updatedAt || response.data.created_at || response.data.createdAt || now
            }
          ];
        });
        
        // Scroll to bottom after response
        setTimeout(() => scrollToBottom(), 200);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message. Please try again.');
      
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      if (isMinimized) {
        setIsMinimized(false);
      } else {
        setIsMinimized(true);
      }
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
        aria-label="Open chatbot"
      >
        <FiMessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isMinimized ? 'w-80' : 'w-96'
      }`}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col h-[600px] max-h-[80vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiMessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/20 rounded transition"
              aria-label={isMinimized ? 'Maximize' : 'Minimize'}
            >
              <FiMinimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded transition"
              aria-label="Close"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-4">
                  <FiMessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium mb-3">Start a conversation with the AI assistant</p>
                  <p className="text-xs mb-4 text-gray-400">
                    Ask about tournaments, matches, registrations, and more!
                  </p>
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Quick questions you can ask:</p>
                    <button
                      onClick={() => handleSendMessage(null, "What are the event prices?")}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      💰 What are the event prices?
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, "What are the weight classes?")}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ⚖️ What are the weight classes?
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, "What are the age groups?")}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📅 What are the age groups?
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, "What are the tournament venues?")}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📍 What are the tournament venues?
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, "Explain belt ranks and kyu details")}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🥋 Explain belt ranks and kyu details
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, "What are the payment methods?")}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      💳 What are the payment methods?
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, "Explain Kata scoring criteria")}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🎯 Explain Kata scoring criteria
                    </button>
                    <button
                      onClick={() => handleSendMessage(null, "Explain Kumite scoring and penalties")}
                      disabled={isLoading}
                      className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ⚔️ Explain Kumite scoring and penalties
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.text.split('\n').map((line, idx) => {
                          // Handle markdown-style bold (**text**)
                          const parts = [];
                          let remaining = line;
                          let boldRegex = /\*\*(.*?)\*\*/g;
                          let lastIndex = 0;
                          let match;
                          
                          while ((match = boldRegex.exec(remaining)) !== null) {
                            // Add text before the match
                            if (match.index > lastIndex) {
                              parts.push(<span key={`text-${idx}-${lastIndex}`}>{remaining.substring(lastIndex, match.index)}</span>);
                            }
                            // Add bold text
                            parts.push(<strong key={`bold-${idx}-${match.index}`} className="font-semibold">{match[1]}</strong>);
                            lastIndex = match.index + match[0].length;
                          }
                          // Add remaining text
                          if (lastIndex < remaining.length) {
                            parts.push(<span key={`text-${idx}-${lastIndex}`}>{remaining.substring(lastIndex)}</span>);
                          }
                          
                          if (parts.length === 0) {
                            parts.push(<span key={`text-${idx}`}>{line}</span>);
                          }
                          
                          return (
                            <div key={idx} className={idx > 0 ? 'mt-2' : ''}>
                              {parts}
                            </div>
                          );
                        })}
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          message.isUser ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {(() => {
                          try {
                            const date = new Date(message.timestamp);
                            if (isNaN(date.getTime())) {
                              return 'Just now';
                            }
                            return date.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch (e) {
                            return 'Just now';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <FiSend className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatbotPopup;

