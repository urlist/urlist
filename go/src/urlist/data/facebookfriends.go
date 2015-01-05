package data


import (
    "errors"
    "fmt"
    "net/http"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "encoding/json"
)

type FacebookNetwork struct {
}

type FacebookFriendsData struct {
    Name         string
    Id           string
    ProfileImage string
}

type FacebookFriendsWrapper struct {
    Data []FacebookFriendsData
}

type FacebookUrlistUser struct {
    UserId       *bson.ObjectId `bson:"_id"    json:"user_id,omitempty"`
    FacebookId   string `bson:"facebook_id"   json:"facebook_id"`
    Username     string `bson:"username"      json:"username,omitempty"`
    ScreenName   string `bson:"screen_name"   json:"screen_name"`
    ProfileImage string `bson:"profile_image" json:"profile_image"`
    IsFollowing  bool   `bson:"is_following"  json:"is_following"`
}

type FacebookFriends struct {
    friends FacebookFriendsWrapper `json:"friends"`
    Follow []FacebookUrlistUser    `json:"follow"`
    Invite []FacebookUrlistUser    `json:"invite"`
}

func (f *FacebookFriends) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    return f.FetchByEdition(key, dbs)
}

func (f *FacebookFriends) FetchByEdition(edition string, dbs *mgo.Session) (error) {
    return nil
}

func (f *FacebookFriends) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return f.Render(context, dbs)
}

func (f *FacebookFriends) Render(context map[string] interface{}, dbs *mgo.Session) error {
    userId := context["CurrentUserId"].(string)

    user := Profile{}
    if err := user.FetchByKey(userId, nil, dbs); err != nil {
        return err
    }

    facebookToken, err := FacebookToken(userId, dbs)

    if err != nil {
        return err
    }

    url := fmt.Sprintf("https://graph.facebook.com/me/friends?access_token=%v&method=GET", facebookToken)

    resp, err := http.Get(url)

    if err != nil {
        return err
    }

    defer resp.Body.Close()

    decoder := json.NewDecoder(resp.Body)

    if err := decoder.Decode(&f.friends); err != nil {
        return fmt.Errorf("Cannot decode facebook data: %v", err)
    }

    users_id := []string{}

    for _, x := range f.friends.Data {
        f.Invite = append(f.Invite, FacebookUrlistUser{
            UserId: nil,
            FacebookId: x.Id,
            Username: "",
            ScreenName: x.Name,
            ProfileImage: fmt.Sprintf("http://graph.facebook.com/%v/picture?type=large", x.Id),
        })

        users_id = append(users_id, x.Id)
    }

    c := dbs.DB("urlist").C("users")

    iter := c.Find(bson.M{"facebook_id": bson.M{"$in": users_id}}).Iter()

    urlistUser := FacebookUrlistUser{}

    for iter.Next(&urlistUser) {
        for _, x := range user.Followers {
            if x == urlistUser.UserId.Hex() {
                urlistUser.IsFollowing = true
            }
        }

        f.Follow = append(f.Follow, urlistUser)
    }

    return nil
}

func (f *FacebookFriends) Authorize(userId string) bool {
    return true
}

func FacebookToken(userId string, dbs *mgo.Session) (string, error) {
    c := dbs.DB("urlist").C("users")

    user := struct {
        FacebookId string `bson:"facebook_id"`
        FacebookToken string `bson:"facebook_last_token"`
    }{}

    if userId == "" {
        return "", errors.New("EmptyUserId")
    }

    if !bson.ObjectIdHex(userId).Valid() {
        return "", errors.New(fmt.Sprintf("InvalidUserId:%s", userId))
    }

    userOid := bson.ObjectIdHex(userId)

    if err := c.Find(bson.M{"_id": userOid}).One(&user); err != nil {
        return "", err
    }

    return user.FacebookToken, nil
}
