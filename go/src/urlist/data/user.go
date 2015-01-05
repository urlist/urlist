package data

import (
    "fmt"
    "errors"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "time"
    "log"
)

// User is a lightweight struct which fetch only the essentials field.
type User struct {
    UserId     bson.ObjectId `bson:"_id" json:"user_id"`
    Username   string `bson:"username" json:"username"`
    ScreenName string `bson:"screen_name" json:"screen_name"`
    ProfileImage       string `bson:"profile_image" json:"profile_image"`
    NoTrack bool     `bson:"__notrack" json:"__notrack"`
    IsAnonymous bool `bson:"is_anonymous" json:"is_anonymous"`
    Website    string `bson:"website" json:"website"`
    ShortBio   string `bson:"short_bio" json:"short_bio"`
    ListsAmount int `json:"lists_amount"`
    Beta    bool `bson:"__beta" json:"__beta"`
}

type SavedSearch struct {
    Query     string `json:"query"`
    SearchId  string `bson:"search_id" json:"search_id"`
}

type UserList struct {
    Hash         string `json:"hash"`
    Title        string `json:"title"`

    IsSecret     bool `bson:"is_secret" json:"is_secret"`

    UpdateTime   time.Time `bson:"update_time" json:"update_time"`

    LinksAmount  int `bson:"links_amount" json:"links_amount"`

    UserId       string `bson:"user_id" json:"user_id"`

    CreationTime time.Time `bson:"creation_time" json:"creation_time"`
    LastActionTime time.Time `bson:"last_action_time" json:"last_action_time"`
    LastActionId string `bson:"last_action_id" json:"last_action_id"`
    LastVisit *time.Time `json:"last_visit"`
}

type FollowedUser struct {
    UserId string `bson:"user_id" json:"user_id"`
}

// Profile represent the full data set regarding the user.
type Profile struct {
    UserId     bson.ObjectId `bson:"_id" json:"user_id"`
    Username   string `bson:"username" json:"username"`
    Website    string `bson:"website" json:"website"`
    ScreenName string `bson:"screen_name" json:"screen_name"`
    ShortBio   string `bson:"short_bio" json:"short_bio"`
    Location   string `bson:"location" json:"location"`
    OriginId   string `bson:"origin_id" json:"origin_id"`
    OriginCreationTime time.Time `bson:"origin_creation_time" json:"origin_creation_time"`

    NotifyAddUrl       bool `bson:"notify_add_url" json:"notify_add_url"`
    NotifyRelist       bool `bson:"notify_relist" json:"notify_relist"`
    NotifyFollowUser   bool `bson:"notify_follow_user" json:"notify_follow_user"`
    NotifyFollowList   bool `bson:"notify_follow_list" json:"notify_follow_list"`
    NotifySuggestUrl   bool `bson:"notify_suggest_url" json:"notify_suggest_url"`

    ProfileImage       string `bson:"profile_image" json:"profile_image"`
    ProfileCover       string `bson:"profile_cover" json:"profile_cover"`

    UsernameChangedAt  *time.Time  `bson:"username_changed_at" json:"username_changed_at,omitempty"`

    NoTrack bool     `bson:"__notrack" json:"__notrack"`
    IsAnonymous bool `bson:"is_anonymous" json:"is_anonymous"`

    SavedSearches []SavedSearch `bson:"saved_searches" json:"saved_searches"`
    Welcome bool `bson:"welcome" json:"welcome"`

    Email string `bson:"email" json:"email,omitempty"`

    Lists         []UserList `json:"lists"`
    FollowedLists []UserList `json:"followed_lists"`
    LinksAmount   int `json:"links_amount"`
    ListsAmount   int `json:"lists_amount"`

    SecretListsBonus int `bson:"secret_lists_bonus" json:"secret_lists_bonus"`
    SecretListsLeft  int `json:"secret_lists_left"`

    FacebookProfileImg string `bson:"facebook_profile_img" json:"facebook_profile_img"`
    FacebookUsername   string `bson:"facebook_username" json:"facebook_username"`

    TwitterProfileImg  string `bson:"twitter_profile_img" json:"twitter_profile_img"`
    TwitterUsername    string `bson:"twitter_username" json:"twitter_username"`

    GoogleUsername     string `bson:"google_username" json:"google_username"`

    Followers []string `bson:"followers"`

    FollowingUsers   []FollowedUser `bson:"following_users" json:"following_users"`
    FollowedByUsers  []FollowedUser `bson:"followed_by_users" json:"followed_by_users"`
    Following        bool `bson:"following" json:"following"`
    FollowersAmount  int `bson:"followers_amount" json:"followers_amount"`

    CreationTime     time.Time `bson:"creation_time" json:"creation_time"`

    RegisteredWith string `bson:"registered_with" json:"registered_with"`

    Permissions []string `bson:"__permissions" json:"__permissions"`

    Progress []string `bson:"progress" json:"progress"`

    Beta    bool `bson:"__beta" json:"__beta"`

    ShowFacebookLink bool `bson:"show_facebook_link" json:"show_facebook_link"`

    PendingOnboarding bool `bson:"pending_onboarding,omitempty" json:"pending_onboarding,omitempty"`
    PendingActivation string `bson:"pending_activation" json:"pending_activation"`
}

