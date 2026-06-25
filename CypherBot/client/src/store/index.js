import { configureStore } from '@reduxjs/toolkit';
import messageReducer from './messageSlice';

export const store = configureStore({
  reducer: {
    messages: messageReducer
  }
});