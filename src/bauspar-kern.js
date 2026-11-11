// Rechenkern Bausparrechner: Bausparvertrag gegen reine Marktfinanzierung, mit
// Wohnungsbauprämie (WoPG), Arbeitnehmersparzulage (5. VermBG), Gebühren,
// Zinsszenarien, Stresstest und Startzeitpunkt-Vergleich.
// Derselbe Code rechnet in https://bausparrechner.lopsticles.com/ – hier ohne Oberfläche.
// Keine Finanzberatung; Zinsen sind Annahmen, keine Angebote.

const ZUTEILUNGSQUOTE = 40.0;
const STAND_ZINSEN = "September 2026";
const STAND_FOERDERUNG = "2026 (WoPG / 5. VermBG)";
const QUELLEN = "Bundesbank MFI-Zinsstatistik, EZB-Leitzinsarchiv, Branchendurchschnitte Bausparkassen";
const ZINSEN_HISTORISCH = {
  2000: { baufinanzierung: 6.21, bauspar_guthaben: 3.00, bauspar_darlehen: 4.75, leitzins: 4.75 },
  2001: { baufinanzierung: 5.73, bauspar_guthaben: 3.00, bauspar_darlehen: 4.75, leitzins: 3.25 },
  2002: { baufinanzierung: 5.65, bauspar_guthaben: 3.00, bauspar_darlehen: 4.75, leitzins: 2.75 },
  2003: { baufinanzierung: 5.07, bauspar_guthaben: 2.75, bauspar_darlehen: 4.50, leitzins: 2.00 },
  2004: { baufinanzierung: 4.79, bauspar_guthaben: 2.50, bauspar_darlehen: 4.25, leitzins: 2.00 },
  2005: { baufinanzierung: 4.31, bauspar_guthaben: 2.25, bauspar_darlehen: 4.00, leitzins: 2.25 },
  2006: { baufinanzierung: 4.56, bauspar_guthaben: 2.25, bauspar_darlehen: 4.00, leitzins: 3.50 },
  2007: { baufinanzierung: 4.95, bauspar_guthaben: 2.50, bauspar_darlehen: 4.25, leitzins: 4.00 },
  2008: { baufinanzierung: 5.08, bauspar_guthaben: 2.50, bauspar_darlehen: 4.25, leitzins: 2.50 },
  2009: { baufinanzierung: 4.40, bauspar_guthaben: 2.00, bauspar_darlehen: 4.00, leitzins: 1.00 },
  2010: { baufinanzierung: 3.88, bauspar_guthaben: 1.75, bauspar_darlehen: 3.75, leitzins: 1.00 },
  2011: { baufinanzierung: 4.04, bauspar_guthaben: 1.75, bauspar_darlehen: 3.75, leitzins: 1.00 },
  2012: { baufinanzierung: 3.30, bauspar_guthaben: 1.50, bauspar_darlehen: 3.50, leitzins: 0.75 },
  2013: { baufinanzierung: 2.90, bauspar_guthaben: 1.25, bauspar_darlehen: 3.25, leitzins: 0.25 },
  2014: { baufinanzierung: 2.60, bauspar_guthaben: 1.00, bauspar_darlehen: 3.00, leitzins: 0.05 },
  2015: { baufinanzierung: 2.00, bauspar_guthaben: 0.75, bauspar_darlehen: 2.75, leitzins: 0.05 },
  2016: { baufinanzierung: 1.80, bauspar_guthaben: 0.50, bauspar_darlehen: 2.50, leitzins: 0.00 },
  2017: { baufinanzierung: 1.84, bauspar_guthaben: 0.25, bauspar_darlehen: 2.35, leitzins: 0.00 },
  2018: { baufinanzierung: 1.88, bauspar_guthaben: 0.25, bauspar_darlehen: 2.25, leitzins: 0.00 },
  2019: { baufinanzierung: 1.50, bauspar_guthaben: 0.10, bauspar_darlehen: 2.10, leitzins: 0.00 },
  2020: { baufinanzierung: 1.29, bauspar_guthaben: 0.10, bauspar_darlehen: 2.00, leitzins: 0.00 },
  2021: { baufinanzierung: 1.31, bauspar_guthaben: 0.10, bauspar_darlehen: 1.95, leitzins: 0.00 },
  2022: { baufinanzierung: 2.85, bauspar_guthaben: 0.25, bauspar_darlehen: 2.10, leitzins: 2.50 },
  2023: { baufinanzierung: 3.95, bauspar_guthaben: 0.50, bauspar_darlehen: 2.25, leitzins: 4.50 },
  2024: { baufinanzierung: 3.60, bauspar_guthaben: 0.75, bauspar_darlehen: 2.35, leitzins: 3.15 },
  2025: { baufinanzierung: 3.45, bauspar_guthaben: 0.75, bauspar_darlehen: 2.40, leitzins: 2.15 },
  2026: { baufinanzierung: 3.75, bauspar_guthaben: 0.75, bauspar_darlehen: 2.40, leitzins: 2.65 }
};

