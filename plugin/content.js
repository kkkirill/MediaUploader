"use strict";

function isValidURL(str) {
    const a = document.createElement('a');
    a.href = str;

    return !!a.host && a.host != window.location.host;
}

function isEncodedDataURI(str) {
    return str.startsWith('data:') && (str.match(/;([^,]+)/) || [])[1] === 'base64';
}

function getPropsFromStyle() {
    const styles = [
        getComputedStyle(window.targetEvent.target),
        getComputedStyle(window.targetEvent.target, ':before'),
        getComputedStyle(window.targetEvent.target, ':after'),
    ];
    const targetSrc = styles.filter(e => e.backgroundImage !== 'none')[0];

    if (!targetSrc) {
        return {};
    }

    const value = targetSrc.backgroundImage.replace(/url\((['"])?(.*?)\1\)/gi, '$2').split(', ')[0];
    const propName = isEncodedDataURI(value) ? 'dataURI' : 'url';
    const image = new Image();
    image.src = value;

    if (isEncodedDataURI(value) || isValidURL(value)) {
        return { width: image.width, height: image.height, [propName]: value };
    }

    return {}
}

function getData() {
    const contentData = {
        url: '',
        dataURI: '',
        width: 0,
        height: 0,
        text: ''
    };
    const targets = document.elementsFromPoint(window.targetEvent.clientX, window.targetEvent.clientY);

    for (const target of targets) {
        const propName = target.currentSrc && isEncodedDataURI(target.currentSrc) ? 'dataURI' : 'url';

        switch (target.tagName) {
            case "AUDIO":
                contentData[propName] = target.currentSrc;
                break;
            case "VIDEO":
                contentData[propName] = target.currentSrc;
                contentData.width = target.videoWidth;
                contentData.height = target.videoHeight;
                break;
            case "IMG":
                contentData[propName] = target.currentSrc;
                contentData.width = target.naturalWidth;
                contentData.height = target.naturalHeight;
                break;
            default:
                if (target.parentElement && target.parentElement.tagName === 'svg') {
                    const svgRect = target.getBoundingClientRect();

                    contentData.data = btoa(target.outerHTML);
                    contentData.width = svgRect.width;
                    contentData.height = svgRect.height;
                }
                else {
                    const src = getPropsFromStyle();
                    Object.assign(contentData, src);
                }
                break;
        }
        contentData.text = !(contentData.url || contentData.data) ? window.getSelection().toString() : '';

        if (Object.values(contentData).some(Boolean) && target.tagName != 'HTML') {
            break;
        }
    }
    return contentData;
}

function handleMessage(request, sender, sendResponse) {
    sendResponse(window[request.command]());
};

function onContextMenuHandler(e) {
    window.targetEvent = e;
}

function main(isAddFlag = true) {
    chrome.runtime.onMessage.addListener(handleMessage);
    const manageEventListener = isAddFlag ? 'addEventListener' : 'removeEventListener';
    document[manageEventListener]('contextmenu', onContextMenuHandler);
}

window.onload = main;
