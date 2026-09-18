# Logistique et paiement — Maroc

## Paiement

- **Paiement à la livraison (COD)** : c'est la norme, environ 3 commandes sur 4 au Maroc. Obligatoire dès le lancement.
- **Carte bancaire** : via **CMI** (cartes marocaines et internationales) ou **PayZone**. Shopify Payments n'existe pas au Maroc, il faut une passerelle tierce (voir `shopify-maroc.md`). À ajouter en deuxième temps, une fois la société et le compte bancaire pro ouverts.
- **Virement / Wafacash / CashPlus** : proposer en DM pour les clients qui préfèrent prépayer (utile pour les packs).

Le paiement à la livraison a un coût caché : les **retours** (client absent, refus du colis). Sans confirmation, 20 à 30 % des commandes peuvent revenir. Avec confirmation, on descend sous 10 %.

## La confirmation, étape la plus importante

Chaque commande, avant expédition :

1. **Dans l'heure** : message WhatsApp automatique « Merci [prénom], ta commande Exody [parfum × quantité, total] est enregistrée. Tu confirmes la livraison à [adresse, ville] ? Réponds OUI. »
2. Pas de réponse en 3 h : appel téléphonique.
3. Pas de réponse en 24 h : deuxième message. Pas de réponse en 48 h : commande annulée.
4. Vérifier le numéro (10 chiffres, commence par 06 ou 07) et la ville. Les adresses incomplètes sont la première cause de retour.
5. Confirmée → étiquette d'expédition → ramassage le jour même ou le lendemain.

Réponses enregistrées WhatsApp à préparer : confirmation, délai de livraison, « ça marche vraiment ? », « ça fond ? », changement de parfum, suivi de colis.

## Transporteurs

| Transporteur | Points forts | Tarif indicatif |
|---|---|---|
| **Ozon Express** | Livraison en 24 h dans les grandes villes, COD avec versement rapide, application et API | 20 à 45 DH selon la ville |
| **Cathedis** | Ramassage + livraison + encaissement, suivi en ligne, offres à partir de 20 DH | 20 à 50 DH |
| **Amana (Poste Maroc)** | Couvre tout le territoire, y compris les petites villes | À partir de 25 DH, retour 5 DH |
| **Sendit, Chrono Diali, Tawssil** | Alternatives, à comparer sur ta ville | 25 à 60 DH |

Commission COD : généralement **2 à 5 %** du montant encaissé, versée sous 3 à 10 jours. Commencer avec un seul transporteur (Ozon Express ou Cathedis si tu es à Casablanca ou Rabat), en ajouter un second pour les petites villes après un mois.

## Tarifs affichés au client

| Zone | Tarif | Délai |
|---|---|---|
| Casablanca, Rabat | 30 DH | 24 à 48 h |
| Autres villes | 40 DH | 48 à 72 h |
| Commande ≥ 199 DH | Offerte | |

## Colis

- Le petit pot va dans une **enveloppe à bulles** ou une petite boîte kraft, avec un mot de remerciement imprimé (« Une noisette. 30 secondes. Transpire tranquille. ») et une carte « Défi 7 jours ».
- **Été** : entre juin et septembre, ajouter un sachet de gel réfrigérant n'est pas rentable. On mise sur la formule « climat chaud » et on écrit sur la carte : « S'il est arrivé mou, 10 minutes au frigo et il reprend sa forme. Il est aussi efficace. »
- Peser le colis réel (pot 20 g + emballage ≈ 60 à 80 g) pour négocier le tarif transporteur.

## Retours et remboursements

- Défi 7 jours : remboursement par virement ou Wafacash sur simple message, sans retour du pot. Prévoir 5 % de demandes au maximum.
- Colis refusé à la livraison : le transporteur facture le retour (5 à 20 DH). À intégrer dans la marge.

## Suivi hebdomadaire (tableau à tenir)

Commandes · confirmées · expédiées · livrées · retours · taux de livraison · panier moyen · part des packs · délai moyen. Objectif au premier mois : taux de livraison ≥ 85 %, panier moyen ≥ 150 DH.
