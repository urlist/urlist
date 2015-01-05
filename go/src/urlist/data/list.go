package data


import (
        "fmt"
        "time"
        "labix.org/v2/mgo"
        "labix.org/v2/mgo/bson"
        "net/url"
        "strings"
        "path"
        "os"
        "log"
       )

type listTitleRegex string

type relistCollection struct {
    Count    int
    ListHash string "list_hash"
    UrlHash  string "url_hash"
    Relists  []RelistItem
}

// A Relist is simply a Url generated starting from another
// one. We want to keep the relist history because we are hipster
// and like social stuff. At the moment we keep trace of:
// Who made the relist - UserId
// Where ?             - TargetListHash
// When ?              - RelistedAt
type RelistItem struct {
    UserId         string    `bson:"user_id" json:"user_id"`
    RelistedAt     time.Time `bson:"relisted_at" json:"relisted_at"`
    TargetListHash string    `bson:"target_list_hash" json:"target_list_hash"`
}

// A List is a document owned by a registered Urlist user,
// and editable by it's contributors, containing Urls.
type List struct {
    Hash         string `json:"hash"`
    Title        string `json:"title"`
    Description  string `json:"description"`

    Categories   []string `bson:"categories" json:"categories"`

    // When IsSecret is true, the list is visible only to it's owner and contributors.
    IsSecret     bool `bson:"is_secret" json:"is_secret"`
    // When IsUnlisted is true, the list will not appear in the user library.
    IsUnlisted   bool `bson:"is_unlisted" json:"is_unlisted"`

    LastActionTime time.Time `bson:"last_action_time" json:"last_action_time"`
    LastActionId string `bson:"last_action_id" json:"last_action_id"`

    UpdateTime   time.Time `bson:"update_time" json:"update_time"`
    CreationTime time.Time `bson:"creation_time" json:"creation_time"`

    UserId       string `bson:"user_id" json:"user_id"`

    Urls         []Url          `json:"urls"`
    Sections     []Section      `json:"sections"`
    Contributors []Contributor  `json:"contributors"`

    // Followers IDs in a flat array: [foo, bar]
    Followers_   []string `bson:"followers" json:"-"`
    // Followers IDs in an array of dictionary: [{'user_id': 'foo'} ...
    Followers    []map[string] string `bson:"followers_virtual" json:"followers"`

    // True if the current user if following this list
    Following bool `json:"following"`

    LinksAmount  int `bson:"links_amount" json:"links_amount"`

    ViewsAmount  int `bson:"views_amount" json:"views_amount"`

    CoverImage interface{} `bson:"cover_image,omitempty" json:"cover_image"`
    CoverImageVersion time.Time `bson:"cover_image_v,omitempty" json:"cover_image_v"`

    // Last time that the current user visited the list
    // Refer to the visit_tracker collection
    LastVisit *time.Time `bson:"last_visit,omitempty" json:"last_visit,omitempty"`

    isRendered, isCached bool

    CachedAt time.Time `bson:"cached_at" json:"cached_at"`

    Slug string `json:"slug"`

    Hashtags []string

    Rank float64 `bson:"popularity" json:"popularity"`

    SuggestedUrls []struct {
        Url string `json:"url"`
        Description string `json:"description"`
        UserId string `bson:"user_id" json:"user_id"`
        SentAt time.Time `bson:"sent_at" json:"sent_at"`
        SectionId string `bson:"section_id" json:"section_id"`
        SuggestionId bson.ObjectId `bson:"suggestion_id" json:"suggestion_id"`
    } `bson:"suggested_urls" json:"suggested_urls"`
}

// Url are owned by a registered Urlist user and contained in a
// List.
type Url struct {
    Hash         string `json:"hash"`
    ListHash     string `bson:"list_hash" json:"list_hash"`
    ListTitle    string `bson:"list_title" json:"list_title"`
    Url          string `json:"url"`
    Title        string `json:"title"`
    CreationTime time.Time `bson:"creation_time" json:"creation_time"`
    Description  string    `json:"description"`
    UserId       string `bson:"user_id" json:"user_id"`
    SectionId    int `bson:"section" json:"section"`
    Position     int `json:"position"`

    Favicon      string `json:"favicon"`

    Username     string `json:"username"`

    // BUG(adp): EmbedHandler, should use an hard coded blacklist to automatically
    // set this field for certain domain.
    EmbedHandler string `bson:"embed_handler" json:"embed_handler"`

    // Owner of the url when the first relist happened
    FromUserId   string `bson:"from_user_id" json:"from_user_id"`
    FromListHash string `bson:"from_list_hash" json:"from_list_hash,omitempty"`
    FromUrlHash  string `bson:"from_url_hash" json:"from_url_hash,omitempty"`

    Relists      []RelistItem `json:"relists"`
    RelistAmount int `json:"relist_amount"`

    Slug string `bson:"slug" json:"slug"`
}

