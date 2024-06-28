/*
    This code is the intellectual property of the owner.
    Unauthorized editing, removal, updating, adding, duplicating, selling, or reusing of this code is strictly prohibited.
*/

var firebaseConfig = {
    apiKey: "AIzaSyBOjZnu1KMl4G-Y297axV2OnG302UL37QU",
    authDomain: "disc2-89fd5.firebaseapp.com",
    projectId: "disc2-89fd5",
    storageBucket: "disc2-89fd5.appspot.com",
    messagingSenderId: "399235410562",
    appId: "1:399235410562:web:075e69b274a6b26906e29b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Constants
const MESSAGE_LIMIT = 5000;
const PROFILE_MODAL_ID = 'profile_modal';
const badgeClasses = {
    'Administrator': 'bg-red-500 ph-shield-star',
    'Moderator': 'bg-pink-500 ph-gavel',
    'Supporter3': 'bg-blue-500 ph-crown-simple',
    'Supporter2': 'bg-purple-500 ph-diamond',
    'Supporter1': 'bg-indigo-500 ph-heart',
    'Veteran': 'bg-orange-500 ph-star',
    'User': 'bg-gray-700 ph-user'
};

// Lets
let lastGlobalMessageTime = 0;
let lastDmMessageTime = 0;

// DOM elements
const elements = {
    loginButton: document.getElementById('login-button'),
    logoutButton: document.getElementById('logout-button'),
    sendButton: document.getElementById('send-button'),
    saveSettingsButton: document.getElementById('save-settings-button'),
    loginContainer: document.getElementById('login-container'),
    chatContainer: document.getElementById('chat-container'),
    chatInput: document.getElementById('chat-input'),
    chatBox: document.getElementById('chat-box'),
    profilePic: document.getElementById('profile-pic'),
    displayName: document.getElementById('display-name'),
    dropdownUsername: document.getElementById('dropdown-username'),
    newDisplayName: document.getElementById('new-display-name'),
    newBio: document.getElementById('new-bio'),
    newLocation: document.getElementById('new-location'),
    globalChatButton: document.getElementById('global-chat-button'),
    dmsButton: document.getElementById('dms-button'),
    globalChat: document.getElementById('global-chat'),
    dmContainer: document.getElementById('dm-container'),
    dmList: document.getElementById('dm-list'),
    dmChatBox: document.getElementById('dm-chat-box'),
    dmChatInput: document.getElementById('dm-chat-input'),
    dmSendButton: document.getElementById('dm-send-button'),
    dmSearchInput: document.getElementById('dm-search-input'),
};

// Utility functions
const Utils = {
    handleFirebaseError: (error) => console.error("Firebase Error:", error),
    toggleVisibility: (element, show) => element?.classList.toggle('d-none', !show),
    openOffcanvas: (id) => new bootstrap.Offcanvas(document.getElementById(id)).show(),
    closeOffcanvas: (id) => bootstrap.Offcanvas.getInstance(document.getElementById(id)).hide(),
    hideOffcanvas: (id) => {
        const offcanvas = document.getElementById(id);
        if (offcanvas) {
            const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvas);
            if (offcanvasInstance) {
                offcanvasInstance.hide();
            }
        }
    },
    validateInput: (inputElement, condition) => {
        if (condition) {
            inputElement.classList.add('is-invalid');
            return false;
        } else {
            inputElement.classList.remove('is-invalid');
            return true;
        }
    }
};

// Auth Module
const Auth = {
    login: () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()),
    logout: () => auth.signOut(),
    handleAuthStateChanged: (user) => {
        if (user) {
            User.setupUser(user);
            User.loadProfile();
            Chat.loadMessages();
            DM.loadDms();
            Utils.toggleVisibility(elements.loginContainer, false);
            Utils.toggleVisibility(elements.chatContainer, true);
            Chat.showGlobalChat();
        } else {
            Utils.toggleVisibility(elements.loginContainer, true);
            Utils.toggleVisibility(elements.chatContainer, false);
            Utils.toggleVisibility(elements.globalChat, false);
            Utils.toggleVisibility(elements.dmContainer, false);
        }
    },
};

