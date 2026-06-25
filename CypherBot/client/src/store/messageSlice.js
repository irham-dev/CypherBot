import { createSlice } from '@reduxjs/toolkit';

export const messageSlice = createSlice({
  name: 'messages',
  initialState: {
    list: [],
    isStreaming: false,
    sessionId: null
  },
  reducers: {
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
    },
    setChatHistory: (state, action) => {
      state.list = action.payload;
    },
    clearChat: (state) => {
      state.list = [];
      state.sessionId = null;
    },
    addUserMessage: (state, action) => {
      state.list.push({ sender: 'user', text: action.payload });
    },
    startStreaming: (state) => {
      state.isStreaming = true;
      state.list.push({ sender: 'ai', text: '' });
    },
    addStreamChunk: (state, action) => {
      const lastMessage = state.list[state.list.length - 1];
      if (lastMessage && lastMessage.sender === 'ai') {
        lastMessage.text += action.payload;
      }
    },
    endStreaming: (state) => {
      state.isStreaming = false;
    },
    addError: (state, action) => {
      state.list.push({ sender: 'ai', text: action.payload });
      state.isStreaming = false;
    }
  }
});

export const { setSessionId, setChatHistory, clearChat, addUserMessage, startStreaming, addStreamChunk, endStreaming, addError } = messageSlice.actions;
export default messageSlice.reducer;