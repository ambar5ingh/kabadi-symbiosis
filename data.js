/* Kabadi Symbiosis: data layer.
 * All tonnages and factors are INDICATIVE, chosen for order-of-magnitude
 * exploration, not for investment decisions. See the Method tab.
 *
 * value   : ₹ per tonne the material is worth to the receiver (avoided virgin purchase)
 * disposal: ₹ per tonne the generator avoids in disposal / ash-pond / landfill cost
 * co2     : t CO2e avoided per tonne exchanged (substitution of virgin material / fuel)
 * jobs    : informal + formal livelihoods per 1,000 t/yr handled (collection, sorting, transport)
 * kabadi  : true if this stream is typically moved by the informal aggregator network
 */
const WASTES = {
  fly_ash:        { name: "Fly ash",              color: "#8a8f98", value: 300,   disposal: 400,  co2: 0.55, jobs: 1.0, kabadi: false },
  bagasse:        { name: "Bagasse",              color: "#c9a227", value: 1800,  disposal: 0,    co2: 0.70, jobs: 1.5, kabadi: false },
  press_mud:      { name: "Press mud",            color: "#7a5230", value: 500,   disposal: 200,  co2: 0.25, jobs: 2.0, kabadi: true  },
  molasses:       { name: "Molasses",             color: "#5b3a1e", value: 9000,  disposal: 0,    co2: 0.30, jobs: 0.5, kabadi: false },
  spent_wash:     { name: "Spent wash",           color: "#4e6b3a", value: 150,   disposal: 300,  co2: 0.15, jobs: 0.5, kabadi: false },
  cotton_waste:   { name: "Cotton cutting waste", color: "#e07a9a", value: 25000, disposal: 500,  co2: 3.00, jobs: 12,  kabadi: true  },
  recovered_salt: { name: "Recovered ZLD salt",   color: "#9fc7d6", value: 2500,  disposal: 1500, co2: 0.10, jobs: 1.0, kabadi: false },
  waste_heat:     { name: "Waste heat / steam",   color: "#e4572e", value: 1200,  disposal: 0,    co2: 0.25, jobs: 0.2, kabadi: false },
  gypsum:         { name: "Gypsum (FGD / phospho)",color:"#d8d2c4", value: 600,   disposal: 400,  co2: 0.12, jobs: 0.8, kabadi: false },
  ceramic_waste:  { name: "Fired ceramic waste",  color: "#b5651d", value: 200,   disposal: 350,  co2: 0.05, jobs: 1.5, kabadi: true  },
  rice_husk:      { name: "Rice husk",            color: "#e9c46a", value: 3000,  disposal: 0,    co2: 1.00, jobs: 2.0, kabadi: true  },
  husk_ash:       { name: "Rice husk ash",        color: "#6c757d", value: 1500,  disposal: 300,  co2: 0.40, jobs: 1.0, kabadi: true  },
  steel_slag:     { name: "Steel / blast-furnace slag", color: "#495057", value: 400, disposal: 300, co2: 0.50, jobs: 0.5, kabadi: false },
  chrome_shavings:{ name: "Chrome shavings",      color: "#2a9d8f", value: 2000,  disposal: 3000, co2: 0.60, jobs: 4.0, kabadi: true  },
  pet_scrap:      { name: "PET bottle scrap",     color: "#3a86ff", value: 28000, disposal: 500,  co2: 1.50, jobs: 20,  kabadi: true  },
  used_cooking_oil:{name: "Used cooking oil",     color: "#f4a261", value: 45000, disposal: 0,    co2: 2.50, jobs: 8.0, kabadi: true  },
  marble_slurry:  { name: "Marble slurry",        color: "#cfd8dc", value: 150,   disposal: 250,  co2: 0.08, jobs: 1.2, kabadi: false },
  foundry_sand:   { name: "Spent foundry sand",   color: "#a68a64", value: 250,   disposal: 400,  co2: 0.03, jobs: 0.8, kabadi: true  },
  co2_gas:        { name: "Process CO₂",          color: "#90be6d", value: 4000,  disposal: 0,    co2: 0.90, jobs: 0.3, kabadi: false },
  food_waste:     { name: "Food / wet waste",     color: "#6a994e", value: 400,   disposal: 600,  co2: 0.50, jobs: 5.0, kabadi: true  }
};

