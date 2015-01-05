// SEO is the urlist app server used to handle bot/crawler and other seo driven
// robots.
// It provides SEO friendly output for:
// - Index Page /
// - List Page  /hash
// - Url Page   /listHash/urlHash
package main

import (
        "os"
        "fmt"
        "log"
        "io/ioutil"
        "strings"
        "net/http"
        "math/rand"
        "path"
        "html/template"
        "labix.org/v2/mgo"
        "labix.org/v2/mgo/bson"
        "urlist/config"
        "urlist/data"
        "urlist"
)

//
// START - Configuration
//
var CONFIG = Config{}
var DBS *mgo.Session
var ProfileImages []string

type Context struct {
    BaseUrl string
    FacebookAdmin string
    FacebookAppId string
    GoogleVerification string
}

type Config struct {
    Server  config.ServerConfig

    HttpAddress string

    Static struct {
        Path string
        Url string
    }

    CustomImages struct {
        Path string
        Url string
    }

    Context Context
}

func init() {
    log.SetPrefix("SEO ")

    config.MustLoad(&CONFIG)
    DBS = urlist.Database()

    if images, err := GetProfileImages(); err != nil {
        log.Print(err)
    } else {
        ProfileImages = images
    }
}

//
// END - Configuration
//


//
// START - Random Profile image
//

// countProfileImages read the profile images directory
// and return the number of entries found. If profile_images
// path does not exist return err.
func GetProfileImages() ([]string, error) {
    fileNames := []string{}

    path := path.Join(CONFIG.Static.Path, "profile_images")

    entries, err := ioutil.ReadDir(path);

    if err != nil {
        return fileNames, err
    }

    for _, fInfo := range entries {
        fileNames = append(fileNames, fInfo.Name())
    }

    return fileNames, err
}

func RandomProfileImage(filenames []string) string {
    fallback := "http://static.urli.st/profile_images/01_avatar.png"

    fileCount := len(filenames)

    if fileCount <= 0 {
        log.Print("No profile images, using ", fallback)

        return fallback
    }

    randIdx := rand.Intn(fileCount - 1)

    profileImage := filenames[randIdx]
    profileImageUrl := fmt.Sprintf("%s/profile_images/%s", CONFIG.Static.Url, profileImage)

    return profileImageUrl
}

func imageExist(filename string) bool {
    basePath := CONFIG.CustomImages.Path
    fullPath := path.Join(basePath, filename)

    if _, err := os.Open(fullPath); err != nil {
        return false
    }

    return true
}

func CustomListImage(key string) (url string) {
    guessFilename := func() string {
        for _, ext := range []string{"png", "jpg", "gif"} {
            filename := fmt.Sprint(key, ".", ext)

            if !imageExist(filename) {
                continue
            }

            return filename
        }

        return ""
    }

    filename := guessFilename()

    if filename == "" {
        return
    }

    baseUrl := CONFIG.CustomImages.Url

    url = fmt.Sprint(strings.TrimRight(baseUrl, "/"), "/", filename)

    return
}

func getListImage(list *data.List) string {
    listFirstCategory := ""

    if len(list.Categories) > 0 {
        listFirstCategory = list.Categories[0]
    }

    log.Print(listFirstCategory)

    tryCustomImages := []string{CustomListImage(fmt.Sprint(list.Hash, "_share")),
                                CustomListImage(list.Hash),
                                CustomListImage(listFirstCategory),
                                "http://static.urli.st/urlist_placeholder_500.png",
                                RandomProfileImage(ProfileImages)}

    for _, img := range tryCustomImages {
        if img != "" {
            return img
        }
    }

    return ""
}

//
// END - Random Profile Image
//


//
// START - App Server
//

type DiscoveryHandlerResponse struct {
    Context Context
    FocusOn data.FocusOn
    Image string
}

type CategoryHandlerResponse struct {
    Context Context
    Type string
    CanonicalUrl string
    Key string
    Lists []data.List
    ListsAmount int
    Image string
}

type ListHandlerResponse struct {
    Context Context
    List data.List
    UrlsBySection map[string] []data.Url
    Author data.User
    Image string
}

type UrlHandlerResponse struct {
    Context Context
    List data.List
    Author data.User
    Image string
    Url  data.Url
}

