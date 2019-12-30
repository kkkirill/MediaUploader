"use strict";

const OPTIONS = {
    MAXSIZE: 10485760, // 10 MB
    VIDEO_MAX_SIZE: 524288000, // 500 MB
    TARGET_URL: 'http://127.0.0.1:5000/',
    isBigContentLength: function (contentType, contentLength) {
        const maxSize = contentType.startsWith('video') ? this.VIDEO_MAX_SIZE : this.MAXSIZE;
        return contentLength > maxSize;
    }
};

function toDataURI(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject('');

        reader.readAsDataURL(blob);
    });
}

async function getContentMetaFromUrl(src, text) {
    const dataObj = {
        url: '',
        dataURI: '',
        filename: '',
        size: 0,
        text: ''
    };

    if (!src.length) {
        return Object.assign(dataObj, { text, size: new Blob([text]).size });
    }
    else if (src.startsWith('data:')) {
        const equalSignsAmount = src.slice(-2).split('=').length - 1;
        const base64 = src.substring(src.indexOf(',') + 1);
        const size = Math.ceil(base64.length / 4 * 3) - equalSignsAmount;

        return { url: '', dataURI: src, filename: '', size };
    } else if (src.startsWith('blob:')) {
        const blob = await fetch(src, {credentials: 'include'}).then(res => res.blob());
        const dataURI = await new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = reject;
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });

        return { url: src, dataURI: dataURI, filename: '', size };
    }

    try {
        const response = await fetch(src);
        const contentType = response.headers.get('Content-Type');
        const contentLength = parseInt(response.headers.get('Content-Length'));
        const filename = src.split('#').shift().split('?').shift().split('/').pop();

        if (OPTIONS.isBigContentLength(contentType, contentLength)) {
            return Object.assign(dataObj, { url: src, dataURI: '', filename: filename, size: contentLength });
        }

        const blob = await response.blob();
        const dataURI = await toDataURI(blob);

        Object.assign(dataObj, { url: src, dataURI: dataURI, filename: filename, size: contentLength });
    } catch (err) {
        Object.assign(dataObj, { url: '', dataURI: '', filename: '', size: 0 });
    }

    return dataObj;
}

function handleData(content) {
    console.log(content);
    if ('error' in content || !(content && Object.values(content).some(Boolean))) {
        return;
    }

    chrome.tabs.query({
        currentWindow: true,
        active: true
    },
        (tabs) => sendToServer(tabs[0], content)
    );
}

async function sendToServer(currentTab, content) {
    const extendedContent = {
        srcPageUrl: currentTab.url,
        time: new Date().toUTCString(),
        ...(await getContentMetaFromUrl(content.src, content.text))
    };

    console.log('Object for sending: ', extendedContent);

    fetch(OPTIONS.TARGET_URL, {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(extendedContent)
    })
        .then(res => "Inform user about success")
        .catch(err => "Error");
}

function onContextMenuClick(info, tab) {
    const msg = {
        command: "getContentData",
        args: []
    };
    chrome.tabs.sendMessage(tab.id, msg, handleData);
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        'title': 'Send to Site.com',
        'contexts': [
            'image',
            'video',
            'audio',
            'selection',
            'page'
        ],
        'onclick': onContextMenuClick
    }
    );
    chrome.runtime.onMessage.addListener(async content => handleData(content));
});