/* Industries. out = t/yr of each stream for ONE typical unit. accepts = streams it can use as input. */
const SECTORS = {
  energy:   { name: "Energy",          color: "#e76f51" },
  heavy:    { name: "Heavy industry",  color: "#6d597a" },
  agro:     { name: "Agro-processing", color: "#2a9d8f" },
  textile:  { name: "Textiles & leather", color: "#e56b6f" },
  building: { name: "Building materials", color: "#b08968" },
  recycler: { name: "Recyclers & bio-energy", color: "#43aa8b" },
  urban:    { name: "Urban & consumer", color: "#4d908e" }
};

const INDUSTRIES = {
  thermal:       { name: "Thermal power plant", sector: "energy",  out: { fly_ash: 1500000, gypsum: 120000, waste_heat: 200000 }, accepts: ["rice_husk"] },
  biomass_power: { name: "Biomass power plant", sector: "energy",  out: { husk_ash: 4000 }, accepts: ["rice_husk", "bagasse"] },
  steel:         { name: "Steel plant",         sector: "heavy",   out: { steel_slag: 400000, waste_heat: 150000, fly_ash: 80000 }, accepts: ["husk_ash"] },
  chemical:      { name: "Chemical / fertiliser plant", sector: "heavy", out: { gypsum: 20000, waste_heat: 30000, co2_gas: 10000 }, accepts: ["recovered_salt"] },
  foundry:       { name: "Foundry",             sector: "heavy",   out: { foundry_sand: 1500, waste_heat: 500 }, accepts: [] },
  sugar:         { name: "Sugar mill",          sector: "agro",    out: { bagasse: 150000, press_mud: 15000, molasses: 20000 }, accepts: [] },
  distillery:    { name: "Distillery / ethanol",sector: "agro",    out: { spent_wash: 200000, co2_gas: 20000 }, accepts: ["molasses"] },
  rice_mill:     { name: "Rice mill",           sector: "agro",    out: { rice_husk: 6000 }, accepts: ["waste_heat"] },
  paper:         { name: "Paper mill",          sector: "heavy",   out: { fly_ash: 20000 }, accepts: ["bagasse", "cotton_waste", "waste_heat"] },
  knitwear:      { name: "Knitwear / garment units", sector: "textile", out: { cotton_waste: 120 }, accepts: [] },
  dyeing:        { name: "Dyeing & processing (ZLD)", sector: "textile", out: { recovered_salt: 800 }, accepts: ["recovered_salt", "waste_heat"] },
  spinning_rec:  { name: "Recycled-yarn spinner", sector: "textile", out: {}, accepts: ["cotton_waste"] },
  tannery:       { name: "Tannery",             sector: "textile", out: { chrome_shavings: 150 }, accepts: ["recovered_salt"] },
  leather_board: { name: "Leather-board maker", sector: "recycler", out: {}, accepts: ["chrome_shavings"] },
  cement:        { name: "Cement plant",        sector: "building", out: { waste_heat: 50000 }, accepts: ["fly_ash", "gypsum", "steel_slag", "husk_ash", "marble_slurry", "ceramic_waste"] },
  bricks:        { name: "Fly-ash brick & block makers", sector: "building", out: {}, accepts: ["fly_ash", "marble_slurry", "foundry_sand", "husk_ash", "ceramic_waste"] },
  ceramic:       { name: "Ceramic tile units",  sector: "building", out: { ceramic_waste: 3000, waste_heat: 2000 }, accepts: ["ceramic_waste", "fly_ash", "gypsum"] },
  marble:        { name: "Marble & stone processors", sector: "building", out: { marble_slurry: 2000 }, accepts: [] },
  plasterboard:  { name: "Plasterboard / POP maker", sector: "building", out: {}, accepts: ["gypsum"] },
  road:          { name: "Road & construction (PWD/NHAI)", sector: "building", out: {}, accepts: ["steel_slag", "fly_ash", "foundry_sand", "ceramic_waste"] },
  cbg:           { name: "Compressed biogas / compost (SATAT)", sector: "recycler", out: {}, accepts: ["press_mud", "spent_wash", "food_waste"] },
  rpet:          { name: "rPET fibre recycler", sector: "recycler", out: {}, accepts: ["pet_scrap"] },
  biodiesel:     { name: "Biodiesel plant (RUCO)", sector: "recycler", out: {}, accepts: ["used_cooking_oil"] },
  greenhouse:    { name: "Greenhouse / aquaculture", sector: "agro", out: {}, accepts: ["waste_heat", "co2_gas"] },
  fmcg:          { name: "FMCG & bottling",     sector: "urban",   out: { pet_scrap: 500 }, accepts: ["co2_gas"] },
  hotels:        { name: "Hotels & restaurants (city)", sector: "urban", out: { used_cooking_oil: 3000, food_waste: 20000 }, accepts: [] },
  municipal:     { name: "City households (ULB)", sector: "urban", out: { food_waste: 300000, pet_scrap: 15000 }, accepts: [] }
};

