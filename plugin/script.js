const videoTagHangler = (e) => {
    console.log(e.target);
};

const imageTagHandler = (e) => {
    console.log(e.target);
}

const backgroundImageHandler = (e) => {
    console.log(e.target);
}

const audioTagHandler = (e) => {
    console.log(e.target);
};

const iframeTagHandler = (e) => {
    console.log(e.target);
}

// window.onload = () => {
const main = (isAddFlag) => {
    let videos = document.getElementsByTagName("video");
    let images = document.getElementsByTagName("img");
    let hiddenImages = Array.prototype.filter.call(
        document.querySelectorAll('*'), 
        element => getComputedStyle(element).backgroundImage !== 'none'
        );
    let audios = document.getElementsByTagName("audio");
    let iframes = document.getElementsByTagName("iframe");
    console.log([...videos]);
    console.log([...images]);
    console.log(hiddenImages);
    console.log([...audios]);
    console.log([...iframes]);
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