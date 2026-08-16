// The fixed portion of the Phase 7 Image-to-Video Generation Agent Master
// Template (everything except the user-supplied scene/video prompts that go
// into the INPUT FORMAT section). Kept verbatim from the source template.

export const VIDEO_TEMPLATE_HEADER = `PHASE 7 — IMAGE-TO-VIDEO GENERATION AGENT MASTER TEMPLATE
GOOGLE FLOW / VEO AGENT MODE

OUTPUT NAMING: V1, V2, V3...
INITIAL BATCH SIZE: 5
VOICEOVER: NONE

============================================================
PURPOSE
============================================================

Generate image-to-video clips from ALREADY-CREATED scene images.

Existing scene images are named exactly:
S1, S2, S3, S4, ... S70, etc.

DO NOT regenerate scene images.

The user provides scene-specific VIDEO PROMPTS. Animate the corresponding
existing scene image according to its prompt.

Telugu narration/voiceover is added separately during post-production.

============================================================
BATCH SIZE
============================================================

BATCH_SIZE: 5

Process the SUPPLIED scene list in batches of 5, preserving the user-supplied order. Scene IDs do NOT need to be consecutive.

- Determine total supplied scenes automatically.
- Do NOT assume there are only 2 scenes.
- Process ONLY the current batch.
- STOP after the current batch.
- Continue only when the user says "NEXT ITERATION".
- Never invent scenes to complete a batch.
- The supplied Scene ID list is the SOURCE OF TRUTH.
- Missing scene numbers are intentional unless the user explicitly asks otherwise.
- Never require scenes to start at S1 or to be consecutive.
- Example: S6, S7, S10, S11, S13 is valid input and must be processed exactly in that order.

Examples:
40 scenes: S1-S5, S6-S10, S11-S15, ... (when the supplied scenes are consecutive)
50 scenes: S1-S5, S6-S10, S11-S15, ... (when the supplied scenes are consecutive)
73 scenes: final batch may contain S73 only.

============================================================
CRITICAL SOURCE-IMAGE WORKFLOW
============================================================

For every scene:

1. Read the exact SCENE ID.
2. Locate the EXISTING image asset with that exact name.
3. Use that exact S# image as the Image-to-Video source.
4. DO NOT generate a new scene image.
5. DO NOT use the environment reference image as the video source.
6. DO NOT substitute another scene image.
7. DO NOT select a similarly named asset.
8. Preserve the source image's visual identity.
9. Apply the supplied VIDEO PROMPT to that exact source image.

Example:
SCENE ID: S17
SOURCE IMAGE: S17

The environment reference image is NOT the video source.

============================================================
SOURCE IMAGE IS THE VISUAL AUTHORITY
============================================================

Preserve the existing S# image's:
- Environment
- Location
- Architecture
- Geography
- Materials
- Objects
- Character appearance
- Composition
- Lighting
- Atmosphere
- Historical/scientific setting
- Spatial relationships

Animate the existing image rather than redesigning it.

============================================================
VIDEO OUTPUT NAMING — ABSOLUTE / IMMUTABLE
============================================================

THIS IS A HARD OUTPUT-NAMING CONTRACT.

For EVERY supplied scene:

SOURCE SCENE ID = S#
OUTPUT VIDEO NAME = V#

The numeric portion MUST be copied EXACTLY from the Scene ID.

The mapping is immutable:

S1 → V1
S2 → V2
S3 → V3
S4 → V4
S5 → V5
S6 → V6
S7 → V7
S8 → V8
S9 → V9
S10 → V10
S11 → V11
...
S50 → V50
S70 → V70
S99 → V99

CRITICAL:
- NEVER renumber outputs according to batch position.
- NEVER start output numbering again at V1 for a new batch.
- NEVER assume the first scene in a batch must produce V1.
- NEVER convert S10 to V10 with leading zeros such as V010.
- NEVER convert S1 to V01 or V001.
- NEVER use the topic name in the output filename.
- NEVER use descriptive filenames.
- NEVER create duplicate output numbers.
- NEVER change the output number after generation.
- The Scene ID is the ONLY source of truth for the output number.

EXAMPLES:

If the supplied batch is:
S1, S2, S3, S4, S5

Required outputs:
V1, V2, V3, V4, V5

If the supplied batch is:
S6, S7, S10, S11, S13

Required outputs:
V6, V7, V10, V11, V13

If the supplied batch is:
S21, S22, S25, S30, S31

Required outputs:
V21, V22, V25, V30, V31

INVALID OUTPUT NAMES:
S1_Video
S1-video
Scene1_Video
Video1
V01
V001
Video_1
WowSignal_S1
S1_Final
S6_Video
Scene_6
V06
V006
random generated names
topic-based names
descriptive names

GOOGLE FLOW / AGENT MODE ENFORCEMENT:

Before generating each video, explicitly determine:

SCENE ID: S#
REQUIRED OUTPUT: V#

After generation, verify that the resulting asset corresponds to the
required V# output.

If Google Flow allows direct renaming:
- Rename the generated video immediately to the exact required V# name.
- Preserve the exact number from the source Scene ID.

If Google Flow does NOT allow direct renaming:
- Do NOT invent an alternative naming convention.
- Do NOT silently accept the random generated name as the final name.
- Report:
  REQUIRED OUTPUT NAME: V#
  GENERATED PLATFORM NAME: <platform-assigned name>
  STATUS: RENAME REQUIRED

The required final naming convention ALWAYS remains S# → V#,
regardless of the platform's internally assigned asset name.

FINAL NAMING RULE:

SCENE NUMBER = VIDEO NUMBER

S# → V#

The number MUST be identical.

============================================================
VOICEOVER / SPEECH — ABSOLUTELY NONE
============================================================

CRITICAL: DO NOT GENERATE VOICEOVER.

Never generate:
- Narration
- Voiceover
- Spoken words
- Dialogue
- Human speech
- Character speech
- Lip-sync
- Talking
- Whispering
- Vocal narration
- AI-generated narration
- Spoken commentary
- Reading of text
- Any human voice

The Telugu documentary narration is created separately and added later.

NEVER put narration or speech text into the video-generation prompt.

If a person is visible:
- Keep them silent.
- Do not animate their mouth as if speaking.
- No dialogue.
- No lip-sync.
- No vocal sounds.

If Google Flow generates speech automatically:
suppress/remove it if possible. If necessary, regenerate the clip with
explicit speech-free instructions. Do not accept a clip containing
unintended voiceover.

VOICEOVER: NONE
DIALOGUE: NONE
SPEECH: NONE
LIP-SYNC: NONE

============================================================
AUDIO RULE
============================================================

Generated clips may contain ONLY:
1. Environmental / ambient sound, if requested.
2. Instrumental background music, if requested.

There must be NO human voice.

Ambient sound may include wind, rain, room tone, mechanical hum,
observatory ambience, or distant environmental sounds.

Background music must be:
- Instrumental
- Subtle
- Non-vocal
- Appropriate to the scene
- Below the eventual Telugu narration

If the user specifies no audio, generate without audio.

============================================================
DURATION
============================================================

DEFAULT: approximately 8 seconds per scene.

If a supplied scene prompt explicitly specifies another duration,
follow it.

============================================================
VIDEO GENERATION RULES
============================================================

- Start from the existing S# image.
- Animate the existing image rather than redesigning it.
- Use subtle, intentional, physically plausible movement.
- Use camera movement appropriate to the supplied prompt.
- Keep environmental movement natural and restrained.
- Preserve composition and visual identity.
- Do not introduce unrelated objects.
- Do not introduce new characters unless explicitly required.
- Do not change location or historical/scientific setting.
- Do not create fantasy transformations.
- Do not morph objects or characters.
- Do not teleport objects.
- Do not create random camera movements.
- Do not create sudden zooms unless explicitly requested.
- Do not add text, subtitles, logos, or watermarks.
- Do not make the video look like a completely different shot.

============================================================
PEOPLE IN SOURCE IMAGES
============================================================

If people are already present:
- Preserve appearance, clothing, position and identity.
- Keep movement minimal and natural.
- Do not alter faces.
- Do not create exaggerated expressions.
- Do not make anyone speak.
- Do not animate lip-sync.
- Do not create dialogue.

Prefer camera/environmental motion over human performance.

============================================================
MASTER VISUAL QUALITY
============================================================

Unless the supplied prompt says otherwise:
- Cinematic photorealistic documentary style
- Premium IMAX documentary aesthetic
- ARRI Alexa 65 visual character
- 35mm anamorphic lens characteristics
- 8K/HDR-quality appearance where supported
- Physically plausible lighting
- Natural textures
- Realistic depth
- Subtle film grain
- Professional cinematic color grading
- Historically/scientifically appropriate realism

Avoid cartoon/anime style, unrequested fantasy, random sci-fi additions,
visual clutter, CGI-looking motion, and excessive camera movement.

============================================================
ENVIRONMENT / CONTINUITY RULE
============================================================

The approved environment is already incorporated into the scene image.

DO NOT replace the scene image with an environment image.

Workflow:

Existing Environment
        ↓
Existing Scene Image S#
        ↓
Image-to-Video
        ↓
Video V#

The S# scene image is the visual authority.

============================================================
INPUT FORMAT
============================================================
`;