/* How each exchange works, with a precedent abroad and in India where one exists.
 * key = "waste>industry". Missing keys fall back to a generic description. */
const SYNERGIES = {
  "fly_ash>cement":      { how: "Blended as pozzolana in Portland Pozzolana Cement, replacing clinker.", abroad: "Kalundborg's Asnæs power station has sent fly ash to cement makers for decades.", india: "MoEFCC's 2021 fly ash notification makes power plants responsible for 100% utilisation." },
  "fly_ash>bricks":      { how: "Pressed with lime and gypsum into fly-ash bricks, no kiln firing needed.", abroad: "Fly-ash masonry units are standard in the US (ASTM C618 ash).", india: "Fly-ash bricks are mandated for construction within a set radius of thermal plants." },
  "fly_ash>road":        { how: "Used as embankment fill and sub-base in highways.", abroad: "Common in UK and US highway embankments.", india: "IRC guidelines allow fly ash in road embankments; NHAI projects have used it." },
  "fly_ash>ceramic":     { how: "Partial replacement of clay in tile bodies.", abroad: "Studied widely in Italy and Spain.", india: "" },
  "gypsum>cement":       { how: "Added at 3–5% as set retarder, replacing mined gypsum.", abroad: "Kalundborg: FGD gypsum from Asnæs went to Gyproc's plasterboard plant.", india: "Phosphogypsum use in cement is permitted under CPCB guidelines." },
  "gypsum>plasterboard": { how: "Purified FGD gypsum is pressed into wallboard.", abroad: "Kalundborg's best-known loop: power-plant gypsum to Gyproc wallboard.", india: "" },
  "gypsum>ceramic":      { how: "Calcined to plaster-of-Paris for sanitaryware moulds.", abroad: "", india: "Morbi sanitaryware units buy POP moulds in bulk." },
  "bagasse>paper":       { how: "Bagasse fibre replaces wood pulp in writing and newsprint paper.", abroad: "Bagasse paper is made at scale in Brazil and Thailand.", india: "TNPL in Tamil Nadu is one of the world's largest bagasse-based paper mills." },
  "bagasse>biomass_power":{how: "Burnt in high-pressure boilers for cogeneration.", abroad: "Mauritius gets a large share of its power from bagasse.", india: "Sugar-mill cogeneration is a recognised renewable category." },
  "molasses>distillery": { how: "Fermented to ethanol for blending into petrol.", abroad: "Brazil's sugar-ethanol complex.", india: "Ethanol Blended Petrol programme targets 20% blending (E20)." },
  "press_mud>cbg":       { how: "Anaerobic digestion to compressed biogas, with fermented organic manure as by-product.", abroad: "", india: "SATAT scheme buys CBG made from press mud and other bio-waste." },
  "spent_wash>cbg":      { how: "Bio-methanation of distillery effluent, then potash-rich manure.", abroad: "", india: "CPCB requires zero liquid discharge for molasses distilleries." },
  "food_waste>cbg":      { how: "Source-segregated wet waste goes to biogas or compost.", abroad: "South Korea weighs household food waste with RFID bins and recycles it.", india: "Indore's Bio-CNG plant runs on city wet waste." },
  "cotton_waste>spinning_rec": { how: "Shredded, opened and spun into recycled (shoddy) yarn for blankets and rugs.", abroad: "Prato, Italy has re-spun textile waste for over a century.", india: "Panipat is widely described as the world's largest hub for recycled textile yarn." },
  "cotton_waste>paper":  { how: "Cotton rag pulp for specialty and handmade paper.", abroad: "Banknote paper uses cotton linters.", india: "Jaipur's Sanganer handmade paper uses cotton rags." },
  "recovered_salt>dyeing": { how: "Salt recovered from reject brine is reused in reactive dyeing.", abroad: "", india: "Tiruppur's ZLD common effluent plants recover and reuse salt." },
  "recovered_salt>tannery":{how: "Used for curing raw hides.", abroad: "", india: "" },
  "recovered_salt>chemical":{how:"Feedstock for chlor-alkali after purification.", abroad: "", india: "" },
  "waste_heat>greenhouse": { how: "Low-grade heat warms greenhouses or fish ponds.", abroad: "Kalundborg's fish farm used warm cooling water from Asnæs.", india: "" },
  "waste_heat>dyeing":   { how: "Steam or hot water supplies dye baths.", abroad: "District steam in Kalundborg reaches Novo Nordisk and the refinery.", india: "" },
  "waste_heat>rice_mill":{ how: "Steam for parboiling paddy.", abroad: "", india: "" },
  "waste_heat>paper":    { how: "Process steam for paper drying.", abroad: "", india: "" },
  "steel_slag>cement":   { how: "Granulated slag (GGBS) replaces clinker in slag cement.", abroad: "Japan and the EU use almost all their blast-furnace slag.", india: "Bhilai and other SAIL plants supply slag to cement makers." },
  "steel_slag>road":     { how: "Processed steel slag as road aggregate.", abroad: "Widely used in Europe.", india: "CSIR-CRRI has built steel-slag roads, for example in Surat." },
  "husk_ash>cement":     { how: "Amorphous silica acts as a pozzolana.", abroad: "Studied in Thailand and Vietnam.", india: "" },
  "husk_ash>steel":      { how: "Used as an insulating cover on molten steel in ladles and tundishes.", abroad: "", india: "Rice husk ash is traded to Indian steel plants as ladle insulation." },
  "husk_ash>bricks":     { how: "Partial replacement of clay or fly ash.", abroad: "", india: "" },
  "rice_husk>biomass_power":{how:"Combusted directly in grate boilers.", abroad: "", india: "Husk Power Systems runs mini-grids on husk in Bihar." },
  "rice_husk>thermal":   { how: "Pelletised and co-fired with coal.", abroad: "Drax (UK) converted to biomass firing.", india: "Ministry of Power policy requires thermal plants to co-fire biomass pellets." },
  "chrome_shavings>leather_board": { how: "Pulped with binders into leather fibre board for shoe insoles.", abroad: "Common in Italy's tanning districts.", india: "" },
  "pet_scrap>rpet":      { how: "Washed, flaked and extruded into polyester staple fibre.", abroad: "EU deposit systems feed bottle-to-fibre and bottle-to-bottle plants.", india: "India recycles most of its PET bottles, mostly through the informal kabadi chain." },
  "used_cooking_oil>biodiesel": { how: "Transesterified to biodiesel.", abroad: "EU has large UCO biodiesel markets.", india: "FSSAI's RUCO (Repurpose Used Cooking Oil) initiative." },
  "marble_slurry>cement":{ how: "Calcium carbonate filler in cement.", abroad: "", india: "Rajasthan has pushed reuse of marble slurry in cement and bricks." },
  "marble_slurry>bricks":{ how: "Mixed with fly ash and cement for blocks.", abroad: "", india: "Kishangarh's slurry dumping yard is a known reuse target." },
  "ceramic_waste>ceramic":{how: "Crushed fired waste (grog) goes back into tile bodies.", abroad: "Spain's Castellón tile district recycles fired waste.", india: "" },
  "ceramic_waste>road":  { how: "Crushed as sub-base aggregate.", abroad: "", india: "" },
  "ceramic_waste>bricks":{ how: "Crushed as aggregate in blocks.", abroad: "", india: "" },
  "ceramic_waste>cement":{ how: "Ground as supplementary cementitious material.", abroad: "", india: "" },
  "foundry_sand>bricks": { how: "Fine aggregate in blocks and pavers.", abroad: "US EPA promotes beneficial use of foundry sand.", india: "" },
  "foundry_sand>road":   { how: "Embankment and sub-base fill.", abroad: "", india: "" },
  "co2_gas>fmcg":        { how: "Purified fermentation CO₂ for carbonating beverages.", abroad: "Common at breweries and ethanol plants in the US.", india: "Several Indian distilleries sell food-grade CO₂." },
  "co2_gas>greenhouse":  { how: "CO₂ enrichment raises greenhouse yields.", abroad: "Dutch greenhouses receive CO₂ from the OCAP pipeline.", india: "" }
};

