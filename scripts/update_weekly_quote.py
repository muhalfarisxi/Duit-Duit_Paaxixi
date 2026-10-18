#!/usr/bin/env python3
"""Quote Gen Z Duit-Duit Paaxixi; tema dari Google Trends Indonesia, quote orisinal."""
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from xml.etree import ElementTree
from zoneinfo import ZoneInfo

SOURCE = "https://trends.google.com/trending/rss?geo=ID"
OUT = Path("quote-mingguan.json")
FALLBACK = [
    "Kalau lagu Bernadya bisa di-repeat, pengeluaranmu juga wajib di-review, Alfa. 🎧",
    "Jangan cuma omon-omon soal hemat, buktiin lewat catatan, Alfa. 😎",
    "Dompet boleh lowkey, pencatatan harus highkey. 💸",
    "Yang sat-set boleh jajan, yang smart tetap catat. ✍️",
    "Budget aman adalah green flag paling nyata. 💙",
    "Self-reward sah, asal nggak bikin dompet overthinking. 🫶",
    "Bukan pelit, lagi dalam era financial glow up. ✨",
    "Saldo jangan cuma di-feeling, cek realitanya di sini. 👀",
    "Payday datang, budgeting jangan menghilang. 😎",
    "Plot twist terbaik: akhir bulan saldo masih aman. 💰",
]
# Penyebutan nama figur hanya dipilih saat nama tersebut benar-benar muncul di
# judul topik populer RSS. Kalimatnya humor orisinal, bukan kutipan sang figur.
FIGURES = {
    "Bernadya": (r"\bbernadya\b", [
        "Kalau lagu Bernadya bisa di-repeat, pengeluaranmu juga wajib di-review, Alfa. 🎧",
        "Dengerin Bernadya boleh baper, tapi jangan baper pas cek saldo ya, Alfa. 😭💸",
    ]),
    "Hindia": (r"\b(?:hindia|baskara putra)\b", [
        "Lagu Hindia boleh keras, alarm budget kamu jangan di-mute, Alfa. 🎸",
        "Hindia buat playlist, kamu buat catatan pengeluaran. Sama-sama on point. 🎶",
    ]),
    "JKT48": (r"\bjkt\s*48\b", [
        "Idola boleh JKT48, tapi angka transaksi jangan cuma jadi misteri, Alfa. 💙",
        "Oshi boleh banyak, tapi pos anggaran tetap harus jelas. ✨",
    ]),
    "NIKI": (r"\b(?:niki|nicole zefanya)\b", [
        "Dengerin NIKI boleh mellow, saldo jangan dibiarkan mellow. 🎧",
        "NIKI di playlist, catatan keuangan di checklist. Gas, Alfa. 🧾",
    ]),
    "Raisa": (r"\braisa\b", [
        "Raisa boleh bikin jatuh hati, jangan biarkan flash sale bikin jatuh saldo. 🎤",
        "Nyanyi bareng Raisa boleh, nyesel lihat saldo jangan. Catat dulu. 💸",
    ]),
    "Taylor Swift": (r"\btaylor\s+swift\b", [
        "Era boleh berganti ala Taylor Swift, kebiasaan catat uang tetap konsisten, Alfa. ✨",
        "Swifties boleh all out, budgeting tetap jangan out of sight. 💿",
    ]),
    "BLACKPINK": (r"\bblackpink\b", [
        "BLACKPINK in your area, tapi budget juga harus in your radar, Alfa. 🎀",
        "Comeback boleh ditunggu, tagihan jangan sampai tiba-tiba muncul. 💸",
    ]),
    "BTS": (r"\bbts\b", [
        "BTS boleh jadi favorit, tapi jangan bikin budget jadi plot twist. 💜",
        "ARMY boleh solid, pencatatanmu harus sama solidnya. 🧾",
    ]),
    "Bruno Mars": (r"\bbruno\s+mars\b", [
        "Bruno Mars boleh bikin joget, angka pengeluaran jangan ikut loncat nggak jelas. 🕺",
        "24K Magic boleh di playlist, uang asli tetap harus dicatat, Alfa. 💸",
    ]),
    "Sal Priadi": (r"\bsal\s+priadi\b", [
        "Kata-kata Sal Priadi boleh puitis, angka transaksi tetap harus realistis. 🎶",
        "Playlist Sal Priadi boleh mendalam, catatan keuangan jangan tenggelam. 💙",
    ]),
    "Mahalini": (r"\bmahalini\b", [
        "Lagu Mahalini boleh bikin galau, jangan sampai saldo ikut galau, Alfa. 🎶",
        "Yang mahal cuma namanya Mahalini, belanja tetap sesuai budget ya. 😌",
    ]),
    "Lyodra": (r"\blyodra\b", [
        "Nada Lyodra boleh tinggi, pengeluaran jangan sampai setinggi itu, Alfa. 🎤",
        "Vokal boleh powerful kayak Lyodra, kontrol dompet juga harus kuat. 💪",
    ]),
    "Prabowo": (r"\bprabowo\b", [
        "Prabowo lagi dibahas? Alfa jangan cuma omon-omon soal hemat—langsung catat. 💸",
        "Kalau Prabowo jadi topik, dompet Alfa tetap butuh aksi, bukan sekadar wacana. 😎",
    ]),
}

