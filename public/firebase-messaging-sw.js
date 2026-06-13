importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCKEz0A_Ns957DZLUYOzWB9dVlb17qmwFA',
  authDomain: 'aura-brain-2.firebaseapp.com',
  projectId: 'aura-brain-2',
  storageBucket: 'aura-brain-2.firebasestorage.app',
  messagingSenderId: '602121344478',
  appId: '1:602121344478:web:ffda0162976155c65cf94f',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });
});
