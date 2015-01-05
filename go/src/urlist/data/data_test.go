package data

import (
    "testing"
    "net/url"
)

func TestQueryOptsFromUrl(t *testing.T) {
    tests := []struct {
        url string
        qOpts []string
        isPopular bool
    } {
        {"http://fabio.com", []string{}, false},
        {"http://fabio.com?foo=bar", []string{}, false},
        {"http://fabio.com?sort=creation_time", []string{"creation_time"}, false},
        {"http://fabio.com?sort=-creation_time", []string{"-creation_time"}, false},
        {"http://fabio.com?sort=popularity", nil, true},
    }

    for i, ts := range tests {
        u, err := url.Parse(ts.url)

        if err != nil {
           t.Errorf("%v) Cannot parse url %v", i, ts.url)
        }

        q := QueryOptsFromUrl(*u)
        qOpts := q.Sort

        if ts.isPopular != q.Popular {
            t.Errorf("%v) Popularity should be %v, got %v", i, ts.isPopular, q.Popular)
        }

        if len(qOpts) != len(ts.qOpts) {
            t.Errorf("%v) Expected %v items, got %v items", len(qOpts), len(ts.qOpts))
        }

        for y, opt := range qOpts {
            thisOpt := opt
            expectedOpt := ts.qOpts[y]

            if thisOpt != expectedOpt {
                t.Errorf("%v) Excepted '%v', Got '%v'", i + 1, expectedOpt, thisOpt)
            }
        }
    }
}
