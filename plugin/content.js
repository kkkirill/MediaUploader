function getSourcesFromStyle() {
    const styles = [
        getComputedStyle(targetElement), 
        getComputedStyle(targetElement, ':after'), 
        getComputedStyle(targetElement, ':before')
    ];
    //  TODO 
    //  replace slice with regex?
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
    switch (targetElement.tagName) {
        case "AUDIO":
        case "VIDEO":
            urls.push(targetElement.firstElementChild.src);
            break;
        case "IMG":
            urls.push(targetElement.currentSrc);
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
    document[manageEventListener]('contextmenu', e => targetElement = e.target);
}

window.onload = main;

// ------------------------------
// let iframes = document.getElementsByTagName("iframe");
// console.log([...iframes]);
// ------------------------------
// TODO add iframes support
//  [...iframes].forEach(element => {
//     element.addEventListener('blur', iframeTagHandler);
