import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import { setSessionId, setChatHistory, clearChat, addUserMessage, startStreaming, addStreamChunk, endStreaming, addError } from './store/messageSlice';
import './components/Chat.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(0);
  const [userCaptchaInput, setUserCaptchaInput] = useState('');

  const messages = useSelector((state) => state.messages.list);
  const isStreaming = useSelector((state) => state.messages.isStreaming);
  const sessionId = useSelector((state) => state.messages.sessionId);
  const dispatch = useDispatch();
  
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion(`${num1} + ${num2}`);
    setCaptchaAnswer(num1 + num2);
    setUserCaptchaInput('');
  };

  useEffect(() => {
    if (!isLoggedIn) {
      generateCaptcha();
    }
  }, [isLoggedIn, authMode]);

  const handleAuth = async () => {
    setAuthError('');
    
    if (parseInt(userCaptchaInput) !== captchaAnswer) {
      setAuthError('Verifikasi SALAH');
      generateCaptcha();
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setAuthError('Password ga matching woy');
      return;
    }

    try {
      const endpoint = authMode === 'signup' ? 'signup' : 'signin';
      const res = await fetch(`http://localhost:5000/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        setLoggedInUser(data.username);
        setIsLoggedIn(true);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setAuthError(data.error);
        generateCaptcha();
      }
    } catch (error) {
      setAuthError('Gagal konek ke server');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUser('');
    dispatch(clearChat());
    setRecentChats([]);
    setIsSidebarOpen(false);
  };

  const fetchSessions = async () => {
    if (!loggedInUser) return;
    try {
      const res = await fetch(`http://localhost:5000/api/sessions?username=${loggedInUser}`);
      const data = await res.json();
      setRecentChats(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchSessions();
    }
  }, [isLoggedIn, loggedInUser]);

  const loadChat = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${id}`);
      const data = await res.json();
      const formattedMessages = data.map(msg => ({
        sender: msg.peran === 'user' ? 'user' : 'ai',
        text: msg.konten
      }));
      dispatch(setSessionId(id));
      dispatch(setChatHistory(formattedMessages));
      setIsSidebarOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleNewChat = () => {
    dispatch(clearChat());
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    ws.current = new WebSocket('ws://localhost:3001');

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'session_created') {
        dispatch(setSessionId(data.sessionId));
        fetchSessions();
      } else if (data.type === 'start') {
        dispatch(startStreaming());
      } else if (data.type === 'stream') {
        dispatch(addStreamChunk(data.text));
      } else if (data.type === 'end') {
        dispatch(endStreaming());
      } else if (data.type === 'error') {
        dispatch(addError('Error: ' + data.text));
      }
    };

    return () => ws.current.close();
  }, [dispatch, isLoggedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || isStreaming) return;

    dispatch(addUserMessage(input));
    ws.current.send(JSON.stringify({ text: input, sessionId: sessionId, username: loggedInUser }));
    setInput('');
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-title">
            {authMode === 'signin' ? 'Log In Chatbot' : 'Buat Akun Baru'}
          </div>
          {authError && <div className="auth-error">{authError}</div>}
          
          <input 
            type="text" 
            className="auth-input" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <input 
            type="password" 
            className="auth-input" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          
          {authMode === 'signup' && (
            <input 
              type="password" 
              className="auth-input" 
              placeholder="Konfirmasi Password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
            />
          )}

          <div className="captcha-container">
            <div className="captcha-text">{captchaQuestion} = ?</div>
            <input 
              type="text" 
              className="captcha-input" 
              placeholder="Hasilnya?" 
              value={userCaptchaInput} 
              onChange={(e) => setUserCaptchaInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            />
          </div>

          <button className="auth-button" onClick={handleAuth}>
            {authMode === 'signin' ? 'Masuk' : 'Daftar'}
          </button>
          
          <button 
            className="auth-toggle" 
            onClick={() => {
              setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
              setAuthError('');
            }}
          >
            {authMode === 'signin' ? 'Belum punya akun? Daftar dulu woy' : 'Sudah punya akun? Log in disini woy'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-layout ${isDarkMode ? 'dark' : ''}`}>
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span>Recent Chats</span>
          <button className="close-sidebar" onClick={() => setIsSidebarOpen(false)}>×</button>
        </div>
        
        <div style={{ padding: '10px' }}>
          <button 
            onClick={handleNewChat}
            style={{ width: '100%', padding: '10px', backgroundColor: '#10a37f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            + New Chat
          </button>
        </div>

        <div className="recent-chats-list">
          {recentChats.map((chat) => (
            <div 
              key={chat.id_session} 
              className="recent-chat-item"
              onClick={() => loadChat(chat.id_session)}
              style={{ backgroundColor: sessionId === chat.id_session ? (isDarkMode ? '#40414f' : '#e5e5e5') : '' }}
            >
              💬 {chat.judul}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="theme-toggle-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>

      <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)} />

      <div className="chat-container">
        <div className="chat-header">
          <button className="menu-button" onClick={() => setIsSidebarOpen(true)}>☰</button>
          CypherBot- ({loggedInUser})
        </div>
        
        <div className="message-list">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender}`}>
              <div className="message-content">
                <strong>{msg.sender === 'user' ? loggedInUser : 'AI'}: </strong>
                <br/><br/>
                {msg.sender === 'ai' && msg.text === '' ? (
                  <div className="typing-indicator">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                ) : (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <div className="input-container">
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ketik pesan untuk AI..."
              disabled={isStreaming}
            />
            <button className="send-button" onClick={sendMessage} disabled={isStreaming}>
              Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;