import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase project: esp32data-ac04a
const firebaseConfig = {
    apiKey: "AIzaSyDAjlMG-XyOOEmGGtoJHLWkGhBGNQYJ7UE",
    authDomain: "esp32data-ac04a.firebaseapp.com",
    databaseURL: "https://esp32data-ac04a-default-rtdb.firebaseio.com",
    projectId: "esp32data-ac04a",
    storageBucket: "esp32data-ac04a.firebasestorage.app",
    messagingSenderId: "824643778304",
    appId: "1:824643778304:web:9cbc66f2dda4b64df3e5e5",
    measurementId: "G-EGTE7QZQYE"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
