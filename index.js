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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

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

// Constants
const MESSAGE_LIMIT = 5000;
const PROFILE_MODAL_ID = 'profile_modal';

// Variables
let currentDmUserId = null;

// Event listeners
elements.loginButton?.addEventListener('click', login);
elements.logoutButton?.addEventListener('click', logout);
elements.sendButton?.addEventListener('click', sendMessage);
elements.saveSettingsButton?.addEventListener('click', saveSettings);
elements.globalChatButton?.addEventListener('click', showGlobalChat);
elements.dmsButton?.addEventListener('click', showDms);
elements.dmSendButton?.addEventListener('click', sendDmMessage);
elements.dmSearchInput?.addEventListener('input', debounce(function () {
    const query = this.value.toLowerCase();
    loadDms(query);
}, 300));

// Authentication state change handler
auth.onAuthStateChanged(handleAuthStateChanged);

// Auth functions
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
}

function logout() {
    auth.signOut();
}

function handleAuthStateChanged(user) {
    if (user) {
        setupUser(user);
        loadProfile();
        loadMessages();
        loadDms();
        toggleVisibility(elements.loginContainer, false);
        toggleVisibility(elements.chatContainer, true);
        showGlobalChat();
    } else {
        toggleVisibility(elements.loginContainer, true);
        toggleVisibility(elements.chatContainer, false);
        toggleVisibility(elements.globalChat, false);
        toggleVisibility(elements.dmContainer, false);
    }
}

// User setup functions
function setupUser(user) {
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
    }).catch(console.error);
}

// UI functions
function toggleVisibility(element, show) {
    if (element) {
        element.classList.toggle('d-none', !show);
    }
}

function openModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const modalInstance = bootstrap.Modal.getInstance(modal);
    modalInstance.hide();
}

function loadProfile() {
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
    }).catch(console.error);
}

function showProfileModal(uid) {
    const userRef = db.collection('users').doc(uid);

    userRef.get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('profile-display-name').innerText = userData.displayName;
            document.getElementById('profile-bio').innerText = userData.bio || 'Bio pending approval from my cat. Meow back later!';
            document.getElementById('profile-location').innerText = userData.location || 'No location yet, exploring Earth!';
            document.getElementById('profile-badges').innerHTML = userData.badges.map(createBadge).join(' ');

            openModal(PROFILE_MODAL_ID);

            document.getElementById('dm-button').addEventListener('click', () => {
                handleProfileDmButtonClick(uid);
                closeModal(PROFILE_MODAL_ID);
            });
        } else {
            console.error("No such user!");
        }
    }).catch(error => {
        console.error("Error fetching user document:", error);
    });
}

function handleProfileDmButtonClick(uid) {
    startDm(uid);
    closeModal(PROFILE_MODAL_ID);
}

function createBadge(badge) {
    const badgeClasses = {
        'Administrator': 'bg-red-500 ph-shield-star',
        'Moderator': 'bg-pink-500 ph-gavel',
        'Supporter3': 'bg-blue-500 ph-crown-simple',
        'Supporter2': 'bg-purple-500 ph-diamond',
        'Supporter1': 'bg-indigo-500 ph-heart',
        'Veteran': 'bg-orange-500 ph-star',
        'User': 'bg-gray-700 ph-user'
    };

    const badgeName = badge;
    const badgeClass = badgeClasses[badgeName];

    return `<span class="badge ${badgeClass}" data-toggle="tooltip" data-placement="top" title="${badgeName}"><i class="ph ${badgeClass}"></i></span>`;
}

// Navigation functions
function showGlobalChat() {
    toggleVisibility(elements.dmContainer, false);
    toggleVisibility(elements.globalChat, true);
}

function showDms() {
    toggleVisibility(elements.globalChat, false);
    toggleVisibility(elements.dmContainer, true);
}

// Message functions
function sendMessage() {
    const messageText = parseMessageText(elements.chatInput.value.trim());
    if (messageText.length > MESSAGE_LIMIT) {
        alert(`Message is too long. Please keep it under ${MESSAGE_LIMIT} characters.`);
        return;
    }
    if (messageText) {
        db.collection('messages').add({
            text: messageText,
            uid: auth.currentUser.uid,
            name: auth.currentUser.displayName,
            timestamp: firebase.firestore.Timestamp.now()
        }).then(() => {
            elements.chatInput.value = '';
        }).catch(console.error);
    }
}

