"use strict";

function isValidURL(str) {
    const a = document.createElement('a');
    a.href = str;

    return !!a.host && a.host != window.location.host;
}

function isEncodedDataURI(str) {
    return str.startsWith('data:') && (str.match(/;([^,]+)/) || [])[1] === 'base64';
}

function getBackgroundImgStyles(target) {
    const styles = [
        getComputedStyle(target),
        getComputedStyle(target, ':before'),
        getComputedStyle(target, ':after'),
    ];
    return styles.filter(e => e.backgroundImage !== 'none')
}

function getPropsFromStyle() {
    const targetSrc = getBackgroundImgStyles(window.MUData.targetEvent.target)[0];

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
    const targets = document.elementsFromPoint(window.MUData.targetEvent.clientX, window.MUData.targetEvent.clientY);

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
    sendResponse(window[request.command](...request.args));
};

function saveEvent(e) {
    window.MUData.targetEvent = e;
}

function main(isAddFlag = true) {
    let manageEventListenerAttr = 'addEventListener';
    window.MUData = {
        minElementWidth: 50,
        minElementHeight: 50,
        pin: {
            width: 20,
            height: 20,
            paddingTop: 10,
            paddingRight: 10
        },
        popup: {
            cssLinkClassName: "RANDOMNAME",
            cssLinkHref: "../css/hover.css"
        }
    }

    manageHoverEvents(isAddFlag);
    if (isAddFlag) {
        chrome.runtime.onMessage.addListener(handleMessage);

        let link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('type', 'text/css');
        link.setAttribute('href', '../css/hover.css');
        link.setAttribute('className', 'RANDOMNAME');

        // link.rel = "stylesheet";
        // link.type = "text/css";
        // link.href = "../css/hover.css";
        // link.className = "RANDOMNAME";

        document.querySelector('head').appendChild(link);
    }
    else {
        const target = document.getElementsByClassName('RANDOMNAME')[0];

        document.querySelector('head').removeChild(target);
        chrome.runtime.onMessage.removeListener(handleMessage);

        manageEventListenerAttr = 'removeEventListener';
    }

    document[manageEventListenerAttr]('contextmenu', saveEvent);
}

function manageHoverEvents(isAddFlag = true) {
    const manageEventListenerAttr = isAddFlag ? 'addEventListener' : 'removeEventListener';
    const tags = ['img', 'video', 'svg']; //TODO process svg correctly
    const minHeight = window.MUData.minElementHeight;
    const minWidth = window.MUData.minElementWidth;

    tags.forEach(tag => {
        const targets = document.querySelectorAll(tag);
        [].filter.call(targets, target => target.offsetHeight > minHeight && target.offsetWidth > minWidth)
            .forEach(target => {
                target[manageEventListenerAttr]('mouseenter', changeDefOver);
                target[manageEventListenerAttr]('mouseleave', changeDefOut);
            });
    });

    const divs = document.getElementsByTagName('div');
    const divsWithImages = [].filter.call(divs, elem =>
        getBackgroundImgStyles(elem).length != 0 && elem.offsetWidth > minHeight && elem.offsetHeight > minWidth);
    divsWithImages.forEach(div => {
        div[manageEventListenerAttr]('mouseenter', changeDefOver);
        div[manageEventListenerAttr]('mouseleave', changeDefOut);
    });
}

function changeDefOver(e) {
    const button = document.createElement('button');

    button.id = "lol";       // TODO unique classname/id
    // [].push.call(button.classList, 'test-transition');
    button.onclick = clickEvent => {
        clickEvent.stopPropagation();
        console.log(clickEvent);
        clickEvent.target = clickEvent.target.parentElement;
        saveEvent(clickEvent);
        console.log('target: ', window.MUData.targetEvent);
        // chrome.extension.sendMessage(getData());
    };

    button.addEventListener('mouseenter', () => button.style.opacity = 1);

    const height = window.MUData.pin.height, width = window.MUData.pin.width;
    const paddingLeft = e.target.offsetLeft + e.target.offsetWidth - height - window.MUData.pin.paddingRight;
    const paddingTop = e.target.offsetTop + window.MUData.pin.paddingTop;

    Object.assign(button.style, {
        position: 'absolute',
        left: `${paddingLeft}px`,
        top: `${paddingTop}px`,
        height: `${height}px`,
        width: `${width}px`,
        opacity: 0,
        transition: "opacity 0.4s",
        backgroundColor: "red",
        'z-index': 10000000000
    });

    console.log('Height: ', height, 'Width: ', width);

    setTimeout(() => button.style.opacity = 1, 10);

    window.MUData.button = button;
    console.log('Added');
    e.target.parentElement.append(button);
}

function changeDefOut(e) {
    if (e.toElement !== window.MUData.button) {
        window, MUData.button.style.opacity = 0;
        setTimeout(() => 
            window.MUData.button.parentElement.querySelectorAll('#lol')
                                              .forEach(e => e.remove()), 
        1000);
        console.log('Removed');
    }
}

window.addEventListener('load', main);
