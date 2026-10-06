from pathlib import Path
import json,csv,gzip,hashlib,urllib.request,re,html
from collections import Counter
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score,roc_auc_score,confusion_matrix,precision_score,recall_score,f1_score,average_precision_score
P=Path(__file__).resolve().parents[1]
URL='https://raw.githubusercontent.com/Eric-Miao/INFO251-Job_Scam_Detection/main/Data/emscad_v1.csv'
raw=P/'data/emscad_v1.csv'
if not raw.exists():
    print('Downloading public EMSCAD mirror...');urllib.request.urlretrieve(URL,raw)
sha=hashlib.sha256(raw.read_bytes()).hexdigest()
expected=(P/'data/SHA256.txt').read_text().split()[0]
if sha!=expected: raise ValueError('Dataset hash mismatch. Inspect provenance before changing SHA256.txt.')
def clean(s): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',s))).strip()
rows=list(csv.DictReader(raw.open()))
# Match the app: plain pasted text only. No privileged metadata, IDs or target leakage.
groups={}
for row in rows:
    text=clean(' '.join(row[k] for k in ['title','company_profile','description','requirements','benefits']))[:16000]
    key=text.lower(); label=int(row['fraudulent']=='t')
    groups.setdefault(key,{'text':text,'labels':set()})['labels'].add(label)
# Conflicting exact-text labels are excluded; identical text occurs in only one partition.
unique=[(x['text'],next(iter(x['labels']))) for x in groups.values() if len(x['labels'])==1 and len(x['text'])>=40]
texts=[x[0] for x in unique]; labels=np.array([x[1] for x in unique])
train,test=train_test_split(np.arange(len(texts)),test_size=.2,random_state=42,stratify=labels)
vec=TfidfVectorizer(lowercase=True,token_pattern=r'(?u)\b\w\w+\b',ngram_range=(1,2),sublinear_tf=True,stop_words='english',max_features=12000,min_df=3)
X=vec.fit_transform([texts[i] for i in train]);clf=LogisticRegression(C=3,class_weight='balanced',max_iter=2000,random_state=42).fit(X,labels[train])
prob=clf.predict_proba(vec.transform([texts[i] for i in test]))[:,1];truth=labels[test];pred=prob>=.5
metrics={'accuracy':accuracy_score(truth,pred),'roc_auc':roc_auc_score(truth,prob),'average_precision':average_precision_score(truth,prob),'precision':precision_score(truth,pred),'recall':recall_score(truth,pred),'f1':f1_score(truth,pred),'confusion_matrix':confusion_matrix(truth,pred).tolist(),'train_rows':len(train),'test_rows':len(test),'test_fraud_rows':int(truth.sum()),'original_rows':len(rows),'unique_rows':len(unique),'majority_baseline':float((truth==0).mean()),'split':'Seed-42 stratified 80/20 split after normalized exact-text deduplication. TF-IDF fitted on training only. Near-duplicates and employer overlap may remain; not a temporal or India-specific evaluation.'}
model={'kind':'tfidf-logistic','stopWords':sorted(ENGLISH_STOP_WORDS),'vocabulary':{k:int(v) for k,v in vec.vocabulary_.items()},'idf':vec.idf_.tolist(),'coefficients':clf.coef_[0].tolist(),'intercept':float(clf.intercept_[0]),'metrics':metrics,'seed':42,'dataset':'EMSCAD: 17,880 real job ads labeled legitimate/fraudulent, collected 2012-2014. Public University of the Aegean corpus via GitHub mirror. Class-weighted model score is not calibrated fraud probability.','source':URL,'sha256':sha}
(P/'models/model.json').write_text(json.dumps(model));print(json.dumps(metrics,indent=2))
checks=['Pay a registration fee and transfer money today. Guaranteed job without an interview.','Apply through our official company careers portal. We never charge candidates any recruitment fees.','Python SQL developer paid internship with code review and testing.']+[texts[int(test[0])],texts[int(test[1])]]
(P/'tests/parity.json').write_text(json.dumps([{'text':t,'expected':float(clf.predict_proba(vec.transform([t]))[0,1])} for t in checks]))
(P/'data/split-manifest.json').write_text(json.dumps({'seed':42,'sha256':sha,'train_indices':train.tolist(),'test_indices':test.tolist(),'deduplicated_order':'first occurrence in raw CSV after tag/entity/whitespace cleanup, lowercase grouping; exclude conflicting labels and <40 chars'}))