const $ = (id) => document.getElementById(id);
const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const euro0 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function fmtEuro(n) { return euro.format(Number.isFinite(n) ? n : 0); }
function fmtEuroKurz(n) { return euro0.format(Number.isFinite(n) ? n : 0); }
function vorteilText(v) { return v === null ? "nicht berechenbar" : fmtEuroKurz(v); }
function pct(n, digits = 2) { return `${(Number.isFinite(n) ? n : 0).toFixed(digits).replace(".", ",")} %`; }

function fmtLaufzeit(jahre) {
  if (!Number.isFinite(jahre) || jahre <= 0) return "keine Darlehenslaufzeit";
  let volleJahre = Math.floor(jahre);
  let monate = Math.round((jahre - volleJahre) * 12);
  if (monate === 12) {
    volleJahre += 1;
    monate = 0;
  }
  if (volleJahre === 0) return `${monate} Monate`;
  if (monate === 0) return `${volleJahre} Jahre`;
  return `${volleJahre} Jahre ${monate} Monate`;
}

function monatsrateFuerLaufzeit(darlehen, zinsProzent, jahre) {
  if (darlehen <= 0 || jahre <= 0) return 0;
  const i = zinsProzent / 100 / 12;
  const n = jahre * 12;
  if (Math.abs(i) < 1e-9) return darlehen / n;
  return darlehen * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
}

// abschlussgebuehr wird zu Beginn, jahresgebuehr am Ende jedes Sparjahres vom Guthaben abgezogen.
function berechneAnsparung(monatlicheSparrate, zinssatzGuthabenProzent, sparjahre, einmalzahlung = 0, abschlussgebuehr = 0, jahresgebuehr = 0) {
  const monatszins = zinssatzGuthabenProzent / 100 / 12;
  const anzahlMonate = Math.round(sparjahre * 12);
  let guthaben = Number(einmalzahlung) - abschlussgebuehr;
  let eingezahlt = Number(einmalzahlung);
  const verlauf = [];
  for (let monat = 1; monat <= anzahlMonate; monat += 1) {
    guthaben = guthaben * (1 + monatszins) + monatlicheSparrate;
    if (monat % 12 === 0) guthaben -= jahresgebuehr;
    eingezahlt += monatlicheSparrate;
    if (monat % 12 === 0) {
      verlauf.push({
        jahr: Math.floor(monat / 12),
        eingezahlt,
        guthaben,
        zinsertrag: guthaben - eingezahlt
      });
    }
  }
  return { eingezahlt, zinsertrag: guthaben - eingezahlt, guthaben_gesamt: guthaben, verlauf, anzahl_monate: anzahlMonate };
}

function sparrateFuerZielEk(zielEk, vorhandenesEk, sparjahre, zinssatzGuthabenProzent, foerderungGesamt = 0) {
  const n = Math.round(sparjahre * 12);
  if (n <= 0 || zielEk <= 0) return 0;
  const i = zinssatzGuthabenProzent / 100 / 12;
  let einmalFv;
  let faktor;
  if (Math.abs(i) < 1e-9) {
    einmalFv = vorhandenesEk;
    faktor = Number(n);
  } else {
    einmalFv = vorhandenesEk * (1 + i) ** n;
    faktor = ((1 + i) ** n - 1) / i;
  }
  if (faktor <= 0) return 0;
  return Math.max(0, (zielEk - einmalFv - foerderungGesamt) / faktor);
}

function berechneWop(jahresEinzahlung, zve, verheiratet) {
  const maxEinz = verheiratet ? 1400 : 700;
  const maxEink = verheiratet ? 70000 : 35000;
  const foerderfaehig = Math.min(jahresEinzahlung, maxEinz);
  const anspruch = zve <= maxEink;
  return { prämie_pro_jahr: anspruch ? foerderfaehig * 0.10 : 0, foerderfaehig, anspruch, einkommensgrenze: maxEink };
}

function berechneAnSparzulage(jahresVl, zve, verheiratet) {
  const maxEink = verheiratet ? 80000 : 40000;
  const foerderfaehig = Math.min(jahresVl, 470);
  const anspruch = zve <= maxEink;
  return { zulage_pro_jahr: anspruch ? foerderfaehig * 0.09 : 0, foerderfaehig, anspruch, einkommensgrenze: maxEink };
}

