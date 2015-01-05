package data


import (
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "strings"
    "fmt"
)

type HashtagItem struct {
    Hashtag string `json:"hashtag"`
    Lists []string `json:"lists"`
    Sort string `json:"sort"`
    Network bool `json:"network"`
}

type HashtagCollection struct {
    Hashtags []HashtagItem `json:"hashtags"`
}

func (h *HashtagCollection) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    c := dbs.DB("").C("hashtags")

    if err := c.Find(bson.M{}).All(&h.Hashtags); err != nil {
        return err
    }

    return nil
}

func (h *HashtagCollection) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return h.Render(context, dbs)
}

func (h *HashtagCollection) Render(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (h *HashtagCollection) RenderUncachedFields(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (h *HashtagCollection) Authorize(userId string) bool {
    return true
}

func (h *HashtagItem) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    if !strings.HasPrefix(key, "#") {
        key = fmt.Sprintf("#%v", key)
    }

    if key == "#" {
        return fmt.Errorf("EmptyHashtag")
    }

    h.Hashtag = key
    h.Sort = strings.Join(q.Sort, ";")
    h.Network = q.Network

    fetchOne := func() error {
        if len(q.Sort) > 0 {
            c := dbs.DB("").C("urlists")
            qs := c.Find(bson.M{"hashtags": key})

            for _, sortKey := range q.Sort {
                qs = qs.Sort(sortKey)
            }

            iter := qs.Iter()
            list := List{}

            for iter.Next(&list) {
                h.Lists = append(h.Lists, list.Hash)
            }
        } else {
            c := dbs.DB("").C("hashtags")
            qs := c.Find(bson.M{"hashtag": key})

            if err := qs.One(h); err != nil {
                return err
            }
        }

        return nil
    }

    // Fetch all the list of the user and followed users that match hashtag
    fetchNetwork := func() error {
        user := Profile{}

        if err := user.FetchById(q.UserId, dbs); err != nil {
            return err
        }

        c := dbs.DB("").C("urlists")

        qs := c.Find(bson.M{"is_secret": false,
                            "$or": []bson.M{bson.M{"user_id": bson.M{"$in": user.followedStr()}},
                                            bson.M{"followers": user.UserId.Hex()},
                                            bson.M{"user_id": q.UserId}},
                            "hashtags": key})

        for _, sortKey := range q.Sort {
            qs = qs.Sort(sortKey)
        }

        iter := qs.Iter()
        list := List{}

        for iter.Next(&list) {
            h.Lists = append(h.Lists, list.Hash)
        }

        h.Hashtag = key

        return nil
    }

    if q.Network {
        return fetchNetwork()
    } else {
        return fetchOne()
    }

    return nil
}

func (h *HashtagItem) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return h.Render(context, dbs)
}

func (h *HashtagItem) Render(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (h *HashtagItem) RenderUncachedFields(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (h *HashtagItem) Authorize(userId string) bool {
    return true
}
