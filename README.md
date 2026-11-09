# Kabadi Symbiosis

An interactive map of **industrial symbiosis** opportunities in Indian industrial clusters: one firm's waste becomes another firm's raw material. India's informal **kabadi** (scrap-dealer) network is modelled as the logistics layer.

It adapts models from abroad (Kalundborg in Denmark, NISP in the UK, Ulsan in Korea, Kawasaki in Japan, Tianjin TEDA in China, and Brazil's waste-picker cooperatives) to India. It builds on the Nanjangud case study (Bain et al., 2010).

## Features
- **Explore clusters**: Nanjangud, Morbi, Tiruppur, Panipat, Ankleshwar, Kanpur, Kishangarh, Raipur–Bhilai, Pune–Kolhapur, plus a build-your-own park. A live force-directed network shows waste exchanges.
- **Facilitation slider**: shows how a NISP-style broker raises uptake.
- **Kabadi layer**: routes informal-sector streams through an aggregator hub and counts livelihoods.
- **Missing links**: unsold waste plus one-click "attract this industry" suggestions.
- **Match my waste**: pick a stream and see who can use it, how, and precedents abroad and in India.
- **Research & Method**: 14 cited references and all factors in the open.

All numbers are indicative. See the Method tab.

## Run locally
It's a static site with no build step:
```
python3 -m http.server
```
Edit `data.js` to add clusters, industries or real data.
