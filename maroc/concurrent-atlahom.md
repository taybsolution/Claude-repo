# Veille concurrent — ATLAHOM (répulsif naturel anti-fourmis)

Lien analysé : `https://www.atlahom.com/atlahom-repulsif-naturel-anti-fourmis` (lien de pub TikTok avec ses paramètres de suivi).

## Limite de cette analyse

La page elle-même n'a pas pu être ouverte depuis l'environnement de travail (le domaine est bloqué par le réseau). L'analyse repose sur :

1. **Les paramètres du lien publicitaire** : ils disent beaucoup sur la façon dont la marque achète sa pub (section 2).
2. **Ce que les moteurs de recherche indexent** sur atlahom.com et ses revendeurs (section 1).
3. **Le fonctionnement habituel des boutiques COD marocaines** : tout ce qui en découle est marqué *(hypothèse)*.

Pour compléter : m'envoyer des captures d'écran de la page (du haut jusqu'au formulaire de commande), le prix affiché et 2 ou 3 vidéos de leurs pubs. Je mets alors à jour les sections 3 et 4 avec les vrais éléments.

> Projet concurrent lancé : voir le dossier `anti-fourmis/`.

## 1. Qui est ATLAHOM

| | Ce qui est vérifié |
|---|---|
| Nom | **ATLAHOM**, lu comme « Atlas + Home » : marque marocaine d'entretien de la maison |
| Gamme | Répulsifs « 100 % naturels » en flacon de **500 ml** : anti-fourmis, anti-souris/rats (`/repulsif-naturel-souris-rats/`), anti-parasites chats et chiens à la lavande (`/repulsif-tueur-naturel-anti-parasites/`) |
| Langue | URL en français, page en **arabe** (titre indexé : « ATLAHOM - طارد طبيعي 100% للفئران (500ml) ») |
| Arguments indexés | « 100 % naturel », **livraison gratuite**, **production limitée** pour garder une formule naturelle, **quantités presque épuisées** |
| Distribution | Site propre + au moins un revendeur (allorastore.store, fiche « ATLAHOM ») |
| Structure du site | Une page par produit à la racine du domaine, pas de `/products/` : c'est une structure de **landing pages** plutôt qu'une boutique catalogue Shopify classique *(la plateforme exacte, YouCan ou autre, reste à confirmer)* |

Ce n'est pas un concurrent direct d'Exody (pas de cosmétique), mais c'est exactement le modèle qu'Exody veut appliquer : **produit naturel, marque marocaine, pub TikTok, paiement à la livraison**. C'est donc un modèle à étudier plus qu'une menace.

## 2. Ce que révèle le lien de pub

| Paramètre | Valeur | Ce que ça veut dire |
|---|---|---|
| `utm_source` / `utm_medium` | `tiktok` / `paid` | Pub payante TikTok, pas du contenu organique |
| `utm_campaign` | `Ants - Scaling winng ads CCAPs 1.0` | Campagne **anti-fourmis en phase de scaling** : ils ont d'abord testé des vidéos, puis regroupé les gagnantes dans une campagne à gros budget. « CCAPs » est un sigle interne (type de structure de campagne) |
| `utm_content` | `1.3 cleaning wife v2 … mp4_V2 cleaning vds 1.0` | La vidéo gagnante : angle **« cleaning wife »** (une femme qui fait le ménage et tombe sur les fourmis), **version 2**, numérotée **1.3** (concept 1, variante 3), rangée dans un lot « cleaning vds 1.0 » |
| `utm_id` | `1867597150175505` | Identifiant de campagne TikTok |
| `ttclid` | présent | **TikTok Pixel** installé, conversions remontées à TikTok pour optimiser |

Conclusions :

- **Méthode de test structurée** : concepts numérotés, variantes, versions. Ils testent beaucoup de vidéos, gardent les gagnantes et mettent le budget dessus.
- **Angle gagnant = la scène du quotidien**, pas le produit. La vidéo montre une femme au foyer en plein ménage : la cible (celle qui achète) se reconnaît dans les 3 premières secondes.
- **Saisonnalité** : les fourmis sont un problème d'été et d'automne chaud. Une campagne de scaling fin septembre montre que l'angle marche encore bien.
- **Une campagne par problème** (« Ants », et sans doute « Rats », « Pets ») : chaque produit a son propre budget et ses propres créas.

## 3. Le tunnel de vente probable *(hypothèses à confirmer avec les captures)*

1. Vidéo TikTok UGC en darija, format problème → solution.
2. Landing page en arabe, une seule page, longue : photo du flacon, « 100 % طبيعي », avant/après, bénéfices (sans poison, sans danger pour enfants et animaux), avis clients en captures WhatsApp.
3. Urgence : « quantités presque épuisées », « production limitée ».
4. Offres par quantité (1 flacon / 2 flacons / 3 flacons) avec **livraison gratuite**.
5. Formulaire court directement sur la page : nom, téléphone, ville. **Paiement à la livraison**.
6. Confirmation par téléphone ou WhatsApp avant expédition.

## 4. Forces et faiblesses

| Forces | Faiblesses |
|---|---|
| Problème urgent et visible (les fourmis dans la cuisine) : achat impulsif | Promesse « 100 % naturel » + « tueur » difficile à prouver ; un pesticide doit normalement être homologué (ONSSA), risque réglementaire |
| Pub TikTok industrialisée (tests, versions, scaling) | Achat ponctuel : peu de rachat, il faut racheter un client à chaque vente |
| Une marque ombrelle déclinable sur plusieurs nuisibles | Urgence permanente (« presque épuisé ») : perd en crédibilité à force |
| Livraison gratuite = zéro friction au moment du formulaire | Pas de contenu de marque indexé (pas de blog, pas d'avis visibles hors site) : marque fragile si la pub s'arrête |
| Nom court, facile à retenir, ancré au Maroc (Atlas) | Présence en revendeur = contrôle du prix limité |

## 5. Ce qu'Exody doit reprendre

1. **Nommer ses créas comme eux** : `concept.variante angle vN` (ex. `1.3 sueur-bureau v2`). Mettre ce nom dans `utm_content` sur chaque pub TikTok pour savoir quelle vidéo vend, pas seulement quelle campagne.
2. **Deux campagnes séparées** : une de test (5 à 10 vidéos, petit budget chacune) et une de scaling qui ne reçoit que les gagnantes.
3. **Angle « scène du quotidien »** : la femme qui sort du hammam, qui prend un taxi en plein été à Casablanca, qui enlève sa veste au bureau. Pas le pot en gros plan dans les 3 premières secondes.
4. **Formulaire court sur la page produit** (nom, téléphone, ville) en plus du panier Shopify (app Releasit ou EasySell, voir `shopify-maroc.md`). Au Maroc, c'est ce qui convertit le mieux en COD.
5. **Livraison gratuite mise en avant** : Exody l'offre dès 199 DH (Pack Trio). L'écrire en haut de page et dans chaque vidéo : « التوصيل فابور ».
6. **TikTok Pixel + Events API** dès le premier jour : sans `ttclid` remonté, TikTok ne peut pas optimiser sur les commandes.
7. **Page en arabe/darija d'abord**, français en second, comme eux.

## 6. Ce qu'Exody doit éviter

- La fausse rareté permanente (« il en reste 3 ») : pour un produit de soin qu'on rachète toutes les 6 semaines, la confiance compte plus que l'urgence.
- Les promesses qu'on ne peut pas prouver. Rester dans les règles de `reglementation-maroc.md` : « 100 % d’origine naturelle » et « sans aluminium » seulement si vrais, aucune allégation médicale.
- Dépendre d'un seul canal : Exody a l'avantage du **rachat** (un déo se renouvelle), à exploiter avec WhatsApp et Instagram en plus de TikTok.

## 7. Pour aller plus loin

- **TikTok Creative Center → Top Ads** : filtrer Maroc + catégorie Home, chercher les vidéos ATLAHOM pour voir les accroches exactes.
- **Meta Ad Library** (facebook.com/ads/library) : chercher « ATLAHOM » pour savoir s'ils diffusent aussi sur Facebook/Instagram et depuis quand (une pub active depuis longtemps = pub rentable).
- Passer une commande test : délai de confirmation, script WhatsApp, délai de livraison, emballage. C'est la meilleure veille sur leur logistique.
