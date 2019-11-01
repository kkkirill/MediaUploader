function genericOnClick(info, tab) {
    console.log(info);
    let msg = {
        txt: "HELLO"
    }
    chrome.tabs.sendMessage(tab.id, msg);
}

window.onload = () => {
    const contexts = ["page","selection","link","editable","image","video","audio"];

    for (context of contexts) {
        const id = chrome.contextMenus.create({"title": "Send to Site.com", "contexts":[context],
                                           "onclick": genericOnClick});
        console.log(`${context} item: ${id}`);
    }
}

