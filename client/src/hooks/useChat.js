import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  sendMessage,
  startChatSession,
  resetChat,
  addUserMessage,
  selectMessages,
  selectTriageResult,
  selectChatLoading,
  selectChatSession,
  selectTriageComplete,
  selectIsTyping,
} from '../store/slices/chatSlice';

export const useChat = () => {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectChatSession);
  const messages = useSelector(selectMessages);
  const triageResult = useSelector(selectTriageResult);
  const triageComplete = useSelector(selectTriageComplete);
  const isTyping = useSelector(selectIsTyping);
  const loading = useSelector(selectChatLoading);
  const error = useSelector((state) => state.chat.error);

  const startSession = useCallback(
    (sessionType) => dispatch(startChatSession(sessionType)),
    [dispatch]
  );

  const send = useCallback(
    (message) => {
      dispatch(addUserMessage(message));
      return dispatch(sendMessage({ sessionId, message }));
    },
    [dispatch, sessionId]
  );

  const reset = useCallback(
    () => dispatch(resetChat()),
    [dispatch]
  );

  return {
    sessionId,
    messages,
    triageResult,
    triageComplete,
    isTyping,
    loading,
    error,
    startSession,
    send,
    reset,
  };
};

export default useChat;
