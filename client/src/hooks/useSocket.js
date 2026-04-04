import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { selectUser } from '../store/slices/authSlice';
import { updateQueueFromSocket, updatePatientStatusFromSocket } from '../store/slices/queueSlice';
import { addNotification } from '../store/slices/notificationSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';

// Singleton socket instance
let socketInstance = null;

const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

export const useSocket = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);

      // Join user room if authenticated
      if (user?._id) {
        socket.emit('join:user', user._id);
        console.log('Joined user room:', user._id);
      }
    };

    const onDisconnect = () => {
      console.log('Socket disconnected');
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected, trigger onConnect
    if (socket.connected) {
      onConnect();
    }

    // Queue updates - dispatch to Redux
    socket.on('queue:update', (data) => {
      console.log('Socket: queue:update', data);
      dispatch(updateQueueFromSocket(data));
    });

    socket.on('queue:your-turn', (data) => {
      console.log('Socket: queue:your-turn', data);
      dispatch(updatePatientStatusFromSocket({ status: 'your_turn', ...data }));
      dispatch(addNotification({
        _id: Date.now().toString(),
        type: 'your_turn',
        title: "It's Your Turn!",
        message: 'Please proceed to the consultation room.',
        isRead: false,
        createdAt: new Date().toISOString(),
      }));
    });

    socket.on('queue:delay', (data) => {
      console.log('Socket: queue:delay', data);
      dispatch(addNotification({
        _id: Date.now().toString(),
        type: 'delay_notification',
        title: 'Delay Notice',
        message: `There is a ${data.delay} minute delay.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      }));
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [dispatch, user?._id]);

  const joinQueue = useCallback((doctorId) => {
    console.log('Joining queue room:', doctorId);
    socketRef.current?.emit('join:queue', doctorId);
  }, []);

  const leaveQueue = useCallback((doctorId) => {
    console.log('Leaving queue room:', doctorId);
    socketRef.current?.emit('leave:queue', doctorId);
  }, []);

  const joinHospital = useCallback((hospitalId) => {
    console.log('Joining hospital room:', hospitalId);
    socketRef.current?.emit('join:hospital', hospitalId);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    joinQueue,
    leaveQueue,
    joinHospital,
  };
};

export default useSocket;
