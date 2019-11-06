function getSourcesFromStyle() {
    const styles = [
        getComputedStyle(targetEvent.target), 
        getComputedStyle(targetEvent.target, ':after'), 
        getComputedStyle(targetEvent.target, ':before')
    ];
    //  TODO
    //  pseudo elements send only 1 concrete (calculating through offsets/sth else)
    
    const sources = styles.map(e => e.backgroundImage.slice(5, -2)).filter(e => e);
    if (sources.length) {
        const groupedSources = sources.reduce((accumulator, currentValue) => {
            const fieldName = currentValue.startsWith('data:') ? 'data' : 'url';
            if (accumulator[fieldName])
                return {...accumulator, [fieldName]: accumulator[fieldName].concat(currentValue)};
            else
                return {...accumulator, [fieldName]: [currentValue]};
        }, {});
        return groupedSources;
    }
    return {'data': [], 'url': []};
}

function getData() {
    let urls = [], data = [];
    switch (targetEvent.target.tagName) {
        case "AUDIO":
        case "VIDEO":
            urls.push(targetEvent.target.firstElementChild.src);
            break;
        case "IMG":
            urls.push(targetEvent.target.currentSrc);
            break;
        default:
            const groupedSources = getSourcesFromStyle();
            urls.push(...new Set(groupedSources.url));
            data.push(...new Set(groupedSources.data));
            break;
    }
    const text = !(urls.length || data.length) ? window.getSelection().toString() : ''; 
    const statusCode = urls.length || data.length || text ? 200 : 204;
    return {statusCode: statusCode, urls: urls, data: data, text: text}
}

function handleMessage(request, sender, sendResponse) {
    const statusCode = !window[request.command] ? 404 : 200;
    sendResponse({statusCode: statusCode, ...window[request.command]()});
}

function main(isAddFlag=true) {
    chrome.runtime.onMessage.addListener(handleMessage);
    const manageEventListener = isAddFlag ? 'addEventListener' : 'removeEventListener';
    document[manageEventListener]('contextmenu', e => {
        //  REPLACED target on targetEvent
        targetElement = e.target;
        targetEvent = e;
        console.log(e);
    });
}

window.onload = main;

// ----------------------------------------------------------------------------
// let iframes = document.getElementsByTagName("iframe");
// console.log([...iframes]);
// ------------------------------
// TODO add iframes support
//  [...iframes].forEach(element => {
//     element.addEventListener('blur', iframeTagHandler);
// ----------------------------------------------------------------------------



// ----------------------------------------------------------------------------
// console.log('offsetX: ', targetEvent.offsetX, 'offsetY: ', targetEvent.offsetY, 
// 'offsetLeft: ', targetEvent.target.offsetLeft, 'offsetWidth: ', targetEvent.target.offsetWidth);
// console.log(styles);


// console.log(targetEvent.target);

// let targetName = targetEvent.target.tagName.toLowerCase();
// if (targetEvent.target.className)
//     targetName = targetName.concat(`.${targetEvent.target.className}`);
// else if (targetEvent.target.id) 
//     targetName = targetName.concat(`#${targetEvent.target.id}`);
// console.log(targetName);
// const before = targetEvent.target.parentElement.querySelector(targetName, ':before');
// const after = targetEvent.target.parentElement.querySelector(targetName, ':after');
// console.log(before, after);
// -----------------------------------------------------------------------------