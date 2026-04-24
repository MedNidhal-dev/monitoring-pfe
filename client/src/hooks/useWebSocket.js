import { useEffect, useState, useRef } from 'react';

const useWebSocket = (url) => {
  const wsUrl = url || (import.meta.env.VITE_WS_URL || 'ws://localhost:3000');
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    const connect = () => {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => setIsConnected(true);

      ws.current.onmessage = (e) => {
        try {
          setLastMessage(JSON.parse(e.data));
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 5000);
      };

      ws.current.onerror = (err) => console.error('WS error:', err);
    };

    connect();

    return () => ws.current?.close();
  }, [wsUrl]);

  return { lastMessage, isConnected };
};

export default useWebSocket;
