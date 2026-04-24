import React, { createContext, useContext, useState, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { useToast } from '../components/Toast';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const { lastMessage } = useWebSocket();
  const { addToast } = useToast();
  const { isManager } = useAuth();

  useEffect(() => {
    
    if (isManager()) return;
    
    if (lastMessage) {
      const msgType = lastMessage.type || lastMessage.data?.type;
      const incident = lastMessage.data || lastMessage;
      
      // Support both French and English message types
      const isNewIncident = msgType === 'NEW_INCIDENT' || msgType === 'NOUVEL_INCIDENT' || incident?.anomaly_type;
      
      if (isNewIncident) {
        // Make sure we have the incident data
        const title = incident?.anomaly_type || incident?.title || 'Unknown';
        const service = incident?.service_name || incident?.service || 'Système';
        
        addToast(
          `Nouvel Incident : ${title} sur ${service}`, 
          (incident?.severity || 'info').toLowerCase()
        );

        setUnreadCount(prev => prev + 1);
        
        setNotifications(prev => [{
          id: Date.now(),
          title: incident.anomaly_type,
          service: incident.service_name,
          timestamp: new Date()
        }, ...prev].slice(0, 20));
      }
    }
  }, [lastMessage, addToast, isManager]);
  
  const clearNotifications = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
