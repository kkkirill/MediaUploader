chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        console.log(message);
        // main(true);
    }
)

const videoTagHangler = (e) => {
    // alert(e.target);
    console.log(e.target.firstElementChild.src);
    console.log(e.target);
};

const imageTagHandler = (e) => {
    // alert(e.target);
    console.log(e.target.src);
    console.log(e.target);
}

const backgroundImageHandler = (e) => {
    // alert(e.target);
    const url = getComputedStyle(e.target).backgroundImage.slice(5, -2);
    console.log(url);
    console.log(e.target);
}

const audioTagHandler = (e) => {
    // alert(e.target.firstElementChild.src);
    console.log(e.target.firstElementChild.src);
    console.log(e.target);
};

// const iframeTagHandler = (e) => {
//     alert(e.target);
//     console.log(e.target);
// }

// window.onload = () => {
const main = (isAddFlag) => {
    // isAddFlag = localStorage.getItem('isMediaUploaderEnabled');
    isAddFlag = true;
    let videos = document.getElementsByTagName("video");
    let images = document.getElementsByTagName("img");
    let hiddenImages = Array.prototype.filter.call(
        document.querySelectorAll('*'), 
        element => getComputedStyle(element).backgroundImage !== 'none'
        );
    let audios = document.getElementsByTagName("audio");
    // let iframes = document.getElementsByTagName("iframe");
    console.log([...videos]);
    console.log([...images]);
    console.log(hiddenImages);
    console.log([...audios]);
    // console.log([...iframes]);
    const manageEventListener = isAddFlag ? 'addEventListener' : 'removeEventListener';
    [...videos].forEach(element => {
        element[manageEventListener]('playing', videoTagHangler); 
    });
    [...images].forEach(element => {
        element[manageEventListener]('click', imageTagHandler); 
    });
    hiddenImages.forEach(element => {
        element[manageEventListener]('click', backgroundImageHandler); 
    });
    [...audios].forEach(element => {
        element[manageEventListener]('playing', audioTagHandler);
     });
    // TODO add iframes support
    //  [...iframes].forEach(element => {
    //     element.addEventListener('blur', iframeTagHandler);
    //  });
}