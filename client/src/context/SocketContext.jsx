import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Join user room when authenticated
  useEffect(() => {
    if (socket && user) {
      socket.emit('join:user', user.id);
    }
  }, [socket, user]);

  const joinQueue = (doctorId) => {
    if (socket) {
      socket.emit('join:queue', doctorId);
    }
  };

  const leaveQueue = (doctorId) => {
    if (socket) {
      socket.emit('leave:queue', doctorId);
    }
  };

  const joinHospital = (hospitalId) => {
    if (socket) {
      socket.emit('join:hospital', hospitalId);
    }
  };

  const value = {
    socket,
    connected,
    joinQueue,
    leaveQueue,
    joinHospital
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
