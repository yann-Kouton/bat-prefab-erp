# BAT & PREFAB – ERP (Phase 1)

Application React Native (Expo SDK 54, Expo Router) : **authentification et rôles, clients/prospects, devis avec PDF, projets avec photos de chantier**.
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
| Rôle | Clients | Devis | Projets | Photos | Utilisateurs |
|---|---|---|---|---|---|
| admin | tout | tout | tout | oui | oui |
| direction | tout | tout | écriture | oui | non |
| commercial | écriture | écriture | écriture | non | non |
| chef_chantier | lecture | — | écriture | oui | non |
| comptable | lecture | lecture | lecture | non | non |

Matrice dans `src/services/permissions.ts` **et** `firestore.rules` : gardez-les synchronisées.

## 7. Structure
```
api/                    Vercel Functions (create-user, cloudinary-sign)
src/app/                Écrans (Expo Router) : login, (tabs), clients, quotes, projects, users
src/features/           Formulaires et logique métier (devis, PDF, photos…)
src/components/         UI réutilisable (ui.tsx, ClientPicker, BrandMark SVG)
src/lib/                firebase, cloudinary, formats FCFA, constantes
src/services/           Hooks Firestore temps réel, numérotation, permissions
```

## 8. À personnaliser
- `src/theme.ts` : couleurs (palette provisoire acier / jaune d'engin, à aligner sur la charte BAT & PREFAB).
- `src/lib/constants.ts` : coordonnées, **mentions légales (`legalLine`)**, conditions par défaut des devis, TVA par pays (à valider avec le comptable : CI/TG/BF 18 %, CM 19,25 %).
- `assets/` : icône et écran de démarrage.

## Limites connues (Phase 1)
- Pas de mode hors-ligne : le SDK JS de Firestore n'a pas de cache persistant sur mobile.
- Les compteurs DEV/PRJ sont incrémentés côté client (transaction). À migrer côté serveur avant la facturation.
- Le fichier PDF partagé porte un nom généré ; le numéro du devis figure dans le document.
- Retirer une photo la supprime du projet mais pas de Cloudinary.
