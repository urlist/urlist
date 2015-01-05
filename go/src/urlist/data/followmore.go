package data


import (
    "labix.org/v2/mgo"
)

type Followmore struct {
    Users []rankedUser `json:"users"`

    // The list we use to take the data
    Source string `json:"source"`
}

func (f *Followmore) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    return f.FetchByEdition(key, dbs)
}

func (f *Followmore) FetchByEdition(edition string, dbs *mgo.Session) (error) {
    data := discoveryEntries(edition, "Follow More Users", dbs)

    f.Source = data.Hash
    f.Users = data.Users

    return nil
}

func (f *Followmore) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    return f.Render(context, dbs)
}

func (f *Followmore) Render(context map[string] interface{}, dbs *mgo.Session) error {
    users := []rankedUser{}

    currentUserId := context["CurrentUserId"].(string)
    currentUser := Profile{}

    if err := currentUser.FetchById(currentUserId, dbs); err != nil {
        return err
    }

    following := map[string] bool{}

    for _, x := range currentUser.FollowingUsers {
        following[x.UserId] = true
    }

    currentUser.renderFollowing(context)

    for _, x := range f.Users {
        if _, ok := following[x.UserId]; ok || x.UserId == currentUser.UserId.Hex() {
            continue
        }

        users = append(users, x)
    }

    f.Users = users

    return nil
}

func (f *Followmore) Authorize(userId string) bool {
    return true
}
