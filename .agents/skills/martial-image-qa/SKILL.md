---
name: martial-image-qa
description: Review martial arts illustrations for visible anatomical errors and agreement with the named position before publication on Martial Index.
---

Inspect the actual full-resolution image using vision, then its intended page crop. Review each person separately: trace head, neck, shoulders, elbows, wrists, hands, torso, hips, knees, ankles and feet. Account for limb ownership, visible digits, joint direction, occlusion, contact, balance and body intersections. Do not assume obscured anatomy is correct.

Evaluate anatomy separately from technique. Check the defining grips, contact points and relative body orientation against the page's named position. Consult primary instructional references when uncertain; visual plausibility does not certify safe or technically correct execution. Never label an AI picture expert verified.

Return a record per image with file, SHA-256, anatomy status, technique status, crop status, concrete observations and overall decision. Statuses: pass, revise, reject, needs-expert-review, pending-inspection. Only pass when visible evidence supports all three checks. Explain uncertainty precisely. A render not inspected has crop status pending-inspection. For defects give a focused regeneration prompt preserving the site's warm monochrome hue. Reinspect all regenerated files; approvals apply only to the reviewed bytes.

Review independently of the generating agent when possible. Do not treat earlier acceptance or attractive artwork as evidence. Withhold revise/reject/needs-expert-review/pending-inspection assets from publication and use a text layout until a replacement passes. Preserve existing authorization boundaries for commits and publishing.

Save approved publication records to `docs/image-qa-publication.json` with repo-relative master paths and SHA-256 for each derived WebP. Run `python scripts/check_image_qa.py` and `python scripts/check_images.py`. The GitHub Content and image QA check blocks a green result when a generated file is new, changed, or unapproved. Never fabricate pass records to satisfy this check. The check does not perform vision analysis; use this reviewer workflow first.
