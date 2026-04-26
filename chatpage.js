import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom'; // Added for context awareness
import '../styles/chat.css';
import PandaLoader from '../components/PandaLoader';
import { useFaceEmotion } from '../hooks/useFaceEmotion';
import SmartModeWidget from '../components/SmartModeWidget';


// Ensure this matches your frontend/.env setting
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

const getEmotionEmoji = (emotion) => {
  const e = emotion?.toLowerCase() || '';
  if (e.includes('joy') || e.includes('happ') || e.includes('excit')) return '😊';
  if (e.includes('sad') || e.includes('low') || e.includes('depress') || e.includes('grief')) return '😢';
  if (e.includes('ang') || e.includes('frustrat') || e.includes('irrit')) return '😡';
  if (e.includes('fear') || e.includes('anx') || e.includes('nerv') || e.includes('worr')) return '😰';
  if (e.includes('love') || e.includes('car') || e.includes('compassion')) return '❤️';
  if (e.includes('surpris') || e.includes('shock')) return '😲';
  if (e.includes('neutral') || e.includes('calm') || e.includes('balanc') || e.includes('peace')) return '😌';
  if (e.includes('overwhelm') || e.includes('stress')) return '🤯';
  if (e.includes('hopeless') || e.includes('despair')) return '😔';
  return '🤖';
};

