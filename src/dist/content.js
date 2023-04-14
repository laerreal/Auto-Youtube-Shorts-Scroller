// CONSTANT SELECTORS VARIABLES
const VIDEOS_LIST_SELECTOR = ".reel-video-in-sequence";
const NEXT_VIDEO_BUTTON_SELECTOR = "#navigation-button-down > ytd-button-renderer > yt-button-shape > button";
const LIKE_BUTTON_SELECTOR = "ytd-reel-video-renderer[is-active] #like-button > yt-button-shape > label > button";
const DISLIKE_BUTTON_SELECTOR = "ytd-reel-video-renderer[is-active] #dislike-button > yt-button-shape > label > button";
const COMMENTS_SELECTOR = "body > ytd-app > ytd-popup-container > tp-yt-paper-dialog > ytd-engagement-panel-section-list-renderer > div";
// APP VARIABLES
let shortCutToggleKeys = [];
let shortCutInteractKeys = [];
let scrollOnCommentsCheck = false;
let watchHistory = false;
let amountOfPlays = 0;
let amountOfPlaysToSkip = 1;
let filterMinLength = "none";
let filterMaxLength = "none";
let blockedCreators = [];
let watchedVideos = [];
// STATE VARIABLES
let currentVideoIndex = null;
let applicationIsOn = false;
let scrollingIsDone = true;
let lastVideo = null;
// -------
async function startAutoScrolling() {
    if (!applicationIsOn) {
        applicationIsOn = true;
        // Save state to browser storage, so it will be on next time on page load
        await browser.storage.local.set({applicationIsOn: true});
        if (window.location.href.includes("hashtag/shorts")) {
            // If on hashtag page, click on a shorts video to start the auto scrolling (WHEN THIS FUNCTION CALLED)
            document
                .querySelector("#thumbnail [aria-label='Shorts']")
                .parentElement.parentElement.parentElement.click();
        }
    }
}
async function stopAutoScrolling() {
    if (applicationIsOn) {
        applicationIsOn = false;
        // Save state to browser storage, so it will be off next time on page load
        await browser.storage.local.set({applicationIsOn: false});
    }
    const currentVideo = document.querySelector("#shorts-container video[tabindex='-1']");
    // Lets the video loop again
    if (currentVideo)
        currentVideo.setAttribute("loop", "");
}
async function checkForNewShort() {
    const currentVideo = document.querySelector("#shorts-container video[tabindex='-1']");
    // Check to see if the video has loaded
    if (isNaN(currentVideo?.duration) || currentVideo?.duration == null) {
        return;
    }
    // Checks if the application is on. If not, lets the video loop again
    if (!applicationIsOn) {
        return currentVideo.setAttribute("loop", "");
    } else {
        currentVideo.removeAttribute("loop");
    }
    const newCurrentShortsIndex = Array.from(document.querySelectorAll(VIDEOS_LIST_SELECTOR)).findIndex((e) => e.hasAttribute("is-active"));
    if (scrollingIsDone /*to prevent double scrolls*/) {
        if (newCurrentShortsIndex !== currentVideoIndex) {
            lastVideo?.removeEventListener("ended", videoFinished);
            lastVideo = currentVideo;
            currentVideoIndex = newCurrentShortsIndex;
            amountOfPlays = 0;
        }
        if (!checkIfValidVideo()) {
            await scrollToNextShort();
            return;
        }
        currentVideo.addEventListener("ended", videoFinished);
    }
}
async function videoFinished() {
    const currentVideo = document.querySelector("#shorts-container video[tabindex='-1']");
    if (!applicationIsOn)
        return currentVideo.setAttribute("loop", "");
    amountOfPlays++;
    if (amountOfPlays >= amountOfPlaysToSkip) {
        // If the video is finished and is equal to the amount of plays needed to skip,
        // check if the comments are open. If they are, wait for them to close and then scroll to the next short
        const comments = document.querySelector(COMMENTS_SELECTOR);
        if (comments && comments.getBoundingClientRect().x > 0) {
            if (!scrollOnCommentsCheck) {
                let intervalComments = setInterval(() => {
                    if (!comments.getBoundingClientRect().x) {
                        scrollToNextShort();
                        clearInterval(intervalComments);
                    }
                }, 100);
                return;
            } else {
                // If the comments are open and the user wants to scroll on comments, close the comments
                const closeCommentsButton = document.querySelector("#visibility-button > ytd-button-renderer > yt-button-shape > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill");
                if (closeCommentsButton)
                    closeCommentsButton.click();
            }
        }
        await scrollToNextShort();
    } else {
        // If the video hasn't been played enough times, play it again
        currentVideo?.play();
    }
}
async function scrollToNextShort() {
    const currentVideoParent = getParentVideo();
    if (!currentVideoParent) {
        return;
    }
    const currentVideo = currentVideoParent.querySelector("video");
    if (!applicationIsOn) {
        return currentVideo?.setAttribute("loop", "");
    }
    amountOfPlays = 0;
    scrollingIsDone = false;
    const videoId = window.location.href.split("/")[4];
    watchedVideos.push(videoId);
    await browser.storage.local.set({watchedVideos: watchedVideos});

    const nextVideoParent = document.getElementById(`${Number(currentVideoParent?.id) + 1}`);
    if (nextVideoParent) {
        nextVideoParent.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
        });
    } else {
        const nextButton = document.querySelector(NEXT_VIDEO_BUTTON_SELECTOR);
        if (nextButton) {
            nextButton.click();
        } else {
            currentVideo?.setAttribute("loop", "");
        }
    }
    setTimeout(() => {
        // Hardcoded timeout to make sure the video is scrolled before other scrolls are allowed
        scrollingIsDone = true;
    }, 700);
}
function checkIfValidVideo() {
    const currentVideoParent = getParentVideo();
    const currentVideo = currentVideoParent?.querySelector("video");
    if (!currentVideo) {
        return false;
    }
    if (!applicationIsOn) {
        currentVideo.setAttribute("loop", "");
        return false;
    }
    // Check if the video is from a blocked creator and if it is, skip it (FROM SETTINGS)
    const authorOfVideo = currentVideoParent
        ?.querySelector(".ytd-channel-name a")?.getAttribute("href")
        ?.toLowerCase()?.replace("/@", "");
    if (authorOfVideo &&
        blockedCreators
            .map((c) => c.toLowerCase().replace("@", ""))
            .includes(authorOfVideo)) {
        return false;
    }
    // Check if video is watched before and if it is, skip it (FROM SETTINGS)
    if (watchHistory) {
        const videoId = window.location.href.split("/")[4];
        if (videoId && watchedVideos.includes(videoId)) {
            return false;
        }
    }
    // Check if the video is within the length filter (FROM SETTINGS)
    if (filterMaxLength !== "none" || filterMinLength !== "none") {
        if (currentVideo.duration < parseInt(filterMinLength) ||
            currentVideo.duration > parseInt(filterMaxLength)) {
            return false;
        }
    }
    return true;
}
// Helper function to get the parent of the current short playing/played
function getParentVideo() {
    const VIDEOS_LIST = [
        ...document.querySelectorAll(VIDEOS_LIST_SELECTOR),
    ];
    return VIDEOS_LIST.find((e) => {
        return (e.hasAttribute("is-active") &&
            e.querySelector("#shorts-container video[tabindex='-1']"));
    });
}
// Sets up the application with the settings from browser storage
// Checks if the application is on and if it is, starts the application
// Creates an Interval to check for new shorts every 100ms
(function initiate() {
    browser.storage.local.get(["applicationIsOn"]).then(async (result) => {
        if (result["applicationIsOn"] == null) {
            return startAutoScrolling();
        }
        if (result["applicationIsOn"])
            await startAutoScrolling();
    });
    setInterval(checkForNewShort, 100);
    (function getAllSettings() {
        browser.storage.local.get([
            "shortCutKeys",
            "shortCutInteractKeys",
            "amountOfPlaysToSkip",
            "filterByMinLength",
            "filterByMaxLength",
            "filteredAuthors",
            "scrollOnComments",
            "watchHistory",
            "watchedVideos"
        ]).then((result) => {
            if (result["shortCutKeys"])
                shortCutToggleKeys = [...result["shortCutKeys"]];
            if (result["shortCutInteractKeys"])
                shortCutInteractKeys = [...result["shortCutInteractKeys"]];
            if (result["amountOfPlaysToSkip"])
                amountOfPlaysToSkip = result["amountOfPlaysToSkip"];
            if (result["scrollOnComments"])
                scrollOnCommentsCheck = result["scrollOnComments"];
            if (result["filterByMinLength"])
                filterMinLength = result["filterByMinLength"];
            if (result["filterByMaxLength"])
                filterMaxLength = result["filterByMaxLength"];
            if (result["filteredAuthors"])
                blockedCreators = [...result["filteredAuthors"]];
            if (result["watchHistory"])
                watchHistory = result["watchHistory"];
            if (result["watchedVideos"])
                watchedVideos = [...result["watchedVideos"]];
            shortCutListener();
        });

        browser.storage.onChanged.addListener((result) => {
            let newShortCutKeys = result["shortCutKeys"]?.newValue;
            if (newShortCutKeys !== undefined) {
                shortCutToggleKeys = [...newShortCutKeys];
            }
            let newShortCutInteractKeys = result["shortCutInteractKeys"]?.newValue;
            if (newShortCutInteractKeys !== undefined) {
                shortCutInteractKeys = [...newShortCutInteractKeys];
            }
            let newAmountOfPlaysToSkip = result["amountOfPlaysToSkip"]?.newValue;
            if (newAmountOfPlaysToSkip) {
                amountOfPlaysToSkip = newAmountOfPlaysToSkip;
            }
            let newScrollOnComments = result["scrollOnComments"]?.newValue;
            if (newScrollOnComments !== undefined) {
                scrollOnCommentsCheck = newScrollOnComments;
            }
            let newWatchHistory = result["watchHistory"]?.newValue;
            if (newWatchHistory !== undefined) {
                watchHistory = newWatchHistory;
            }
            let newFilterMinLength = result["filterByMinLength"]?.newValue;
            if (newFilterMinLength !== undefined) {
                filterMinLength = newFilterMinLength;
            }
            let newFilterMaxLength = result["filterByMaxLength"]?.newValue;
            if (newFilterMaxLength !== undefined) {
                filterMaxLength = newFilterMaxLength;
            }
            let newBlockedCreators = result["filteredAuthors"]?.newValue;
            if (newBlockedCreators !== undefined) {
                blockedCreators = [...newBlockedCreators];
            }
            let newWatchedVideos = result["watchedVideos"]?.newValue;
            if (newWatchedVideos !== undefined) {
                watchedVideos = [...newWatchedVideos];
            }
        });
    })();
})();
function shortCutListener() {
    let pressedKeys = [];
    // Web Dev Simplified Debounce
    function debounce(cb, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                cb(...args);
            }, delay);
        };
    }
    const checkKeys = (keysToCheck, waitDebounce = true, delay = 700) => {
        return new Promise((resolve) => {
            function debounceCB() {
                if (pressedKeys.length === keysToCheck.length) {
                    let match = true;
                    for (let i = 0; i < pressedKeys.length; i++) {
                        if (pressedKeys[i] !== keysToCheck[i]) {
                            match = false;
                            break;
                        }
                    }
                    resolve(match);
                }
                else
                    resolve(false);
            }
            if (waitDebounce)
                debounce(debounceCB, delay)();
            else
                debounceCB();
        });
    };
    document.addEventListener("keydown", async (e) => {
        if (!e.key)
            return;
        pressedKeys.push(e.key.toLowerCase());
        // Shortcut for toggle application on/off
        if (await checkKeys(shortCutToggleKeys)) {
            if (applicationIsOn) {
                await stopAutoScrolling();
            }
            else {
                await startAutoScrolling();
            }
        }
        else if (await checkKeys(shortCutInteractKeys, false)) {
            // Shortcut for like/dislike
            const likeBtn = document.querySelector(LIKE_BUTTON_SELECTOR);
            const dislikeBtn = document.querySelector(DISLIKE_BUTTON_SELECTOR);
            if (likeBtn?.getAttribute("aria-pressed") === "true" || dislikeBtn?.getAttribute("aria-pressed") === "true") {
                dislikeBtn.click();
            } else {
                likeBtn.click();
            }
        }
        pressedKeys = [];
    });
}
// Listens for toggle application from the popup
browser.runtime.onMessage.addListener(({ toggle }, _, sendResponse) => {
    if (toggle) {
        browser.storage.local.get(["applicationIsOn"]).then(async (result) => {
            if (!result["applicationIsOn"]) {
                await startAutoScrolling();
            }
            if (result["applicationIsOn"]) {
                await stopAutoScrolling();
            }
            sendResponse({ success: true });
        });
    }
    return true;
});