/* Clusters. nodes: [industryId, count, scale]. Tonnes = INDUSTRIES.out × count × scale.
 * Counts are rounded and illustrative, meant to sketch the cluster's shape, not to census it. */
const CLUSTERS = [
  {
    id: "nanjangud", name: "Nanjangud", state: "Karnataka", tag: "Documented",
    blurb: "A small industrial area near Mysuru. Bain et al. (2010) found its firms already swap bagasse, ash and effluent informally, which makes it a rare Indian case study of self-organised symbiosis.",
    nodes: [["sugar",1,1],["distillery",1,1],["paper",1,1],["cbg",1,1],["fmcg",1,1],["rice_mill",6,1],["biomass_power",1,1],["bricks",8,1]]
  },
  {
    id: "morbi", name: "Morbi", state: "Gujarat", tag: "Ceramics",
    blurb: "Produces most of India's ceramic tiles. Broken fired tiles pile up beside highways, and the cluster's kilns throw off heat around the clock.",
    nodes: [["ceramic",600,1],["bricks",40,1],["road",1,1],["cement",1,1],["greenhouse",0,1]]
  },
  {
    id: "tiruppur", name: "Tiruppur", state: "Tamil Nadu", tag: "Knitwear",
    blurb: "India's knitwear capital. Court-ordered zero liquid discharge pushed dyeing units to recover salt, and every cutting table produces cotton offcuts.",
    nodes: [["knitwear",2500,1],["dyeing",400,1],["spinning_rec",40,1],["paper",2,1],["hotels",1,0.5],["cbg",1,1],["municipal",1,0.3]]
  },
  {
    id: "panipat", name: "Panipat", state: "Haryana", tag: "Textile recycling",
    blurb: "Imports used clothing from around the world and re-spins it into yarn. A refinery, a thermal plant and Haryana's paddy belt sit nearby.",
    nodes: [["spinning_rec",300,1],["knitwear",200,1],["thermal",1,0.6],["chemical",1,2],["rpet",20,1],["bricks",60,1],["fmcg",2,1],["rice_mill",60,1],["biomass_power",1,1],["municipal",1,0.2]]
  },
  {
    id: "ankleshwar", name: "Ankleshwar–Bharuch", state: "Gujarat", tag: "Chemicals",
    blurb: "One of Asia's largest chemical estates, with gypsum, process heat and CO₂ to spare. It's a natural candidate for a Kalundborg-style steam and by-product grid.",
    nodes: [["chemical",300,0.1],["thermal",1,0.5],["cement",1,1],["plasterboard",2,1],["dyeing",60,1],["fmcg",3,1],["road",1,1],["bricks",20,1],["greenhouse",0,1]]
  },
  {
    id: "kanpur", name: "Kanpur (Jajmau)", state: "Uttar Pradesh", tag: "Leather",
    blurb: "A dense tannery belt on the Ganga. Chrome-laden shavings are its biggest waste problem, and UP sugar mills and distilleries lie within trucking distance.",
    nodes: [["tannery",350,1],["leather_board",4,1],["sugar",3,1],["distillery",2,1],["cbg",1,1],["hotels",1,1],["municipal",1,1],["biodiesel",0,1]]
  },
  {
    id: "kishangarh", name: "Kishangarh", state: "Rajasthan", tag: "Marble",
    blurb: "Asia's biggest marble market. Cutting slurry has built a white 'dumping yard' landscape that tourists now photograph.",
    nodes: [["marble",1000,1],["bricks",30,1],["cement",2,1],["road",1,1],["ceramic",10,1]]
  },
  {
    id: "bhilai", name: "Raipur–Bhilai", state: "Chhattisgarh", tag: "Steel & rice",
    blurb: "Steel, sponge iron, coal power and cement share a district with India's 'rice bowl'. The cluster has some of the country's biggest flows of slag, ash and husk.",
    nodes: [["steel",1,3],["thermal",3,1],["rice_mill",400,1],["biomass_power",10,1],["cement",6,1],["bricks",100,1],["road",1,1],["foundry",50,1]]
  },
  {
    id: "pune", name: "Pune–Kolhapur belt", state: "Maharashtra", tag: "Sugar & city",
    blurb: "Cooperative sugar country next to a city whose waste-picker cooperative, SWaCH, is held up as a model for including informal workers.",
    nodes: [["sugar",25,1],["distillery",10,1],["cbg",5,1],["paper",2,1],["municipal",1,1],["hotels",1,1],["rpet",2,1],["biodiesel",1,1],["fmcg",3,1],["greenhouse",5,1]]
  }
];

