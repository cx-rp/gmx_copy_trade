const WebSocket = require('ws');
const socket = new WebSocket('wss://www.gmx.house/arbitrum/leaderboard');

socket.onopen = () => {
  console.log('WebSocket connection opened');
};

// WebSocket message received
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received data:', data);
};

socket.onclose = () => {
  console.log('WebSocket connection closed');
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
};