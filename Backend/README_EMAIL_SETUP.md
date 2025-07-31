# Configuration Email - DigitalCook

Ce document explique comment configurer l'envoi d'emails pour les fonctionnalités de réinitialisation de mot de passe et de vérification d'email.

## Configuration SMTP

### 1. Configuration Gmail (Recommandé)

1. Activez l'authentification à deux facteurs sur votre compte Gmail
2. Générez un mot de passe d'application :
   - Allez dans les paramètres de votre compte Google
   - Sécurité > Connexion à Google > Mots de passe d'application
   - Générez un nouveau mot de passe d'application pour "Mail"

### 2. Configuration du fichier .env

Créez un fichier `.env` dans le dossier `Backend/` avec le contenu suivant :

```env
# Configuration SMTP pour l'envoi d'emails
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application

# URLs de l'application
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Configuration des emails
EMAIL_FROM_NAME=DigitalCook
EMAIL_FROM_ADDRESS=votre-email@gmail.com

# Durées d'expiration (en heures)
RESET_TOKEN_EXPIRY_HOURS=1
VERIFICATION_TOKEN_EXPIRY_HOURS=24
```

### 3. Autres fournisseurs SMTP

Vous pouvez utiliser d'autres fournisseurs SMTP en modifiant les paramètres :

#### Outlook/Hotmail
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
```

#### Yahoo
```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
```

#### Serveur SMTP personnalisé
```env
SMTP_SERVER=votre-serveur-smtp.com
SMTP_PORT=587
```

## Fonctionnalités implémentées

### 1. Mot de passe oublié
- Route : `POST /auth/forgot-password`
- Envoie un email avec un lien de réinitialisation
- Token valide pendant 1 heure par défaut

### 2. Réinitialisation de mot de passe
- Route : `POST /auth/reset-password`
- Permet de réinitialiser le mot de passe avec un token
- Vérifie l'expiration du token

### 3. Vérification d'email
- Route : `POST /auth/verify-email`
- Vérifie l'email avec un token
- Route : `POST /auth/send-verification-email`
- Envoie un email de vérification

## Sécurité

- Les tokens sont générés de manière sécurisée avec `secrets.token_urlsafe(32)`
- Les tokens ont une durée d'expiration configurable
- Les mots de passe sont stockés en clair (à améliorer avec du hachage)
- Les emails ne révèlent pas si un utilisateur existe ou non

## Test

Pour tester la configuration :

1. Démarrez le backend : `uvicorn app.main:app --reload`
2. Démarrez le frontend : `npm start`
3. Allez sur `/forgot-password` et testez l'envoi d'email
4. Vérifiez que l'email arrive dans votre boîte de réception

## Dépannage

### Erreur d'authentification SMTP
- Vérifiez que le mot de passe d'application est correct
- Assurez-vous que l'authentification à deux facteurs est activée

### Emails non reçus
- Vérifiez le dossier spam
- Vérifiez les paramètres SMTP
- Consultez les logs du serveur pour les erreurs

### Erreur de connexion
- Vérifiez que le serveur SMTP et le port sont corrects
- Assurez-vous que le pare-feu n'empêche pas la connexion 