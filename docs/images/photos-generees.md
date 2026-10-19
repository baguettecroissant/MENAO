# MENAO — Photos générées

**images générées par IA, personnes fictives**

Date de génération : **2026-10-10**. Cette série illustre les métiers du bâtiment et une rencontre fictive dans les Alpes-Maritimes. Les personnes représentées ne sont pas présentées comme des artisans inscrits sur MENAO ni comme des clients témoignant de leur expérience. Les images ne comportent ni prénom ni badge d’identification.

Les 37 sorties ont été produites avec l’outil intégré `image_gen` : deux variantes initiales pour chacun des 16 visuels, puis cinq sorties de correction supplémentaires. **L’identifiant précis du modèle n’est pas exposé par cet outil** ; aucun nom de modèle n’est donc attribué par supposition.

## Fichiers livrés

Poids exprimés en Ko décimaux : **1 Ko = 1 000 octets**. Les liens « Prompt exact » mènent au texte réellement transmis pour la sortie retenue ; lorsqu’il s’agit d’une édition, son image parent est identifiée par sa variante et son prompt est conservé plus bas.

| Fichier | Prompt exact | Outil / modèle | Date | Dimensions | Poids (Ko) |
|---|---|---|---|---|---:|
| [apps/web/public/images/accueil-bandeau.webp](../../apps/web/public/images/accueil-bandeau.webp) | [Prompt exact](#prompt-accueil-bandeau) | `image_gen` — modèle non exposé | 2026-10-10 | 1536 × 1024 | 143,510 |
| [apps/web/public/images/metiers/electricien.webp](../../apps/web/public/images/metiers/electricien.webp) | [Prompt exact](#prompt-electricien) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 78,862 |
| [apps/web/public/images/metiers/plombier.webp](../../apps/web/public/images/metiers/plombier.webp) | [Prompt exact](#prompt-plombier) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 85,108 |
| [apps/web/public/images/metiers/chauffagiste.webp](../../apps/web/public/images/metiers/chauffagiste.webp) | [Prompt exact](#prompt-chauffagiste) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 74,828 |
| [apps/web/public/images/metiers/climaticien.webp](../../apps/web/public/images/metiers/climaticien.webp) | [Prompt exact](#prompt-climaticien) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 99,764 |
| [apps/web/public/images/metiers/macon.webp](../../apps/web/public/images/metiers/macon.webp) | [Prompt exact](#prompt-macon) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 147,478 |
| [apps/web/public/images/metiers/peintre.webp](../../apps/web/public/images/metiers/peintre.webp) | [Prompt exact](#prompt-peintre) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 74,016 |
| [apps/web/public/images/metiers/plaquiste.webp](../../apps/web/public/images/metiers/plaquiste.webp) | [Prompt exact](#prompt-plaquiste) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 67,148 |
| [apps/web/public/images/metiers/carreleur.webp](../../apps/web/public/images/metiers/carreleur.webp) | [Prompt exact](#prompt-carreleur) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 56,626 |
| [apps/web/public/images/metiers/menuisier.webp](../../apps/web/public/images/metiers/menuisier.webp) | [Prompt exact](#prompt-menuisier) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 85,318 |
| [apps/web/public/images/metiers/charpentier.webp](../../apps/web/public/images/metiers/charpentier.webp) | [Prompt exact](#prompt-charpentier) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 106,834 |
| [apps/web/public/images/metiers/couvreur.webp](../../apps/web/public/images/metiers/couvreur.webp) | [Prompt exact](#prompt-couvreur) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 136,112 |
| [apps/web/public/images/metiers/facadier.webp](../../apps/web/public/images/metiers/facadier.webp) | [Prompt exact](#prompt-facadier) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 102,222 |
| [apps/web/public/images/metiers/serrurier.webp](../../apps/web/public/images/metiers/serrurier.webp) | [Prompt exact](#prompt-serrurier) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 80,920 |
| [apps/web/public/images/metiers/terrassier.webp](../../apps/web/public/images/metiers/terrassier.webp) | [Prompt exact](#prompt-terrassier) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 166,506 |
| [apps/web/public/images/metiers/paysagiste.webp](../../apps/web/public/images/metiers/paysagiste.webp) | [Prompt exact](#prompt-paysagiste) | `image_gen` — modèle non exposé | 2026-10-10 | 800 × 1200 | 153,840 |

Poids total des 16 fichiers : **1659,092 Ko**.

## Images dérivées

Les images de partage `apps/web/public/images/og/*.jpg` (1200 × 630, ADR 0094) reprennent ces photos : le bandeau pour `menao.jpg`, et la photo de chaque métier pour l'image du métier. Elles montrent donc les mêmes personnes fictives. Pour les remplacer par de vraies photos, voir [photos-reelles.md](photos-reelles.md).

## Conversion et provenance

- Format livré : WebP, **qualité 80**, encodeur configuré avec **method 6** ; métadonnées EXIF, XMP et profil ICC supprimés.
- Bandeau : génération et livraison en **1536 × 1024**, sans agrandissement ; plafond de 350 Ko respecté.
- Métiers : génération en **1024 × 1536**, réduction en **800 × 1200** ; plafond de 180 Ko respecté pour chaque image.
- Les PNG originaux, variantes écartées et fichiers intermédiaires sont conservés hors du dépôt. Seuls les WebP sélectionnés sont versionnés.
- La direction artistique commune utilise une lumière naturelle, des tons chauds modérés, des ombres légèrement bleutées et des tenues bleu marine sans marque.

## Contrôle visuel et sélection

La revue a porté sur les visages, les mains visibles, les prises des outils, les équipements de protection montrés, les inscriptions et le cadrage. Les vues retenues présentent des mains visuellement naturelles sans doigt supplémentaire apparent ; certains doigts restent naturellement cachés par les outils, les gants ou la pose. Les équipements et gestes ont été examinés pour leur plausibilité visuelle. Cette revue ne constitue pas une expertise métier ni une certification de sécurité du chantier représenté. Aucun texte, logo, marque ou filigrane visible n’a été repéré dans les sélections finales.

### Journal des variantes et corrections

Chaque visuel dispose de deux variantes initiales. Le total de **37 sorties** se répartit ainsi : électricien **4**, plaquiste **3**, serrurier **4**, et **2** pour chacun des 13 autres visuels. Les cinq sorties supplémentaires corrigent des défauts constatés ; une contrainte précisée entre les deux variantes initiales ne compte pas comme une troisième sortie.

| Visuel | Sorties | Variante retenue | Décision et corrections |
|---|---:|---|---|
| Bandeau d’accueil | 2 | B | B retenue pour son groupe plus compact, son geste à main ouverte et sa tablette fermée ; A moins adaptée au cadrage. |
| Électricien | 4 | d | A écartée : pseudo-inscriptions et contact de sonde ambigu. B : sonde sur un cache plastique et disjoncteurs trop simplifiés. C : sondes près des manettes. D est une édition de C : contacts déplacés vers des vis métalliques distinctes, doigts derrière les protections, écran du multimètre hors vue. |
| Plombier | 2 | b | B retenue : clé sur un raccord hexagonal et prise à deux mains plausible. A écartée : clé semblant saisir une partie ronde. |
| Chauffagiste | 2 | a | A retenue : manomètre sans chiffres lisibles, dos de tablette visible, action plus représentative que B. |
| Climaticien | 2 | b | B retenue : clé à douille sur le pied de fixation, mains gantées et tiers inférieur plus dégagé. A plus serrée. |
| Maçon | 2 | b | B retenue : truelle sur le mortier, niveau à plat, gants et casque. A moins équilibrée et rangs moins lisibles. |
| Peintre | 2 | 2 | V2 retenue : prise du rouleau plausible, gants, visage naturel et bas du cadre plus calme. |
| Plaquiste | 3 | 3 | V1 et V2 présentent un petit marquage sur le mètre. V3 est une édition de V2 supprimant les marquages du mètre, de la visseuse et de sa batterie. |
| Carreleur | 2 | 2 | V2 retenue : maillet, genouillères, colle peignée et croisillons visibles, tiers inférieur calme. |
| Menuisier | 2 | 2 | V2 retenue : lunettes, cheveux attachés et prise du rabot aux deux poignées ; établi plus adapté à une légende que V1. |
| Charpentier | 2 | 2 | V1 écartée : inscriptions sur la batterie et ancrage de longe hors cadre. V2 générée avec contraintes précisant un outil sans inscription et un ancrage supérieur visible ; casque, lunettes et harnais visibles. |
| Couvreur | 2 | 1 | V1 retenue : tuile tenue avec des gants, harnais relié à une ligne visible. V2 moins aérée et harnais moins lisible. |
| Façadier | 2 | 2 | V1 écartée : petites inscriptions sur le gant droit. V2 retenue : gants sans marquage visible, casque, lunettes, taloche et garde-corps visibles. |
| Serrurier | 4 | 4 | V1 et V2 écartées pour le positionnement du tournevis par rapport au cylindre. V3 régénérée avec la porte entrouverte et la vis sur le chant ; V4 est une édition de V3 supprimant le marquage du mètre dans la boîte à outils. |
| Terrassier | 2 | 1 | V1 retenue : casque, lunettes, gilet, gants ; mini-pelle représentée à l’arrêt et travailleur éloigné du godet. V2 moins adaptée à une carte métier. |
| Paysagiste | 2 | 2 | V2 retenue : visage naturel, mains gantées, chapeau et plantation d’un jeune olivier ; tiers inférieur plus calme que V1. |

## Prompts exacts des sorties retenues

Les blocs suivants reproduisent intégralement les prompts transmis à l’outil, direction artistique commune comprise. Ils sont en anglais, comme les instructions de génération. Pour une édition, le prompt seul ne remplace pas l’image parent : le chaînage indique la variante utilisée comme référence.

<a id="prompt-accueil-bandeau"></a>

### Bandeau d’accueil — sortie B

```text
Photorealistic editorial photograph in landscape format. Late-afternoon golden light on the French Riviera. In front of a freshly renovated contemporary villa (smooth white render, large glass sliding doors, terracotta pots, an olive tree, lavender), two building professionals in plain navy-blue work polo shirts and dark work trousers talk with a homeowner. Left of the group: a woman in her 30s, hair tied back, holding a closed tablet against her chest. Middle: a man in his late 40s with a short salt-and-pepper beard, explaining with an open-hand gesture. Right: the homeowner, a man in his 30s in a casual olive-green linen shirt, smiling and nodding. Candid, warm, trustworthy interaction, genuine smiles, nobody looks at the camera. The group stands in the RIGHT HALF of the frame, framed from mid-thigh up, eye level, 35 mm, f/2.8, background softly out of focus. The LEFT 45 % of the image stays calm and uncluttered (soft-focus facade, sky, greenery) because a white headline will be placed there.

Output size: 1536×1024 pixels. Single photograph, no collage. All people are fictional adults with no resemblance to real or famous people. No MENAO badge. Tablet closed with no visible screen. Variant 2: a relaxed conversational instant, compact group entirely inside the rightmost 50 percent of the frame, natural small open-palm explanatory gesture with five clearly distinguishable fingers, all three faces clearly separated and visible. The left half is quiet soft-focus villa facade and greenery, minimal visual detail. Slightly wider scene, olive tree beside the villa.

Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-electricien"></a>

### Électricien — sortie d

D est une édition de la variante C. [Prompt exact de la variante parent](#archive-electricien-c).

```text
Use case: precise-object-edit. Edit this fictional MENAO electrician photo, preserving the person, face, hard hat, glasses, navy clothes, lighting, room, camera, framing and portrait 1024×1536 dimensions. Change only the electrical test arrangement so it is technically plausible: BOTH probe tips must contact round metal screw heads on the upper and lower TERMINAL ROWS of a circuit breaker, far away from the central black toggle levers. The red probe should contact an upper screw terminal, clearly above the line of toggle levers; the black probe should contact a different lower screw terminal clearly below the toggle levers. Small repositioning of forearms and hands is allowed solely to reach the terminals. Insulated probes are gripped behind their safety guards. Preserve natural hands without extra digits, the multimeter on the shelf with screen turned away, and two coherent test leads. Plain circuit breakers without text, logos or labels, but real toggle levers and visible terminal screw heads. The circuit is isolated. No probe should touch a plastic lever or blank plastic cover.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-plombier"></a>

### Plombier — sortie b

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A young plumber in his late 20s with a short beard, navy work shirt and grey canvas apron, kneeling to connect copper and white multilayer pipes under a modern bathroom vanity, adjustable wrench in hand, daylight from a frosted window.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Accurate plumbing: the adjustable wrench jaws tightly grip the FLAT FACES OF A HEXAGONAL BRASS COMPRESSION NUT, not a round pipe, while his other hand steadies the fitting. The basin has a separate simple white drain trap. Copper and white multilayer water supply pipes connect logically. Entirely unmarked tools and equipment.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-chauffagiste"></a>

### Chauffagiste — sortie a

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A heating engineer, a woman in her 40s, navy work fleece, checking the pressure gauge of a modern white wall-mounted boiler in a clean laundry room, holding a tablet whose screen is not visible, soft daylight.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
The boiler is entirely unbranded and unmarked. The pressure gauge is a small realistic analog dial with tick marks but no numbers or letters. Tablet screen is turned away, no readable content. Show a straightforward visual inspection of the pressure gauge.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-climaticien"></a>

### Climaticien — sortie b

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
An air-conditioning technician in his 30s, navy polo and safety gloves, installing the outdoor unit of a split air conditioner on the terrace of a light-stone Mediterranean house, sea and hills softly blurred behind, bright morning sun.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Plain unbranded outdoor unit with no labels or inscriptions. Kneeling at ground level, he is tightening an exposed hexagonal mounting bolt at the base with a correctly held ratchet socket wrench and stabilizing the unit with his other gloved hand. Visible stable mounting feet and level terrace.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-macon"></a>

### Maçon — sortie b

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A mason in his 40s with a yellow hard hat and work gloves, navy work clothes, laying concrete blocks with a trowel and checking them with a spirit level on a sunny house construction site in the south of France, mortar texture visible.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
A coherent moment in masonry: his left gloved hand steadies a plain unmarked spirit level resting flat on a freshly laid concrete block, while his right gloved hand holds a triangular steel trowel at the mortar bed next to it. Stable level ground, no exposed height, anatomically natural gloves and hands, no markings on any tools.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-peintre"></a>

### Peintre — sortie 2

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A house painter, a woman in her 30s with curly hair under a cap, navy dungarees lightly speckled with paint, rolling warm white paint onto a living-room wall, drop cloths on a parquet floor, large window with soft light.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-plaquiste"></a>

### Plaquiste — sortie 3

V3 est une édition de la variante V2. [Prompt exact de la variante parent](#archive-plaquiste-2).

```text
Use case: precise-object-edit.
Edit this fictional drywall installer photograph. Preserve the fictional person, face, natural hand anatomy, grip, action, pose, composition, safety glasses, lighting, workshop, and all other details. Remove every letter, logo, brand-like marking and label from the cordless screwdriver, its battery, and the tape measure on his belt. In particular replace the small yellow pseudo-word on the front of the tape measure with a completely plain matte dark-grey surface. All equipment surfaces must be unbranded and unlettered. Do not add any text. Output portrait 1024×1536 pixels.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-carreleur"></a>

### Carreleur — sortie 2

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A tiler in his 50s on knee pads, navy work clothes, setting a large-format light-grey porcelain tile with spacers and tapping it with a white rubber mallet on a bathroom floor, notched adhesive visible.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-menuisier"></a>

### Menuisier — sortie 2

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A joiner, a woman in her 30s with her hair tied back, navy work apron and safety glasses, planing a solid oak board at a workbench in a warm wooden workshop, fine sawdust floating in a sunbeam.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-charpentier"></a>

### Charpentier — sortie 2

```text
A timber framer in his 40s with a hard hat and safety harness, navy work clothes, fixing a wooden rafter on a new house roof frame, clear blue sky, view from slightly below.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Safety detail: the correctly fitted full body harness has a clearly connected safety lanyard secured to a structural anchor above the worker. Every visible surface of the drill, battery, helmet, harness and all tools is completely blank and unbranded, with no stickers, labels, writing or tiny markings.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-couvreur"></a>

### Couvreur — sortie 1

```text
A roofer in his 30s with a safety harness clipped to an anchor line, navy work clothes and gloves, laying traditional terracotta roof tiles on a Provençal house, hills and Mediterranean pines blurred in the background, warm late-afternoon light.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Safety detail: the correctly fitted full body harness is visibly clipped by a taut safety lanyard to a secure anchor line running uphill to an anchor above the worker. Wear a plain hard hat. All equipment and tools have fully blank unbranded surfaces, no stickers, labels or tiny writing.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-facadier"></a>

### Façadier — sortie 2

```text
A façade worker, a woman in her 40s, on secure scaffolding with guardrails, hard hat, navy work clothes, applying a smooth light-ochre render to a Mediterranean building facade with a stainless-steel float, morning light.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Safety detail: a stable scaffold platform with continuous top rail, midrail and toe boards at the open edge. The worker wears clear safety glasses and appropriate protective gloves while correctly gripping the float handle. No markings or labels on any equipment.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-serrurier"></a>

### Serrurier — sortie 4

V4 est une édition de la variante V3 ; V3 est une nouvelle génération corrective indépendante de V1 et V2. [Prompt exact de la variante parent](#archive-serrurier-3).

```text
Use case: precise-object-edit.
Edit only the tool markings in the supplied fictional locksmith photograph. Preserve the entire photograph, person, face, hands, screwdriver and its contact with the retaining screw on the narrow edge of the open door, door, composition and lighting. The yellow-and-black tape measure inside the open toolbox in the lower left currently has tiny yellow lettering on its black center. Remove that lettering and make this center a plain matte black circle. Remove any other labels or text from all tools, leaving unbranded tools with no marks. Do not change anything else. Output portrait 1024×1536 pixels.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-terrassier"></a>

### Terrassier — sortie 1

```text
A groundworks operator in his 30s, hi-vis vest over navy work clothes and a hard hat, next to a compact mini-excavator digging a clean foundation trench on a sunny plot with Mediterranean vegetation.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Safety detail: the excavator is paused while the worker stands well outside its bucket swing radius and away from the trench edge on stable ground. The trench is shallow, with stable side slopes. The machine is completely unbranded and all clothing, machinery and tools are blank, without safety labels, numbers, writing or logos. Machine cab has no visible screen content.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

<a id="prompt-paysagiste"></a>

### Paysagiste — sortie 2

```text
A landscaper, a woman in her 20s, navy work clothes, gardening gloves and a sun hat, planting a young olive tree among lavender and rosemary in a sunny Mediterranean garden with dry-stone walls.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

## Archive des autres variantes et des prompts parents

Les prompts des sorties non retenues sont archivés ci-dessous pour conserver la comparaison et la provenance des éditions. Les PNG correspondants ne sont pas versionnés. Les prompts identiques apparaissent plusieurs fois lorsqu’ils ont été utilisés pour des générations distinctes.

<a id="archive-accueil-bandeau-a"></a>

<details>
<summary>Bandeau d’accueil — variante A</summary>

Interaction plausible ; geste à deux mains et groupe moins compact que la variante B.

```text
Photorealistic editorial photograph in landscape format. Late-afternoon golden light on the French Riviera. In front of a freshly renovated contemporary villa (smooth white render, large glass sliding doors, terracotta pots, an olive tree, lavender), two building professionals in plain navy-blue work polo shirts and dark work trousers talk with a homeowner. Left of the group: a woman in her 30s, hair tied back, holding a closed tablet against her chest. Middle: a man in his late 40s with a short salt-and-pepper beard, explaining with an open-hand gesture. Right: the homeowner, a man in his 30s in a casual olive-green linen shirt, smiling and nodding. Candid, warm, trustworthy interaction, genuine smiles, nobody looks at the camera. The group stands in the RIGHT HALF of the frame, framed from mid-thigh up, eye level, 35 mm, f/2.8, background softly out of focus. The LEFT 45 % of the image stays calm and uncluttered (soft-focus facade, sky, greenery) because a white headline will be placed there.

Output size: 1536×1024 pixels. Single photograph, no collage. All people are fictional adults with no resemblance to real or famous people. No MENAO badge. Tablet closed with no visible screen. Variant 1: gently candid conversational moment, all three faces and the open gesturing hand clearly separated, compact group on the right.

Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-electricien-a"></a>

<details>
<summary>Électricien — variante a</summary>

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A focused electrician in his late 50s, white hard hat and clear safety glasses, navy work jacket, testing a modern residential electrical panel full of white circuit breakers with a multimeter, bright utility room, warm side light from a window.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-electricien-b"></a>

<details>
<summary>Électricien — variante b</summary>

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A focused electrician in his late 50s, white hard hat and clear safety glasses, navy work jacket, testing a modern residential electrical panel full of white circuit breakers with a multimeter, bright utility room, warm side light from a window.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
All circuit breakers and instruments must be entirely unmarked, without printed labels, symbols, lettering or numbers. The multimeter display is turned away from the camera. Correct insulated test leads and probe grip; a safely isolated domestic circuit.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-electricien-c"></a>

<details>
<summary>Électricien — variante c</summary>

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A focused electrician in his late 50s, white hard hat and clear safety glasses, navy work jacket, testing a modern residential electrical panel full of white circuit breakers with a multimeter, bright utility room, warm side light from a window.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Correct electrical testing: the multimeter rests securely on an adjacent shelf, its display turned away. The electrician holds TWO insulated test probes, one in each hand, with fingers behind the probe guards. Each probe tip contacts a distinct exposed metal screw terminal of an isolated circuit in a domestic panel. Real circuit breakers have plainly visible toggle switches but absolutely no labels, lettering, symbols or numbers. No extra or loose third probe; realistic two-lead connection to the multimeter. Show the complete action with calm empty space in the bottom third.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-plombier-a"></a>

<details>
<summary>Plombier — variante a</summary>

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A young plumber in his late 20s with a short beard, navy work shirt and grey canvas apron, kneeling to connect copper and white multilayer pipes under a modern bathroom vanity, adjustable wrench in hand, daylight from a frosted window.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-chauffagiste-b"></a>

<details>
<summary>Chauffagiste — variante b</summary>

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A heating engineer, a woman in her 40s, navy work fleece, checking the pressure gauge of a modern white wall-mounted boiler in a clean laundry room, holding a tablet whose screen is not visible, soft daylight.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Entirely unbranded white boiler with a small analog pressure gauge whose face is seen obliquely and softly out of focus, no readable letters or numbers. Closed tablet against her torso with its plain back toward the camera. Candid three-quarter profile, one hand resting naturally on the boiler casing; no pointing gesture.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-climaticien-a"></a>

<details>
<summary>Climaticien — variante a</summary>

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
An air-conditioning technician in his 30s, navy polo and safety gloves, installing the outdoor unit of a split air conditioner on the terrace of a light-stone Mediterranean house, sea and hills softly blurred behind, bright morning sun.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Plain unbranded outdoor unit with no labels or inscriptions. He is securing an accessible mounting foot using a correctly held socket wrench while wearing safety gloves. The unit rests level on antivibration feet; no work at height or open terrace edge.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-macon-a"></a>

<details>
<summary>Maçon — variante a</summary>

```text
Use case: photorealistic-natural. MENAO trade card photograph, output portrait 1024×1536. All people are fictional adults, no resemblance to any real or famous person.
A mason in his 40s with a yellow hard hat and work gloves, navy work clothes, laying concrete blocks with a trowel and checking them with a spirit level on a sunny house construction site in the south of France, mortar texture visible.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
A coherent moment in masonry: his right gloved hand holds a triangular steel trowel with fresh mortar over the top of one concrete block, his left gloved hand rests on a plain spirit level lying flat along an adjacent completed course. Correct straight aligned masonry and no text or numbers on the tools.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-peintre-1"></a>

<details>
<summary>Peintre — variante 1</summary>

Visage naturel, prise du rouleau plausible, cinq doigts compatibles avec la pose (certains occultés), pas de texte visible.

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A house painter, a woman in her 30s with curly hair under a cap, navy dungarees lightly speckled with paint, rolling warm white paint onto a living-room wall, drop cloths on a parquet floor, large window with soft light.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-plaquiste-1"></a>

<details>
<summary>Plaquiste — variante 1</summary>

Rejet préventif : petit marquage ressemblant à une étiquette sur le mètre à la ceinture.

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A drywall installer in his 30s, navy work clothes and safety glasses, screwing a plasterboard panel onto metal studs with a cordless screwdriver in a bright room under renovation, tape measure on his belt.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-plaquiste-2"></a>

<details>
<summary>Plaquiste — variante 2</summary>

À corriger : logo ou lettres sur le mètre à la ceinture ; bonne composition et anatomie naturelle.

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A drywall installer in his 30s, navy work clothes and safety glasses, screwing a plasterboard panel onto metal studs with a cordless screwdriver in a bright room under renovation, tape measure on his belt.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-carreleur-1"></a>

<details>
<summary>Carreleur — variante 1</summary>

Bonne anatomie, maillet cohérent, genouillères, pas de texte visible.

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A tiler in his 50s on knee pads, navy work clothes, setting a large-format light-grey porcelain tile with spacers and tapping it with a white rubber mallet on a bathroom floor, notched adhesive visible.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-menuisier-1"></a>

<details>
<summary>Menuisier — variante 1</summary>

Bon visage, lunettes, cheveux attachés, mains plausibles ; cadrage plus serré.

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A joiner, a woman in her 30s with her hair tied back, navy work apron and safety glasses, planing a solid oak board at a workbench in a warm wooden workshop, fine sawdust floating in a sunbeam.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-charpentier-1"></a>

<details>
<summary>Charpentier — variante 1</summary>

Rejetée : petites inscriptions présentes sur la batterie de la perceuse. Point d’ancrage de la longe hors cadre.

```text
A timber framer in his 40s with a hard hat and safety harness, navy work clothes, fixing a wooden rafter on a new house roof frame, clear blue sky, view from slightly below.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-couvreur-2"></a>

<details>
<summary>Couvreur — variante 2</summary>

Non retenue : cadrage moins aéré, détail de harnais moins net ; pose et visage naturels.

```text
A roofer in his 30s with a safety harness clipped to an anchor line, navy work clothes and gloves, laying traditional terracotta roof tiles on a Provençal house, hills and Mediterranean pines blurred in the background, warm late-afternoon light.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Safety detail: the correctly fitted full body harness is visibly clipped by a taut safety lanyard to a secure anchor line running uphill to an anchor above the worker. Wear a plain hard hat. All equipment and tools have fully blank unbranded surfaces, no stickers, labels or tiny writing.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-facadier-1"></a>

<details>
<summary>Façadier — variante 1</summary>

Rejetée : petites inscriptions sur la bordure bleue du gant droit.

```text
A façade worker, a woman in her 40s, on secure scaffolding with guardrails, hard hat, navy work clothes, applying a smooth light-ochre render to a Mediterranean building facade with a stainless-steel float, morning light.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Safety detail: a stable scaffold platform with continuous top rail, midrail and toe boards at the open edge. The worker wears clear safety glasses and appropriate protective gloves while correctly gripping the float handle. No markings or labels on any equipment.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-serrurier-1"></a>

<details>
<summary>Serrurier — variante 1</summary>

Écartée : axe de tournevis ambigu par rapport à la fixation du cylindre.

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A locksmith in his 50s, navy work jacket, kneeling at a solid wooden front door and fitting a new lock cylinder with a screwdriver, open toolbox beside him, entrance hall with natural light.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-serrurier-2"></a>

<details>
<summary>Serrurier — variante 2</summary>

Écartée : tournevis dirigé vers l’entrée du cylindre, geste technique incorrect.

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A locksmith in his 50s, navy work jacket, kneeling at a solid wooden front door and fitting a new lock cylinder with a screwdriver, open toolbox beside him, entrance hall with natural light.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-serrurier-3"></a>

<details>
<summary>Serrurier — variante 3</summary>

Geste corrigé : vissage sur le chant de porte entrouverte. Petit marquage sur le mètre dans la boîte à outils : correction demandée.

```text
Use case: photorealistic-natural.
Generate one independent photograph, portrait 1024×1536 pixels. All people are fictional adults, with no resemblance to any known person; no badges, no names, no text.
A locksmith in his 50s, navy work jacket, kneeling at a solid wooden front door and fitting a new lock cylinder with a screwdriver, open toolbox beside him, entrance hall with natural light.
Technical correctness: the wooden door leaf is OPEN about 70 degrees so the narrow side edge and the mortise lock faceplate are clearly visible to the camera. The locksmith is tightening the horizontal cylinder-retaining screw located on this NARROW DOOR EDGE, below the latch, with a normal straight screwdriver. The screwdriver tip touches that screw head on the edge faceplate, NEVER the keyhole and NEVER a hole on the broad face of the door. The cylinder sits correctly through the wooden door in a standard euro-profile lock installation. His other hand naturally steadies the side of the door. Plausible simple hand positions and five fingers per hand. No printed marks on any tools.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-terrassier-2"></a>

<details>
<summary>Terrassier — variante 2</summary>

Non retenue : anatomie plausible et matériel cohérent, mais personnage plus petit et cadrage moins utile pour une carte métier.

```text
A groundworks operator in his 30s, hi-vis vest over navy work clothes and a hard hat, next to a compact mini-excavator digging a clean foundation trench on a sunny plot with Mediterranean vegetation.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Safety detail: the excavator is paused while the worker stands well outside its bucket swing radius and away from the trench edge on stable ground. The trench is shallow, with stable side slopes. The machine is completely unbranded and all clothing, machinery and tools are blank, without safety labels, numbers, writing or logos. Machine cab has no visible screen content.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

<a id="archive-paysagiste-1"></a>

<details>
<summary>Paysagiste — variante 1</summary>

Non retenue : image sans défaut bloquant apparent, mais cadre inférieur plus chargé et gros plan moins adapté à la légende.

```text
A landscaper, a woman in her 20s, navy work clothes, gardening gloves and a sun hat, planting a young olive tree among lavender and rosemary in a sunny Mediterranean garden with dry-stone walls.
Vertical 2:3 photograph. Main subject in the upper two thirds; the lower third stays calm (floor, wall or workbench) because a caption will be overlaid there.
Output: 1024×1536 pixels. All depicted people are fictional adults, with no resemblance to a real or famous person. No testimonial, badge or identifying text.
Style: authentic editorial / documentary photography, photorealistic, natural daylight, soft warm color grading with subtle cool blue shadows, realistic skin texture and natural imperfections, correct anatomy (five fingers per hand), real tools used correctly, appropriate safety equipment (hard hat, safety glasses, gloves or harness when relevant), clean but lived-in jobsite, South of France / Mediterranean context (light stone, terracotta, olive trees). Workwear in plain navy or royal blue, without any logo or lettering. Full-frame camera, 35–50 mm lens, shallow depth of field. Avoid: text, letters, numbers, logos, brand names, watermarks, readable signage, screens with content, UI elements, cartoon, 3D render, CGI look, plastic skin, HDR, oversaturation, extra fingers, distorted tools, children, celebrities.
```

</details>

## Série du 2026-10-19 : couvertures des guides (ADR 0149)

**images générées par IA, personnes fictives**

Cinq photos de couverture pour les guides, générées le **2026-10-19** avec l'outil intégré `image_gen` (modèle non exposé par l'outil), sur le plan de l'audit du site vitrine. Dimensions natives **1536 × 1024**, sans agrandissement (2400 × 1600 avaient été demandés). Les personnes sont fictives : elles ne sont présentées ni comme l'équipe MENAO, ni comme des artisans inscrits, ni comme des clients.

| Repère | Guide | Fichiers (1536, 960 et 640 px de large) | Prompt exact | Poids (Ko) |
|---|---|---|---|---:|
| D1 | `choisir-un-artisan` | [choisir-un-artisan.webp](../../apps/web/public/images/guides/choisir-un-artisan.webp), -960, -640 | [Prompt exact](#prompt-d1-choisir-un-artisan) | 283,878 |
| D2 | `devis-travaux-mentions-obligatoires` | [devis-travaux-mentions-obligatoires.webp](../../apps/web/public/images/guides/devis-travaux-mentions-obligatoires.webp), -960, -640 | [Prompt exact](#prompt-d2-devis-travaux) | 239,514 |
| D3 | `assurance-decennale` | [assurance-decennale.webp](../../apps/web/public/images/guides/assurance-decennale.webp), -960, -640 | [Prompt exact](#prompt-d3-assurance-decennale) | 264,984 |
| D4 | `tva-travaux-taux-reduit` | [tva-travaux-taux-reduit.webp](../../apps/web/public/images/guides/tva-travaux-taux-reduit.webp), -960, -640 | [Prompt exact](#prompt-d4-tva-renovation) | 204,234 |
| D5 | `facture-electronique-artisans` | [facture-electronique-artisans.webp](../../apps/web/public/images/guides/facture-electronique-artisans.webp), -960, -640 | [Prompt exact](#prompt-d5-facture-electronique) | 215,134 |

- **WebP qualité 82**, sans métadonnées ; versions -960 et -640 au même cadrage.
- **D5 est un montage** : l'écran du portable, noir à la génération, montre le vrai écran Factures de l'espace pro (données fictives : JF Plomberie, factures F-2026-0039 à 0043), incrusté en perspective (outil hors Git `medias/mockups-site/outils/incruster.py`).
- **Images de partage** `apps/web/public/images/og/guides/<slug>.jpg` (1200 × 630, JPEG qualité 82) : recadrages des couvertures.
- Les PNG originaux, le manifeste et les prompts sont conservés hors du dépôt avec la série complète (B1 à B8 non utilisées à ce jour).
- **Contrôle visuel** : visages, mains, gestes et cadrage revus ; aucun texte, logo ni marque visible repéré.

<a id="prompt-d1-choisir-un-artisan"></a>

### D1 — choisir-un-artisan

```text
Use case: photorealistic-natural.
Asset type: editorial cover photograph for a MENAO renovation advice guide. Single photograph, landscape 3:2. Request native 2400 x 1600 pixels if supported, otherwise the best native landscape 3:2 resolution; do not add borders.
Visual direction: exceptionally realistic candid documentary photography in the South of France, 35–50 mm full-frame lens at f/4, natural diffused daylight, neutral subtly warm color, understated cool blue shadows. Honest unpolished atmosphere, realistic skin pores and imperfections, natural expressions, physically believable hands and objects. Realistic plaster, wood, tile and fabric textures. All people are fictional adults and are editorial illustrations, not actual MENAO customers or testimonials. Workwear is plain navy, no visible branding. No text, letters, numerals, logos, brand names, watermark, captions, labels, overlays, readable signage, recognizable products, children, collage, CGI or plastic skin. Keep the principal scene safely framed with generous margins for responsive cropping.

Subject: a woman homeowner aged about 40 and a male craftsperson aged about 50 in plain navy work clothes discussing a renovation project in her lived-in home near Nice. A few real wood and ceramic tile samples lie on a wooden table between them. Natural attentive faces and small relaxed gestures; no handshake, no sales pose, nobody facing the camera. The homeowner points toward a material sample with a relaxed natural hand while the craftsperson listens. Mediterranean domestic interior, pale plaster walls, soft window light. Medium-wide horizontal composition showing both people and the samples; neither face at an edge. No documents, certificates or screens.
```

<a id="prompt-d2-devis-travaux"></a>

### D2 — devis-travaux-mentions-obligatoires

```text
Use case: photorealistic-natural.
Asset type: editorial cover photograph for a MENAO renovation advice guide. Single photograph, landscape 3:2. Request native 2400 x 1600 pixels if supported, otherwise the best native landscape 3:2 resolution; do not add borders.
Visual direction: exceptionally realistic candid documentary photography in the South of France, 35–50 mm full-frame lens at f/4, natural diffused daylight, neutral subtly warm color, understated cool blue shadows. Honest unpolished atmosphere, realistic skin pores and imperfections, natural expressions, physically believable hands and objects. Realistic plaster, wood, tile and fabric textures. All people are fictional adults and are editorial illustrations, not actual MENAO customers or testimonials. Workwear is plain navy, no visible branding. No text, letters, numerals, logos, brand names, watermark, captions, labels, overlays, readable signage, recognizable products, children, collage, CGI or plastic skin. Keep the principal scene safely framed with generous margins for responsive cropping.

Subject: close editorial view across a warm wooden table as a craftsperson in plain navy clothing and a woman homeowner review a completely blank paper folder together. Their torsos and partial faces are visible softly in the background. Main focus on realistic relaxed hands, a plain unbranded pen lying on the table, a neat open folder containing genuinely blank white sheets with NO marks, rules, writing, letters or numbers at all. One hand rests flat beside the folder and another gently indicates a blank part of the sheet. No pen touching paper, no staged signature, no handshake. Domestic renovation consultation in natural window light near Nice; physical paper edges and finger joints must be plausible. Close horizontal composition, quietly professional.
```

<a id="prompt-d3-assurance-decennale"></a>

### D3 — assurance-decennale

```text
Use case: photorealistic-natural.
Asset type: editorial cover photograph for a MENAO renovation advice guide. Single photograph, landscape 3:2. Request native 2400 x 1600 pixels if supported, otherwise the best native landscape 3:2 resolution; do not add borders.
Visual direction: exceptionally realistic candid documentary photography in the South of France, 35–50 mm full-frame lens at f/4, natural diffused daylight, neutral subtly warm color, understated cool blue shadows. Honest unpolished atmosphere, realistic skin pores and imperfections, natural expressions, physically believable hands and objects. Realistic plaster, wood, tile and fabric textures. All people are fictional adults and are editorial illustrations, not actual MENAO customers or testimonials. Workwear is plain navy, no visible branding. No text, letters, numerals, logos, brand names, watermark, captions, labels, overlays, readable signage, recognizable products, children, collage, CGI or plastic skin. Keep the principal scene safely framed with generous margins for responsive cropping.

Subject: an experienced male craftsperson aged about 45, in plain navy work clothing and appropriate plain work gloves and safety footwear, carefully inspecting the junction of a smooth plaster facade wall and a recently renewed ground-level terrace at a Mediterranean house. He crouches naturally on stable level ground, checking the detail of the wall-to-terrace connection visually with one hand resting gently near it, no dangerous activity or power tool. The facade, tile joints, terrace edge and body anatomy must be physically coherent. This is inspection of actual building work, NOT an insurance document or fake certificate. No paperwork, no emblem, no signature, no badges. Medium horizontal photograph emphasizing the craftsperson's attentive face and construction detail; natural diffused daylight.
```

<a id="prompt-d4-tva-renovation"></a>

### D4 — tva-travaux-taux-reduit

```text
Use case: photorealistic-natural.
Asset type: editorial cover photograph for a MENAO renovation advice guide. Single photograph, landscape 3:2. Request native 2400 x 1600 pixels if supported, otherwise the best native landscape 3:2 resolution; do not add borders.
Visual direction: exceptionally realistic candid documentary photography in the South of France, 35–50 mm full-frame lens at f/4, natural diffused daylight, neutral subtly warm color, understated cool blue shadows. Honest unpolished atmosphere, realistic skin pores and imperfections, natural expressions, physically believable hands and objects. Realistic plaster, wood, tile and fabric textures. All people are fictional adults and are editorial illustrations, not actual MENAO customers or testimonials. Workwear is plain navy, no visible branding. No text, letters, numerals, logos, brand names, watermark, captions, labels, overlays, readable signage, recognizable products, children, collage, CGI or plastic skin. Keep the principal scene safely framed with generous margins for responsive cropping.

Subject: a female window installer aged about 40 in plain navy workwear, protective gloves and clear safety glasses, finishing installation of a double-glazed window inside an older apartment in Nice. The sturdy white window frame is already secured in the masonry opening; she calmly checks the seated frame and seal by hand. No lifting of a heavy unsupported pane, no unstable platform, no power tool. Both gloved hands contact physically plausible parts of the frame. Window hinges, handle, frame thickness and reflections must be coherent. Subtle evidence of renovation around the opening, old plaster texture, traditional pale walls. Warm natural diffused daylight through the glass, medium-wide horizontal composition, authentic work rather than a posed portrait. No labels or printed tape.
```

<a id="prompt-d5-facture-electronique"></a>

### D5 — facture-electronique-artisans

```text
Use case: photorealistic-natural.
Asset type: editorial cover photograph for a MENAO renovation advice guide. Single photograph, landscape 3:2. Request native 2400 x 1600 pixels if supported, otherwise the best native landscape 3:2 resolution; do not add borders.
Visual direction: exceptionally realistic candid documentary photography in the South of France, 35–50 mm full-frame lens at f/4, natural diffused daylight, neutral subtly warm color, understated cool blue shadows. Honest unpolished atmosphere, realistic skin pores and imperfections, natural expressions, physically believable hands and objects. Realistic plaster, wood, tile and fabric textures. All people are fictional adults and are editorial illustrations, not actual MENAO customers or testimonials. Workwear is plain navy, no visible branding. No text, letters, numerals, logos, brand names, watermark, captions, labels, overlays, readable signage, recognizable products, children, collage, CGI or plastic skin. Keep the principal scene safely framed with generous margins for responsive cropping.

Subject: a male craftsperson aged about 55 in plain navy work clothes sitting at a simple desk in a modest tidy workshop office, handling routine administration on an unbranded laptop. Three-quarter side view shows his natural face, relaxed hands on a physically plausible keyboard, and the screen angled sufficiently toward the camera to be visible. The screen is completely black and blank, no interface, no text, no icons, no reflections that resemble symbols. Keyboard keys have no readable letters or numbers. A plain closed folder sits nearby; no paperwork with marks. Everyday understated office atmosphere, wood shelving and neutral workshop items softly blurred, natural diffuse window light. Horizontal editorial photography, no triumph pose, no handshake, no luxury executive office.
```
