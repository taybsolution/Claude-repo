# Shiraz Beauty Studio — Stratégie Marketing & Sales

Proposition complète pour la cliente **Shiraz Beauty Studio** (clinique de maquillage permanent, Rabat, 5,0 ★ / 155 avis Google). Objectif : **20 nouvelles clientes par mois minimum**, de façon prévisible.

| Fichier | Ce que c'est |
|---|---|
| `strategie-marketing-shiraz-beauty-studio.pdf` | **Le livrable** : proposition de 26 pages, prête à envoyer à la cliente |
| `strategie-marketing.html` | Source du document (HTML + CSS, pages A4 fixes) |
| `fiche-google-shiraz.jpg` | Capture de la fiche Google utilisée dans le diagnostic |
| `render.js` | Script Playwright qui régénère le PDF et vérifie qu'aucune page ne déborde |

## Contenu du document

1. Résumé exécutif (objectif, approche Attirer / Convertir / Fidéliser, chiffres-clés)
2. Diagnostic : forces, 7 freins, marché Rabat-Salé-Témara, concurrence, SWOT
3. Objectif & tunnel : 70 leads → 28 RDV → 24 clientes, sources des leads, 4 taux pilotés
4. Cibles : 3 personas (Salma, Ghita, Nadia) + segments complémentaires
5. Positionnement & offre : promesse, preuves, menu, packs, offre d'appel, acompte
6. Acquisition : fiche Google + Google Ads + SEO, Meta Ads, contenu organique, parrainage, partenariats, micro-influence
7. Conversion : système de vente WhatsApp, script en 5 étapes, objections, relances, zéro no-show
8. Fidélisation : parcours 12 mois, valeur cliente sur 3 ans, programme « Cercle Shiraz »
9. Budget : 3 scénarios (5 000 / 8 000 / 12 000 MAD), hypothèses, outils
10. Plan 90 jours : fondations, accélération, montée en puissance, qui fait quoi, calendrier saisonnier
11. Pilotage : 10 indicateurs avec règles de décision, cadence de reporting
12. Annexes : calendrier de contenu, exemples d'annonces, scripts WhatsApp, checklist fiche Google, besoins pour démarrer

## À valider avec la cliente avant envoi

- La grille tarifaire réelle (le document utilise des fourchettes de marché estimées et un ticket moyen de 2 400 MAD).
- Le nom de l'agence sur la couverture (laissé générique) et les honoraires (hors périmètre du document).
- La capacité hebdomadaire réelle du studio (hypothèse : une artiste à temps plein).

## Régénérer le PDF

```bash
cd shiraz-beauty-studio
NODE_PATH=/opt/node22/lib/node_modules node render.js strategie-marketing.html strategie-marketing-shiraz-beauty-studio.pdf
```

Le script affiche, pour chaque page, le dépassement éventuel en pixels (doit être 0) et écrit le PDF. Ajouter `--shots` pour exporter une capture PNG de chaque page dans `pages/`.
