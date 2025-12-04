from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import tempfile
import json
import spacy
from spacy.matcher import PhraseMatcher
from skillNer.skill_extractor_class import SkillExtractor
import pytesseract
from pdf2image import convert_from_path
from datetime import datetime
from dateparser.search import search_dates
import re
from pymongo import MongoClient
from deep_translator import GoogleTranslator
from app.Databases.mongo import get_mongo_collections
import pandas as pd
import geonamescache
import warnings
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.decomposition import PCA
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from bson import ObjectId
from datetime import datetime

router = APIRouter()

warnings.simplefilter(action='ignore', category=FutureWarning)
nlp = spacy.load('en_core_web_lg')
gc = geonamescache.GeonamesCache()
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
SKILL_DB_PATH = r"C:\Users\khmir\Desktop\PFE_Web_DigitalCook\Backend\skill_db_relax_20.json"
TOKEN_DIST_PATH = r"C:\Users\Khmiri iheb\Desktop\PFE_Web_DigitalCook\Backend\app\file\token_dist.json"
with open(SKILL_DB_PATH, 'r', encoding='utf-8') as f:
    SKILL_DB = json.load(f)
skill_extractor = SkillExtractor(nlp, SKILL_DB, PhraseMatcher)


# Fonctions de comptage optimisées pour accepter un doc spaCy

def count_verbs(doc): return len([t for t in doc if t.pos_ == 'VERB'])
def count_adjectives(doc): return len([t for t in doc if t.pos_ == 'ADJ'])
def count_stopwords(doc): return len([t for t in doc if t.is_stop])
def count_nouns(doc): return len([t for t in doc if t.pos_ == 'NOUN'])
def count_digits(doc): return len([t for t in doc if t.is_digit])
def count_special_characters(doc): return len([t for t in doc if not t.text.isalnum() and not t.is_punct])
def count_punctuation(doc): return len([t for t in doc if t.is_punct])
def calculate_sentence_length(doc): return len(doc)


def clean_hyphenation(text):
    return re.sub(r'-\s*\n', '', text)


def extract_text_from_pdf(pdf_path):
    images = convert_from_path(pdf_path)
    all_text = ""
    for image in images:
        all_text += pytesseract.image_to_string(image, lang='eng+fra') + "\n"
    all_text = clean_hyphenation(all_text)
    temp_txt_path = pdf_path.replace('.pdf', '.txt')
    with open(temp_txt_path, 'w', encoding='utf-8') as f:
        f.write(all_text)
    return temp_txt_path


def extract_skills(skill_extractor, sentence):
    try:
        annotations = skill_extractor.annotate(sentence)
        unique_values = set()
        for item in annotations['results']['full_matches']:
            unique_values.add(item['doc_node_value'].lower())
        for item in annotations['results']['ngram_scored']:
            unique_values.add(item['doc_node_value'].lower())
        return list(unique_values)
    except Exception as e:
        print(f"Erreur compétences: {e}")
        return []

def count_skills(skill_extractor, sentence):
    return len(extract_skills(skill_extractor, sentence))

