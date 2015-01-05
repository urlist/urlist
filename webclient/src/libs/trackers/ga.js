( function () {
    var TRACK = CONFIG.ga.track,
        TOKEN = CONFIG.ga.token;

    window._gaq = window._gaq || [];
    window._gaq.push(['_setAccount', TOKEN]);


    if (!TRACK)
        return;

    // console.info("[init] google analytics");

    (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();
}) ();

