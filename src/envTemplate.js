// The fixed portion of the Environment Image Generation Master Template
// (everything except the user-supplied environment entries in Section 21).
// Kept verbatim from the source template so Google Flow Agent Mode sees
// identical instructions every time.

export const TEMPLATE_HEADER = `ENVIRONMENT IMAGE GENERATION MASTER TEMPLATE
FOR GOOGLE FLOW AGENT MODE

VERSION: 1.0

PURPOSE
-------
This reusable template is designed to generate cinematic environment/location
reference images for documentary video production.

The user will provide ONLY the environment names and their corresponding
environment image prompts.

The instructions in this file control HOW Google Flow Agent Mode should
process those prompts.

IMPORTANT:
Do not rewrite, shorten, reinterpret, or replace the user's environment
prompts unless required to remove an explicit contradiction with the rules
below.

============================================================
SECTION 1 — INPUT
============================================================

The user will provide one or more environment entries in this format:

ENVIRONMENT 01
NAME: [EXACT ENVIRONMENT NAME]
PROMPT:
[ENVIRONMENT IMAGE PROMPT]

ENVIRONMENT 02
NAME: [EXACT ENVIRONMENT NAME]
PROMPT:
[ENVIRONMENT IMAGE PROMPT]

ENVIRONMENT 03
NAME: [EXACT ENVIRONMENT NAME]
PROMPT:
[ENVIRONMENT IMAGE PROMPT]

Continue for as many environments as provided.

The number of environments is NOT fixed.

============================================================
SECTION 2 — CORE TASK
============================================================

Generate ONE environment/reference image for EVERY environment entry provided
by the user.

Each generated image must represent the environment described by its
corresponding prompt.

Do NOT generate video scenes.

Do NOT generate characters.

Do NOT generate hosts or presenters.

Do NOT generate scene-specific actions unless the supplied environment prompt
requires an environmental condition that is part of the location itself.

These images are reusable cinematic ENVIRONMENT / LOCATION BACKGROUND PLATES.

============================================================
SECTION 3 — EXACT IMAGE NAMING
============================================================

# EXACT IMAGE / ASSET NAMING — MANDATORY

The \`NAME:\` value supplied by the user is the **canonical and authoritative asset name**.

The actual generated image/asset must be renamed to this exact value.

**IMPORTANT:** Do not treat the NAME merely as:

* a prompt label
* a scene label
* an internal identifier
* a description
* metadata
* a suggested filename

It must be used as the **actual displayed/generated asset name** in Google Flow.

## EXACT NAMING RULE

For every environment:

1. Read the value after \`NAME:\`.
2. Store that exact value as the canonical asset name.
3. Generate the image.
4. After generation, rename the generated image/asset to the canonical asset name.
5. Verify the resulting displayed asset name character-by-character against the original \`NAME:\`.
6. If the name does not match exactly, rename/correct it before continuing.
7. Only after successful verification, proceed to the next environment.

## ZERO MODIFICATION RULE

The canonical name must be reproduced exactly.

Do NOT:

* change spelling
* change capitalization
* add numbers
* add \`_01\`, \`_02\`, etc.
* add dates
* add \`Image\`
* add \`_Image\`
* add \`Final\`
* add \`_Final\`
* add \`Generated\`
* add \`_Generated\`
* add \`v1\`
* add \`v2\`
* add \`_v2\`
* add descriptive suffixes
* add file-type text such as \`.png\` unless Google Flow automatically requires a file extension
* abbreviate the name
* translate the name
* replace spaces with underscores unless the supplied NAME already contains underscores
* remove spaces
* add spaces
* modify punctuation

### Example

User input:

NAME: RacetrackPlayaDay

Correct actual asset name:

RacetrackPlayaDay

Incorrect:

RacetrackPlayaDay_Image
RacetrackPlayaDay_Final
RacetrackPlayaDay_01
RacetrackPlayaDay_v2
RacetrackPlayaDay_Generated
racetrackplayaday
Racetrack Playa Day

## CRITICAL DISTINCTION

The NAME is not an instruction to describe the image.

The NAME is the **actual asset naming instruction**.

Do not assume that mentioning the name in the generation prompt satisfies this requirement.

The asset itself must be renamed.

## FINAL VERIFICATION

Before moving to the next environment, internally verify:

\`Generated Asset Name == User Supplied NAME\`

This comparison must be exact.

If:

\`Generated Asset Name ≠ User Supplied NAME\`

then the environment is **NOT complete**.

Correct the asset name before continuing.

============================================================
SECTION 4 — IMAGE COUNT
============================================================

Generate exactly ONE image for each environment entry.

If 5 environments are provided:
Generate 5 images.

If 12 environments are provided:
Generate 12 images.

Do not generate duplicates or additional variations unless the user
explicitly requests them.

============================================================
SECTION 5 — ENVIRONMENT IMAGE PURPOSE
============================================================

These images are environment reference/background images that will later be
used as visual foundations for documentary scene generation.

Therefore:

- Prioritize the environment itself.
- Establish architecture, geography, landscape, interior design,
  atmosphere, lighting and spatial layout clearly.
- Keep the composition useful for later scene generation.
- Avoid unnecessary foreground objects that could interfere with later
  characters or actions.
- Maintain a clear sense of depth.
- Make the location visually identifiable.
- Preserve important environmental details described by the user.

============================================================
SECTION 6 — GLOBAL VISUAL QUALITY
============================================================

Unless the user's prompt explicitly specifies a different visual treatment,
apply the following global quality requirements:

Cinematic photorealistic documentary environment image,
premium large-format documentary photography,
IMAX-quality visual composition,
photorealistic 4K/8K appearance,
high dynamic range,
physically accurate lighting,
realistic materials and textures,
natural atmospheric depth,
realistic scale and perspective,
cinematic depth of field where appropriate,
restrained cinematic color grading,
high-detail environmental textures,
professional documentary production quality.

The result should look like a frame from a premium historical/science
documentary rather than a generic AI-generated image.

============================================================
SECTION 7 — HISTORICAL ACCURACY
============================================================

If the environment prompt specifies a historical period:

- Respect the specified period.
- Use architecture appropriate to that period.
- Use materials appropriate to that period.
- Use technology appropriate to that period.
- Use vehicles, furniture, equipment and infrastructure appropriate to that
  period when they are visible.
- Do not introduce modern objects into historical environments.
- Do not modernize historical locations unless the prompt explicitly asks
  for the modern version.

If the environment is ancient:

- Respect historically appropriate architecture and construction.
- Avoid modern materials and contemporary infrastructure.
- Do not invent obviously anachronistic objects.

If the environment is astronomical:

- Prioritize scientific plausibility.
- Avoid fantasy-style cosmic effects unless explicitly requested.
- Preserve realistic scale, lighting and spatial relationships.

============================================================
SECTION 8 — NO-PEOPLE RULE
============================================================

Environment images must contain NO PEOPLE by default.

Do not add:

- hosts
- presenters
- scientists
- workers
- soldiers
- tourists
- crowds
- silhouettes
- human figures
- human shadows

unless the user explicitly includes people as an essential part of the
environment prompt.

If the prompt describes a location that normally contains people, create the
environment without people.

============================================================
SECTION 9 — CLEAN ENVIRONMENT PLATE
============================================================

Treat each generated image as a clean reusable environment plate.

Avoid unnecessary:

- foreground clutter
- random objects
- random vehicles
- random people
- excessive smoke
- excessive fog
- artificial lens effects
- excessive particles
- dramatic explosions
- distracting props

Do not turn an environment image into an action scene.

============================================================
SECTION 10 — TEXT / BRANDING RESTRICTIONS
============================================================

Do NOT add:

- subtitles
- captions
- titles
- UI
- interface elements
- watermarks
- logos
- unnecessary signs
- random readable text
- branding

If historically essential signage is explicitly requested by the user's
prompt, preserve it only when appropriate.

============================================================
SECTION 11 — ASPECT RATIO
============================================================

Generate every environment image in:

16:9 LANDSCAPE

The composition should be suitable for YouTube documentary production.

Avoid vertical or square composition.

============================================================
SECTION 12 — CAMERA / COMPOSITION
============================================================

Use an appropriate cinematic establishing composition for the environment.

Depending on the prompt, use:

- wide establishing shot
- architectural establishing shot
- landscape composition
- interior establishing shot
- aerial establishing shot
- low-angle environmental composition
- elevated environmental composition

Do NOT force the same camera angle onto every environment.

Choose the composition that best communicates the environment.

Maintain:

- believable perspective
- realistic scale
- strong depth
- clear spatial relationships
- cinematic framing
- useful negative space when appropriate

============================================================
SECTION 13 — LIGHTING
============================================================

Respect the lighting specified in the user's prompt.

If no lighting is specified, choose lighting appropriate to:

- location
- historical period
- time of day
- weather
- environment type

Examples:

Night:
Natural moonlight/starlight and realistic practical lighting.

Day:
Natural sunlight with physically plausible shadows.

Interior:
Period-appropriate practical lighting and natural ambient light.

Ancient:
Natural sunlight, firelight, torchlight or historically appropriate
illumination.

Space:
Physically plausible astronomical illumination.

Do not use exaggerated neon lighting unless explicitly requested.

============================================================
SECTION 14 — ATMOSPHERE
============================================================

Use realistic atmospheric conditions appropriate to the environment.

Possible elements include:

- subtle haze
- dust
- humidity
- mist
- atmospheric perspective
- natural clouds
- realistic shadows
- subtle airborne particles

Do not overuse atmospheric effects.

The environment must remain clear and believable.

============================================================
SECTION 15 — SCIENTIFIC / TECHNICAL ENVIRONMENTS
============================================================

For science, astronomy, engineering and technology topics:

- Make equipment physically believable.
- Maintain realistic scale.
- Avoid impossible structures.
- Avoid fantasy interfaces.
- Avoid futuristic elements unless explicitly requested.
- Make scientific environments look like real research facilities.

For astronomical environments:

- Use scientifically grounded visual interpretation.
- Avoid overly colorful fantasy nebulae.
- Avoid physically impossible lighting.
- Preserve believable cosmic scale.

============================================================
SECTION 16 — CONTINUITY
============================================================

If multiple environments belong to the same physical location, preserve
visual continuity.

Examples:

If the user provides:

BigEarObservatoryNight1977
BigEarStructuralInterior1977
BigEarControlRoom1977

Treat them as parts of the same historical facility.

Maintain consistency in:

- architectural style
- materials
- weathering
- lighting
- historical period
- color treatment
- environmental conditions
- geographic character

Do not make related environments look like unrelated locations.

============================================================
SECTION 17 — PROMPT HANDLING
============================================================

The user's ENVIRONMENT IMAGE PROMPT is the primary visual instruction.

Preserve its:

- subject
- location
- period
- architecture
- environment
- lighting
- atmosphere
- scientific details
- historical details
- composition requirements

Add the global production requirements from this template where they do
not conflict with the user's prompt.

Do not silently replace the user's requested environment with a generic
alternative.

============================================================
SECTION 18 — QUALITY CONTROL BEFORE GENERATION
============================================================

Before generating each image, internally verify:

1. Is the environment name preserved exactly?
2. Is the location correct?
3. Is the historical period correct?
4. Is the time of day correct?
5. Are the key environmental details present?
6. Is the image 16:9 landscape?
7. Are people absent unless explicitly requested?
8. Are modern objects absent from historical environments?
9. Is the environment photorealistic?
10. Is there any unnecessary text, logo or watermark?
11. Does the environment look reusable for later documentary scenes?
12. Is the image visually consistent with related environments?

Fix any issue before finalizing the image.

============================================================
SECTION 19 — GENERATION WORKFLOW
============================================================

Process the supplied environments sequentially.

For each environment:

STEP 1:
Read the EXACT NAME.

STEP 2:
Read the corresponding ENVIRONMENT IMAGE PROMPT.

STEP 3:
Apply this master template's global requirements.

STEP 4:
Generate ONE image.

STEP 5:
Name the image using the EXACT NAME.

STEP 6:
Move to the next environment.

Continue until every supplied environment has been generated.

Do not skip an environment.

Do not generate extra environments.

============================================================
SECTION 20 — FINAL OUTPUT
============================================================

After generation, provide a concise completion report containing:

TOTAL ENVIRONMENTS PROVIDED:
[number]

TOTAL IMAGES GENERATED:
[number]

GENERATED ENVIRONMENT NAMES:
[list the exact names]

If an image could not be generated, clearly identify the exact environment
name that failed.

Do not rename successful outputs.

============================================================
SECTION 21 — USER INPUT STARTS BELOW
============================================================

PASTE ENVIRONMENT ENTRIES BELOW THIS LINE.

------------------------------------------------------------
`;

export const TEMPLATE_FOOTER = `
============================================================
END OF ENVIRONMENT IMAGE GENERATION MASTER TEMPLATE
============================================================`;
