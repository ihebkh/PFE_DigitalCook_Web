from fastapi import APIRouter, HTTPException, Response, Cookie, Depends, Request, UploadFile, File, Body
from app.Databases.mongo import get_mongo_collections
from typing import Optional
from app.Entites.user import UserAuth, UserProfileUpdate, AdminUserUpdate, ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest
from app.Services.user import authenticate_user
from app.config.email_config import *
from bson import ObjectId
from fastapi.responses import JSONResponse, FileResponse
import os
from pydantic import BaseModel, EmailStr
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

def send_email(to_email: str, subject: str, body: str):
    """Envoie un email via SMTP."""
    try:
        print(f"Tentative d'envoi d'email à {to_email}")
        print(f"Configuration SMTP: {SMTP_SERVER}:{SMTP_PORT}")
        print(f"Utilisateur SMTP: {SMTP_USERNAME}")
        
        # Vérifier si on est en mode développement (mot de passe par défaut)
        if SMTP_PASSWORD == "your-app-password" or SMTP_PASSWORD == "a1b2c3IHEB50201529" or SMTP_PASSWORD == "a1b2c3IHEB50201529":
            print("Mode développement détecté - Email non envoyé")
            return False
        
        msg = MIMEMultipart()
        msg['From'] = f"{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        print("Connexion SMTP établie, tentative de login...")
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        print("Login SMTP réussi")
        text = msg.as_string()
        server.sendmail(EMAIL_FROM_ADDRESS, to_email, text)
        server.quit()
        print("Email envoyé avec succès")
        return True
    except Exception as e:
        print(f"Erreur envoi email: {e}")
        print(f"Type d'erreur: {type(e).__name__}")
        return False

def generate_token():
    """Génère un token sécurisé."""
    return secrets.token_urlsafe(32)

def create_session_cookie(response: Response, email: str):
    """Crée un cookie de session pour l'utilisateur."""
    response.set_cookie(
        key="session_id",
        value=email,
        httponly=True,
        secure=False,  # False pour le développement local
        samesite="Lax",
        max_age=3600,
        path="/",
        domain=None
    )

def get_current_active_user(session_id: Optional[str] = Cookie(None)):
    """Récupère l'utilisateur courant à partir du cookie de session."""
    if not session_id:
        raise HTTPException(status_code=401, detail="Non authentifié")
    _, users_col, _, _, _ = get_mongo_collections()
    user = users_col.find_one({"email": session_id})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur invalide")
    return user

