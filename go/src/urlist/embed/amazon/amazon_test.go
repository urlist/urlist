package amazon

import (
    "fmt"
    "time"
    "net/url"
)

var fakeConfig Config = Config{[]string{"co.uk", "co.jp", "com", "it", "ca", "es"}, "XXX", "XXX", "XXX"}
var exampleRawUrl string = "http://www.amazon.it/The-Start-Up-You-Transform-Entrepreneurial/dp/0307971430/ref=sr_1_fkmr3_2?s=english-books&ie=UTF8&qid=1367331384&sr=1-2-fkmr3&keywords=the+startup+of+you+benshom"

func ExampleAmazon_GetRegionHost() {
    exampleUrl, err := url.Parse(exampleRawUrl)

    if err != nil {
        panic(err)
    }

    amazon := Amazon{fakeConfig, exampleUrl, "", time.Now(), "", struct{Title string}{""}}

    fmt.Println(amazon.GetRegionHost())
    // Output: webservices.amazon.it
}

func ExampleAmazon_GetItemId() {
    exampleUrl, err := url.Parse(exampleRawUrl)

    if err != nil {
        panic(err)
    }

    amazon := Amazon{fakeConfig, exampleUrl, "", time.Now(), "", struct{Title string}{""}}

    fmt.Println(amazon.GetItemId())
    // Output: 0307971430
}

func ExampleAmazon_GetEndpoint() {
    exampleUrl, err := url.Parse(exampleRawUrl)

    if err != nil {
        panic(err)
    }

    amazon := Amazon{fakeConfig, exampleUrl, "", time.Now(), "", struct{Title string}{""}}

    fmt.Println(amazon.GetEndpoint())
}

func ExampleAmazon_Sign() {
    fakeSignatureBody := "GET\n"+
"webservices.amazon.com\n"+
"/onca/xml\n"+
"AWSAccessKeyId=AKIAIJOINKG2MBB7DN7Q&AssociateTag=4335-4904-1486&Condition=All&IdType=ASIN&ItemId=0307971430&Operation=ItemLookup&ResponseGroup=Images%2CItemAttributes%2COffers&Service=AWSECommerceService&Timestamp=2013-05-02T15%3A49%3A45.000Z&Version=2011-08-01"

    exampleUrl, err := url.Parse(exampleRawUrl)

    if err != nil {
        panic(err)
    }

    amazon := Amazon{fakeConfig, exampleUrl, "", time.Now(), "", struct{Title string}{""}}

    fmt.Println(amazon.Sign(fakeSignatureBody))
    // Output: B4mofOl8LyS/za1Q77MNV4hAWhbzws4oRQqg4IhqSzw=
}

func ExampleAmazon_GetSignature() {
    exampleUrl, err := url.Parse(exampleRawUrl)

    if err != nil {
        panic(err)
    }

    amazon := Amazon{fakeConfig, exampleUrl, "", time.Now(), "", struct{Title string}{""}}

    fmt.Println(amazon.GetSignature())
    // Output: B4mofOl8LyS/za1Q77MNV4hAWhbzws4oRQqg4IhqSzw=
}
