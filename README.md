
# Xync - Real-time Chat Application

Xync is a modern, real-time chat application inspired by WhatsApp Web. It provides a seamless messaging experience with a focus on privacy and ease of use.

## 🚀 Features

- **Real-time Messaging:** Send and receive messages instantly using Firebase Firestore.
- **User Authentication:** Secure Sign In and Sign Up using Firebase Authentication.
- **Auto-generated User ID:** Every user gets a unique, easy-to-share ID.
- **Contact Management:** 
  - Search for users by their unique ID.
  - Automatic contact addition: New chats appear in your contact list as soon as a message is sent or received.
- **Rich Chat Experience:**
  - **Emoji Picker:** Express yourself with a wide range of emojis.
  - **Message Deletion:** Delete individual messages you've sent.
  - **Clear Chat:** Wipe the entire conversation history with a single click.
  - **End-to-End Feel:** UI designed to mimic the familiar WhatsApp Web interface.
- **Profile & Privacy:**
  - **Customizable Profile:** Update your username, "About" info, email, and GitHub username.
  - **Profile Photos:** Set a custom profile photo via URL or use auto-generated avatars.
  - **Privacy Controls:** Choose who can see your About info, Email, and GitHub profile.
  - **Image Modal:** View profile photos in full size.
- **Responsive Design:** Fully functional on both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Backend/Database:** Firebase (Auth & Firestore)
- **Animations:** Tailwind CSS transitions & Lucide icons

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd xync
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   Create a `src/firebase.ts` file and add your Firebase configuration:
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getFirestore } from 'firebase/firestore';
   import { getAuth } from 'firebase/auth';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   export const db = getFirestore(app);
   export const auth = getAuth(app);
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 🛡️ Security Rules

Ensure your Firestore security rules are configured to protect user data and chat privacy. A sample `firestore.rules` is included in the project root.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

---
Developed with ❤️ by [sh4lu-z]