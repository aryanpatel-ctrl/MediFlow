import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { selectUser } from '../store/slices/authSlice';
import { updateQueueFromSocket, updatePatientStatusFromSocket } from '../store/slices/queueSlice';
import { addNotification } from '../store/slices/notificationSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';

export const useSocket = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);

      // Join user room if authenticated
      if (user?._id) {
        socket.emit('join:user', user._id);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Queue updates
    socket.on('queue:update', (data) => {
      dispatch(updateQueueFromSocket(data));
    });

    socket.on('queue:your-turn', (data) => {
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
      socket.disconnect();
    };
  }, [dispatch, user?._id]);

  const joinQueue = useCallback((doctorId) => {
    socketRef.current?.emit('join:queue', doctorId);
  }, []);

  const leaveQueue = useCallback((doctorId) => {
    socketRef.current?.emit('leave:queue', doctorId);
  }, []);

  const joinHospital = useCallback((hospitalId) => {
    socketRef.current?.emit('join:hospital', hospitalId);
  }, []);

  return {
    socket: socketRef.current,
    joinQueue,
    leaveQueue,
    joinHospital,
  };
};

export default useSocket;
