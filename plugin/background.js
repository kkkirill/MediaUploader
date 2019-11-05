function processSource(response) {
    console.log(response);
}

function contextMenuOnClick(info, tab) {
    const msg = {
        command: "getData"
    }
    chrome.tabs.sendMessage(tab.id, msg, processSource);
}

window.onload = () => {
    chrome.contextMenus.create(
        {"title": "Send to Site.com",
         "contexts": ["all"],
         "onclick": contextMenuOnClick
        }
    );
}