// Die VL sind Teil der Sparrate. Soweit auf sie Anspruch auf Arbeitnehmer-Sparzulage besteht
// (bis 470 €/Jahr), gibt es für diesen Teil keine Wohnungsbauprämie (§ 1 Satz 2 Nr. 1 WoPG).
function berechneGesamtFoerderung(monatlicheSparrate, vlAnteilMonatlich, sparjahre, zve, verheiratet) {
  const vlJahr = Math.min(Math.max(0, vlAnteilMonatlich), Math.max(0, monatlicheSparrate)) * 12;
  const anZul = berechneAnSparzulage(vlJahr, zve, verheiratet);
  const vlMitZulage = anZul.anspruch ? anZul.foerderfaehig : 0;
  const wop = berechneWop(Math.max(0, monatlicheSparrate * 12 - vlMitZulage), zve, verheiratet);
  const wopGesamt = wop.prämie_pro_jahr * sparjahre;
  const anGesamt = anZul.zulage_pro_jahr * sparjahre;
  return {
    wop_pro_jahr: wop.prämie_pro_jahr,
    wop_gesamt: wopGesamt,
    wop_anspruch: wop.anspruch,
    an_zulage_pro_jahr: anZul.zulage_pro_jahr,
    an_zulage_gesamt: anGesamt,
    an_zulage_anspruch: anZul.anspruch,
    foerderung_gesamt: wopGesamt + anGesamt,
    foerderung_pro_jahr: wop.prämie_pro_jahr + anZul.zulage_pro_jahr
  };
}

function leeresErgebnis() {
  return { monatsrate: 0, gesamt_zinsen: 0, gesamt_zahlung: 0, verlauf: [], darlehenssumme: 0, laufzeit_jahre: 0, restschuld: 0, warnung: null, vollstaendig_getilgt: true };
}

function warnErgebnis(darlehenssumme, monatsrate, warnung) {
  return { ...leeresErgebnis(), monatsrate, darlehenssumme: Math.max(0, darlehenssumme), restschuld: Math.max(0, darlehenssumme), warnung, vollstaendig_getilgt: false };
}

function berechneDarlehenMitMonatsrate(darlehenssumme, zinssatzProzent, monatsrate) {
  if (darlehenssumme <= 0) return leeresErgebnis();
  if (monatsrate <= 0) return warnErgebnis(darlehenssumme, monatsrate, "Monatsrate ist zu niedrig.");
  const monatszins = zinssatzProzent / 100 / 12;
  const ersteZinsen = darlehenssumme * monatszins;
  if (monatsrate <= ersteZinsen) return warnErgebnis(darlehenssumme, monatsrate, "Die Monatsrate deckt die monatlichen Zinsen nicht.");
  let restschuld = darlehenssumme;
  let gesamtZinsen = 0;
  const verlauf = [];
  let jahrZinsen = 0;
  let jahrTilgung = 0;
  let monat = 0;
  const maxMonate = 100 * 12;
  while (restschuld > 0.01 && monat < maxMonate) {
    monat += 1;
    const zinsAnteil = restschuld * monatszins;
    let tilgAnteil = monatsrate - zinsAnteil;
    if (tilgAnteil <= 0) return warnErgebnis(restschuld, monatsrate, "Die Monatsrate deckt die monatlichen Zinsen nicht.");
    if (tilgAnteil > restschuld) tilgAnteil = restschuld;
    restschuld -= tilgAnteil;
    gesamtZinsen += zinsAnteil;
    jahrZinsen += zinsAnteil;
    jahrTilgung += tilgAnteil;
    if (monat % 12 === 0 || restschuld <= 0.01) {
      verlauf.push({
        jahr: Math.floor((monat + 11) / 12),
        restschuld: Math.max(0, restschuld),
        zinsen_jahr: jahrZinsen,
        tilgung_jahr: jahrTilgung
      });
      jahrZinsen = 0;
      jahrTilgung = 0;
    }
  }
  const vollstaendig = restschuld <= 0.01;
  return { monatsrate, gesamt_zinsen: gesamtZinsen, gesamt_zahlung: gesamtZinsen + darlehenssumme - Math.max(0, restschuld), verlauf, darlehenssumme, laufzeit_jahre: monat / 12, restschuld: Math.max(0, restschuld), warnung: vollstaendig ? null : "Die Volltilgung wird innerhalb von 100 Jahren nicht erreicht.", vollstaendig_getilgt: vollstaendig };
}

