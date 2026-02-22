import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase project: aqicode-b2dc0
const firebaseConfig = {
    apiKey: "AIzaSyDAjlMG-XyOOEmGGtoJHLWkGhBGNQYJ7UE",
    authDomain: "aqicode-b2dc0.firebaseapp.com",
    databaseURL: "https://aqicode-b2dc0-default-rtdb.firebaseio.com",
    projectId: "aqicode-b2dc0",
    storageBucket: "aqicode-b2dc0.firebasestorage.app",
    messagingSenderId: "824643778304",
    appId: "1:824643778304:web:9cbc66f2dda4b64df3e5e5",
    measurementId: "G-EGTE7QZQYE"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