/* Models from abroad shown on the Research tab. */
const MODELS = [
  { place: "Kalundborg, Denmark", year: "1972–", title: "The original industrial symbiosis",
    what: "A power station, refinery, pharma plant and plasterboard maker began trading steam, gypsum, fly ash, sludge and water through bilateral deals. Nobody planned it centrally.",
    lesson: "Start with two or three anchor tenants and let bilateral trades grow. India's thermal plants and sugar mills are natural anchors.",
    refs: [2, 3] },
  { place: "United Kingdom", year: "2005–2013", title: "NISP: facilitated symbiosis",
    what: "The National Industrial Symbiosis Programme ran workshops where firms listed what they had and what they needed. Facilitators then brokered thousands of trades.",
    lesson: "A neutral broker is the missing piece. India's MSME clusters, industry associations or State Pollution Control Boards could play this role.",
    refs: [4, 5] },
  { place: "Ulsan, South Korea", year: "2005–", title: "Research-and-development into business",
    what: "The government funded feasibility studies for proposed exchanges. Viable ones became commercial steam and by-product networks.",
    lesson: "Public money should de-risk feasibility studies, not run the pipes. That model fits the budgets of India's cluster-development schemes.",
    refs: [7, 8] },
  { place: "Kawasaki, Japan", year: "1997–", title: "Eco-Town: urban–industrial symbiosis",
    what: "City waste such as plastics, paper and construction debris was routed into nearby steel and cement plants as feedstock.",
    lesson: "Link city waste to industry, for example by feeding municipal RDF to cement kilns. India's Smart Cities and Swachh Bharat 2.0 provide the hook.",
    refs: [9] },
  { place: "Tianjin (TEDA), China", year: "2000s", title: "Developing-country eco-industrial park",
    what: "A large development zone used park-level policy to cluster firms and promote by-product exchange.",
    lesson: "Developing countries can design symbiosis into new parks from the start. PM Gati Shakti and the new industrial smart cities could do the same.",
    refs: [10] },
  { place: "Brazil", year: "2010–", title: "Catadores: formalised waste pickers",
    what: "The national solid waste policy gave waste-picker cooperatives contracts and legal recognition in municipal recycling.",
    lesson: "India's kabadiwalas already run a working reverse-logistics network. Formalise and pay them instead of replacing them with trucks.",
    refs: [11, 12] }
];