function berechneKombinierteDarlehenMitMonatsrate(bauspardarlehen, baufiRest, zinsBausparProzent, zinsMarktProzent, monatsrate) {
  if (bauspardarlehen <= 0 && baufiRest <= 0) {
    return { ...leeresErgebnis(), teil_bauspar: leeresErgebnis(), teil_baufi: leeresErgebnis(), ratenverteilung: "Keine Darlehensrestschuld." };
  }
  if (monatsrate <= 0) {
    const warnung = "Monatsrate ist zu niedrig.";
    return { ...warnErgebnis(bauspardarlehen + baufiRest, monatsrate, warnung), teil_bauspar: warnErgebnis(bauspardarlehen, 0, warnung), teil_baufi: warnErgebnis(baufiRest, 0, warnung), ratenverteilung: "Nicht berechenbar, weil die Monatsrate zu niedrig ist." };
  }
  const iBsp = zinsBausparProzent / 100 / 12;
  const iBaufi = zinsMarktProzent / 100 / 12;
  const ersteZinsen = bauspardarlehen * iBsp + baufiRest * iBaufi;
  if (monatsrate <= ersteZinsen) {
    const warnung = "Die Monatsrate deckt die monatlichen Zinsen nicht.";
    return { ...warnErgebnis(bauspardarlehen + baufiRest, monatsrate, warnung), teil_bauspar: warnErgebnis(bauspardarlehen, 0, warnung), teil_baufi: warnErgebnis(baufiRest, 0, warnung), ratenverteilung: "Zinsen beider Darlehen wären höher als die Monatsrate." };
  }
  let restBsp = Math.max(0, bauspardarlehen);
  let restBaufi = Math.max(0, baufiRest);
  let zinsenBsp = 0;
  let zinsenBaufi = 0;
  let zahlungBsp = 0;
  let zahlungBaufi = 0;
  let laufzeitBspMonate = 0;
  let laufzeitBaufiMonate = 0;
  const verlauf = [];
  let jahrZinsen = 0;
  let jahrTilgung = 0;
  let monat = 0;
  const maxMonate = 100 * 12;
  while ((restBsp > 0.01 || restBaufi > 0.01) && monat < maxMonate) {
    monat += 1;
    const zinsBsp = restBsp * iBsp;
    const zinsBaufi = restBaufi * iBaufi;
    const zinsenMonat = zinsBsp + zinsBaufi;
    if (monatsrate <= zinsenMonat) {
      const warnung = "Die Monatsrate deckt die monatlichen Zinsen nicht.";
      return { monatsrate, gesamt_zinsen: zinsenBsp + zinsenBaufi, gesamt_zahlung: zahlungBsp + zahlungBaufi, verlauf, darlehenssumme: bauspardarlehen + baufiRest, laufzeit_jahre: monat / 12, restschuld: restBsp + restBaufi, warnung, vollstaendig_getilgt: false, teil_bauspar: warnErgebnis(restBsp, 0, warnung), teil_baufi: warnErgebnis(restBaufi, 0, warnung), ratenverteilung: "Zinsen beider Darlehen wären höher als die Monatsrate." };
    }
    zahlungBsp += zinsBsp;
    zahlungBaufi += zinsBaufi;
    zinsenBsp += zinsBsp;
    zinsenBaufi += zinsBaufi;
    jahrZinsen += zinsenMonat;
    let freieTilgung = monatsrate - zinsenMonat;
    const tilgungBsp = Math.min(restBsp, freieTilgung);
    restBsp -= tilgungBsp;
    freieTilgung -= tilgungBsp;
    zahlungBsp += tilgungBsp;
    if (restBsp > 0.01) laufzeitBspMonate = monat;
    else if (bauspardarlehen > 0 && laufzeitBspMonate === 0) laufzeitBspMonate = monat;
    const tilgungBaufi = Math.min(restBaufi, freieTilgung);
    restBaufi -= tilgungBaufi;
    zahlungBaufi += tilgungBaufi;
    if (restBaufi > 0.01) laufzeitBaufiMonate = monat;
    else if (baufiRest > 0 && laufzeitBaufiMonate === 0) laufzeitBaufiMonate = monat;
    jahrTilgung += tilgungBsp + tilgungBaufi;
    if (monat % 12 === 0 || (restBsp <= 0.01 && restBaufi <= 0.01)) {
      verlauf.push({
        jahr: Math.floor((monat + 11) / 12),
        restschuld: Math.max(0, restBsp + restBaufi),
        rest_bauspar: Math.max(0, restBsp),
        rest_baufi: Math.max(0, restBaufi),
        zinsen_jahr: jahrZinsen,
        tilgung_jahr: jahrTilgung
      });
      jahrZinsen = 0;
      jahrTilgung = 0;
    }
  }
  const vollstaendig = restBsp <= 0.01 && restBaufi <= 0.01;
  const warnung = vollstaendig ? null : "Die Volltilgung wird innerhalb von 100 Jahren nicht erreicht.";
  return {
    monatsrate,
    gesamt_zinsen: zinsenBsp + zinsenBaufi,
    gesamt_zahlung: zahlungBsp + zahlungBaufi,
    verlauf,
    darlehenssumme: bauspardarlehen + baufiRest,
    laufzeit_jahre: monat / 12,
    restschuld: Math.max(0, restBsp + restBaufi),
    warnung,
    vollstaendig_getilgt: vollstaendig,
    teil_bauspar: { ...leeresErgebnis(), monatsrate: null, gesamt_zinsen: zinsenBsp, gesamt_zahlung: zahlungBsp, darlehenssumme: bauspardarlehen, laufzeit_jahre: bauspardarlehen > 0 ? laufzeitBspMonate / 12 : 0, restschuld: Math.max(0, restBsp), warnung, vollstaendig_getilgt: restBsp <= 0.01 },
    teil_baufi: { ...leeresErgebnis(), monatsrate: null, gesamt_zinsen: zinsenBaufi, gesamt_zahlung: zahlungBaufi, darlehenssumme: baufiRest, laufzeit_jahre: baufiRest > 0 ? laufzeitBaufiMonate / 12 : 0, restschuld: Math.max(0, restBaufi), warnung, vollstaendig_getilgt: restBaufi <= 0.01 },
    ratenverteilung: "Zinsdeckung zuerst; Tilgung zuerst auf das Bauspardarlehen, danach auf das Marktzins-Darlehen."
  };
}

