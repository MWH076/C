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
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 30;
const BIO_MAX_LENGTH = 500;
const LOCATION_MAX_LENGTH = 50;

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
elements.dmSearchInput?.addEventListener('input', function () {
    const query = this.value.toLowerCase();
    loadDms(query);
});

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
        'Supporter3': 'bg-blue-500 ph-diamond',
        'Supporter2': 'bg-purple-500 ph-crown-simple',
        'Supporter1': 'bg-indigo-500 ph-heart',
        'Veteran': 'bg-orange-500 ph-star',
        'User': 'bg-gray-700 ph-user-check'
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

document.addEventListener('DOMContentLoaded', function() {
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

function loadMessages() {
    db.collection('messages').orderBy('timestamp').onSnapshot(snapshot => {
        elements.chatBox.innerHTML = '';
        snapshot.forEach(doc => {
            const message = doc.data();
            elements.chatBox.appendChild(createMessageElement(message));
        });
        addUsernameClickListeners();
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    });
}

function createMessageElement(message) {
    const timestamp = new Date(message.timestamp.seconds * 1000);
    const timeString = `${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })} - ${timestamp.getMonth() + 1}/${timestamp.getDate()}/${timestamp.getFullYear()}`;

    const messageElement = document.createElement('div');
    messageElement.classList.add('list-group-item', 'px-0', 'position-relative', 'hstack', 'flex-wrap', 'chat-message');
    messageElement.innerHTML = `
        <div class="flex-1">
            <div class="d-flex align-items-center mb-1">
                <a href="#" class="d-block h6 chat-username" data-uid="${message.uid}">${message.name}</a>
                <span class="text-muted text-xs ms-2">${timeString}</span>
            </div>
            <div class="d-flex align-items-center">
                <div class="w-3/4 text-sm text-muted me-auto">${message.text}</div>
            </div>
        </div>
    `;
    return messageElement;
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
        elements.dmChatBox.innerHTML = '';
        snapshot.forEach(doc => {
            const message = doc.data();
            elements.dmChatBox.appendChild(createMessageElement(message));
        });
        elements.dmChatBox.scrollTop = elements.dmChatBox.scrollHeight;
    });
}

// Settings functions
function saveSettings() {
    const newName = elements.newDisplayName.value;
    const newBio = elements.newBio.value;
    const newLocation = elements.newLocation.value;
    const user = auth.currentUser;

    if (!isValidName(newName) || !isValidBio(newBio) || !isValidLocation(newLocation)) {
        return;
    }

    db.collection('users').where('displayName', '==', newName).get().then(snapshot => {
        if (!snapshot.empty && snapshot.docs[0].id !== user.uid) {
            alert("Display name is already taken. Please choose another one.");
            return;
        }

        const updates = { displayName: newName, bio: newBio, location: newLocation };
        updateUserProfile(user, updates);
    });
}

function isValidName(name) {
    if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
        alert(`Display name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`);
        return false;
    }
    return true;
}

function isValidBio(bio) {
    if (bio.length < 0 || bio.length > BIO_MAX_LENGTH) {
        alert(`Bio cannot be longer than ${BIO_MAX_LENGTH} characters.`);
        return false;
    }
    return true;
}

function isValidLocation(location) {
    if (location.length < 0 || location.length > LOCATION_MAX_LENGTH) {
        alert(`Location cannot be longer than ${LOCATION_MAX_LENGTH} characters.`);
        return false;
    }
    return true;
}

function updateUserProfile(user, updates) {
    user.updateProfile({ displayName: updates.displayName }).then(() => {
        return db.collection('users').doc(user.uid).set(updates, { merge: true });
    }).then(() => {
        updateMessageNames(user.uid, updates.displayName);
    }).catch(console.error);
}

function updateMessageNames(uid, newName) {
    db.collection('messages').where('uid', '==', uid).get().then(snapshot => {
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { name: newName });
        });
        return batch.commit();
    }).then(() => {
        loadProfile();
        hideModal('modal_example');
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
}

// Run initialization
init();