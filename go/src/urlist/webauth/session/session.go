package session

import (
    "log"
    "fmt"
    "time"
    "net/http"
    "math/rand"
    "labix.org/v2/mgo"
    "labix.org/v2/mgo/bson"
    "urlist/webauth/cookie"
    "urlist/data"
)


type CookieConfig struct {
    Secret, Domain string
}

type Config struct {
    Cookie CookieConfig
}

type UrlistSession struct {
    UserId string

    OAuth struct {
        Provider, UserId, Token string
    }

    IsAnonymous bool

    User *data.User
}

type AnonymousUser struct {
    UserId bson.ObjectId `bson:"_id"`
    Username string `bson:"username"`
    ScreenName string `bson:"screen_name"`
    IsAnonymous bool `bson:"is_anonymous"`
    CreationTime time.Time `bson:"creation_time"`
}

func (s *UrlistSession) FromRequest(r *http.Request, cfg Config, dbs *mgo.Session) {
    cookies := r.Cookies()

    decode := func(name, value string) string {
        return cookie.DecodeSignedValue(cfg.Cookie.Secret, name, value)
    }

    for _, c := range cookies {
        switch c.Name {
            case "anonymous_id":
                s.UserId = decode(c.Name, c.Value)
                s.IsAnonymous = true
            case "oauth_provider":
                s.OAuth.Provider = decode(c.Name, c.Value)
            case "oauth_user_id":
                s.OAuth.UserId = decode(c.Name, c.Value)
            case "oauth_token":
                s.OAuth.Token = decode(c.Name, c.Value)
        }
    }
}

func (s *UrlistSession) IsValid(dbs *mgo.Session) bool {
    c := dbs.DB("").C("users")

    q := bson.M{}

    if s.IsAnonymous || s.OAuth.Provider == "" {
        if s.UserId == "" {
            return false
        }

        if !bson.IsObjectIdHex(s.UserId) {
            return false
        }

        q["_id"] = bson.ObjectIdHex(s.UserId)
    } else {
        k := func(str string) string {
            return fmt.Sprintf("%s_%s", s.OAuth.Provider, str)
        }

        q[k("last_token")] = s.OAuth.Token
        q[k("id")] = s.OAuth.UserId
    }

    if err := c.Find(q).One(&s.User); err != nil {
        log.Print(err)
        return false
    }

    s.UserId = s.User.UserId.Hex()

    return true
}

func NewAnonymousUser(dbs *mgo.Session) *AnonymousUser {
    randSrc := rand.New(rand.NewSource(99))

    now := time.Now()

    unameTimePart := now.Unix()
    unameRandPart := randSrc.Uint32()

    uname := fmt.Sprintf("anonymous_%sA%s", unameTimePart, unameRandPart)
    oid := bson.NewObjectId()

    a := AnonymousUser{oid, uname, "Anonymous User", true, now}

    c := dbs.DB("").C("users")

    if err := c.Insert(a); err != nil {
        return &AnonymousUser{}
    }

    return &a
}

func (s *UrlistSession) NewAnonymousSession(dbs *mgo.Session) {
    anon := NewAnonymousUser(dbs)

    s.UserId = anon.UserId.Hex()
    s.IsAnonymous = true
}

func (s *UrlistSession) Write(w http.ResponseWriter, cfg Config, dbs *mgo.Session) {
    now := time.Now()
    expireAt := now.AddDate(0, 0, 31)
    expireAtStr := fmt.Sprintf("%v", expireAt.Unix())

    makeCookie := func(name, value string) *http.Cookie {
        signedValue := cookie.CreateSignedValue(cfg.Cookie.Secret, name, value, now)

        c := http.Cookie{
            name, signedValue,
            "", cfg.Cookie.Domain,
            expireAt, expireAtStr,
            2678400,
            false, false, "", []string{}}

        return &c
    }

    setCookie := func(name, value string) {
        c := makeCookie("anonymous_id", s.UserId)

        http.SetCookie(w, c)
    }

    if s.IsAnonymous {
        setCookie("anonymous_id", s.UserId)
    } else {
        setCookie("oauth_provider", s.OAuth.Provider)
        setCookie("oauth_token", s.OAuth.Token)
        setCookie("oauth_user_id", s.OAuth.UserId)
    }
}

func Session(w http.ResponseWriter, r *http.Request, cfg Config, dbs *mgo.Session) *UrlistSession {
    s := UrlistSession{}
    s.FromRequest(r, cfg, dbs)

    if !s.IsValid(dbs) {
        s.NewAnonymousSession(dbs)
        s.Write(w, cfg, dbs)
    }

    return &s
}