function berechneBauansparprogramm(p) {
  const abschlussgebuehr = p.bausparsumme * (p.abschlussgebuehr_pct || 0) / 100;
  const kontogebuehren = (p.kontogebuehr_jahr || 0) * p.sparjahre;
  const ansparung = berechneAnsparung(p.monatliche_sparrate, p.zins_bauspar_guthaben, p.sparjahre, p.einmalzahlung || 0, abschlussgebuehr, p.kontogebuehr_jahr || 0);
  // Vergleichsfall ohne Bausparvertrag: dasselbe Eigenkapital und dieselben Sparraten zum selben
  // Guthabenzins, aber ohne Förderung und ohne Gebühren. Gezählt wird so nur der Bausparvorteil.
  const ansparungOhne = berechneAnsparung(p.monatliche_sparrate, p.zins_bauspar_guthaben, p.sparjahre, p.einmalzahlung || 0);
  const eigenkapitalOhne = Math.min(Math.max(0, ansparungOhne.guthaben_gesamt), p.finanzierungssumme);
  const guthabenGesamt = ansparung.guthaben_gesamt + (p.foerderung_gesamt || 0);
  const guthabenImBsv = Math.min(guthabenGesamt, p.bausparsumme);
  const zielguthabenZuteilung = p.bausparsumme * (p.zuteilungsquote / 100);
  const zuteilungErreicht = guthabenImBsv + 0.01 >= zielguthabenZuteilung && p.bausparsumme > 0;
  const eigenkapital = Math.max(0, Math.min(guthabenGesamt, p.finanzierungssumme));
  let bauspardarlehen = 0;
  if (zuteilungErreicht) {
    bauspardarlehen = Math.max(0, p.bausparsumme - guthabenImBsv);
    bauspardarlehen = Math.min(bauspardarlehen, Math.max(0, p.finanzierungssumme - eigenkapital));
  }
  const baufiRest = Math.max(0, p.finanzierungssumme - eigenkapital - bauspardarlehen);
  const szenarioA = berechneDarlehenMitMonatsrate(p.finanzierungssumme - eigenkapitalOhne, p.zins_markt_zukunft, p.leistbare_monatsrate);
  const szenarioB = berechneKombinierteDarlehenMitMonatsrate(bauspardarlehen, baufiRest, p.zins_bauspar_darlehen, p.zins_markt_zukunft, p.leistbare_monatsrate);
  // "Nichts tun": nur das vorhandene Eigenkapital fließt ein, in der Sparphase wird nichts angespart.
  const szenarioNichts = berechneDarlehenMitMonatsrate(p.finanzierungssumme - Math.min(p.einmalzahlung || 0, p.finanzierungssumme), p.zins_markt_zukunft, p.leistbare_monatsrate);
  // Vorteil = Gesamtaufwand ohne minus mit Bausparen (Darlehen + Zinsen). Förderung und Gebühren
  // stecken darin über das kleinere bzw. größere Darlehen. Nur berechenbar, wenn beide Wege tilgen.
  const beideGetilgt = szenarioA.vollstaendig_getilgt && szenarioB.vollstaendig_getilgt;
  const vorteilGesamt = beideGetilgt
    ? (szenarioA.darlehenssumme + szenarioA.gesamt_zinsen) - (szenarioB.darlehenssumme + szenarioB.gesamt_zinsen)
    : null;
  return {
    ansparung,
    guthaben_gesamt: guthabenGesamt,
    eigene_einzahlung: ansparung.eingezahlt,
    zinsertrag_ansparung: ansparung.zinsertrag,
    foerderung_gesamt: p.foerderung_gesamt || 0,
    finanzierungssumme: p.finanzierungssumme,
    effektive_sparrate: p.monatliche_sparrate,
    bausparsumme: p.bausparsumme,
    zuteilungsquote: p.zuteilungsquote,
    zielguthaben_zuteilung: zielguthabenZuteilung,
    zuteilung_erreicht: zuteilungErreicht,
    eigenkapital,
    bauspardarlehen,
    baufi_rest: baufiRest,
    restsumme_darlehen: bauspardarlehen + baufiRest,
    leistbare_monatsrate: p.leistbare_monatsrate,
    szenario_a: szenarioA,
    szenario_b: szenarioB,
    szenario_nichts: szenarioNichts,
    // Zinsdifferenz nichts tun -> Bausparen, zerlegt in Sparen (nichts -> selbst sparen) und Bausparen (ersparnis_zinsen)
    zinsen_weniger_als_nichts: szenarioNichts.vollstaendig_getilgt && szenarioB.vollstaendig_getilgt ? szenarioNichts.gesamt_zinsen - szenarioB.gesamt_zinsen : null,
    zinsen_durch_sparen: szenarioNichts.vollstaendig_getilgt && szenarioA.vollstaendig_getilgt ? szenarioNichts.gesamt_zinsen - szenarioA.gesamt_zinsen : null,
    eigenkapital_ohne: eigenkapitalOhne,
    abschlussgebuehr,
    kontogebuehren,
    ersparnis_zinsen: szenarioA.gesamt_zinsen - szenarioB.gesamt_zinsen,
    vorteil_gesamt: vorteilGesamt,
    ersparnis_monatsrate: szenarioA.monatsrate - szenarioB.monatsrate,
    vollstaendig_gedeckt: baufiRest === 0 && bauspardarlehen === 0
  };
}