function parseMessageText(text) {
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
        { regex: /\[us\](.*?)\[\/us\]/g, replacement: '<span style="background-image: linear-gradient(to right, #FF334F, #DEE1F3, #3471E3); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">$1</span>' }
    ];

    replacements.forEach(({ regex, replacement }) => {
        text = text.replace(regex, replacement);
    });

    return text;
}

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
});

function loadMessages(lastVisible = null) {
    let query = db.collection('messages').orderBy('timestamp').limit(20);
    if (lastVisible) {
        query = query.startAfter(lastVisible);
    }
    query.get().then(snapshot => {
        const fragment = document.createDocumentFragment();
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        snapshot.forEach(doc => {
            const message = doc.data();
            const messageElement = createMessageElement(message, doc.id, false);
            fragment.appendChild(messageElement);
        });
        elements.chatBox.innerHTML = '';
        elements.chatBox.appendChild(fragment);
        addUsernameClickListeners();
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
        elements.chatBox.onscroll = () => {
            if (elements.chatBox.scrollTop + elements.chatBox.clientHeight >= elements.chatBox.scrollHeight) {
                loadMessages(lastDoc);
            }
        };
    }).catch(console.error);
}

function createMessageElement(message, messageId, isDm = false) {
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
                                <a href="#!" class="dropdown-item edit-button" data-message-id="${messageId}" data-is-dm="${isDm}">Edit</a>
                                <a href="#!" class="dropdown-item delete-button" data-message-id="${messageId}" data-is-dm="${isDm}">Delete</a>
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
}

function deleteMessage(messageId, isDm = false) {
    const collection = isDm ? 'dms' : 'messages';
    const dmId = isDm ? createDmId(auth.currentUser.uid, currentDmUserId) : null;
    const docRef = isDm ? db.collection(collection).doc(dmId).collection('messages').doc(messageId) : db.collection(collection).doc(messageId);

    docRef.update({
        text: '',
        isDeleted: true
    }).catch(console.error);
}

function editMessage(messageId, isDm = false) {
    const messageElement = document.getElementById(`message-text-${messageId}`);
    const currentText = messageElement.innerText;
    let newText = prompt("Edit your message:", currentText);
    if (newText !== null && newText.trim() !== '') {
        const collection = isDm ? 'dms' : 'messages';
        const dmId = isDm ? createDmId(auth.currentUser.uid, currentDmUserId) : null;
        const docRef = isDm ? db.collection(collection).doc(dmId).collection('messages').doc(messageId) : db.collection(collection).doc(messageId);
        
        docRef.update({
            text: newText.trim(),
            isEdited: true
        }).catch(console.error);
    }
}

function addUsernameClickListeners() {
    document.querySelectorAll('.chat-username').forEach(item => {
        item.addEventListener('click', event => {
            const uid = event.target.getAttribute('data-uid');
            showProfileModal(uid);
        });
    });
}

// DM functions
function sendDmMessage() {
    const messageText = parseMessageText(elements.dmChatInput.value.trim());
    if (messageText.length > MESSAGE_LIMIT) {
        alert(`Message is too long. Please keep it under ${MESSAGE_LIMIT} characters.`);
        return;
    }
    if (messageText && currentDmUserId) {
        const currentUser = auth.currentUser.uid;

        if (currentUser === currentDmUserId) {
            alert("You cannot send messages to yourself.");
            return;
        }

        const dmId = createDmId(currentUser, currentDmUserId);

        db.collection('dms').doc(dmId).set({
            participants: [currentUser, currentDmUserId]
        }, { merge: true });

        db.collection('dms').doc(dmId).collection('messages').add({
            text: messageText,
            uid: currentUser,
            name: auth.currentUser.displayName,
            timestamp: firebase.firestore.Timestamp.now()
        }).then(() => {
            elements.dmChatInput.value = '';
            console.log('Message sent successfully');
        }).catch(error => {
            console.error('Error sending message:', error);
        });
    }
}

