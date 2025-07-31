#!/usr/bin/env python3
"""
Script de test pour la fonctionnalité forgot password
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "khmiriiheb3@gmail.com"

def test_forgot_password():
    """Test de la fonctionnalité forgot password"""
    print("🧪 Test de la fonctionnalité Forgot Password")
    print("=" * 50)
    
    # Test 1: Configuration email
    print("\n1. Test de la configuration email...")
    try:
        response = requests.get(f"{BASE_URL}/auth/test-email-config")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Configuration SMTP: {data['status']}")
            print(f"   Serveur: {data['config']['server']}")
            print(f"   Port: {data['config']['port']}")
            print(f"   Utilisateur: {data['config']['username']}")
        else:
            print(f"❌ Erreur: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
    
    # Test 2: Forgot password
    print("\n2. Test de forgot password...")
    try:
        response = requests.post(f"{BASE_URL}/auth/forgot-password", 
                               json={"email": TEST_EMAIL})
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Succès: {data['message']}")
            if 'reset_url' in data:
                print(f"   URL de réinitialisation: {data['reset_url']}")
                print(f"   Token: {data['token']}")
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Détail: {response.text}")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
    
    # Test 3: Reset password (simulation)
    print("\n3. Test de reset password...")
    try:
        # D'abord obtenir un token
        response = requests.post(f"{BASE_URL}/auth/forgot-password", 
                               json={"email": TEST_EMAIL})
        if response.status_code == 200:
            data = response.json()
            if 'token' in data:
                token = data['token']
                # Test de réinitialisation
                reset_response = requests.post(f"{BASE_URL}/auth/reset-password", 
                                            json={
                                                "email": TEST_EMAIL,
                                                "token": token,
                                                "new_password": "nouveau123"
                                            })
                if reset_response.status_code == 200:
                    print(f"✅ Réinitialisation réussie: {reset_response.json()['message']}")
                else:
                    print(f"❌ Erreur de réinitialisation: {reset_response.status_code}")
                    print(f"   Détail: {reset_response.text}")
            else:
                print("❌ Pas de token dans la réponse")
        else:
            print(f"❌ Impossible d'obtenir un token: {response.status_code}")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Test terminé!")

if __name__ == "__main__":
    test_forgot_password() 