// A Contributor is a registered Urlist user which, after accepting an invite
// to Join a List, hold the permission to edit the lists by adding Urls.
type Contributor struct {
    UserId     string `bson:"user_id" json:"user_id"`

    // Status value must be 'accepted' or 'pending'.
    Status     string `json:"status"`

    InvitedAt  string `bson:"invited_at" json:"invited_at"`

    // AcceptedAt should be undefined until the user, identified by user_id,
    // has not accepted the invite.
    AcceptedAt string `bson:"accepted_at" json:"accepted_at"`
}

// A Section is a logical group used to group urls by meaning.
type Section struct {
    SectionId  int `bson:"section_id" json:"section_id"`
    Position   int `json:"position"`
    Title      string `json:"title"`
}

type listRenderCache struct {
    UpdateTime time.Time `bson:"update_time" json:"update_time"`
    ListHash   string    `bson:"list_hash" json:"list_hash"`
    Urls       []Url     `bson:"urls" json:"urls"`
}

func HasSlug(hash string) bool {
    return strings.Index(hash, "-") > -1
}

// GetHash return the hash part from a seo friendly string
func GetHash(hash string) string {
    if HasSlug(hash) {
        return strings.Split(hash, "-")[0]
    }

    return hash
}

func (list *List) FetchByKey(key string, q *QueryOpts, dbs *mgo.Session) (error) {
    return list.FetchByHash(key, dbs)
}

// FetchByHash fetch data from the source into a struct of type List,
// returning an error if query fail.
func (list *List) FetchByHash(hash string, dbs *mgo.Session) (error) {
    session := dbs.Clone()
    defer session.Close()

    c := session.DB("").C("urlists")

    hash = GetHash(hash)

    if err := c.Find(bson.M{"hash": hash}).One(&list); err != nil {
        return err
    }

    if list.Hash == "" {
        return fmt.Errorf("ListDoesNotExist")
    }

    return nil
}


func (list *List) Authorize(userId string) bool {
    if list.IsUnlisted {
        return true
    }

    if list.IsSecret {
        for _, x := range list.Contributors {
            if x.UserId == userId {
                return true
            }
        }

        return userId == list.UserId
    }

    return true
}

// FetchUrlByHash iter the List.Urls field, returning an Url with hash == urlHash,
// otherwise return an empty Url.
func (list *List) FetchUrlByHash(urlHash string) (Url, error) {
    urlHash = GetHash(urlHash)

    for _, urlData := range list.Urls {
        if urlData.Hash == urlHash {
            urlData.ListTitle = list.Title

            return urlData, nil
        }
    }

    return Url{}, nil
}

// GroupUrlsBySection group the Urls using the Title field from Section.
func (list *List) GroupUrlsBySection() (map[string] []Url) {
    urlsBySectionId := map[string] []Url{}

    for _, urlData := range list.Urls {
        key := string(urlData.SectionId)
        target := urlsBySectionId[key]

        urlsBySectionId[key] = append(target, urlData)
    }

    urlsBySectionTitle := map[string] []Url{}

    for _, x := range list.Sections {
        urlsBySectionTitle[x.Title] = urlsBySectionId[string(x.SectionId)]
    }

    return urlsBySectionTitle
}

// String is used to represent List as a String.
//
// Example:
// [R+C-] Yyc :: Programmers talk
//
// R+ - Means that the list has been rendered
// C- - Means that the list is not using Cached Rendered Data
func (list List) String() string {
    var status string

    if list.isRendered {
        status = "R+"
    } else {
        status = "R-"
    }

    if list.isCached {
        status = fmt.Sprint(status, "C+")
    } else {
        status = fmt.Sprint(status, "C-")
    }

    return fmt.Sprintf("[%s] %s :: %s", status, list.Hash, list.Title)
}

func (url Url) String() string {
    return fmt.Sprintf("%s :: %s @ %s", url.Hash, url.Title, url.Url)
}

