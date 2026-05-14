"""Allowlist of legitimate personal email providers."""

ALLOWED_DOMAINS = {
    # Google
    "gmail.com", "googlemail.com",

    # Microsoft
    "outlook.com", "outlook.de", "outlook.at", "outlook.fr", "outlook.es",
    "outlook.it", "outlook.co.uk", "outlook.com.au", "outlook.jp",
    "hotmail.com", "hotmail.de", "hotmail.at", "hotmail.fr", "hotmail.es",
    "hotmail.it", "hotmail.co.uk", "hotmail.com.au", "hotmail.be",
    "live.com", "live.de", "live.at", "live.fr", "live.co.uk",
    "live.com.au", "live.be", "live.nl", "live.it",
    "msn.com",

    # Yahoo
    "yahoo.com", "yahoo.de", "yahoo.at", "yahoo.co.uk", "yahoo.fr",
    "yahoo.es", "yahoo.it", "yahoo.com.au", "yahoo.ca", "yahoo.co.jp",
    "yahoo.co.in", "yahoo.com.br", "yahoo.com.mx", "yahoo.com.ar",
    "ymail.com", "rocketmail.com",

    # Apple
    "icloud.com", "me.com", "mac.com",

    # ProtonMail / Proton
    "protonmail.com", "protonmail.ch", "proton.me", "pm.me",

    # GMX (popular in DACH)
    "gmx.de", "gmx.net", "gmx.com", "gmx.at", "gmx.ch",
    "gmx.li", "gmx.org",

    # Web.de (Germany)
    "web.de",

    # T-Online / Telekom (Germany)
    "t-online.de", "telekom.de",

    # Freenet (Germany)
    "freenet.de",

    # 1&1 (Germany)
    "1und1.de",

    # A1 / Magnet (Austria)
    "a1.net", "aon.at", "utanet.at", "chello.at", "magnet.at",

    # Drei (Austria)
    "drei.at",

    # AOL
    "aol.com", "aol.de", "aol.fr", "aol.co.uk",

    # Tutanota / Tuta
    "tutanota.com", "tutanota.de", "tutamail.com", "tuta.io", "tuta.com",

    # Fastmail
    "fastmail.com", "fastmail.fm", "fastmail.net", "fastmail.org",

    # Zoho
    "zoho.com", "zohomail.com",

    # Yandex
    "yandex.com", "yandex.ru", "yandex.de", "yandex.fr", "ya.ru",

    # Mail.ru (Russia)
    "mail.ru", "inbox.ru", "list.ru", "bk.ru",

    # Posteo (Germany, privacy-focused)
    "posteo.de", "posteo.net", "posteo.eu",

    # Mailbox.org (Germany)
    "mailbox.org",

    # Hey
    "hey.com",

    # Startmail
    "startmail.com",

    # Runbox
    "runbox.com",

    # Disroot
    "disroot.org",

    # US ISP / legacy
    "comcast.net", "verizon.net", "att.net", "sbcglobal.net",
    "bellsouth.net", "cox.net", "charter.net", "earthlink.net",
    "frontier.com", "windstream.net",

    # Orange / Wanadoo (France)
    "orange.fr", "wanadoo.fr", "laposte.net", "free.fr", "sfr.fr",
    "bbox.fr",

    # Belgium
    "skynet.be", "telenet.be", "proximus.be",

    # Netherlands
    "ziggo.nl", "xs4all.nl", "planet.nl",

    # Italy
    "libero.it", "virgilio.it", "tim.it", "tiscali.it", "alice.it",

    # Spain
    "telefonica.net",

    # UK
    "btinternet.com", "virginmedia.com", "sky.com", "ntlworld.com",
    "talktalk.net", "btopenworld.com",

    # Australia / NZ
    "bigpond.com", "bigpond.net.au", "optusnet.com.au",
    "xtra.co.nz",

    # Canada
    "shaw.ca", "rogers.com", "videotron.ca", "sympatico.ca",

    # Poland
    "wp.pl", "onet.pl", "interia.pl", "o2.pl",

    # Czech Republic
    "seznam.cz", "centrum.cz", "email.cz",

    # Brazil
    "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br",

    # Samsung (Samsung Email app)
    "samsung.com",
}


def is_allowed_email(email: str) -> bool:
    """Returns True only if the email domain is a known legitimate provider."""
    try:
        domain = email.split("@")[1].lower().strip()
        return domain in ALLOWED_DOMAINS
    except (IndexError, AttributeError):
        return False
