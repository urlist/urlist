package main

import (
        "fmt"
        "log"
        "strings"
        "errors"
        "net"
        "net/http"
        "net/url"
        "code.google.com/p/go.net/html"
        "urlist/config"
        "urlist"
        "encoding/json"
        "io"
        "bytes"
        "time"
)

//
// START - Configuration
//
var CONFIG = Config{}

type Config struct {
    Server  config.ServerConfig

    Favicon struct {
        Placeholder string
        FetchTimeout string
    }

}

func init() {
    log.SetPrefix("FAV ")

    config.MustLoad(&CONFIG)
}


//
// END - Configuration
//

func GetTimeout() time.Duration {
    timeout, err := time.ParseDuration(CONFIG.Favicon.FetchTimeout)

    if err != nil {
        timeout = time.Duration(2500 * time.Millisecond)
    }

    return timeout
}

func HTTPClientWithTimeout() *http.Client {
    timeout := GetTimeout()

    dial := func(proto, addr string) (net.Conn, error) {
        return net.DialTimeout(proto, addr, timeout)
    }

    tr := &http.Transport{Dial: dial}

    return &http.Client{Transport: tr}
}

//
// START - App Server
//

func parseHtml(r io.Reader) string {
    tokenizer := html.NewTokenizer(r)

    headTag := []byte("head")
    hrefTag := []byte("href")
    relTag := []byte("rel")
    shorticonVal := []byte("shortcut icon")
    iconVal := []byte("icon")
    linkTag := []byte("link")

    type ParseResult struct {
        Href []byte
        IsShortcutIcon bool
    }

    find := func(key []byte, val []byte, parseResult *ParseResult) {
        if bytes.Equal(key, hrefTag) {
            parseResult.Href = val
        }

        if bytes.Equal(key, relTag) &&
            (bytes.Equal(val, shorticonVal) || bytes.Equal(val, iconVal)) {
            parseResult.IsShortcutIcon = true
        }
    }

    result := ParseResult{[]byte{}, false}

    analyzeTag := func(tokenizer *html.Tokenizer) string {
        tag, hasAttr := tokenizer.TagName()

        if hasAttr && bytes.Equal(linkTag, tag) {
            for {
                key, val, hasMore := tokenizer.TagAttr()

                find(key, val, &result)

                if result.IsShortcutIcon && len(result.Href) > 0 {
                    return string(result.Href)
                }

                if !hasMore {
                    break
                }
            }

        }

        return ""
    }

    for {
        result.Href = nil
        result.IsShortcutIcon = false

        switch tokenizer.Next() {
            case html.ErrorToken:
                return ""
            case html.StartTagToken:
                if result := analyzeTag(tokenizer); result != "" {
                    return result
                }
            case html.SelfClosingTagToken:
                if result := analyzeTag(tokenizer); result != "" {
                    return result
                }
            case html.EndTagToken:
                tag, _ := tokenizer.TagName()

                if bytes.Equal(headTag, tag) {
                    log.Print("No match in HTML")
                    return ""
                }
        }
    }

    return ""
}

func FetchFavicon(fullUrl *url.URL, sink chan(string)) {
    client := HTTPClientWithTimeout()


    rootSearch := func (fullUrl *url.URL) (string, error) {
        log.Print("Searching Root Directory --- ", fullUrl)

        baseUrl := fullUrl.Scheme + "://" +  fullUrl.Host
        rootFavicon := baseUrl + "/favicon.ico"

        resp, err := client.Head(rootFavicon)

        if err != nil {
            return "", err
        }

        statusCode := resp.StatusCode
        abortIfStatusCode := map[int] bool{200: false, 405: false}

        if _, ok := abortIfStatusCode[statusCode]; !ok {
            return "", fmt.Errorf("Cannot find favicon in root domain, StatusCode %s", statusCode)
        }

        if resp.Header.Get("Content-Type") == "text/plain" && resp.Header.Get("Content-Length") == "" {
            log.Print("Empty favicon in root domain")
            return "", errors.New("Empty favicon in root domain")
        }

        if resp.Header.Get("Content-Type") == "text/html" {
            log.Print("No favicon in root domain")
            return "", errors.New("No favicon in root domain")
        }

        if resp.Header.Get("Content-Length") == "0" {
            log.Print("Empty favicon in root domain")
            return "", errors.New("Empty favicon in root domain")
        }


        return rootFavicon, nil
    }

    docSearch := func (fullUrl *url.URL) (string, error) {
        log.Print("Searching HTML --- ", fullUrl)

        resp, err := client.Get(fullUrl.String())

        if err != nil {
            return "", err
        }

        if resp.StatusCode != 200 {
            return "", errors.New("Cannot find favicon in document")
        }

        defer resp.Body.Close()

        handleRelativeUrl := func(favicon string) string {
            favicon = fmt.Sprintf("%s://%s/%s",
                                  fullUrl.Scheme,
                                  fullUrl.Host,
                                  strings.TrimLeft(favicon, "/"))

            return favicon
        }

        handleSchemalessUrl := func(favicon string) string {
            return fmt.Sprintf("%s:%s", fullUrl.Scheme, favicon)
        }

        if favicon := parseHtml(resp.Body); favicon != "" {
            if strings.HasPrefix(favicon, "//") {
                    favicon = handleSchemalessUrl(favicon)
            } else if !strings.HasPrefix(favicon, "http") {
                    favicon = handleRelativeUrl(favicon)
            }

            return favicon, nil
        }

        return "", errors.New("CannotFind")
    }

    fallback := func (fullUrl *url.URL) (string, error) {
        return CONFIG.Favicon.Placeholder, nil
    }

    faviconMethods := []func(*url.URL) (string, error){rootSearch, docSearch, fallback}

    for _, f := range faviconMethods {
        if favicon, err := f(fullUrl); err == nil {
            sink <- favicon

            break
        }
    }
}

type Response struct {
    Favicon string
}

func RootHandler(w http.ResponseWriter, r *http.Request) {
    if r.URL.Path == "/favicon.ico" {
        return
    }

    queryValues := r.URL.Query()

    fullTargetUrl, err := url.Parse(queryValues.Get("url"))

    if err != nil {
        return
    }

    baseTargetUrl, err := url.Parse(fullTargetUrl.Scheme + "://" + fullTargetUrl.Host)

    if err != nil {
        return
    }

    var favicon string

    sink := make(chan(string), 1)
    go FetchFavicon(baseTargetUrl, sink)

    select {
        case sink := <- sink:
            favicon = sink

        case <- time.After(GetTimeout() * time.Nanosecond):
            log.Print("Fetch Timeout, Fallback")
            favicon = CONFIG.Favicon.Placeholder
    }

    response := Response{favicon}

    jsonData, err := json.Marshal(response)

    if err != nil {
        panic(err)
    }

    fmt.Fprintf(w, string(jsonData))
}

func main() {
    log.Print("Listening on port ", CONFIG.Server.Port)

    serverAddr := fmt.Sprint(":", CONFIG.Server.Port)

    http.HandleFunc("/", RootHandler)

    log.Fatal(http.ListenAndServe(serverAddr, urlist.ServeMux()))
}
//
// END - App Server
//