@router.post("/login")
def login(user: UserAuth, response: Response):
    """Authentifie un utilisateur et crée un cookie de session."""
    _, users_col, _, _, privileges_col = get_mongo_collections()
    db_user = authenticate_user(user.email, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")
    privilege_id = db_user.get("privilege")
    role_label = None
    if privilege_id:
        privilege_doc = privileges_col.find_one({"_id": ObjectId(privilege_id)})
        if privilege_doc:
            role_label = privilege_doc.get("label")
            allowed_roles = ["TopAdmin", "commercial", "influenceur", "agence", "apporteur", "topApporteur"]
            if role_label not in allowed_roles:
                raise HTTPException(status_code=403, detail="Accès non autorisé")
    else:
        raise HTTPException(status_code=403, detail="Aucun privilège associé à cet utilisateur")
    create_session_cookie(response, db_user["email"])
    return {
        "status": "valide",
        "nom": db_user.get("last_name"),
        "prenom": db_user.get("name"),
        "email": db_user.get("email"),
        "role": role_label,
        "photo_url": db_user.get("photo_url")
    }

@router.get("/current_user")
def get_current_user(current_user: dict = Depends(get_current_active_user)):
    """Retourne les informations de l'utilisateur courant."""
    return {
        "nom": current_user.get("last_name"),
        "prenom": current_user.get("name"),
        "email": current_user.get("email"),
        "photo_url": current_user.get("photo_url")
    }

@router.get("/logout")
def logout(response: Response):
    """Déconnecte l'utilisateur en supprimant le cookie de session."""
    response.delete_cookie("session_id")
    return {"message": "Déconnexion réussie"}

@router.put("/profile")
def update_profile(user_update: UserProfileUpdate, current_user: dict = Depends(get_current_active_user)):
    """Met à jour le profil de l'utilisateur courant."""
    _, users_col, _, _, _ = get_mongo_collections()
    user_id = current_user["_id"]
    update_fields = {}
    if user_update.name is not None: 
        update_fields["name"] = user_update.name
    if user_update.last_name is not None: 
        update_fields["last_name"] = user_update.last_name
    if user_update.email is not None and user_update.email != current_user["email"]:
        if users_col.find_one({"email": user_update.email}):
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")
        update_fields["email"] = user_update.email
    if user_update.photo_url is not None:
        update_fields["photo_url"] = user_update.photo_url
    if user_update.new_password:
        if not user_update.current_password:
            raise HTTPException(status_code=400, detail="Le mot de passe actuel est requis pour changer le mot de passe.")
        stored_password = current_user.get("password")
        if stored_password is None:
            raise HTTPException(status_code=500, detail="Erreur serveur: Le mot de passe de l'utilisateur n'a pas pu être récupéré.")
        if user_update.current_password != stored_password:
            raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect.")
        update_fields["password"] = user_update.new_password
    if not update_fields:
        raise HTTPException(status_code=400, detail="Aucune information à mettre à jour.")
    users_col.update_one({"_id": user_id}, {"$set": update_fields})
    updated_user_doc = users_col.find_one({"_id": user_id})
    if updated_user_doc:
        return {
            "nom": updated_user_doc.get("last_name"),
            "prenom": updated_user_doc.get("name"),
            "email": updated_user_doc.get("email"),
            "photo_url": updated_user_doc.get("photo_url")
        }
    raise HTTPException(status_code=500, detail="Échec de la récupération de l'utilisateur mis à jour.")

@router.post("/upload_photo")
def upload_photo(file: UploadFile = File(...), current_user: dict = Depends(get_current_active_user)):
    """Upload une photo de profil pour l'utilisateur courant."""
    _, users_col, _, _, _ = get_mongo_collections()
    user_id = current_user["_id"]
    filename = f"user_{str(user_id)}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
    photo_url = f"/uploads/{filename}"
    users_col.update_one({"_id": user_id}, {"$set": {"photo_url": photo_url}})
    return {"photo_url": photo_url}

@router.get("/users")
def get_all_users():
    """Retourne la liste de tous les utilisateurs avec leur privilège."""
    _, users_col, _, _, privileges_col = get_mongo_collections()
    users_list = []
    for user_doc in users_col.find():
        privilege_info = {"id": None, "label": "N/A"}
        privilege_id = user_doc.get("privilege")
        if privilege_id:
            if not isinstance(privilege_id, ObjectId):
                try:
                    privilege_id = ObjectId(privilege_id)
                except Exception:
                    privilege_id = None
            if privilege_id:
                privilege_doc = privileges_col.find_one({"_id": privilege_id})
                if privilege_doc:
                    privilege_info = {
                        "id": str(privilege_doc["_id"]),
                        "label": privilege_doc.get("label", "N/A")
                    }
        users_list.append({
            "id": str(user_doc["_id"]),
            "name": user_doc.get("name"),
            "last_name": user_doc.get("last_name"),
            "email": user_doc.get("email"),
            "photo_url": user_doc.get("photo_url"),
            "privilege": privilege_info
        })
    return users_list

@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    """Supprime un utilisateur par son ID."""
    _, users_col, _, _, _ = get_mongo_collections()
    try:
        object_id_to_delete = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Format de l'ID utilisateur invalide")
    delete_result = users_col.delete_one({"_id": object_id_to_delete})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Utilisateur avec l'id {user_id} non trouvé")
    return {"status": "success", "message": f"Utilisateur {user_id} supprimé avec succès"}

@router.get("/privileges")
def get_all_privileges():
    """Retourne la liste des privilèges disponibles."""
    _, _, _, _, privileges_col = get_mongo_collections()
    privileges = []
    for priv in privileges_col.find({}, {"_id": 1, "label": 1}):
        privileges.append({
            "id": str(priv["_id"]),
            "label": priv["label"]
        })
    return privileges

@router.put("/users/{user_id}")
def update_user_by_admin(user_id: str, user_update: AdminUserUpdate):
    """Met à jour un utilisateur (admin)."""
    _, users_col, _, _, privileges_col = get_mongo_collections()
    try:
        object_id_to_update = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Format de l'ID utilisateur invalide")
    update_data = user_update.dict(exclude_unset=True)
    if 'status' in update_data:
        update_data['status'] = update_data['status']
    if 'enabled' in update_data:
        update_data['enabled'] = update_data['enabled']
    if 'privilege' in update_data and update_data['privilege']:
        privilege_label = update_data.pop('privilege')
        privilege_doc = privileges_col.find_one({"label": privilege_label})
        if not privilege_doc:
            raise HTTPException(status_code=404, detail=f"Privilège '{privilege_label}' non trouvé")
        update_data['privilege'] = privilege_doc['_id']
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    result = users_col.update_one(
        {"_id": object_id_to_update},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Utilisateur avec l'id {user_id} non trouvé")
    updated_user = users_col.find_one({"_id": object_id_to_update})
    privilege_doc = privileges_col.find_one({"_id": updated_user.get('privilege')})
    return {
        "id": str(updated_user["_id"]),
        "name": updated_user.get("name"),
        "last_name": updated_user.get("last_name"),
        "email": updated_user.get("email"),
        "photo_url": updated_user.get("photo_url"),
        "privilege": privilege_doc.get("label") if privilege_doc else "N/A",
        "status": updated_user.get("status"),
        "enabled": updated_user.get("enabled", True)
    }

@router.post("/users/{user_id}/upload_photo")
def upload_user_photo_by_admin(user_id: str, file: UploadFile = File(...)):
    """Upload une photo pour un utilisateur (admin)."""
    _, users_col, _, _, _ = get_mongo_collections()
    try:
        object_id_to_update = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Format de l'ID utilisateur invalide")
    if not users_col.find_one({"_id": object_id_to_update}):
        raise HTTPException(status_code=404, detail=f"Utilisateur avec l'id {user_id} non trouvé")
    filename = f"user_{user_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
    photo_url = f"/uploads/{filename}"
    users_col.update_one({"_id": object_id_to_update}, {"$set": {"photo_url": photo_url}})
    return {"photo_url": photo_url}

class UserCreate(BaseModel):
    name: str
    last_name: str
    email: EmailStr
    privilege: str  # label du privilège
    password: str = "changeme123"
    photo_url: str = None
    status: str = None
    enabled: bool = True

@router.post("/users")
def create_user(user: UserCreate = Body(...)):
    """Crée un nouvel utilisateur."""
    _, users_col, _, _, privileges_col = get_mongo_collections()
    if users_col.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")
    privilege_doc = privileges_col.find_one({"label": user.privilege})
    if not privilege_doc:
        raise HTTPException(status_code=404, detail=f"Privilège '{user.privilege}' non trouvé")
    user_dict = user.dict()
    user_dict["privilege"] = privilege_doc["_id"]
    result = users_col.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)
    return {
        "id": user_dict["_id"],
        "name": user_dict["name"],
        "last_name": user_dict["last_name"],
        "email": user_dict["email"],
        "photo_url": user_dict.get("photo_url"),
        "privilege": privilege_doc["label"]
    }

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    """Envoie un email de réinitialisation de mot de passe."""
    _, users_col, _, _, _ = get_mongo_collections()
    
    # Vérifier si l'utilisateur existe
    user = users_col.find_one({"email": request.email})
    if not user:
        # Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
        return {"message": "Si cet email existe dans notre base de données, vous recevrez un email de réinitialisation."}
    
    # Générer un token de réinitialisation
    reset_token = generate_token()
    token_expiry = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS)
    
    # Sauvegarder le token dans la base de données
    users_col.update_one(
        {"email": request.email},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expiry": token_expiry
            }
        }
    )
    
    # Préparer l'email
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}&email={request.email}"
    
    email_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #f5b335; margin-bottom: 10px;">Réinitialisation de votre mot de passe</h2>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p>Bonjour <strong>{user.get('name', '')} {user.get('last_name', '')}</strong>,</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
                <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background-color: #f5b335; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Réinitialiser le mot de passe</a>
                </div>
                <p style="font-size: 14px; color: #666;">
                    Ce lien expirera dans {RESET_TOKEN_EXPIRY_HOURS} heure(s).
                </p>
                <p style="font-size: 14px; color: #666;">
                    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </p>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px;">
                    Cordialement,<br>
                    <strong>L'équipe TalentExpo</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Envoyer l'email
    if send_email(request.email, "Réinitialisation de mot de passe - TalentExpo", email_body):
        return {"message": "Email de réinitialisation envoyé avec succès."}
    else:
        # En mode développement, on peut retourner le lien directement
        if SMTP_PASSWORD == "your-app-password" or SMTP_PASSWORD == "a1b2c3IHEB50201529" or SMTP_PASSWORD == "a1b2c3IHEB50201529":
            return {
                "message": "Mode développement - Email non envoyé",
                "reset_url": reset_url,
                "token": reset_token,
                "email": request.email
            }
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email.")

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    """Réinitialise le mot de passe avec le token."""
    _, users_col, _, _, _ = get_mongo_collections()
    
    # Vérifier le token
    user = users_col.find_one({
        "email": request.email,
        "reset_token": request.token,
        "reset_token_expiry": {"$gt": datetime.utcnow()}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré.")
    
    # Mettre à jour le mot de passe
    users_col.update_one(
        {"email": request.email},
        {
            "$set": {"password": request.new_password},
            "$unset": {"reset_token": "", "reset_token_expiry": ""}
        }
    )
    
    return {"message": "Mot de passe réinitialisé avec succès."}

@router.post("/verify-email")
def verify_email(request: VerifyEmailRequest):
    """Vérifie l'email avec le token."""
    _, users_col, _, _, _ = get_mongo_collections()
    
    # Vérifier le token
    user = users_col.find_one({
        "email": request.email,
        "verification_token": request.token,
        "verification_token_expiry": {"$gt": datetime.utcnow()}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Token de vérification invalide ou expiré.")
    
    # Marquer l'email comme vérifié
    users_col.update_one(
        {"email": request.email},
        {
            "$set": {"email_verified": True},
            "$unset": {"verification_token": "", "verification_token_expiry": ""}
        }
    )
    
    return {"message": "Email vérifié avec succès."}

@router.post("/send-verification-email")
def send_verification_email(request: ForgotPasswordRequest):
    """Envoie un email de vérification."""
    _, users_col, _, _, _ = get_mongo_collections()
    
    user = users_col.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Cet email est déjà vérifié.")
    
    # Générer un token de vérification
    verification_token = generate_token()
    token_expiry = datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_EXPIRY_HOURS)
    
    # Sauvegarder le token
    users_col.update_one(
        {"email": request.email},
        {
            "$set": {
                "verification_token": verification_token,
                "verification_token_expiry": token_expiry
            }
        }
    )
    
    # Préparer l'email
    verification_url = f"{FRONTEND_URL}/verify-email?token={verification_token}&email={request.email}"
    
    email_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #f5b335; margin-bottom: 10px;">Vérification de votre adresse email</h2>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p>Bonjour <strong>{user.get('name', '')} {user.get('last_name', '')}</strong>,</p>
                <p>Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" style="background-color: #f5b335; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Vérifier mon email</a>
                </div>
                <p style="font-size: 14px; color: #666;">
                    Ce lien expirera dans {VERIFICATION_TOKEN_EXPIRY_HOURS} heure(s).
                </p>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px;">
                    Cordialement,<br>
                    <strong>L'équipe TalentExpo</strong>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Envoyer l'email
    if send_email(request.email, "Vérification de votre email - TalentExpo", email_body):
        return {"message": "Email de vérification envoyé avec succès."}
    else:
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email.")

@router.get("/test-email-config")
def test_email_config():
    """Test de la configuration email."""
    try:
        print(f"Configuration SMTP:")
        print(f"  Serveur: {SMTP_SERVER}")
        print(f"  Port: {SMTP_PORT}")
        print(f"  Utilisateur: {SMTP_USERNAME}")
        print(f"  Mot de passe configuré: {'Oui' if SMTP_PASSWORD != 'your-app-password' else 'Non'}")
        print(f"  Email d'expédition: {EMAIL_FROM_ADDRESS}")
        
        # Test de connexion SMTP
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.quit()
        
        return {
            "status": "success",
            "message": "Configuration SMTP valide",
            "config": {
                "server": SMTP_SERVER,
                "port": SMTP_PORT,
                "username": SMTP_USERNAME,
                "from_address": EMAIL_FROM_ADDRESS
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Erreur de configuration SMTP: {str(e)}",
            "config": {
                "server": SMTP_SERVER,
                "port": SMTP_PORT,
                "username": SMTP_USERNAME,
                "from_address": EMAIL_FROM_ADDRESS
            }
        }
