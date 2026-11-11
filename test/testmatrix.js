// Testmatrix Rechenfix 27.09.2026 (fairer Vergleich, Gebuehren, EK in Stresstest/Szenarien).
// Aufruf: node test/testmatrix.js
// Rechnet den Rechenkern und ein davon unabhaengiges Referenzmodell zum Vergleich.
const path = require("path");
const K = require(path.join(__dirname, "../src/bauspar-kern.js"));

const FAELLE = [
  ["Standard", {}],
  ["ohne EK, keine Zuteilung", { vorhandenesEk: 0 }],
  ["ohne Gebuehren", { abschlussGebuehrPct: 0, kontoGebuehrJahr: 0 }],
  ["Kontogebuehr 24 EUR", { kontoGebuehrJahr: 24 }],
  ["Marktzins 3 %", { zinsMarktZukunft: 3 }],
  ["Marktzins 9 %", { zinsMarktZukunft: 9 }],
  ["zvE 35.001 (keine WoP)", { zve: 35001 }],
  ["verheiratet zvE 70.000, VL 40", { verheiratet: true, zve: 70000, vlMonatlich: 40 }],
  ["Renovierung 40.000", { vorhabenModus: "renovierung", finanzierungssumme: 40000, vorhandenesEk: 0, sparrateVorBauspardarlehen: 200, leistbareMonatsrate: 800, zielEkAnteil: 40 }],
  ["EK deckt alles", { finanzierungssumme: 50000, vorhandenesEk: 60000 }]
];

const BASIS = {
  vorhabenModus: "finanzierung", finanzierungssumme: 300000, jahrFinanzierung: new Date().getFullYear() + 7,
  vorhandenesEk: 10000, leistbareMonatsrate: 1500, verheiratet: false, zve: 35000, zielEkAnteil: 20,
  zinsBausparGuthaben: 0.10, zinsBausparDarlehen: 1.40, zinsMarktZukunft: 4.50, sparrateVorBauspardarlehen: 500,
  vlMonatlich: 0, abschlussGebuehrPct: 1.25, kontoGebuehrJahr: 0, sicherheitsReservePct: 0, sondertilgung: 0
};

function appState(eingaben) {
  return K.berechne(eingaben);
}

// ---------- Referenzmodell (unabhaengig vom App-Code) ----------
function ansparen(rate, zins, jahre, start, jahresabzug) {
  const i = zins / 100 / 12;
  let g = start;
  for (let m = 1; m <= Math.round(jahre * 12); m += 1) {
    g = g * (1 + i) + rate;
    if (m % 12 === 0) g -= jahresabzug;
  }
  return g;
}
function tilgen(teile, rate) {
  // teile: [{rest, zins}] in Tilgungsreihenfolge; Zinsen zuerst, Tilgung der Reihe nach
  let monate = 0, zinsen = 0;
  while (teile.some((t) => t.rest > 0.01) && monate < 1200) {
    monate += 1;
    let frei = rate;
    for (const t of teile) { const z = t.rest * t.zins / 1200; zinsen += z; frei -= z; }
    if (frei <= 0) return { zinsen: NaN, monate: NaN };
    for (const t of teile) { const x = Math.min(t.rest, frei); t.rest -= x; frei -= x; }
  }
  return { zinsen, monate };
}
function soll(e) {
  const sj = Math.max(0, e.jahrFinanzierung - new Date().getFullYear());
  const reno = e.vorhabenModus === "renovierung";
  const quote = reno ? e.zielEkAnteil : 40;
  const zielEk = e.finanzierungssumme * e.zielEkAnteil / 100 * (1 + (e.sicherheitsReservePct || 0) / 100);
  const ekAus = Math.max(0, zielEk - e.vorhandenesEk);
  let bss = reno ? e.finanzierungssumme : (ekAus > 0 ? Math.min(Math.max(10000, ekAus / (quote / 100)), e.finanzierungssumme) : Math.max(10000, e.finanzierungssumme * 0.4));
  // WoPG §§ 2a, 3: 10 % auf max. 700/1.400 EUR bis zvE 35.000/70.000; 5. VermBG § 13: 9 % auf max. 470 EUR bis 40.000/80.000
  const vlJahr = e.vlMonatlich * 12;
  const wop = e.zve <= (e.verheiratet ? 70000 : 35000) ? Math.min(e.sparrateVorBauspardarlehen * 12, e.verheiratet ? 1400 : 700) * 0.10 : 0;
  const an = e.zve <= (e.verheiratet ? 80000 : 40000) ? Math.min(vlJahr, 470) * 0.09 : 0;
  const foerd = (wop + an) * sj;
  const abschluss = bss * e.abschlussGebuehrPct / 100;
  const gB = ansparen(e.sparrateVorBauspardarlehen, e.zinsBausparGuthaben, sj, e.vorhandenesEk - abschluss, e.kontoGebuehrJahr) + foerd;
  const gA = ansparen(e.sparrateVorBauspardarlehen, e.zinsBausparGuthaben, sj, e.vorhandenesEk, 0);
  const fin = e.finanzierungssumme;
  const ekB = Math.min(gB, fin);
  const imBsv = Math.min(gB, bss);
  const zuteil = imBsv + 0.01 >= bss * quote / 100 && bss > 0;
  const bspD = zuteil ? Math.min(Math.max(0, bss - imBsv), Math.max(0, fin - ekB)) : 0;
  const rest = Math.max(0, fin - ekB - bspD);
  const darlA = Math.max(0, fin - Math.min(gA, fin));
  const A = tilgen([{ rest: darlA, zins: e.zinsMarktZukunft }], e.leistbareMonatsrate);
  const B = tilgen([{ rest: bspD, zins: e.zinsBausparDarlehen }, { rest, zins: e.zinsMarktZukunft }], e.leistbareMonatsrate);
  // "Nichts tun": nur das vorhandene EK wird eingesetzt, in der Sparphase wird nichts angespart.
  const darlN = Math.max(0, fin - Math.min(e.vorhandenesEk, fin));
  const N = tilgen([{ rest: darlN, zins: e.zinsMarktZukunft }], e.leistbareMonatsrate);
  return { darlN, zinsN: N.zinsen, lzN: N.monate / 12, zinsWenigerAlsNichts: N.zinsen - B.zinsen, bss, zuteil, darlA, darlB: bspD + rest, zinsA: A.zinsen, zinsB: B.zinsen, lzA: A.monate / 12, lzB: B.monate / 12, vorteil: (darlA + A.zinsen) - (bspD + rest + B.zinsen), kosten: abschluss + e.kontoGebuehrJahr * sj, foerd };
}

