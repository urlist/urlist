package data


import (
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "fmt"
    "log"
    "sort"
    "crypto/md5"
    "io"
    "time"
)

// Network represent all the lists recently updated,
// owned by user that the target user is following.
type Network struct {
    UserId string `json:"user_id"`
    User Profile  `json:"user"`
    Lists []rankedList `json:"lists"`
    Urls  []rankedUrl `json:"urls"`

    RenderTime string

    RenderUrls bool
}

func (n *Network) FetchByKey(userId string, q *QueryOpts, dbs *mgo.Session) (error) {
    return n.FetchByUserId(userId, dbs)
}

func (n *Network) FetchByUserId(userId string, dbs *mgo.Session) (error) {
    n.UserId = userId

    if err := n.User.FetchByKey(userId, nil, dbs); err != nil {
        return err
    }

    return nil
}

func (n *Network) RenderUncachedFields(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (n *Network) MakeNetworkChk(users []FollowedUser) string {
    h := md5.New()

    for _, x := range users {
        io.WriteString(h, x.UserId)
    }

    return fmt.Sprintf("%x", h.Sum(nil))
}

func (n *Network) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return n.Render(context, dbs)

    // DISABLED
    session := dbs.Clone()
    defer session.Close()

    networkChk := n.MakeNetworkChk(n.User.FollowingUsers)

    type UserNetworkCache struct {
        UserId string `bson:"user_id" json:"user_id"`
        NetworkChk string
        Lists []rankedList
        Urls  []rankedUrl
    }

    networkCacheGet := func(n *Network) error {
        userNetwork := UserNetworkCache{}

        c := session.DB("").C("network_cache")

        if err := c.Find(bson.M{"user_id": n.UserId}).One(&userNetwork); err != nil {
            return err
        }

        if len(userNetwork.Lists) == 0 {
            return fmt.Errorf("User Has No Network, forever alone")
        }

        isNetworkChanged := networkChk != userNetwork.NetworkChk
        isNetworkNotEmptyAnymore := len(userNetwork.Urls) == 0 && n.RenderUrls

        n.Lists = userNetwork.Lists
        n.Urls = userNetwork.Urls

        if isNetworkNotEmptyAnymore || isNetworkChanged {
            return fmt.Errorf("Cache need refresh")
        }

        return nil
    }

    networkCachePut := func() error {
        c := session.DB("").C("network_cache")

        userNetwork := UserNetworkCache{ n.UserId, networkChk, n.Lists, n.Urls }

        if _, err := c.Upsert(bson.M{"user_id": n.UserId}, userNetwork); err != nil {
            return err
        }

        return nil
    }

    if err := networkCacheGet(n); err != nil {
        log.Printf("%s --- NETWORK --- CACHE MISS --- %v", n.User.Username, err)
        n.Render(context, session)

        if err := networkCachePut(); err != nil {
            log.Print(err)
        }
    } else {
        log.Printf("%s --- NETWORK --- CACHE HIT", n.User.Username)
    }

    return nil
}

func (n *Network) renderNetworkLists(user *Profile, dbs *mgo.Session) {
    n.Lists = []rankedList{}

    for _, x := range userLists(user, dbs) {
        n.Lists = append(n.Lists, x)
    }

    sort.Sort(ListByUpdateTime{n.Lists})
}

func (n *Network) renderNetworkUrls(user *Profile, dbs *mgo.Session) {
    n.Urls = []rankedUrl{}

    for _, x := range n.Lists {
        list := List{}
        list.FetchByHash(x.Hash, dbs)

        urls := list.Urls

        lUrls := []rankedUrl{}

        for _, url := range urls {
            if url.CreationTime.IsZero() {
                url.CreationTime = list.CreationTime
            }

            rUrl := rankedUrl{url, url.Hash, url.Title, list.Hash, list.Title, len(list.Urls), 0, false}
            lUrls = append(lUrls, rUrl)
        }

        sort.Sort(UrlByCreationTime{lUrls})

        if len(lUrls) >= 3 {
            lUrls = lUrls[:3]
        }

        for _, y := range lUrls {
            y.renderRelists(dbs)
            n.Urls = append(n.Urls, y)
        }

        if len(n.Urls) > 100 {
            break
        }
    }

    sort.Sort(UrlByCreationTime{n.Urls})
}

func (n *Network) Render(context map[string] interface{}, dbs *mgo.Session) error {
    startAt := time.Now()

    n.renderNetworkLists(&n.User, dbs)

    if len(n.Lists) == 0 {
        return nil
    }

    if n.RenderUrls {
        n.renderNetworkUrls(&n.User, dbs)
        n.Lists = []rankedList{}
    }

    n.RenderTime = time.Since(startAt).String()

    return nil
}

func (n *Network) Authorize(userId string) bool {
    return true
}
