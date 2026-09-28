# Pubs TikTok et page de vente — Kit barrière anti-fourmis

On reprend la **méthode** d'ATLAHOM (tester beaucoup de vidéos, garder les gagnantes, mettre le budget dessus), jamais leurs vidéos ni leurs textes. Toutes nos démonstrations sont **réelles et filmées par nous**.

## 1. Structure des campagnes

| Campagne | Rôle | Réglages |
|---|---|---|
| **FOURMIS - TEST 1.0** | Trouver les vidéos qui vendent | Objectif conversions sur le site, optimisé sur l'envoi du formulaire. 3 groupes d'annonces, 2 à 3 vidéos chacun, budget minimum TikTok par groupe (≈ 20 $ par jour, à vérifier). Maroc, 20 à 55 ans, ciblage large. 4 à 5 jours |
| **FOURMIS - SCALING 1.0** | Vendre en volume | Uniquement les vidéos sous 25 DH par formulaire. Budget augmenté de 20 à 30 % tous les 2 jours tant que le coût tient |

Budget du premier test : **3 000 à 4 000 DH**. Règles de décision : voir `prix-et-marge.md` (couper au-dessus de 40 DH par formulaire, passer en scaling en dessous de 25 DH).

## 2. Nommer les vidéos (comme ATLAHOM)

Format : `concept.variante angle vN`, par exemple `2.1 ligne-demo v1`, `1.3 cuisine-matin v2`.

- **Concept** = l'idée de la vidéo (1 à 6 ci-dessous).
- **Variante** = même idée, autre accroche ou autre personne.
- **Version** = même vidéo, montage retouché.

Lien de la page produit dans chaque pub, avec les paramètres dynamiques de TikTok (noms des macros à vérifier dans le gestionnaire de pub) :

```
?utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_content=__CID_NAME__
```

Ainsi, chaque commande Shopify indique la vidéo qui l'a apportée. Installer le **TikTok Pixel + Events API** avant la première pub (événements : vue de page, formulaire envoyé, commande).

## 3. Les 6 vidéos à tourner

Format vertical, 15 à 30 secondes, voix en darija, sous-titres en arabe. Les 2 premières secondes montrent **le problème**, pas le produit. Appel à l'action identique à la fin :

> **« كوموندي دابا، التوصيل فابور والخلاص عند الاستلام »**
> (Commande maintenant, livraison gratuite et paiement à la réception.)

### Concept 1 — La cuisine au réveil
- **Accroche** : « صبحت لقيت النمل عامر الكوزينة… وحتى فالسكر! » (Je me suis réveillée, la cuisine était pleine de fourmis… même dans le sucre !)
- **Images** : gros plan sur le pot de sucre et la file de fourmis. Elle suit la file jusqu'à la fente sous la fenêtre, pulvérise, pose la poudre. Le lendemain matin : plan de travail propre, sucre intact.
- C'est l'angle « scène du quotidien » qui marche chez ATLAHOM, tourné avec notre méthode en 3 gestes.

### Concept 2 — La ligne qu'elles ne traversent pas
- **Accroche** : « شوفو شنو كيدير النمل ملي كيوصل لهاد الخط » (Regardez ce que font les fourmis quand elles arrivent à cette ligne.)
- **Images** : plan fixe, heure visible. Un morceau de sucre, une ligne de spray. Les fourmis s'arrêtent et font demi-tour. Accéléré.
- **La vidéo la plus importante** : c'est une preuve, pas une promesse. Tournée pendant nos tests (`produit-et-fournisseurs.md`).