type HomepageHandlerResponse struct {
    Context Context
}

func handleSuccess(t *template.Template,
                    responseData interface{}) func(http.ResponseWriter, *http.Request) {
    return func(w http.ResponseWriter, _ *http.Request) {
        t.Execute(w, responseData)
    }
}

func handlerRedirect(redirectTo string, code int) func(http.ResponseWriter, *http.Request) {
    return func(w http.ResponseWriter, r *http.Request) {
        http.Redirect(w, r, redirectTo, code)
    }
}

func handleFailure(msg string) func(http.ResponseWriter, *http.Request) {
    return func(w http.ResponseWriter, _ *http.Request) {
        fmt.Fprintf(w, msg)
    }
}

func HomepageHandler() func(http.ResponseWriter, *http.Request) {
    tname := fmt.Sprint(CONFIG.Server.TemplatePath, "/index.html")
    t :=  template.Must(template.ParseFiles(tname))

    return handleSuccess(t, HomepageHandlerResponse{CONFIG.Context})
}

func DiscoverHandler(edition string) func(http.ResponseWriter, *http.Request) {
    var responseData DiscoveryHandlerResponse

    tname := fmt.Sprint(CONFIG.Server.TemplatePath, "/discovery.html")
    t :=  template.Must(template.ParseFiles(tname))

    f := data.FocusOn{}
    f.FetchByKey(edition, nil, DBS)

    image := "http://static.urli.st/profile_images/01_avatar.png"

    responseData = DiscoveryHandlerResponse{CONFIG.Context, f, image}

    return handleSuccess(t, responseData)
}

func resolveCategoryId(k string) string {
    if bson.IsObjectIdHex(k) {
        return k
    }

    c := DBS.DB("").C("categories")

    category := struct {
        Id bson.ObjectId `bson:"_id"`
    }{}

    if err := c.Find(bson.M{"slug": k}).One(&category); err != nil {
        return ""
    }

    return category.Id.Hex()
}

func CategoryHandler(key string, categoryType string) func(http.ResponseWriter, *http.Request) {
    k := strings.ToLower(key)
    k = fmt.Sprintf("#%v", k)

    responseData := CategoryHandlerResponse{
        Context: CONFIG.Context,
        Type: categoryType,
        Key: key,
        CanonicalUrl: fmt.Sprintf("%v/%v", categoryType, strings.ToLower(key)),
    }

    tname := fmt.Sprint(CONFIG.Server.TemplatePath, "/category.html")
    t :=  template.Must(template.ParseFiles(tname))

    var iter *mgo.Iter

    switch categoryType {
    case "hashtag":
        h := struct {
            Hashtag string
            Lists []string
        }{}

        {
            c := DBS.DB("urlist").C("hashtags")
            if err := c.Find(bson.M{"hashtag": k}).One(&h); err != nil {
                return handleFailure(fmt.Sprintf("Cannot find hashtag: %v", key))
            }
        }

        {
            c := DBS.DB("urlist").C("urlists")
            iter = c.Find(bson.M{"hash": bson.M{"$in": h.Lists}}).Iter()
        }
    default:
        categoryId := resolveCategoryId(key)

        c := DBS.DB("urlist").C("urlists")
        iter = c.Find(bson.M{"categories": categoryId}).Iter()
    }

    list := data.List{}

    var linksAmount int

    for  {
        if hasMore := iter.Next(&list); !hasMore {
            break
        }

        if len(list.Urls) > 3 {
            list.Urls = list.Urls[:3]
        }

        linksAmount += 1 + len(list.Urls)

        responseData.Lists = append(responseData.Lists, list)

        if linksAmount == 100 {
            break
        }
    }

    responseData.Image = "http://static.urli.st/profile_images/01_avatar.png"
    responseData.ListsAmount = len(responseData.Lists)

    return handleSuccess(t, responseData)
}


