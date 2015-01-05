import re
import slugify as ascii_slugify


slugify = ascii_slugify.slugify

def u_slugify(txt):
        """A custom version of slugify that retains non-ascii characters. The purpose of this
        function in the application is to make URLs more readable in a browser, so there are 
        some added heuristics to retain as much of the title meaning as possible while 
        excluding characters that are troublesome to read in URLs. For example, question marks 
        will be seen in the browser URL as %3F and are thereful unreadable. Although non-ascii
        characters will also be hex-encoded in the raw URL, most browsers will display them
        as human-readable glyphs in the address bar -- those should be kept in the slug."""
        txt = txt.strip() # remove trailing whitespace
        txt = re.sub('\s*-\s*','-', txt, re.UNICODE) # remove spaces before and after dashes
        txt = re.sub('[\s/]', '-', txt, re.UNICODE) # replace remaining spaces with underscores
        txt = re.sub('(\d):(\d)', r'\1-\2', txt, re.UNICODE) # replace colons between numbers with dashes
        txt = re.sub('"', "", txt, re.UNICODE) # replace double quotes with single quotes
        txt = re.sub(r'''['.|?,:!@#~`+=$%^&\\*()\[\]{}<>]''','',txt, re.UNICODE) # remove some characters altogether
        txt = re.sub(r'(\-+)', '-', txt, re.UNICODE)
        return txt
