const manageOnClickEventSubscribe = (el, e) => {
    const isEnabled = getComputedStyle(el.firstElementChild).getPropertyValue('display') === 'none';
    // chrome.storage.local.get(null, (values) => {
    //     console.log(values);
    // })
    chrome.storage.local.set({'isMediaUploaderEnabled': isEnabled});
    // chrome.runtime.sendMessage(`${isEnabled}`);
}

const setInitialState = (el) => {
    chrome.storage.local.get('isMediaUploaderEnabled', (value) => {
        el.checked = value.isMediaUploaderEnabled;
    });
}

window.onload = (e) => {
    const inputElement = document.querySelector('.switch input');
    const toggleButton = inputElement.nextElementSibling;
    setInitialState(inputElement);
    toggleButton.addEventListener('click', (e) => manageOnClickEventSubscribe(toggleButton, e))
}

//chrome-extension://hepkldabllbkgamhdgbdkeoallhglnaa/popup.html