# email_config.py
# Configuration pour l'envoi d'emails

import os
from dotenv import load_dotenv

load_dotenv()

# Configuration SMTP
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "khmiriiheb3@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "a1b2c3IHEB29118233")

# URLs de l'application
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Configuration des emails
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "DigitalCook")
EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS", SMTP_USERNAME)

# Durées d'expiration (en heures)
RESET_TOKEN_EXPIRY_HOURS = int(os.getenv("RESET_TOKEN_EXPIRY_HOURS", "1"))
VERIFICATION_TOKEN_EXPIRY_HOURS = int(os.getenv("VERIFICATION_TOKEN_EXPIRY_HOURS", "24")) 