# Real dataset provenance

EMSCAD (Employment Scam Aegean Dataset), University of the Aegean: 17,880 manually labeled real job advertisements from 2012–2014. 17,014 legitimate and 866 fraudulent records. The model uses ONLY title, company profile, description, requirements and benefits, concatenated as plain text. No target, ID or privileged metadata becomes an input.

Primary publication: Vidros et al. (2017), *Automatic Detection of Online Recruitment Frauds: Characteristics, Methods, and a Public Dataset*, https://www.mdpi.com/1999-5903/9/1/6

Downloaded public mirror: https://raw.githubusercontent.com/Eric-Miao/INFO251-Job_Scam_Detection/main/Data/emscad_v1.csv
Mirror context: https://github.com/Eric-Miao/INFO251-Job_Scam_Detection

SHA256.txt verifies the exact input. split-manifest.json records the reproducible partition. HTML tags/entities and whitespace are normalized, text truncated to UI's 16,000-character limit, identical lowercase texts grouped; conflicting-label groups and <40-character posts removed. Remaining 15,804 rows split 80/20 stratified, seed 42. Near-duplicates and employer overlap can remain.

The historical, mostly English corpus is not India-specific and is not evidence of current scam detection performance. It contains scraped third-party text. The Kaggle Recruitment Scam listing declares CC0 (https://www.kaggle.com/datasets/amruthjithrajvr/recruitment-scam), but the mirror does not independently establish rights to every posting. MIT applies to this project's code only, not third-party ads. Review corpus terms before wider redistribution. The large raw CSV is fetched by the training script, not redistributed in this ZIP; its hash and source URL are committed.

The old synthetic-posts.csv has been removed. UI sample posts are invented examples, not held-out evaluation records.