function createDmId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

function loadDms(searchQuery = '') {
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
                        dmElement.addEventListener('click', () => startDm(userDoc.id));
                        elements.dmList.appendChild(dmElement);
                    }
                } else {
                    console.error("User document does not exist:", userDoc.id);
                }
            });
        }).catch(error => {
            console.error("Error fetching user documents:", error);
        });
    });
}

function startDm(uid) {
    currentDmUserId = uid;
    loadDmMessages(uid);
    showDms();
}

function loadDmMessages(uid) {
    const currentUser = auth.currentUser.uid;
    const dmId = createDmId(currentUser, uid);

    db.collection('dms').doc(dmId).collection('messages').orderBy('timestamp').onSnapshot(snapshot => {
        const fragment = document.createDocumentFragment();
        snapshot.forEach(doc => {
            const message = doc.data();
            fragment.appendChild(createMessageElement(message, doc.id, true));
        });
        elements.dmChatBox.innerHTML = '';
        elements.dmChatBox.appendChild(fragment);
        elements.dmChatBox.scrollTop = elements.dmChatBox.scrollHeight;
    });
}

// Settings functions
function saveSettings() {
    const newName = elements.newDisplayName.value;
    const newBio = elements.newBio.value;
    const newLocation = elements.newLocation.value;
    const user = auth.currentUser;

    db.collection('users').where('displayName', '==', newName).get().then(snapshot => {
        if (!snapshot.empty && snapshot.docs[0].id !== user.uid) {
            alert("Display name is already taken. Please choose another one.");
            return;
        }

        const updates = { displayName: newName, bio: newBio, location: newLocation };
        updateUserProfile(user, updates);
    });
}

function updateMessageNames(uid, newName) {
    const batch = db.batch();

    db.collection('messages').where('uid', '==', uid).get().then(snapshot => {
        snapshot.forEach(doc => {
            batch.update(doc.ref, { name: newName });
        });
        return db.collection('dms').where('participants', 'array-contains', uid).get();
    }).then(snapshot => {
        const updatePromises = snapshot.docs.map(dmDoc => {
            const dmId = dmDoc.id;
            const messagesRef = db.collection('dms').doc(dmId).collection('messages');
            return messagesRef.where('uid', '==', uid).get().then(messagesSnapshot => {
                messagesSnapshot.forEach(messageDoc => {
                    batch.update(messageDoc.ref, { name: newName });
                });
            });
        });
        return Promise.all(updatePromises);
    }).then(() => batch.commit())
    .then(() => {
        loadProfile();
        hideModal('modal_example');
    }).catch(console.error);
}

function updateUserProfile(user, updates) {
    user.updateProfile({ displayName: updates.displayName }).then(() => {
        return db.collection('users').doc(user.uid).set(updates, { merge: true });
    }).then(() => {
        updateMessageNames(user.uid, updates.displayName);
    }).catch(console.error);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    const modalInstance = bootstrap.Modal.getInstance(modal);
    modalInstance.hide();
}

// Initialization
function init() {
    elements.loginButton.addEventListener('click', login);
    elements.logoutButton.addEventListener('click', logout);
    elements.sendButton.addEventListener('click', sendMessage);
    elements.saveSettingsButton.addEventListener('click', saveSettings);
    elements.globalChatButton.addEventListener('click', showGlobalChat);
    elements.dmsButton.addEventListener('click', showDms);
    elements.dmSendButton.addEventListener('click', sendDmMessage);
    auth.onAuthStateChanged(handleAuthStateChanged);
    document.addEventListener('click', function (event) {
        if (event.target.matches('.edit-button')) {
            const messageId = event.target.dataset.messageId;
            const messageText = document.getElementById(`message-text-${messageId}`).innerText;
            const isDm = event.target.dataset.isDm === 'true';
            editMessage(messageId, messageText, isDm);
        } else if (event.target.matches('.delete-button')) {
            const messageId = event.target.dataset.messageId;
            const isDm = event.target.dataset.isDm === 'true';
            deleteMessage(messageId, isDm);
        }
    });
}

// Run initialization
init();