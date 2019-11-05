function getData() {
    const selection = !resultMediaUrl ? window.getSelection().toString() : '';
    const statusCode = resultMediaUrl || selection ? 200 : 204;
    const data = {statusCode: statusCode, url: resultMediaUrl, text: selection};
    resultMediaUrl = null;
    return data;
}

function handleMessage(request, sender, sendResponse) {
    const statusCode = !window[request.command] ? 404 : 200;
    sendResponse({statusCode: statusCode, ...window[request.command]()});
}

function getSrcFromElement(e) {
    switch (e.target.tagName) {
        case "AUDIO":
        case "VIDEO":
            resultMediaUrl = e.target.firstElementChild.src;
            break;
        case "IMG":
            resultMediaUrl = e.target.currentSrc;
            break;
        default:
            //  TODO
            //
            // add check is backroundImage url contain link or encoded image (like base64)
            // if url contain envoded data send it as another field in result object
            resultMediaUrl = getComputedStyle(e.target).backgroundImage.slice(5, -2);
            console.log(e.target.tagName);
            console.log(resultMediaUrl);
            break;
    }
}

function main(isAddFlag=true) {
    resultMediaUrl = null;
    chrome.runtime.onMessage.addListener(handleMessage);

    let videos = document.getElementsByTagName("video");
    let images = document.getElementsByTagName('img');
    //  TODO 
    //
    //  correct processing of pseudo elements
    //  if it possible add styles info to hiddenImages array (it will become array of objects)
    let hiddenImages = [].filter.call(
        document.querySelectorAll('*'), 
        element => {
            let styles = [
                getComputedStyle(element), 
                getComputedStyle(element, 'before'), 
                getComputedStyle(element, ':after'), 
            ];
            return [].some.call(styles, (style) => style.backgroundImage !== 'none');
        }
        );
    let audios = document.getElementsByTagName("audio");
    const manageEventListener = isAddFlag ? 'addEventListener' : 'removeEventListener';
    
    [].forEach.call(videos, element => element[manageEventListener]('contextmenu', getSrcFromElement));
    [].forEach.call(audios, element => element[manageEventListener]('contextmenu', getSrcFromElement));
    [].forEach.call(images, element => element[manageEventListener]('contextmenu', getSrcFromElement));
    hiddenImages.forEach(element => {
        element[manageEventListener]('contextmenu', getSrcFromElement);
    });
} 

function stopHandling() {
    main(false);
}

window.onload = main;

// ------------------------------
// let iframes = document.getElementsByTagName("iframe");
// console.log([...iframes]);
// ------------------------------
// TODO add iframes support
//  [...iframes].forEach(element => {
//     element.addEventListener('blur', iframeTagHandler);
