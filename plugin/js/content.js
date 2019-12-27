"use strict";

function isValidURL(str) {
    const a = document.createElement('a');
    a.href = str;

    return a.host && a.host !== window.location.host;
}

function isEncodedDataURI(str) {
    return str.startsWith('data:') && (str.match(/;([^,]+)/) || [])[1] === 'base64';
}

async function getComputedStyles(target) {
    const styles = [
        getComputedStyle(target),
        getComputedStyle(target, ':before'),
        getComputedStyle(target, ':after'),
    ];
    return styles.filter(e => e.backgroundImage !== 'none')
}

async function getPropsFromStyle(target) {
    const imgProps = {};
    const style = (await getComputedStyles(target))[0];

    if (!style) {
        return imgProps;
    }
    const src = style.backgroundImage
        .replace(/url\((['"])?(.*?)\1\)/gi, '$2')
        .split(', ')[0];
    const image = new Image();

    image.src = src;

    if (isEncodedDataURI(src) || isValidURL(src)) {
        Object.assign(imgProps, {width: image.width, height: image.height, src: image.src});
    }

    return imgProps;
}

async function handleSvgElement(svg) {
    const svgRect = svg.getBoundingClientRect();

    return {
        src: btoa(svg.outerHTML),
        width: svgRect.width,
        height: svgRect.height
    }
}

async function handleElement(target, svgs) {
    const svgParent = svgs.find(svg => svg.contains(target));

    return await svgParent ? handleSvgElement(svgParent) : getPropsFromStyle(target);
}

async function getContentData() {
    const uncheckedTags = ['HTML', 'BODY', 'HEAD', 'SCRIPT'];
    const contentData = {
        src: '',
        width: 0,
        height: 0,
        text: ''
    };
    const targets = document
        .elementsFromPoint(window.MediaUploader.event.clientX, window.MediaUploader.event.clientY)
        .filter(element => uncheckedTags.indexOf(element.tagName) === -1);
    const svgs = targets.filter(element => element.tagName === 'SVG');
    let i = 0;

    do {
        Object.assign(contentData, await window.MediaUploader.handlers[targets[i].tagName](targets[i++], svgs));
        contentData.text = !(contentData.url || contentData.data) ? window.getSelection().toString() : '';
    } while (!Object.values(contentData).some(Boolean) || i < targets.length);

    return contentData;
}

function handleMessage(request, sender, sendResponse) {
    window[request.command](...request.args)
        .then(data => sendResponse(data))
        .catch(reason => sendResponse({error: reason}));

    return true;
}

function saveEvent(e) {
    window.MediaUploader.event = e;
}

function main(isAddFlag = true) {
    const handler = {
        get(target, prop) {
            return prop in target ? target[prop] : handleElement;
        }
    };
    const tags = {
        'AUDIO': async target => ({
            src: target.currentSrc
        }),
        'VIDEO': async target => ({
            src: target.currentSrc,
            width: target.videoWidth,
            height: target.videoHeight
        }),
        'IMG': async target => ({
            src: target.currentSrc,
            width: target.naturalWidth,
            height: target.naturalHeight
        })
    };
    window.MediaUploader = {
        settings: {
            minTargetWidth: 50,
            minTargetHeight: 50,
            pin: {
                width: 20,
                height: 20,
                paddingTop: 10,
                paddingRight: 10
            },
            popup: {
                cssLinkClassName: 'RANDOMNAME',
                cssLinkHref: '../css/hover.css'
            }
        },
        handlers: new Proxy(tags, handler),
        event: null
    };

    const manageEventListenerAttr = isAddFlag ? 'addEventListener' : 'removeEventListener';
    const manageChromeListenerAttr = manageEventListenerAttr.replace('Event', '');
    const link = document.createElement('link');

    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = window.MediaUploader.settings.popup.cssLinkHref;
    link.className = window.MediaUploader.settings.popup.cssLinkClassName;
    document.querySelector('head').appendChild(link);

    manageHoverEvents(isAddFlag);

    chrome.runtime.onMessage[manageChromeListenerAttr](handleMessage);
    document[manageEventListenerAttr]('contextmenu', saveEvent);
}

//TODO change hovers
function manageHoverEvents(isAddFlag = true) {
    const manageEventListenerAttr = isAddFlag ? 'addEventListener' : 'removeEventListener';
    const tags = ['img', 'video', 'svg']; //TODO process svg correctly
    const minHeight = window.MediaUploader.minElementHeight;
    const minWidth = window.MediaUploader.minElementWidth;

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
        getComputedStyles(elem).length !== 0 && elem.offsetWidth > minHeight && elem.offsetHeight > minWidth);
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
        console.log('target: ', window.MediaUploader.event);
        // chrome.extension.sendMessage(getData());
    };

    button.addEventListener('mouseenter', () => button.style.opacity = 1);

    const height = window.MediaUploader.pin.height, width = window.MediaUploader.pin.width;
    const paddingLeft = e.target.offsetLeft + e.target.offsetWidth - height - window.MediaUploader.pin.paddingRight;
    const paddingTop = e.target.offsetTop + window.MediaUploader.pin.paddingTop;

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

    window.MediaUploader.button = button;
    console.log('Added');
    e.target.parentElement.append(button);
}

function changeDefOut(e) {
    if (e.toElement !== window.MediaUploader.button) {
        window, MediaUploader.button.style.opacity = 0;
        setTimeout(() =>
                window.MediaUploader.button.parentElement.querySelectorAll('#lol')
                    .forEach(e => e.remove()),
            1000);
        console.log('Removed');
    }
}

window.addEventListener('load', main);
