# OfferGuard model card

TF-IDF unigrams/bigrams (12,000-feature limit, English stop words, sublinear TF, L2 normalization) plus class-weighted logistic regression, C=3, seed42. Trained on real historical EMSCAD text, not synthetic templates. Vocabulary/IDF fit on training only. Exported JSON is used by the Express backend for server inference, or by the browser in explicitly selected static/offline mode. Server mode transmits input for transient processing; opt-in PostgreSQL summaries contain scores/terms but no raw input text. See RENDER_SETUP.md.

17,880 original ads -> 15,804 unique usable texts -> 12,643 train / 3,161 test, including 142 fraud examples in test. Seed42 stratified random split after normalized exact-text deduplication. Metrics at threshold0.5: accuracy97.98%, AUROC0.9769, average precision0.8804, fraud precision75.00%, recall82.39%, F1 .7852. Majority-class accuracy95.51%. Confusion matrix [[2980,39],[25,117]].

These numbers are a historical holdout experiment, not real-world accuracy promises. Near-duplicates and employer overlap can remain across splits, and may inflate results. No temporal, India-specific, multilingual or adversarial test. Data is from2012–2014; domain shift is expected. Model score is uncalibrated, especially because class weighting changes the training prior. Low score never verifies legitimacy.

Signed text contributions are model log-odds contributions. Independent regex highlights do not explain the model and can flag negated phrases (e.g. 'no registration fee'). Verify recruiter/company identity separately. No identity lookup or domain reputation service included.

Reproduce: python training/train.py after installing training/requirements.txt. Raw corpus downloads from the pinned provenance URL, SHA256 must match. Dataset provenance and licensing caveat in data/README.md. Browser/Python probabilities tested to1e-10 on fixed fixtures, including real held-out text.
