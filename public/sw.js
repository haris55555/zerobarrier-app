importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
apiKey: "AIzaSyByOBxpNbzyAHnM8kN8hWBpoyjahCfPUyo",
authDomain: "zerobarrier-5da51.firebaseapp.com",
projectId: "zerobarrier-5da51",
storageBucket: "zerobarrier-5da51.firebasestorage.app",
messagingSenderId: "10426675429406",
appId: "1:10426675429406:web:1aa91184280722369ebe0f",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
const title = payload.notification?.title || 'ZeroBarrier ⚡';
const body = payload.notification?.body || 'New message received!';
self.registration.showNotification(title, {
body,
icon: '/favicon.svg',
badge: '/favicon.svg',
vibrate: [200, 100, 200],
});
});