### Concept 3 — Sans poison, avec des enfants
- **Accroche** : « عندي ولدي صغير، ما بغيتش نرش الدوا فالدار » (J'ai un petit garçon, je ne veux pas pulvériser de poison dans la maison.)
- **Images** : une maman, un enfant qui joue par terre (sans jamais montrer l'enfant près du produit), le spray rangé en hauteur, la composition à la menthe lue à voix haute.
- Rester honnête : « بلا مواد كيميائية ديال الدوا » (sans insecticide chimique), jamais « 100 % sans danger ».

### Concept 4 — Les 3 erreurs
- **Accroche** : « كتقتل النمل اللي كتشوف؟ هادي أول غلطة » (Tu tues les fourmis que tu vois ? C'est la première erreur.)
- **Contenu** : 1. tuer celles qu'on voit ne sert à rien, il faut couper le chemin ; 2. laisser la piste odorante, elles reviennent par le même chemin ; 3. ne traiter qu'une fois, il faut renouveler 2 semaines. Puis le kit comme solution.
- Format éducatif : bonne durée de visionnage et commentaires.

### Concept 5 — Avant / 48 heures après
- **Accroche** : « قبل… و من بعد 48 ساعة » (Avant… et 48 heures après.)
- **Images** : même cadrage, même endroit, même heure, avant et après. Uniquement avec de vraies images de nos tests ou de vraies clientes (avec leur accord écrit).

### Concept 6 — Les invités arrivent ce soir
- **Accroche** : « الضياف جايين الليلة… والنمل فالكوزينة! » (Les invités arrivent ce soir… et il y a des fourmis dans la cuisine !)
- **Ton** : humour, course contre la montre, le kit sauve la soirée. Bon angle pour les périodes de fêtes et de mariages.

Pour chaque concept, tourner **2 variantes** (autre accroche ou autre personne) : 12 vidéos pour le premier test. Des créatrices de contenu UGC marocaines peuvent tourner les concepts 1, 3 et 6 (compter quelques centaines de dirhams par vidéo, à négocier).

## 4. La page de vente

Une seule page, **en arabe d'abord**, version française en second. De haut en bas :

1. **Titre** : « الحاجز اللي كيبعد النمل… بلا سم » (La barrière qui éloigne les fourmis… sans poison.) + photo du kit + « التوصيل فابور · الخلاص عند الاستلام ».
2. **Vidéo de la ligne** (concept 2) en lecture automatique, sans son.
3. **Le formulaire tout de suite** (voir ci-dessous) : on ne fait pas défiler le client pour commander.
4. **La méthode en 3 gestes** en 3 images.
5. **Pourquoi un kit** : le spray repousse et efface la piste, la poudre bloque le passage.
6. **Composition** : menthe, clou de girofle, citronnelle, vinaigre, terre de diatomée. Précautions d'emploi.
7. **Avis de vrais clients** uniquement (captures WhatsApp avec accord). Au lancement, pas d'avis : mettre les vidéos de nos tests à la place. Jamais d'avis inventés.
8. **FAQ** : « Est-ce que ça tue le nid ? » (Non, ça les éloigne et ça bloque le passage ; renouveler pendant 2 semaines), « Dangereux pour les enfants et les chats ? » (Sans insecticide chimique, mais à ranger hors de portée comme tout produit ménager), « Combien de temps dure un flacon ? », « Délai de livraison ? ».
9. **Rappel du formulaire** en bas de page.

**Formulaire COD** (app Releasit ou EasySell, comme prévu pour Exody dans `maroc/shopify-maroc.md`) : الاسم (nom), رقم الهاتف (téléphone), المدينة (ville), العنوان (adresse), choix de l'offre (Cuisine / Duo / Maison, Duo présélectionné). Bouton : **« أطلب الآن – الخلاص عند الاستلام »** (Commander – paiement à la réception).

**Pas de fausse urgence** (« il reste 3 flacons », compte à rebours qui repart à zéro). Une vraie raison d'acheter maintenant suffit : « الموسم ديال النمل بدا » (la saison des fourmis a commencé).

## 5. Confirmation WhatsApp

Même processus que pour Exody (`maroc/logistique-et-paiement.md`). Message type :

> « السلام [الاسم]، شكرا على الطلب ديالك: [العرض]، [الثمن] درهم، التوصيل فابور. واش نأكدو التوصيل ل [العنوان، المدينة]؟ جاوبنا ب "نعم" »
> (Bonjour [prénom], merci pour ta commande : [offre], [prix] DH, livraison gratuite. On confirme la livraison à [adresse, ville] ? Réponds « oui ».)

Réponses enregistrées à préparer : « Ça tue le nid ? », « C'est dangereux pour mon chat ? », « Quand est-ce que je reçois ? », « Je peux changer d'offre ? ».

À la livraison, envoyer la **vidéo tutoriel** de la méthode : un client qui applique bien la méthode obtient le résultat, rachète l'été suivant et laisse un avis.
