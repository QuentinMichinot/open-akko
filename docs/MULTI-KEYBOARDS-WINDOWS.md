# Plusieurs claviers AKKO et préparation Windows

## État de la préparation

Le logiciel sépare désormais trois éléments : les particularités du modèle, le traitement audio commun et la capture propre au système. Le nom du clavier et ses zones audio proviennent du profil connecté.

| Élément | État |
|---|---|
| Configuration classique des claviers | Catalogue et protocoles déjà présents dans le projet |
| Profils Studio | Format JSON version 1 avec schéma et contrôles d’identité |
| Audio du clavier 1165 | Profil validé sur le 5075 de référence sous Fedora |
| Profils 5075B Plus 1042 et 3098B 69 | Préparés ; audio supplémentaire désactivé tant qu’il n’est pas validé |
| Capture Linux | PipeWire, conservée et testée sous Fedora |
| Capture Windows | Adaptateur WASAPI : sortie en loopback et microphone, code contrôlé pour une cible Windows |
| Installateurs Windows | Configurations et procédure prêtes ; génération complète et essais réels sur Windows encore nécessaires |

Une même référence commerciale peut désigner plusieurs électroniques. Le logiciel distingue l’identifiant interne du clavier, son identifiant USB vendeur/produit et sa famille de protocole. Un clavier partageant l’USB du 5075 ne reçoit pas automatiquement ses commandes audio.

## Formats recommandés

| Format | Utilisation recommandée |
|---|---|
| Windows `.exe` NSIS | Distribution principale, installation par utilisateur, raccourcis et désinstallation |
| Windows `.msi` | Complément pour un déploiement administré |
| Windows `.zip` portable | Essais et dépannage ; WebView2 doit déjà être installé |
| Fedora `.rpm` | Distribution principale, avec intégration des permissions USB |
| Linux `.AppImage` | Alternative portable ; les permissions USB restent à préparer sur le système |
| Profils `.json` | Description versionnée des particularités et de la géométrie de chaque modèle |

Les formats Windows `.exe` et `.msi` sont pris en charge par [Tauri](https://v2.tauri.app/distribute/windows-installer/). La compilation sur Windows est privilégiée pour les paquets finaux. L’installateur configuré embarque le programme d’amorçage WebView2 ; si le composant manque, son téléchargement demande une connexion Internet.

## Ajouter un modèle

Le catalogue des claviers reste dans `app/src-tauri/data/devices.json`, alimenté par les outils du projet et ses corrections. Les ajouts propres à Studio sont dans `app/src-tauri/data/studio-profiles.json`, avec le schéma voisin `studio-profiles.schema.json`.

Un profil indique :

- l’identité interne, le vendeur, le produit et la famille du protocole ;
- le nom du modèle ;
- les effets indisponibles et les particularités d’écriture des macros ;
- le protocole audio validé, ses colonnes et les colonnes réservées au micro ;
- les touches à afficher dans l’interface et la référence des vérifications.

L’audio peut rester `null` pendant la préparation d’un modèle. Il faut vérifier ses commandes par une lecture/écriture/restauration matérielle ou par son propre firmware avant de lui donner un profil audio actif. La ressemblance des noms, la taille du clavier ou le seul code JavaScript du constructeur ne suffisent pas.

La colonne micro n’est plus fixée à 16 dans le moteur. Un profil peut décrire une autre géométrie, y compris plusieurs colonnes non contiguës. Le compositeur réserve ces colonnes au micro et répartit l’égaliseur sur le reste. Le seul format de flux actuellement activable est `yc500-music32` ; un autre format demande un adaptateur de protocole et sa validation.

Après un ajout, lancer les contrôles :

```sh
python tools/check_studio_profiles.py
cd app
npm run build
npx vitest run
cd src-tauri
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked --lib
```

Les profils installés sont intégrés à la compilation. Le logiciel n’importe pas automatiquement un profil externe capable d’activer de nouvelles écritures USB.

## Compiler sur Windows

Prévoir Windows 10 ou 11 en 64 bits, Node.js 22, Rust avec la cible MSVC, les outils C++ de Visual Studio et WebView2. Les prérequis sont détaillés dans la [documentation Windows Tauri](https://v2.tauri.app/start/prerequisites/).

Depuis la racine du projet, avec PowerShell :

```powershell
.\packaging\windows\build.ps1 -Format setup
```

Autres variantes :

```powershell
.\packaging\windows\build.ps1 -Format msi
.\packaging\windows\build.ps1 -Format both
.\packaging\windows\build.ps1 -Format portable
```

Les résultats et leurs sommes SHA-256 sont placés dans `artifacts/windows`. Le script crée aussi un ZIP portable et y joint les licences. La cible initiale est `x86_64-pc-windows-msvc`.

Le fichier `.github/workflows/windows-studio.yml` prépare la même opération sur un exécuteur Windows. Son déclenchement est manuel ; il contrôle les profils, les types, les tests et le code natif, puis conserve les paquets comme artefacts. Il ne publie pas de version automatiquement.

La capture Windows utilise [CPAL/WASAPI](https://github.com/RustAudio/cpal). Les objets audio restent sur leur fil de capture ; les échantillons sont convertis en mono à 24 kHz pour réutiliser le même analyseur que sous Linux. Aucune commande PipeWire n’est lancée sur Windows. La sortie et le micro restent deux sources distinctes.

Avant distribution Windows, il reste à vérifier sur la machine cible : l’identification HID, les commandes de configuration du clavier, les deux captures audio simultanées, les autorisations du micro, l’arrêt/restauration et l’installation/désinstallation. Une compilation ne prouve pas le comportement physique. La signature des paquets peut être ajoutée lors de la préparation d’une diffusion publique.

## Compiler les formats Fedora

```sh
cd app
npm ci
npm run build:fedora
```

La configuration conserve les règles USB et les ressources du projet. Les contrôles matériels restent propres au modèle et à sa variante.
