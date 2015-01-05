def fix_profile_img(img):
    split_at = '_q'

    if not img.find(split_at):
        return img

    parts = img.split(split_at)

    if not len(parts) == 2:
        return img

    return ''.join([parts[0], '_o', parts[1]])

