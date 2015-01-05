package vimeo

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
    Regexp = regexp.MustCompile(`vimeo\.(.*)?\/(\d+)$`)

    apiVersion = "v2"
    endpoint = "http://vimeo.com/api/%v/video/%v.json"
)

func (x *Vimeo) GetEndpoint() *url.URL {
    urlStr := fmt.Sprintf(endpoint, apiVersion, x.ItemId)

    if u, err := url.Parse(urlStr); err != nil {
        log.Print(err)
        return nil
    } else {
        return u
    }
}

func (x *Vimeo) EmbedHtml(width, height int) string {
    tmpl := `<iframe src="http://player.vimeo.com/video/%v" width="%v" height="%v" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>`

    return fmt.Sprintf(tmpl, x.ItemId, width, height)
}

type Config struct {}

type Vimeo struct {
    Config     Config
    RequestUrl *url.URL
    Timestamp  time.Time
    ItemId     string

    EmbedData struct {
        Title string
    }
}

type vimeoItem struct {
    Id int
    Title,
    Description string
    Width int
    Height int
    UploadDate string `json:"upload_date"`
}

type VimeoItem struct {
    Id          string
    Title       string
    EmbedHtml   string
    Description string
    PublishedAt string
    Endpoint    string
}

func (x *Vimeo) Fetch() string {
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

    items := []vimeoItem{}

    if err := dec.Decode(&items); err != nil {
        log.Print(err)
        return ""
    }

    if len(items) == 0 {
        log.Print("Empty Response")
        return ""
    }

    item := items[0]

    urlistItem := VimeoItem{
        Id: x.ItemId,
        Title: item.Title,
        Description: item.Description,
        PublishedAt: item.UploadDate,
        EmbedHtml: x.EmbedHtml(item.Width, item.Height),
        Endpoint: endpoint.String(),
    }

    if data, err := json.Marshal(&urlistItem); err != nil {
        log.Print(err)
        return ""
    } else {
        return string(data)
    }
}
