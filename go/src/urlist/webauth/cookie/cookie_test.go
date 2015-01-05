package cookie

import (
    "fmt"
    "time"
    "testing"
    "crypto/hmac"
)

var secret string = "XXX"

func TestDecodeSignedValue(t *testing.T) {
    expectedValue := "706446730"

    makeSignedValue := func(timestamp string) string {
        return fmt.Sprintf("NzA2NDQ2NzMw|%s|334de90e34d9e1ffab881002dc90d2b8b2614333", timestamp)
    }

    signedValue := makeSignedValue("1371237542")
    decodedValue := DecodeSignedValue(secret, "oauth_user_id", signedValue)

    if decodedValue != expectedValue {
        t.Errorf("Expected '%v' (%v) --- Got '%v' (%v)", 
                 expectedValue, len(expectedValue),
                 decodedValue, len(decodedValue))
    }

    signedValue = makeSignedValue("1971237542")
    decodedValue = DecodeSignedValue(secret, "oauth_user_id", signedValue)

    if decodedValue != "" {
        t.Errorf("Decoding succeeded with cookie from the future!", 
                 expectedValue, len(expectedValue),
                 decodedValue, len(decodedValue))
    }

    signedValue = makeSignedValue("1171237542")
    decodedValue = DecodeSignedValue(secret, "oauth_user_id", signedValue)

    if decodedValue != "" {
        t.Errorf("Decoding succeeded with expired cookie!", 
                 expectedValue, len(expectedValue),
                 decodedValue, len(decodedValue))
    }

    signedValue = makeSignedValue("0171237542")
    decodedValue = DecodeSignedValue(secret, "oauth_user_id", signedValue)

    if decodedValue != "" {
        t.Errorf("Decoding succeeded with tampered!", 
                 expectedValue, len(expectedValue),
                 decodedValue, len(decodedValue))
    }
}

func TestCreateSignature(t *testing.T) {
    a := createSignature(secret, []byte("foo"), []byte("bar"))
    b := a

    if !hmac.Equal(a, b) {
        t.Errorf("Function return different result with the same parameters!")
    }

    c := createSignature(secret, []byte("foo"), []byte("baz"))

    if hmac.Equal(a, c) {
        t.Errorf("Function return same result with differents parameters!")
    }
}

func TestCreateSignedValue(t *testing.T) {
    var tsSeconds int64 = 1371237542
    expected := fmt.Sprintf("NzA2NDQ2NzMw|%v|334de90e34d9e1ffab881002dc90d2b8b2614333", tsSeconds)

    name := "oauth_user_id"
    rawValue := "706446730"

    ts := time.Unix(tsSeconds, 0)

    signedValue := CreateSignedValue(secret, name, rawValue, ts)

    if signedValue != expected {
        t.Errorf("Got %s (%v) --- Expected %s (%v)", signedValue, len(signedValue),
                                                     expected, len(expected))
    }
}
