package data

import (
    "time"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "errors"
    "fmt"
    "log"
)

type ContribNotification struct {
    NotificationId bson.ObjectId `bson:"_id" json:"notification_id"`
    UserId string `bson:"user_id" json:"user_id"`
    SenderId string `bson:"sender_id" json:"sender_id"`
    ListHash string `bson:"list_hash" json:"list_hash"`
    Status string `bson:"status" json:"status"`
    AcceptedAt time.Time `bson:"accepted_at" json:"accepted_at"`
    InvitedAt time.Time `bson:"invited_at" json:"invited_at"`
    SenderUsername string `bson:"sender_username" json:"sender_username"`
    SenderScreenName string `bson:"sender_screen_name" json:"sender_screen_name"`
    ListTitle string `bson:"list_title" json:"list_title"`
    SenderProfileImage string `bson:"sender_profile_image" json:"sender_profile_image"`
    LinksAmount int `bson:"links_amount" json:"links_amount"`
}

type ContribNotifications struct {
    UserId string `bson:"user_id" json:"user_id"`
    Notifications []ContribNotification `bson:"notifications" json:"notifications"`
}

func (c *ContribNotifications) FetchByKey(userId string, q *QueryOpts, dbs *mgo.Session) error {
    return c.FetchByUserId(userId, dbs)
}

func (c *ContribNotifications) Authorize(userId string) bool {
    return true
}

func (c *ContribNotifications) FetchByUserId(userId string, dbs *mgo.Session) error {
    if !bson.ObjectIdHex(userId).Valid() {
        return errors.New(fmt.Sprintf("InvalidUserId:%s", userId))
    }

    c.UserId = userId

    session := dbs.Clone()
    defer session.Close()

    coll := session.DB("").C("contrib_notifications")

    if err := coll.Find(bson.M{"user_id": userId, "status": "pending"}).All(&c.Notifications); err != nil {
        return err
    }

    return nil
}

func (c *ContribNotifications) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return c.Render(context, dbs)
}

func (c *ContribNotifications) Render(context map[string] interface{}, dbs *mgo.Session) error {
    for i, x := range c.Notifications {
        x.Render(context, dbs)

        c.Notifications[i] = x
    }

    return nil
}

func (c *ContribNotification) Render(context map[string] interface{}, dbs *mgo.Session) {
    list := List{}
    user := Profile{}

    if err := list.FetchByHash(c.ListHash, dbs); err != nil {
        log.Print(err)
        return
    } else {
        c.ListTitle = list.Title
        c.LinksAmount = list.LinksAmount
    }

    if err := user.FetchById(c.SenderId, dbs); err != nil {
        log.Print(err)
        return
    } else {
        c.SenderUsername = user.Username
        c.SenderScreenName = user.ScreenName
        c.SenderProfileImage = user.ProfileImage
    }
}
