function openWindow(url, width, height) {
    width = width ? width : 550;
    height = height ? height : 420;

    var windowOptions = 'scrollbars=no,resizable=yes,toolbar=no,location=yes',
        winHeight = screen.height,
        winWidth = screen.width,
        left, top;

    left = Math.round((winWidth / 2) - (width / 2));
    top = 0;

    if (winHeight > height) {
        top = Math.round((winHeight / 2) - (height / 2));
    }

    window.open(url, "popup", windowOptions + ",width=" + width + ",height=" + height + ",left=" + left + ",top=" + top);
}


// https://dev.twitter.com/docs/intents#tweet-intent
function twitterShare(text) {
    var base = "https://twitter.com/intent/tweet";

    base += "?text=" + encodeURIComponent(text);
    base += "&hashtags=urlist";
    base += "&related=urlist";

    openWindow(base);
}


// https://developers.google.com/+/plugins/share/#sharelink
function googleShare(url) {
    var base = "https://plus.google.com/share";

    base += "?url=" + encodeURIComponent(url);

    openWindow(base);
}


// One day we will need the new one, in the meantime...
// https://developers.facebook.com/docs/reference/dialogs/feed/
function facebookShare(url) {
    var base = "https://www.facebook.com/sharer/sharer.php";

    base += "?u=" + encodeURIComponent(url);

    openWindow(base, 640, 352);
}