// User Module
const User = {
    setupUser: (user) => {
        const userRef = db.collection('users').doc(user.uid);
        userRef.get().then(doc => {
            if (!doc.exists) {
                userRef.set({
                    displayName: user.displayName,
                    bio: "",
                    location: "",
                    badges: ["User"]
                }, { merge: true });
            }
        }).catch(Utils.handleFirebaseError);
    },
    loadProfile: () => {
        const user = auth.currentUser;
        const userRef = db.collection('users').doc(user.uid);

        userRef.get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                elements.profilePic.src = user.photoURL;
                const displayName = userData.displayName || user.displayName;
                elements.displayName.innerText = displayName;
                elements.dropdownUsername.innerText = displayName;
                elements.newDisplayName.value = displayName;
                elements.newBio.value = userData.bio || '';
                elements.newLocation.value = userData.location || '';
            } else {
                console.log("No such user document!");
            }
        }).catch(Utils.handleFirebaseError);
    },
    showProfileModal: (uid) => {
        const userRef = db.collection('users').doc(uid);

        userRef.get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                document.getElementById('profile-display-name').innerText = userData.displayName;
                document.getElementById('profile-bio').innerText = userData.bio || 'Bio pending approval from my cat. Meow back later!';
                document.getElementById('profile-location').innerText = userData.location || 'No location yet, exploring Earth!';
                document.getElementById('profile-badges').innerHTML = userData.badges.map(User.createBadge).join(' ');

                Utils.openOffcanvas(PROFILE_MODAL_ID);

                document.getElementById('dm-button').addEventListener('click', () => {
                    User.handleProfileDmButtonClick(uid);
                    Utils.closeOffcanvas(PROFILE_MODAL_ID);
                });
            } else {
                console.error("No such user!");
            }
        }).catch(Utils.handleFirebaseError);
    },
    handleProfileDmButtonClick: (uid) => {
        DM.startDm(uid);
        Utils.closeOffcanvas(PROFILE_MODAL_ID);
    },
    createBadge: (badge) => {
        const badgeClass = badgeClasses[badge];
        return `<span class="badge ${badgeClass}" data-toggle="tooltip" data-placement="top" title="${badge}"><i class="ph ${badgeClass}"></i></span>`;
    },
    saveSettings: () => {
        const newName = elements.newDisplayName.value;
        const newBio = elements.newBio.value;
        const newLocation = elements.newLocation.value;
        const user = auth.currentUser;

        let valid = true;

        valid = Utils.validateInput(elements.newDisplayName, newName.length < 3 || newName.length > 16) && valid;
        valid = Utils.validateInput(elements.newBio, newBio.length > 500) && valid;
        valid = Utils.validateInput(elements.newLocation, newLocation.length > 50) && valid;

        if (!valid) return;

        db.collection('users').where('displayName', '==', newName).get().then(snapshot => {
            if (!snapshot.empty && snapshot.docs[0].id !== user.uid) {
                elements.newDisplayName.classList.add('is-invalid');
                alert("Display name is already taken. Please choose another one.");
                return;
            }

            const updates = { displayName: newName, bio: newBio, location: newLocation };
            User.updateUserProfile(user, updates);
        }).catch(Utils.handleFirebaseError);
    },
    updateMessageNames: (uid, newName) => {
        const batch = db.batch();

        const globalMessagesPromise = db.collection('messages').where('uid', '==', uid).get().then(snapshot => {
            snapshot.forEach(doc => {
                batch.update(doc.ref, { name: newName });
            });
        });

        const dmMessagesPromise = db.collection('dms').where('participants', 'array-contains', uid).get().then(snapshot => {
            const updatePromises = [];

            snapshot.forEach(dmDoc => {
                const dmId = dmDoc.id;
                const messagesRef = db.collection('dms').doc(dmId).collection('messages');

                const updatePromise = messagesRef.where('uid', '==', uid).get().then(messagesSnapshot => {
                    messagesSnapshot.forEach(messageDoc => {
                        batch.update(messageDoc.ref, { name: newName });
                    });
                });

                updatePromises.push(updatePromise);
            });

            return Promise.all(updatePromises);
        });

        Promise.all([globalMessagesPromise, dmMessagesPromise]).then(() => {
            return batch.commit();
        }).then(() => {
            User.loadProfile();
            Utils.hideOffcanvas('offcanvasExample');
        }).catch(Utils.handleFirebaseError);
    },
    updateUserProfile: (user, updates) => {
        user.updateProfile({ displayName: updates.displayName }).then(() => {
            return db.collection('users').doc(user.uid).set(updates, { merge: true });
        }).then(() => {
            User.updateMessageNames(user.uid, updates.displayName);
        }).catch(Utils.handleFirebaseError);
    },
};

