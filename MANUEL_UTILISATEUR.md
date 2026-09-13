# Manuel d'utilisation — Registre Intelligent

Ce manuel décrit chaque menu de l'application, les formulaires qu'on y trouve, pourquoi ils comptent, et les erreurs les plus fréquentes à éviter. Il reflète l'état réel de l'application au moment de la rédaction — certaines sections sont signalées comme **données de démonstration** quand c'est le cas, pour éviter toute confusion.

---

## Sommaire

1. [Navigation générale](#1-navigation-générale)
2. [Accueil](#2-accueil)
3. [Registre intelligent (Courriers)](#3-registre-intelligent-courriers)
4. [Dossiers](#4-dossiers)
5. [Tâches](#5-tâches)
6. [B2B](#6-b2b)
   - [6.1 Mes produits & services](#61-mes-produits--services)
   - [6.2 Annuaire](#62-annuaire)
   - [6.3 Demandes de cotation intelligentes](#63-demandes-de-cotation-intelligentes)
   - [6.4 Opportunités](#64-opportunités)
   - [6.5 Prestataires](#65-prestataires)
7. [Projets](#7-projets)
8. [Rapports](#8-rapports)
9. [Institutions](#9-institutions)
10. [Pilotage](#10-pilotage)
    - [10.1 Archives](#101-archives)
    - [10.2 Performance](#102-performance)
    - [10.3 Copilote IA](#103-copilote-ia)
    - [10.4 Administration](#104-administration)
    - [10.5 Corbeille](#105-corbeille)
11. [Paramètres](#11-paramètres)
12. [Aide-mémoire : les erreurs à ne jamais faire](#12-aide-mémoire--les-erreurs-à-ne-jamais-faire)

---

## 1. Navigation générale

Le menu de gauche est organisé en 5 groupes :

| Groupe | Contenu |
|---|---|
| — | Accueil |
| **Registre** | Courriers intelligents, Dossiers, Tâches |
| **B2B** | Mes produits & services, Annuaire, Demandes de cotation, Opportunités, Prestataires |
| **Projets** | Projets, Rapports |
| **Inter-institutions** *(si activé pour votre compte)* | Institutions |
| **Pilotage** | Archives, Performance, Copilote IA, Administration, Corbeille |

**Paramètres** est accessible en bas du menu, séparément.

> ⚠️ **Erreur à éviter** : ne confondez pas les deux « Rapports » de l'application — l'onglet **Rapports** d'un projet (dans Projets) résume *ce projet précis*, alors que le menu **Rapports** (section Projets du menu) sert à importer et analyser des documents indépendants par IA. Ce sont deux outils différents.

---

## 2. Accueil

Tableau de bord d'entrée : statistiques globales et raccourcis. C'est un point de passage, pas un formulaire — aucune saisie n'y est requise.

---

## 3. Registre intelligent (Courriers)

**À quoi ça sert :** enregistrer, classer et suivre le courrier entrant et sortant (factures, contrats, lettres, etc.), avec extraction automatique des informations par IA (résumé, montant, échéance, expéditeur).

### Formulaire clé : importer un courrier

Le bouton **Analyser** (en-tête) ouvre l'import. Deux choses à décider **avant** d'envoyer le fichier :

1. **Entrant ou Sortant** — ce choix change tout le formulaire qui suit (le registre du courrier arrivée n'a pas les mêmes champs que le registre du courrier départ).
   - **Entrant** : N° d'enregistrement, Date de réception, N°/Référence du courrier, Service d'affectation, Instruction, Service ayant reçu…
   - **Sortant** : N° d'ordre / numéro de sortie, Date d'expédition, Référence du courrier, Service émetteur, Mode d'expédition, Preuve d'envoi, Date de réception par le destinataire…
2. Le fichier à analyser (l'IA détecte automatiquement résumé, montant dû, devise, échéance, expéditeur).

### Erreurs à éviter

- ⚠️ **Choisir la mauvaise direction (Entrant/Sortant) avant l'import** : vous devrez ressaisir les champs si vous vous trompez, car ils ne sont pas les mêmes des deux côtés.
- ⚠️ Ne pas vérifier les champs détectés par l'IA (montant, échéance, expéditeur) avant de valider — l'IA peut se tromper sur un document mal scanné ; relisez toujours le résumé généré.
- ⚠️ Les onglets **Entrant / Sortant / Non classé** dans la liste filtrent l'affichage — un document que vous « ne trouvez plus » est souvent juste dans un autre onglet.

---

## 4. Dossiers

**À quoi ça sert :** regrouper des documents déjà importés dans des dossiers (comme un explorateur de fichiers), pour les retrouver plus vite.

### Formulaire clé

**« Nouveau dossier »** → un seul champ obligatoire : **Nom du dossier** → **Créer le dossier**.

### Erreurs à éviter

- ⚠️ **Le nom du dossier est obligatoire** — le bouton de création reste désactivé tant qu'il est vide.
- ⚠️ Un nouveau dossier créé pendant que vous êtes déjà « à l'intérieur » d'un dossier se place **automatiquement en sous-dossier** de celui-ci — il n'y a pas de sélecteur explicite d'emplacement parent, c'est facile à manquer.
- ⚠️ Il n'y a pas de renommage, suppression ou déplacement de dossier depuis cet écran : seule la création est possible ici.

---

## 5. Tâches

**À quoi ça sert :** confier des tâches internes, suivre leur avancement, et gérer un cycle **contribution → évaluation** proche de celui utilisé dans les Projets.

### Formulaires clés

- **Créer une tâche** : Titre, Responsable, Projet (facultatif), Membres associés, Échéance, Priorité, Notes, Pièces jointes.
- Dans le détail d'une tâche : **Ajouter une contribution** (note + fichiers), puis pour le responsable, **Évaluer cette contribution** (Valider / À corriger / Rejeter, avec note et commentaire).

### Erreurs à éviter

- ⚠️ Seul le **responsable désigné** de la tâche voit apparaître le bouton d'évaluation sur les contributions des autres membres — si vous êtes le créateur mais pas le responsable, vous ne pourrez pas évaluer.
- ⚠️ Une contribution qu'on évalue **soi-même** (l'auteur == l'évaluateur) n'affiche pas le bouton d'évaluation : le contrôle croisé est volontaire.
- ⚠️ Utiliser les filtres **Statut** et **Priorité** avant de conclure qu'une tâche a disparu de la liste.

---

## 6. B2B

Regroupe cinq écrans pour la mise en réseau avec d'autres entreprises.

### 6.1 Mes produits & services

**À quoi ça sert :** gérer le catalogue de vos produits/services, visible par les autres entreprises du réseau.

**Formulaire clé — Ajouter un produit ou service :** Réf., Catégorie, **Nom*** , Marque, Modèle, Prix (USD), Stock, Unité, Garantie (mois), État (Disponible / Stock limité / Indisponible), Localisation, Délai de livraison, Description.

Import en masse possible via **« Télécharger le modèle »** (fichier Excel) puis **« Choisir un fichier »** pour le réimporter.

#### ⚠️ Erreurs à éviter (importantes)

- **La suppression d'un produit est immédiate, sans confirmation.** Un clic sur la corbeille supprime la ligne — il n'y a pas de « êtes-vous sûr ? ».
- **L'import Excel remplace TOUT le catalogue existant**, silencieusement, sans avertissement préalable. N'importez que si vous voulez effacer et remplacer l'intégralité du catalogue — pas pour ajouter quelques lignes à celles déjà présentes.
- L'import n'accepte que le format du modèle officiel téléchargé ; un fichier structuré différemment sera rejeté avec une erreur.
- Les prix sont toujours saisis en USD ; l'équivalent en CDF est calculé automatiquement (le taux peut apparaître « hors ligne » si la conversion en direct échoue — ce n'est pas une erreur de saisie).

### 6.2 Annuaire

**À quoi ça sert :** annuaire public des entreprises du réseau ; permet à votre entreprise de s'y inscrire.

**Formulaire clé — Enregistrer votre entreprise :** Nom de l'entreprise\*, Ville/province\* (liste des provinces RDC), Type, Catégorie\*, Sous-catégorie\*, Adresse, Téléphone, E-mail, Présentation, **Logo de l'entreprise\***, **Image principale\***, Autres photos (jusqu'à 5) → **« Soumettre pour vérification »**.

#### ⚠️ Erreurs à éviter (importantes)

- **Logo ET image principale sont tous les deux obligatoires** — ils sont pourtant visuellement secondaires dans le formulaire, on les oublie facilement, et le bouton de soumission reste bloqué sans eux.
- **La fiche n'apparaît pas immédiatement dans l'annuaire public après soumission** : elle passe par un statut « en revue » et doit être validée par un administrateur avant de devenir visible. Ne pensez pas que l'inscription a échoué si vous ne la voyez pas tout de suite.
- Aucune modification ou suppression d'une fiche déjà soumise n'est possible depuis cet écran.

### 6.3 Demandes de cotation intelligentes

**À quoi ça sert :** créer un appel d'offres/demande de cotation, le publier, et comparer les offres reçues avec l'aide de l'IA.

**Trois façons de créer une demande :**
- **« Importer un appel d'offre »** — vous déposez un fichier (PDF/Word), l'IA pré-remplit le formulaire.
- **« Créer avec l'IA »** — vous décrivez le besoin en langage naturel, l'IA génère les champs et les produits.
- **« Nouvelle demande »** — un assistant en **5 étapes** :
  1. **Informations générales** : Titre\*, Référence (générée automatiquement), Date limite\*, Lieu de livraison\*, Description, Cahier des charges (optionnel).
  2. **Produits/Services** : lignes Produit, Quantité, Spécifications.
  3. **Formulaire personnalisable** : questions sur mesure (texte, nombre, montant, date, oui/non, choix multiple, liste déroulante, quantité, pourcentage, fichier, photo, URL, tableau de produits), chacune marquable « Obligatoire ».
  4. **Critères de scoring** : critères pondérés en %, utilisés pour le classement IA des offres.
  5. **Vérification et publication** : portée (locale/nationale), catégorie de fournisseur, visibilité (Tous / Par catégorie / Fournisseurs spécifiques) → **« Enregistrer en brouillon »** ou **« Publier la demande »**.

#### ⚠️ Erreurs à éviter (importantes)

- À l'étape 3, si la somme des poids de scoring dépasse 100 %, l'étape suivante est bloquée — corrigez les pourcentages avant de continuer.
- **La publication n'exige en réalité que Titre + Date limite + Lieu de livraison.** Produits, formulaire personnalisé et critères de scoring peuvent rester vides : relisez bien votre demande avant de publier, rien ne vous empêchera de le faire de façon incomplète.
- **Les demandes de cotation créées ne sont pas rechargées automatiquement au rafraîchissement de la page.** Elles sont bien enregistrées, mais si vous rechargez l'écran ou changez de session, la liste affichée peut sembler vide même si vos demandes existent toujours en base — ne recréez pas un doublon par précaution.
- Le parcours **« Vue fournisseur »** (réponse d'un fournisseur à une demande) est une **démonstration non enregistrée** : le clic sur « Soumettre mon offre » affiche une confirmation à l'écran, mais l'offre n'est pas réellement rattachée à la demande. Ne présentez pas ce parcours comme fonctionnel de bout en bout à un fournisseur externe pour l'instant.
- Le bouton « Copier le lien » dans le détail d'une demande n'est pas encore actif.

### 6.4 Opportunités

**À quoi ça sert (en théorie) :** afficher les demandes de cotation ouvertes auxquelles votre entreprise peut répondre en tant que fournisseur.

#### ⚠️ Erreur à éviter (importante)

- **Cet écran est actuellement vide et n'est alimenté par aucune donnée réelle** — il n'y a pas encore de flux d'opportunités entrantes. Ne concluez pas qu'il n'y a « aucune opportunité disponible » : la fonctionnalité elle-même n'est pas encore branchée à une source de données.

### 6.5 Prestataires

**À quoi ça sert :** gérer vos relations avec vos fournisseurs et clients (répertoire de partenaires qualifiés).

**Deux façons d'ajouter un partenaire :**
- **« Rechercher dans Registre intelligent »** — retrouver une entreprise déjà inscrite (par nom, ville, secteur, code).
- **« Créer un fournisseur externe »** — saisie manuelle : Nom\*, type de relation, Adresse, Ville, Téléphone, E-mail, Personne de contact, Secteur/Catégorie, Produits/Services, N° fiscal/RCCM, Notes (un code Registre intelligent est généré automatiquement, ex. `DF-CT-83921`).

#### ⚠️ Erreurs à éviter (très importantes)

- **Le bouton « Ajouter un partenaire » (les deux méthodes) n'enregistre PAS la relation de façon permanente** — elle disparaît si vous rechargez la page. Le seul chemin qui enregistre réellement une relation passe par la fiche d'une entreprise (« Toutes les entreprises inscrites » → cliquer sur l'entreprise → choisir la relation dans sa fiche → **« Enregistrer »**). Si un partenaire ajouté « disparaît », c'est le symptôme de cette limite actuelle — pas une erreur de manipulation.
- Enregistrer une relation depuis la fiche d'une entreprise **recharge entièrement la page** : sauvegardez tout autre travail en cours ailleurs dans l'application avant de cliquer sur « Enregistrer » ici.
- Le changement de logo (icône caméra sur votre propre entreprise) est appliqué **immédiatement**, sans aperçu ni confirmation.

---

## 7. Projets

**À quoi ça sert :** piloter un projet interne de bout en bout — objectifs, phases, tâches, contributions, finances, risques, visites de terrain — avec un système de **modules activables** qui adapte l'application au type de projet (commercial, chantier, programme, etc.).

### 7.1 Créer un projet — page dédiée

Contrairement aux autres formulaires (qui s'ouvrent en fenêtre), **« Nouveau projet » est une page complète**. Elle ne contient que le strict nécessaire pour démarrer :

- **Informations générales** : Nom du projet\*, Type de projet\* (Commercial, Construction & Travaux, Informatique, Administration, RH, Marketing, Finance, Investissement, Programme, Autre), Description/objectif\*, **Résultat final attendu\***, Département responsable, Responsable du projet\*, Contributeurs, Priorité.
- **Calendrier** : Date de début\*, Deadline\*, Fréquence de suivi.
- **Modules du projet** — cases à cocher : Objectifs et indicateurs, Phases/Jalons, Tâches, Contributions, Documents, Budget/Dépenses, Financement, Recettes, Facturation/Encaissements, Risques/Problèmes, Visites/Inspections, Photos/Vidéos terrain.

> 💡 **Important** : le **Type de projet** précoche automatiquement les modules pertinents (ex. « Construction & Travaux » active Phases, Tâches, Budget, Financement, Risques, Visites et Photos/Vidéos). Vous pouvez ensuite cocher/décocher librement — les modules non activés n'encombrent pas la suite du projet.

### 7.2 La fiche projet : tout le reste se fait ici

Une fois le projet créé, un bandeau d'onglets apparaît — **seuls les onglets correspondant aux modules activés sont affichés** :

`Vue d'ensemble | Phases | Tâches | Contributions | Documents | Finances | Risques | Équipe | Rapports`

Le bouton **« + Ajouter ▼ »**, en haut à droite, est le point d'entrée unique pour tout ajouter : Tâche, Phase, Objectif, Contribution, Document, Dépense, Recette, Financement, Risque, Visite. **La liste proposée s'adapte automatiquement aux modules activés** — un projet sans le module « Recettes » ne verra jamais « Ajouter une recette ».

| Onglet | Ce qu'on y fait |
|---|---|
| Vue d'ensemble | Anneaux de progression (global + par objectif), liste des objectifs et des phases |
| Phases | Créer/consulter les jalons du projet (responsable, budget, poids, objectif associé) |
| Tâches | Créer une tâche liée au projet, ou en attacher une existante |
| Contributions | Vue consolidée de toutes les contributions soumises sur toutes les tâches du projet |
| Documents | Documents de démarrage + documents du registre liés au projet |
| Finances | Budget global, Financement, Dépenses, Recettes réunis au même endroit |
| Risques | Suivi des risques/problèmes (probabilité, impact, mesure corrective) |
| Équipe | Liste des membres impliqués (responsable, contributeurs, assignés) |
| Rapports | Synthèse chiffrée du projet + historique des visites de terrain |

### Erreurs à éviter

- ⚠️ **Ne décochez pas un module « pour faire simple » si vous en aurez besoin plus tard** : rien n'empêche de revenir cocher un module manquant, mais tant qu'il est désactivé, son onglet et ses formulaires dans « + Ajouter » restent invisibles — un collègue pourrait chercher « Ajouter une recette » en vain simplement parce que le module Recettes n'a pas été activé à la création.
- ⚠️ **La « Preuve obligatoire »** sur une tâche (Oui/Non) bloque réellement la soumission d'une contribution sans pièce jointe si elle est activée — pensez-y avant de créer une tâche qui n'a pas besoin de justificatif.
- ⚠️ Le champ **« Résultat final attendu »** et **« Résultat attendu »** (au niveau des phases) sont obligatoires à la création — sans eux, impossible de valider le formulaire.
- ⚠️ Le mode de mise à jour d'un objectif (« Depuis les tâches » / « Automatiquement ») **bloque la modification manuelle** de sa valeur courante : si un objectif ne semble « jamais avancer », vérifiez son mode de mise à jour plutôt que de chercher un champ de saisie qui n'existera pas.

---

## 8. Rapports

**À quoi ça sert :** analyser un document isolé par IA (résumé + informations importantes détectées), ou faire remonter plusieurs rapports de plusieurs contributeurs vers **une seule synthèse consolidée**.

### Deux types de rapport

- **Rapport unique** : vous importez un seul document → l'IA l'analyse immédiatement → un résumé, un tableau récapitulatif et une liste d'informations détectées (rédigé par, type, montant, échéance) apparaissent dans la fiche du rapport.
- **Rapport consolidé** : vous créez d'abord la structure ; chacun ajoute ensuite son propre document via **« + Ajouter un rapport »** ; un bouton **« Générer la synthèse consolidée »** demande à l'IA de fusionner tous les résumés individuels en une seule synthèse cohérente (en réconciliant les chiffres/dates communs et en signalant les contradictions).

### Sur chaque rapport

- Le nom du fichier est cliquable → **télécharge le document d'origine** (il ne s'ouvre pas dans un nouvel onglet).
- Le bouton **« Lire le résumé »** (vert) lit le résumé à voix haute ; il devient **« Arrêter »** (rouge) pendant la lecture.

### Erreurs à éviter

- ⚠️ En mode **Rapport consolidé**, la synthèse **n'est pas régénérée automatiquement** quand une nouvelle contribution est ajoutée — il faut recliquer sur « Générer/Régénérer la synthèse consolidée » après chaque ajout pour qu'elle en tienne compte.
- ⚠️ Un montant détecté sans devise précisée s'affiche en chiffre brut (sans « USD »/« CDF ») — l'IA ne propage pas toujours la devise d'origine ; vérifiez le document source pour confirmer l'unité monétaire avant de vous y fier.
- ⚠️ Un document image sans texte lisible (logo, photo sans mention écrite) fera **échouer l'analyse** avec une erreur — ce module est prévu pour des documents contenant du texte (factures, contrats, rapports scannés), pas pour des images purement visuelles.

---

## 9. Institutions

*(Visible uniquement pour les comptes de type institution.)*

> 💡 **À la création d'un compte institution** (« Compte institution » lors de l'inscription), l'accès à **toute l'application** — pas seulement à ce menu — reste bloqué derrière un écran « Demande institutionnelle en vérification » tant qu'un administrateur de la plateforme n'a pas validé le compte. Ce n'est qu'après cette validation que le tableau de bord normal s'ouvre, avec le menu **Institutions** visible.

**À quoi ça sert :** annuaire des institutions publiques vérifiées et demandes officielles de collaboration inter-institutions.

**Formulaire clé — Demander une collaboration :** Objet de la demande\*, Projet concerné\*, Type de collaboration\*, Demandeur\*, Fonction\*, Numéro de contact\*, Message\*, pièces jointes (jusqu'à 5), et une **case de consentement obligatoire** (« Je confirme que cette demande est soumise à l'accord préalable de l'institution destinataire »).

### Erreurs à éviter

- ⚠️ Seules les institutions du **même pays** que vous apparaissent dans l'annuaire — une liste vide ne signifie pas qu'il n'existe aucune institution partenaire, juste qu'aucune n'est enregistrée dans votre pays.
- ⚠️ Cocher la case de consentement ne notifie pas automatiquement l'institution destinataire d'un accord réel — c'est une déclaration de votre part, pas une validation externe.
- ⚠️ Une fois une demande reçue **acceptée ou rejetée**, l'action n'est **pas réversible** depuis l'interface (les boutons disparaissent après coup) — réfléchissez avant de trancher.
- ⚠️ L'envoi d'une demande, à lui seul, **ne donne aucun accès** — ce n'est qu'après acceptation explicite que la collaboration est effective.

---

## 10. Pilotage

### 10.1 Archives

Navigation dans les documents archivés/clôturés.

> ⚠️ **Important** : cet écran affiche actuellement des **données de démonstration fixes** (volumes de stockage, compteurs par catégorie) — ce ne sont pas vos chiffres réels. Les tuiles de catégories (Factures, Contrats, etc.) ne sont pas encore cliquables.

### 10.2 Performance

Tableau de bord d'indicateurs (volumes, statuts, délais de traitement, comparaison par département).

> ⚠️ **Important** : comme pour Archives, cet écran repose entièrement sur des **données fictives figées**, à ne pas confondre avec une analytique réelle de votre activité. Le bouton « Générer le rapport complet » n'est pas encore actif.

### 10.3 Copilote IA

Assistant conversationnel pour interroger vos documents (statuts, échéances, responsables).

- Fonctionne avec une **vraie réponse IA** si vos documents Firebase sont chargés dans le contexte de la conversation.
- ⚠️ Sans documents réels chargés, l'assistant répond avec des exemples préformatés — ne vous fiez pas à une réponse qui semble trop générique sans avoir vérifié le contexte.
- ⚠️ L'historique de conversation **n'est pas conservé** d'une session à l'autre (il repart à zéro au rechargement).
- Le micro affiché est décoratif pour l'instant (pas de reconnaissance vocale branchée ici).

### 10.4 Administration

Gestion des utilisateurs, invitations, rôles et permissions.

**Formulaire clé — Inviter un membre :** Nom complet\*, Email\*, Fonction, **Rôle*** (Administrateur organisationnel, Direction Générale, Responsable d'unité, Secrétariat d'unité, Agent), Unité, Téléphone, Message d'invitation → génère un lien valable 7 jours, à copier/partager (par e-mail ou WhatsApp).

#### ⚠️ Erreurs à éviter

- **Aucun e-mail n'est envoyé automatiquement** : c'est à vous de copier et transmettre vous-même le lien d'invitation généré.
- Une invitation générée **ne peut pas être annulée** depuis cet écran — vérifiez bien l'adresse et le rôle avant de générer le lien.
- Le tableau des rôles/permissions et les règles d'escalade affichés sont **informatifs**, pas modifiables depuis cette page malgré leur apparence de paramètres.
- L'invitation nécessite une entreprise active associée à votre compte — le bouton reste désactivé avec un avertissement visible si ce n'est pas le cas.

### 10.5 Corbeille

Restauration ou suppression définitive des documents et tâches supprimés.

> ⚠️ **Important** : la suppression définitive efface aussi les fichiers associés — cette action est irréversible. Vérifiez toujours qu'il s'agit du bon élément avant de cliquer sur « Supprimer définitivement ».

---

## 11. Paramètres

Choix du mode d'archivage : Cloud, Dossier local, Serveur local, ou Hybride.

### Erreurs à éviter

- ⚠️ Le sélecteur de dossier local dépend d'une fonctionnalité de votre navigateur (accès au système de fichiers) — certains navigateurs ne la prennent pas en charge et afficheront une erreur au clic.
- ⚠️ Vos préférences sont enregistrées à la fois **localement dans votre navigateur** et, si une entreprise est active, **dans le cloud** (Firestore). Sur un autre appareil ou navigateur, seule la version cloud s'applique — ne soyez pas surpris si un réglage « local uniquement » ne vous suit pas partout.

---

## 12. Aide-mémoire : les erreurs à ne jamais faire

Cette liste rassemble les points les plus importants de tout le manuel — à relire si vous êtes pressé.

1. **Ne changez pas d'avis sur Entrant/Sortant après avoir commencé un import de courrier** — les champs du formulaire sont différents des deux côtés.
2. **En Projets**, activez tous les modules dont vous aurez besoin **dès la création** — un module désactivé rend son onglet et ses formulaires invisibles, pas juste grisés.
3. **Dans Mes produits & services, l'import Excel remplace tout le catalogue** — ne l'utilisez jamais pour un simple ajout partiel.
4. **La suppression d'un produit, d'une tâche en corbeille, ou l'acceptation/rejet d'une demande de collaboration sont des actions immédiates ou irréversibles** — prenez un instant avant de cliquer.
5. **Dans Prestataires, seule la fiche détaillée d'une entreprise (bouton « Enregistrer » dans sa page) enregistre réellement un partenariat** — le bouton « Ajouter un partenaire » ne persiste pas encore la relation.
6. **Archives et Performance affichent des données de démonstration**, pas vos statistiques réelles — ne basez aucune décision dessus pour l'instant.
7. **Opportunités B2B est vide par construction actuellement** — ce n'est pas un signe d'absence d'opportunités disponibles.
8. **Toute inscription à l'Annuaire doit être validée par un administrateur** avant d'apparaître publiquement — patientez avant de conclure à un échec.
9. **En Rapports, régénérez manuellement la synthèse consolidée** après chaque nouvelle contribution — elle ne se met pas à jour toute seule.
10. **Relisez toujours un résumé ou un champ détecté par l'IA** (montant, échéance, expéditeur, type de document) avant de valider — l'IA peut se tromper, en particulier sur des documents scannés ou de mauvaise qualité.
