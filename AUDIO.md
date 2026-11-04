# Audio et microphone dans Open Akko

Le mode audio dispose de sa propre activation, accessible en permanence dans la colonne de gauche : **Effets / Audio**. L’onglet **Audio réactif** permet de le configurer. Le clavier doit être branché en USB.

## Deux sources simultanées

| Panneau | Source | Zone et réglages |
|---|---|---|
| Sortie audio | Casque ou enceintes utilisés pour la musique, les jeux et les vidéos | Égaliseur, volume ou basses ; sensibilité, extinction et seuil de silence propres à la sortie |
| Entrée microphone | Microphone choisi | Vu-mètre sur Home, PgUp, PgDn, End et flèche droite ; sensibilité, extinction et seuil propres au micro |

Les interrupteurs des deux panneaux sont indépendants. Configurez les canaux souhaités, puis activez **Mode audio**. Lorsque les deux canaux fonctionnent, la colonne de droite est réservée au micro ; la sortie audio utilise le reste de la géométrie définie par le profil. Sur le 5075 de référence, cela représente 16 colonnes avec le micro et 17 sans lui.

Les périphériques, l’animation de sortie, les sensibilités, les seuils et les extinctions se changent pendant le fonctionnement. Couper ou réactiver le micro laisse la sortie fonctionner. Couper le dernier canal ramène au mode Effets.

Changer de page ou réduire la fenêtre laisse le mode audio actif. Revenir au mode **Effets** ou fermer normalement la fenêtre restaure l’éclairage précédent. Les choix de configuration sont conservés ; une nouvelle ouverture ne déclenche pas automatiquement la capture audio.

## Réactivité

La capture demande désormais un tampon de **10 ms**, contre 40 ms auparavant. Les fenêtres d’analyse passent de **1 024 à 512 échantillons à 24 kHz**, soit environ **21 ms** au lieu de 43 ms. Le vu-mètre du micro évite le calcul d’égaliseur.

Le flux USB vise **50 images par seconde**. Les valeurs par défaut d’extinction sont de **70 ms pour la sortie** et **90 ms pour le micro**, avec des raccourcis Vif, Naturel et Doux. Il s’agit de paramètres logiciels ; le délai physique complet entre le son et la LED n’a pas été mesuré.

Les captures écrasent leur dernier résultat en mémoire. Le programme ne constitue pas de file de son à rejouer plus tard.

## Fenêtre intégrée

La barre de titre fait partie de l’interface. Elle permet de déplacer la fenêtre et de la réduire, l’agrandir, la restaurer ou la fermer. Les bords et les coins restent utilisables pour la redimensionner. La décoration extérieure du système est désactivée.

## Limites

Les deux zones partagent la couleur ou le rendu arc-en-ciel et la luminosité du clavier. Ces réglages communs se préparent lorsque le mode audio est arrêté. Le flux musical pilote des hauteurs de barres par colonne ; il ne fournit pas des couleurs RGB arbitraires pour chaque LED à chaque image.

Une source indisponible est signalée dans son panneau ; l’autre peut continuer. Si les deux sources disparaissent ou si un transfert USB échoue, le moteur arrête l’audio et tente de rétablir l’éclairage précédent.

Le son reste analysé localement. Aucun fichier sonore n’est enregistré. Une réaction au son des jeux ne donne pas accès à leur état interne, comme la vie ou les munitions.

## Protocole confirmé

Clavier **3151:4015**, identifiant interne **1165**, famille **yc500**. Le mode musical **22**, variante verticale **0**, reçoit des rapports HID de 64 octets : commande **0x0D**, somme de contrôle à l’octet 7, puis **32 niveaux bornés entre 0 et 6** aux octets 8 à 39. La colonne lumineuse **16** a été confirmée par l’utilisateur pour Home, PgUp, PgDn, End et flèche droite. Elle diffère de la colonne 14 de la matrice des contacts.

Un seul moteur USB compose les deux sources. L’activation initiale règle le mode natif ; les réglages propres aux sources et leurs interrupteurs modifient ensuite le flux en mémoire vive. Les écritures de motifs par touche `0x0C` restent séparées et soumises à leur délai d’écriture.

Sources de référence : [documentation PipeWire](https://docs.pipewire.org/page_man_pw-cat_1.html), [protocole Keydous yc500](https://github.com/alkaiyali/keydous-nj81-linux/blob/master/docs/FIRMWARE.md), [personnalisation des fenêtres Tauri](https://v2.tauri.app/learn/window-customization/). La prise en charge matérielle est limitée au clavier 1165 branché en USB.


## Préparation de Windows et d’autres modèles

La capture est séparée du traitement audio : PipeWire sur Linux, adaptateur WASAPI pour la sortie et le micro sur Windows. Le nom, les colonnes et les touches de la zone micro viennent du profil du modèle. Les formats installables Windows sont préparés ; leurs essais réels sur Windows restent à effectuer. Voir [la préparation multi-claviers et Windows](docs/MULTI-KEYBOARDS-WINDOWS.md).