// ---------- Ausgabe ----------

const mitSoll = true;
const r0 = (n) => (Number.isFinite(n) ? Math.round(n) : n);
let fehler = 0;
for (const [name, abw] of FAELLE) {
  const e = { ...BASIS, ...abw };
  const s = appState(e);
  const erg = s.ergebnis;
  const zeile = {
    darlA: r0(erg.szenario_a.darlehenssumme), darlB: r0(erg.restsumme_darlehen), zuteil: erg.zuteilung_erreicht,
    zinsA: r0(erg.szenario_a.gesamt_zinsen), zinsB: r0(erg.szenario_b.gesamt_zinsen),
    lzA: +erg.szenario_a.laufzeit_jahre.toFixed(2), lzB: +erg.szenario_b.laufzeit_jahre.toFixed(2),
    ersparnisZins: r0(erg.ersparnis_zinsen), vorteil: r0(erg.vorteil_gesamt),
    stressGleicherZins: r0((s.stress.find((x) => x.markt_zins === e.zinsMarktZukunft) || {}).ersparnis),
    darlN: r0(erg.szenario_nichts && erg.szenario_nichts.darlehenssumme), zinsN: r0(erg.szenario_nichts && erg.szenario_nichts.gesamt_zinsen),
    zinsWenigerAlsNichts: r0(erg.zinsen_weniger_als_nichts),
    stressNichts: r0((s.stress.find((x) => x.markt_zins === e.zinsMarktZukunft) || {}).zinsen_nichts),
    szen0: r0(s.szenarien[0] && s.szenarien[0].ersparnis_vs_sofort),
    netto: s.nettoNutzen !== undefined ? r0(s.nettoNutzen) : undefined
  };
  console.log(`\n## ${name}\n  App:  ${JSON.stringify(zeile)}`);
  if (mitSoll) {
    const r = soll(e);
    const rr = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" ? +v.toFixed(k.startsWith("lz") ? 2 : 0) : v]));
    console.log(`  Soll: ${JSON.stringify(rr)}`);
    const checks = [
      ["darlA", zeile.darlA, rr.darlA], ["darlB", zeile.darlB, rr.darlB], ["zinsA", zeile.zinsA, rr.zinsA], ["zinsB", zeile.zinsB, rr.zinsB],
      ["vorteil", zeile.vorteil, rr.vorteil], ["zuteil", zeile.zuteil, rr.zuteil],
      ["darlN", zeile.darlN, rr.darlN], ["zinsN", zeile.zinsN, rr.zinsN], ["zinsWenigerAlsNichts", zeile.zinsWenigerAlsNichts, rr.zinsWenigerAlsNichts]
    ];
    if (s.stress.some((x) => x.markt_zins === e.zinsMarktZukunft)) checks.push(["stressNichts=zinsN", zeile.stressNichts, rr.zinsN]);
    if (s.stress.some((x) => x.markt_zins === e.zinsMarktZukunft)) checks.push(["stress=haupt", zeile.stressGleicherZins, zeile.vorteil]);
    checks.push(["szen0=haupt", zeile.szen0, zeile.vorteil]);
    if (zeile.netto !== undefined) checks.push(["netto=vorteil", zeile.netto, zeile.vorteil]);
    for (const [k, ist, sollW] of checks) {
      // Soll NaN = Szenario tilgt nicht vollständig: Vorteil muss dann null sein, Zinsen A sind nicht vergleichbar.
      const nichtBerechenbar = typeof sollW === "number" && Number.isNaN(sollW);
      const ok = nichtBerechenbar ? (!["vorteil", "zinsWenigerAlsNichts"].includes(k) || ist === null)
        : typeof sollW === "boolean" ? ist === sollW
        : (ist === null && sollW === null) || Math.abs(ist - sollW) <= 1;
      if (!ok) { fehler += 1; console.log(`  FEHLER ${k}: ist ${ist}, soll ${sollW}`); }
    }
  }
}
if (mitSoll) console.log(`\n${fehler === 0 ? "ALLE PRUEFUNGEN OK" : fehler + " Abweichung(en)"}`);
process.exitCode = fehler ? 1 : 0;
