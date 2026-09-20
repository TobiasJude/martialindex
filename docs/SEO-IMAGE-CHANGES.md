# SEO and image maintenance

This remains a static HTML/CSS/JavaScript site. Grok Bot and other editors can continue editing the committed files directly; no build step is required for hosting.

## September 2026 changes

- Responsive WebP renditions for 192 existing raster sources after incorporating the latest main branch. The initial pass updated 3,014 placements across 794 pages; the merged branch contains 3,426 validated responsive placements. Original files and attribution remain available.
- Removed the repeated “live batch links—not a thin glossary stub” production paragraph from 442 articles. Replaced the 1-2-3-2 filename note with its actual punch sequence and removed “live batch links” from Tachi-waza descriptions.
- Four distinct generated editorial illustrations: Closed Guard, Open Guard, High Guard, and Scissor Sweep. Article figures, associated recommendation cards, and the four articles’ social/structured-data images use the appropriate subject. These illustrations are not documentary photographs.
- Matched the existing warm archival monochrome / soft-sepia appearance. The hue treatment is baked into the final PNG/WebP assets, including social images. Do not replace them with the earlier blue-gi drafts. Preserve the existing post65 grayscale/saturation/contrast filters and masks, which are still applied to the new images.
- Preserve the full illustrated pose using contain sizing in article/card frames and natural height in the session image.

## Working with images

For existing photos, run `python scripts/optimize_images.py` with Pillow installed. It preserves originals, creates 480/768/1200px variants (without enlarging small sources), and updates newly added original-source HTML img tags. Existing responsive references remain intact. The source-to-variant manifest is in `media/responsive/manifest.json`.

Generated illustrations live separately in `media/illustrations/`; the PNG is the hue-treated master and the WebP files are responsive renditions. Preserve the manifest, truthful alt text, AI illustration captions, and the article-specific Open Graph, Twitter, and Article image references. Technical pose accuracy needs editorial review just like written technique instructions.

Run `python scripts/check_images.py` to validate local image files, dimensions, width descriptors, the four social preview mappings, and JSON-LD syntax. It does not certify martial arts technique accuracy or Google rich-result eligibility. The latest upstream commit also references 20 missing image sources across 91 pages, documented in existing-missing-images.json. Default validation reports these errors; --allow-known-missing accepts only those exact pre-existing page/source pairs and still fails on new missing assets.

## Remaining editorial work

This is an initial implementation, not a claim that every catalog image has been regenerated or every article rewritten. The public sitemap audit covers 812 URLs; it identifies additional generic imagery, production language, unfinished guides, and overlapping search intent. Prioritize subsequent article and image batches with GSC query/page performance and GA engagement data. Neither dashboard was accessed during this pass.

Retain the existing GA integration in js/capture.js and existing domain verification. GitHub exposes a github-pages deployment; confirm the actual Cloudflare/DNS arrangement before changing hosting configuration.

## Validation against current main

Rebased on 878835f5, preserving the latest Explore/Sessions navigation, new term pages, homepage hero, and post65 layout. Browser review confirmed the new Closed Guard image loads with srcset and the existing post65 filters on a 390px viewport. Original archive tone is preserved by conversion; the largest responsive variants total about 32% fewer bytes than the 192 originals (not a measured whole-page speed improvement).

## Learning and QA update — 20 September 2026

Homepage search now links directly to canonical full posts, including keyboard selection and ordinary browser link behavior. The catalog contains 956 searchable posts/guides and 967 canonical sitemap URLs. Removed unavailable Markdown links and repaired the missing neck-crank destination; local destination audit reports zero broken links across 968 index documents.

Rebuilt the shared reading presentation across 923 term posts: clearer spacing and text measure, takeaways before hero videos where applicable, a route to beginner guides, sticky desktop contents, and full-pose illustration frames. Added four original beginner guides for BJJ, Muay Thai, wrestling and MMA, plus a homepage learning section. Corrected closed-guard definition and overgeneralized gi/no-gi claims, synchronized FAQ structured data, and clarified spider-guard language. This is targeted editorial repair, not an expert fact-check of every technique in the catalog.

Seven generated illustrations passed independent visible anatomy/position review and root desktop/mobile crop review. Butterfly drafts did not meet technical clarity requirements and are withheld. Eighteen previously broken placements now use relevant reviewed illustrations; 167 unsupported broken image elements were removed rather than filled with unrelated art. Relevant existing archive imagery remains, with responsive delivery from the earlier pass. No missing local image sources remain. The warm monochrome theme is retained through the existing filter values.

The repository skill `.agents/skills/martial-image-qa/SKILL.md` is the reusable visual reviewer. It records visible anatomical evidence, named-position accuracy, and crop decisions. `scripts/check_image_qa.py` verifies exact master/derivative hashes and approval status; GitHub's Content and image QA workflow runs that gate plus the image integrity check. It does not itself analyze pixels or replace expert review. Changed artwork requires a new visual review, not just updated hashes.

Validation: image integrity and JSON-LD checks; all local link targets; changed-file and rejected-status negative checks for the QA gate; skill validation; JavaScript syntax; desktop 1280×1000 and mobile 390×844 visual checks; homepage Enter-to-Closed-Guard and click-to-Spider-Guard navigation. GA/GSC private performance reports were not accessed. No ranking gains are claimed. Existing analytics configuration retained.