function berechneStartzeitpunktSzenarien(p) {
  const szenarien = [];
  for (const offset of p.start_offsets) {
    const verbleibendeSparjahre = Math.max(0, p.max_sparjahre - offset);
    const foerderungGesamt = p.foerderung_pro_jahr * verbleibendeSparjahre;
    if (verbleibendeSparjahre <= 0) {
      const ekDirekt = Math.min(p.einmalzahlung || 0, p.finanzierungssumme);
      const direkt = berechneDarlehenMitMonatsrate(p.finanzierungssumme - ekDirekt, p.zins_markt_zukunft, p.leistbare_monatsrate);
      szenarien.push({
        start_in_jahren: offset,
        sparjahre: 0,
        guthaben: ekDirekt,
        restsumme: p.finanzierungssumme - ekDirekt,
        bauspardarlehen: 0,
        baufi_rest: p.finanzierungssumme - ekDirekt,
        zuteilung_erreicht: false,
        monatsrate: direkt.monatsrate,
        gesamt_zinsen: direkt.gesamt_zinsen,
        laufzeit_jahre: direkt.laufzeit_jahre,
        ersparnis_vs_sofort: null
      });
      continue;
    }
    const ergebnis = berechneBauansparprogramm({
      finanzierungssumme: p.finanzierungssumme,
      monatliche_sparrate: p.monatliche_sparrate,
      sparjahre: verbleibendeSparjahre,
      zins_bauspar_guthaben: p.zins_bauspar_guthaben,
      zins_bauspar_darlehen: p.zins_bauspar_darlehen,
      zins_markt_zukunft: p.zins_markt_zukunft,
      leistbare_monatsrate: p.leistbare_monatsrate,
      bausparsumme: p.bausparsumme,
      zuteilungsquote: p.zuteilungsquote,
      einmalzahlung: p.einmalzahlung || 0,
      abschlussgebuehr_pct: p.abschlussgebuehr_pct || 0,
      kontogebuehr_jahr: p.kontogebuehr_jahr || 0,
      foerderung_gesamt: foerderungGesamt
    });
    szenarien.push({
      start_in_jahren: offset,
      sparjahre: verbleibendeSparjahre,
      guthaben: ergebnis.guthaben_gesamt,
      restsumme: ergebnis.restsumme_darlehen,
      bauspardarlehen: ergebnis.bauspardarlehen,
      baufi_rest: ergebnis.baufi_rest,
      zuteilung_erreicht: ergebnis.zuteilung_erreicht,
      monatsrate: ergebnis.szenario_b.monatsrate,
      gesamt_zinsen: ergebnis.szenario_b.gesamt_zinsen,
      laufzeit_jahre: ergebnis.szenario_b.laufzeit_jahre,
      ersparnis_vs_sofort: ergebnis.vorteil_gesamt
    });
  }
  if (szenarien.length && szenarien[0].ersparnis_vs_sofort !== null) {
    const basis = szenarien[0].ersparnis_vs_sofort;
    for (const s of szenarien) {
      s.verlust_vs_sofort = s.ersparnis_vs_sofort !== null ? basis - s.ersparnis_vs_sofort : basis;
    }
  }
  return szenarien;
}

