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
    const propName = isEncodedDataURI(value) ? 'data' : 'url';
    const image = new Image();
    image.src = value;

    if (isEncodedDataURI(value) || isValidURL(value)) {
        return { width: image.width, height: image.height, [propName]: value };
    }

    return {}
}

function getData() {
    const response = {
        url: '',
        dataURI: '',
        width: 0,
        height: 0,
        text: ''
    };
    const targets = document.elementsFromPoint(window.targetEvent.clientX, window.targetEvent.clientY);

    for (const target of targets) {
        const propName = target.currentSrc && isEncodedDataURI(target.currentSrc) ? 'data' : 'url';

        switch (target.tagName) {
            case "AUDIO":
                response[propName] = target.currentSrc;
                break;
            case "VIDEO":
                response[propName] = target.currentSrc;
                response.width = target.videoWidth;
                response.height = target.videoHeight;
                break;
            case "IMG":
                response[propName] = target.currentSrc;
                response.width = target.naturalWidth;
                response.height = target.naturalHeight;
                break;
            default:
                if (target.parentElement && target.parentElement.tagName === 'svg') {
                    const svgRect = target.getBoundingClientRect();

                    response.data = btoa(target.outerHTML);
                    response.width = svgRect.width;
                    response.height = svgRect.height;
                }
                else {
                    const src = getPropsFromStyle();
                    Object.assign(response, src);
                }
                break;
        }
        response.text = !(response.url || response.data) ? window.getSelection().toString() : '';

        if (Object.values(response).some(Boolean) && target.tagName != 'HTML') {
            break;
        }
    }
    return response;
}

function handleMessage(request, sender, sendResponse) {
    sendResponse(window[request.command]());
};

function onContextMenuHandler(e) {
    window.targetEvent = e;
}

function main(isAddFlag = true) {
    console.log('event listeners added');
    chrome.runtime.onMessage.addListener(handleMessage);
    const manageEventListener = isAddFlag ? 'addEventListener' : 'removeEventListener';
    document[manageEventListener]('contextmenu', onContextMenuHandler);
}

window.onload = main;
