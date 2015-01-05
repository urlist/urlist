( function () {

    function isAdmin() {
        return C.get("user").get("__notrack");
    }

    function isAuthor (user, urlist) {
        return urlist.get("author").get("user_id") === user.get("user_id");
    }

    function isContributor (user, urlist) {
        return (urlist.get("contributors") !== undefined &&
                urlist.get("contributors").where({ user_id: user.get("user_id"), status: "accepted" }).length == 1);
    }


    var funcs = {
        addUrl: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        acceptUrl: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        relistUrl: function (user, urlist) {
            return !urlist.get("is_secret");
        },

        contribute: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        addSection: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        addContributor: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        removeContributor: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        addComment: function (user, urlist) {
            return true;
        },

        removeComment: function (user, urlist) {
            return isAuthor(user, urlist);
        },

        editList: function (user, urlist) {
            return isAuthor(user, urlist) || isAdmin(user);
        },

        updateCover: function (user, urlist) {
            return isAuthor(user, urlist) || isAdmin(user);
        },

        sortList: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        shareUrl: function (user, urlist) {
            return !urlist.get("is_secret");
        },

        shareList: function (user, urlist) {
            return !urlist.get("is_secret");
        },

        editUrl: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        removeUrl: function (user, urlist) {
            return isAuthor(user, urlist) || isContributor(user, urlist);
        },

        followList: function (user, urlist) {
            return !isAuthor(user, urlist);
        }

    };

    _.extend(policies, {
        "urlist": {
            "contribute":       funcs.contribute,
            "add_url":          funcs.addUrl,
            "accept_url":       funcs.acceptUrl,
            "relist_url":       funcs.relistUrl,
            "add_section":      funcs.addSection,
            "add_contributor":  funcs.addContributor,
            "add_comment":      funcs.addComment,
            "remove_comment":   funcs.removeComment,
            "edit_list":        funcs.editList,
            "update_cover":     funcs.updateCover,
            "sort_list":        funcs.sortList,
            "share_url":        funcs.shareUrl,
            "share_list":       funcs.shareList,
            "edit_url":         funcs.editUrl,
            "remove_url":       funcs.removeUrl,
            "follow_list":      funcs.followList
        }
    });

}) ();

