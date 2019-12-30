"use strict";

function isValidURL(str) {
    const a = document.createElement('a');
    a.href = str;

    return a.host && a.host !== window.location.host;
}

function isEncodedDataURI(str) {
    return str.startsWith('data:') && (str.match(/;([^,]+)/) || [])[1] === 'base64';
}

function getComputedStyles(target) {
    const styles = [
        getComputedStyle(target),
        getComputedStyle(target, ':before'),
        getComputedStyle(target, ':after'),
    ];

    return styles.filter(e => e.backgroundImage !== 'none');
}

async function getPropsFromStyle(target) {
    const imgProps = {};
    const style = getComputedStyles(target)[0];

    if (!style) {
        return imgProps;
    }
    const src = style.backgroundImage
        .replace(/url\((['"])?(.*?)\1\)/gi, '$2')
        .split(', ')[0];
    const image = new Image();

    image.src = src;

    // if (isEncodedDataURI(src) || isValidURL(src)) {              //TODO uncomment after tests
    Object.assign(imgProps, { width: image.width, height: image.height, src: image.src });
    // }

    return imgProps;
}

async function handleSvgElement(svg) {
    const svgRect = svg.getBoundingClientRect();

    return {
        src: 'data:image/svg+xml;base64,' + btoa(svg.outerHTML),
        width: svgRect.width,
        height: svgRect.height
    }
}

async function handleElement(target, svgs) {
    const svgParent = svgs.find(svg => svg.contains(target));

    return await svgParent ? handleSvgElement(svgParent) : getPropsFromStyle(target);
}

async function getContentData() {
    const uncheckedTags = ['HTML', 'BODY', 'HEAD', 'CANVAS', 'SCRIPT'];
    const contentData = {
        src: '',
        width: 0,
        height: 0,
        text: ''
    };
    const targets = document
        .elementsFromPoint(MediaUploader.event.clientX, MediaUploader.event.clientY)
        .filter(element => uncheckedTags.indexOf(element.tagName) === -1 &&
            !element.classList.contains(MediaUploader.settings.pin.className));
    const svgs = targets.filter(element => element.tagName.toUpperCase() === 'SVG');
    let i = 0;

    do {
        Object.assign(contentData, await MediaUploader.handlers[targets[i].tagName](targets[i], svgs));
        i++;
    } while (!Object.values(contentData).some(Boolean) && i < targets.length);

    contentData.text = !contentData.src ? window.getSelection().toString() : '';

    return contentData;
}

function handleMessage(request, sender, sendResponse) {
    window[request.command](...request.args)
        .then(data => sendResponse(data))
        .catch(reason => sendResponse({ error: reason }));

    return true;
}

function saveEvent(e) {
    MediaUploader.event = e;
}

function main(isAddFlag = true) {
    const parts = window.location.hostname.split('.');
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
                className: 'media-uploader-pin',
                width: 20,
                height: 20,
                paddingTop: 10,
                paddingRight: 10
            }
        },
        handlers: new Proxy(tags, handler),
        hostname: parts[parts.length - 2],
        allowedTags: ['IMG', 'VIDEO', 'DIV', 'SVG'],
        event: null,
        buttons: [],
        observer: null,
        observerConfig: {
            childList: true,
            subtree: true
        }
    };

    const manageEventListenerAttr = isAddFlag ? 'addEventListener' : 'removeEventListener';
    const manageChromeListenerAttr = manageEventListenerAttr.replace('Event', '');

    manageHoverEvents(false);

    chrome.runtime.onMessage[manageChromeListenerAttr](handleMessage);
    document[manageEventListenerAttr]('contextmenu', saveEvent);

    MediaUploader.observer = new MutationObserver(handleMutatitions);

    MediaUploader.observer.observe(document.body, MediaUploader.observerConfig);
}

function getToggleState() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['isEnabled'], dict => {
            if (dict.isEnabled === 'undefined') {
                chrome.storage.local.set({ isEnabled: false });
                resolve(false);
            }
            else {
                resolve(dict.isEnabled);
            }
        });
    });
}

function handleMutatitions(mutations) {
    getToggleState().then((isEnabled) => {
        if (isEnabled) {
            const fmutations = mutations.filter(mutation => MediaUploader.allowedTags.includes(mutation.target.tagName.toUpperCase()));
            
            const addedNodes = [...new Set(fmutations.filter(mutation => mutation.addedNodes.length)
                .map(mutation => mutation.target))];
            const removedNodes = fmutations.filter(mutations => mutations.removedNodes.length)
                .map(mutation => mutation.target);

            addedNodes.filter(node => node.className !== MediaUploader.settings.pin.className).forEach(node => setHoverButton(node, node.tagName, isEnabled));
            removedNodes.filter(node => node.className !== MediaUploader.settings.pin.className).forEach(node => removeHoverButtons(node));
        } else {
            removeHoverButtons();
        }
    },
        (error) => console.log(error)
    );
}

