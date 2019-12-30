"use strict";

function isEnabled() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['isEnabled'], (dict) => {
            if (dict.isEnabled === 'undefined') {
                chrome.storage.local.set({ isEnabled: false });
                resolve(false);
            } else {
                resolve(dict.isEnabled);
            }
        });
    });
}

function togglePinMode(target) {
    const flag = !target.checked;

    chrome.tabs.query({ currentWindow: true, active: true }, tabs => {
        chrome.storage.sync.set({ isEnabled: flag });
        chrome.tabs.sendMessage(tabs[0].id, { 'command': 'manageHoverEvents', 'args': [flag] });
    });
}

window.addEventListener('load', e => {
    const inputElement = document.querySelector('.switch input');
    const toggleButton = inputElement.nextElementSibling;

    isEnabled().then(value => inputElement.checked = value);
    toggleButton.addEventListener('click', e => togglePinMode(e.target.parentElement.previousElementSibling));
});
