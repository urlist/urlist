import pymongo
import requests
import sys
import urllib

FORCE = False

db = pymongo.Connection("mongo1").urlist

make_fb_url = lambda x: "https://graph.facebook.com/{}/picture?width=200&height=200".format(x)

customized = 0
does_not_exists = 0
done = 0

FAKE_UA = """Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2"""

headers = {'User-Agent': FAKE_UA}

def proc(user_data):
    print u"{username} --- {profile_image}".format(**user_data)

    global customized, does_not_exists

    fb_id = user_data.get('facebook_id')
    fb_url = make_fb_url(fb_id)

    pi = user_data.get('profile_image')
    fb_pi = user_data.get('facebook_profile_img')

    if fb_pi == pi:
        customized += 1

    url = 'http://127.0.0.1:7250/?action=put&bucket=custom-profile-images&fileid={}.jpg&filename={}&prehook=avatar.sh'

    if not pi.find('fbcdn') == -1 or not pi.find('facebook') == -1:
        url = url.format(str(user_data.get('_id')), urllib.quote(fb_url))
        print "Facebook Profile Image --- {}".format(fb_url)
    else:
        url = url.format(str(user_data.get('_id')), pi)

    r = requests.get(url, headers=headers)

    if not r or r.status_code >= 400:
        does_not_exists += 1

        print "{} --- {}".format(url, r.status_code)

        return "http://static.urli.st/profile_images/default.png"

    return r.text


if __name__ == '__main__':
    if len(sys.argv) > 1:
        username = sys.argv[1].replace(" ", "").replace("\n", "")

        print u"=>{}<=".format(username)

        xs_gen = lambda: db.users.find({'username': username})

        if 'force' in sys.argv:
            FORCE = True
    else:
        xs_gen = lambda: db.users.find({'is_anonymous': None, 'facebook_id': None})

    for x in xs_gen():
        uid = str(x.get('_id'))

        if db.processed_profile_images.find_one({'id': uid}) and not FORCE:
            continue

        url = proc(x)

        if url and url != "":
            done += 1

            db.users.update({'_id': x.get('_id')},
                            {'$set': {'profile_image': url}})


            db.processed_profile_images.insert({'id': uid, 'profile_image': x.get('profile_image')})

            print "\turl"

        print "\n"

    print "--------------------------------------------------------\n"
    print "customized: {}\ndoes_not_exists: {}\ndone: {}".format(customized, does_not_exists, done)

    print "\ntotal: {}".format(xs_gen().count())

