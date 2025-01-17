/*Main Modules
*/
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';

/*Tauri
 */
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';
import {invoke} from "@tauri-apps/api/tauri";
import { relaunch } from '@tauri-apps/api/process';
import { appWindow } from "@tauri-apps/api/window";

/*Apps
*/
import App from './config/App';
import Store from "./app/index";
import Login from "./Login";

/*
*/
import {init} from "./app/resources/api/os";

/*Firebase
*/
import {initializeApp} from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage"

/*Global CSS
*/
import './index.css';

/*Constants
*/
const config = {
  apiKey: "AIzaSyAXAkoxKG4chIuIGHPkVG8Sma9mTJqiC84",
  authDomain: "ahq-store.firebaseapp.com",
  databaseURL: "https://ahq-store-default-rtdb.firebaseio.com",
  projectId: "ahq-store",
  storageBucket: "ahq-store.appspot.com",
  messagingSenderId: "460016490107",
  appId: "1:460016490107:web:50123c20ca44ccee3b74de",
  measurementId: "G-TEZS1Y48L1"
};

const app = initializeApp(config);
const auth = getAuth(app);
const firestore = initializeFirestore(app, {});
const realtimeDB = getDatabase(app);
const storage = getStorage(app);

init();

/*Logic
*/
(async() => {
  let permissionGranted = await isPermissionGranted();
  const autostarted = await invoke("autostart");

  if (!autostarted) {
    appWindow.show();
  }

  if (!await appWindow.isMaximized()) {
    appWindow.maximize();
  }

   if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }
})()

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

render("Checking for updates...", App);

checkUpdate().then(async({shouldUpdate, manifest}) => {
  if (shouldUpdate) {
    render(`Verison ${manifest?.version} Available...`, App);

    setTimeout(async() => {
      render(`Installing ${manifest?.version}`,  App);
      setTimeout(async() => {
        await installUpdate();
        await relaunch();
      }, 3000);
    }, 5000);

  } else Manage();
})
.catch((e) => {
  Manage();
});


window.addEventListener("offline", () => {
  render("Offline, waiting for network", App);
});

window.addEventListener("online", () => {
  render("Online!", App);
  setTimeout(() => {
    Manage();
  }, 3000);
});



async function Manage() {
  render("Launching Store...", App);
    setTimeout(() => {
    if (!auth.currentUser) {
      storeLoad(Login, {
        create: createUserWithEmailAndPassword,
        login: signInWithEmailAndPassword,
        verify: sendEmailVerification,
        resetEmail: sendPasswordResetEmail,
        auth,
        verifyCode: verifyPasswordResetCode,
        reset: confirmPasswordReset
      });
    } else {
      storeLoad(Store, {auth, db: firestore, cache: realtimeDB, storage});
    }

    if (auth.currentUser && !auth.currentUser?.emailVerified) {
      sendEmailVerification(auth.currentUser);
      sendNotification({
        title: "Email Verification",
        body: "Email verification link send! Please verify"
      });
    }

    auth.onAuthStateChanged((user) => {
      if (user && !user.emailVerified) {
        sendEmailVerification(user);
        sendNotification({
          title: "Email Verification",
          body: "Email verification link send! Please verify"
        });
      }
      user ? storeLoad(Store, {
          auth, 
          db: firestore, 
          cache: realtimeDB, 
          storage
        }) : storeLoad(Login, {
        create: createUserWithEmailAndPassword,
        login: signInWithEmailAndPassword,
        verify: sendEmailVerification,
        reset: confirmPasswordReset,
        resetEmail: sendPasswordResetEmail,
        auth,
        verifyCode: verifyPasswordResetCode
      });
    });
  }, 500);
}

/*invoke("download", { url: "https://github.com/ahqsoftwares/Simple-Host-App/releases/download/v2.1.0/Simple-Host-Desktop-Setup-2.1.0.exe", path: "./install/" })
.then(() => {
  invoke("install", {path: "./install/Simple-Host-Desktop-Setup-2.1.0.exe"})
  .then((code) => {
    console.log(code);
  });
})
.catch((e) => {
  console.log(e);
});*/

/**
 * Load a Store Component on the DOM
 * @param Component 
 * @param prop 
 */
function storeLoad(Component: any, prop?: Object) {
    root.render(
    <>
      <Component data={prop ? prop : {}}/>
    </>)
}

/**
 * Loads updater
 * @param {string} state 
 * @param {React.Component} App 
 */
function render(state: string, App: any) {
  root.render(
    <>
      <App info={state}/>
    </>);
}

reportWebVitals();
