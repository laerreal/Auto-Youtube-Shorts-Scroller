// VARIABLES
const YOUTUBE_LINK = "youtube.com";
const errMsg = document.querySelector("#error");
const toggleBtn = document.querySelector(".toggleBtn");
const validUrls = [`${YOUTUBE_LINK}/shorts`, `${YOUTUBE_LINK}/hashtag/shorts`];
const filteredAuthors = document.querySelector("#filterAuthors");
const watchHistoryInput = document.querySelector("#watchHistory");
const shortCutInput = document.querySelector("#shortCutInput");
const shortCutInteractInput = document.querySelector("#shortCutInteractInput");
const filterByMaxLength = document.querySelector("#filterByMaxLength");
const filterByMinLength = document.querySelector("#filterByMinLength");
const amountOfPlaysInput = document.querySelector("#amountOfPlaysInput");
const scrollOnCommentsInput = document.querySelector("#scrollOnComments");
const nextSettings = document.querySelector("#nextSettings");
const backSettings = document.querySelector("#backSettings");
const pageNumber = document.querySelector("#pageNumber");
getAllSettingsForPopup();
// Listens to toggle button click
document.onclick = (e) => {
    if (e.target.classList.contains("toggleBtn"))
        browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
            if (validUrls.some((url) => tabs[0]?.url?.includes(url))) {
                try {
                    await browser.tabs.sendMessage(tabs[0].id, {toggle: true}, (response) => {
                        if (!response?.success)
                            errMsg.innerText = "Please refresh the page and try again!";
                    });
                }
                catch { }
            }
            else
                errMsg.innerText = "Only works for Youtube!";
        });
};
function changeToggleButton(result) {
    toggleBtn.innerText = result ? "Stop" : "Start";
    toggleBtn.classList.remove(result ? "start" : "stop");
    toggleBtn.classList.add(result ? "stop" : "start");
}
// Settings Page and functions for back and forward buttons
nextSettings.onclick = () => {
    const settingPage = document.querySelectorAll(".settingsPage");
    const active = [...settingPage].find((page) => page.classList.contains("active"));
    const next = (() => {
        const nextIndex = parseInt(active.dataset["settingindex"]) + 1;
        if (nextIndex >= settingPage.length)
            return settingPage[0];
        return settingPage[nextIndex];
    })();
    pageNumber.innerText = `${parseInt(next.dataset["settingindex"]) + 1}/${settingPage.length}`;
    active.classList.remove("active");
    next.classList.add("active");
};
backSettings.onclick = () => {
    const settingPage = document.querySelectorAll(".settingsPage");
    const active = [...settingPage].find((page) => page.classList.contains("active"));
    const last = (() => {
        const lastIndex = parseInt(active.dataset["settingindex"]) - 1;
        console.log({ lastIndex });
        if (lastIndex < 0) {
            pageNumber.innerText = `5/${settingPage.length}`;
            return settingPage[settingPage.length - 1];
        }
        else {
            pageNumber.innerText = `${parseInt(active.dataset["settingindex"])}/${settingPage.length}`;
            return settingPage[lastIndex];
        }
    })();
    active.classList.remove("active");
    last.classList.add("active");
};
function getAllSettingsForPopup() {
    // Get Settings and show them on the popup (and check for updates and reflect them)
    browser.storage.local.get(["shortCutKeys", "shortCutInteractKeys"]).then(async ({ shortCutKeys, shortCutInteractKeys }) => {
        console.log({ shortCutKeys, shortCutInteractKeys });
        if (shortCutKeys === undefined) {
            await browser.storage.local.set({
                shortCutKeys: ["shift", "s"],
            });
            shortCutInput.value = "shift+s";
        }
        else {
            console.log({ shortCutKeys });
            shortCutInput.value = shortCutKeys.join("+");
        }
        shortCutInput.addEventListener("change", () => {
            const value = shortCutInput.value.trim().split("+");
            if (!value.length)
                return;
            browser.storage.local.set({
                shortCutKeys: value,
            });
            shortCutInput.value = value.join("+");
        });
        if (shortCutInteractKeys === undefined) {
            await browser.storage.local.set({
                shortCutInteractKeys: ["shift", "f"],
            });
            shortCutInteractInput.value = "shift+f";
        }
        else {
            shortCutInteractInput.value = shortCutInteractKeys.join("+");
        }
        shortCutInteractInput.addEventListener("change", (e) => {
            const value = e.target.value.trim().split("+");
            if (!value.length)
                return;
            browser.storage.local.set({
                shortCutInteractKeys: value,
            });
            shortCutInteractInput.value = value.join("+");
        });
    });
    browser.storage.local.get("filteredAuthors").then(async (result) => {
        let value = result["filteredAuthors"];
        if (value === undefined) {
            await browser.storage.local.set({
                filteredAuthors: ["Channel_1", "Channel_2"],
            });
            value = ["Channel_1", "Channel_2"];
        }
        filteredAuthors.value = value.join(",");
    });
    filteredAuthors.addEventListener("input", async () => {
        const value = filteredAuthors.value.split(",").filter((v) => v);
        await browser.storage.local.set({
            filteredAuthors: value,
        });
    });
    browser.storage.local.get(["filterByMaxLength"]).then(async (result) => {
        let value = result["filterByMaxLength"];
        if (value === undefined) {
            await browser.storage.local.set({ filterByMaxLength: "none" });
            return (filterByMaxLength.value = "none");
        }
        filterByMaxLength.value = value;
    });
    browser.storage.local.get(["filterByMinLength"]).then(async (result) => {
        let value = result["filterByMinLength"];
        if (value === undefined) {
            await browser.storage.local.set({ filterByMinLength: "none" });
            return (filterByMinLength.value = "none");
        }
        filterByMinLength.value = value;
    });
    filterByMaxLength.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            filterByMaxLength: e.target.value,
        });
    });
    filterByMinLength.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            filterByMinLength: e.target.value,
        });
    });
    browser.storage.local.get(["amountOfPlaysToSkip"]).then(async (result) => {
        let value = result["amountOfPlaysToSkip"];
        if (value === undefined) {
            await browser.storage.local.set({ amountOfPlaysToSkip: 1 });
            amountOfPlaysInput.value = "1";
        }
        amountOfPlaysInput.value = value;
    });
    amountOfPlaysInput.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            amountOfPlaysToSkip: parseInt(e.target.value),
        });
    });
    browser.storage.local.get(["scrollOnComments"]).then(async (result) => {
        let value = result["scrollOnComments"];
        if (value === undefined) {
            await browser.storage.local.set({ scrollOnComments: false });
            scrollOnCommentsInput.checked = true;
        }
        scrollOnCommentsInput.checked = value;
    });
    scrollOnCommentsInput.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            scrollOnComments: e.target.checked,
        });
    });
    browser.storage.local.get(["watchHistory"]).then(async (result) => {
        let value = result["watchHistory"];
        if (value === undefined) {
            await browser.storage.local.set({ watchHistory: false });
            watchHistoryInput.checked = true;
        }
        watchHistoryInput.checked = value;
    });
    watchHistoryInput.addEventListener("change", async (e) => {
        await browser.storage.local.set({
            watchHistory: e.target.checked,
        });
    });
    browser.storage.onChanged.addListener((result) => {
        if (result["applicationIsOn"]?.newValue !== undefined)
            changeToggleButton(result["applicationIsOn"].newValue);
    });
    browser.storage.local.get(["applicationIsOn"]).then((result) => {
        if (result["applicationIsOn"] == null) {
            changeToggleButton(true);
        }
        else
            changeToggleButton(result["applicationIsOn"]);
    });
}
