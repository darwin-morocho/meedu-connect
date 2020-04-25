import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/storage";

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
};

console.log("firebase config", config);

try {
  firebase.initializeApp(config);
} catch (err) {
  console.log("firebase was initialized");
}
firebase.auth().languageCode = 'es';
export default firebase;