# Jangan menampilkan judul berita/tren mentah: hanya kelompokkan tema yang relevan.
THEMES = {
    "Belanja & Promo": (
        r"\b(?:promo|diskon|sale|belanja|shopping|cashback|thrifting|shopee|tokopedia)\b",
        ["Promo boleh viral, tapi checkout tetap pakai akal. 🛒",
         "Diskon itu godaan, budget itu pegangan. Stay classy, bestie. 💅",
         "Keranjang boleh rame, pengeluaran jangan silent mode. 🧾"],
    ),
    "Kuliner & Kopi": (
        r"\b(?:kuliner|makanan|food|restoran|cafe|kafe|kopi|coffee|boba|seblak|bakso)\b",
        ["FOMO makanan boleh, jangan FOMO lupa catat jajannya. 🍜",
         "Ngopi estetik, catatan keuangan juga harus estetik. ☕",
         "Jajan enak boleh, asal anggaran nggak ikut dimakan. 😋"],
    ),
    "Hiburan": (
        r"\b(?:konser|festival|album|musik|music|lagu|kpop|k-pop|film|bioskop|drakor|netflix)\b",
        ["Hiburan lagi rame? Gas nonton, tapi cek budget dulu. 🎟️",
         "Playlist boleh galau, saldo jangan ikutan. 🎧",
         "Jangan sampai tiketnya sold out, anggarannya ikut habis. 🎶"],
    ),
    "Liburan": (
        r"\b(?:libur|liburan|holiday|wisata|travel|trip|pantai|gunung|vacation)\b",
        ["Healing yes, dompet tetap harus breathing. 🏝️",
         "Rencana jalan-jalan? Budget dulu, baru jalan. 🧳",
         "Liburan boleh on, boncos jangan ikut check-in. 🌴"],
    ),
    "Olahraga": (
        r"\b(?:bola|sepak\s*bola|timnas|persib|persija|liga|ucl|badminton|basket|futsal)\b",
        ["Skor boleh naik-turun, saldo jangan tanpa pantauan. ⚽",
         "Support tim favorit, support budget sendiri juga. 🏆",
         "Match boleh panas, pencatatan tetap waras. 🥅"],
    ),
    "Teknologi & Gaming": (
        r"\b(?:game|gaming|iphone|samsung|gadget|laptop|playstation|nintendo|chatgpt|teknologi)\b",
        ["Upgrade gadget boleh, upgrade disiplin uang jangan lupa. 🎮",
         "High spec boleh, financial tracking juga harus on. 💻",
         "Main game seru, main budget jangan sampai kalah. 🕹️"],
    ),
}

def fetch_titles():
    req = Request(SOURCE, headers={"User-Agent": "Mozilla/5.0 (compatible; Paaxixi-Weekly-Quotes/1.0)"})
    with urlopen(req, timeout=15) as response:
        root = ElementTree.fromstring(response.read(1000000))
    return [(item.findtext("title") or "").strip() for item in root.findall("./channel/item")]

def main():
    now = datetime.now(ZoneInfo("Asia/Jakarta"))
    year, week, _ = now.isocalendar()
    idx = year * 53 + week
    titles = []
    try:
        titles = fetch_titles()
        print(f"Google Trends: {len(titles)} pencarian populer.")
    except Exception as exc:
        print(f"Tidak bisa membaca tren; gunakan quote cadangan: {exc}")

    # Figur yang benar-benar disebut dalam judul tren diprioritaskan.
    figure_hits = Counter()
    for title in titles:
        for figure, (pattern, _) in FIGURES.items():
            if re.search(pattern, title, re.IGNORECASE):
                figure_hits[figure] += 1

    counts = Counter()
    for title in titles:
        for theme, (pattern, _) in THEMES.items():
            if re.search(pattern, title, re.IGNORECASE):
                counts[theme] += 1
    is_trending = bool(figure_hits or counts)
    if figure_hits:
        theme = figure_hits.most_common(1)[0][0]
        quotes = FIGURES[theme][1]
    elif counts:
        theme = counts.most_common(1)[0][0]
        quotes = THEMES[theme][1]
    else:
        theme, quotes = "Gen Z & Budgeting", FALLBACK
    result = {
        "week": f"{year}-W{week:02d}",
        "updated_at": now.isoformat(timespec="seconds"),
        "theme": theme,
        "quote": quotes[idx % len(quotes)],
        "is_trending": is_trending,
        "source_url": SOURCE if is_trending else None,
        "note": "Quote orisinal; tema terinspirasi pencarian populer, bukan kutipan viral.",
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Tema: {theme}, sumber tren: {is_trending}, minggu: {result['week']}")

if __name__ == "__main__":
    main()
