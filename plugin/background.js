"use strict";

const OPTIONS = {
    MAXSIZE: 10485760, // 10 MB
    VIDEOMAXSIZE: 524288000, // 500 MB
    TARGETURL: 'http://127.0.0.1:5000/'
}

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

async function getDataFromUrl(src) {
    if (src.startsWith('data:')) {
        return { url: '', dataURI: src, filename: '', size: 0 };
    }

    try {
        const response = await fetch(src, { method: 'HEAD' });
        const contentType = response.headers.get('Content-Type');
        const contentLength = parseInt(response.headers.get('Content-Length'));
        const filename = src.split('#').shift().split('?').shift().split('/').pop();

        if (contentLength > OPTIONS[contentType.startsWith('video') ? 'VIDEOMAXSIZE' : 'MAXSIZE']) {
            return { dataURI: '', filename: filename, size: contentLength };
        }

        const dataURI = await toDataURI(src);

        return { dataURI: dataURI, filename: filename, size: contentLength };
    }
    catch (err) {
        return { dataURI: '', filename: '', size: 0 };
    }
}

function handleData(contentData) {
    if (!(contentData && Object.values(contentData).some(Boolean))) {
        return;
    }

    chrome.tabs.query({ currentWindow: true, active: true },
        async tabs => {
            const curTime = new Date().toUTCString();

            if (!contentData.data && contentData.url) {
                const res = await getDataFromUrl(contentData.url);

                Object.assign(contentData, res);
            }

            Object.assign(contentData, {
                srcPageUrl: tabs[0].url,
                time: curTime
            });
            
            console.log('Object for sending: ', contentData);
            
            // fetch(OPTIONS.TARGETURL, {
            //     method: 'post',
            //     headers: {
            //         'Accept': 'application/json',
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify(contentData)
            // })
            // .then(res => "Inform user about success")
            // .catch(err => "Error");
        }
    );
}

function contextMenuOnClick(info, tab) {
    const msg = {
        command: "getData"
    }
    chrome.tabs.sendMessage(tab.id, msg, handleData);
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create(
        {
            "title": "Send to Site.com",
            "contexts": ["all"],
            "onclick": contextMenuOnClick
        }
    );
});