export const VIDEO_TEMPLATE_FOOTER = `

Repeat for all supplied scenes.

IMPORTANT:
Do not include Telugu narration text in these prompts.

============================================================
AGENT EXECUTION
============================================================

Before generating:
1. Read the complete scene list.
2. Determine total supplied scenes.
3. Identify the next unprocessed Scene ID.
4. Select exactly BATCH_SIZE scenes.
5. BATCH_SIZE is currently 5.
6. Do not process scenes outside the current batch.

Starting batch:
the first 5 supplied Scene IDs
Outputs:
matching V# outputs

============================================================
SOURCE IMAGE VERIFICATION
============================================================

Before each video:

For S1:
- Locate existing S1.
- Verify it is the existing scene image.
- Use it as source.
- Output V1.

For S2:
- Locate existing S2.
- Verify it is the existing scene image.
- Use it as source.
- Output V2.

If exact source image cannot be found:
STOP that scene.

Do NOT generate a replacement, use an environment image, use another
S# image, guess the asset, or rename another image.

Report:
MISSING SOURCE IMAGE: S#

============================================================
VIDEO GENERATION
============================================================

For each current-batch scene:
1. Select verified S#.
2. Start Image-to-Video from that exact image.
3. Apply supplied VIDEO PROMPT.
4. Apply supplied duration.
5. Preserve source visual identity.
6. Ensure NO voiceover, dialogue, speech or lip-sync.
7. Add only requested ambient sound and/or instrumental music.
8. Generate video.
9. Verify result.
10. Assign/rename output to the EXACT V# corresponding to the current Scene ID.
11. Verify the numeric mapping before accepting the output.

Examples:
S1 → V1
S2 → V2
S17 → V17

============================================================
OUTPUT VERIFICATION
============================================================

[ ] Correct S# source image used.
[ ] No scene image regenerated.
[ ] Environment not replaced.
[ ] Video follows supplied prompt.
[ ] Motion is subtle and physically plausible.
[ ] Duration approximately 8 seconds unless specified otherwise.
[ ] No unwanted objects.
[ ] No unwanted characters.
[ ] No morphing.
[ ] No unwanted face changes.
[ ] No text/logos/watermarks.
[ ] Visual continuity preserved.
[ ] Output has the EXACT required V# name.
[ ] V# number exactly matches the source S# number.
[ ] Output numbering was NOT reset at the beginning of the batch.
[ ] No leading-zero variation was used.
[ ] No topic/descriptive/random filename was accepted.
[ ] NO voiceover.
[ ] NO narration.
[ ] NO dialogue.
[ ] NO speech.
[ ] NO lip-sync.
[ ] NO human vocal sounds.
[ ] Ambient audio, if present, is appropriate.
[ ] Background music, if present, is instrumental and non-vocal.

If unintended speech is present:
DO NOT ACCEPT THE VIDEO AS FINAL. Regenerate with speech-free
instructions.

============================================================
BATCH COMPLETION
============================================================

After the current batch:

BATCH COMPLETED:
<the current supplied Scene IDs>

OUTPUTS:
matching V# outputs for the current supplied Scene IDs

Then STOP.

Do NOT automatically process the next batch.

Wait for:
NEXT ITERATION

============================================================
NEXT ITERATION LOGIC
============================================================

Batch 1:
first 5 supplied scenes → matching V# outputs

Batch 2:
next 5 supplied scenes → matching V# outputs

Batch 3:
next 5 supplied scenes → matching V# outputs

Continue through the supplied list only.

Never invent missing scene numbers. Preserve the user-supplied order.

============================================================
FINAL BATCH
============================================================

If fewer than BATCH_SIZE scenes remain, process only the remaining scenes.

Example:
S73 → V73

Do NOT invent S74 or V74.

============================================================
FAILURE HANDLING
============================================================

If video generation fails:
1. Keep the same Scene ID.
2. Keep the same source image.
3. Retry with the same video prompt.
4. Keep the same V# output name.
5. Do not replace the source image.
6. Do not generate a replacement scene image.
7. Do not create a duplicate scene.

If failure is caused by unintended speech, regenerate with the
speech-free audio rules.

============================================================
IMPORTANT TEST MODE
============================================================

BATCH_SIZE = 5.

The test verifies that Google Flow Agent Mode:
1. Finds existing S# images.
2. Uses exact S# as Image-to-Video source.
3. Applies the supplied video prompt.
4. Generates correct visual motion.
5. Produces approximately 8-second clips unless specified otherwise.
6. Produces NO voiceover.
7. Produces NO dialogue.
8. Produces NO speech or lip-sync.
9. Uses only appropriate ambient sound and/or instrumental music.
10. Names output V#.
11. Maintains exact S# → V# mapping.
12. Does not regenerate scene images.
13. Stops after exactly five scenes.

============================================================
FINAL LOCKED MAPPING — DO NOT OVERRIDE
============================================================

ALWAYS:

S1 → V1
S2 → V2
S3 → V3
S4 → V4
S5 → V5
...
S99 → V99

The scene number and video number are ALWAYS identical.

BATCH POSITION MUST NEVER determine the output number.

For example:
Batch 1: S1, S2, S3, S4, S5 → V1, V2, V3, V4, V5
Batch 2: S6, S7, S10, S11, S13 → V6, V7, V10, V11, V13

NEVER:
Batch 2 → V1, V2, V3, V4, V5

The source Scene ID is the sole authority for the output video number.

If the platform assigns a different internal filename, the required
final output name remains V# and must be reported as RENAME REQUIRED
when direct renaming is unavailable.

============================================================
END OF PHASE 7 AGENT TEMPLATE
============================================================`;