func (user *User) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) error {
    return user.FetchById(key, dbs)
}

func (user *User) Authorize(userId string) bool {
    return true
}

func (user *Profile) Authorize(userId string) bool {
    return true
}

func (user *Profile) HasPerm(name string) bool {
    for _, x := range user.Permissions {
        if x == name {
            return true
        }
    }

    return false
}

func (user *Profile) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) error {
    return user.FetchById(key, dbs)
}

func (user *Profile) FetchByUsername(username string, dbs *mgo.Session) error {
    if username == "" {
        return errors.New("EmptyUsername")
    }

    session := dbs.Clone()
    defer session.Close()

    c := session.DB("").C("users")

    if err := c.Find(bson.M{"username": username}).One(&user); err != nil {
        return err
    }

    return nil
}

func (user *User) FetchById(userId string, dbs *mgo.Session) error {
    if userId == "" {
        return errors.New("EmptyUserId")
    }

    if !bson.ObjectIdHex(userId).Valid() {
        return errors.New(fmt.Sprintf("InvalidUserId:%s", userId))
    }

    session := dbs.Clone()
    defer session.Close()

    c := session.DB("").C("users")

    userOid := bson.ObjectIdHex(userId)

    if err := c.Find(bson.M{"_id": userOid}).One(&user); err != nil {
        return err
    }

    return nil
}

func (user *Profile) FetchById(userId string, dbs *mgo.Session) error {
    if userId == "" {
        return errors.New("EmptyUserId")
    }

    if !bson.ObjectIdHex(userId).Valid() {
        return errors.New(fmt.Sprintf("InvalidUserId:%s", userId))
    }

    session := dbs.Clone()
    defer session.Close()

    c := session.DB("").C("users")

    userOid := bson.ObjectIdHex(userId)

    if err := c.Find(bson.M{"_id": userOid}).One(&user); err != nil {
        return err
    }

    return nil
}


func (user *User) Render(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (user *User) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return nil
}

func (user *Profile) Render(context map[string] interface{}, dbs *mgo.Session) error {
    if user.Followers == nil {
        user.Followers = []string{}
    }

    if context["CurrentUserId"] != user.UserId.Hex() {
        user.Email = ""
        user.PendingActivation = ""
    }

    user.renderFollowedLists(context, dbs)
    user.renderLists(context, dbs)
    user.renderFollowers(context)
    user.ListsAmount = len(user.Lists)
    user.renderFollowing(context)

    user.renderWelcome(context, dbs)

    return nil
}

func (user *Profile) renderWelcome(context map[string] interface{}, dbs *mgo.Session) {
    userId := user.UserId.Hex()
    currentUserId := context["CurrentUserId"]

    if userId != currentUserId {
        return
    }

    if !user.Welcome {
        return
    }

    c := dbs.DB("").C("users")

    if err := c.UpdateId(user.UserId, bson.M{"$set": bson.M{"welcome": false}}); err != nil {
        log.Print(fmt.Sprintf("Cannot remove Welcome flag for user %s: %s", userId, err))
    }
}


func (user *Profile) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return user.Render(context, dbs)
}


