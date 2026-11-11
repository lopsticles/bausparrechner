# Bausparrechner – Rechenkern

Bausparvertrag gegen reine Marktfinanzierung, mit Wohnungsbauprämie, Arbeitnehmersparzulage, Gebühren, Zinsszenarien und Stresstest.

👉 **Zum Rechner mit Oberfläche:** <https://bausparrechner.lopsticles.com/>
(kostenlos, ohne Anmeldung, rechnet komplett im Browser)

Derselbe Code rechnet auch im Online-Rechner. Hier liegt er ohne Oberfläche, damit
die Rechnung nachvollzogen und geprüft werden kann.

## Grundlagen

| Thema | Grundlage |
|---|---|
| Wohnungsbauprämie 10 % auf 700/1.400 € | §§ 2a, 3 WoPG |
| Arbeitnehmersparzulage 9 % auf 470 € | § 13 5. VermBG |
| Ansparung, Zuteilung, Tilgung Bauspar- und Bankdarlehen | Modellrechnung, monatlich |
| Historische Zinsen | Bundesbank MFI-Zinsstatistik, EZB-Leitzinsarchiv |

## Tests

```sh
node test/testmatrix.js   # Node.js >= 20, keine Abhängigkeiten
```

## Grenzen

Zinsen und Zuteilung sind Annahmen, keine Angebote einer Bausparkasse. Keine Finanzberatung.

Fehler gefunden oder neue Rechengrößen? Gern als Issue melden.

## Weitere Rechner

Pension (NRW), Rente, Krankenversicherung im Alter, Pflege, Risiko, Bausparen und
geförderte Altersvorsorge: <https://lopsticles.com/> · alle Rechenkerne: <https://github.com/lopsticles>

## Lizenz

MIT – siehe [LICENSE](LICENSE).
