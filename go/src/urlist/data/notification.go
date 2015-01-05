package data

import (
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "errors"
    "fmt"
    "time"
)

type Notification struct {
    Id      bson.ObjectId `json:"id" bson:"_id"`
    UserId  string `json:"user_id" bson:"user_id"`
    RcptId  string `json:"rcpt_id" bson:"rcpt_id"`
    Subject string `json:"subject"`
    SentAt  time.Time `json:"sent_at" bson:"sent_at"`
    ReadAt  *time.Time `json:"read_at,omitempty" bson:"read_at"`
    Data    map[string] string `json:"data"`
    UserScreenName string `json:"user_screen_name"`
    Username string `json:"username"`
    Status  string `json:"status,omitempty" bson:"status"`
}

type Notifications struct {
    UserId string `bson:"user_id" json:"user_id"`
    Notifications []Notification `bson:"notifications" json:"notifications"`
}

func (c *Notifications) FetchByKey(userId string, qs *QueryOpts, dbs *mgo.Session) error {
    return c.FetchByUserId(userId, dbs)
}

func (c *Notifications) Authorize(userId string) bool {
    return true
}

func (c *Notifications) FetchByUserId(userId string, dbs *mgo.Session) error {
    if !bson.ObjectIdHex(userId).Valid() {
        return errors.New(fmt.Sprintf("InvalidUserId:%s", userId))
    }

    c.UserId = userId

    session := dbs.Clone()
    defer session.Close()

    coll := session.DB("").C("notifications")

    q := bson.M{"rcpt_id": userId, "readed_at": nil}

    if err := coll.Find(q).Sort("-sent_at").Limit(50).All(&c.Notifications); err != nil {
        return err
    }

    return nil
}

func (c *Notifications) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return c.Render(context, dbs)
}

func (c *Notifications) Render(context map[string] interface{}, dbs *mgo.Session) error {
    for i, x := range c.Notifications {
        x.Render(context, dbs)

        c.Notifications[i] = x
    }

    return nil
}

func (c *Notification) Render(context map[string] interface{}, dbs *mgo.Session) {
    renderUser := func(userId string) {
        user := User{}

        if err := user.FetchByKey(userId, nil, dbs); err != nil {
            return
        }

        c.UserScreenName  = user.ScreenName
        c.Username = user.Username
    }

    renderUser(c.UserId)

    if c.Data == nil {
        return
    }

    // BUG should not retrieve all the fields! Only the title
    renderList := func(listHash, urlHash, key string) {
        list := List{}

        if err := list.FetchByHash(listHash, dbs); err != nil {
            return
        }

        c.Data[key] = list.Title

        if urlHash == "" {
            return
        }

        for _, u := range list.Urls {
            if u.Hash == urlHash {
                c.Data["url_title"] = u.Title
            }
        }
    }

    listHash, hasList := c.Data["list_hash"]
    urlHash, _ := c.Data["url_hash"]
    fromListHash, hasRelistList := c.Data["from_list_hash"]
    fromUrlHash, _ := c.Data["from_url_hash"]

    if hasList {
        renderList(listHash, urlHash, "list_title")
    }

    if hasRelistList && fromListHash != "" {
        renderList(fromListHash, fromUrlHash,  "from_list_title")
    }
}