func (user *Profile) renderFollowers(context map[string] interface{}) {
    user.FollowedByUsers = []FollowedUser{}

    userId := user.UserId.Hex()

    for _, x := range user.Followers {
        if x == userId {
            continue
        }

        user.FollowedByUsers = append(user.FollowedByUsers, FollowedUser{x})
    }

    user.FollowersAmount = len(user.Followers)
}

func (user *Profile) renderFollowing(context map[string] interface{}) {
    currentUserId := context["CurrentUserId"]

    for _, x := range user.Followers {
        if currentUserId == x {
            user.Following = true

            return
        }
    }
}

func (user *User) renderListsAmount(context map[string] interface{}, dbs *mgo.Session) {
    c := dbs.DB("").C("urlists")

    userId := user.UserId.Hex()

    contributorQuery := bson.M{
            "contributors": bson.M{"$elemMatch":
                            bson.M{"user_id": userId, "status": "accepted"}}}

    ownerQuery := bson.M{"user_id": userId}

    query := bson.M{"$or": []bson.M{ownerQuery, contributorQuery},
                    "is_secret": false}

    if count, err := c.Find(query).Count(); err != nil {
        log.Print(err)
    } else {
        user.ListsAmount = count
    }
}

func (user *Profile) renderLists(context map[string] interface{}, dbs *mgo.Session) {
    user.Lists = []UserList{}

    var currentUserId string

    if v, ok := context["CurrentUserId"]; ok {
        currentUserId = v.(string)
    } else {
        return
    }

    userId := user.UserId.Hex()

    c := dbs.DB("").C("urlists")

    contribListQuery := bson.M{"contributors": bson.M{"$elemMatch":
                                               bson.M{"user_id": userId, "status": "accepted"}}}

    ownerQuery := bson.M{"user_id": userId}

    query := bson.M{"$or": []bson.M{ownerQuery, contribListQuery}}

    if userId != currentUserId {
        query["is_secret"] = false
    }

    var secretListAmount int

    if err := c.Find(query).All(&user.Lists); err != nil {
        log.Print(err)
    } else {
        for i, x := range user.Lists {
            user.LinksAmount += x.LinksAmount

            if x.IsSecret && x.UserId == userId{
                secretListAmount += 1
            }

            user.Lists[i].LastVisit = listLastVisit(x.Hash, currentUserId, dbs)
        }
    }

    user.SecretListsLeft = (4 - secretListAmount) + user.SecretListsBonus
}

func (user *Profile) renderFollowedLists(context map[string] interface{}, dbs *mgo.Session) {
    user.FollowedLists = []UserList{}

    var currentUserId string

    if v, ok := context["CurrentUserId"]; ok {
        currentUserId = v.(string)
    } else {
        return
    }

    userId := user.UserId.Hex()

    c := dbs.DB("").C("urlists")

    query := bson.M{"followers": userId}

    if userId != currentUserId {
        query["is_secret"] = false
    }

    if err := c.Find(query).All(&user.FollowedLists); err != nil {
        log.Print(err)
    }

    for i, x := range user.FollowedLists {
        user.FollowedLists[i].LastVisit = listLastVisit(x.Hash, userId, dbs)
    }
}

func GetCurrentUser(context map[string] interface{}, dbs *mgo.Session) (Profile, error) {
    user := Profile{}

    if err := user.FetchByKey(context["CurrentUserId"].(string), nil, dbs); err != nil {
        return user, err
    }

    return user, nil
}

func GetContentManagerUsersIds(dbs *mgo.Session) []string {
    contentManagerUsers := []struct { Id bson.ObjectId `bson:"_id"` }{}

    c := dbs.DB("").C("users")
    c.Find(bson.M{"__content_manager": true}).All(&contentManagerUsers)

    contentManagerUsersIds := []string{}

    for _, x := range contentManagerUsers {
        contentManagerUsersIds = append(contentManagerUsersIds, x.Id.Hex())
    }

    return contentManagerUsersIds
}

func (u *Profile) followedStr() []string {
    userIds := []string{}

    for _, x := range u.FollowingUsers {
        userIds = append(userIds, x.UserId)
    }

    return userIds
}
