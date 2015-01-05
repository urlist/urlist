package soundcloud

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
    Regexp = regexp.MustCompile(`soundcloud\.com\/(.+)$`)

    endpoint = "http://soundcloud.com/oembed?format=json&url=%v/%v"
)

func (x *Soundcloud) GetEndpoint() *url.URL {
    u, err := url.Parse(fmt.Sprintf(endpoint, "http://soundcloud.com", x.ItemId))

    if err != nil {
        panic(err)
    }

    log.Print(u)

    return u
}

func (x *Soundcloud) EmbedHtml(width, height int) string {
    tmpl := `<iframe src="http://player.soundcloud.com/video/%v" width="%v" height="%v" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>`

    return fmt.Sprintf(tmpl, x.ItemId, width, height)
}

type Config struct {}

type Soundcloud struct {
    Config     Config
    RequestUrl *url.URL
    Timestamp  time.Time
    ItemId     string

    EmbedData struct {
        Title string
    }
}

/* { */
/*   "version": 1.0, */
/*   "type": "rich", */
/*   "provider_name": "Soundcloud", */
/*   "provider_url": "http://soundcloud.com", */
/*   "height": 81, */
/*   "width": "100%", */
/*   "title": "Flickermood by Forss", */
/*   "description": "test", */
/*   "html": "test" */
/* } */

type soundcloudItem struct {
    Title, Description, Html string
}

type SoundcloudItem struct {
    Id          string
    Title       string
    EmbedHtml   string
    Description string
    PublishedAt string
    Endpoint    string
}

func (x *Soundcloud) Fetch() string {
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

    item := soundcloudItem{}

    if err := dec.Decode(&item); err != nil {
        log.Print(err)
        return ""
    }

    urlistItem := SoundcloudItem{
        Id: x.ItemId,
        Title: item.Title,
        Description: item.Description,
        EmbedHtml: item.Html,
        Endpoint: endpoint.String(),
    }

    if data, err := json.Marshal(&urlistItem); err != nil {
        log.Print(err)
        return ""
    } else {
        return string(data)
    }
}