const REFERENCES = [
  { id: 1,  text: "Chertow, M. R. (2000). Industrial symbiosis: Literature and taxonomy. Annual Review of Energy and the Environment, 25, 313–337.", url: null },
  { id: 2,  text: "Jacobsen, N. B. (2006). Industrial symbiosis in Kalundborg, Denmark: A quantitative assessment of economic and environmental aspects. Journal of Industrial Ecology, 10(1–2), 239–255.", url: null },
  { id: 3,  text: "Chertow, M. R. (2007). \"Uncovering\" industrial symbiosis. Journal of Industrial Ecology, 11(1), 11–30.", url: null },
  { id: 4,  text: "Paquin, R. L., & Howard-Grenville, J. (2012). The evolution of facilitated industrial symbiosis. Journal of Industrial Ecology, 16(1), 83–93.", url: null },
  { id: 5,  text: "Lombardi, D. R., & Laybourn, P. (2012). Redefining industrial symbiosis: Crossing academic–practitioner boundaries. Journal of Industrial Ecology, 16(1), 28–37.", url: null },
  { id: 6,  text: "Bain, A., Shenoy, M., Ashton, W., & Chertow, M. (2010). Industrial symbiosis and waste recovery in an Indian industrial area. Resources, Conservation and Recycling, 54(12), 1278–1287.", url: null },
  { id: 7,  text: "Park, H.-S., Rene, E. R., Choi, S.-M., & Chiu, A. S. F. (2008). Strategies for sustainable development of industrial park in Ulsan, South Korea: From spontaneous evolution to systematic expansion of industrial symbiosis. Journal of Environmental Management, 87(1), 1–13.", url: null },
  { id: 8,  text: "Behera, S. K., Kim, J.-H., Lee, S.-Y., Suh, S., & Park, H.-S. (2012). Evolution of 'designed' industrial symbiosis networks in the Ulsan Eco-industrial Park: 'Research and development into business' as the enabling framework. Journal of Cleaner Production, 29–30, 103–112.", url: null },
  { id: 9,  text: "Van Berkel, R., Fujita, T., Hashimoto, S., & Fujii, M. (2009). Quantitative assessment of urban and industrial symbiosis in Kawasaki, Japan. Environmental Science & Technology, 43(5), 1271–1281.", url: null },
  { id: 10, text: "Shi, H., Chertow, M., & Song, Y. (2010). Developing country experience with eco-industrial parks: A case study of the Tianjin Economic-Technological Development Area in China. Journal of Cleaner Production, 18(3), 191–199.", url: null },
  { id: 11, text: "Gutberlet, J. (2015). Cooperative urban mining in Brazil: Collective practices in selective household waste collection and recycling. Waste Management, 45, 22–31.", url: null },
  { id: 12, text: "Wilson, D. C., Velis, C., & Cheeseman, C. (2006). Role of informal sector recycling in waste management in developing countries. Habitat International, 30(4), 797–808.", url: null },
  { id: 13, text: "Kirchherr, J., Reike, D., & Hekkert, M. (2017). Conceptualizing the circular economy: An analysis of 114 definitions. Resources, Conservation and Recycling, 127, 221–232.", url: null },
  { id: 14, text: "Ellen MacArthur Foundation (2016). Circular Economy in India: Rethinking growth for long-term prosperity.", url: "https://www.ellenmacarthurfoundation.org/circular-economy-in-india" }
];
