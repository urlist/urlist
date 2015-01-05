package amazon

import (
    "net/url"
    "strings"
    "fmt"
    "regexp"
    "time"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
    "encoding/xml"
    "encoding/json"
    "net/http"
    "io/ioutil"
)

var Regexp = regexp.MustCompile(`amazon\.(.*)?[dp|gp|o|detail].*\/(\w{10})?\/.*$`)

type Config struct {
    Regions         []string
    AccessTag       string
    AccessKeyId     string
    SecretAccessKey string
}

type Amazon struct {
    Config     Config
    RequestUrl *url.URL
    RegionHost string
    Timestamp  time.Time
    ItemId     string

    EmbedData struct {
        Title string
    }
}

func (x *Amazon) GetRegionHost() string {
    host := x.RequestUrl.Host

    getRegionDomain := func() string {
        for _, region := range x.Config.Regions {
            if strings.HasSuffix(host, region) {
                return region
            }
        }

        return ""
    }

    regionDomain := getRegionDomain()

    if regionDomain == "" {
        return ""
    }

    fullDomain := fmt.Sprint("webservices.amazon.", regionDomain)

    return fullDomain
}


/* http://www.amazon.com/exec/obidos/tg/detail/-/ASIN-VALUE-HERE */
/* http://www.amazon.com/gp/product/ASIN-VALUE-HERE */
/* http://www.amazon.com/o/ASIN/ASIN-VALUE-HERE */
/* http://www.amazon.com/dp/ASIN-VALUE-HERE */
/* http://www.amazon.com/dp/product/ASIN-VALUE-HERE */
/* http://www.amazon.com/<ProductName>/dp/ASIN-VALUE-HERE */
func (x *Amazon) GetItemId() string {
    if x.ItemId != "" {
        return x.ItemId
    }

    path := x.RequestUrl.Path

    findItemId := func() string {
        matches := Regexp.FindSubmatch([]byte(path))

        if len(matches) < 2 {
            return ""
        }

        return string(matches[1])

    }

    return findItemId()
}

func (x *Amazon) Sign(body string) string {
    secret := x.Config.SecretAccessKey

    getHmac := func() []byte {
        h := hmac.New(sha256.New, []byte(secret))
        h.Write([]byte(body))

        return h.Sum(nil)
    }

    getBase64 := func(in []byte) string {
        enc := base64.StdEncoding
        return enc.EncodeToString(in)
    }

    byteSignature := getHmac()

    return string(getBase64(byteSignature))
}

func (x *Amazon) GetTimestamp() string {
    return x.Timestamp.UTC().Format(time.RFC3339)
}

/*
http://webservices.amazon.com/onca/xml?AWSAccessKeyId=AKIAIJOINKG2MBB7DN7Q&AssociateTag=4335-4904-1486&Condition=All&IdType=ASIN&ItemId=0307971430&Operation=ItemLookup&ResponseGroup=Images%2CItemAttributes%2COffers&Service=AWSECommerceService&Timestamp=2013-05-02T15%3A49%3A45.000Z&Version=2011-08-01&Signature=B4mofOl8LyS%2Fza1Q77MNV4hAWhbzws4oRQqg4IhqSzw%3D
*/

func (x *Amazon) GetEndpointQueryString() string {
    qsValues := [][]string {[]string{"AWSAccessKeyId", x.Config.AccessKeyId},
                            []string{"AssociateTag", x.Config.AccessTag},
                            []string{"Condition", "All"},
                            []string{"IdType", "ASIN"},
                            []string{"ItemId", x.GetItemId()},
                            []string{"Operation", "ItemLookup"},
                            []string{"ResponseGroup", url.QueryEscape("Images,ItemAttributes,Offers")},
                            []string{"Service", "AWSECommerceService"},
                            []string{"Timestamp", url.QueryEscape(x.GetTimestamp())},
                            []string{"Version", "2011-08-01"}}

    qsPairs := []string{}

    for _, pair := range qsValues {
        qsPairs = append(qsPairs, (strings.Join(pair, "=")))
    }

    qsStr := strings.Join(qsPairs, "&")

    return qsStr
}

func (x *Amazon) GetSignature() string {
    body := fmt.Sprintf("GET\n%s\n/onca/xml\n", x.GetRegionHost()) + x.GetEndpointQueryString()

    return x.Sign(body)
}

func (x *Amazon) GetEndpoint() *url.URL {
    signatureSafeValue := url.QueryEscape(x.GetSignature())
    signature := "Signature=" + signatureSafeValue

    fullUrl := "http://" + x.GetRegionHost() + "/onca/xml?" + x.GetEndpointQueryString() + "&" + signature

    if pUrl, err := url.Parse(fullUrl); err != nil {
        return nil
    } else {
        return pUrl
    }

    return nil
}

type ItemAttribute struct {
    Title string
    Author []string
    Brand string
    FormattedPrice string `xml:"ListPrice>FormattedPrice"`
}

type Item struct {
    DetailPageURL string `xml:"Item>DetailPageURL"`
    ItemAttributes []ItemAttribute `xml:"Item>ItemAttributes"`
    LargeImage string `xml:"Item>LargeImage>URL"`
}

type Items struct {
    Items []Item `xml:"Items"`
}

func (x *Amazon) ParseXML(body []byte) Items {
    var items Items

    if err := xml.Unmarshal(body, &items); err != nil {
        fmt.Println(err)
        return Items{}
    }

    return items
}

type AmazonResults struct {
    Title string `json:"title"`
    Author []string `json:"authors"`
    FormattedPrice string `json:"formatted_price"`
    LargeImage string `json:"large_image"`
}

func (x *Amazon) Fetch() string {
    pUrl := x.GetEndpoint()

    resp, err := http.Get(pUrl.String())

    if err != nil {
        fmt.Println(err)
        return ""
    }

    defer resp.Body.Close()

    body, err := ioutil.ReadAll(resp.Body)

    if err != nil {
        fmt.Println(err)
        return ""
    }

    items := x.ParseXML(body)

    if len(items.Items) < 1 {
        return ""
    }

    item := items.Items[0]

    if len(item.ItemAttributes) < 0 {
        return ""
    }

    attrs := item.ItemAttributes[0]

    var authors []string

    if attrs.Author != nil {
        authors = attrs.Author 
    } else {
        authors = []string{attrs.Brand}
    }

    jsonData :=  AmazonResults{attrs.Title, authors, attrs.FormattedPrice, item.LargeImage}

    if result, err  := json.Marshal(&jsonData); err == nil {
        return string(result)
    }

    return ""
}