function berechneStresstest(p) {
  return p.stress_zinsen.map((marktZins) => {
    const ergebnis = berechneBauansparprogramm({
      finanzierungssumme: p.finanzierungssumme,
      monatliche_sparrate: p.monatliche_sparrate,
      sparjahre: p.sparjahre,
      zins_bauspar_guthaben: p.zins_bauspar_guthaben,
      zins_bauspar_darlehen: p.zins_bauspar_darlehen,
      zins_markt_zukunft: marktZins,
      leistbare_monatsrate: p.leistbare_monatsrate,
      bausparsumme: p.bausparsumme,
      zuteilungsquote: p.zuteilungsquote,
      einmalzahlung: p.einmalzahlung || 0,
      abschlussgebuehr_pct: p.abschlussgebuehr_pct || 0,
      kontogebuehr_jahr: p.kontogebuehr_jahr || 0,
      foerderung_gesamt: p.foerderung_gesamt
    });
    return {
      markt_zins: marktZins,
      rate_ohne_bausparen: ergebnis.szenario_a.monatsrate,
      rate_mit_bausparen: ergebnis.szenario_b.monatsrate,
      zinsen_ohne: ergebnis.szenario_a.gesamt_zinsen,
      zinsen_nichts: ergebnis.szenario_nichts.gesamt_zinsen,
      nichts_getilgt: ergebnis.szenario_nichts.vollstaendig_getilgt,
      ohne_getilgt: ergebnis.szenario_a.vollstaendig_getilgt,
      mit_getilgt: ergebnis.szenario_b.vollstaendig_getilgt,
      zinsen_mit: ergebnis.szenario_b.gesamt_zinsen,
      laufzeit_ohne: ergebnis.szenario_a.laufzeit_jahre,
      laufzeit_mit: ergebnis.szenario_b.laufzeit_jahre,
      ersparnis: ergebnis.vorteil_gesamt
    };
  });
}


// Standardwerte der Web-App (Finanzierung in 7 Jahren)
const STANDARD = {
  vorhabenModus: "finanzierung", finanzierungssumme: 300000, jahrFinanzierung: new Date().getFullYear() + 7,
  vorhandenesEk: 10000, leistbareMonatsrate: 1500, verheiratet: false, zve: 35000, zielEkAnteil: 20,
  zinsBausparGuthaben: 0.10, zinsBausparDarlehen: 1.40, zinsMarktZukunft: 4.50, sparrateVorBauspardarlehen: 500,
  vlMonatlich: 0, abschlussGebuehrPct: 1.25, kontoGebuehrJahr: 0,
};

