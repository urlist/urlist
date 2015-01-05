package youtube

import (
    "net/url"
    "fmt"
    "regexp"
    "time"
    "encoding/json"
    "net/http"
)

var (
    Regexp = regexp.MustCompile(`youtube\.(.*)?v\=(\w+)?.*$`)

    apiVersion = "v3"
    part = "snippet,player"
    fields = "items(snippet/title,snippet/description,player/embedHtml)"
)

var endpoint = "https://www.googleapis.com/youtube/%v/videos?id=%v&part=%v&fields=%v&key=%v"

func (x *Youtube) GetEndpoint() *url.URL {
    urlStr := fmt.Sprintf(endpoint, apiVersion, x.ItemId, part, fields, x.Config.ApiKey)

    if u, err := url.Parse(urlStr); err != nil {
        return nil
    } else {
        return u
    }
}

type Config struct {
    ApiKey string
}

type Youtube struct {
    Config     Config
    RequestUrl *url.URL
    Timestamp  time.Time
    ItemId     string

    EmbedData struct {
        Title string
    }
}

type youtubeItem struct {
    Items []struct {
        Id string

        Snippet struct {
            Title, Description string
            PublishedAt time.Time
        }

        Player struct {
            EmbedHtml string
        }
    }
}

type YoutubeItem struct {
    Id          string
    Title       string
    EmbedHtml   string
    Description string
    PublishedAt time.Time
}

func (x *Youtube) Fetch() string {
    endpoint := x.GetEndpoint()

    if endpoint == nil {
        return ""
    }

    resp, err := http.Get(endpoint.String())

    if err != nil {
        return ""
    }

    defer resp.Body.Close()

    dec := json.NewDecoder(resp.Body)

    items := youtubeItem{}

    if err := dec.Decode(&items); err != nil {
        return ""
    }

    if len(items.Items) == 0 {
        return ""
    }

    item := items.Items[0]

    urlistItem := YoutubeItem{
        Id: x.ItemId,
        Title: item.Snippet.Title,
        Description: item.Snippet.Description,
        PublishedAt: item.Snippet.PublishedAt,
        EmbedHtml: item.Player.EmbedHtml,
    }

    if data, err := json.Marshal(&urlistItem); err != nil {
        return ""
    } else {
        return string(data)
    }
}
