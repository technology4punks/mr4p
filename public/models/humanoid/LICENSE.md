# Rigged robot — joney_lol

- Author: joney_lol
- Model page: https://poly.pizza/m/BwjA6Thdzd
- Original GLB: https://static.poly.pizza/d6a9c09f-5e0f-46af-9ec0-577e91dda457.glb
- Original poster: https://static.poly.pizza/d6a9c09f-5e0f-46af-9ec0-577e91dda457.jpg
- License: Creative Commons Attribution 3.0 Unported (CC BY 3.0)
- License URL: https://creativecommons.org/licenses/by/3.0/
- Legal code: https://creativecommons.org/licenses/by/3.0/legalcode.en
- Verified on: 2026-10-10

The model's own public page identifies the author and `Licence: CC-BY 3.0`.
Redistribution and adaptation are permitted with attribution, a license link,
and identification of modifications. Do not imply endorsement by the author.

Suggested visible attribution:

> “Rigged robot” by joney_lol, via Poly Pizza, licensed CC BY 3.0.
> https://poly.pizza/m/BwjA6Thdzd — https://creativecommons.org/licenses/by/3.0/
> Modified: repaired eight non-finite skin-weight vectors for Three.js compatibility;
> geometry, joint indices, materials and textures otherwise unchanged.

This local asset is a research candidate, not the active NEO model.
`RiggedRobot.glb` repairs the eight NaN weight vectors in accessor 13
(vertices 247, 248, 250, 252, 3098, 3099, 3101, 3103) to [1, 0, 0, 0].
All original joint indices for those vertices were [0, 0, 0, 0]; the repair binds
them to the first joint and prevents NaN world bounds.
