import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  addNotification,
  selectNotifications,
  selectUnreadCount,
  selectNotificationsLoading,
} from '../store/slices/notificationSlice';

export const useNotifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);

  const getNotifications = useCallback(
    () => dispatch(fetchNotifications()),
    [dispatch]
  );

  const read = useCallback(
    (id) => dispatch(markAsRead(id)),
    [dispatch]
  );

  const readAll = useCallback(
    () => dispatch(markAllAsRead()),
    [dispatch]
  );

  const add = useCallback(
    (notification) => dispatch(addNotification(notification)),
    [dispatch]
  );

  return {
    notifications,
    unreadCount,
    loading,
    getNotifications,
    read,
    readAll,
    add,
  };
};

export default useNotifications;