// Gesamtrechnung: alle Ergebnisse zu einem Eingabesatz
function berechne(e = {}) {
  e = { ...STANDARD, ...e };
  const heuteJahr = new Date().getFullYear();
  const vorhabenModus = e.vorhabenModus;
  const istRenovierung = vorhabenModus === "renovierung";
  const finanzierungssumme = (Number(e.finanzierungssumme) || 0);
  const jahrFinanzierung = (Number(e.jahrFinanzierung) || 0);
  const vorhandenesEk = (Number(e.vorhandenesEk) || 0);
  const zielEkAnteil = (Number(e.zielEkAnteil) || 0);
  const zinsBausparGuthaben = (Number(e.zinsBausparGuthaben) || 0);
  const zinsBausparDarlehen = (Number(e.zinsBausparDarlehen) || 0);
  const zinsMarktZukunft = (Number(e.zinsMarktZukunft) || 0);
  const abschlussGebuehrPct = (Number(e.abschlussGebuehrPct) || 0);
  const kontoGebuehrJahr = (Number(e.kontoGebuehrJahr) || 0);
  const sparrateVorBauspardarlehen = (Number(e.sparrateVorBauspardarlehen) || 0);
  const leistbareMonatsrate = (Number(e.leistbareMonatsrate) || 0);
  const verheiratet = !!e.verheiratet;
  const zve = (Number(e.zve) || 0);
  const vlMonatlich = (Number(e.vlMonatlich) || 0);
  const sparjahre = Math.max(0, jahrFinanzierung - heuteJahr);
  const zuteilungsquote = istRenovierung ? zielEkAnteil : ZUTEILUNGSQUOTE;
  const zielEkLabel = istRenovierung ? "Mindestguthaben bis Zuteilung" : "Ziel-Eigenkapital";
  const zielEkSub = istRenovierung ? `${zielEkAnteil} % der Bausparsumme` : `${zielEkAnteil} % von ${fmtEuroKurz(finanzierungssumme)}`;
  const zielEk = finanzierungssumme * zielEkAnteil / 100;
  const ekAusBsvZiel = Math.max(0, zielEk - vorhandenesEk);
  let bausparsumme;
  if (istRenovierung) {
    bausparsumme = finanzierungssumme;
  } else if (ekAusBsvZiel > 0 && zuteilungsquote > 0) {
    bausparsumme = Math.max(10000, ekAusBsvZiel / (zuteilungsquote / 100));
    bausparsumme = Math.min(bausparsumme, finanzierungssumme);
  } else {
    bausparsumme = Math.max(10000, finanzierungssumme * 0.4);
  }
  // Gebühren mindern das Guthaben, die Empfehlung gleicht sie aus (ohne entgangene Guthabenzinsen).
  const gebuehrenGesamt = bausparsumme * abschlussGebuehrPct / 100 + kontoGebuehrJahr * sparjahre;
  let foerderungGesamtIter = 0;
  let empfSparrate = 0;
  for (let i = 0; i < 6; i += 1) {
    empfSparrate = sparrateFuerZielEk(zielEk, vorhandenesEk, sparjahre, zinsBausparGuthaben, foerderungGesamtIter - gebuehrenGesamt);
    foerderungGesamtIter = berechneGesamtFoerderung(empfSparrate, vlMonatlich, sparjahre, zve, verheiratet).foerderung_gesamt;
  }
  const monatlicheSparrate = sparrateVorBauspardarlehen;
  const foerderung = berechneGesamtFoerderung(monatlicheSparrate, vlMonatlich, sparjahre, zve, verheiratet);
  const ergebnis = berechneBauansparprogramm({
    finanzierungssumme,
    monatliche_sparrate: monatlicheSparrate,
    sparjahre,
    zins_bauspar_guthaben: zinsBausparGuthaben,
    zins_bauspar_darlehen: zinsBausparDarlehen,
    zins_markt_zukunft: zinsMarktZukunft,
    leistbare_monatsrate: leistbareMonatsrate,
    bausparsumme,
    zuteilungsquote,
    einmalzahlung: vorhandenesEk,
    abschlussgebuehr_pct: abschlussGebuehrPct,
    kontogebuehr_jahr: kontoGebuehrJahr,
    foerderung_gesamt: foerderung.foerderung_gesamt
  });
  const stress = berechneStresstest({
    finanzierungssumme,
    monatliche_sparrate: monatlicheSparrate,
    sparjahre,
    zins_bauspar_guthaben: zinsBausparGuthaben,
    zins_bauspar_darlehen: zinsBausparDarlehen,
    leistbare_monatsrate: leistbareMonatsrate,
    foerderung_gesamt: foerderung.foerderung_gesamt,
    einmalzahlung: vorhandenesEk,
    abschlussgebuehr_pct: abschlussGebuehrPct,
    kontogebuehr_jahr: kontoGebuehrJahr,
    bausparsumme,
    zuteilungsquote,
    stress_zinsen: [3.0, 5.0, 7.0, 9.0]
  });
  const szenarien = berechneStartzeitpunktSzenarien({
    finanzierungssumme,
    monatliche_sparrate: monatlicheSparrate,
    max_sparjahre: sparjahre,
    zins_bauspar_guthaben: zinsBausparGuthaben,
    zins_bauspar_darlehen: zinsBausparDarlehen,
    zins_markt_zukunft: zinsMarktZukunft,
    leistbare_monatsrate: leistbareMonatsrate,
    foerderung_pro_jahr: foerderung.foerderung_pro_jahr,
    einmalzahlung: vorhandenesEk,
    abschlussgebuehr_pct: abschlussGebuehrPct,
    kontogebuehr_jahr: kontoGebuehrJahr,
    bausparsumme,
    zuteilungsquote,
    start_offsets: [0, 2, 5, 10]
  });
  return { heuteJahr, vorhabenModus, istRenovierung, finanzierungssumme, jahrFinanzierung, vorhandenesEk, zielEkAnteil, zielEkLabel, zielEkSub, zuteilungsquote, zinsBausparGuthaben, zinsBausparDarlehen, zinsMarktZukunft, abschlussGebuehrPct, kontoGebuehrJahr, sparrateVorBauspardarlehen, leistbareMonatsrate, verheiratet, zve, vlMonatlich, sparjahre, zielEk, ekAusBsvZiel, empfSparrate, monatlicheSparrate, foerderung, bausparsumme, ergebnis, stress, szenarien };
}

if (typeof module !== "undefined") module.exports = { STANDARD, ZINSEN_HISTORISCH, ZUTEILUNGSQUOTE, berechne, fmtLaufzeit, monatsrateFuerLaufzeit, berechneAnsparung, sparrateFuerZielEk, berechneWop, berechneAnSparzulage, berechneGesamtFoerderung, leeresErgebnis, warnErgebnis, berechneDarlehenMitMonatsrate, berechneKombinierteDarlehenMitMonatsrate, berechneBauansparprogramm, berechneStartzeitpunktSzenarien, berechneStresstest };
