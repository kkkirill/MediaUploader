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

async function toDataURI(url) {
    return fetch(url)
        .then(response => response.blob())
        .then(blob => new Promise((resolve, reject) => {
            const fileReader = new FileReader();

            fileReader.onloadend = () => resolve(fileReader.result);
            fileReader.onerror = reject;
            fileReader.readAsDataURL(blob);
        }));
}

async function getContentMetaFromUrl(src) {
    const dataObj = {
        url: '',
        dataURI: '',
        filename: '',
        size: 0
    };

    if (!src.length) {
        return {}
    } else if (src.startsWith('data:')) {
        return {url: '', dataURI: src, filename: '', size: 0};
    }

    try {
        const response = await fetch(src, {method: 'HEAD'});
        const contentType = response.headers.get('Content-Type');
        const contentLength = parseInt(response.headers.get('Content-Length'));
        const filename = src.split('#').shift().split('?').shift().split('/').pop();

        if (OPTIONS.isBigContentLength(contentType, contentLength)) {
            Object.assign(dataObj, {url: src, dataURI: '', filename: filename, size: contentLength});
        }

        const dataURI = await toDataURI(src);

        Object.assign(dataObj, {url: src, dataURI: dataURI, filename: filename, size: contentLength});
    } catch (err) {
        Object.assign(dataObj, {url: '', dataURI: '', filename: '', size: 0});
    }

    return dataObj;
}

function handleData(content) {
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
        ...(await getContentMetaFromUrl(content.src))
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
});