def detectSkills(skill_extractor, file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        cc = f.read()
    annotations = skill_extractor.annotate(cc)
    unique_values = set()
    for item in annotations['results']['full_matches']:
        skill = item['doc_node_value'].lower()
        unique_values.add(' '.join(dict.fromkeys(skill.split())))
    for item in annotations['results']['ngram_scored']:
        skill = item['doc_node_value'].lower()
        unique_values.add(' '.join(dict.fromkeys(skill.split())))
    unique_values.discard('')
    return list(unique_values)

def calculate_total_years_experience(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    lines = content.splitlines()
    total_years = 0
    experience_details = []
    printed_lines = set()
    
    for line in lines:
        original_line = line
        line = line.lower()
        line = re.sub(r"\b(months?|years?|mos|yr|yrs|mois|an|ans)\b", "", line, flags=re.IGNORECASE)
        line = line.replace(".", "").replace("/", " ").replace("-", " ")
        for kw in ["present", "today", "now", "aujourd'hui"]:
            line = line.replace(kw, datetime.now().strftime("%b %d, %Y"))
        parsed_date = search_dates(line, languages=["fr", "en"])
        if parsed_date:
            parsed_dates = [date[1] for date in parsed_date]
            if len(parsed_dates) >= 2:
                parsed_dates.sort()
                date1, date2 = parsed_dates[:2]
                diff_years = (date2.year - date1.year) + (date2.month - date1.month) / 12.0
                total_years += diff_years
                
                # Formater les dates pour l'affichage
                date1_str = date1.strftime("%B %Y")
                date2_str = date2.strftime("%B %Y")
                duration_str = format_years_months(diff_years)
                
                experience_details.append({
                    "line": original_line.strip(),
                    "start_date": date1_str,
                    "end_date": date2_str,
                    "duration": duration_str,
                    "years": round(diff_years, 2)
                })
                printed_lines.add(original_line)
    
    return {
        "total_years": round(total_years, 2),
        "total_formatted": format_years_months(total_years),
        "details": experience_details
    }

def detect_location(text, locations):
    return [loc for loc in locations if re.search(r'\b' + re.escape(loc) + r'\b', text, re.IGNORECASE)]

def detect_address(file_path):
    countries = [country['name'] for country in gc.get_countries().values()]
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    return detect_location(content, countries)

def clean_ref(ref):
    cleaned_ref = re.sub(r'\[|\]|\s+|DCE', '', ref, flags=re.IGNORECASE)
    match = re.search(r'Ref(\d+)', cleaned_ref, re.IGNORECASE)
    return f"ref{match.group(1)}" if match else "ref not found"

def train_dataset(*excel_paths):
    dataframes = [pd.read_excel(path) for path in excel_paths]
    dataset = pd.concat(dataframes, ignore_index=True)
    dataset = dataset.drop(dataset[(dataset['IsExperience'] == 'YES') & ((dataset['Sentence length'] < 3) | (dataset['Sentence length'] > 28))].index)
    dataset = dataset.drop(dataset[(dataset['IsExperience'] == 'YES') & (dataset['experiences'].str.contains("\\?"))].index)
    numeric_features = ['Verbs number', 'Adjectives number', 'Stopwords number', 'Sentence length',
                        'Nouns number', 'Special chars number', 'Punctuation number', 'Digits number', 'Skills number']
    numeric_transformer = Pipeline([('scaler', StandardScaler()), ('pca', PCA(n_components=2))])
    categorical_transformer = Pipeline([
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])
    preprocessor = ColumnTransformer([
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, ['experiences'])
    ])

    X = dataset.drop('IsExperience', axis=1)
    y = LabelEncoder().fit_transform(dataset['IsExperience'])

    X_transformed = preprocessor.fit_transform(X)

    classifier = RandomForestClassifier()
    classifier.fit(X_transformed, y)

    joblib.dump(classifier, 'random_forest_model.pkl')
    joblib.dump(preprocessor, 'preprocessor.pkl')

    return True

# Chargement unique du modèle et du préprocesseur
try:
    classifier = joblib.load('random_forest_model.pkl')
    preprocessor = joblib.load('preprocessor.pkl')
except Exception:
    classifier = None
    preprocessor = None


def predict(filepath):
    global classifier, preprocessor
    if classifier is None or preprocessor is None:
        raise Exception("Modèle ou préprocesseur non chargé")
    with open(filepath, 'r', encoding='utf-8') as file:
        sentences = file.readlines()
    data_list = []
    for sentence in sentences:
        doc = nlp(sentence)
        data_list.append(pd.DataFrame({
            'experiences': [sentence],
            'Verbs number': [count_verbs(doc)],
            'Adjectives number': [count_adjectives(doc)],
            'Stopwords number': [count_stopwords(doc)],
            'Sentence length': [calculate_sentence_length(doc)],
            'Nouns number': [count_nouns(doc)],
            'Special chars number': [count_special_characters(doc)],
            'Punctuation number': [count_punctuation(doc)],
            'Digits number': [count_digits(doc)],
            'Skills number': [count_skills(skill_extractor, sentence)]
        }))
    input_df = pd.concat(data_list, ignore_index=True)
    X_input = preprocessor.transform(input_df)
    predictions = classifier.predict(X_input)
    if hasattr(classifier, "predict_proba"):
        probas = classifier.predict_proba(X_input)[:, 1]
    else:
        probas = [None] * len(predictions)
    return [
        {
            "phrase": s.strip(),
            "proba": float(p) if p is not None else None,
            "label": int(l)
        }
        for s, p, l in zip(sentences, probas, predictions)
    ]

def translate_to_french(text_list):
    return [GoogleTranslator(source='auto', target='fr').translate(text) for text in text_list]

def translate_experiences_to_french(text_list):
    return [GoogleTranslator(source='auto', target='fr').translate(text) for text in text_list]

def offre_to_text(offre):
    fields = [
        offre.get("titre", ""),
        offre.get("soustitre", ""),
        offre.get("description", ""),
        offre.get("responsabilites", ""),
        offre.get("competenceRequises", ""),
        offre.get("qualificationRequises", "")
    ]
    return " ".join(fields)

def compute_similarity(cv_text, offre_text):
    vectorizer = TfidfVectorizer()
    tfidf = vectorizer.fit_transform([cv_text, offre_text])
    sim = cosine_similarity(tfidf[0:1], tfidf[1:2])
    return float(sim[0][0])

def extract_skills_from_offre(offre):
    # Essayer d'abord le format MongoDB, puis le format de test
    if 'competenceRequises' in offre:
        comp = offre.get('competenceRequises', '')
        skills = re.split(r'[;,\n]', comp)
        return set(s.strip().lower() for s in skills if s.strip())
    elif 'competences' in offre:
        return set(s.strip().lower() for s in offre['competences'] if s.strip())
    else:
        return set()

def extract_languages_from_offre(offre):
    # Essayer d'abord le format MongoDB, puis le format de test
    if 'langue' in offre:
        return set(l.lower().split(' ')[0] for l in offre.get('langue', []) if isinstance(l, str))
    elif 'langues' in offre:
        return set(l.lower().split(' ')[0] for l in offre['langues'] if isinstance(l, str))
    else:
        return set()

def normalize_langs(lang_list):
    return set(l.lower().split(' ')[0] for l in lang_list if isinstance(l, str))

def compute_global_score(cv_text, offre_text, cv_skills, offre_skills, cv_languages, offre_languages, has_experience, w_text=0.3, w_skills=0.3, w_langs=0.1, w_exp=0.1):
    text_score = compute_similarity(cv_text, offre_text)
    if cv_skills:
        skills_score = len(cv_skills & offre_skills) / len(cv_skills)
    else:
        skills_score = 0
    if cv_languages:
        langs_score = len(cv_languages & offre_languages) / len(cv_languages)
    else:
        langs_score = 0
    exp_score = 1 if has_experience else 0
    global_score = w_text * text_score + w_skills * skills_score + w_langs * langs_score + w_exp * exp_score
    return global_score, text_score, skills_score, langs_score, exp_score

def format_years_months(years_float):
    years = int(years_float)
    months = int(round((years_float - years) * 12))
    return f"{years} an{'s' if years > 1 else ''} {months} mois"

def serialize_mongo_data(data):
    """Convertit les données MongoDB en format JSON sérialisable"""
    if isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, dict):
        return {key: serialize_mongo_data(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_mongo_data(item) for item in data]
    else:
        return data

@router.get("/test-db")
def test_database():
    try:
        _, _, offres_col, _, _ = get_mongo_collections()
        total_offres = offres_col.count_documents({})
        active_offres = offres_col.count_documents({"status": "active"})
        
        # Récupérer quelques exemples d'offres
        sample_offres = list(offres_col.find({}, {"_id": 0}).limit(3))
        
        return JSONResponse(content={
            "total_offres": total_offres,
            "active_offres": active_offres,
            "sample_offres": sample_offres,
            "message": "Test de la base de données réussi"
        })
    except Exception as e:
        return JSONResponse(content={
            "error": str(e),
            "message": "Erreur lors du test de la base de données"
        })

@router.get("/offres/all")
def get_all_offres():
    try:
        print("DEBUG: Tentative de récupération des offres depuis MongoDB")
        _, _, offres_col, _, _ = get_mongo_collections()
        print(f"DEBUG: Collection offres trouvée: {offres_col}")
        
        # Récupérer toutes les offres actives
        offres = list(offres_col.find({"status": "active", "isDeleted": False}))
        print(f"DEBUG: Nombre d'offres récupérées: {len(offres)}")
        
        # Formater les offres pour le frontend
        offres_formatees = []
        for offre in offres:
            # Sérialiser les données MongoDB
            offre_serialized = serialize_mongo_data(offre)
            
            # Traiter les compétences
            competences_str = offre.get("competenceRequises", "")
            competences = [comp.strip() for comp in competences_str.split(",")] if competences_str else []
            
            # Traiter les langues
            langues = offre.get("langue", [])
            if isinstance(langues, str):
                langues = [langues]
            
            # Formater le salaire
            min_salaire = offre.get('minSalaire', 0)
            max_salaire = offre.get('maxSalaire', 0)
            devise = offre.get('deviseSalaire', '')
            salaire = f"{min_salaire} - {max_salaire} {devise}" if min_salaire and max_salaire else "Non spécifié"
            
            offre_formatee = {
                "id": offre_serialized.get("_id", ""),
                "titre": offre.get("titre", ""),
                "societe": offre.get("societe", ""),
                "ville": offre.get("ville", ""),
                "lieuSociete": offre.get("lieuSociete", ""),
                "competences": competences,
                "langues": langues,
                "salaire": salaire,
                "typeContrat": offre.get("typeContrat", ""),
                "experience": offre.get("experienceProfessionel", ""),
                "description": offre.get("description", ""),
                "responsabilites": offre.get("responsabilites", ""),
                "qualification": offre.get("qualificationRequises", ""),
                "disponibilite": offre.get("disponibilite", ""),
                "pays": offre.get("pays", ""),
                "onSiteOrRemote": offre.get("onSiteOrRemote", ""),
                "isUrgent": offre.get("isUrgent", False),
                "dateLimite": offre_serialized.get("dateLimite", ""),
                "documentRequis": offre.get("documentRequis", [])
            }
            offres_formatees.append(offre_formatee)
        
        print(f"DEBUG: Offres formatées: {len(offres_formatees)}")
        return JSONResponse(content=offres_formatees)
    except Exception as e:
        print(f"DEBUG: Erreur lors de la récupération des offres: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyse-cv")
def analyse_cv(file: UploadFile = File(...)):
    EXCEL_PATH1 = r"C:\Users\Khmiri\Desktop\PFE_Web_DigitalCook\Backend\app\file\dataset_experiences.xlsx"
    EXCEL_PATH2 = r"C:\Users\Khmiri\Desktop\PFE_Web_DigitalCook\Backend\app\file\dataset_final.xlsx"
    EXCEL_PATH3 = r"C:\Users\Khmiri\Desktop\PFE_Web_DigitalCook\Backend\app\file\dataset.xlsx"
    MODEL_PATH = 'random_forest_model.pkl'
    PREPROCESSOR_PATH = 'preprocessor.pkl'
    
    filename = file.filename.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name
    
    try:
        if not (os.path.exists(MODEL_PATH) and os.path.exists(PREPROCESSOR_PATH)):
            train_dataset(EXCEL_PATH1, EXCEL_PATH2, EXCEL_PATH3)
        
        if filename.endswith('.pdf'):
            txt_path = extract_text_from_pdf(tmp_path)
            skills = detectSkills(skill_extractor, txt_path)
            print(f"DEBUG: Compétences extraites: {skills}")  # Debug
            
            try:
                all_predictions = predict(txt_path)
                experiences = [item["phrase"] for item in all_predictions if item["label"] == 1]
                
                # Filtrer la phrase spécifique à supprimer (plus robuste)
                experiences = [exp for exp in experiences if not any([
                    "o Gathered requirements and designed system architecture." in exp,
                    "Gathered requirements and designed system architecture." in exp,
                    "Gathered requirements and designed system architecture" in exp
                ])]
                
                # Diviser les phrases qui contiennent des séparateurs (; ou .)
                split_experiences = []
                for exp in experiences:
                    # Diviser par point-virgule
                    if ';' in exp:
                        parts = exp.split(';')
                        for part in parts:
                            part = part.strip()
                            if part and not part.startswith('o '):
                                split_experiences.append(part)
                    else:
                        split_experiences.append(exp)
                
                # Filtrer les phrases qui contiennent des listes de technologies, langues, etc.
                filtered_experiences = []
                for exp in split_experiences:
                    # Vérifier si la phrase contient des patterns de listes
                    exp_lower = exp.lower()
                    
                    # Patterns à filtrer
                    patterns_to_filter = [
                        'technologies:', 'technology:', 'tech:',
                        'database administration:', 'db administration:',
                        'web frameworks:', 'frameworks:',
                        'devops tools:', 'tools:',
                        'data tools:', 'data:',
                        'languages:', 'langues:', 'lang:',
                        'english:', 'french:', 'arabic:',
                        'skills:', 'compétences:',
                        'softwares:', 'software:',
                        'platforms:', 'platform:',
                        'libraries:', 'library:',
                        'apis:', 'api:',
                        'databases:', 'database:',
                        'servers:', 'server:',
                        'cloud:', 'clouds:',
                        'os:', 'operating system:',
                        'methodologies:', 'methodology:',
                        'protocols:', 'protocol:',
                        'standards:', 'standard:'
                    ]
                    
                    # Vérifier si la phrase contient un pattern de liste
                    is_list_pattern = any(pattern in exp_lower for pattern in patterns_to_filter)
                    
                    # Vérifier si la phrase contient beaucoup de virgules (indicateur de liste)
                    comma_count = exp.count(',')
                    is_likely_list = comma_count >= 3 and len(exp.split(',')) >= 4
                    
                    # Vérifier si la phrase contient des tirets multiples (indicateur de liste de langues)
                    dash_count = exp.count('—') + exp.count('-')
                    is_language_list = dash_count >= 2 and any(lang in exp_lower for lang in ['english', 'french', 'arabic', 'spanish', 'german', 'italian'])
                    
                    # Si ce n'est pas un pattern de liste, l'ajouter
                    if not is_list_pattern and not is_likely_list and not is_language_list:
                        filtered_experiences.append(exp)
                
                experiences = filtered_experiences
                print(f"DEBUG: Expériences extraites après filtrage et division: {experiences}")  # Debug
                
            except Exception as e:
                print(f"DEBUG: Erreur lors de l'extraction des expériences: {e}")  # Debug
                all_predictions = []
                experiences = []
            
            duration_data = calculate_total_years_experience(txt_path)
            countries = detect_address(txt_path)
            cv_langues = ["Français (C1)", "Anglais (B2)"]
            experiences_original = experiences
            
            if experiences:
                experiences_fr = translate_experiences_to_french(experiences)
            else:
                experiences_fr = []
            
            with open(txt_path, 'r', encoding='utf-8') as f:
                cv_text = f.read()
            
            _, _, offres_col, _, _ = get_mongo_collections()
            offres = list(offres_col.find({"status": "active"}))
            print(f"DEBUG: Nombre d'offres trouvées: {len(offres)}")  # Debug
            
            # Si aucune offre n'est trouvée, afficher un message
            if not offres:
                print("DEBUG: Aucune offre trouvée dans MongoDB")
                offres = []
            
            seuil = 0.28
            matches = []
            
            if experiences_fr and offres:
                cv_text_for_match = " ".join(experiences_fr)
                cv_skills = set(s.lower() for s in skills)
                cv_languages = normalize_langs(cv_langues)
                has_experience = len(experiences_fr) > 0
                
                for offre in offres:
                    offre_text = offre_to_text(offre)
                    offre_skills = extract_skills_from_offre(offre)
                    offre_languages = extract_languages_from_offre(offre)
                    
                    # MODIFICATION: Vérifier qu'il y a au moins une compétence commune
                    matching_skills = list(cv_skills & offre_skills)
                    
                    # Ne continuer que s'il y a au moins une compétence commune
                    if len(matching_skills) > 0:
                        global_score, text_score, skills_score, langs_score, exp_score = compute_global_score(
                            cv_text_for_match, offre_text, cv_skills, offre_skills, cv_languages, offre_languages, has_experience
                        )
                        
                        matching_languages = list(cv_languages & offre_languages)
                        
                        if global_score > seuil:
                            matches.append({
                                "offre": {
                                    "titre": offre.get("titre", "Sans titre"),
                                    "societe": offre.get("societe", "N/A"),
                                    "ville": offre.get("ville", "N/A"),
                                    "lieuSociete": offre.get("lieuSociete", ""),
                                    "minSalaire": offre.get("minSalaire"),
                                    "maxSalaire": offre.get("maxSalaire"),
                                    "deviseSalaire": offre.get("deviseSalaire"),
                                    "salaireBrutPar": offre.get("salaireBrutPar"),
                                },
                                "global_score": global_score,
                                "matching_skills": matching_skills,
                                "matching_languages": matching_languages,
                                "detail": {
                                    "texte": text_score,
                                    "competences": skills_score,
                                    "langues": langs_score,
                                    "experience": exp_score
                                }
                            })
            
            result = {
                "competences": skills,
                "duree_experience": duration_data["total_formatted"],
                "duree_experience_details": duration_data["details"],
                "pays": countries,
                "experiences": experiences_original,
                "matches": matches,
                "cv_sentences_scores": all_predictions,
                "cv_text": cv_text
            }
            
            # Suppression de l'enregistrement du résultat dans la base de données MongoDB
            return JSONResponse(content=result)
        else:
            raise HTTPException(status_code=400, detail="Type de fichier non supporté. Envoyez un PDF.")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.remove(tmp_path)