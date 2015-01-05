package github

import (
    "net/url"
    "fmt"
    "regexp"
    "time"
    "encoding/json"
    "net/http"
    "log"
)

var (
    Regexp = regexp.MustCompile(`github\.com\/(.+)$`)

    apiVersion = "v2"
    endpoint = "https://api.github.com/repos/%v"
)

func (x *Github) GetEndpoint() *url.URL {
    urlStr := fmt.Sprintf(endpoint, x.ItemId)

    if u, err := url.Parse(urlStr); err != nil {
        log.Print(err)
        return nil
    } else {
        return u
    }
}

func (x *Github) EmbedHtml(width, height int) string {
    tmpl := `<iframe src="http://player.github.com/video/%v" width="%v" height="%v" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>`

    return fmt.Sprintf(tmpl, x.ItemId, width, height)
}

type Config struct {}

type Github struct {
    Config     Config
    RequestUrl *url.URL
    Timestamp  time.Time
    ItemId     string

    EmbedData struct {
        Title string
    }
}

type githubItem struct {
    Id          int
    Name        string
    FullName    string `json:"full_name"`
    Description string
    UploadDate  string `json:"created_at"`
    UpdatedAt   string `json:"updated_at"`
}

type GithubItem struct {
    Id          string
    Title       string
    EmbedHtml   string
    Description string
    PublishedAt string
    Endpoint    string
}

func (x *Github) Fetch() string {
    endpoint := x.GetEndpoint()

    if endpoint == nil {
        log.Print("Cannot determine endpoint")
        return ""
    }

    resp, err := http.Get(endpoint.String())

    if err != nil {
        log.Print(err)
        return ""
    }

    defer resp.Body.Close()

    dec := json.NewDecoder(resp.Body)

    item := githubItem{}

    if err := dec.Decode(&item); err != nil {
        log.Print(err)
        return ""
    }

    urlistItem := GithubItem{
        Id: x.ItemId,
        Title: item.Name,
        Description: item.Description,
        PublishedAt: item.UploadDate,
        EmbedHtml: "",
        Endpoint: endpoint.String(),
    }

    if data, err := json.Marshal(&urlistItem); err != nil {
        log.Print(err)
        return ""
    } else {
        return string(data)
    }
}