func ListHandler(hash string) func(http.ResponseWriter, *http.Request) {
    var responseData ListHandlerResponse

    tname := fmt.Sprint(CONFIG.Server.TemplatePath, "/list.html")
    t :=  template.Must(template.ParseFiles(tname))

    list := data.List{}

    if err := list.FetchByHash(hash, DBS); err != nil {
        msg := fmt.Sprint("Cannot find list with hash: ", list.Hash)
        return handleFailure(msg)
    }

    // If the list has a slug we want to use a slug friendly address instead of the plain list hash
    if !data.HasSlug(hash) && list.Slug != "" {
        redirectTo := strings.Join([]string{CONFIG.Context.BaseUrl, list.Slug}, "/")

        return handlerRedirect(redirectTo, 301)
    }

    if !list.Authorize("") {
        msg := fmt.Sprint("Cannot find list with hash: ", list.Hash)
        return handleFailure(msg)
    }

    author := data.User{}

    if err := author.FetchById(list.UserId, DBS); err != nil {
        msg := fmt.Sprint("Cannot find user with id: ", list.Hash)
        return handleFailure(msg)

    }

    image := getListImage(&list)

    urlsBySection := list.GroupUrlsBySection()

    responseData = ListHandlerResponse{CONFIG.Context, list, urlsBySection, author, image}

    return handleSuccess(t, responseData)
}

func UrlHandler(listHash string, urlHash string) func(http.ResponseWriter, *http.Request) {
    var responseData UrlHandlerResponse

    tname := fmt.Sprint(CONFIG.Server.TemplatePath, "/url.html")
    t :=  template.Must(template.ParseFiles(tname))

    list := data.List{}

    if err := list.FetchByHash(listHash, DBS); err != nil {
        msg := fmt.Sprint("Cannot find list with hash: ", list.Hash)
        return handleFailure(msg)
    }

    url, err := list.FetchUrlByHash(urlHash)

    if err != nil {
        msg := fmt.Sprint("Cannot find url with hash: ", urlHash,
                          "in list with hash: ", listHash)
        return handleFailure(msg)
    }

    // If the list has a slug we want to use a slug friendly address instead of the plain list hash
    if !data.HasSlug(urlHash) && url.Slug != "" {
        redirectTo := strings.Join([]string{CONFIG.Context.BaseUrl, list.Slug, url.Slug}, "/")

        return handlerRedirect(redirectTo, 301)
    }

    author := data.User{}

    if err := author.FetchById(url.UserId, DBS); err != nil {
        msg := fmt.Sprint("Cannot find user with id: ", list.UserId)
        return handleFailure(msg)
    }

    imgExt := []string{".gif", ".jpg", ".png", ".jpeg"}

    // If the url itself is an image, use it
    var image string

    for _, ext := range imgExt {
        if strings.Contains(url.Url, ext) {
            image = url.Url
        }
    }

    // ...otherwise apply the same criteria of List
    if image == "" {
        image = getListImage(&list)
    }

    responseData = UrlHandlerResponse{CONFIG.Context, list, author, image, url}

    return handleSuccess(t, responseData)
}

func RootHandler(w http.ResponseWriter, r *http.Request) {
    var responseHandler func(http.ResponseWriter, *http.Request)

    path := strings.Trim(r.URL.Path, "/")

    switch path  {
        case "sitemap.xml":
            SitemapHandler(w, r)
            return
    }

    hashes := strings.Split(path, "/")

    switch len(hashes) {
        case 2:
            k1 := hashes[0]
            k2 := hashes[1]

            switch k1 {
            case "discovery":
                responseHandler = DiscoverHandler(k2)
            case "hashtag":
                responseHandler = CategoryHandler(k2, "hashtag")
            case "category":
                responseHandler = CategoryHandler(k2, "category")
            default:
                responseHandler = UrlHandler(k1, k2)
            }

        case 1:
            hash := hashes[0]

            switch hash {
            case "discover":
                responseHandler = DiscoverHandler("")
            case "":
                responseHandler = HomepageHandler()
            default:
                responseHandler = ListHandler(hashes[0])
            }
        default:
            responseHandler = func(w http.ResponseWriter, _ *http.Request) {
                fmt.Fprintf(w, "No route for %s", r.URL.Path)
            }
    }

    responseHandler(w, r)
}

func SitemapHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello sitemap")
}

func main() {
    defer DBS.Close()

    log.Print("Listening on port ", CONFIG.Server.Port)

    serverAddr := fmt.Sprint(":", CONFIG.Server.Port)

    http.HandleFunc("/", RootHandler)

    log.Fatal(http.ListenAndServe(serverAddr, urlist.ServeMux()))
}
//
// END - App Server
//
