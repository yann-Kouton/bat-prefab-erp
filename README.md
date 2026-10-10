# BAT & PREFAB – ERP (Phases 1 à 3)

Application React Native (Expo SDK 54, Expo Router) : **authentification et rôles, clients/prospects, devis avec PDF, projets (photos, journal de chantier, budget vs dépenses), fournisseurs, bons de commande, stock, factures et paiements**.
Firestore pour les données, Cloudinary pour les images, Vercel pour le web et les fonctions serveur (`/api`).

> Expo Go (App Store / Play Store) est en **SDK 54**. Le projet est volontairement en SDK 54 pour s'y ouvrir directement.

## 1. Installation

```bash
npm install
cp .env.example .env.local      # puis remplir les valeurs (voir plus bas)
npx expo start
```
Scannez le QR code avec Expo Go (Android) ou l'appareil photo (iOS). `w` ouvre la version web.

## 2. Firebase

1. Console Firebase → créer un projet → **Authentication** → activer *Email/Mot de passe*.
2. **Firestore Database** → créer la base (mode production).
3. Onglet **Règles** → coller le contenu de `firestore.rules` → Publier.
4. Paramètres du projet → *Vos applications* → ajouter une app **Web** → copier la config dans `.env.local` (`EXPO_PUBLIC_FIREBASE_*`).
5. Paramètres → *Comptes de service* → **Générer une clé privée** : le JSON complet (sur une seule ligne) va dans `FIREBASE_SERVICE_ACCOUNT` (serveur uniquement).

### Créer le premier administrateur (une seule fois, à la main)
1. Authentication → *Ajouter un utilisateur* (email + mot de passe). Copier son **UID**.
2. Firestore → collection `users` → document dont l'ID est cet **UID** :

| champ | type | valeur |
|---|---|---|
| email | string | l'email |
| displayName | string | Nom Prénom |
| role | string | `admin` |
| country | string | `CI` |
| active | boolean | `true` |

Ensuite, l'admin crée les autres comptes depuis **Plus → Gérer les utilisateurs** (appelle `api/create-user.ts`).

## 3. Cloudinary
Renseigner `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (serveur). Les uploads sont **signés** par `api/cloudinary-sign.ts` : le secret ne se trouve jamais dans l'app. Les photos vont dans `bat-prefab/projets/<id>`.

## 4. Fonctions serveur en local (Expo Go)
Les fonctions `/api` (création d'utilisateurs, signature Cloudinary) doivent être joignables depuis le téléphone :
```bash
npm i -g vercel
vercel dev --listen 3000        # variables serveur : `vercel env pull .env.local` ou un fichier .env
```
Puis dans `.env.local` : `EXPO_PUBLIC_API_URL=http://<IP-LOCALE-DU-PC>:3000` (téléphone et PC sur le même Wi-Fi).
Sans cette URL, tout fonctionne sauf : créer des utilisateurs et envoyer des photos.

