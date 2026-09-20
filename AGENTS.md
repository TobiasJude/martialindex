# Martial Index editing

Search results must navigate to the canonical article URL. Do not replace full posts with placeholder entity overlays.

For generated or edited martial-arts illustrations, use `.agents/skills/martial-image-qa/SKILL.md` before publication. Inspect actual pixels and the desktop/mobile page render. Preserve the existing warm monochrome hue. Do not infer technical accuracy from anatomy alone. Withhold failed or uncertain depictions; record actual observations and exact file hashes in `docs/image-qa-publication.json`. Do not update an approval hash without reviewing the changed image.

Run `python scripts/check_images.py` (requires Pillow) and `python scripts/check_image_qa.py` before proposing publication. These checks validate assets and review records; they do not perform visual reasoning. Keep captions truthful about AI-generated illustrations and about whether a diagram shows a setup or completed technique.

Keep the search index and sitemap aligned with canonical pages. Preserve analytics and site verification configuration unless the task explicitly changes them.