// RenderWithCache works exactly like Render method when no cache record is found,
// otherwise it read results from the cache itself.
func (list *List) RenderWithCache(context map[string] interface{}, dbs *mgo.Session) error {
    // Cache Get
    cachedData := listRenderCache{}

    c := dbs.DB("").C("urlists_render_cache")

    if err := c.Find(bson.M{"list_hash": list.Hash, "update_time": bson.M{"$gte": list.UpdateTime}}).One(&cachedData); err != nil {
        fmt.Println("CACHE MISS - ", list.Hash, " @ ", list.UpdateTime)
        return list.Render(context, dbs)
    }
    //

    list.Urls = cachedData.Urls

    list.RenderUncachedFields(context, dbs)

    list.isRendered = true
    list.isCached = true
    list.CachedAt = cachedData.UpdateTime

    return nil
}

// Render method take a context (which may hold Web Session data or Server
// config stuff) and set all the model dynamic fields.
// Usually the render methods start with 'render' prefix so they are private.
func (list *List) Render(context map[string] interface{}, dbs *mgo.Session) error {
    list.RenderUncachedFields(context, dbs)

    for i, _ := range list.Urls {
        list.Urls[i].renderRelists(dbs)

        if list.Urls[i].CreationTime.IsZero() {
            list.Urls[i].CreationTime = list.CreationTime
        }
    }

    // Cache Set
    cachedData := listRenderCache{list.UpdateTime, list.Hash, list.Urls}
    c := dbs.DB("").C("urlists_render_cache")
    c.Remove(bson.M{"list_hash": list.Hash})
    c.Insert(cachedData)
    //

    list.isRendered = true
    list.isCached = false

    return nil
}

// If the relist origin information are missing (From List Hash and From Url Hash),
// we are asking for a list of relists done starting from this link, otherwise
// we are querying for successive relists.
func (url *Url) renderRelists(dbs *mgo.Session) {
    session := dbs

    c := session.DB("").C("relist_tracker")

    var trackerQuery = make(map[string] string)

    if url.FromListHash == "" && url.FromUrlHash == "" {
        trackerQuery["list_hash"] = url.ListHash
        trackerQuery["url_hash"] = url.Hash
    } else {
        trackerQuery["list_hash"] = url.FromListHash
        trackerQuery["url_hash"] = url.FromUrlHash
    }

    trackerData := relistCollection{}

    iter := c.Find(trackerQuery).Iter()

    for iter.Next(&trackerData) {
        ys := trackerData.Relists

        if len(ys) == 0 {
            continue
        }

        for _, y := range ys {
            url.Relists = append(url.Relists, y)
        }
    }

    url.RelistAmount = len(url.Relists)
}

// renderFollowers tranform the followers flat array in an
// hipster array of dictionaries, otherwise the fancy OO stuff in the Web Client
// will not work.
//
// From this: ["foo", "bar"]
// To this:   [{"user_id": "foo"}, {"user_id": "bar"}]
func (list *List) renderFollowers() {
    followersMap := []map[string] string{}

    for _, userId := range list.Followers_ {
        newItem := map[string] string{"user_id": userId}
        followersMap = append(followersMap, newItem)
    }

    list.Followers = followersMap
}

// renderFollowing determine if the current user if following this list.
// A user is following a list when he is a contributor or he clicked on the
// 'Bookmark' button (being added in the 'followers' field)
//
// Contributors: [{'user_id': 'foo',
//                 'status': 'accepted'},
//                {'user_id': 'bar',
//                 'status': 'accepted'}]
//
// Followers: [foo, bar]
func (list *List) renderFollowing(context map[string] interface{}) {
    var currentUserId string

    isFollowing := func() bool {
        if v, ok := context["CurrentUserId"]; ok {
            currentUserId = v.(string)
        } else {
            return false
        }

        for _, x := range list.Followers_ {
            if x == currentUserId {
                return true
            }
        }

        for _, x := range list.Contributors {
            if x.UserId == currentUserId && x.Status == "accepted" {
                return true
            }
        }

        return false
    }

    list.Following = isFollowing()
}

func (list *List) renderLastVisit(context map[string] interface{}, session *mgo.Session) {
    var currentUserId string

    if v, ok := context["CurrentUserId"]; ok {
        currentUserId = v.(string)
    } else {
        return
    }

    list.LastVisit = listLastVisit(list.Hash, currentUserId, session)
}

func listLastVisit(hash string, userId string, session *mgo.Session) *time.Time {
    c := session.DB("").C("tracker")

    var value struct { LastVisitAt time.Time `bson:"ts,omitempty"` }

    q := bson.M{"tracker": "view", "user_id": userId,
                "model": "list", "target": hash}

    if err := c.Find(q).Sort("-ts").One(&value); err != nil {
        return nil
    }

    return &value.LastVisitAt
}

