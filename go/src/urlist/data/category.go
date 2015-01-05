package data


import (
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "strings"
)

type CategoryItem struct {
    Category string `json:"category"`
    Lists []string `json:"lists"`
    Sort string `json:"sort"`
    Network bool `json:"network"`
}

type CategoryCollection struct {
    Categories []HashtagItem `json:"categories"`
}

func (h *CategoryCollection) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    c := dbs.DB("").C("urlists")
    keys := strings.Split(key, ",")

    if err := c.Find(bson.M{"categories": bson.M{"$all": keys}}).All(&h.Categories); err != nil {
        return err
    }

    return nil
}

func (h *CategoryCollection) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return h.Render(context, dbs)
}

func (h *CategoryCollection) Render(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (h *CategoryCollection) RenderUncachedFields(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (h *CategoryCollection) Authorize(userId string) bool {
    return true
}

func (h *CategoryItem) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    keys := strings.Split(key, ",")

    h.Category = strings.Join(keys, ";")
    h.Sort = strings.Join(q.Sort, ";")
    h.Network = q.Network

    fetchOne := func() error {
        c := dbs.DB("").C("urlists")

        qs := c.Find(bson.M{"categories": bson.M{"$all": keys}})

        for _, sortKey := range q.Sort {
            qs = qs.Sort(sortKey)
        }

        list := List{}

        iter := qs.Iter()
        for iter.Next(&list) {
            h.Lists = append(h.Lists, list.Hash)
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
                            "categories": bson.M{"$all": keys}})

        if len(q.Sort) >= 1 {
            qs = qs.Sort(q.Sort[0])
        }

        iter := qs.Iter()
        list := List{}

        for iter.Next(&list) {
            h.Lists = append(h.Lists, list.Hash)
        }

        h.Category = key

        return nil
    }

    if q.Network {
        return fetchNetwork()
    } else {
        return fetchOne()
    }

    return nil
}

func (h *CategoryItem) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return h.Render(context, dbs)
}

func (h *CategoryItem) Render(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (h *CategoryItem) RenderUncachedFields(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (h *CategoryItem) Authorize(userId string) bool {
    return true
}