## 5. Déploiement Vercel (version web)
1. Pousser le dépôt sur GitHub → *Import Project* dans Vercel.
2. Ajouter **toutes** les variables de `.env.example` dans *Settings → Environment Variables*
   (`EXPO_PUBLIC_API_URL` = l'URL Vercel du projet).
3. `vercel.json` configure déjà le build (`expo export --platform web`) et les routes `/api`.

Pour l'application mobile installable (hors Expo Go) : `npx eas-cli build` (EAS Build).

## 6. Rôles
Rôles : `admin`, `direction`, `commercial`, `chef_chantier`, `comptable`, `magasinier`.

| Domaine | admin | direction | commercial | chef_chantier | comptable | magasinier |
|---|---|---|---|---|---|---|
| Clients | tout | tout | écriture | lecture | lecture | lecture |
| Devis | tout | tout | écriture | — | lecture | — |
| Projets | tout | écriture | écriture | écriture | lecture | lecture |
| Photos, journal de chantier | oui | oui | non | oui | non | non |
| Dépenses de chantier | tout | tout | — | écriture (pas de suppression) | tout | — |
| Stock | tout | tout | — | lecture | lecture | écriture |
| Fournisseurs, bons de commande | tout | tout (valide) | — | — | lecture | écriture (ne valide pas) |
| Factures, paiements | tout | tout | lecture | — | tout | — |
| Utilisateurs | oui | non | non | non | non | non |

Matrice dans `src/services/permissions.ts` **et** `firestore.rules` : gardez-les synchronisées.
Le rôle d'un utilisateur se change depuis **Plus → Gérer les utilisateurs** (effet immédiat).

## 6 bis. Modules ajoutés (Phases 2 et 3)
- **Journal de chantier** (`projects/{id}/dailyLogs`) : rapport quotidien (météo, effectif, travaux, incidents).
- **Budget vs dépenses** (`projects/{id}/expenses`) : dépenses par catégorie, % du budget consommé comparé à l'avancement, alerte de dépassement.
- **Fournisseurs** et **Bons de commande** : brouillon → validé (admin/direction) → réceptionné. La réception crée les entrées de stock des lignes liées au catalogue, en transaction (impossible de réceptionner deux fois).
- **Stock** : articles, seuils d'alerte, entrées / sorties (avec chantier) / inventaire. La quantité n'est jamais éditée à la main : chaque variation est un mouvement (`stockMovements`, registre non modifiable) appliqué en transaction. Sortie refusée si le stock est insuffisant.
- **Factures et paiements** : facture créée depuis un devis accepté (acompte, situation, solde, complète) avec contrôle du reste à facturer ; encaissements partiels, statut calculé (à encaisser / en retard / payée), PDF. Une facture s'annule, elle ne se supprime pas ; un devis facturé est figé.
- **Tableau de bord** : reste à encaisser, retards, articles en stock bas.

## 7. Structure
```
api/                    Vercel Functions (create-user, cloudinary-sign)
src/app/                Écrans (Expo Router) : login, (tabs), clients, quotes, projects, invoices, stock, purchases, suppliers, users
src/features/           Formulaires et logique métier (devis, factures, PDF, photos, journal, dépenses…)
src/components/         UI réutilisable (ui.tsx, ClientPicker, Logo)
src/lib/                firebase, cloudinary, formats FCFA, constantes
src/services/           Hooks Firestore temps réel, numérotation, permissions, transactions stock (stock.ts) et facturation (billing.ts)
```

## 8. À personnaliser
- `src/theme.ts` : couleurs et typographie, issues du logo (bleu `#0F75F3` et jaune `#F8B608`). Les surfaces bleues utilisent `#0B66E4`, un ton un peu plus profond, pour que le texte blanc reste lisible.
- `assets/logo.png` : logo affiché dans l'app. Il vient d'un fichier de 447 px : remplacez-le par une version haute définition (même nom) pour un rendu plus net. Pour les PDF, régénérez ensuite `src/lib/logoData.ts` (image intégrée en base64).
- `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png` : icônes de l'application, générées à partir du logo.
- `src/lib/constants.ts` : coordonnées, **mentions légales (`legalLine`)**, conditions par défaut des devis, TVA par pays (à valider avec le comptable : CI/TG/BF 18 %, CM 19,25 %).
- `assets/` : icône et écran de démarrage.

## Limites connues
- Pas de mode hors-ligne : le SDK JS de Firestore n'a pas de cache persistant sur mobile.
- Les compteurs DEV/PRJ/BC/FAC sont incrémentés côté client (transaction). Les règles empêchent déjà de les remettre à zéro ou de sauter un numéro (+1 uniquement), mais une API serveur reste préférable pour la facturation.
- Le budget d'un projet est masqué dans l'écran pour les rôles sans droit, mais reste lisible dans Firestore pour tout utilisateur actif (Firestore ne filtre pas par champ). Pour le verrouiller vraiment, déplacer le budget dans une sous-collection protégée.
- La réception d'un bon de commande n'enregistre pas automatiquement une dépense sur le chantier (le magasinier n'a pas le droit d'écrire les dépenses). À faire dans une Vercel Function.
- Deux utilisateurs qui facturent le même devis exactement en même temps pourraient dépasser 100 % : le contrôle se fait côté client.
- Le fichier PDF partagé porte un nom généré ; le numéro du document figure à l'intérieur.
- Retirer une photo la supprime du projet mais pas de Cloudinary.
- Les règles Firestore n'ont pas été testées avec l'émulateur : à faire avant la mise en production (`firebase emulators:start`).

## Reste à construire
RH (employés, pointage, congés) · matériel et engins · documents/contrats (Cloudinary `authenticated`) · portail client · export comptable · notifications.