func imageExist(basePath string, filename string) bool {
    fullPath := path.Join(basePath, filename)

    if _, err := os.Open(fullPath); err != nil {
        return false
    }

    return true
}

func (list *List) FindCoverImage(context map[string] interface{}) {
    if context["BasePath"] == nil || context["BaseUrl"] == nil {
        return
    }

    basePath := context["BasePath"].(string)
    baseUrl := context["BaseUrl"].(string)

    if basePath == "" || baseUrl == "" {
        list.CoverImage = nil
        return
    }

    guessFilename := func() string {
        for _, ext := range []string{"png", "jpg", "gif"} {
            filename := fmt.Sprint(list.Hash, ".", ext)

            if !imageExist(basePath, filename) {
                continue
            }

            return filename
        }

        return ""
    }

    filename := guessFilename()

    if filename == "" {
        list.CoverImage = nil

        return
    }

    list.CoverImage = fmt.Sprint(strings.TrimRight(baseUrl, "/"), "/", filename)
}

// RenderUncachedFields call the rendering methods of those field which does not require/support
// caching
func (list *List) RenderUncachedFields(context map[string] interface{}, dbs *mgo.Session) error {
    list.renderFollowers()
    list.renderFollowing(context)
    list.renderLastVisit(context, dbs)
    /* list.Rank = list.DiscoveryRank() */

    return nil
}

func (list *List) DiscoveryRank() float64 {
    bookmarks := float64(len(list.Followers_))
    views := float64(list.ViewsAmount)
    oldness := float64(time.Since(list.LastActionTime) / time.Hour) / 24.0

    rank := ((0.5 * (bookmarks * bookmarks)) + (0.1 * views)) * (1 / (oldness + 1))

    return rank
}

type ListOfEntities struct {
    Hash, Title, Description string
    Entities []UrlistEntity
}

type EntityMetadata struct {
    Title, Description string
    Position int
}

type UrlistEntity struct {
    Type, Key string
    Data  interface{}
    Flags map[string] bool
    Metadata EntityMetadata
}

func (u *UrlistEntity) FlagsFromDescription(description string) {
    u.Flags = make(map[string] bool)

    words := strings.Split(strings.TrimSpace(description), " ")

    for _, word := range words {
        tokens := strings.Split(word, "#")

        for _, token := range tokens {
            cleanToken := strings.TrimSpace(token)

            if cleanToken != "" {
                u.Flags[cleanToken] = true
            }
        }
    }
}

func (l *ListOfEntities) FetchByHash(hash string, dbs *mgo.Session)  {
    session := dbs.Clone()
    defer session.Close()

    list := List{}

    if err := list.FetchByHash(hash, session); err != nil {
        log.Print(err)
        return
    }

    l1 := list.GetEntities(dbs)

    l.Title = l1.Title
    l.Description = l1.Description
    l.Hash = l1.Hash
    l.Entities = l1.Entities
}

func (l *List) GetEntities(dbs *mgo.Session) *ListOfEntities {
    entities := ListOfEntities{}

    entities.Hash = l.Hash
    entities.Title = l.Title
    entities.Description = l.Description

    for _, x := range l.Urls {
        entity := UrlistEntity{}

        listUrlParts := strings.Split(x.Url, "/")
        keyValue := listUrlParts[len(listUrlParts) - 1]

        isUser := strings.Index(x.Url, "user/") != -1 ||
                  strings.Index(x.Url, "library/") != -1

        if isUser {
            entity.Type = "user"

            profile := Profile{}
            profile.FetchByUsername(keyValue, dbs)

            entity.Key = profile.UserId.Hex()
            entity.Data = profile
        } else {
            entity.Type = "list"

            list := List{}
            list.FetchByHash(keyValue, dbs)

            entity.Key = list.Hash
            entity.Data = list
        }

        entity.FlagsFromDescription(x.Description)
        entity.Metadata = EntityMetadata{x.Title, x.Description, x.Position}

        entities.Entities = append(entities.Entities, entity)
    }

    return &entities
}

func DomainFromUrl(urlStr string) string {
    url, err := url.Parse(urlStr)

    if err != nil {
        return ""
    }

    host := url.Host
    levels := strings.Split(host, ".")
    levelsCount := len(levels)

    newLevels := []string{host}

    if levelsCount > 2 {
        levelsToShow := 2

        if len(levels[levelsCount - 2]) == 2 {
            levelsToShow++
        }

        newLevels = levels[levelsCount - levelsToShow:]
    }

    return strings.Join(newLevels, ".")
}