function setHoverButton(target, tag, isAddFlag) {
    const manageEventListenerAttr = isAddFlag ? 'addEventListener' : 'removeEventListener';

    MediaUploader.tag = tag;
    if (isAddFlag) {
        if (MediaUploader.hostname === 'instagram') {
            createHoverButton(target);
        }
        else {
            target[manageEventListenerAttr]('mouseenter', changeDefOver);
            target[manageEventListenerAttr]('mouseleave', changeDefOut);
        }
    }
}

function createHoverButton(target) {
    changeDefOver({ target })
        .then(() => MediaUploader.buttons[0].style.opacity = 1)
        .catch(error => console.log(error));
}

function removeHoverButtons(parent) {
    (parent ? parent : document).querySelectorAll(`.${MediaUploader.settings.pin.className}`).forEach(e => e.remove());
}


async function manageHoverEvents(isAddFlag = false) {
    const minHeight = MediaUploader.settings.minTargetHeight;
    const minWidth = MediaUploader.settings.minTargetWidth;

    MediaUploader.allowedTags.slice(0, -1).forEach(tag => {
        const targets = document.querySelectorAll(tag);

        [].filter.call(targets, target => {
            const sizeRect = target.getBoundingClientRect();

            const sizeFlag = sizeRect.height > minHeight && sizeRect.width > minWidth;
            const divStyleFlag = target.tagName.toUpperCase() === 'DIV' ? getComputedStyles(target).length !== 0 : true;

            return (sizeFlag && divStyleFlag);
        }).forEach(target => setHoverButton(target, target.tagName, isAddFlag));
    });

    const svgs = document.getElementsByTagName('SVG');

    [].filter.call(svgs, target => {
        const sizeRect = target.getBoundingClientRect();

        return sizeRect.height > minHeight && sizeRect.width > minWidth;
    }).forEach(target => setHoverButton(target, target.tagName, isAddFlag));
}

async function changeDefOver(e) {
    MediaUploader.observer.disconnect();

    const tag = MediaUploader.tag;
    const button = document.createElement('button');
    const style = getComputedStyles(e.target);

    button.className = MediaUploader.settings.pin.className;
    button.onclick = async clickEvent => {
        clickEvent.stopPropagation();

        const createdEvent = new MouseEvent('contextmenu', {
            bubbles: false,
            cancelable: true,
            view: window,
            screenX: clickEvent.screenX,
            screenY: clickEvent.screenY,
            clientX: clickEvent.clientX,
            clientY: clickEvent.clientY
        });
        const rtarget = e.target.querySelector(`${tag}.${tag.className}`);

        (rtarget ? rtarget : e.target).dispatchEvent(createdEvent);
        saveEvent(createdEvent);
        chrome.runtime.sendMessage(await getContentData());
    };

    button.addEventListener('mouseenter', () => button.style.opacity = 1);

    const height = MediaUploader.settings.pin.height, width = MediaUploader.settings.pin.width;
    const sizeRect = e.target.getBoundingClientRect();
    const paddingLeft = sizeRect.left + window.pageXOffset + sizeRect.width - height - MediaUploader.settings.pin.paddingRight;
    const paddingTop = sizeRect.top + window.pageYOffset + MediaUploader.settings.pin.paddingTop;

    Object.assign(button.style, {
        position: 'absolute',
        left: `${paddingLeft}px`,
        top: `${paddingTop}px`,
        height: `${height}px`,
        width: `${width}px`,
        opacity: 0,
        transition: "opacity 0.4s",
        backgroundColor: "red",
        'z-index': +(style.zIndex !== undefined ? style.zIndex : 1) * 5
    });

    setTimeout(() => button.style.opacity = 1, 5);
    MediaUploader.buttons.unshift(button);
    document.body.append(button);
    MediaUploader.observer.observe(document.body, MediaUploader.observerConfig);
}

function changeDefOut(e) {
    if (e.toElement === null || e.toElement.className !== MediaUploader.settings.pin.className && MediaUploader.buttons.length) {
        MediaUploader.buttons[0].style.opacity = 0;
        MediaUploader.buttons.forEach(button => button.remove());
        MediaUploader.buttons = [];
    }
}

window.addEventListener('load', main);