// Chat Module
const Chat = {
    showGlobalChat: () => {
        Utils.toggleVisibility(elements.dmContainer, false);
        Utils.toggleVisibility(elements.globalChat, true);
    },
    sendMessage: () => {
        const currentTime = Date.now();
        const timeSinceLastMessage = currentTime - lastGlobalMessageTime;
        const remainingCooldown = Math.max(0, 2000 - timeSinceLastMessage);

        if (remainingCooldown > 0) {
            const countdownElement = document.getElementById('global-countdown-timer');
            countdownElement.innerText = `Please wait ${remainingCooldown / 1000} seconds`;
            setTimeout(() => {
                countdownElement.innerText = '';
            }, remainingCooldown);
            return;
        }

        const messageText = Chat.parseMessageText(elements.chatInput.value.trim());
        const isValid = Utils.validateInput(elements.chatInput, messageText.length === 0 || messageText.length > MESSAGE_LIMIT);

        if (!isValid) {
            const errorElement = document.getElementById('global-input-error');
            errorElement.innerText = `Message must be between 1 and ${MESSAGE_LIMIT} characters.`;
            return;
        } else {
            document.getElementById('global-input-error').innerText = '';
        }

        if (messageText) {
            db.collection('messages').add({
                text: messageText,
                uid: auth.currentUser.uid,
                name: auth.currentUser.displayName,
                timestamp: firebase.firestore.Timestamp.now()
            }).then(() => {
                elements.chatInput.value = '';
                lastGlobalMessageTime = currentTime;
            }).catch(Utils.handleFirebaseError);
        }
    },
    parseMessageText: (text) => {
        const replacements = [
            { regex: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
            { regex: /\*(.*?)\*/g, replacement: '<em>$1</em>' },
            { regex: /__(.*?)__/g, replacement: '<u>$1</u>' },
            { regex: /\|\|(.*?)\|\|/g, replacement: '<span class="spoiler">$1</span>' },
            { regex: /\[re\](.*?)\[\/re\]/g, replacement: '<span class="text-red-500">$1</span>' },
            { regex: /\[or\](.*?)\[\/or\]/g, replacement: '<span class="text-orange-500">$1</span>' },
            { regex: /\[ye\](.*?)\[\/ye\]/g, replacement: '<span class="text-yellow-500">$1</span>' },
            { regex: /\[gr\](.*?)\[\/gr\]/g, replacement: '<span class="text-green-500">$1</span>' },
            { regex: /\[bl\](.*?)\[\/bl\]/g, replacement: '<span class="text-blue-500">$1</span>' },
            { regex: /\[pu\](.*?)\[\/pu\]/g, replacement: '<span class="text-purple-500">$1</span>' },
            { regex: /\[pi\](.*?)\[\/pi\]/g, replacement: '<span class="text-pink-500">$1</span>' },
            { regex: /\[ra\](.*?)\[\/ra\]/g, replacement: '<span style="background-image: linear-gradient(to right, #EF476F, #FFAE66, #FFD166, #06D6A0, #118AB2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">$1</span>' },
            { regex: /\[us\](.*?)\[\/us\]/g, replacement: '<span style="background-image: linear-gradient(to right, #FF334F, #DEE1F3, #3471E3); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">$1</span>' },
            { regex: /\(:D\)/g, replacement: '<img src="./Assets/Images/Emojis/01.png" class="mikemoji" alt="(:D)">' },
            { regex: /\(D:\)/g, replacement: '<img src="./Assets/Images/Emojis/02.png" class="mikemoji" alt="(D:)">' },
            { regex: /\(:o\)/g, replacement: '<img src="./Assets/Images/Emojis/03.png" class="mikemoji" alt="(:o)">' },
            { regex: /\(:O\)/g, replacement: '<img src="./Assets/Images/Emojis/04.png" class="mikemoji" alt="(:O)">' },
            { regex: /\(<3\)/g, replacement: '<img src="./Assets/Images/Emojis/05.png" class="mikemoji" alt="(<3)">' },
            { regex: /\(\+D\)/g, replacement: '<img src="./Assets/Images/Emojis/06.png" class="mikemoji" alt="(+D)">' }
        ];

        replacements.forEach(({ regex, replacement }) => {
            text = text.replace(regex, replacement);
        });

        return text;
    },
    loadMessages: () => {
        db.collection('messages').orderBy('timestamp').onSnapshot(snapshot => {
            elements.chatBox.innerHTML = '';
            snapshot.forEach(doc => {
                const message = doc.data();
                const messageElement = Chat.createMessageElement(message, doc.id, false);
                elements.chatBox.appendChild(messageElement);
            });
            Chat.addUsernameClickListeners();
            elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
        });
    },
    createMessageElement: (message, messageId, isDm = false) => {
        const timestamp = new Date(message.timestamp.seconds * 1000);
        const timeString = `${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} - ${timestamp.getMonth() + 1}/${timestamp.getDate()}/${timestamp.getFullYear()}`;

        const messageElement = document.createElement('div');
        messageElement.classList.add('list-group-item', 'px-0', 'position-relative', 'hstack', 'flex-wrap', 'chat-message');
        let messageContent = message.text;
        if (message.isDeleted) {
            messageContent = '<span class="text-red-300 font-italic">Poof! Message gone</span>';
        }

        messageElement.innerHTML = `
            <div class="flex-1">
                <div class="d-flex align-items-center mb-1">
                    <a href="#" class="d-block h6 chat-username" data-uid="${message.uid}">${message.name}</a>
                    <span class="text-muted text-xs ms-2">${timeString}</span>
                    ${message.isEdited && !message.isDeleted ? '<span class="text-muted text-xs ms-2"><em>Edited</em></span>' : ''}
                    ${auth.currentUser && auth.currentUser.uid === message.uid && !message.isDeleted ? `
                        <div class="ms-auto text-end">
                            <div class="dropdown">
                                <a class="text-muted" href="#" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    <i class="ph ph-toolbox text-md me-3"></i>
                                </a>
                                <div class="dropdown-menu dropdown-menu-end">
                                    <button class="dropdown-item edit-button" data-message-id="${messageId}" data-is-dm="${isDm}">Edit</button>
                                    <button class="dropdown-item delete-button" data-message-id="${messageId}" data-is-dm="${isDm}">Delete</button>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                </div>
                <div class="d-flex align-items-center">
                    <div class="w-3/4 text-sm text-muted me-auto" id="message-text-${messageId}">${messageContent}</div>
                </div>
            </div>
        `;
        return messageElement;
    },
    deleteMessage: (messageId, isDm = false) => {
        const collection = isDm ? 'dms' : 'messages';
        const dmId = isDm ? DM.createDmId(auth.currentUser.uid, DM.currentDmUserId) : null;
        const docRef = isDm ? db.collection(collection).doc(dmId).collection('messages').doc(messageId) : db.collection(collection).doc(messageId);

        docRef.update({
            text: '',
            isDeleted: true
        }).catch(Utils.handleFirebaseError);
    },
    editMessage: (messageId, isDm = false) => {
        const messageElement = document.getElementById(`message-text-${messageId}`);
        const currentText = messageElement.innerText;
        let newText = prompt("Edit your message:", currentText);
        if (newText !== null && newText.trim() !== '') {
            const collection = isDm ? 'dms' : 'messages';
            const dmId = isDm ? DM.createDmId(auth.currentUser.uid, DM.currentDmUserId) : null;
            const docRef = isDm ? db.collection(collection).doc(dmId).collection('messages').doc(messageId) : db.collection(collection).doc(messageId);

            docRef.update({
                text: newText.trim(),
                isEdited: true
            }).catch(Utils.handleFirebaseError);
        }
    },
    addUsernameClickListeners: () => {
        document.querySelectorAll('.chat-username').forEach(item => {
            item.addEventListener('click', event => {
                const uid = event.target.getAttribute('data-uid');
                User.showProfileModal(uid);
            });
        });
    },
};

// DM Module
const DM = {
    currentDmUserId: null,
    showDms: () => {
        Utils.toggleVisibility(elements.globalChat, false);
        Utils.toggleVisibility(elements.dmContainer, true);
    },
    sendDmMessage: () => {
        const currentTime = Date.now();
        const timeSinceLastMessage = currentTime - lastDmMessageTime;
        const remainingCooldown = Math.max(0, 2000 - timeSinceLastMessage);

        if (remainingCooldown > 0) {
            const countdownElement = document.getElementById('dm-countdown-timer');
            countdownElement.innerText = `Please wait ${remainingCooldown / 1000} seconds`;
            setTimeout(() => {
                countdownElement.innerText = '';
            }, remainingCooldown);
            return;
        }

        const messageText = Chat.parseMessageText(elements.dmChatInput.value.trim());
        const isValid = Utils.validateInput(elements.dmChatInput, messageText.length === 0 || messageText.length > MESSAGE_LIMIT);

        if (!isValid) {
            const errorElement = document.getElementById('dm-input-error');
            errorElement.innerText = `Message must be between 1 and ${MESSAGE_LIMIT} characters.`;
            return;
        } else {
            document.getElementById('dm-input-error').innerText = '';
        }

        if (messageText && DM.currentDmUserId) {
            const currentUser = auth.currentUser.uid;

            if (currentUser === DM.currentDmUserId) {
                alert("You cannot send messages to yourself.");
                return;
            }

            const dmId = DM.createDmId(currentUser, DM.currentDmUserId);

            db.collection('dms').doc(dmId).set({
                participants: [currentUser, DM.currentDmUserId]
            }, { merge: true });

            db.collection('dms').doc(dmId).collection('messages').add({
                text: messageText,
                uid: currentUser,
                name: auth.currentUser.displayName,
                timestamp: firebase.firestore.Timestamp.now()
            }).then(() => {
                elements.dmChatInput.value = '';
                lastDmMessageTime = currentTime;
            }).catch(Utils.handleFirebaseError);
        }
    },
    createDmId: (uid1, uid2) => [uid1, uid2].sort().join('_'),
    loadDms: (searchQuery = '') => {
        const currentUser = auth.currentUser.uid;
        const uniqueUsers = new Set();

        db.collection('dms').where('participants', 'array-contains', currentUser).onSnapshot(snapshot => {
            const userPromises = [];
            snapshot.forEach(doc => {
                const dm = doc.data();
                const otherUserId = dm.participants.find(participant => participant !== currentUser);
                if (otherUserId && !uniqueUsers.has(otherUserId)) {
                    uniqueUsers.add(otherUserId);
                    userPromises.push(db.collection('users').doc(otherUserId).get());
                }
            });

            Promise.all(userPromises).then(userDocs => {
                elements.dmList.innerHTML = '';
                userDocs.forEach(userDoc => {
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const displayName = userData.displayName.toLowerCase();
                        if (displayName.includes(searchQuery)) {
                            const dmElement = document.createElement('div');
                            dmElement.innerHTML = `
                                <div class="form-item-checkable">
                                    <input class="form-item-check" type="radio" name="filter-version" id="dmUser_${userData.displayName}">
                                    <label class="item w-full" for="dmUser_${userData.displayName}">
                                        <span class="form-item-click d-flex align-items-center border border-primary-hover text-heading p-3 rounded-2">
                                            <i class="ph ph-users text-lg me-3"></i>
                                            <span class="text-body text-sm font-semibold">
                                                ${userData.displayName}
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            `;
                            dmElement.addEventListener('click', () => DM.startDm(userDoc.id));
                            elements.dmList.appendChild(dmElement);
                        }
                    } else {
                        console.error("User document does not exist:", userDoc.id);
                    }
                });
            }).catch(Utils.handleFirebaseError);
        });
    },
    startDm: (uid) => {
        DM.currentDmUserId = uid;
        DM.loadDmMessages(uid);
        DM.showDms();
    },
    loadDmMessages: (uid) => {
        const currentUser = auth.currentUser.uid;
        const dmId = DM.createDmId(currentUser, uid);

        db.collection('dms').doc(dmId).collection('messages').orderBy('timestamp').onSnapshot(snapshot => {
            elements.dmChatBox.innerHTML = '';
            snapshot.forEach(doc => {
                const message = doc.data();
                elements.dmChatBox.appendChild(Chat.createMessageElement(message, doc.id, true));
            });
            elements.dmChatBox.scrollTop = elements.dmChatBox.scrollHeight;
        });
    }
};

// Event Listeners
elements.loginButton?.addEventListener('click', Auth.login);
elements.logoutButton?.addEventListener('click', Auth.logout);
elements.sendButton?.addEventListener('click', Chat.sendMessage);
elements.saveSettingsButton?.addEventListener('click', User.saveSettings);
elements.globalChatButton?.addEventListener('click', Chat.showGlobalChat);
elements.dmsButton?.addEventListener('click', DM.showDms);
elements.dmSendButton?.addEventListener('click', DM.sendDmMessage);
elements.dmSearchInput?.addEventListener('input', () => DM.loadDms(elements.dmSearchInput.value.toLowerCase()));

auth.onAuthStateChanged(Auth.handleAuthStateChanged);

document.addEventListener('DOMContentLoaded', function () {
    function insertFormat(format) {
        const chatInput = elements.chatInput;
        const startPos = chatInput.selectionStart;
        const endPos = chatInput.selectionEnd;
        const textBefore = chatInput.value.substring(0, startPos);
        const textAfter = chatInput.value.substring(endPos, chatInput.value.length);
        chatInput.value = `${textBefore}${format}${textAfter}`;
        chatInput.focus();
        chatInput.setSelectionRange(startPos + format.indexOf('TEXT'), startPos + format.indexOf('TEXT') + 4);
    }

    document.querySelectorAll('.format-example').forEach(item => {
        item.addEventListener('click', event => {
            const format = event.target.closest('.format-example').getAttribute('data-format');
            insertFormat(format);
        });
    });

    document.addEventListener('click', function (event) {
        if (event.target.matches('.edit-button')) {
            const messageId = event.target.dataset.messageId;
            const messageText = document.getElementById(`message-text-${messageId}`).innerText;
            const isDm = event.target.dataset.isDm === 'true';
            Chat.editMessage(messageId, isDm);
        } else if (event.target.matches('.delete-button')) {
            const messageId = event.target.dataset.messageId;
            const isDm = event.target.dataset.isDm === 'true';
            Chat.deleteMessage(messageId, isDm);
        }
    });
});