const getMusicRecommendation = (emotion, text) => {
  const e = emotion?.toLowerCase() || '';
  const userText = text?.toLowerCase() || '';
  
  const wantsMusic = userText.includes('music') || userText.includes('song') || userText.includes('listen') || userText.includes('play');

  if (e.includes('anx') || e.includes('nerv') || userText.includes('anxious') || userText.includes('panic')) {
    return {
      autoPlay: true,
      emotionMatch: 'anxiety',
      isRequested: wantsMusic,
      list: [{ id: 1, title: 'Meditation Music', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZqd5JICZI0u?utm_source=generator', emoji: '🧘', type: 'spotify' }]
    };
  }

  // Default to cards for general mood lifting, stress, etc.
  return {
    autoPlay: false,
    isRequested: wantsMusic,
    list: [
      { id: 1, title: 'Relax Music', sub: 'Soft piano, Nature sounds', emoji: '🎧', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZqd5JICZI0u?utm_source=generator', type: 'spotify' },
      { id: 2, title: 'Rain Sounds', sub: 'Slow ambient, White noise', emoji: '🌧', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXbcPC6VvquOE?utm_source=generator', type: 'spotify' },
      { id: 3, title: 'Meditation', sub: 'Deep breathing, Calm instrumental', emoji: '🧘', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DZ06evO35pBba?utm_source=generator', type: 'spotify' },
      { id: 4, title: 'Focus Beats', sub: 'Lo-fi beats, Instrumental study', emoji: '📚', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator', type: 'spotify' }
    ]
  };
};

const getMeditationRecommendation = (emotion) => {
  const e = emotion?.toLowerCase() || '';
  if (e.includes('joy') || e.includes('happ') || e.includes('excit')) return null;
  if (e.includes('anx') || e.includes('nerv') || e.includes('fear') || e.includes('panic')) {
    return { title: 'Grounding for Anxiety', script: "Close your eyes. Take a deep breath in... 1... 2... 3... and out... 1... 2... 3... Feel the ground beneath you. You are safe. You are in control." };
  }
  if (e.includes('sad') || e.includes('low') || e.includes('depress') || e.includes('grief')) {
    return { title: 'Loving-Kindness for Sadness', script: "Place your hand over your heart. Breathe in gently. Notice the feeling of warmth. You are allowed to feel this. Send yourself kindness and compassion." };
  }
  if (e.includes('ang') || e.includes('frustrat') || e.includes('irrit')) {
    return { title: 'Cooling Breath for Anger', script: "Take a slow, deep breath. Focus on the sensation of air entering your nostrils. As you breathe out, imagine releasing tension from your shoulders." };
  }
  if (e.includes('overwhelm') || e.includes('stress')) {
    return { title: 'Body Scan for Stress', script: "Let's do a quick body scan. Bring your attention to your toes, then your legs, your stomach, chest, and head. Breathe into any areas of tightness." };
  }
  return { title: 'Mindful Breathing', script: "Take a moment to simply be. Breathe in naturally. Notice the sounds around you without judgment. Just breathe and observe." };
};

const ChatPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const latestTextRef = useRef('');

  useEffect(() => {
    latestTextRef.current = inputText;
  }, [inputText]);

  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // NEW: Voice toggle
  const [isSpeaking, setIsSpeaking] = useState(false); // NEW: Speaking state
  const [language, setLanguage] = useState('en-US'); // NEW: Language selection
  const chatBoxRef = useRef(null);

  // NEW: Catch the companion type passed from LandingPage.js
  const location = useLocation();
  const companionType = location.state?.type || "companion";
  const userId = localStorage.getItem('user_id') || "anonymous";
  const [isSmartMode, setIsSmartMode] = useState(location.state?.smartMode || false);
  // autoGreetSent starts FALSE so the pre-detected emotion auto-sends on mount
  const [autoGreetSent, setAutoGreetSent] = useState(false);
  const [autoDetectCountdown, setAutoDetectCountdown] = useState(null);

  // Pre-detected emotion from SmartModeModal (already done — no need to re-scan)
  const preDetectedEmotion = location.state?.detectedEmotion || null;

  // Only run face detection on the chat page if the modal did NOT already detect an emotion
  const shouldRunDetection = isSmartMode && !preDetectedEmotion;

  // Dynamic state for the history sidebar
  const [sidebarChats, setSidebarChats] = useState(['New Chat']);

  const { isModelLoaded, emotion: faceEmotion, error: faceError, videoRef,
          captureCountdown, isCapturing, isComplete } = useFaceEmotion(shouldRunDetection);

  // Resolved emotion: use pre-detected (from modal) or live detection result
  const resolvedEmotion = preDetectedEmotion || faceEmotion;

  // --- STEP 1: Fetch history from MongoDB on load ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API}/conversations`, { params: { user_id: userId, companion_type: companionType } });

        // Create sidebar chats from user's history
        const topics = response.data.map(conv => {
          const text = conv.user_message || '';
          return text.length > 25 ? text.substring(0, 25) + '...' : text;
        });

        // Filter duplicates and empty, show latest up to 15
        const uniqueTopics = [...new Set(topics.filter(t => t.trim() !== ''))].slice(0, 15);
        if (uniqueTopics.length > 0) {
          setSidebarChats(uniqueTopics);
        }

        // Transform DB data into separate user and bot bubbles
        const history = response.data.reverse().flatMap(conv => [
          { type: 'user', text: conv.user_message },
          { 
            type: 'bot', 
            text: `Detected Emotion: ${conv.emotion}\n\n${conv.ai_response}`, 
            emoji: getEmotionEmoji(conv.emotion),
            recommendations: conv.recommendations || [],
            music: getMusicRecommendation(conv.emotion),
            meditation: getMeditationRecommendation(conv.emotion)
          }
        ]);

        setMessages(history);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };
    fetchHistory();
  }, [userId, companionType]);

  // --- NEW: Loading screen timer ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 2500); // Show panda for 2.5 seconds

    return () => clearTimeout(timer);
  }, []);

  // --- AUTO-CHAT: Greet immediately when a normal session starts ---
  useEffect(() => {
    // Only fire if not Smart Mode, and we haven't greeted, and loader is finished.
    // Also, we only want to auto-greet if there's no pre-existing messages for the day (history empty)
    // Actually, we should ALWAYS greet them when they jump into the chat view to fulfill your prompt logic!
    if (isSmartMode || autoGreetSent || showLoader) return;
    
    // Once loader is done, send a fast invisible prompt
    const triggerGreeting = async () => {
      setAutoGreetSent(true);
      setIsTyping(true);
      try {
        const response = await axios.post(`${API}/analyze`, {
          text: "[SESSION_START]",
          companion_type: companionType,
          user_id: userId,
          language: language === 'hi-IN' ? 'Hindi' : 'English',
          facial_context: null
        });
        
        const data = response.data;
        const botMsg = {
          type: 'bot',
          text: data.support,
          emoji: getEmotionEmoji(data.emotion) || '👋',
          recommendations: data.recommendations || [],
          music: getMusicRecommendation(data.emotion, "[SESSION_START]"),
          meditation: null
        };
        
        setMessages(prev => [...prev, botMsg]);
      } catch (e) {
        console.error("Auto-greet failed", e);
      } finally {
        setIsTyping(false);
      }
    };
    triggerGreeting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSmartMode, autoGreetSent, showLoader, companionType, userId, language]);

  // --- AUTO-CHAT: Fires once Smart Mode emotion is known and loader is done ---
  // This handles BOTH cases:
  //   a) pre-detected emotion from SmartModeModal (preDetectedEmotion set)
  //   b) live detection running on the chat page widget (faceEmotion set after isComplete)
  const faceEmotionRef = useRef(faceEmotion);
  useEffect(() => { faceEmotionRef.current = faceEmotion; }, [faceEmotion]);

  useEffect(() => {
    if (!isSmartMode || autoGreetSent || showLoader) return;

    // Determine which emotion source to use
    const emotionSource = preDetectedEmotion || (isComplete ? faceEmotion : null);
    if (!emotionSource) return;

    const openers = {
      happy:     `I'm feeling happy right now! 😊`,
      sad:       `I'm feeling a bit sad right now. 😢`,
      neutral:   `I'm feeling okay, just neutral. 😌`,
      angry:     `I'm feeling frustrated and angry. 😡`,
      fearful:   `I'm feeling anxious and fearful. 😰`,
      surprised: `I'm feeling surprised and a bit overwhelmed. 😲`,
      disgusted: `I'm feeling disgusted and uncomfortable. 🤢`,
    };
    const triggerText = openers[emotionSource.toLowerCase()] || `I'm feeling ${emotionSource}.`;
    setAutoGreetSent(true);
    sendMessage(triggerText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, faceEmotion, preDetectedEmotion, isSmartMode, autoGreetSent, showLoader]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (overrideText) => {
    // Check if it's an event or a string, default to inputText
    const textToUse = typeof overrideText === 'string' ? overrideText : inputText;
    const text = textToUse.trim();
    if (!text) return;

    // Optional: Cancel any currently playing speech when sending a new message
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Free Chat Limit Check
    if (userId === "anonymous") {
      let count = parseInt(localStorage.getItem('anonymous_chat_count') || "0");
      if (count >= 3) {
        alert("You've reached your free chat limit! Please log in or sign up to continue talking with Lumina.");
        navigate('/login');
        return;
      }
      localStorage.setItem('anonymous_chat_count', (count + 1).toString());
    }

    const userMsg = { type: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // UPDATED: Now sends 'companion_type', 'user_id', 'language', and 'facial_context'
      const response = await axios.post(`${API}/analyze`, {
        text,
        companion_type: companionType,
        user_id: userId,
        language: language === 'hi-IN' ? 'Hindi' : 'English',
        facial_context: isSmartMode && isModelLoaded ? faceEmotion : null
      });

      const data = response.data;

      const botMsg = {
        type: 'bot',
        text: `Detected Emotion: ${data.emotion} (${data.confidence})\n\n${data.support}`,
        emoji: getEmotionEmoji(data.emotion),
        recommendations: data.recommendations || [],
        music: getMusicRecommendation(data.emotion, text),
        meditation: getMeditationRecommendation(data.emotion)
      };

      setMessages(prev => [...prev, botMsg]);

      // Update Sidebar History Dynamically
      setSidebarChats(prev => {
        const newTopic = text.length > 25 ? text.substring(0, 25) + '...' : text;
        const filtered = prev.filter(t => t !== newTopic && t !== 'New Chat');
        return [newTopic, ...filtered].slice(0, 15);
      });

      // Speak the bot's response out loud if enabled
      if (voiceEnabled && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(data.support);
        utterance.lang = language;

        const voices = window.speechSynthesis.getVoices();
        let preferredVoice;
        if (language === 'hi-IN') {
           preferredVoice = voices.find(v => v.lang.startsWith('hi')) || voices[0];
        } else {
           preferredVoice = voices.find(v => (v.name.includes('Female') || v.name.includes('Google UK English Female') || v.name.includes('Google US English'))) || voices[0];
        }
        if (preferredVoice) utterance.voice = preferredVoice;

        // Slightly slow down the rate for a more calming, therapeutic feel
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startNewChat = () => {
    setMessages([]); // Clear locally to start a fresh view
    setSidebarChats(prev => {
      // Add a 'New Chat' marker at the top if it's not already there
      return prev[0] === 'New Chat' ? prev : ['New Chat', ...prev].slice(0, 15);
    });
    if (window.speechSynthesis) window.speechSynthesis.cancel(); // Stop speaking
  };

  const reloadHistory = async () => {
    try {
      const response = await axios.get(`${API}/conversations`, { params: { user_id: userId } });
      const history = response.data.reverse().flatMap(conv => [
        { type: 'user', text: conv.user_message },
        { 
          type: 'bot', 
          text: `Detected Emotion: ${conv.emotion}\n\n${conv.ai_response}`, 
          emoji: getEmotionEmoji(conv.emotion),
          recommendations: conv.recommendations || [],
          music: getMusicRecommendation(conv.emotion)
        }
      ]);
      setMessages(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const playMeditation = (script) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = language;
      utterance.rate = 0.85;
      utterance.pitch = 0.9;
      
      const voices = window.speechSynthesis.getVoices();
      let preferredVoice;
      if (language === 'hi-IN') {
         preferredVoice = voices.find(v => v.lang.startsWith('hi')) || voices[0];
      } else {
         preferredVoice = voices.find(v => (v.name.includes('Female') || v.name.includes('Google UK English Female') || v.name.includes('Google US English'))) || voices[0];
      }
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRecommendationClick = (msgIndex, rec) => {
    const text = rec.toLowerCase();
    if (text.includes('music') || text.includes('song') || text.includes('audio') || text.includes('sound') || text.includes('playlist') || text.includes('piano') || text.includes('listen')) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[msgIndex].showMusic = true;
        return newMessages;
      });
    } else {
      // For non-music activities, auto-fill the input text or auto-send it
      sendMessage(`I want to ${rec}. Can you guide me?`);
    }
  };

  const handleCardClick = (msgIndex, card) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[msgIndex].selectedMusic = card;
      return newMessages;
    });
  };

  const toggleListening = async () => {
    if (isListening) {
      if (window.recognition) window.recognition.stop();
      if (window.mediaRecorder && window.mediaRecorder.state !== "inactive") {
        window.mediaRecorder.stop();
      }
      setIsListening(false);
    } else {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      
      if (!SpeechRecognition) {
        alert("Your browser does not support Voice Recognition. Please use Google Chrome or Edge.");
        return;
      }
      
      try {
        // 1. Audio Recording setup for Frequency/Tone check
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        window.mediaRecorder = mediaRecorder;
        const audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        // 2. Real-time typing setup (Google Dictation)
        if (!inputText.trim()) {
           latestTextRef.current = '';
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language; 

        recognition.onstart = () => {
          setIsListening(true);
        };

        const currentText = latestTextRef.current ? latestTextRef.current.trim() + ' ' : '';
        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          const fullText = (currentText + transcript).trim();
          setInputText(fullText);
          latestTextRef.current = fullText; 
        };
        
        // 3. What to do when user STOPS recording
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop()); // Mute mic
          
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const finalSendText = latestTextRef.current.trim();
          
          if (!finalSendText) {
             setIsTyping(false);
             return; 
          }

          setIsTyping(true);
          setInputText(''); // Clear typing box

          const formData = new FormData();
          formData.append("file", audioBlob, "voice-recording.webm");
          formData.append("companion_type", companionType);
          formData.append("user_id", userId);
          formData.append("language", language === 'hi-IN' ? 'Hindi' : 'English');

          // Send to backend specifically for TONE analysis via voice note processing
          try {
            const response = await axios.post(`${API}/analyze-voice`, formData, {
              headers: { "Content-Type": "multipart/form-data" }
            });

            const data = response.data;
            // Use the transcription from the backend/Whisper as the official message
            const userMsg = { type: 'user', text: `🎤 [Voice Note: "${data.transcript}"]` };
            
            const botMsg = {
              type: 'bot',
              text: `Detected Emotion: ${data.emotion} (${data.confidence})\n\n${data.support}`,
              emoji: getEmotionEmoji(data.emotion),
              recommendations: data.recommendations || [],
              music: getMusicRecommendation(data.emotion, data.transcript),
              meditation: getMeditationRecommendation(data.emotion)
            };

            setMessages(prev => [...prev, userMsg, botMsg]);
            
            setSidebarChats(prev => {
              const text = data.transcript;
              const newTopic = text.length > 25 ? text.substring(0, 25) + '...' : text;
              const filtered = prev.filter(t => t !== newTopic && t !== 'New Chat');
              return [newTopic, ...filtered].slice(0, 15);
            });

            if (voiceEnabled && window.speechSynthesis) {
               const utterance = new SpeechSynthesisUtterance(data.support);
               utterance.lang = language;
               const voices = window.speechSynthesis.getVoices();
               let preferredVoice;
               if (language === 'hi-IN') {
                  preferredVoice = voices.find(v => v.lang.startsWith('hi')) || voices[0];
               } else {
                  preferredVoice = voices.find(v => (v.name.includes('Female') || v.name.includes('Google UK English Female') || v.name.includes('Google US English'))) || voices[0];
               }
               if (preferredVoice) utterance.voice = preferredVoice;
               utterance.rate = 0.95;
               utterance.pitch = 1.0;
               utterance.onstart = () => setIsSpeaking(true);
               utterance.onend = () => setIsSpeaking(false);
               utterance.onerror = () => setIsSpeaking(false);
               window.speechSynthesis.speak(utterance);
            }
          } catch (error) {
            console.error("Audio upload error", error);
            setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, I had trouble analyzing your voice tone. Please try again.' }]);
          } finally {
            setIsTyping(false);
          }
        };

        window.recognition = recognition;
        recognition.start();
        mediaRecorder.start();
        
      } catch (err) {
        console.error("Mic access denied", err);
        alert("Please allow microphone permissions to use voice emotion detection.");
        setIsListening(false);
      }
    }
  };

  if (showLoader) {
    return <PandaLoader />;
  }

  return (
    <div className="chat-container fade-in-up">
      <SmartModeWidget
        isActive={isSmartMode}
        onClose={() => setIsSmartMode(false)}
        isModelLoaded={isModelLoaded}
        emotion={resolvedEmotion}
        error={faceError}
        videoRef={videoRef}
        captureCountdown={captureCountdown}
        isCapturing={isCapturing}
        isComplete={isComplete || !!preDetectedEmotion}
        autoGreetSent={autoGreetSent}
      />
      <div className="chat-layout">
        <div className="chat-sidebar">
          <div className="sidebar-header">Your chats</div>
          <div className="sidebar-list">
            {sidebarChats.map((chat, idx) => (
              <div 
                key={idx} 
                className={`sidebar-item ${idx === 0 && messages.length === 0 ? 'active' : ''}`} 
                title={chat}
                onClick={chat === 'New Chat' ? startNewChat : reloadHistory}
                style={{ cursor: 'pointer' }}
              >
                {chat}
              </div>
            ))}
          </div>
        </div>
        <div className="chat-wrapper">
          <div className="chat-header">
            <div className="header-title">
              💙 AI {companionType.charAt(0).toUpperCase() + companionType.slice(1)} {companionType.toLowerCase() !== 'companion' ? 'Companion' : ''}
              {isSpeaking && <span className="speaking-indicator" title="AI is speaking"> 🔊</span>}
            </div>
            <div className="header-actions">
              <select className="language-selector new-chat-btn" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '0.4rem', border: 'none', appearance: 'none' }}>
                <option value="en-US">English</option>
                <option value="hi-IN">हिंदी (Hindi)</option>
              </select>
              <button className={`voice-toggle-btn ${!voiceEnabled ? 'muted' : ''}`} onClick={toggleVoice} title={voiceEnabled ? "Mute Bot Voice" : "Unmute Bot Voice"}>
                {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
              </button>
              <button className="new-chat-btn" onClick={startNewChat} title="Start New Chat">
                ✨ New Chat
              </button>
            </div>
          </div>
          <div className="chat-box" ref={chatBoxRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.type === 'bot' && msg.emoji && (
                  <div className="emoji-visualization" title={`Detected Emotion Emoji`}>
                    {msg.emoji}
                  </div>
                )}
                {msg.text}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="recommendations-container">
                    <p className="recommendations-title">Suggested Activities:</p>
                    <div className="recommendation-chips">
                      {msg.recommendations.map((rec, i) => (
                        <span key={i} className="recommendation-chip" onClick={() => handleRecommendationClick(index, rec)}>
                          {rec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {msg.type === 'bot' && msg.music && !msg.music.autoPlay && !msg.selectedMusic && (msg.showMusic || msg.music.isRequested) && (
                  <div className="music-cards-container">
                    <p className="music-cards-title">Would you like to listen to some calming music?</p>
                    <div className="music-cards-grid">
                      {msg.music.list.map((card, idx) => (
                        <div key={idx} className="music-card" onClick={() => handleCardClick(index, card)}>
                          <div className="music-icon">{card.emoji}</div>
                          <div className="music-title">{card.title}</div>
                          <div className="music-sub">{card.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {msg.type === 'bot' && msg.music && msg.music.autoPlay && (
                  <div className="music-recommendation player autoplay-container">
                    {msg.music.emotionMatch === 'anxiety' && (
                      <div className="breathing-animation-container">
                        <div className="breathing-circle"></div>
                        <div className="breathing-text"></div>
                      </div>
                    )}
                    <p className="music-title">{msg.music.list[0].emoji} Playing {msg.music.list[0].title} for you...</p>
                    <iframe 
                      style={{ borderRadius: '12px' }}
                      src={msg.music.list[0].url} 
                      width="100%" 
                      height="152" 
                      frameBorder="0" 
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                      loading="lazy">
                    </iframe>
                  </div>
                )}

                {msg.type === 'bot' && msg.selectedMusic && (
                  <div className="music-recommendation player">
                    <p className="music-title">{msg.selectedMusic.emoji} Playing: {msg.selectedMusic.title}</p>
                    <iframe 
                      style={{ borderRadius: '12px' }}
                      src={msg.selectedMusic.url} 
                      width="100%" 
                      height="152" 
                      frameBorder="0" 
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                      loading="lazy">
                    </iframe>
                  </div>
                )}
                
                {msg.type === 'bot' && msg.meditation && (
                  <div className="meditation-card" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#38bdf8' }}>🧘 Guided Meditation Suggested</p>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>{msg.meditation.title}</p>
                    <button style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #38bdf8, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }} onClick={() => playMeditation(msg.meditation.script)}>
                      ▶️ Play Voice Meditation
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
          </div>
          <div className="input-area">
            <button
              className={`mic-button ${isListening ? 'listening' : ''}`}
              onClick={toggleListening}
              title={isListening ? "Stop listening" : "Start Voice Emotion Detection"}
            >
              {isListening ? '🎙️' : '🎤'}
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="How are you feeling? (Or use Mic for Voice Emotion Detection)"
            />
            <button onClick={sendMessage}>Send</button>
          </div>
          <div className="disclaimer">Not a substitute for professional medical advice.</div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;