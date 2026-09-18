# Configuration Shopify — Maroc

À faire demain ensemble. Cette liste remplace `shopify/preparation-demain.md` pour la version Maroc.

## Boutique

- [ ] Nom : **Exody**. Adresse de la boutique au Maroc, devise **MAD (DH)**, fuseau Casablanca, langue **français** (ajouter l'arabe avec l'app Translate & Adapt plus tard).
- [ ] Domaine **exody.ma** (registrar marocain agréé par l'ANRT) + exody.com si disponible.
- [ ] Thème gratuit (Sense ou Dawn). Couleurs : fond `#EDE4D3`, texte `#141414`, boutons `#1F3D2B`, accent `#C9A24D`. Polices Unbounded + Figtree.
- [ ] Importer `maroc/products-maroc.csv` (tout arrive en brouillon), ajouter les photos, activer.
- [ ] Marché : Maroc uniquement au lancement (Paramètres → Marchés). Désactiver la vente internationale.

## Paiement

- [ ] Paramètres → Paiements → **Méthodes de paiement manuelles → « Paiement à la livraison »**. Texte : « Tu paies en espèces au livreur. Un conseiller te contacte sur WhatsApp pour confirmer la commande avant l'envoi. »
- [ ] Carte bancaire plus tard : passerelle **CMI** (via un intégrateur Shopify compatible) ou **PayZone**. Prévoir les frais Shopify sur passerelle tierce (2 % en plan Basic) en plus des frais de la passerelle.
- [ ] Désactiver Shop Pay, PayPal et tout ce qui ne fonctionne pas au Maroc pour éviter les paniers abandonnés.

## Formulaire de commande COD (recommandé)

Au Maroc, le tunnel classique de Shopify (panier → checkout → compte) fait perdre des commandes. Installer une app de **formulaire de commande sur la page produit** : nom, téléphone, ville, adresse, parfum, quantité, bouton « Commander, payer à la livraison ». Apps courantes : **Releasit COD Form & Upsells**, **EasySell COD Form**. Elles ajoutent aussi l'upsell « Passe au Pack Trio, livraison offerte » au moment de la commande.

## Livraison

- [ ] Expédition → zones : « Casablanca – Rabat » 30 DH, « Autres villes » 40 DH, tarif « Offerte » dès 199 DH sur les deux zones.
- [ ] Délais affichés : 24 à 48 h / 48 à 72 h.
- [ ] Intégration transporteur : vérifier l'app ou l'API Ozon Express / Cathedis pour créer les étiquettes depuis Shopify. Sinon export CSV quotidien des commandes confirmées.

## Confirmation et WhatsApp

- [ ] Bouton **WhatsApp** flottant sur toutes les pages (app WhatsApp Chat + Abandoned Cart ou équivalent) avec le numéro WhatsApp Business.
- [ ] Message automatique de confirmation de commande par WhatsApp ou SMS (via l'app COD choisie ou une app SMS marocaine).
- [ ] Statut de commande : ajouter le tag `confirmée` à la main après la confirmation. Ne jamais expédier sans le tag.

## Pages

- [ ] Accueil : hero « Le déo naturel à l'huile de nigelle. Fabriqué au Maroc. » + « 79 DH · Livraison partout au Maroc · Paiement à la livraison ». Bloc « Comment ça marche », les 6 parfums, **le Pack Trio en avant**, FAQ, Défi 7 jours.
- [ ] La nigelle (حبة البركة) : pourquoi elle est dans un déo.
- [ ] FAQ : ajouter « Comment je paie ? », « Vous livrez à [ville] ? », « Il a fondu dans le colis ? ».
- [ ] Livraison et paiement, Défi 7 jours (remboursement par virement ou Wafacash), Conditions générales, Confidentialité, Contact, Règlement du concours.

## Apps

- [ ] Formulaire COD (Releasit ou EasySell)
- [ ] WhatsApp chat
- [ ] Judge.me (avis) — ne collecter que de vrais avis
- [ ] Meta Pixel + Conversions API (canal Facebook & Instagram), TikTok Pixel
- [ ] Translate & Adapt (arabe) en semaine 2

## Avant la mise en ligne

- [ ] Commande test COD complète : formulaire → WhatsApp → étiquette → livraison à toi-même.
- [ ] Vérifier le site sur téléphone (95 % du trafic).
- [ ] Rien ne se vend avant l'enregistrement du produit (voir `reglementation-maroc.md`). Le site peut être en ligne en mode « précommande » ou « liste d'attente » en attendant.
